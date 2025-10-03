const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const axios = require('axios');
const http = require('http');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');

const { NodeTracerProvider } = require('@opentelemetry/sdk-trace-node');
const { SimpleSpanProcessor } = require('@opentelemetry/sdk-trace-base');
const { ConsoleSpanExporter } = require('@opentelemetry/sdk-trace-base');
const { ExportResultCode } = require('@opentelemetry/sdk-trace-base');
const { registerInstrumentations } = require('@opentelemetry/instrumentation');
const { ExpressInstrumentation } = require('@opentelemetry/instrumentation-express');
const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http');
const { trace } = require('@opentelemetry/api');

const app = express();
const port = 3000;

app.use(cors({ origin: '*' }));
app.use(express.static(path.join(__dirname, '.')));

// SSE Clients management
let sseClients = [];

function broadcast(eventType, data) {
  sseClients.forEach((client) => {
    if (!client.res.writableEnded) {
      client.res.write(`event: ${eventType}\n`);
      client.res.write(`data: ${JSON.stringify(data)}\n\n`);
    }
  });
}

// Custom Memory Exporter for traces
class MemorySpanExporter {
  constructor() {
    this.recentSpans = [];
  }
  export(spans, resultCallback) {
    spans.forEach(span => {
      const spanData = {
        traceId: span.spanContext.traceId,
        spanId: span.spanContext.spanId,
        parentSpanId: span.parentSpanId,
        name: span.name,
        kind: span.kind,
        startTime: span.startTime,
        endTime: span.endTime,
        attributes: Object.fromEntries(span.attributes),
        status: span.status,
        events: span.events.map(e => ({ name: e.name, attributes: Object.fromEntries(e.attributes) })),
      };
      this.recentSpans.push(spanData);
      if (sseClients.length > 0) {
        broadcast('trace', spanData);
      }
    });
    this.recentSpans = this.recentSpans.slice(-50); // Keep last 50
    resultCallback({ code: ExportResultCode.SUCCESS });
  }
  forceFlush() { return Promise.resolve({ code: ExportResultCode.SUCCESS }); }
  shutdown() { return Promise.resolve(); }
}

const memoryExporter = new MemorySpanExporter();

const provider = new NodeTracerProvider({
  spanProcessors: [
    new SimpleSpanProcessor(new ConsoleSpanExporter()),
    new SimpleSpanProcessor(memoryExporter)
  ]
});
provider.register();

registerInstrumentations({
  instrumentations: [
    new ExpressInstrumentation(),
    new HttpInstrumentation(),
  ],
});

const allBackends = ['http://localhost:3001', 'http://localhost:3002'];

let healthyBackends = [...allBackends];
let requestIndex = 0;

const failureCounts = new Map(allBackends.map(url => [url, 0]));
const MAX_FAILURES = 3;
const CHECK_INTERVAL = 10000;

// Circuit Breaker: Per-backend state
const CIRCUIT_THRESHOLD = 5; 
const CIRCUIT_TIMEOUT = 30000; 
const circuitStates = new Map(allBackends.map(url => [url, {
  state: 'CLOSED', // CLOSED, OPEN, HALF_OPEN
  consecutiveFailures: 0,
  lastFailureTime: null,
  halfOpenSuccess: false // For half-open test
}]));

function getCircuitState(backendUrl) {
  return circuitStates.get(backendUrl);
}

function recordBackendError(backendUrl) {
  const state = getCircuitState(backendUrl);
  state.consecutiveFailures++;
  state.lastFailureTime = Date.now();
  if (state.consecutiveFailures >= CIRCUIT_THRESHOLD && state.state === 'CLOSED') {
    state.state = 'OPEN';
    console.log(`[CIRCUIT] Opened for ${backendUrl} after ${state.consecutiveFailures} failures`);
  } else if (state.state === 'HALF_OPEN') {
    state.state = 'OPEN'; // Test failed
    console.log(`[CIRCUIT] Re-opened for ${backendUrl} (half-open test failed)`);
  }
  state.halfOpenSuccess = false;
}

function recordBackendSuccess(backendUrl) {
  const state = getCircuitState(backendUrl);
  if (state.state === 'HALF_OPEN') {
    state.halfOpenSuccess = true;
    state.state = 'CLOSED';
    console.log(`[CIRCUIT] Closed for ${backendUrl} (half-open test passed)`);
  }
  state.consecutiveFailures = 0;
}

function shouldRouteToBackend(backendUrl) {
  const state = getCircuitState(backendUrl);
  const now = Date.now();

  if (state.state === 'CLOSED') return true;

  if (state.state === 'OPEN') {
    if (now - (state.lastFailureTime || 0) > CIRCUIT_TIMEOUT) {
      state.state = 'HALF_OPEN';
      state.halfOpenSuccess = false;
      console.log(`[CIRCUIT] Half-open for ${backendUrl} after timeout`);
      return true;
    }
    return false; // Block
  }

  if (state.state === 'HALF_OPEN') {
    if (state.halfOpenSuccess) return true; // Already tested ok
    return false; // Only one test allowed
  }

  return true; // Fallback
}


function updateHealthyBackends() {
  healthyBackends = allBackends.filter(url => healthyBackends.includes(url) && shouldRouteToBackend(url)); // Health + circuit
  stats.healthy_backends = healthyBackends.length;
}


const stats = {
  requests_total: new Map(allBackends.map(url => [url, 0])),
  latency_ms: new Map(allBackends.map(url => [url, { total: 0, count: 0 }])),
  errors_total: new Map([...allBackends.map(url => [url, 0]), ['global', 0]]),
  healthy_backends: allBackends.length,
  pool_active_sockets: new Map(allBackends.map(url => [url, 0])),
};

function getStatsResponse() {
  const avgLatency = (backend) => {
    const data = stats.latency_ms.get(backend);
    return data.count > 0 ? Math.round(data.total / data.count) : 0;
  };

  return {
    healthy_backends: stats.healthy_backends,
    total_requests: Array.from(stats.requests_total.values()).reduce((a, b) => a + b, 0),
    total_errors: Array.from(stats.errors_total.values()).reduce((a, b) => a + b, 0),
    per_backend: allBackends.map(backend => {
      const circuit = getCircuitState(backend);
      return {
        backend,
        requests: stats.requests_total.get(backend),
        avg_latency_ms: avgLatency(backend),
        errors: stats.errors_total.get(backend),
        active_sockets: stats.pool_active_sockets.get(backend),
        healthy: healthyBackends.includes(backend),
        circuit: {
          state: circuit.state,
          consecutiveFailures: circuit.consecutiveFailures
        }
      };
    })
  };
}

const poolLogs = [];
function logPoolEvent(type, backendUrl, details = '') {
  const event = { type, backendUrl, details, timestamp: new Date().toISOString() };
  poolLogs.push(event);
  poolLogs.splice(0, poolLogs.length - 20); // Keep last 20
  if (sseClients.length > 0) {
    broadcast('pool-log', event);
  }
  console.log(`[POOL ${type.toUpperCase()}] ${backendUrl} ${details}`);
}

function updateHealthyCount() {
  updateHealthyBackends();
}

// Service PIDs
const servicePids = new Map();

app.post('/start-service/:id', (req, res) => {
  const id = req.params.id;
  if (servicePids.has(id)) return res.status(400).json({ error: 'Already running' });
  const file = id === '1' ? 'service1.js' : 'service2.js';
  const backendUrl = allBackends[parseInt(id) - 1];
  const child = spawn('node', [file], { stdio: 'ignore' });
  child.on('error', err => console.error(`Spawn error for ${file}:`, err));
  servicePids.set(id, child.pid);
  setTimeout(() => checkHealth(backendUrl), 2000); // Delay for startup
  res.json({ status: 'started', pid: child.pid });
});

app.post('/stop-service/:id', (req, res) => {
  const id = req.params.id;
  const pid = servicePids.get(id);
  if (!pid) return res.status(400).json({ error: 'Not running' });
  process.kill(pid, 'SIGTERM');
  servicePids.delete(id);
  const backendUrl = allBackends[parseInt(id) - 1];
  failureCounts.set(backendUrl, MAX_FAILURES);
  const circuit = getCircuitState(backendUrl);
  circuit.state = 'OPEN';
  circuit.consecutiveFailures = CIRCUIT_THRESHOLD;
  circuit.lastFailureTime = Date.now();
  console.log(`[CIRCUIT] Force-opened for ${backendUrl} due to manual stop`);
  // Manually remove from healthy pool immediately
  if (healthyBackends.includes(backendUrl)) {
    console.log(`${backendUrl} manually marked unhealthy due to stop. Removing from pool.`);
    healthyBackends = healthyBackends.filter(url => url !== backendUrl);
    updateHealthyCount();
  }
  checkHealth(backendUrl); 
  res.json({ status: 'stopped' });
});

// Connection Pooling: Factory for per-backend agents with structured logging
function createAgent(backendUrl) {
  const hostname = backendUrl.split('://')[1].split(':')[0];
  const port = backendUrl.split(':')[2];
  const agent = new http.Agent({
    keepAlive: true,
    keepAliveMsecs: 30000,
    maxSockets: 5,
    maxFreeSockets: 3,
    timeout: 5000,
    host: hostname,
    port: parseInt(port),
  });

  let activeCount = 0;
  const originalCreateConnection = agent.createConnection;
  agent.createConnection = function (options, callback) {
    activeCount++;
    stats.pool_active_sockets.set(backendUrl, activeCount);
    logPoolEvent('new', backendUrl, `to ${options.host}:${options.port} (active: ${activeCount})`);
    return originalCreateConnection.call(this, options, callback);
  };

  const originalGetConnection = agent.getConnection;
  agent.getConnection = function (options, callback) {
    const isReuse = agent.freeSockets[options.host + ':' + options.port] && agent.freeSockets[options.host + ':' + options.port].length > 0;
    if (isReuse) {
      logPoolEvent('reuse', backendUrl, `to ${options.host}:${options.port} (pool size: ${agent.freeSockets[options.host + ':' + options.port]?.length || 0})`);
    }
    return originalGetConnection.call(this, options, callback);
  };

  agent.on('free', (socket, options) => {
    activeCount = Math.max(0, activeCount - 1);
    stats.pool_active_sockets.set(backendUrl, activeCount);
    logPoolEvent('free', backendUrl, `for ${options.host}:${options.port} (now active: ${activeCount})`);
  });

  agent.on('close', (socket, options) => {
    activeCount = Math.max(0, activeCount - 1);
    stats.pool_active_sockets.set(backendUrl, activeCount);
    logPoolEvent('close', backendUrl, `for ${options.host}:${options.port} (now active: ${activeCount})`);
  });

  return agent;
}

const agentCache = new Map();
function getAgent(backendUrl) {
  if (!agentCache.has(backendUrl)) {
    agentCache.set(backendUrl, createAgent(backendUrl));
  }
  return agentCache.get(backendUrl);
}

// Health check: Respect circuit, record success/error
async function checkHealth(backendUrl, parentSpan = null) {
  const tracer = trace.getTracer('loadbalancer');
  const spanOptions = parentSpan ? { parent: parentSpan } : {};
  if (!shouldRouteToBackend(backendUrl)) {
    console.log(`[CIRCUIT] Skipping health check for ${backendUrl} (open circuit)`);
    return tracer.startActiveSpan(`health-check-${backendUrl}-skipped`, spanOptions, (span) => {
      span.setStatus({ code: 1, message: 'Circuit open' });
      span.end();
    });
  }
  return tracer.startActiveSpan(`health-check-${backendUrl}`, spanOptions, async (span) => {
    try {
      span.setAttribute('backend.url', backendUrl);
      span.setAttribute('using.pool', true);
      const agent = getAgent(backendUrl);
      await axios.get(`${backendUrl}/health`, { timeout: 2000, httpAgent: agent });
      failureCounts.set(backendUrl, 0);
      recordBackendSuccess(backendUrl); // Reset circuit
      if (!healthyBackends.includes(backendUrl)) {
        console.log(`${backendUrl} is back healthy! Adding to pool.`);
        healthyBackends.push(backendUrl);
        updateHealthyCount();
      }
      span.setStatus({ code: 0 });
    } catch (err) {
      const failures = (failureCounts.get(backendUrl) || 0) + 1;
      failureCounts.set(backendUrl, failures);
      recordBackendError(backendUrl); // Increment circuit failures
      console.log(`${backendUrl} health check failed (${failures}/${MAX_FAILURES})`);
      span.recordException(err);
      span.setStatus({ code: 1 });
      if (failures >= MAX_FAILURES && healthyBackends.includes(backendUrl)) {
        console.log(`${backendUrl} marked unhealthy. Removing from pool.`);
        healthyBackends = healthyBackends.filter(url => url !== backendUrl);
        updateHealthyCount();
      }
    } finally {
      span.end();
    }
  });
}

// Periodic health checks (unchanged)
setInterval(() => {
  const tracer = trace.getTracer('loadbalancer');
  tracer.startActiveSpan('periodic-health-checks', async (span) => {
    console.log('Running health checks...');
    span.setAttribute('backends.count', allBackends.length);
    await Promise.all(allBackends.map(url => checkHealth(url, span)));
    span.end();
  });
}, CHECK_INTERVAL);

// Initial health check (unchanged)
const tracer = trace.getTracer('loadbalancer');
tracer.startActiveSpan('initial-health-checks', async (span) => {
  span.setAttribute('backends.count', allBackends.length);
  await Promise.all(allBackends.map(url => checkHealth(url, span)));
  span.end();
});

// SSE Endpoint
app.get('/sse', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  const client = { req, res };
  sseClients.push(client);

  // Send initial data
  const initial = {
    stats: getStatsResponse(),
    poolLogs: [...poolLogs],
    traces: [...memoryExporter.recentSpans]
  };
  res.write(`event: initial\n`);
  res.write(`data: ${JSON.stringify(initial)}\n\n`);

  // Per-client heartbeat
  const heartbeat = setInterval(() => {
    if (!res.writableEnded) {
      res.write(': heartbeat\n\n');
    } else {
      clearInterval(heartbeat);
    }
  }, 30000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients = sseClients.filter(c => c.req !== req);
  });
});

// Traces endpoint
app.get('/traces', (req, res) => {
  res.json({ recentTraces: memoryExporter.recentSpans });
});

// Pool logs endpoint
app.get('/pool-logs', (req, res) => {
  res.json({ recentPoolEvents: poolLogs });
});

// Stats endpoint: Include circuit state
app.get('/stats', (req, res) => {
  const response = getStatsResponse();
  console.log("Load Balancer Stats:", JSON.stringify(response, null, 2));
  res.json(response);
});

// Serve dashboard
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});

// Proxy middleware: Check circuit before routing, record success/error
app.use('/', async (req, res, next) => {
  const tracer = trace.getTracer('loadbalancer');
  if (healthyBackends.length === 0) {
    stats.errors_total.set('global', (stats.errors_total.get('global') || 0) + 1);
    return tracer.startActiveSpan('no-healthy-backends', (span) => {
      span.setStatus({ code: 1, message: 'No healthy backends' });
      span.end();
      return res.status(503).json({ error: 'No healthy backends available' });
    });
  }

  // Round-robin, but filter to circuit-ok
  let selectedBackend = healthyBackends[requestIndex % healthyBackends.length];
  if (!shouldRouteToBackend(selectedBackend)) {
    console.log(`[CIRCUIT] Skipping ${selectedBackend} (open), falling back...`);
    // Fallback: Next healthy one
    const available = healthyBackends.filter(url => shouldRouteToBackend(url));
    if (available.length === 0) {
      return tracer.startActiveSpan('circuit-open-all', (span) => {
        span.setStatus({ code: 1, message: 'All circuits open' });
        span.end();
        return res.status(503).json({ error: 'All services in circuit open state' });
      });
    }
    selectedBackend = available[requestIndex % available.length];
  }
  requestIndex++;

  console.log(`Forwarding request ${requestIndex} to healthy backend: ${selectedBackend} (pool size: ${healthyBackends.length})`);

  const agent = getAgent(selectedBackend);
  const startTime = Date.now();

  let completed = false;

  const proxyMiddleware = createProxyMiddleware({
    target: selectedBackend,
    changeOrigin: true,
    pathRewrite: { '^/': '' },
    agent,
    onError: (err, req, res_) => {
      if (completed) return;
      completed = true;
      const latency = Date.now() - startTime;
      stats.requests_total.set(selectedBackend, (stats.requests_total.get(selectedBackend) || 0) + 1);
      stats.latency_ms.get(selectedBackend).total += latency;
      stats.latency_ms.get(selectedBackend).count += 1;
      stats.errors_total.set(selectedBackend, (stats.errors_total.get(selectedBackend) || 0) + 1);
      recordBackendError(selectedBackend); // Circuit error
      updateHealthyBackends();
      console.error(`Proxy error for ${selectedBackend}: ${err.message}`);
      checkHealth(selectedBackend);
      res_.status(502).json({ error: 'Backend error' });
    },
  });

  await new Promise((resolve, reject) => {
    tracer.startActiveSpan('select-backend', async (span) => {
      try {
        span.setAttribute('backend.url', selectedBackend);
        span.setAttribute('request.index', requestIndex);
        span.setAttribute('healthy.pool.size', healthyBackends.length);
        span.setAttribute('using.connection.pool', true);
        span.setAttribute('circuit.state', getCircuitState(selectedBackend).state);

        const onFinish = () => {
          if (completed) return;
          completed = true;
          const latency = Date.now() - startTime;
          stats.requests_total.set(selectedBackend, (stats.requests_total.get(selectedBackend) || 0) + 1);
          stats.latency_ms.get(selectedBackend).total += latency;
          stats.latency_ms.get(selectedBackend).count += 1;
          recordBackendSuccess(selectedBackend); // Circuit success
          updateHealthyBackends(); // Re-eval
          span.setStatus({ code: 0 });
          console.log(`[STATS] Success to ${selectedBackend}: latency ${latency}ms (total reqs: ${stats.requests_total.get(selectedBackend)})`);
          resolve();
        };

        const onResError = (err) => {
          if (completed) return;
          completed = true;
          const latency = Date.now() - startTime;
          stats.requests_total.set(selectedBackend, (stats.requests_total.get(selectedBackend) || 0) + 1);
          stats.latency_ms.get(selectedBackend).total += latency;
          stats.latency_ms.get(selectedBackend).count += 1;
          stats.errors_total.set(selectedBackend, (stats.errors_total.get(selectedBackend) || 0) + 1);
          recordBackendError(selectedBackend); // Circuit error
          updateHealthyBackends();
          span.recordException(err);
          span.setStatus({ code: 1 });
          console.error(`[STATS] Res error for ${selectedBackend}: ${err.message}`);
          reject(err);
        };

        res.on('finish', onFinish);
        res.on('error', onResError);

        const dummyNext = () => console.warn('[DEBUG] Proxy called next unexpectedly');
        proxyMiddleware(req, res, dummyNext);

      } catch (err) {
        if (completed) return;
        completed = true;
        const latency = Date.now() - startTime;
        stats.requests_total.set(selectedBackend, (stats.requests_total.get(selectedBackend) || 0) + 1);
        stats.latency_ms.get(selectedBackend).total += latency;
        stats.latency_ms.get(selectedBackend).count += 1;
        stats.errors_total.set(selectedBackend, (stats.errors_total.get(selectedBackend) || 0) + 1);
        recordBackendError(selectedBackend);
        updateHealthyBackends();
        span.recordException(err);
        span.setStatus({ code: 1 });
        reject(err);
      } finally {
        span.end();
      }
    });
  }).catch(next);
});

// 404 (unchanged)
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Periodic stats broadcast for SSE clients
setInterval(() => {
  if (sseClients.length > 0) {
    const statsData = getStatsResponse();
    broadcast('stats', statsData);
  }
}, 5000);

app.listen(port, () => {
  console.log(`Load Balancer listening on port ${port}`);
  console.log(`Dashboard at http://localhost:${port}/dashboard`);
  console.log(`SSE at http://localhost:${port}/sse`);
  console.log(`Monitoring ${allBackends.length} backends with Circuit Breaker. Initial checks starting...`);
});
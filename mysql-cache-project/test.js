const express = require('express');
const Cache = require('./cache');
const cluster = require('cluster');
const os = require('os');

const app = express();
app.use(express.json());  // Parse JSON bodies

const cache = new Cache();

// API endpoints for cache ops
app.get('/cache/:key', async (req, res) => {
    const value = await cache.get(req.params.key);
    res.json({ value });
});

app.post('/cache/:key', async (req, res) => {
    await cache.set(req.params.key, req.body.value, req.body.ttl || null);
    res.json({ success: true });
});

app.delete('/cache/:key', async (req, res) => {
    await cache.delete(req.params.key);
    res.json({ success: true });
});

const PORT = 3000;

const numCPUs = os.cpus().length;

if (cluster.isMaster) {
    console.log(`Master ${process.pid} is running`);

    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    cluster.on('exit', (worker, code, signal) => {
        console.log(`Worker ${worker.process.pid} died. Restarting...`);
        cluster.fork();
    });
} else {
    console.log(`Worker ${process.pid} started`);
    app.listen(PORT, () => {
        console.log(`Worker listening on port ${PORT}`);
    });
}
Thsi repo for practising System Design Architecturs MVP


Peak RPS = (Daily Active Events × Peak Factor) ÷ 86,400
Storage = Daily Events × Retention Years × Size Per Event
Bandwidth = Daily Events × Avg Response Size


Rule of thumb you must remember for every system design:

- Social/sharing systems → always heavily read-heavy (10x–100x)
- Logging/monitoring → write-heavy
- Chat → balanced or slightly write-heavy


Never use a low-cardinality or monotonically increasing value as partition key in a high-throughput table.
Good partition keys (high cardinality + random):

idempotency_key
UUID
SHA-256 hash of something
KSUID / ULID



# URL Shortener

- Base62 encoding from auto-increment ID
- Redis caching for <50ms redirects
- Rate limiting (10/min per IP)
- Auto-expiry
- Custom Alias (Node.js + PostgreSQL + Redis)
- Implemented AWS full architecture using API Gateway, Elastic Cache Redis, Lambda, DynamoDB
- **Two-layer caching** for < 10 ms global redirects
- 100% serverless, auto-scales to 100K+ RPS


### Tech Stack (Real Production Architecture)

| Layer               | Technology Used                                   | Why?                                      |
|---------------------|---------------------------------------------------|-------------------------------------------|
| API                 | API Gateway (HTTP API) + Lambda (Node.js 20 ARM)  | Serverless, pay-per-request               |
| Application Cache   | ElastiCache Redis (cache.t4g.micro)               | < 5 ms cache hits                         |
| Database            | DynamoDB (On-Demand, partition key = short_code)  | Single-digit ms reads, infinite scale     |
| ID Generation       | Distributed 64-bit Snowflake (time-ordered)       | No central counter, sortable, collision-free |
| Encoding            | Base62 (a-zA-Z0-9)                                | Short, URL-safe codes                     |

### Architecture Diagram (Text)

User → CloudFront (Edge Cache)
↓
API Gateway → Lambda (Node.js)
↓
ElastiCache Redis → Hit → < 5 ms 302
↓ Miss
DynamoDB → < 80 ms → Write to Redis (1h TTL)



# Live Comments Platform (Hybrid SSE + Polling)

A production-style MVP for large-scale live comments with automatic mode switching under viral traffic.

## What is build

- Designed for real-world scale patterns, not just CRUD.
- Uses a hybrid delivery model:
  - **Normal mode**: low-latency SSE with Redis Pub/Sub.
  - **Hot/Viral mode**: polling from Redis recent-comment cache.
- Demonstrates **horizontal scaling** with 3 Go app replicas behind Nginx.
- Implements **subscription lifecycle cleanup** to avoid idle Pub/Sub leaks.
- Includes a UI stress simulation flow and virtualized rendering (in sibling UI app).

## Core Features Implemented

- **Durable comment writes** to Cassandra (`video_id`, `timeuuid` clustering).
- **Real-time fanout** using Redis Pub/Sub per `comments:{videoId}` channel.
- **Recent comments cache** in Redis List for hot-mode polling (`LPUSH` + `LTRIM`).
- **Automatic mode switching** based on viewer count threshold:
  - `normal` -> SSE stream
  - `hot` -> polling endpoint
- **Viewer tracking** (`INCR` / `DECR`) per video in Redis.
- **Auto unsubscribe** when active viewers drop to zero:
  - Immediate cleanup on disconnect
  - Background cleanup worker every 15s
- **Cursor pagination** for historical comments.
- **CORS middleware** for local UI origins:
  - `http://127.0.0.1:5501`
  - `http://localhost:5501`
- **Test endpoints** to force traffic modes quickly:
  - `POST /make-viral/:videoId`
  - `POST /reset-normal/:videoId`

## High-Level Architecture

Client UI
-> Nginx (LB)
-> Go API replicas (app1, app2, app3)
-> Cassandra (durable storage)
-> Redis (Pub/Sub + viewer counts + recent cache)

## Tech Stack

- **Backend**: Go, Gin
- **Streaming**: SSE
- **Cache + Pub/Sub**: Redis
- **Primary DB**: Cassandra
- **Load balancing**: Nginx
- **Containerization**: Docker, Docker Compose

## Project Structure

- `main.go` - API routes, wiring, CORS
- `internal/handler/comment.go` - create/read/stream/poll handlers
- `internal/service/video_mode.go` - mode state (`normal` / `hot`)
- `internal/repository/cassandra.go` - durable comment storage + pagination
- `internal/repository/redis.go` - viewer counts, pub/sub, recent cache
- `internal/subscription/manager.go` - subscription lifecycle + idle cleanup
- `docker-compose.yml` - Cassandra, Redis, 3 app replicas, Nginx

## API Endpoints

### Create Comment

`POST /comments/:videoId`

Body:

```json
{
  "user_id": "alice",
  "content": "Great stream!"
}
```

### Get Paginated Comments

`GET /comments/:videoId?limit=20&cursor=<comment_id>`

### Stream (Normal Mode)

`GET /stream/:videoId`

- Returns SSE events in normal mode.
- Returns JSON with `mode=hot` + poll hint when viral.

### Poll (Hot Mode)

`GET /poll/:videoId?limit=30`

### Force Mode for Demo

- `POST /make-viral/:videoId`
- `POST /reset-normal/:videoId`

## Run Locally (Docker)

From this folder:

```bash
docker-compose up --build
```

Service endpoints:

- API via Nginx: `http://localhost:8080`
- Cassandra: `localhost:9042`
- Redis: `localhost:6379`

## Quick Demo Script

1. Connect stream:

```bash
curl -N http://localhost:8080/stream/video123
```

2. Post comment:

```bash
curl -X POST http://localhost:8080/comments/video123 \
  -H "Content-Type: application/json" \
  -d '{"user_id":"alice","content":"hello live!"}'
```

3. Force viral mode:

```bash
curl -X POST http://localhost:8080/make-viral/video123
```

4. Poll in viral mode:

```bash
curl "http://localhost:8080/poll/video123?limit=30"
```

5. Reset to normal mode:

```bash
curl -X POST http://localhost:8080/reset-normal/video123
```

## Frontend Demo

A browser demo UI is available in sibling folder:

- `../fb-live-comments-poc_6_ui/index.html`

Serve it on port 5501 (example):

```bash
cd ../fb-live-comments-poc_6_ui
python3 -m http.server 5501
```

Then open:

- `http://127.0.0.1:5501`

## Performance-Oriented Decisions

- Hybrid transport avoids pushing SSE beyond practical fanout under extreme load.
- Redis recent cache reduces DB pressure in viral mode.
- Virtualized comment rendering in UI avoids DOM explosion during simulation.
- Idle subscription cleanup prevents background resource leaks.
---

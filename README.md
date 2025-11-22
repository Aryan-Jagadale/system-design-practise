Thsi repo for practising System Design Architecturs MVP


Peak RPS = (Daily Active Events × Peak Factor) ÷ 86,400
Storage = Daily Events × Retention Years × Size Per Event
Bandwidth = Daily Events × Avg Response Size



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
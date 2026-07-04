                    React Components
                           │
                           ▼
                    Store / Controller
                           │
             ┌─────────────┴─────────────┐
             ▼                           ▼
      Client Database              Message Scheduler
             │                           │
             └─────────────┬─────────────┘
                           ▼
                     Data Syncer
                 HTTP + Mock WebSocket
                           │
                           ▼
                      Fake Server
Why idempotency_key is the Partition Key (and why this decision saves us at scale)


------------Why partition key = idempotency_key?
This is the only field we will ever query with “get me this exact request”. Every retry from the caller will carry the exact same key.

What happens on lookup?
DynamoDB GetItem(idempotency_key) → single-digit millisecond, exactly one network hop, no scan, no query → O(1) cost and latency even at 10 000 RPS.


How does it scale?
DynamoDB partitions data by partition key → each unique idempotency_key lives on its own partition → perfectly horizontal. We can do millions of writes/reads per second without hot-key free.



What if I had used user_id or order_id as partition key?
Hot partition hell! One user placing 1000 orders in a flash sale → all emails land on same partition → throttling + latency spikes → your whole system dies on Black Friday.


------------Why we will add a Global Secondary Index (GSI) and how it works
Right now we can only query by idempotency_key.
But later we will want dashboards and support queries like:

“Show me all emails sent to john@gmail.com in the last 7 days”
“What is the status of order ORD-12345 notification?”
“How many emails are still in QUEUED state?”

A GSI is basically a second “view” of the same data with a different partition key.
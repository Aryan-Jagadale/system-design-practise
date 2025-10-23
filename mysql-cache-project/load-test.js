const pipeline = [
  {
    method: 'GET',
    url: '/cache/user:123',  // Read
    weight: 7  // 70% of requests
  },
  {
    method: 'POST',
    url: '/cache/user:456',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ value: { name: 'Test' }, ttl: 60 }),
    weight: 3  // 30% of requests
  }
];

module.exports = pipeline;
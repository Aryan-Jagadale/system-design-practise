
const Redis = require('ioredis');

let redis;

const getRedisClient = () => {
  if (redis) return redis;

  redis = new Redis({
    host: process.env.REDIS_ENDPOINT,
    port: Number(process.env.REDIS_PORT) || 6379,

    retryStrategy: times => Math.min(times * 50, 2000),
    maxRetriesPerRequest: 3,
    reconnectOnError: err => {
      const targetError = 'READONLY';
      if (err.message.includes(targetError)) return true;
      return false;
    },
    lazyConnect: true,
    tls: {} 
  });

  redis.on('error', (err) => {
    console.log('Redis connection error (fallback to DB):', err.message);
  });

  return redis;
};

module.exports = getRedisClient();
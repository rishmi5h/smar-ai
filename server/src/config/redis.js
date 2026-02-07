import IORedis from 'ioredis';

let connection = null;

export const getRedisConnection = () => {
  if (connection) return connection;

  const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

  connection = new IORedis(REDIS_URL, {
    maxRetriesPerRequest: null, // required by BullMQ
    enableReadyCheck: false,
  });

  connection.on('error', (err) => {
    console.error('Redis connection error:', err.message);
  });

  connection.on('connect', () => {
    console.log('Redis connected');
  });

  return connection;
};

export default getRedisConnection;

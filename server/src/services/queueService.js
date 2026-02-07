import { Queue } from 'bullmq';
import { getRedisConnection } from '../config/redis.js';

let reviewQueue = null;

const getQueue = () => {
  if (reviewQueue) return reviewQueue;

  reviewQueue = new Queue('code-review', {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50 },
    },
  });

  return reviewQueue;
};

export const enqueueReviewJob = async (data) => {
  const queue = getQueue();
  const job = await queue.add('review-pr', data, {
    jobId: data.deliveryId, // idempotency key
  });
  console.log(`Enqueued review job ${job.id} for ${data.owner}/${data.repo}#${data.prNumber}`);
  return job;
};

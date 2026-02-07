import { Worker } from 'bullmq';
import { getRedisConnection } from '../config/redis.js';
import { reviewPullRequest } from '../services/codeReviewService.js';

let worker = null;

export const startReviewWorker = () => {
  worker = new Worker(
    'code-review',
    async (job) => {
      const { jobId, installationId, owner, repo, prNumber, config } = job.data;

      console.log(`Processing review job ${job.id}: ${owner}/${repo}#${prNumber}`);

      const result = await reviewPullRequest(
        jobId,
        installationId,
        owner,
        repo,
        prNumber,
        config
      );

      console.log(`Review completed for ${owner}/${repo}#${prNumber}: ${result.commentsPosted} comments posted`);
      return result;
    },
    {
      connection: getRedisConnection(),
      concurrency: 2,
      limiter: {
        max: 5,
        duration: 60000,
      },
    }
  );

  worker.on('completed', (job, result) => {
    console.log(`Job ${job.id} completed:`, result);
  });

  worker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} failed:`, err.message);
  });

  worker.on('error', (err) => {
    console.error('Worker error:', err.message);
  });

  console.log('Review worker started');
  return worker;
};

export const stopReviewWorker = async () => {
  if (worker) {
    await worker.close();
    console.log('Review worker stopped');
  }
};

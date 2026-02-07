import express from 'express';
import { verifyWebhookSignature } from '../middleware/webhookVerify.js';
import { enqueueReviewJob } from '../services/queueService.js';
import {
  upsertInstallation,
  deleteInstallation,
  upsertRepository,
  getRepositoryByFullName,
  createReviewJob,
} from '../db/queries.js';

export const webhookRoute = express.Router();

webhookRoute.post('/github', verifyWebhookSignature, async (req, res) => {
  const event = req.headers['x-github-event'];
  const deliveryId = req.headers['x-github-delivery'];
  const payload = req.body;

  console.log(`Webhook received: ${event} (delivery: ${deliveryId})`);

  // Return 200 quickly — processing happens async via queue
  res.status(200).json({ received: true });

  try {
    switch (event) {
      case 'pull_request':
        await handlePullRequestEvent(payload, deliveryId);
        break;

      case 'installation':
        await handleInstallationEvent(payload);
        break;

      case 'installation_repositories':
        await handleInstallationRepositoriesEvent(payload);
        break;

      default:
        console.log(`Ignoring event: ${event}`);
    }
  } catch (error) {
    console.error(`Error processing webhook ${event}:`, error.message);
  }
});

async function handlePullRequestEvent(payload, deliveryId) {
  const action = payload.action;

  // Only review on opened or new commits pushed (synchronize)
  if (action !== 'opened' && action !== 'synchronize') {
    console.log(`Ignoring PR action: ${action}`);
    return;
  }

  const prNumber = payload.pull_request.number;
  const prTitle = payload.pull_request.title;
  const repoFullName = payload.repository.full_name;
  const installationId = payload.installation?.id;

  if (!installationId) {
    console.error('No installation ID in webhook payload');
    return;
  }

  // Look up the repo in our DB
  const repoRecord = await getRepositoryByFullName(repoFullName);
  if (!repoRecord) {
    console.log(`Repository ${repoFullName} not found in DB, skipping`);
    return;
  }

  if (!repoRecord.enabled) {
    console.log(`Reviews disabled for ${repoFullName}, skipping`);
    return;
  }

  // Create a review job record (idempotent via delivery_id)
  const job = await createReviewJob(repoRecord.id, prNumber, prTitle, deliveryId);
  if (!job) {
    console.log(`Duplicate webhook delivery ${deliveryId}, skipping`);
    return;
  }

  const [owner, repo] = repoFullName.split('/');

  // Enqueue for async processing
  await enqueueReviewJob({
    jobId: job.id,
    deliveryId,
    installationId,
    owner,
    repo,
    prNumber,
    config: repoRecord.config || {},
  });
}

async function handleInstallationEvent(payload) {
  const action = payload.action;
  const installation = payload.installation;

  if (action === 'created') {
    const record = await upsertInstallation(
      installation.id,
      installation.account.login,
      installation.account.type
    );

    // Store the repositories that came with the installation
    if (payload.repositories) {
      for (const repo of payload.repositories) {
        await upsertRepository(record.id, repo.id, repo.full_name);
      }
    }

    console.log(`Installation created for ${installation.account.login}`);

  } else if (action === 'deleted') {
    await deleteInstallation(installation.id);
    console.log(`Installation deleted for ${installation.account.login}`);
  }
}

async function handleInstallationRepositoriesEvent(payload) {
  const installationId = payload.installation.id;
  const installRecord = await upsertInstallation(
    installationId,
    payload.installation.account.login,
    payload.installation.account.type
  );

  // Add new repos
  if (payload.repositories_added) {
    for (const repo of payload.repositories_added) {
      await upsertRepository(installRecord.id, repo.id, repo.full_name);
    }
  }

  // We don't delete repos from our DB when removed from the installation —
  // the installation deletion cascade handles full cleanup.
}

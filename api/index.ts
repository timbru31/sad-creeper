import type { EmitterWebhookEvent } from '@octokit/webhooks';
import type { IssuesOpenedEvent } from '@octokit/webhooks-types';
import { getPrivateKey } from '@probot/get-private-key';
import { VercelRequest, VercelResponse } from '@vercel/node';
import { promises as fsPromises } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Probot } from 'probot';
import sadCreeper from '../src/index.js';

let probot: Probot;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const initializeProbot = async () => {
  const options = {
    appId: Number(process.env.APP_ID),
    privateKey: getPrivateKey()!,
    secret: process.env.WEBHOOK_SECRET,
  };

  const localProbotInstance = probot || new Probot(options);
  await localProbotInstance.load(sadCreeper);

  return localProbotInstance;
};

export default async (request: VercelRequest, response: VercelResponse) => {
  if (request.method === 'GET') {
    const content = await fsPromises.readFile(resolve(__dirname, '../public/index.html'), {
      encoding: 'utf-8',
    });
    response.status(200).send(content);
    return;
  }

  const name = (request.headers['x-github-event'] || request.headers['X-GitHub-Event']) as string;
  const id = (request.headers['x-github-delivery'] || request.headers['X-GitHub-Delivery']) as string;

  probot = probot || (await initializeProbot());
  try {
    await probot.receive({
      id,
      name,
      payload: request.body as IssuesOpenedEvent,
    } as EmitterWebhookEvent<'issues.opened'>);
    response.status(200).send(null);
  } catch (err) {
    response.status(500).json({ error: JSON.stringify(err), req: JSON.stringify(request) });
  }
};

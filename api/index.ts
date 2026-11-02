import type { EmitterWebhookEvent } from '@octokit/webhooks';
import { getPrivateKey } from '@probot/get-private-key';
import { VercelRequest, VercelResponse } from '@vercel/node';
import { promises as fsPromises } from 'node:fs';
import { resolve } from 'node:path';
import { Probot } from 'probot';
import sadCreeper from '../src/index.js';

let probot: Probot;

const initializeProbot = async (): Promise<Probot> => {
  const options = {
    appId: Number(process.env.APP_ID),
    privateKey: getPrivateKey() ?? undefined,
    secret: process.env.WEBHOOK_SECRET,
  };

  const localProbotInstance = probot || new Probot(options);
  await localProbotInstance.load(sadCreeper);

  return localProbotInstance;
};

const handler = async (request: VercelRequest, response: VercelResponse): Promise<void> => {
  if (request.method === 'GET') {
    const content = await fsPromises.readFile(resolve(import.meta.dirname, '../public/index.html'), {
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
      payload: request.body,
    } as EmitterWebhookEvent<'issues.opened'>);
    response.status(200).send(null);
  } catch (err) {
    response.status(500).json({ error: JSON.stringify(err), req: JSON.stringify(request) });
  }
};

export default handler;

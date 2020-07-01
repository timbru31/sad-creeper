// eslint-disable-next-line no-unused-vars
import { NowRequest, NowResponse } from '@now/node'
// eslint-disable-next-line no-unused-vars
import { createProbot, Probot } from 'probot'
import { findPrivateKey } from 'probot/lib/private-key'
import { logRequestErrors } from 'probot/lib/middleware/log-request-errors'
import sadCreeper from '../src'
import { promises as fsPromises } from 'fs'
import { resolve } from 'path'

let probot: Probot

const initializeProbot = () => {
  const options = {
    cert: String(findPrivateKey()),
    id: Number(process.env.APP_ID),
    secret: process.env.WEBHOOK_SECRET
  }

  const localProbotInstance = probot || createProbot(options)

  process.on('unhandledRejection', localProbotInstance.errorHandler as any)
  localProbotInstance.load(sadCreeper)

  localProbotInstance.server.use(logRequestErrors)
  return localProbotInstance
}

export default async (request: NowRequest, response: NowResponse) => {
  if (request.method === 'GET') {
    const content = await fsPromises.readFile(
      resolve(__dirname, '../public/index.html'),
      {
        encoding: 'utf-8'
      }
    )
    response.status(200).send(content)
    return
  }

  const name =
    (request.headers['x-github-event'] as string) ||
    (request.headers['X-GitHub-Event'] as string)
  const id =
    (request.headers['x-github-delivery'] as string) ||
    (request.headers['X-GitHub-Delivery'] as string)

  probot = probot || initializeProbot()
  try {
    await probot.receive({
      id,
      name,
      payload: request.body
    })
    response.status(200)
  } catch (err) {
    response
      .status(500)
      .json({ error: JSON.stringify(err), req: JSON.stringify(request) })
  }
}

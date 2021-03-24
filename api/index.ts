// eslint-disable-next-line no-unused-vars
import { VercelRequest, VercelResponse } from '@vercel/node'
// eslint-disable-next-line no-unused-vars
import { createProbot, Probot } from 'probot'
import sadCreeper from '../src'
import { promises as fsPromises } from 'fs'
import { resolve } from 'path'
import { getPrivateKey } from '@probot/get-private-key'

let probot: Probot

const initializeProbot = () => {
  const options = {
    appId: Number(process.env.APP_ID),
    privateKey: getPrivateKey()!,
    secret: process.env.WEBHOOK_SECRET
  }

  const localProbotInstance = probot || createProbot({ overrides: options })

  // process.on('unhandledRejection', getErrorHandler)
  localProbotInstance.load(sadCreeper)

  return localProbotInstance
}

export default async (request: VercelRequest, response: VercelResponse) => {
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
    (request.headers['x-github-event'] as any) ||
    (request.headers['X-GitHub-Event'] as any)
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

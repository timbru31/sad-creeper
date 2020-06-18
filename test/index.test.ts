import nock from 'nock'
import { Probot } from 'probot'
import { readFile } from 'fs'
import { join } from 'path'

import sadCreeper from '../src'
import payloadNoVersion from './fixtures/issues.opened.no.version.json'
import payloadVersionInComment from './fixtures/issues.opened.version.in.comment.json'
import payloadWithSecretPhrase from './fixtures/issues.opened.no.version.but.secret.json'
import payloadValidVersion from './fixtures/issues.opened.valid.version.json'
const issueCreatedBody = {
  body:
    'Your issue does not contain a valid output of the /version command and will now be closed and ignored.\n' +
    'Please create a new issue, follow the template and include a valid /version output.'
}

describe('Sad Creeper', () => {
  let probot: any
  let mockCert: string

  beforeAll((done: Function) => {
    readFile(
      join(__dirname, 'fixtures/mock-cert.pem'),
      { encoding: 'utf8' },
      (err: NodeJS.ErrnoException | null, data: string) => {
        if (err) {
          return done(err)
        }
        mockCert = data
        done()
      }
    )
  })

  beforeEach(() => {
    nock.disableNetConnect()
    probot = new Probot({ id: 123, cert: mockCert })
    probot.load(sadCreeper)

    nock('https://api.github.com')
      .get('/repos/timbru31/sad-creeper/contents/.github/config.yml')
      .reply(404)
      .get('/repos/timbru31/.github/contents/.github/config.yml')
      .reply(404)
  })

  test('creates a comment when an issue is opened w/o a valid version', async (done) => {
    nock('https://api.github.com')
      .post('/repos/timbru31/sad-creeper/issues/1/comments', (body: any) => {
        done(expect(body).toMatchObject(issueCreatedBody))
        return true
      })
      .reply(200)

    await probot.receive({ name: 'issues', payload: payloadNoVersion })
  })

  test('creates a comment when an issue is opened w/ a valid version, but included in a comment', async (done) => {
    nock('https://api.github.com')
      .post('/repos/timbru31/sad-creeper/issues/1/comments', (body: any) => {
        done(expect(body).toMatchObject(issueCreatedBody))
        return true
      })
      .reply(200)

    await probot.receive({ name: 'issues', payload: payloadVersionInComment })
  })

  test('creates no comment when an issue is opened w/ a valid version', async (done) => {
    // @ts-ignore: 'resolve' is declared but its value is never
    const nockPromise = new Promise((resolve, reject) => {
      nock('https://api.github.com')
        .post('/repos/timbru31/sad-creeper/issues/1/comments', (_: any) => {
          reject(
            done.fail('A valid version should not create an issue comment!')
          )
          return true
        })
        .reply(200)
    })

    const timeout = new Promise((resolve) => {
      const id = setTimeout(() => {
        clearTimeout(id)
        resolve(done())
      }, 3500)
    })

    await probot.receive({
      name: 'issues',
      payload: payloadValidVersion
    })

    await Promise.race([nockPromise, timeout])
  })

  test('creates no comment when an issue is opened w/ the secret phrase', async (done) => {
    // @ts-ignore: 'resolve' is declared but its value is never
    const nockPromise = new Promise((resolve, reject) => {
      nock('https://api.github.com')
        .post('/repos/timbru31/sad-creeper/issues/1/comments', (_: any) => {
          reject(done.fail('The secret phrase should not create a comment!'))
          return true
        })
        .reply(200)
    })

    const timeout = new Promise((resolve) => {
      const id = setTimeout(() => {
        clearTimeout(id)
        resolve(done())
      }, 3500)
    })

    await probot.receive({
      name: 'issues',
      payload: payloadWithSecretPhrase
    })

    await Promise.race([nockPromise, timeout])
  })

  afterEach(() => {
    nock.cleanAll()
    nock.enableNetConnect()
  })
})

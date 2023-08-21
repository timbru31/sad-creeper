import type { IssuesOpenedEvent, Issue } from '@octokit/webhooks-types';
import { readFile } from 'fs';
import nock from 'nock';
import { join } from 'path';
import { Probot, ProbotOctokit } from 'probot';

import sadCreeper from '../src';
import payloadWithSecretPhrase from './fixtures/issues.opened.no.version.but.secret.json';
import payloadNoVersion from './fixtures/issues.opened.no.version.json';
import payloadValidVersion from './fixtures/issues.opened.valid.version.json';
import payloadVersionInComment from './fixtures/issues.opened.version.in.comment.json';
const issueCreatedBody = {
  body:
    'Your issue does not contain a valid output of the /version command and will now be closed and ignored.\n' +
    'Please create a new issue, follow the template and include a valid /version output.',
};

describe('Sad Creeper', () => {
  let probot: Probot;
  let mockCert: string;

  beforeAll((done) => {
    readFile(join(__dirname, 'fixtures/mock-cert.pem'), { encoding: 'utf8' }, (err: NodeJS.ErrnoException | null, data: string) => {
      if (err) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return done(err);
      }
      mockCert = data;
      done();
    });
  });

  beforeEach(async () => {
    nock.disableNetConnect();
    nock('https://api.github.com')
      .get('/repos/timbru31/sad-creeper/contents/.github%2Fconfig.yml')
      .reply(404)
      .get('/repos/timbru31/.github/contents/.github%2Fconfig.yml')
      .reply(404);

    probot = new Probot({
      githubToken: 'test',
      appId: 123,
      privateKey: mockCert,
      Octokit: ProbotOctokit.defaults({
        retry: { enabled: false },
        throttle: { enabled: false },
      }),
    });
    await probot.load(sadCreeper);
  });

  test('creates a comment when an issue is opened w/o a valid version', async () => {
    nock('https://api.github.com')
      .post('/repos/timbru31/sad-creeper/issues/1/comments', (body: IssuesOpenedEvent) => {
        expect(body).toMatchObject(issueCreatedBody);
        return true;
      })
      .reply(200)
      .patch('/repos/timbru31/sad-creeper/issues/1', (body: Issue) => {
        expect(body.state).toStrictEqual('closed');
        return true;
      })
      .reply(200);

    await probot.receive({
      id: '',
      name: 'issues',
      payload: payloadNoVersion as IssuesOpenedEvent,
    });
  });

  test('creates a comment when an issue is opened w/ a valid version, but included in a comment', async () => {
    nock('https://api.github.com')
      .post('/repos/timbru31/sad-creeper/issues/2/comments', (body: IssuesOpenedEvent) => {
        expect(body).toMatchObject(issueCreatedBody);
        return true;
      })
      .reply(200)
      .patch('/repos/timbru31/sad-creeper/issues/2', (body: Issue) => {
        expect(body.state).toStrictEqual('closed');
        return true;
      })
      .reply(200);

    await probot.receive({
      id: '',
      name: 'issues',
      payload: payloadVersionInComment as IssuesOpenedEvent,
    });
  });

  test('creates no comment when an issue is opened w/ a valid version', async () => {
    const nockPromise = new Promise((_resolve, reject) => {
      nock('https://api.github.com')
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        .post('/repos/timbru31/sad-creeper/issues/1/comments', (_body: IssuesOpenedEvent) => {
          reject(new Error('A valid version should not create an issue comment!'));
          return true;
        })
        .reply(200);
    });

    const timeout = new Promise<void>((resolve) => {
      const id = setTimeout(() => {
        clearTimeout(id);
        resolve();
      }, 1000);
    });

    await probot.receive({
      id: '',
      name: 'issues',
      payload: payloadValidVersion as IssuesOpenedEvent,
    });

    await Promise.race([nockPromise, timeout]);
  });

  test('creates no comment when an issue is opened w/ the secret phrase', async () => {
    const nockPromise = new Promise((_resolve, reject) => {
      nock('https://api.github.com')
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        .post('/repos/timbru31/sad-creeper/issues/1/comments', (_body: IssuesOpenedEvent) => {
          reject(new Error('The secret phrase should not create a comment!'));
          return true;
        })
        .reply(200);
    });

    const timeout = new Promise<void>((resolve) => {
      const id = setTimeout(() => {
        clearTimeout(id);
        resolve();
      }, 1000);
    });

    await probot.receive({
      id: '',
      name: 'issues',
      payload: payloadWithSecretPhrase as IssuesOpenedEvent,
    });

    await Promise.race([nockPromise, timeout]);
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });
});

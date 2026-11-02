import type { EmitterWebhookEvent } from "@octokit/webhooks";
import nock from "nock";
import { readFile } from "node:fs/promises";
import { afterEach, beforeAll, beforeEach, describe, expect, test } from "vitest";
import { join } from "node:path";
import { Probot, ProbotOctokit } from "probot";
import sadCreeper from "../src/index.js";
import payloadWithSecretPhrase from "./fixtures/issues.opened.no.version.but.secret.json" with { type: "json" };
import payloadNoVersion from "./fixtures/issues.opened.no.version.json" with { type: "json" };
import payloadValidVersion from "./fixtures/issues.opened.valid.version.json" with { type: "json" };
import payloadValidPaperModern from "./fixtures/issues.opened.valid.paper-modern.json" with { type: "json" };
import payloadValidSpigotModern from "./fixtures/issues.opened.valid.spigot-modern.json" with { type: "json" };
import payloadValidFolia from "./fixtures/issues.opened.valid.folia.json" with { type: "json" };
import payloadValidPufferfish from "./fixtures/issues.opened.valid.pufferfish.json" with { type: "json" };
import payloadValidPurpurCalendar from "./fixtures/issues.opened.valid.purpur-calendar.json" with { type: "json" };
import payloadValidPurpur121 from "./fixtures/issues.opened.valid.purpur-121.json" with { type: "json" };
import payloadValidYouer from "./fixtures/issues.opened.valid.youer.json" with { type: "json" };
import payloadVersionInComment from "./fixtures/issues.opened.version.in.comment.json" with { type: "json" };
import payloadVersionInMultilineComment from "./fixtures/issues.opened.version.in.multiline-comment.json" with { type: "json" };
import payloadVersionInNestedComment from "./fixtures/issues.opened.version.in.nested-comment.json" with { type: "json" };

const issueCreatedBody = {
  body:
    "Your issue does not contain a valid output of the /version command and will now be closed and ignored.\n" +
    "Please create a new issue, follow the template and include a valid /version output.",
};

describe("Sad Creeper", () => {
  let probot: Probot;
  let mockCert: string;

  beforeAll(async () => {
    mockCert = await readFile(join(import.meta.dirname, "fixtures/mock-cert.pem"), { encoding: "utf8" });
  });

  beforeEach(async () => {
    nock.disableNetConnect();
    nock("https://api.github.com")
      .get("/repos/timbru31/sad-creeper/contents/.github%2Fconfig.yml")
      .reply(404)
      .get("/repos/timbru31/.github/contents/.github%2Fconfig.yml")
      .reply(404);

    probot = new Probot({
      githubToken: "test",
      appId: 123,
      privateKey: mockCert,
      Octokit: ProbotOctokit.defaults({
        retry: { enabled: false },
        throttle: { enabled: false },
      }),
    });
    await probot.load(sadCreeper);
  });

  test("creates a comment when an issue is opened w/o a valid version", async () => {
    nock("https://api.github.com")
      .post("/repos/timbru31/sad-creeper/issues/1/comments", (body: { body: string }) => {
        expect(body).toMatchObject(issueCreatedBody);
        return true;
      })
      .reply(200)
      .patch("/repos/timbru31/sad-creeper/issues/1", (body: { state: string }) => {
        expect(body.state).toStrictEqual("closed");
        return true;
      })
      .reply(200);

    await probot.receive({
      id: "",
      name: "issues",
      payload: payloadNoVersion,
    } as EmitterWebhookEvent<"issues.opened">);
  });

  test("creates a comment when an issue is opened w/ a valid version, but included in a comment", async () => {
    nock("https://api.github.com")
      .post("/repos/timbru31/sad-creeper/issues/2/comments", (body: { body: string }) => {
        expect(body).toMatchObject(issueCreatedBody);
        return true;
      })
      .reply(200)
      .patch("/repos/timbru31/sad-creeper/issues/2", (body: { state: string }) => {
        expect(body.state).toStrictEqual("closed");
        return true;
      })
      .reply(200);

    await probot.receive({
      id: "",
      name: "issues",
      payload: payloadVersionInComment,
    } as EmitterWebhookEvent<"issues.opened">);
  });

  test("creates a comment when the version is hidden in a multi-line comment", async () => {
    const scope = nock("https://api.github.com")
      .post("/repos/timbru31/sad-creeper/issues/3/comments", (body: { body: string }) => {
        expect(body).toMatchObject(issueCreatedBody);
        return true;
      })
      .reply(200)
      .patch("/repos/timbru31/sad-creeper/issues/3", (body: { state: string }) => {
        expect(body.state).toStrictEqual("closed");
        return true;
      })
      .reply(200);

    await probot.receive({
      id: "",
      name: "issues",
      payload: payloadVersionInMultilineComment,
    } as EmitterWebhookEvent<"issues.opened">);

    expect(scope.isDone()).toBe(true);
  });

  test("creates a comment when a version is revealed by removing a nested comment", async () => {
    const scope = nock("https://api.github.com")
      .post("/repos/timbru31/sad-creeper/issues/4/comments", (body: { body: string }) => {
        expect(body).toMatchObject(issueCreatedBody);
        return true;
      })
      .reply(200)
      .patch("/repos/timbru31/sad-creeper/issues/4", (body: { state: string }) => {
        expect(body.state).toStrictEqual("closed");
        return true;
      })
      .reply(200);

    // Removing the inner comment on a single pass leaves
    // "<!-- This server ... -->", which still hides the version.
    await probot.receive({
      id: "",
      name: "issues",
      payload: payloadVersionInNestedComment,
    } as EmitterWebhookEvent<"issues.opened">);

    expect(scope.isDone()).toBe(true);
  });

  async function expectNoIssueAction(payload: unknown, message: string): Promise<void> {
    const number = (payload as { issue: { number: number } }).issue.number;
    const nockPromise = new Promise((_resolve, reject) => {
      nock("https://api.github.com")
        .post(`/repos/timbru31/sad-creeper/issues/${number}/comments`, () => {
          reject(new Error(message));
          return true;
        })
        .reply(200)
        .patch(`/repos/timbru31/sad-creeper/issues/${number}`, () => {
          reject(new Error(message));
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
      id: "",
      name: "issues",
      payload,
    } as EmitterWebhookEvent<"issues.opened">);

    await Promise.race([nockPromise, timeout]);
  }

  test("creates no comment when an issue is opened w/ a valid version", async () => {
    await expectNoIssueAction(payloadValidVersion, "A valid version should not create an issue comment!");
  });

  test("creates no comment when an issue is opened w/ a modern Paper version", async () => {
    await expectNoIssueAction(payloadValidPaperModern, "A modern Paper version should not create an issue comment!");
  });

  test("creates no comment when an issue is opened w/ a modern Spigot version", async () => {
    await expectNoIssueAction(payloadValidSpigotModern, "A modern Spigot version should not create an issue comment!");
  });

  test("creates no comment when an issue is opened w/ a Folia version", async () => {
    await expectNoIssueAction(payloadValidFolia, "A Folia version should not create an issue comment!");
  });

  test("creates no comment when an issue is opened w/ a Pufferfish version", async () => {
    await expectNoIssueAction(payloadValidPufferfish, "A Pufferfish version should not create an issue comment!");
  });

  test("creates no comment when an issue is opened w/ a current Purpur version (calendar MC)", async () => {
    await expectNoIssueAction(payloadValidPurpurCalendar, "A current Purpur version should not create an issue comment!");
  });

  test("creates no comment when an issue is opened w/ a Purpur 1.21 version", async () => {
    await expectNoIssueAction(payloadValidPurpur121, "A Purpur 1.21 version should not create an issue comment!");
  });

  test("creates no comment when an issue is opened w/ a Youer version", async () => {
    await expectNoIssueAction(payloadValidYouer, "A Youer version should not create an issue comment!");
  });

  test("creates no comment when an issue is opened w/ the secret phrase", async () => {
    await expectNoIssueAction(payloadWithSecretPhrase, "The secret phrase should not create a comment!");
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });
});

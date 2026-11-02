import { Probot } from "probot";

interface ConfigObject {
  issueIsMissingVersionOutputComment: string;
  issueIsMissingVersionOutputClose: boolean;
}

const SERVER_VERSION_REGEX =
  /(?:This server is running |Current Purpur)?\w*\+?\s*version:? (?:git-)?[\w.@-]+\s*(?:\(MC:\s?\d+\.\d+\.\d+\)|\(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z\))(?:\s*\(Implementing API version \d+(?:\.\d+)*\.?-R\d+(?:\.\d+)*(?:-SNAPSHOT)?\))*/iu;
const COMMENT_REGEX = /(<!--.*?-->)/gsu;
const SECRET_REGEX = /IReallyKnowWhatIAmDoingISwear/u;

/**
 * Strips HTML comments from the body, repeatedly, until no new comment
 * sequences are introduced by the removals.
 */
function stripHtmlComments(body: string): string {
  let withoutComments = body;
  let previous: string;
  do {
    previous = withoutComments;
    withoutComments = withoutComments.replaceAll(COMMENT_REGEX, "");
  } while (withoutComments !== previous);
  return withoutComments;
}

function sadCreeper(app: Probot): void {
  app.on("issues.opened", async (context) => {
    const originalIssueBody = context.payload.issue.body;
    const cleanedIssueBody = originalIssueBody ? stripHtmlComments(originalIssueBody) : "";
    if (!SERVER_VERSION_REGEX.test(cleanedIssueBody) && !SECRET_REGEX.test(originalIssueBody ?? "")) {
      const config = await context.config<ConfigObject>("config.yml", {
        issueIsMissingVersionOutputComment:
          "Your issue does not contain a valid output of the /version command and will now be closed and ignored.\n" +
          "Please create a new issue, follow the template and include a valid /version output.",
        issueIsMissingVersionOutputClose: true,
      });
      if (config && config.issueIsMissingVersionOutputComment) {
        await context.octokit.rest.issues.createComment(
          context.issue({
            body: config.issueIsMissingVersionOutputComment,
          }),
        );
        if (config.issueIsMissingVersionOutputClose) {
          await context.octokit.rest.issues.update(context.issue({ state: "closed" }));
        }
      }
    }
  });
}

export default sadCreeper;

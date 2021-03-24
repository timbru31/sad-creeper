// eslint-disable-next-line no-unused-vars
import { Probot } from 'probot'

interface ConfigObject {
  issueIsMissingVersionOutputComment: string
  issueIsMissingVersionOutputClose: boolean
}

const SERVER_VERSION_REGEX = /This server is running \w+\+? version git-\w+-"?.+"? \(MC:\s*(?:\d+\.?){1,}\)\s*\(Implementing API version (?:\d+\.?){1,}-R\d+(?:.\d+){0,}(?:-SNAPSHOT)?\)/i
const COMMENT_REGEX = /(<!--.*?-->)/g
const SECRET_REGEX = /IReallyKnowWhatIAmDoingISwear/

export = (app: Probot) => {
  app.on('issues.opened', async (context) => {
    const originalIssueBody = context.payload.issue.body
    const cleanedIssueBody = originalIssueBody
      ? originalIssueBody.replace(COMMENT_REGEX, '')
      : ''
    if (
      !cleanedIssueBody.match(SERVER_VERSION_REGEX) &&
      !originalIssueBody.match(SECRET_REGEX)
    ) {
      const config = await context.config<ConfigObject>('config.yml', {
        issueIsMissingVersionOutputComment:
          'Your issue does not contain a valid output of the /version command and will now be closed and ignored.\n' +
          'Please create a new issue, follow the template and include a valid /version output.',
        issueIsMissingVersionOutputClose: true
      })
      if (config && config.issueIsMissingVersionOutputComment) {
        await context.octokit.issues.createComment(
          context.issue({
            body: config.issueIsMissingVersionOutputComment
          })
        )
        if (config.issueIsMissingVersionOutputClose) {
          await context.octokit.issues.update(
            context.issue({ state: 'closed' })
          )
        }
      }
    }
  })
}

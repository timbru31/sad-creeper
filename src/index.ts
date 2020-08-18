// eslint-disable-next-line no-unused-vars
import { Application } from 'probot'

const SERVER_VERSION_REGEX = /This server is running \w+\+? version git-\w+-"?.+"? \(MC:\s*(?:\d+\.?){1,}\)\s*\(Implementing API version (?:\d+\.?){1,}-R\d+(?:.\d+){0,}(?:-SNAPSHOT)?\)/i
const COMMENT_REGEX = /(<!--.*?-->)/g
const SECRET_REGEX = /IReallyKnowWhatIAmDoingISwear/

export = (app: Application) => {
  app.on('issues.opened', async (context) => {
    const originalIssueBody = context.payload.issue.body
    const cleanedIssueBody = originalIssueBody
      ? originalIssueBody.replace(COMMENT_REGEX, '')
      : ''
    if (
      !cleanedIssueBody.match(SERVER_VERSION_REGEX) &&
      !originalIssueBody.match(SECRET_REGEX)
    ) {
      const config = (await context.config('config.yml'),
      {
        issueIsMissingVersionOutputComment:
          'Your issue does not contain a valid output of the /version command and will now be closed and ignored.\n' +
          'Please create a new issue, follow the template and include a valid /version output.',
        issueIsMissingVersionOutputClose: true
      }) as ConfigObject
      if (config && config.issueIsMissingVersionOutputComment) {
        context.github.issues.createComment(
          context.issue({
            body: config.issueIsMissingVersionOutputComment
          })
        )
        if (config.issueIsMissingVersionOutputClose) {
          context.github.issues.update(context.issue({ state: 'closed' }))
        }
      }
    }
  })
}

interface ConfigObject {
  issueIsMissingVersionOutputComment: string
  issueIsMissingVersionOutputClose: boolean
}

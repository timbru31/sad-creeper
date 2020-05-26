// eslint-disable-next-line no-unused-vars
import { Application } from 'probot'

const SERVER_VERSION_REGEX = /This server is running \w+\+? version git-\w+-"?.+"? \(MC: (?:\d+\.?){1,}\) \(Implementing API version (?:\d+\.?){1,}-R\d+(?:.\d+){0,}(?:-SNAPSHOT)?\)/
const COMMENT_REGEX = /(<!--.*?-->)/g

export = (app: Application) => {
  app.on('issues.opened', async (context) => {
    let issueBody = context.payload.issue.body
    issueBody = issueBody ? issueBody.replace(COMMENT_REGEX, '') : ''
    if (!issueBody.match(SERVER_VERSION_REGEX)) {
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

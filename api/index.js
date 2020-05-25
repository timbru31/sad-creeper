const { toLambda } = require('probot-serverless-now')
const app = require('../lib/index.js')
module.exports = toLambda(app)

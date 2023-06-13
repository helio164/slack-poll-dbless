const { KnownBlock } = require("@slack/types");
const { Button, ContextBlock, MrkdwnElement, PlainTextElement, SectionBlock, StaticSelect } = require("@slack/types");
const Sentry = require("@sentry/node");
const PollHelpers = require("./PollHelpers");

module.exports = class Poll {
  constructor(message) {
    // Rest of code...
  }
  static slashCreate(author, parameters) {
    // Rest of code...
  }
  getBlocks() {
    // Rest of code...
  }
  getAuthor() {
    // Rest of code...
  }
  getLockedStatus() {
    // Rest of code...
  }
  getVotesAndUserIndex(button, userId) {
    // Rest of code...
  }
  resetVote(userId) {
    // Rest of code...
  }
  vote(buttonText, userId) {
    // Rest of code...
  }
  lockPoll() {
    // Rest of code...
  }
  collectResults() {
    // Rest of code...
  }
  processButtons(loopEnd, buttonCallback) {
    // Rest of code...
  }
  buildVoteTally(overrideAnon, votes, key) {
    // Rest of code...
  }
  generateResults(overrideAnon) {
    // Rest of code...
  }
  generateVoteResults() {
    // Rest of code...
  }
  getDividerId() {
    // Rest of code...
  }
}


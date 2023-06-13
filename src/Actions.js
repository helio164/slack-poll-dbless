const Poll = require("./Poll");
const { ChatPostMessageArguments, ChatUpdateArguments, WebAPICallResult, WebClient } = require("@slack/web-api");  
const { KnownBlock } = require("@slack/types");
const { Request, Response } = require("express");
const Sentry = require("@sentry/node");
const { PollModal, ModalMap } = require("./PollModal");

const errorMsg = "An error occurred; please contact the administrators for assistance.";

module.exports = {
    public async createPollRoute(req, res) {
        // Rest of code...
    },
    public onStaticSelectAction(payload, res) {
        // Rest of code... 
    },
    public async displayModal(channelId, triggerId) {
        // Rest of code...
    },
    public handleActionException(err) {
        // Rest of code...
    },
    private postMessage(channel, text, blocks) {
        // Rest of code...
    } 
}


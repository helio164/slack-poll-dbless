const Poll = require("./Poll.js");
const { ChatPostMessageArguments, ChatUpdateArguments, WebAPICallResult, WebClient } = require("@slack/web-api");
const { KnownBlock } = require("@slack/types");
const { Request, Response } = require("express");
const Sentry = require("@sentry/node");
const { PollModal, ModalMap } = require("./PollModal.js");

const errorMsg = "An error occurred; please contact the administrators for assistance.";
module.exports = {
    public static readonly BUTTON_ACTION = "button";
    public static readonly STATIC_SELECT_ACTION = "static_select";
    constructor(slackAccessToken) {
        this.wc = new WebClient(slackAccessToken);

        // These are called in server.ts without scoping
        this.onButtonAction = this.onButtonAction.bind(this);
        this.onStaticSelectAction = this.onStaticSelectAction.bind(this);
        this.onModalAction = this.onModalAction.bind(this);
        this.createPollRoute = this.createPollRoute.bind(this);
        this.submitModal = this.submitModal.bind(this);
    }
    postMessage(channel, text, blocks) {
        const msg = { channel, text, blocks };
        return this.wc.chat.postMessage(msg);
    }
    async displayModal(channelId, triggerId) {
        const modal = new PollModal(channelId);
        const response = await this.wc.views.open({
            trigger_id: triggerId,
            view: modal.constructModalView(),
        });
        ModalMap.set(response.view.id, modal);
        return;
    }
    onModalAction(payload, res) {
        const currentModal = ModalMap.get(payload.view.id);
        const actionId = payload.actions[0].action_id;
        // We don't do anything if viewID is invalid
        if (!currentModal) return { text: "Modal not found!" };
        if (actionId === "add_option") {
            currentModal.addOption();
            this.wc.views.update({
                view_id: payload.view.id,
                view: currentModal.constructModalView(),
            });
        }
        return { text: "Modal input processed" };
    }
    closeModal(viewID) {
        ModalMap.delete(viewID);
    }
    submitModal(payload) {
        const modal = ModalMap.get(payload.view.id);
        
        if (!modal) return { response_action: "clear" };
        const form_values = payload.view.state.values;
        const poll_author = `<@${payload.user.id}>`;
        const poll_options = PollModal.submissionToPollParams(form_values);
        const poll = Poll.slashCreate(poll_author, poll_options);
        this.postMessage(modal.getChannelId(), "A poll has been posted!", poll.getBlocks()).then(() => this.closeModal(payload.view.id)).catch((err) => console.error(err));

        return { response_action: "clear" };
    }
    onButtonAction(payload, res) {
        try {
            const poll = new Poll(payload.message.blocks);
            payload.actions[0].text.text = payload.actions[0].text.text.replace("&lt;","<")
                .replace("&gt;",">").replace("&amp;","&");
            poll.vote(payload.actions[0].text.text, payload.user.id);
            payload.message.blocks = poll.getBlocks();
            payload.message.text = "Vote changed!";
            // We respond with the new payload
            res(payload.message);
            // In case it is being slow users will see this message
            return { text: "Vote processing!" };
        } catch(err) {
            return this.handleActionException(err);
        }
    }
    public onStaticSelectAction(payload: any, res: (message: any) => Promise<unknown>): { text: string } {
        try {
            const poll = new Poll(payload.message.blocks);
            switch (payload.actions[0].selected_option.value) {
                case "reset":
                    this.onResetSelected(payload, poll);
                    break;
                case "bottom":
                    this.onBottomSelected(payload, poll);
                    break;
                case "lock":
                    this.onLockSelected(payload, poll);
                    break;
                case "delete":
                    this.onDeleteSelected(payload, poll);
                    break;
            }
            res(payload.message);
            return { text: "Processing request!" };
        } catch (err) {
            return this.handleActionException(err);
        }
    }

    public async createPollRoute(req: Request, res: Response): Promise<void> {
        if (req.body.command !== "/inorout") {
            console.error(`Unregistered command ${req.body.command}`);
            res.send("Unhandled command");
            return;
        }

        // If the user just did /inorout we enter modal mode
        const iniateModal = req.body.text.trim().length == 0;

        try {
            if (!iniateModal) {
                // Create a new poll passing in the poll author and the other params
                const poll = Poll.slashCreate(`<@${req.body.user_id}>`, req.body.text.replace("@channel", "").replace("@everyone", "").replace("@here", "").split("\n"));
                await this.postMessage(req.body.channel_id, "A poll has been posted!", poll.getBlocks());
            } else {
                await this.displayModal(req.body.channel_id, req.body.trigger_id);
            }
            res.send();
        } catch (err: any) {
            // Better handling of when the bot isn't invited to the channel
            if (err.data.error === "not_in_channel") {
                res.send("Bot not in channel please use /invite @inorout or ask a dev team member for help.");
            } else {
                res.send(this.handleActionException(err).text);
            }
        }
    }

    private onResetSelected(payload: any, poll: Poll): void {
        payload.message.text = "Vote reset!";
        if (poll.getLockedStatus()) {
            this.wc.chat.postEphemeral({
                channel: payload.channel.id,
                text: "You cannot reset your vote after the poll has been locked.", user: payload.user.id
            });
        } else {
            poll.resetVote(payload.user.id);
            payload.message.blocks = poll.getBlocks();
        }
    }

    private async onBottomSelected(payload: any, poll: Poll): Promise<void> {
        payload.message.text = "Poll moved!";
        payload.message.blocks = poll.getBlocks();
        if (Actions.isPollAuthor(payload, poll)) {
            await this.wc.chat.delete({ channel: payload.channel.id, ts: payload.message.ts })
                .catch((err: any) => console.error(err));
            // Must be artificially slowed down to prevent the poll from glitching out on Slack's end
            setTimeout(() => this.postMessage(payload.channel.id, "Poll Moved!", []).then((res: any) => {
                const msg: ChatUpdateArguments = {
                    channel: payload.channel.id, text: payload.message.text,
                    ts: res.ts, blocks: payload.message.blocks
                };
                this.wc.chat.update(msg);
            }), 300);
        } else {
            this.postEphemeralOnlyAuthor("move", "poll", payload.channel.id, payload.user.id);
        }
    }

    private onLockSelected(payload: any, poll: Poll): void {
        payload.message.text = "Poll locked!";
        if (Actions.isPollAuthor(payload, poll)) {
            poll.lockPoll();
            payload.message.blocks = poll.getBlocks();
        } else {
            this.postEphemeralOnlyAuthor("lock", "poll", payload.channel.id, payload.user.id);
        }
    }

    private onDeleteSelected(payload: any, poll: Poll): void {
        if (Actions.isPollAuthor(payload, poll)) {
            payload.message.text = "This poll has been deleted.";
            payload.message.blocks = undefined;
        } else {
            this.postEphemeralOnlyAuthor("delete", "poll", payload.channel.id, payload.user.id);
        }
    }

    private postEphemeralOnlyAuthor(verb: string, object: string, channel: string, user: string): Promise<WebAPICallResult> {
        return this.wc.chat.postEphemeral({ channel, text: `Only the poll author may ${verb} the ${object}.`, user });
    }

    private static isPollAuthor(payload: any, poll: Poll): boolean {
        return `<@${payload.user.id}>` === poll.getAuthor();
    }

    private handleActionException(err: any): { text: string } {
        Sentry.captureException(err);
        console.error(err);
        return { text: errorMsg };
    }
}

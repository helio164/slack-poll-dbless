const { Button, ContextBlock, InputBlock, PlainTextElement, PlainTextOption, SectionBlock } = require("@slack/types");

module.exports = {
    appendIfMatching(optionArray, keyword, appendText) {
        return optionArray[0].toLowerCase() === keyword || optionArray[1].toLowerCase() === keyword ? appendText : "";
    },
    buildSectionBlock(mrkdwnValue) {
        return { type: "section", text: { type: "mrkdwn", text: mrkdwnValue } };
    },
    buildContextBlock(mrkdwnValue) {
        return { type: "context", elements: [ { type: "mrkdwn", text: mrkdwnValue } ] };
    },
    buildSelectOption(text, value) {
        return { text: this.buildTextElem(text), value: value };
    },
    buildTextElem(text) {
        return { type: "plain_text", text, emoji: true };
    },
    buildButton(buttonText, value, actionId) {
        return {
            type: "button",
            value: value,
            action_id: actionId,
            text: this.buildTextElem(buttonText),
        };
    },
    buildInputElem(placeHolderText, labelText, actionId) {
        return {
            type: "input",
            block_id: `bid_${actionId}`,
            element: {
                type: "plain_text_input",
                action_id: actionId,
                placeholder: this.buildTextElem(placeHolderText),
            },
            label: this.buildTextElem(labelText),
        };
    }
}

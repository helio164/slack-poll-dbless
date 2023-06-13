const Actions = require("./Actions");
const Express = require("express");
const BodyParser = require("body-parser");
const Dotenv = require("dotenv");

Dotenv.config();
const app = Express();
const port = process.env.PORT || 3000;

app.use(BodyParser.json());
app.use(BodyParser.urlencoded({ extended: true }));

app.post("/poll", (req, res) => Actions.createPollRoute(req, res));
app.post("/modal", (req, res) => Actions.displayModal(req, res));
app.post("/action", (req, res) => Actions.onStaticSelectAction(req, res));

app.listen(port, () => console.log(`Server running on port ${port}`));


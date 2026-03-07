const { startServer } = require("@microsoft/agents-hosting-express");
const { rfpAgent } = require("./agent");
startServer(rfpAgent);

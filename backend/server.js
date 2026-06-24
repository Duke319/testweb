const path = require("node:path");
const { loadEnv } = require("../src/env");
const { createApp } = require("./app");

const rootDir = path.resolve(__dirname, "..");
loadEnv(rootDir);

const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || "127.0.0.1";
const app = createApp({ rootDir });

app.listen(port, host, () => {
  console.log(`Bosch performance platform listening on http://${host}:${port}`);
});

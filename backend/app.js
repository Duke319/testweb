const express = require("express");
const cors = require("cors");
const path = require("node:path");
const fs = require("node:fs");
const apiRoutes = require("./routes");
const { errorHandler, notFoundHandler } = require("./middleware/errorHandler");

function createApp({ rootDir }) {
  const app = express();
  const frontendDist = path.join(rootDir, "frontend", "dist");
  const legacyDir = path.join(rootDir, "legacy");
  const hasFrontendBuild = fs.existsSync(path.join(frontendDist, "index.html"));

  app.disable("x-powered-by");
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: false }));

  app.use("/api", apiRoutes);

  if (hasFrontendBuild) {
    app.use(express.static(frontendDist));
    app.get("*", (request, response, next) => {
      if (request.path.startsWith("/api/")) {
        next();
        return;
      }
      response.sendFile(path.join(frontendDist, "index.html"));
    });
  } else {
    app.use(express.static(legacyDir));
    app.use(express.static(rootDir));
    app.get("/", (request, response) => {
      response.sendFile(path.join(legacyDir, "index.html"));
    });
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };

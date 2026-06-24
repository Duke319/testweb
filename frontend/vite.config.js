const { defineConfig } = require("vite");
const vue = require("@vitejs/plugin-vue");
const path = require("node:path");

const apiProxyTarget = process.env.VITE_API_PROXY_TARGET || "http://localhost:3000";
const isStaticDemo = process.env.VITE_STATIC_DEMO === "true";

module.exports = defineConfig({
  root: __dirname,
  base: isStaticDemo ? "./" : "/",
  plugins: [vue()],
  build: {
    outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      "/api": apiProxyTarget,
    },
  },
});

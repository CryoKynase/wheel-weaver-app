import { defineConfig } from "vite";
import path from "path";
import { createRequire } from "module";
import react from "@vitejs/plugin-react";

const require = createRequire(import.meta.url);
const vitePrerender = require("vite-plugin-prerender");

const prerenderRoutes = [
  "/",
  "/about",
  "/readme",
  "/builder/16",
  "/builder/18",
  "/builder/20",
  "/builder/24",
  "/builder/28",
  "/builder/32",
  "/builder/36",
  "/flow/16",
  "/flow/18",
  "/flow/20",
  "/flow/24",
  "/flow/28",
  "/flow/32",
  "/flow/36",
];

const PrerenderRenderer = vitePrerender.PuppeteerRenderer;
const isRailway = Boolean(
  process.env.RAILWAY || process.env.RAILWAY_ENVIRONMENT
);
const enablePrerender = process.env.PRERENDER === "true" || !isRailway;

export default defineConfig({
  plugins: [
    react(),
    ...(enablePrerender
      ? [
          vitePrerender({
            staticDir: path.join(__dirname, "dist"),
            routes: prerenderRoutes,
            renderer: new PrerenderRenderer({
              injectProperty: "__PRERENDER_INJECTED",
              inject: {
                isPrerender: true,
              },
              renderAfterDocumentEvent: "prerender-ready",
              skipThirdPartyRequests: true,
            }),
          }),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: "127.0.0.1",
    port: 5177,
    proxy: {
      "/api": {
        target: "http://localhost:8007",
        changeOrigin: true,
      },
    },
  },
});

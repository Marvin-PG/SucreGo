import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createApp } from "./app.js";
import { parseApiPort } from "./config/env.js";

const port = parseApiPort();
const host = process.env.API_HOST || "0.0.0.0";
const webDirectory = new URL("../../web/dist/", import.meta.url);
const serveWeb = process.env.SERVE_WEB === "true";

if (serveWeb && !existsSync(new URL("index.html", webDirectory))) {
  throw new Error("Build apps/web before starting the combined SucreGo server.");
}

const app = createApp({ webRoot: serveWeb ? fileURLToPath(webDirectory) : undefined });
app.listen(port, host, () => {
  console.info(`SucreGo ${serveWeb ? "web + API" : "API"} listening on http://${host}:${port}`);
});

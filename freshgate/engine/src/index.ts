import { serve } from "@hono/node-server";
import { app } from "./server.js";

const port = Number(process.env.ENGINE_PORT || 8787);

console.log(`FreshGate Engine starting on port ${port}...`);
serve({
  fetch: app.fetch,
  port,
});

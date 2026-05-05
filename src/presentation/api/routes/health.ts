import { Hono } from "hono";

export function healthRoutes(): Hono {
  const app = new Hono();

  app.get("/health", (c) =>
    c.json({ status: "ok", service: "viper", version: "0.2.0", uptime: process.uptime() })
  );

  return app;
}

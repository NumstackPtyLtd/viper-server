import { Hono } from "hono";

export function healthRoutes(): Hono {
  const app = new Hono();

  app.get("/health", (c) =>
    c.json({ status: "ok", service: "viper", version: "0.1.0" })
  );

  return app;
}

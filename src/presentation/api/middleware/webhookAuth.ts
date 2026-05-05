import type { MiddlewareHandler } from "hono";
import { logger } from "../../../shared/logger.js";

export function webhookAuth(secret: string): MiddlewareHandler {
  return async (c, next) => {
    const token = c.req.header("X-Gitlab-Token");

    if (token !== secret) {
      logger.warn("Webhook request with invalid secret token");
      return c.json({ error: "Unauthorized" }, 401);
    }

    await next();
  };
}

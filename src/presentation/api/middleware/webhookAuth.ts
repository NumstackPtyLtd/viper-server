import type { MiddlewareHandler } from "hono";
import type { VcsPlugin } from "../../../application/ports/VcsPlugin.js";
import { logger } from "../../../shared/logger.js";

/**
 * VCS-agnostic webhook auth middleware.
 * Delegates header validation to the active VCS plugin.
 */
export function webhookAuth(vcsPlugin: VcsPlugin, secret: string): MiddlewareHandler {
  return async (c, next) => {
    const headers: Record<string, string | undefined> = {}
    c.req.raw.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value
    })

    if (!vcsPlugin.validateWebhookAuth(headers, secret)) {
      logger.warn({ provider: vcsPlugin.type }, "Webhook request with invalid auth");
      return c.json({ error: "Unauthorized" }, 401);
    }

    await next();
  };
}

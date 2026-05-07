import type { MiddlewareHandler } from "hono";
import type { VcsPlugin } from "@supaproxy/viper-vcs-providers";
import { logger } from "../../../shared/logger.js";

/**
 * VCS-agnostic webhook auth middleware.
 * Reads the raw body and delegates validation to the active VCS plugin.
 */
export function webhookAuth(vcsPlugin: VcsPlugin, secret: string): MiddlewareHandler {
  return async (c, next) => {
    const headers: Record<string, string | undefined> = {}
    c.req.raw.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value
    })

    // Clone the request to read the raw body for HMAC verification
    const rawBody = await c.req.raw.clone().text()

    if (!vcsPlugin.validateWebhookAuth(headers, secret, rawBody)) {
      logger.warn({ provider: vcsPlugin.type }, "Webhook request with invalid auth");
      return c.json({ error: "Unauthorized" }, 401);
    }

    await next();
  };
}

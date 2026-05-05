import { Hono } from "hono";
import type { ReviewMergeRequest } from "../../../application/use-cases/ReviewMergeRequest.js";
import type { RespondToDiscussion } from "../../../application/use-cases/RespondToDiscussion.js";
import type { VcsPlugin, WebhookEvent } from "viper-vcs-providers";
import { webhookAuth } from "../middleware/webhookAuth.js";
import { logger } from "../../../shared/logger.js";

interface WebhookRouteDeps {
  reviewMergeRequest: ReviewMergeRequest;
  respondToDiscussion: RespondToDiscussion;
  vcsPlugin: VcsPlugin;
  botUserId: number | null;
  webhookSecret: string;
}

export function webhookRoutes(deps: WebhookRouteDeps): Hono {
  const app = new Hono();

  app.use("*", webhookAuth(deps.vcsPlugin, deps.webhookSecret));

  app.post("/webhook", async (c) => {
    const body = await c.req.json();

    // Parse the VCS-specific payload into a normalized event
    const event = deps.vcsPlugin.parseWebhookPayload(body);

    if (!event) {
      logger.debug({ provider: deps.vcsPlugin.type }, "Ignoring unrecognised webhook event");
      return c.json({ ok: true });
    }

    logger.info({ kind: event.kind, provider: deps.vcsPlugin.type }, "Webhook received");

    switch (event.kind) {
      case "merge_request":
        if (event.mergeRequest) {
          handleMergeRequest(event.mergeRequest, deps).catch((err) =>
            logger.error({ err }, "MR review failed")
          );
        }
        break;

      case "comment":
        if (event.comment) {
          handleComment(event.comment, deps).catch((err) =>
            logger.error({ err }, "Discussion reply failed")
          );
        }
        break;
    }

    return c.json({ ok: true });
  });

  return app;
}

async function handleMergeRequest(
  mr: NonNullable<WebhookEvent["mergeRequest"]>,
  deps: WebhookRouteDeps
): Promise<void> {
  const reviewableActions = ["open", "reopen", "update"];
  if (!mr.action || !reviewableActions.includes(mr.action)) {
    logger.debug({ action: mr.action }, "Skipping non-reviewable MR action");
    return;
  }

  await deps.reviewMergeRequest.execute({
    projectId: mr.projectId,
    mrIid: mr.iid,
    title: mr.title,
    description: mr.description,
    sourceBranch: mr.sourceBranch,
    targetBranch: mr.targetBranch,
  });
}

async function handleComment(
  comment: NonNullable<WebhookEvent["comment"]>,
  deps: WebhookRouteDeps
): Promise<void> {
  if (deps.botUserId !== null && comment.authorId === deps.botUserId) return;

  await deps.respondToDiscussion.execute({
    projectId: comment.projectId,
    mrIid: comment.mrIid,
    discussionId: comment.discussionId,
    noteBody: comment.body,
    noteAuthorId: comment.authorId,
    sourceBranch: comment.sourceBranch,
    botUserId: deps.botUserId,
  });
}

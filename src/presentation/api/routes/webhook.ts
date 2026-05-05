import { Hono } from "hono";
import type { ReviewMergeRequest } from "../../../application/use-cases/ReviewMergeRequest.js";
import type { RespondToDiscussion } from "../../../application/use-cases/RespondToDiscussion.js";
import { webhookAuth } from "../middleware/webhookAuth.js";
import { logger } from "../../../shared/logger.js";

interface WebhookRouteDeps {
  reviewMergeRequest: ReviewMergeRequest;
  respondToDiscussion: RespondToDiscussion;
  botUserId: number | null;
  webhookSecret: string;
}

interface MrWebhookPayload {
  object_kind: string;
  project: { id: number };
  object_attributes: {
    iid: number;
    title: string;
    description: string | null;
    source_branch: string;
    target_branch: string;
    action?: string;
    author_id: number;
  };
}

interface NoteWebhookPayload {
  object_kind: string;
  project: { id: number };
  merge_request?: {
    iid: number;
    source_branch: string;
  };
  object_attributes: {
    note: string;
    noteable_type: string;
    author_id: number;
    discussion_id: string;
  };
}

export function webhookRoutes(deps: WebhookRouteDeps): Hono {
  const app = new Hono();

  app.use("*", webhookAuth(deps.webhookSecret));

  app.post("/webhook", async (c) => {
    const body = await c.req.json();
    const objectKind = body.object_kind as string;

    logger.info({ objectKind }, "Webhook received");

    switch (objectKind) {
      case "merge_request":
        handleMergeRequest(body as MrWebhookPayload, deps).catch((err) =>
          logger.error({ err }, "MR review failed")
        );
        break;

      case "note":
        handleNote(body as NoteWebhookPayload, deps).catch((err) =>
          logger.error({ err }, "Discussion reply failed")
        );
        break;

      default:
        logger.debug({ objectKind }, "Ignoring event type");
    }

    return c.json({ ok: true });
  });

  return app;
}

async function handleMergeRequest(
  payload: MrWebhookPayload,
  deps: WebhookRouteDeps
): Promise<void> {
  const { object_attributes: mr, project } = payload;

  const reviewableActions = ["open", "reopen", "update"];
  if (!mr.action || !reviewableActions.includes(mr.action)) {
    logger.debug({ action: mr.action }, "Skipping non-reviewable MR action");
    return;
  }

  await deps.reviewMergeRequest.execute({
    projectId: project.id,
    mrIid: mr.iid,
    title: mr.title,
    description: mr.description,
    sourceBranch: mr.source_branch,
    targetBranch: mr.target_branch,
  });
}

async function handleNote(
  payload: NoteWebhookPayload,
  deps: WebhookRouteDeps
): Promise<void> {
  const { object_attributes: note, project, merge_request: mr } = payload;

  if (note.noteable_type !== "MergeRequest" || !mr) return;
  if (deps.botUserId !== null && note.author_id === deps.botUserId) return;

  await deps.respondToDiscussion.execute({
    projectId: project.id,
    mrIid: mr.iid,
    discussionId: note.discussion_id,
    noteBody: note.note,
    noteAuthorId: note.author_id,
    sourceBranch: mr.source_branch,
    botUserId: deps.botUserId,
  });
}

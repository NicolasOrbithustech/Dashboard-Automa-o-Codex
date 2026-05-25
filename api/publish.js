import { publishPendingTasks } from "../lib/buffer-publisher.mjs";
import { readJsonBody, requireOperatorAuth, sendJson, setCors } from "../lib/http.mjs";

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (!["GET", "POST"].includes(req.method)) {
    sendJson(res, 405, { ok: false, error: "Use GET ou POST." });
    return;
  }

  if (!(await requireOperatorAuth(req, res))) return;

  try {
    const body = req.method === "POST" ? await readJsonBody(req) : {};
    const dryRun = req.query?.dry_run === "1" || body.dry_run === true || body.dry_run === "1";
    const limit = Number(req.query?.limit || body.limit || process.env.PUBLISH_LIMIT || 10);
    const publishMode = req.query?.publish_mode === "now" || body.publish_mode === "now" || body.publishMode === "now" || body.share_now === true ? "now" : "queue";
    const taskIds = Array.isArray(body.task_ids) ? body.task_ids : Array.isArray(body.taskIds) ? body.taskIds : [];
    const contentId = body.content_id || body.contentId || "";
    const result = await publishPendingTasks({ dryRun, limit, publishMode, taskIds, contentId });
    sendJson(res, 200, result);
  } catch (error) {
    sendJson(res, 500, {
      ok: false,
      error: error.message
    });
  }
}

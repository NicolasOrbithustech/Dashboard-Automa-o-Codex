import { requireOperatorAuth, sendJson, setCors } from "../lib/http.mjs";
import { ensurePublicMediaBucket } from "../lib/storage-upload.mjs";

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== "POST") {
    sendJson(res, 405, { ok: false, error: "Use POST." });
    return;
  }

  if (!(await requireOperatorAuth(req, res))) return;

  try {
    const bucket = await ensurePublicMediaBucket();
    sendJson(res, 200, {
      ok: true,
      bucket
    });
  } catch (error) {
    sendJson(res, 500, {
      ok: false,
      error: error.message
    });
  }
}

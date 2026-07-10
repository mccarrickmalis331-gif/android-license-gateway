const ORIGIN = "https://android-license-worker.mccarrickmalis331.workers.dev";

module.exports = async (req, res) => {
  try {
    const path = String(req.query.path || "");
    const query = { ...req.query };
    delete query.path;
    const search = new URLSearchParams(query).toString();
    const response = await fetch(`${ORIGIN}/${path}${search ? `?${search}` : ""}`, {
      method: req.method,
      headers: { "content-type": req.headers["content-type"] || "application/json" },
      body: req.method === "GET" || req.method === "HEAD" ? undefined : JSON.stringify(req.body)
    });
    res.status(response.status).send(await response.text());
  } catch (error) {
    res.status(502).json({ ok: false, message: error.message || "proxy error" });
  }
};

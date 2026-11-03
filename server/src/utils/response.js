export function send(res, status, payload) {
  return res.status(status).json({ success: true, ...payload });
}

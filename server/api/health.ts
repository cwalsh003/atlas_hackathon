import type { Connect } from 'vite'

const health: Connect.NextHandleFunction = (_req, res, _next) => {
  res.statusCode = 200
  res.setHeader('content-type', 'application/json')
  res.end(JSON.stringify({ ok: true }))
}

export default health

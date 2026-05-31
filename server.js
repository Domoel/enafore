// Production server — replaces nginx.
// Serves the sapper-exported static files AND the /api/card-preview endpoint.

import express from 'express'
import compression from 'compression'
import { getLinkPreview } from 'link-preview-js'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const { PORT = 4002 } = process.env
const STATIC = path.join(__dirname, '__sapper__', 'export')

const app = express()
app.use(compression())

// ---------- API ----------

app.get('/api/card-preview', async (req, res) => {
  const { url } = req.query
  if (!url) return res.status(400).json({ error: 'Missing url parameter' })
  try {
    const data = await getLinkPreview(url, { timeout: 5000, followRedirects: 'follow' })
    res.json({
      title: data.title || null,
      description: data.description || null,
      image: (data.images && data.images[0]) || null,
      favicon: (data.favicons && data.favicons[0]) || null,
      siteName: data.siteName || null,
      url: data.url || url
    })
  } catch (e) {
    res.status(500).json({ error: 'Preview unavailable' })
  }
})

// ---------- Static ----------

// Long-lived cache for hashed assets
app.use(express.static(STATIC, {
  maxAge: '30d',
  immutable: true,
  setHeaders (res, filePath) {
    // Never cache HTML — pages can change on deploy
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
    }
  }
}))

// SPA fallback — all unknown routes → index.html
app.get('*', (_req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
  res.sendFile(path.join(STATIC, 'index.html'))
})

// ---------- Start ----------

app.listen(PORT, () => console.log(`Zocial listening on port ${PORT}`))
process.on('SIGINT', () => process.exit(0))

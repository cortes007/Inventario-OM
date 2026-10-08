import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import analizar from './api/analizar.js'

const ANALIZAR_PATH = '/api/analizar'
const MAX_BODY_SIZE = 10 * 1024 * 1024

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    let settled = false

    req.on('data', (chunk) => {
      if (settled) return
      size += chunk.length
      if (size > MAX_BODY_SIZE) {
        settled = true
        const error = new Error('El cuerpo de la solicitud supera el límite de 10 MB.')
        error.statusCode = 413
        reject(error)
        return
      }
      chunks.push(chunk)
    })

    req.on('end', () => {
      if (settled) return
      try {
        const body = Buffer.concat(chunks).toString('utf8')
        resolve(body ? JSON.parse(body) : {})
      } catch {
        reject(new Error('El cuerpo de la solicitud no contiene JSON válido.'))
      }
    })

    req.on('error', (error) => {
      if (!settled) reject(error)
    })
  })
}

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'local-analysis-api',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url?.split('?')[0] !== ANALIZAR_PATH) return next()

          if (req.method === 'POST') {
            try {
              req.body = await parseJsonBody(req)
            } catch (error) {
              res.statusCode = error.statusCode || 400
              res.setHeader('Content-Type', 'application/json; charset=utf-8')
              res.end(JSON.stringify({ error: error.message }))
              return
            }
          }

          await analizar(req, {
            setHeader: (...args) => res.setHeader(...args),
            status(code) {
              res.statusCode = code
              return this
            },
            json(body) {
              res.setHeader('Content-Type', 'application/json; charset=utf-8')
              res.end(JSON.stringify(body))
              return this
            },
          })
        })
      },
    },
  ],
})

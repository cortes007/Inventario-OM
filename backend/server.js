import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { fileURLToPath } from 'node:url'

dotenv.config({ path: fileURLToPath(new URL('.env', import.meta.url)) })

const app = express()
const PORT = process.env.PORT || 3002
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-20b'

app.use(cors())
app.use(express.json({ limit: '10mb' }))

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', groqConfigured: Boolean(process.env.GROQ_API_KEY?.trim()) })
})

app.post('/api/analizar-movimientos', async (req, res) => {
  const { fechaDesde, fechaHasta, totalMovimientos, totalEntradas, totalSalidas, datosTabla } = req.body

  if (!fechaDesde || !fechaHasta || !Array.isArray(datosTabla) || datosTabla.length === 0) {
    return res.status(400).json({ error: 'Faltan datos requeridos: fechaDesde, fechaHasta y datosTabla son obligatorios.' })
  }

  const apiKey = process.env.GROQ_API_KEY?.trim()
  if (!apiKey) {
    return res.status(503).json({ error: 'El backend no tiene configurada la variable GROQ_API_KEY. Configúrala en backend/.env y reinicia el backend.' })
  }

  const systemPrompt = 'Eres un analista de inventario. Analiza estos movimientos de herramientas entre las fechas proporcionadas. Tienes el total de entradas y salidas. Escribe un resumen de máximo 3 párrafos destacando: cuál fue la herramienta con más movimiento, quién fue el responsable más activo, y si notas algún patrón inusual (como muchas salidas sin destino). Sé directo y profesional, responde en español.'

  const userPrompt = `Periodo: ${fechaDesde} a ${fechaHasta}
Total de movimientos: ${totalMovimientos}
Total de entradas: ${totalEntradas}
Total de salidas: ${totalSalidas}

Datos de la tabla:
${JSON.stringify(datosTabla, null, 2)}`

  try {
    const groqResponse = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.5,
        stream: false,
      }),
      signal: AbortSignal.timeout(30_000),
    })

    const responseText = await groqResponse.text()
    let groqData
    try {
      groqData = JSON.parse(responseText)
    } catch (parseError) {
      console.error(`Groq devolvió una respuesta no válida (HTTP ${groqResponse.status}):`, parseError.message)
      return res.status(502).json({ error: 'Groq devolvió una respuesta no válida. Revisa los logs del backend.' })
    }

    if (!groqResponse.ok) {
      const providerMessage = groqData.error?.message
      console.error(`Groq respondió HTTP ${groqResponse.status}:`, providerMessage || groqResponse.statusText)
      return res.status(502).json({
        error: providerMessage
          ? `Groq rechazó la solicitud: ${providerMessage}`
          : `Groq rechazó la solicitud (HTTP ${groqResponse.status}). Revisa la API key y el modelo configurado.`,
      })
    }

    const analisis = groqData.choices?.[0]?.message?.content
    if (typeof analisis !== 'string' || !analisis.trim()) {
      console.error('Groq respondió sin contenido de análisis.')
      return res.status(502).json({ error: 'Groq respondió sin contenido de análisis. Revisa los logs del backend.' })
    }

    return res.json({ analisis })
  } catch (err) {
    console.error('Error al comunicarse con Groq:', err.message)
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      return res.status(504).json({ error: 'Groq tardó demasiado en responder. Inténtalo de nuevo.' })
    }
    return res.status(502).json({ error: 'No se pudo conectar con Groq. Verifica la conexión del backend a Internet y revisa sus logs.' })
  }
})

app.listen(PORT, () => {
  console.log(`Backend corriendo en http://localhost:${PORT} con Groq (${GROQ_MODEL})`)
})

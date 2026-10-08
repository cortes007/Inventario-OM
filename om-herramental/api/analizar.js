import { createClient } from '@supabase/supabase-js'

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-20b'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Método no permitido. Usa POST.' })
  }

  const authorization = req.headers?.authorization
  const accessToken = typeof authorization === 'string'
    ? authorization.match(/^Bearer\s+(\S+)$/i)?.[1]
    : null
  if (!accessToken) {
    return res.status(401).json({ error: 'Debes iniciar sesión para solicitar el análisis.' })
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL?.trim()
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY?.trim()
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('La función no tiene configuradas las variables de Supabase para validar la sesión.')
    return res.status(503).json({ error: 'La función no está configurada para validar la sesión.' })
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  let authResult
  try {
    authResult = await supabase.auth.getUser(accessToken)
  } catch (authError) {
    console.error('No se pudo validar la sesión de Supabase:', authError.message)
    return res.status(503).json({ error: 'No se pudo validar la sesión. Inténtalo de nuevo.' })
  }
  if (authResult.error || !authResult.data.user) {
    const status = authResult.error?.status
    if (status && status !== 401 && status !== 403) {
      console.error('Error al validar la sesión con Supabase:', authResult.error.message)
      return res.status(503).json({ error: 'No se pudo validar la sesión. Inténtalo de nuevo.' })
    }
    return res.status(401).json({ error: 'La sesión no es válida o ha expirado. Inicia sesión de nuevo.' })
  }

  const { fechaDesde, fechaHasta, totalMovimientos, totalEntradas, totalSalidas, datosTabla } = req.body || {}

  if (!fechaDesde || !fechaHasta || !Array.isArray(datosTabla) || datosTabla.length === 0) {
    return res.status(400).json({
      error: 'Faltan datos requeridos: fechaDesde, fechaHasta y datosTabla son obligatorios.',
    })
  }

  const apiKey = process.env.GROQ_API_KEY?.trim()
  if (!apiKey) {
    return res.status(503).json({ error: 'La función no tiene configurada la variable GROQ_API_KEY.' })
  }

  const systemPrompt = 'Eres un analista de inventario. Analiza estos movimientos de herramientas entre las fechas proporcionadas. Tienes el total de entradas y salidas. Escribe un resumen de máximo 3 párrafos destacando: cuál fue la herramienta con más movimiento, quién fue el responsable más activo, y si notas algún patrón inusual (como muchas salidas sin destino). Sé directo y profesional, responde en español.'

  const userPrompt = `Periodo: ${fechaDesde} a ${fechaHasta}
Total de movimientos: ${totalMovimientos}
Total de entradas: ${totalEntradas}
Total de salidas: ${totalSalidas}

Datos de la tabla:
${JSON.stringify(datosTabla, null, 2)}`

  try {
    const requestOptions = {
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
    }

    let groqResponse
    try {
      groqResponse = await fetch(GROQ_API_URL, requestOptions)
    } catch (requestError) {
      const transientCodes = new Set([
        'ECONNRESET',
        'ECONNREFUSED',
        'EAI_AGAIN',
        'ETIMEDOUT',
        'EHOSTUNREACH',
        'ENETUNREACH',
        'UND_ERR_CONNECT_TIMEOUT',
        'UND_ERR_SOCKET',
      ])
      if (!transientCodes.has(requestError.cause?.code)) throw requestError
      await new Promise((resolve) => setTimeout(resolve, 500))
      groqResponse = await fetch(GROQ_API_URL, requestOptions)
    }

    const responseText = await groqResponse.text()
    let groqData
    try {
      groqData = JSON.parse(responseText)
    } catch (parseError) {
      console.error(`Groq devolvió una respuesta no válida (HTTP ${groqResponse.status}):`, parseError.message)
      return res.status(502).json({ error: 'Groq devolvió una respuesta no válida. Revisa los logs de la función.' })
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
      return res.status(502).json({ error: 'Groq respondió sin contenido de análisis. Revisa los logs de la función.' })
    }

    return res.status(200).json({ analisis })
  } catch (err) {
    console.error('Error al comunicarse con Groq:', {
      name: err.name,
      message: err.message,
      causeCode: err.cause?.code,
      causeMessage: err.cause?.message,
    })
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      return res.status(504).json({ error: 'Groq tardó demasiado en responder. Inténtalo de nuevo.' })
    }
    return res.status(502).json({ error: 'No se pudo conectar con Groq. Verifica la conexión de la función y revisa sus logs.' })
  }
}

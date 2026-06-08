import { NextResponse } from 'next/server'

// IMPORTANTE: Este endpoint NO hace llamadas de generación.
// Solo verifica la existencia del modelo vía GET (sin consumir cuota de tokens).
// El estado de cuota se muestra cuando el usuario usa las features de IA.

const MODELOS_TEST = [
  { id: 'gemini-2.5-flash',      apiVer: 'v1beta' },
  { id: 'gemini-2.5-flash-lite', apiVer: 'v1beta' },
  { id: 'gemini-2.0-flash-lite', apiVer: 'v1beta' },
  { id: 'gemini-2.0-flash',      apiVer: 'v1beta' },
  { id: 'gemini-2.0-flash-lite', apiVer: 'v1'     },
  { id: 'gemini-1.5-flash',      apiVer: 'v1'     },
  { id: 'gemini-1.5-flash',      apiVer: 'v1beta' },
  { id: 'gemini-1.5-flash-8b',   apiVer: 'v1'     },
] as const

export type ModeloEstado = {
  modelo: string
  apiVer: string
  estado: 'ACCESIBLE' | 'NO_DISPONIBLE' | 'CLAVE_INVALIDA' | 'RED' | 'ERROR'
  statusCode: number | null
  mensaje?: string
}

export async function GET() {
  const key = process.env.GEMINI_API_KEY ?? ''

  if (!key) {
    return NextResponse.json({
      ok: false,
      error: 'SIN_KEY',
      hayModelo: false,
      keyPreview: '',
      modelos: MODELOS_TEST.map(({ id, apiVer }) => ({
        modelo: id, apiVer, estado: 'NO_DISPONIBLE', statusCode: null, mensaje: 'Falta GEMINI_API_KEY',
      })),
    })
  }

  const resultados: ModeloEstado[] = []
  // Deduplica: si ya encontramos un modelo accesible con mismo id, no reportar duplicados
  const encontrados = new Set<string>()

  for (const { id, apiVer } of MODELOS_TEST) {
    const clave = `${id}:${apiVer}`
    if (encontrados.has(clave)) continue

    try {
      // GET /models/{id} — verifica existencia SIN consumir cuota de generación
      const res = await fetch(
        `https://generativelanguage.googleapis.com/${apiVer}/models/${id}?key=${key}`,
        { signal: AbortSignal.timeout(6000) }
      )

      if (res.status === 200) {
        const info = await res.json().catch(() => ({}))
        const displayName: string = info.displayName ?? id
        resultados.push({
          modelo: id,
          apiVer,
          estado: 'ACCESIBLE',
          statusCode: 200,
          mensaje: displayName,
        })
        encontrados.add(clave)
      } else if (res.status === 404) {
        resultados.push({ modelo: id, apiVer, estado: 'NO_DISPONIBLE', statusCode: 404, mensaje: `No existe en ${apiVer}` })
        encontrados.add(clave)
      } else if (res.status === 401 || res.status === 403) {
        resultados.push({ modelo: id, apiVer, estado: 'CLAVE_INVALIDA', statusCode: res.status, mensaje: 'API key sin permisos' })
        encontrados.add(clave)
      } else {
        resultados.push({ modelo: id, apiVer, estado: 'ERROR', statusCode: res.status, mensaje: `HTTP ${res.status}` })
        encontrados.add(clave)
      }
    } catch {
      resultados.push({ modelo: id, apiVer, estado: 'RED', statusCode: null, mensaje: 'Sin respuesta' })
      encontrados.add(clave)
    }
  }

  const modelosAccesibles = resultados.filter(r => r.estado === 'ACCESIBLE')
  const hayModelo = modelosAccesibles.length > 0
  const claveInvalida = resultados.some(r => r.estado === 'CLAVE_INVALIDA')

  return NextResponse.json({
    ok: true,
    hayModelo,
    claveInvalida,
    keyPreview: key.length > 12 ? `${key.slice(0, 8)}…${key.slice(-4)}` : '(corta)',
    modelosAccesibles: modelosAccesibles.map(m => `${m.modelo} (${m.apiVer})`),
    modelos: resultados,
  })
}

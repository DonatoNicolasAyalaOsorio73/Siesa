import { NextResponse } from 'next/server'

const MODELOS = [
  'gemini-1.5-flash-8b',
  'gemini-1.5-flash',
  'gemini-1.5-flash-latest',
  'gemini-2.0-flash-lite',
  'gemini-2.0-flash',
]

export type ModeloEstado = {
  modelo: string
  estado: 'OK' | 'CUOTA' | 'CUOTA_CERO' | 'NO_DISPONIBLE' | 'RED' | 'CLAVE_INVALIDA' | 'ERROR'
  statusCode: number | null
  mensaje?: string
  retrySegundos?: number
}

export async function GET() {
  const key = process.env.GEMINI_API_KEY ?? ''

  if (!key) {
    return NextResponse.json({
      ok: false,
      error: 'SIN_KEY',
      hayModelo: false,
      keyPreview: '',
      modelos: MODELOS.map((m) => ({
        modelo: m, estado: 'NO_DISPONIBLE', statusCode: null, mensaje: 'Falta GEMINI_API_KEY',
      })),
    })
  }

  const resultados: ModeloEstado[] = []

  for (const modelo of MODELOS) {
    try {
      // 1. Verificar si el modelo existe (no consume cuota de generación)
      const infoRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelo}?key=${key}`,
        { signal: AbortSignal.timeout(8000) }
      )

      if (infoRes.status === 404) {
        resultados.push({ modelo, estado: 'NO_DISPONIBLE', statusCode: 404, mensaje: 'Modelo no disponible o deprecado' })
        continue
      }

      if (infoRes.status === 401 || infoRes.status === 403) {
        resultados.push({ modelo, estado: 'CLAVE_INVALIDA', statusCode: infoRes.status, mensaje: 'API key inválida o sin permisos' })
        continue
      }

      if (!infoRes.ok) {
        resultados.push({ modelo, estado: 'ERROR', statusCode: infoRes.status, mensaje: `HTTP ${infoRes.status}` })
        continue
      }

      // 2. El modelo existe — probar generación mínima para verificar cuota
      const genRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'responde solo: ok' }] }],
            generationConfig: { maxOutputTokens: 5, temperature: 0 },
          }),
          signal: AbortSignal.timeout(12000),
        }
      )

      if (genRes.status === 200) {
        resultados.push({ modelo, estado: 'OK', statusCode: 200 })
      } else if (genRes.status === 429) {
        let retrySegundos = 60
        let esLimCero = false
        try {
          const err = await genRes.json()
          const retryInfo = err?.error?.details?.find((d: any) => d.retryDelay)
          if (retryInfo?.retryDelay) {
            const seg = parseInt(retryInfo.retryDelay, 10)
            if (seg > 0) retrySegundos = seg
          }
          const violations = err?.error?.details?.find((d: any) => d.violations)
          esLimCero = violations?.violations?.some(
            (v: any) => /limit:\s*0\b/i.test(v.description ?? '')
          ) ?? false
        } catch { /* ignorar */ }
        if (esLimCero) {
          resultados.push({ modelo, estado: 'CUOTA_CERO', statusCode: 429, mensaje: 'Proyecto sin cuota asignada (limit:0) — necesita API key de AI Studio' })
        } else {
          resultados.push({ modelo, estado: 'CUOTA', statusCode: 429, mensaje: `Cuota por minuto agotada — reintenta en ${retrySegundos}s`, retrySegundos })
        }
      } else if (genRes.status === 401 || genRes.status === 403) {
        resultados.push({ modelo, estado: 'CLAVE_INVALIDA', statusCode: genRes.status, mensaje: 'Clave sin permisos de generación' })
      } else {
        const body = await genRes.text().catch(() => '')
        resultados.push({ modelo, estado: 'ERROR', statusCode: genRes.status, mensaje: body.slice(0, 200) })
      }
    } catch {
      resultados.push({ modelo, estado: 'RED', statusCode: null, mensaje: 'Sin respuesta del servidor de Google' })
    }
  }

  const hayModelo = resultados.some((r) => r.estado === 'OK')
  const todasCuota = resultados.every((r) => ['CUOTA','CUOTA_CERO','NO_DISPONIBLE','RED'].includes(r.estado))
  const claveInvalida = resultados.some((r) => r.estado === 'CLAVE_INVALIDA')
  const cuotaCero = resultados.some((r) => r.estado === 'CUOTA_CERO')

  return NextResponse.json({
    ok: true,
    hayModelo,
    todasCuota,
    claveInvalida,
    cuotaCero,
    keyPreview: key.length > 12 ? `${key.slice(0, 8)}…${key.slice(-4)}` : '(corta)',
    modelos: resultados,
  })
}

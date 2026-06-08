import { NextRequest, NextResponse } from 'next/server'

// ─── CLIENTE GEMINI REST ──────────────────────────────────────────────────────

const MODELOS = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash',
  'gemini-1.5-flash-latest',
]

async function llamarGemini(prompt: string, maxTokens = 2048): Promise<string> {
  const key = process.env.GEMINI_API_KEY || ''
  if (!key) throw new Error('SIN_KEY')

  for (const modelo of MODELOS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${key}`
    let res: Response
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: maxTokens,
            responseMimeType: 'application/json',
          },
        }),
      })
    } catch {
      throw new Error('RED')   // error de red — señal para usar fallback
    }

    if (res.status === 404) continue   // modelo no disponible → probar siguiente

    if (!res.ok) {
      const body = await res.text()
      throw new Error(`API_ERROR:${res.status}:${body}`)
    }

    const data = await res.json()
    const texto: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    if (!texto) throw new Error(`${modelo}: respuesta vacía`)
    return texto
  }

  throw new Error('SIN_MODELOS')
}

// ─── FALLBACK INTELIGENTE (sin red) ──────────────────────────────────────────
// Genera análisis realistas basados en los datos reales de las órdenes.

function mockPrediccion(ordenes: any[], indicadores: any[], noConformidades: any[]) {
  const detenidas = ordenes.filter((o) => o.estado === 'DETENIDA')
  const enProceso = ordenes.filter((o) => o.estado === 'EN_PROCESO')
  const conInspeccion = ordenes.filter((o) => o.requiereInspeccion)
  const ncCriticas = noConformidades.filter((nc: any) => nc.severidad === 'CRITICA')
  const lineasBajaFPY = indicadores.filter((i: any) => (i.fpyHoy ?? 100) < 95)

  const puntuacion = Math.min(
    98,
    detenidas.length * 22 +
    ncCriticas.length * 28 +
    conInspeccion.length * 10 +
    lineasBajaFPY.length * 15 +
    10,
  )
  const nivel: 'ALTO' | 'MEDIO' | 'BAJO' =
    puntuacion >= 65 ? 'ALTO' : puntuacion >= 35 ? 'MEDIO' : 'BAJO'

  const ordenesCriticas = [
    ...detenidas.map((o) => ({
      ordenId: o.id,
      producto: o.producto ?? o.id,
      riesgo: 'ALTO',
      puntuacion: 88,
      factoresRiesgo: ['Orden detenida por lote rechazado', 'NC crítica activa sin cerrar'],
      recomendacion: 'Resolver no conformidad antes de reiniciar. Verificar parámetros del proceso.',
    })),
    ...conInspeccion
      .filter((o) => o.estado !== 'DETENIDA')
      .map((o) => ({
        ordenId: o.id,
        producto: o.producto ?? o.id,
        riesgo: 'MEDIO',
        puntuacion: 54,
        factoresRiesgo: ['Inspección de calidad pendiente', 'Tiempo de espera en cola'],
        recomendacion: 'Asignar inspector prioritario. Evitar demora mayor a 30 min.',
      })),
  ].slice(0, 4)

  const patrones: string[] = []
  if (detenidas.length) patrones.push(`${detenidas.length} orden(es) detenida(s) por rechazo de lote`)
  if (ncCriticas.length) patrones.push(`${ncCriticas.length} no conformidad(es) crítica(s) sin resolución`)
  if (lineasBajaFPY.length) patrones.push(`FPY bajo el 95 % en ${lineasBajaFPY.map((l: any) => l.linea).join(', ')}`)
  if (conInspeccion.length > 1) patrones.push('Acumulación de lotes pendientes de inspección')
  if (!patrones.length) patrones.push('Producción dentro de parámetros normales')

  const resumen = [
    `La planta presenta un nivel de riesgo ${nivel.toLowerCase()} con puntuación ${puntuacion}/100.`,
    detenidas.length
      ? `${detenidas.length} orden(es) detenida(s) requieren atención inmediata para no afectar el plan de producción.`
      : 'No hay órdenes detenidas en este momento.',
    ncCriticas.length
      ? `Se detectaron ${ncCriticas.length} no conformidad(es) crítica(s) que deben cerrarse antes de liberar nuevos lotes.`
      : 'Las no conformidades activas son de severidad controlable.',
  ].join(' ')

  return {
    nivelRiesgoGlobal: nivel,
    puntuacionRiesgo: puntuacion,
    ordenesCriticas,
    patronesDetectados: patrones,
    alertasPredictivas: [
      ...(conInspeccion.length > 0
        ? [{
            tipo: 'Cuello de botella en inspección',
            descripcion: `${conInspeccion.length} lote(s) esperando revisión de calidad pueden retrasar entregas.`,
            probabilidad: 0.68,
            impactoEstimado: 'Retraso de 2-4 horas en liberación de producto terminado',
          }]
        : []),
      ...(lineasBajaFPY.length > 0
        ? [{
            tipo: 'Degradación de FPY',
            descripcion: `${lineasBajaFPY.map((l: any) => l.linea).join(' y ')} operan por debajo del objetivo del 95 %.`,
            probabilidad: 0.55,
            impactoEstimado: 'Aumento de reprocesos y costos de calidad',
          }]
        : []),
    ],
    resumenEjecutivo: resumen,
  }
}

function mockClasificacion(mensaje: string) {
  const m = mensaje.toLowerCase()
  const esDim = /diámetro|medida|tamaño|grande|pequeño|grueso|largo|ancho|dimensi/.test(m)
  const esSup = /rugosidad|superficie|acabado|rayado|mancha|textura|brillo/.test(m)
  const esFun = /presión|ruido|vibra|falla|funciona|opera/.test(m)
  const esCrit = /mucho|muy|demasiado|fuera|completo|total|grave/.test(m)

  const tipo = esDim ? 'Dimensional' : esSup ? 'Superficial' : esFun ? 'Funcional' : 'Dimensional'
  const sev = esCrit ? 'MAYOR' : 'MENOR'

  return {
    tipoDefecto: tipo,
    severidad: sev,
    descripcionEstructurada: `Defecto ${tipo.toLowerCase()} identificado: ${mensaje.slice(0, 120).trim()}.`,
    parametroAfectado: esDim ? 'Diámetro exterior / Dimensión principal' : esSup ? 'Rugosidad superficial Ra' : 'Presión de prueba',
    accionInmediata: 'Detener máquina, tomar muestra representativa y notificar al supervisor de calidad.',
    requiereDetencion: sev === 'MAYOR',
    confianza: 0.62,
  }
}

// ─── HANDLER ─────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { modo, payload } = await req.json()

  // ── MODO 1: Asistente de defectos ──────────────────────────────────────────

  if (modo === 'asistente_defectos') {
    const { mensaje, contextoOrden } = payload

    const prompt = `Eres un asistente de control de calidad en una planta de autopartes.
Clasifica técnicamente el defecto reportado por el operario.
Responde SOLO con JSON válido (sin markdown):
{
  "tipoDefecto": "Dimensional|Superficial|Funcional|Material|Ensamble",
  "severidad": "CRITICA|MAYOR|MENOR",
  "descripcionEstructurada": "descripción técnica formal",
  "parametroAfectado": "parámetro afectado",
  "accionInmediata": "acción recomendada",
  "requiereDetencion": true,
  "confianza": 0.87
}
Orden: ${contextoOrden.id} | Producto: ${contextoOrden.producto} | Op: ${contextoOrden.operacionActual}
Reporte: "${mensaje}"`

    try {
      const texto = await llamarGemini(prompt, 512)
      return NextResponse.json({ ok: true, clasificacion: JSON.parse(texto) })
    } catch (e: any) {
      const esRedOrSinKey = e.message === 'RED' || e.message === 'SIN_KEY' || e.message === 'SIN_MODELOS'
      if (esRedOrSinKey) {
        return NextResponse.json({ ok: true, mock: true, clasificacion: mockClasificacion(mensaje) })
      }
      return NextResponse.json({ ok: false, error: e.message })
    }
  }

  // ── MODO 2: Predicción de riesgo ────────────────────────────────────────────

  if (modo === 'prediccion_riesgo') {
    const { ordenes, indicadores, noConformidades } = payload

    const prompt = `Eres un sistema predictivo de calidad industrial.
Analiza estos datos y devuelve SOLO JSON válido (sin markdown):
{
  "nivelRiesgoGlobal": "ALTO|MEDIO|BAJO",
  "puntuacionRiesgo": 65,
  "ordenesCriticas": [{"ordenId":"","producto":"","riesgo":"ALTO","puntuacion":80,"factoresRiesgo":[""],"recomendacion":""}],
  "patronesDetectados": [""],
  "alertasPredictivas": [{"tipo":"","descripcion":"","probabilidad":0.7,"impactoEstimado":""}],
  "resumenEjecutivo": "2-3 oraciones en español."
}
Órdenes DETENIDAS=riesgo ALTO. FPY<95%=alerta. NC críticas=sistémico.
Órdenes: ${JSON.stringify(ordenes)}
Indicadores: ${JSON.stringify(indicadores)}
NCs: ${JSON.stringify(noConformidades)}`

    try {
      const texto = await llamarGemini(prompt, 2048)
      return NextResponse.json({ ok: true, prediccion: JSON.parse(texto) })
    } catch (e: any) {
      const esRedOrSinKey = e.message === 'RED' || e.message === 'SIN_KEY' || e.message === 'SIN_MODELOS'
      if (esRedOrSinKey) {
        return NextResponse.json({
          ok: true,
          mock: true,
          prediccion: mockPrediccion(ordenes, indicadores, noConformidades),
        })
      }
      return NextResponse.json({ ok: false, error: e.message })
    }
  }

  return NextResponse.json({ ok: false, error: 'Modo no reconocido' })
}

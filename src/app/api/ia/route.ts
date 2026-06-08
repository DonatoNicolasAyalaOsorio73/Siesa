import { NextRequest, NextResponse } from 'next/server'

// ─── CLIENTE GEMINI REST ──────────────────────────────────────────────────────
// Prueba cada modelo en orden. Si un modelo devuelve 429 (cuota agotada),
// continúa con el siguiente en lugar de fallar inmediatamente.
// Solo lanza CUOTA: si TODOS los modelos están agotados.

const MODELOS = [
  'gemini-1.5-flash-8b',    // tier gratuito más generoso: 15 RPM, 1M tok/día
  'gemini-1.5-flash',        // 15 RPM free tier
  'gemini-1.5-flash-latest',
  'gemini-2.0-flash-lite',   // 30 RPM free tier
  'gemini-2.0-flash',        // más limitado en free tier
]

async function llamarGemini(prompt: string, maxTokens = 2048): Promise<string> {
  const key = process.env.GEMINI_API_KEY || ''
  if (!key) throw new Error('SIN_KEY')

  let retrySegundos = 60
  let todosAgotados = true

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
      throw new Error('RED')
    }

    if (res.status === 404) { todosAgotados = false; continue }

    if (res.status === 429) {
      // Este modelo agotado — anotar delay y probar el siguiente
      try {
        const err = await res.json()
        const retryInfo = err?.error?.details?.find((d: any) => d.retryDelay)
        if (retryInfo?.retryDelay) retrySegundos = parseInt(retryInfo.retryDelay, 10) || 60
      } catch { /* ignorar */ }
      continue  // ← clave: probar siguiente modelo, no lanzar error
    }

    if (res.status === 401 || res.status === 403) throw new Error('CLAVE_INVALIDA')

    if (!res.ok) {
      const body = await res.text()
      throw new Error(`API_ERROR:${res.status}:${body}`)
    }

    const data = await res.json()
    const texto: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    if (!texto) { todosAgotados = false; continue }
    return texto
  }

  throw new Error(todosAgotados ? `CUOTA:${retrySegundos}` : 'SIN_MODELOS')
}

async function llamarGeminiTexto(prompt: string, historial: {role: string, text: string}[], maxTokens = 1024): Promise<string> {
  const key = process.env.GEMINI_API_KEY || ''
  if (!key) throw new Error('SIN_KEY')

  const contents = [
    ...historial.map((h) => ({
      role: h.role === 'user' ? 'user' : 'model',
      parts: [{ text: h.text }],
    })),
    { role: 'user', parts: [{ text: prompt }] },
  ]

  let retrySegundos = 60
  let todosAgotados = true

  for (const modelo of MODELOS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${key}`
    let res: Response
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          generationConfig: { temperature: 0.7, maxOutputTokens: maxTokens },
        }),
      })
    } catch {
      throw new Error('RED')
    }

    if (res.status === 404) { todosAgotados = false; continue }

    if (res.status === 429) {
      try {
        const err = await res.json()
        const retryInfo = err?.error?.details?.find((d: any) => d.retryDelay)
        if (retryInfo?.retryDelay) retrySegundos = parseInt(retryInfo.retryDelay, 10) || 60
      } catch { /* ignorar */ }
      continue  // ← probar siguiente modelo
    }

    if (res.status === 401 || res.status === 403) throw new Error('CLAVE_INVALIDA')
    if (!res.ok) throw new Error('RED')

    const data = await res.json()
    const texto: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    if (!texto) { todosAgotados = false; continue }
    return texto
  }

  throw new Error(todosAgotados ? `CUOTA:${retrySegundos}` : 'SIN_MODELOS')
}

function esFallback(err: Error) {
  return (
    err.message === 'RED' ||
    err.message === 'SIN_KEY' ||
    err.message === 'SIN_MODELOS' ||
    err.message === 'CLAVE_INVALIDA' ||
    err.message.startsWith('CUOTA:')
  )
}

function razonFallback(err: Error): string {
  if (err.message === 'SIN_KEY') return 'SIN_KEY'
  if (err.message === 'CLAVE_INVALIDA') return 'CLAVE_INVALIDA'
  if (err.message.startsWith('CUOTA:')) return err.message  // "CUOTA:45"
  if (err.message === 'RED') return 'RED'
  if (err.message === 'SIN_MODELOS') return 'SIN_MODELOS'
  return 'ERROR'
}

// ─── FALLBACKS INTELIGENTES ───────────────────────────────────────────────────

function mockPrediccion(ordenes: any[], indicadores: any[], noConformidades: any[]) {
  const detenidas = ordenes.filter((o) => o.estado === 'DETENIDA')
  const conInspeccion = ordenes.filter((o) => o.requiereInspeccion)
  const ncCriticas = noConformidades.filter((nc: any) => nc.severidad === 'CRITICA')
  const lineasBajaFPY = indicadores.filter((i: any) => (i.fpyHoy ?? 100) < 95)

  const puntuacion = Math.min(
    98,
    detenidas.length * 22 + ncCriticas.length * 28 + conInspeccion.length * 10 + lineasBajaFPY.length * 15 + 10,
  )
  const nivel: 'ALTO' | 'MEDIO' | 'BAJO' = puntuacion >= 65 ? 'ALTO' : puntuacion >= 35 ? 'MEDIO' : 'BAJO'

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

  return {
    nivelRiesgoGlobal: nivel,
    puntuacionRiesgo: puntuacion,
    ordenesCriticas,
    patronesDetectados: patrones,
    alertasPredictivas: [
      ...(conInspeccion.length > 0 ? [{
        tipo: 'Cuello de botella en inspección',
        descripcion: `${conInspeccion.length} lote(s) esperando revisión de calidad.`,
        probabilidad: 0.68,
        impactoEstimado: 'Retraso de 2-4 horas en liberación de producto terminado',
      }] : []),
      ...(lineasBajaFPY.length > 0 ? [{
        tipo: 'Degradación de FPY',
        descripcion: `${lineasBajaFPY.map((l: any) => l.linea).join(' y ')} operan por debajo del objetivo del 95 %.`,
        probabilidad: 0.55,
        impactoEstimado: 'Aumento de reprocesos y costos de calidad',
      }] : []),
    ],
    resumenEjecutivo: [
      `La planta presenta un nivel de riesgo ${nivel.toLowerCase()} con puntuación ${puntuacion}/100.`,
      detenidas.length ? `${detenidas.length} orden(es) detenida(s) requieren atención inmediata.` : 'No hay órdenes detenidas.',
      ncCriticas.length ? `Se detectaron ${ncCriticas.length} no conformidad(es) crítica(s).` : 'Las no conformidades activas son de severidad controlable.',
    ].join(' '),
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

function mockOptimizacion(ordenes: any[]) {
  const prioridadScore: Record<string, number> = { ALTA: 3, MEDIA: 2, BAJA: 1 }
  const sorted = [...ordenes].sort((a, b) => {
    const pA = prioridadScore[a.prioridad] ?? 1
    const pB = prioridadScore[b.prioridad] ?? 1
    if (pB !== pA) return pB - pA
    const avA = a.cantidadPlanificada > 0 ? a.cantidadProducida / a.cantidadPlanificada : 0
    const avB = b.cantidadPlanificada > 0 ? b.cantidadProducida / b.cantidadPlanificada : 0
    return avB - avA
  })

  return {
    secuenciaOptima: sorted.map((o, i) => ({
      ordenId: o.id,
      posicion: i + 1,
      justificacion: o.prioridad === 'ALTA'
        ? 'Alta prioridad y riesgo de incumplimiento del plan.'
        : o.estado === 'DETENIDA'
        ? 'Orden detenida requiere atención prioritaria.'
        : `Prioridad ${(o.prioridad ?? 'MEDIA').toLowerCase()} — optimizando flujo por línea ${o.lineaProduccion}.`,
      tiempoEstimadoHoras: Math.round(((o.cantidadPlanificada ?? 0) - (o.cantidadProducida ?? 0)) / 20 * 10) / 10,
    })),
    cuellosDeBottella: [
      { recurso: 'Inspecciones de Calidad', impacto: 'Lotes pendientes generan tiempos de espera', recomendacion: 'Aumentar inspectores disponibles en turno tarde.' },
    ],
    ahorroEstimadoHoras: 3.5,
    resumen: `Secuencia optimizada para ${sorted.length} órdenes activas. Priorizando alta prioridad y minimizando tiempo ocioso entre líneas.`,
  }
}

function mockCausas(ncs: any[]) {
  return {
    causasRaiz: [
      { causa: 'Desviación de parámetros de tratamiento térmico', frecuencia: ncs.filter((nc: any) => nc.tipoDefecto?.toLowerCase().includes('dureza')).length || 2, impacto: 'ALTO', categoria: 'Proceso' },
      { causa: 'Desgaste de herramientas CNC no detectado a tiempo', frecuencia: 2, impacto: 'MEDIO', categoria: 'Máquina' },
      { causa: 'Variación en lotes de materia prima', frecuencia: 1, impacto: 'ALTO', categoria: 'Material' },
    ],
    distribucionPareto: [
      { defecto: ncs[0]?.tipoDefecto ?? 'Dimensional', porcentaje: 52 },
      { defecto: ncs[1]?.tipoDefecto ?? 'Superficial', porcentaje: 28 },
      { defecto: 'Otros', porcentaje: 20 },
    ],
    accionesRecomendadas: [
      { accion: 'Verificar y calibrar horno de tratamiento térmico antes de reiniciar producción', prioridad: 'INMEDIATA', responsable: 'Jefe de Mantenimiento' },
      { accion: 'Implementar inspección de herramientas CNC cada turno', prioridad: 'CORTO_PLAZO', responsable: 'Supervisores de Línea' },
    ],
    resumen: `Análisis de ${ncs.length} no conformidades. Causas principales relacionadas con proceso y máquina. Se recomienda acción correctiva inmediata en equipos de tratamiento térmico.`,
  }
}

function mockMantenimiento(centros: any[]) {
  const enMant = centros.filter((c) => c.estado === 'MANTENIMIENTO')
  const bajaEficiencia = centros.filter((c) => (c.eficiencia ?? 100) < 80 && c.estado !== 'MANTENIMIENTO')

  return {
    evaluaciones: centros.map((c) => ({
      centroId: c.id,
      nombre: c.nombre,
      riesgoFalla: c.estado === 'MANTENIMIENTO' ? 'ALTO' : (c.eficiencia ?? 100) < 75 ? 'MEDIO' : 'BAJO',
      estadoActual: c.estado,
      eficiencia: c.eficiencia ?? 100,
      accionRecomendada: c.estado === 'MANTENIMIENTO'
        ? 'Completar mantenimiento correctivo y realizar prueba de calificación antes de reintegrar a producción.'
        : (c.eficiencia ?? 100) < 80
        ? 'Programar inspección preventiva. La eficiencia reducida indica posible desgaste interno.'
        : 'Mantener plan de mantenimiento preventivo regular. Estado nominal.',
      prioridad: c.estado === 'MANTENIMIENTO' ? 1 : (c.eficiencia ?? 100) < 80 ? 2 : 3,
    })).sort((a, b) => a.prioridad - b.prioridad),
    alertas: [
      ...enMant.map((c) => ({ tipo: 'MANTENIMIENTO_ACTIVO', descripcion: `${c.nombre} está actualmente en mantenimiento — impacto en capacidad de producción.`, centroId: c.id })),
      ...bajaEficiencia.map((c) => ({ tipo: 'EFICIENCIA_BAJA', descripcion: `${c.nombre} opera al ${c.eficiencia}% de eficiencia. Riesgo de falla próxima.`, centroId: c.id })),
    ],
    proximasIntervenciones: centros
      .filter((c) => c.estado !== 'MANTENIMIENTO')
      .slice(0, 3)
      .map((c, i) => ({
        centroId: c.id,
        nombre: c.nombre,
        tipo: 'Mantenimiento Preventivo',
        diasRecomendados: (i + 1) * 7,
        costoEstimado: Math.round(c.costoHora ?? 50000) * 4,
      })),
    resumen: `Análisis de ${centros.length} centros de trabajo. ${enMant.length} en mantenimiento activo y ${bajaEficiencia.length} con eficiencia reducida que requieren atención preventiva.`,
  }
}

function mockReporte(datos: any) {
  const { ordenes = [], noConformidades = [], centros = [], indicadores = [] } = datos
  const enProceso = ordenes.filter((o: any) => o.estado === 'EN_PROCESO').length
  const detenidas = ordenes.filter((o: any) => o.estado === 'DETENIDA').length
  const ncCriticas = noConformidades.filter((nc: any) => nc.severidad === 'CRITICA').length
  const efPromedio = centros.length > 0
    ? Math.round(centros.reduce((s: number, c: any) => s + (c.eficiencia ?? 80), 0) / centros.length)
    : 82

  return {
    titulo: 'Reporte Ejecutivo de Producción y Calidad',
    periodo: 'Turno Actual',
    kpis: [
      { nombre: 'Órdenes en Proceso', valor: `${enProceso}/${ordenes.length}`, tendencia: detenidas > 0 ? 'BAJANDO' : 'ESTABLE', descripcion: `${detenidas} detenidas` },
      { nombre: 'Eficiencia Planta', valor: `${efPromedio}%`, tendencia: efPromedio >= 85 ? 'SUBIENDO' : 'BAJANDO', descripcion: 'Promedio centros operativos' },
      { nombre: 'NCs Activas', valor: `${noConformidades.length}`, tendencia: ncCriticas > 0 ? 'BAJANDO' : 'ESTABLE', descripcion: `${ncCriticas} críticas` },
      { nombre: 'Líneas Analizadas', valor: `${indicadores.length}`, tendencia: 'ESTABLE', descripcion: 'Con indicadores calculados' },
    ],
    hallazgos: [
      ...(detenidas > 0 ? [{ categoria: 'PRODUCCION', descripcion: `${detenidas} órdenes detenidas interrumpen el plan de producción del turno.`, impacto: 'ALTO' }] : []),
      ...(ncCriticas > 0 ? [{ categoria: 'CALIDAD', descripcion: `${ncCriticas} no conformidades críticas sin cierre afectan la liberación de producto.`, impacto: 'ALTO' }] : []),
      { categoria: 'EFICIENCIA', descripcion: `Eficiencia promedio de ${efPromedio}% en centros de trabajo operativos.`, impacto: efPromedio >= 85 ? 'BAJO' : 'MEDIO' },
    ],
    recomendaciones: [
      ...(detenidas > 0 ? [{ accion: 'Priorizar resolución de NCs en órdenes detenidas para reiniciar producción', urgencia: 'INMEDIATA', area: 'Calidad + Producción' }] : []),
      { accion: 'Revisar eficiencia de centros con indicadores bajo el 80%', urgencia: 'ESTA_SEMANA', area: 'Mantenimiento' },
      { accion: 'Actualizar plan de producción con secuencia optimizada por IA', urgencia: 'ESTE_MES', area: 'Planeación' },
    ],
    narrativa: `La planta opera actualmente con ${ordenes.length} órdenes en el sistema, de las cuales ${enProceso} están en proceso activo y ${detenidas} requieren intervención inmediata. El nivel de eficiencia promedio de ${efPromedio}% se mantiene ${efPromedio >= 85 ? 'dentro de los parámetros objetivo' : 'por debajo del objetivo del 85%'}, lo que ${efPromedio >= 85 ? 'es satisfactorio para el turno actual' : 'requiere revisión de los centros afectados'}.\n\nEn materia de calidad, se registran ${noConformidades.length} no conformidades activas${ncCriticas > 0 ? `, con ${ncCriticas} de nivel crítico que deben cerrarse antes de liberar nuevos lotes al cliente` : ', todas en niveles manejables'}. El sistema de trazabilidad está operativo y permite el seguimiento completo de cada lote desde material hasta producto terminado.\n\nSe recomienda ejecutar el analizador de causa raíz de IA para identificar patrones en los defectos recurrentes y aplicar acciones correctivas sistémicas, en lugar de solo correctivas por incidente.`,
  }
}

function mockChat(pregunta: string, contexto: any): string {
  const p = pregunta.toLowerCase()
  const { ordenes = [], centros = [], noConformidades = [], alertas = [] } = contexto

  if (p.includes('orden') || p.includes('producción') || p.includes('activ')) {
    const enProceso = ordenes.filter((o: any) => o.estado === 'EN_PROCESO')
    const detenidas = ordenes.filter((o: any) => o.estado === 'DETENIDA')
    return `**Estado de órdenes:**\n• ${enProceso.length} órdenes en proceso\n• ${detenidas.length} órdenes detenidas\n• ${ordenes.length} órdenes totales en el sistema\n\n${detenidas.length > 0 ? `⚠ Las órdenes detenidas son: ${detenidas.map((o: any) => o.id).join(', ')}` : '✓ No hay órdenes detenidas actualmente.'}`
  }
  if (p.includes('centro') || p.includes('máquina') || p.includes('mantenimiento') || p.includes('equipo')) {
    const operativos = centros.filter((c: any) => c.estado === 'OPERATIVO')
    const enMant = centros.filter((c: any) => c.estado === 'MANTENIMIENTO')
    return `**Centros de trabajo:**\n• ${operativos.length} operativos\n• ${enMant.length} en mantenimiento\n• ${centros.length} total\n\n${enMant.length > 0 ? `En mantenimiento: ${enMant.map((c: any) => c.nombre).join(', ')}` : '✓ Todos los centros están operativos.'}`
  }
  if (p.includes('conformidad') || p.includes('defecto') || p.includes('calidad') || p.includes('nc')) {
    const criticas = noConformidades.filter((nc: any) => nc.severidad === 'CRITICA')
    const abiertas = noConformidades.filter((nc: any) => nc.estadoCierre !== 'CERRADO')
    return `**No conformidades:**\n• ${noConformidades.length} registradas en total\n• ${criticas.length} de severidad crítica\n• ${abiertas.length} sin cerrar aún\n\n${criticas.length > 0 ? `⚠ NCs críticas: ${criticas.map((nc: any) => nc.tipoDefecto).join(', ')}` : '✓ No hay NCs críticas activas.'}`
  }
  if (p.includes('alerta') || p.includes('urgente') || p.includes('prioridad')) {
    const noLeidas = alertas.filter((a: any) => !a.leida)
    return `**Alertas activas:**\n• ${alertas.length} alertas en total\n• ${noLeidas.length} sin leer\n\n${noLeidas.length > 0 ? `Tipos: ${Array.from(new Set(noLeidas.map((a: any) => a.tipo))).join(', ')}` : '✓ Todas las alertas han sido revisadas.'}`
  }
  if (p.includes('resumen') || p.includes('estado') || p.includes('general') || p.includes('turno')) {
    const enProceso = ordenes.filter((o: any) => o.estado === 'EN_PROCESO').length
    const detenidas = ordenes.filter((o: any) => o.estado === 'DETENIDA').length
    const operativos = centros.filter((c: any) => c.estado === 'OPERATIVO').length
    return `**Resumen de planta:**\n• ${enProceso} órdenes en proceso, ${detenidas} detenidas\n• ${operativos}/${centros.length} centros operativos\n• ${noConformidades.length} NCs registradas\n• ${alertas.filter((a: any) => !a.leida).length} alertas sin leer\n\n${detenidas > 0 || noConformidades.filter((nc: any) => nc.severidad === 'CRITICA').length > 0 ? '⚠ Hay situaciones que requieren atención.' : '✓ La planta opera dentro de parámetros normales.'}`
  }
  return `Tengo acceso a los datos en tiempo real: ${ordenes.length} órdenes, ${centros.length} centros de trabajo y ${noConformidades.length} no conformidades. ¿Qué aspecto te interesa analizar? Puedo ayudarte con producción, calidad, mantenimiento o alertas.`
}

// ─── HANDLER ─────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { modo, payload } = await req.json()

  // ── MODO 1: Asistente de defectos ─────────────────────────────────────────

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
      if (esFallback(e)) return NextResponse.json({ ok: true, mock: true, razon: razonFallback(e), clasificacion: mockClasificacion(mensaje) })
      return NextResponse.json({ ok: false, error: e.message })
    }
  }

  // ── MODO 2: Predicción de riesgo ──────────────────────────────────────────

  if (modo === 'prediccion_riesgo') {
    const { ordenes, indicadores, noConformidades } = payload

    const prompt = `Eres un sistema predictivo de calidad industrial para una planta de autopartes colombiana.
Analiza estos datos y devuelve SOLO JSON válido (sin markdown):
{
  "nivelRiesgoGlobal": "ALTO|MEDIO|BAJO",
  "puntuacionRiesgo": 65,
  "ordenesCriticas": [{"ordenId":"","producto":"","riesgo":"ALTO","puntuacion":80,"factoresRiesgo":[""],"recomendacion":""}],
  "patronesDetectados": ["patrón detectado en los datos"],
  "alertasPredictivas": [{"tipo":"","descripcion":"","probabilidad":0.7,"impactoEstimado":""}],
  "resumenEjecutivo": "2-3 oraciones en español con análisis concreto."
}
Reglas: DETENIDA=riesgo ALTO. FPY<95%=alerta degradación. NC críticas=sistémico.
Órdenes: ${JSON.stringify(ordenes)}
Indicadores FPY: ${JSON.stringify(indicadores)}
No Conformidades: ${JSON.stringify(noConformidades)}`

    try {
      const texto = await llamarGemini(prompt, 2048)
      return NextResponse.json({ ok: true, prediccion: JSON.parse(texto) })
    } catch (e: any) {
      if (esFallback(e)) return NextResponse.json({ ok: true, mock: true, razon: razonFallback(e), prediccion: mockPrediccion(ordenes, indicadores, noConformidades) })
      return NextResponse.json({ ok: false, error: e.message })
    }
  }

  // ── MODO 3: Optimizar producción ──────────────────────────────────────────

  if (modo === 'optimizar_produccion') {
    const { ordenes } = payload

    const prompt = `Eres un experto en planificación de producción industrial (scheduling) para una planta de autopartes.
Analiza estas órdenes y genera una secuencia óptima de producción.
Devuelve SOLO JSON válido (sin markdown):
{
  "secuenciaOptima": [{"ordenId":"","posicion":1,"justificacion":"razón concreta por esta posición","tiempoEstimadoHoras":2.5}],
  "cuellosDeBottella": [{"recurso":"nombre del recurso","impacto":"impacto operacional","recomendacion":"acción concreta"}],
  "ahorroEstimadoHoras": 3.5,
  "resumen": "resumen ejecutivo de 2 oraciones"
}
Criterios de priorización: 1) Órdenes ALTA prioridad primero, 2) Minimizar cambios de línea, 3) Completar órdenes con mayor avance, 4) Mover DETENIDAS al inicio para resolver el bloqueo.
Órdenes: ${JSON.stringify(ordenes)}`

    try {
      const texto = await llamarGemini(prompt, 1536)
      return NextResponse.json({ ok: true, optimizacion: JSON.parse(texto) })
    } catch (e: any) {
      if (esFallback(e)) return NextResponse.json({ ok: true, mock: true, razon: razonFallback(e), optimizacion: mockOptimizacion(ordenes) })
      return NextResponse.json({ ok: false, error: e.message })
    }
  }

  // ── MODO 4: Analizar causas raíz ──────────────────────────────────────────

  if (modo === 'analizar_causas') {
    const { noConformidades } = payload

    const prompt = `Eres un experto en calidad industrial y metodología Six Sigma para autopartes.
Analiza estas no conformidades y genera un diagnóstico de causa raíz completo.
Devuelve SOLO JSON válido (sin markdown):
{
  "causasRaiz": [{"causa":"descripción específica","frecuencia":3,"impacto":"ALTO|MEDIO|BAJO","categoria":"Proceso|Máquina|Material|Personal|Método"}],
  "distribucionPareto": [{"defecto":"tipo de defecto","porcentaje":45}],
  "accionesRecomendadas": [{"accion":"acción concreta y específica","prioridad":"INMEDIATA|CORTO_PLAZO|MEDIANO_PLAZO","responsable":"área responsable"}],
  "resumen": "diagnóstico conciso de 2-3 oraciones"
}
Aplica principio 80/20 (Pareto): identifica el 20% de causas que generan el 80% de defectos.
No Conformidades: ${JSON.stringify(noConformidades)}`

    try {
      const texto = await llamarGemini(prompt, 1536)
      return NextResponse.json({ ok: true, causas: JSON.parse(texto) })
    } catch (e: any) {
      if (esFallback(e)) return NextResponse.json({ ok: true, mock: true, razon: razonFallback(e), causas: mockCausas(noConformidades) })
      return NextResponse.json({ ok: false, error: e.message })
    }
  }

  // ── MODO 5: Sugerir mantenimiento ─────────────────────────────────────────

  if (modo === 'sugerir_mantenimiento') {
    const { centros, registrosTiempos = [] } = payload

    const prompt = `Eres un experto en mantenimiento industrial predictivo (TPM) para planta de autopartes.
Analiza el estado de los centros de trabajo y genera recomendaciones de mantenimiento.
Devuelve SOLO JSON válido (sin markdown):
{
  "evaluaciones": [{"centroId":"","nombre":"","riesgoFalla":"ALTO|MEDIO|BAJO","estadoActual":"OPERATIVO|MANTENIMIENTO|INACTIVO","eficiencia":85,"accionRecomendada":"acción específica y técnica","prioridad":1}],
  "alertas": [{"tipo":"MANTENIMIENTO_ACTIVO|EFICIENCIA_BAJA|CAPACIDAD_CRITICA|REVISION_PENDIENTE","descripcion":"descripción operacional","centroId":""}],
  "proximasIntervenciones": [{"centroId":"","nombre":"","tipo":"Preventivo|Correctivo|Predictivo","diasRecomendados":14,"costoEstimado":500000}],
  "resumen": "diagnóstico de la salud operativa de la planta en 2-3 oraciones"
}
Criterios: MANTENIMIENTO activo=riesgo ALTO, eficiencia <80%=riesgo MEDIO, planificar preventivos para equipos de MAQUINARIA cada 30 días.
Centros de trabajo: ${JSON.stringify(centros)}
Registros de uso reciente: ${JSON.stringify(registrosTiempos.slice(0, 20))}`

    try {
      const texto = await llamarGemini(prompt, 2048)
      return NextResponse.json({ ok: true, mantenimiento: JSON.parse(texto) })
    } catch (e: any) {
      if (esFallback(e)) return NextResponse.json({ ok: true, mock: true, razon: razonFallback(e), mantenimiento: mockMantenimiento(centros) })
      return NextResponse.json({ ok: false, error: e.message })
    }
  }

  // ── MODO 6: Generar reporte ejecutivo ─────────────────────────────────────

  if (modo === 'generar_reporte') {
    const { ordenes, noConformidades, centros, indicadores, tipoReporte } = payload

    const prompt = `Eres un analista industrial senior. Genera un reporte ejecutivo formal basado en datos reales de planta.
Tipo de reporte solicitado: ${tipoReporte ?? 'Reporte General de Turno'}
Devuelve SOLO JSON válido (sin markdown):
{
  "titulo": "título formal del reporte",
  "periodo": "descripción del período",
  "kpis": [{"nombre":"KPI","valor":"valor con unidad","tendencia":"SUBIENDO|BAJANDO|ESTABLE","descripcion":"contexto breve"}],
  "hallazgos": [{"categoria":"PRODUCCION|CALIDAD|EFICIENCIA|SEGURIDAD","descripcion":"hallazgo concreto","impacto":"ALTO|MEDIO|BAJO"}],
  "recomendaciones": [{"accion":"acción específica y medible","urgencia":"INMEDIATA|ESTA_SEMANA|ESTE_MES","area":"área responsable"}],
  "narrativa": "análisis ejecutivo de 3-4 párrafos con datos concretos, en español formal"
}
Datos de planta:
Órdenes (${ordenes?.length ?? 0}): ${JSON.stringify(ordenes?.slice(0, 10))}
Indicadores FPY: ${JSON.stringify(indicadores)}
NCs (${noConformidades?.length ?? 0}): ${JSON.stringify(noConformidades)}
Centros (${centros?.length ?? 0}): ${JSON.stringify(centros?.map((c: any) => ({ id: c.id, nombre: c.nombre, estado: c.estado, eficiencia: c.eficiencia })))}`

    try {
      const texto = await llamarGemini(prompt, 3000)
      return NextResponse.json({ ok: true, reporte: JSON.parse(texto) })
    } catch (e: any) {
      if (esFallback(e)) return NextResponse.json({ ok: true, mock: true, razon: razonFallback(e), reporte: mockReporte({ ordenes, noConformidades, centros, indicadores }) })
      return NextResponse.json({ ok: false, error: e.message })
    }
  }

  // ── MODO 7: Asistente conversacional ─────────────────────────────────────

  if (modo === 'chat_asistente') {
    const { pregunta, contexto, historial = [] } = payload

    const sistemaPrompt = `Eres Siesa AI, el asistente inteligente de producción para una planta manufacturera de autopartes colombiana.
Tienes acceso en tiempo real a estos datos de planta:
- Órdenes de producción: ${JSON.stringify(contexto.ordenes?.slice(0, 15))}
- Centros de trabajo: ${JSON.stringify(contexto.centros)}
- No conformidades: ${JSON.stringify(contexto.noConformidades)}
- Alertas activas: ${JSON.stringify(contexto.alertas?.slice(0, 10))}
- Inspecciones: ${JSON.stringify(contexto.inspecciones?.slice(0, 10))}

Instrucciones:
- Responde en español, de forma concisa y directa
- Usa datos reales del contexto en tus respuestas
- Usa formato markdown ligero (negritas, listas) para claridad
- Si los datos son insuficientes, di qué información falta
- Máximo 200 palabras por respuesta

Pregunta del operario: ${pregunta}`

    try {
      const respuesta = await llamarGeminiTexto(sistemaPrompt, historial.slice(-8), 512)
      return NextResponse.json({ ok: true, respuesta })
    } catch (e: any) {
      if (esFallback(e)) return NextResponse.json({ ok: true, mock: true, razon: razonFallback(e), respuesta: mockChat(pregunta, contexto) })
      return NextResponse.json({ ok: false, error: e.message })
    }
  }

  return NextResponse.json({ ok: false, error: 'Modo no reconocido' })
}

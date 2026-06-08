'use client'

import { useState } from 'react'
import {
  Zap, Loader2, AlertTriangle, CheckCircle2, Play, BarChart2, Brain,
  RefreshCw, ArrowRight, Target, Activity,
} from 'lucide-react'
import { useAppContext } from '@/context/AppContext'
import { useCalidadContext } from '@/context/CalidadContext'

// ─── TIPOS ────────────────────────────────────────────────────────────────────

interface SecuenciaOptima {
  ordenId: string
  posicion: number
  justificacion: string
  tiempoEstimadoHoras: number
}

interface CuelloBottella {
  recurso: string
  impacto: string
  recomendacion: string
}

interface OptimizacionResult {
  secuenciaOptima: SecuenciaOptima[]
  cuellosDeBottella: CuelloBottella[]
  ahorroEstimadoHoras: number
  resumen: string
}

interface CausaRaiz {
  causa: string
  frecuencia: number
  impacto: string
  categoria: string
}

interface DistribucionPareto {
  defecto: string
  porcentaje: number
}

interface AccionRecomendada {
  accion: string
  prioridad: string
  responsable: string
}

interface CausasResult {
  causasRaiz: CausaRaiz[]
  distribucionPareto: DistribucionPareto[]
  accionesRecomendadas: AccionRecomendada[]
  resumen: string
}

// ─── MOCKS FALLBACK ───────────────────────────────────────────────────────────

function mockOptimizacion(ordenes: any[]): OptimizacionResult {
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
      justificacion:
        o.prioridad === 'ALTA'
          ? 'Alta prioridad y riesgo de incumplimiento del plan.'
          : o.estado === 'DETENIDA'
          ? 'Orden detenida requiere atención prioritaria antes de continuar plan.'
          : `Prioridad ${o.prioridad.toLowerCase()} — optimizando flujo por línea ${o.lineaProduccion}.`,
      tiempoEstimadoHoras: Math.round((o.cantidadPlanificada - o.cantidadProducida) / 20 * 10) / 10,
    })),
    cuellosDeBottella: [
      { recurso: 'Horno Tratamiento Térmico (CT-003)', impacto: 'En mantenimiento — bloquea ruta de válvulas', recomendacion: 'Reasignar órdenes a Línea B temporalmente o acelerar mantenimiento.' },
      { recurso: 'Inspecciones de Calidad', impacto: 'Lotes pendientes generan tiempos de espera', recomendacion: 'Aumentar inspectores disponibles en turno tarde.' },
    ],
    ahorroEstimadoHoras: 4.5,
    resumen: `Secuencia optimizada para ${sorted.length} órdenes activas. Priorizando órdenes de alta prioridad y minimizando tiempo ocioso entre líneas. Ahorro estimado de 4.5 horas en el turno actual.`,
  }
}

function mockCausas(ncs: any[]): CausasResult {
  const porSeveridad: Record<string, number> = {}
  const porTipo: Record<string, number> = {}

  ncs.forEach((nc) => {
    porSeveridad[nc.severidad] = (porSeveridad[nc.severidad] ?? 0) + 1
    porTipo[nc.tipoDefecto] = (porTipo[nc.tipoDefecto] ?? 0) + 1
  })

  return {
    causasRaiz: [
      { causa: 'Desviación de parámetros de tratamiento térmico', frecuencia: 3, impacto: 'ALTO', categoria: 'Proceso' },
      { causa: 'Desgaste de herramientas CNC no detectado a tiempo', frecuencia: 2, impacto: 'MEDIO', categoria: 'Máquina' },
      { causa: 'Variación en lotes de materia prima (acero)', frecuencia: 2, impacto: 'ALTO', categoria: 'Material' },
      { causa: 'Falta de calibración periódica de equipos', frecuencia: 1, impacto: 'MEDIO', categoria: 'Máquina' },
    ],
    distribucionPareto: [
      { defecto: 'Dureza fuera de especificación', porcentaje: 52 },
      { defecto: 'Dimensional — diámetro', porcentaje: 28 },
      { defecto: 'Acabado superficial', porcentaje: 12 },
      { defecto: 'Otros', porcentaje: 8 },
    ],
    accionesRecomendadas: [
      { accion: 'Calibrar y verificar horno de tratamiento térmico (CT-003) antes de reiniciar producción', prioridad: 'INMEDIATA', responsable: 'Jefe de Mantenimiento' },
      { accion: 'Implementar inspección de herramientas CNC cada turno', prioridad: 'CORTO_PLAZO', responsable: 'Supervisores de Línea' },
      { accion: 'Solicitar certificado de calidad a proveedor AcerosColombia para el próximo lote', prioridad: 'CORTO_PLAZO', responsable: 'Departamento de Compras' },
    ],
    resumen: `Análisis de ${ncs.length} no conformidades detectadas. La causa raíz principal es la desviación en el tratamiento térmico (52% de defectos). Se recomienda acción inmediata en CT-003 y revisión de procedimientos de calibración.`,
  }
}

// ─── COMPONENTES ──────────────────────────────────────────────────────────────

const PRIORIDAD_COLORS: Record<string, string> = { INMEDIATA: '#EF4444', CORTO_PLAZO: '#F59E0B', MEDIANO_PLAZO: '#1F6CF0' }
const IMPACTO_COLORS: Record<string, string> = { ALTO: '#EF4444', MEDIO: '#F59E0B', BAJO: '#16B364' }
const CATEGORIA_COLORS: Record<string, string> = { Proceso: '#6E56E0', Máquina: '#1F6CF0', Material: '#F59E0B', Personal: '#16B364' }

function Spinner() {
  return <Loader2 className="animate-spin" size={18} />
}

// ─── PÁGINA ───────────────────────────────────────────────────────────────────

export default function OptimizacionIAPage() {
  const { ordenes } = useAppContext()
  const { noConformidades } = useCalidadContext()

  const [loadingOpt, setLoadingOpt] = useState(false)
  const [loadingCausas, setLoadingCausas] = useState(false)
  const [optimizacion, setOptimizacion] = useState<OptimizacionResult | null>(null)
  const [causas, setCausas] = useState<CausasResult | null>(null)
  const [errorOpt, setErrorOpt] = useState<string | null>(null)
  const [errorCausas, setErrorCausas] = useState<string | null>(null)
  const [isMockOpt, setIsMockOpt] = useState(false)
  const [isMockCausas, setIsMockCausas] = useState(false)

  async function handleOptimizar() {
    setLoadingOpt(true)
    setErrorOpt(null)
    setOptimizacion(null)
    try {
      const payload = ordenes.map((o) => ({
        id: o.id,
        producto: o.producto,
        estado: o.estado,
        prioridad: o.prioridad,
        cantidadPlanificada: o.cantidadPlanificada,
        cantidadProducida: o.cantidadProducida,
        lineaProduccion: o.lineaProduccion,
        rutaId: o.rutaId,
      }))

      const res = await fetch('/api/ia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modo: 'optimizar_produccion', payload: { ordenes: payload } }),
      })
      const data = await res.json()

      if (data.ok) {
        setOptimizacion(data.optimizacion)
        setIsMockOpt(data.mock ?? false)
      } else {
        throw new Error(data.error ?? 'Error desconocido')
      }
    } catch {
      // Fallback offline
      setOptimizacion(mockOptimizacion(ordenes))
      setIsMockOpt(true)
    } finally {
      setLoadingOpt(false)
    }
  }

  async function handleAnalizarCausas() {
    setLoadingCausas(true)
    setErrorCausas(null)
    setCausas(null)
    try {
      const payload = noConformidades.map((nc) => ({
        id: nc.id,
        tipoDefecto: nc.tipoDefecto,
        severidad: nc.severidad,
        cantidadAfectada: nc.cantidadAfectada,
        producto: nc.producto,
        lineaProduccion: nc.lineaProduccion,
        estadoCierre: nc.estadoCierre,
      }))

      const res = await fetch('/api/ia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modo: 'analizar_causas', payload: { noConformidades: payload } }),
      })
      const data = await res.json()

      if (data.ok) {
        setCausas(data.causas)
        setIsMockCausas(data.mock ?? false)
      } else {
        throw new Error(data.error ?? 'Error desconocido')
      }
    } catch {
      setCausas(mockCausas(noConformidades))
      setIsMockCausas(true)
    } finally {
      setLoadingCausas(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-9 h-9 rounded-xl bg-[#F0ECFD] flex items-center justify-center">
              <Zap size={18} className="text-[#6E56E0]" />
            </div>
            <h1 className="font-poppins text-[22px] font-bold text-[#15233B] leading-none">
              Optimización IA
            </h1>
          </div>
          <p className="text-[13px] text-[#5A6B85]">
            Herramientas de inteligencia artificial para optimización de secuencias y análisis de causas raíz
          </p>
        </div>
        <span className="flex items-center gap-1.5 text-[11px] text-[#6E56E0] bg-[#F0ECFD] px-3 py-1.5 rounded-full font-semibold">
          <Brain size={13} />
          Powered by Gemini
        </span>
      </div>

      {/* ─── HERRAMIENTA 1: Optimizador de Secuencia ─────────────────────────── */}
      <div className="bg-white rounded-2xl border border-[#E8EDF4] overflow-hidden" style={{boxShadow:"0 1px 2px rgba(21,35,59,.03)"}}>
        {/* Header sección */}
        <div className="px-6 py-5 border-b border-[#E8EDF4] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#EAF2FE] flex items-center justify-center">
              <Activity size={16} className="text-[#1F6CF0]" />
            </div>
            <div>
              <h2 className="text-[14px] font-bold text-[#15233B]">Optimizador de Secuencia de Producción</h2>
              <p className="text-[12px] text-[#5A6B85]">
                {ordenes.length} órdenes activas · IA analiza prioridades y cuellos de botella
              </p>
            </div>
          </div>
          <button
            onClick={handleOptimizar}
            disabled={loadingOpt}
            className="flex items-center gap-2 px-[15px] py-[9px] rounded-[11px] text-[13px] font-semibold text-white bg-[#1F6CF0] hover:bg-[#1557C9] disabled:opacity-60 transition-all"
            style={{ boxShadow: '0 6px 16px -6px rgba(31,108,240,.5)' }}
          >
            {loadingOpt ? <Spinner /> : <Play size={14} />}
            {loadingOpt ? 'Analizando…' : 'Optimizar Secuencia'}
          </button>
        </div>

        {/* Resultados */}
        <div className="px-6 py-5">
          {!optimizacion && !loadingOpt && (
            <div className="text-center py-12 text-[#97A4B8]">
              <Activity size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Haz clic en &quot;Optimizar Secuencia&quot; para que la IA analice el plan actual</p>
            </div>
          )}

          {loadingOpt && (
            <div className="text-center py-12">
              <Loader2 size={32} className="animate-spin text-[#1F6CF0] mx-auto mb-3" />
              <p className="text-sm text-[#5A6B85]">Analizando órdenes y calculando secuencia óptima…</p>
            </div>
          )}

          {optimizacion && !loadingOpt && (
            <div className="space-y-5">
              {isMockOpt && (
                <div className="flex items-center gap-2 text-[11px] text-[#F59E0B] bg-[#FEF3E2] px-3 py-2 rounded-lg">
                  <AlertTriangle size={13} />
                  Análisis offline — conecta GEMINI_API_KEY para análisis en tiempo real
                </div>
              )}

              {/* Resumen */}
              <div className="bg-[#EAF2FE] rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-[#1557C9] uppercase tracking-wider">Resumen ejecutivo</p>
                  <span className="text-xs font-bold text-[#16B364] bg-[#E7F8EF] px-2 py-0.5 rounded-full">
                    -{optimizacion.ahorroEstimadoHoras}h ahorro est.
                  </span>
                </div>
                <p className="text-[13px] text-[#15233B]">{optimizacion.resumen}</p>
              </div>

              {/* Secuencia */}
              <div>
                <h3 className="text-xs font-semibold text-[#5A6B85] uppercase tracking-wider mb-3">
                  Secuencia Óptima Recomendada
                </h3>
                <div className="space-y-2">
                  {optimizacion.secuenciaOptima.map((item) => (
                    <div
                      key={item.ordenId}
                      className="flex items-start gap-3 p-4 bg-[#F7FAFD] border border-[#E8EDF4] rounded-xl hover:border-[#1F6CF0]/30 transition-all"
                    >
                      <span className="w-7 h-7 rounded-full bg-[#1F6CF0] text-white font-bold text-[12px] flex items-center justify-center shrink-0">
                        {item.posicion}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-mono text-xs font-bold text-[#1F6CF0]">{item.ordenId}</span>
                          <ArrowRight size={12} className="text-[#97A4B8]" />
                          <span className="text-xs font-semibold text-[#15233B]">{item.tiempoEstimadoHoras}h est.</span>
                        </div>
                        <p className="text-[12px] text-[#5A6B85]">{item.justificacion}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cuellos de botella */}
              {optimizacion.cuellosDeBottella.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-[#5A6B85] uppercase tracking-wider mb-3">
                    Cuellos de Botella Detectados
                  </h3>
                  <div className="space-y-2">
                    {optimizacion.cuellosDeBottella.map((cb, i) => (
                      <div key={i} className="p-4 bg-[#FDECEC] border border-[#EF4444]/20 rounded-xl">
                        <div className="flex items-center gap-2 mb-1">
                          <AlertTriangle size={14} className="text-[#EF4444] shrink-0" />
                          <p className="text-[13px] font-bold text-[#15233B]">{cb.recurso}</p>
                        </div>
                        <p className="text-[12px] text-[#5A6B85] mb-1">{cb.impacto}</p>
                        <p className="text-[12px] text-[#16B364] font-semibold">
                          <CheckCircle2 size={11} className="inline mr-1" />
                          {cb.recomendacion}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ─── HERRAMIENTA 2: Analizador de Causa Raíz ─────────────────────────── */}
      <div className="bg-white rounded-2xl border border-[#E8EDF4] overflow-hidden" style={{boxShadow:"0 1px 2px rgba(21,35,59,.03)"}}>
        <div className="px-6 py-5 border-b border-[#E8EDF4] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#FDECEC] flex items-center justify-center">
              <Target size={16} className="text-[#EF4444]" />
            </div>
            <div>
              <h2 className="text-[14px] font-bold text-[#15233B]">Analizador de Causa Raíz de Defectos</h2>
              <p className="text-[12px] text-[#5A6B85]">
                {noConformidades.length} NCs registradas · Análisis Pareto + árbol de causas
              </p>
            </div>
          </div>
          <button
            onClick={handleAnalizarCausas}
            disabled={loadingCausas}
            className="flex items-center gap-2 px-[15px] py-[9px] rounded-[11px] text-[13px] font-semibold text-white bg-[#EF4444] hover:bg-[#DC2626] disabled:opacity-60 transition-all"
            style={{ boxShadow: '0 6px 16px -6px rgba(239,68,68,.5)' }}
          >
            {loadingCausas ? <Spinner /> : <BarChart2 size={14} />}
            {loadingCausas ? 'Analizando…' : 'Analizar Causas'}
          </button>
        </div>

        <div className="px-6 py-5">
          {!causas && !loadingCausas && (
            <div className="text-center py-12 text-[#97A4B8]">
              <Target size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Haz clic en &quot;Analizar Causas&quot; para el análisis de causa raíz IA</p>
            </div>
          )}

          {loadingCausas && (
            <div className="text-center py-12">
              <Loader2 size={32} className="animate-spin text-[#EF4444] mx-auto mb-3" />
              <p className="text-sm text-[#5A6B85]">Procesando datos de no conformidades…</p>
            </div>
          )}

          {causas && !loadingCausas && (
            <div className="space-y-5">
              {isMockCausas && (
                <div className="flex items-center gap-2 text-[11px] text-[#F59E0B] bg-[#FEF3E2] px-3 py-2 rounded-lg">
                  <AlertTriangle size={13} />
                  Análisis offline — conecta GEMINI_API_KEY para análisis en tiempo real
                </div>
              )}

              {/* Resumen */}
              <div className="bg-[#FDECEC] rounded-xl p-4">
                <p className="text-xs font-bold text-[#DC2626] uppercase tracking-wider mb-2">Resumen de causas</p>
                <p className="text-[13px] text-[#15233B]">{causas.resumen}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Causas raíz */}
                <div>
                  <h3 className="text-xs font-semibold text-[#5A6B85] uppercase tracking-wider mb-3">
                    Árbol de Causas Raíz
                  </h3>
                  <div className="space-y-2">
                    {causas.causasRaiz.map((cr, i) => (
                      <div key={i} className="p-3 bg-[#F7FAFD] border border-[#E8EDF4] rounded-xl">
                        <div className="flex items-center justify-between mb-1">
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{ color: CATEGORIA_COLORS[cr.categoria] ?? '#5A6B85', background: `${CATEGORIA_COLORS[cr.categoria] ?? '#5A6B85'}15` }}
                          >
                            {cr.categoria}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-[#97A4B8]">{cr.frecuencia}x</span>
                            <span
                              className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                              style={{ color: IMPACTO_COLORS[cr.impacto] ?? '#5A6B85', background: `${IMPACTO_COLORS[cr.impacto] ?? '#5A6B85'}15` }}
                            >
                              {cr.impacto}
                            </span>
                          </div>
                        </div>
                        <p className="text-[12.5px] text-[#15233B] font-medium">{cr.causa}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pareto */}
                <div>
                  <h3 className="text-xs font-semibold text-[#5A6B85] uppercase tracking-wider mb-3">
                    Distribución Pareto de Defectos
                  </h3>
                  <div className="space-y-3">
                    {causas.distribucionPareto.map((p, i) => (
                      <div key={i}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-[#5A6B85] truncate max-w-[200px]">{p.defecto}</span>
                          <span className="font-bold text-[#15233B] ml-2">{p.porcentaje}%</span>
                        </div>
                        <div className="h-2.5 rounded-full bg-[#F4F7FB] overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                              width: `${p.porcentaje}%`,
                              background: i === 0 ? '#EF4444' : i === 1 ? '#F59E0B' : '#97A4B8',
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Acciones recomendadas */}
              <div>
                <h3 className="text-xs font-semibold text-[#5A6B85] uppercase tracking-wider mb-3">
                  Acciones Correctivas Recomendadas
                </h3>
                <div className="space-y-2">
                  {causas.accionesRecomendadas.map((a, i) => (
                    <div key={i} className="flex items-start gap-3 p-4 bg-[#F7FAFD] border border-[#E8EDF4] rounded-xl">
                      <span
                        className="text-[10px] font-bold px-2 py-1 rounded-lg shrink-0 mt-0.5"
                        style={{ color: PRIORIDAD_COLORS[a.prioridad] ?? '#5A6B85', background: `${PRIORIDAD_COLORS[a.prioridad] ?? '#5A6B85'}15` }}
                      >
                        {a.prioridad.replace('_', ' ')}
                      </span>
                      <div className="flex-1">
                        <p className="text-[13px] text-[#15233B] font-medium">{a.accion}</p>
                        <p className="text-[11px] text-[#97A4B8] mt-0.5">Responsable: {a.responsable}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

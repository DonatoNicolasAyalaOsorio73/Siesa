'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import {
  Brain, Loader2, RefreshCw, AlertTriangle, CheckCircle2,
  TrendingUp, AlertOctagon, Sparkles, Bot, ChevronRight,
} from 'lucide-react'
import { useAppContext, type PrediccionIA, type OrdenCriticaIA, type AlertaPredictivaIA } from '@/context/AppContext'
import { useCalidadContext, tiempoEsperaMin } from '@/context/CalidadContext'

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const MENSAJES_CARGA = [
  'Analizando patrones de producción…',
  'Correlacionando tiempos con defectos…',
  'Identificando órdenes en riesgo…',
  'Generando recomendaciones…',
]

const RIESGO_CONFIG = {
  ALTO: { color: '#EF4444', bg: '#FDECEC', label: 'ALTO', icon: AlertOctagon },
  MEDIO: { color: '#F59E0B', bg: '#FEF3E2', label: 'MEDIO', icon: AlertTriangle },
  BAJO: { color: '#16B364', bg: '#E7F8EF', label: 'BAJO', icon: CheckCircle2 },
}

function RiesgoBar({ score }: { score: number }) {
  const color = score >= 67 ? '#EF4444' : score >= 34 ? '#F59E0B' : '#16B364'
  return (
    <div className="h-3 rounded-full bg-[#F4F7FB] overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-1000"
        style={{ width: `${score}%`, background: color }}
      />
    </div>
  )
}

function ProbBadge({ prob }: { prob: number }) {
  const color = prob >= 0.7 ? '#EF4444' : prob >= 0.4 ? '#F59E0B' : '#D97706'
  const bg = prob >= 0.7 ? '#FDECEC' : '#FEF3E2'
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: bg, color }}>
      {Math.round(prob * 100)}%
    </span>
  )
}

// ─── PANELS ──────────────────────────────────────────────────────────────────

function OrdenCard({ orden }: { orden: OrdenCriticaIA }) {
  const cfg = RIESGO_CONFIG[orden.riesgo]
  const Icon = cfg.icon
  return (
    <div className="bg-white rounded-xl border border-[#E8EDF4] shadow-sm p-4 space-y-3" style={{ borderLeft: `4px solid ${cfg.color}` }}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-mono text-[10px] text-[#97A4B8]">{orden.ordenId}</p>
          <p className="text-sm font-semibold text-[#15233B] leading-tight">{orden.producto}</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Icon size={14} style={{ color: cfg.color }} />
          <span className="text-[10px] font-bold" style={{ color: cfg.color }}>Riesgo {cfg.label}</span>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-[#97A4B8]">Puntuación</span>
          <span className="text-[10px] font-bold" style={{ color: cfg.color }}>{orden.puntuacion}/100</span>
        </div>
        <RiesgoBar score={orden.puntuacion} />
      </div>

      <div>
        <p className="text-[10px] text-[#97A4B8] mb-1.5 uppercase tracking-wide">Factores de riesgo</p>
        <ul className="space-y-1">
          {orden.factoresRiesgo.map((f, i) => (
            <li key={i} className="flex items-start gap-1.5 text-xs text-[#5A6B85]">
              <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: cfg.color }} />
              {f}
            </li>
          ))}
        </ul>
      </div>

      <div className="pt-2 border-t border-[#EEF2F8]">
        <p className="text-[10px] text-[#97A4B8] mb-1">Recomendación</p>
        <p className="text-xs text-[#5A6B85] leading-snug italic">&ldquo;{orden.recomendacion}&rdquo;</p>
      </div>
    </div>
  )
}

// ─── PÁGINA ───────────────────────────────────────────────────────────────────

export default function PrediccionPage() {
  const { ordenes, prediccionIA, setPrediccionIA } = useAppContext()
  const { inspecciones, noConformidades } = useCalidadContext()

  const fpyPorLinea = useMemo(() => {
    const lineas = Array.from(new Set(ordenes.map((o) => o.lineaProduccion))).sort()
    return lineas.map((linea) => {
      const ol = ordenes.filter((o) => o.lineaProduccion === linea)
      const producido = ol.reduce((s, o) => s + o.cantidadProducida, 0)
      const rechazado = ol.reduce((s, o) => s + o.cantidadRechazada, 0)
      const fpy = producido > 0 ? parseFloat(((producido - rechazado) / producido * 100).toFixed(1)) : 0
      const insLinea = inspecciones.filter((i) => ol.some((o) => o.id === i.ordenId))
      const tiempoEsperaProm = insLinea.length > 0
        ? Math.round(insLinea.reduce((s, i) => s + tiempoEsperaMin(i), 0) / insLinea.length)
        : 0
      return { linea, fpyHoy: fpy, fpySemana: fpy, defectosPorMillon: Math.round(producido > 0 ? rechazado / producido * 1_000_000 : 0), tiempoEsperaProm }
    })
  }, [ordenes, inspecciones])

  const [loading, setLoading] = useState(false)
  const [mensajeCargaIdx, setMensajeCargaIdx] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [esMock, setEsMock] = useState(false)
  const [razonMock, setRazonMock] = useState<string | null>(null)
  const [countdown, setCountdown] = useState<number | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Auto-reintento cuando countdown llega a 0
  useEffect(() => {
    if (countdownRef.current) clearInterval(countdownRef.current)
    if (razonMock?.startsWith('CUOTA:') && !loading) {
      const seg = parseInt(razonMock.split(':')[1], 10) || 60
      setCountdown(seg)
      countdownRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev === null || prev <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current)
            setCountdown(null)
            setTimeout(() => ejecutarAnalisis(), 100)
            return null
          }
          return prev - 1
        })
      }, 1000)
    } else {
      setCountdown(null)
    }
    return () => { if (countdownRef.current) clearInterval(countdownRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [razonMock])

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (countdownRef.current) clearInterval(countdownRef.current)
    }
  }, [])

  async function ejecutarAnalisis() {
    setLoading(true)
    setError(null)

    let idx = 0
    setMensajeCargaIdx(0)
    intervalRef.current = setInterval(() => {
      idx = (idx + 1) % MENSAJES_CARGA.length
      setMensajeCargaIdx(idx)
    }, 2000)

    try {
      const payload = {
        ordenes: ordenes.map((o) => ({
          id: o.id,
          producto: o.producto,
          estado: o.estado,
          lineaProduccion: o.lineaProduccion,
          prioridad: o.prioridad,
          avance: o.cantidadPlanificada > 0
            ? Math.round((o.cantidadProducida / o.cantidadPlanificada) * 100)
            : 0,
          requiereInspeccion: o.requiereInspeccion,
        })),
        indicadores: fpyPorLinea,
        noConformidades: noConformidades.map((nc) => ({
          id: nc.id,
          producto: nc.producto,
          tipoDefecto: nc.tipoDefecto,
          severidad: nc.severidad,
          estadoCierre: nc.estadoCierre,
          cantidadAfectada: nc.cantidadAfectada,
        })),
      }

      const res = await fetch('/api/ia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modo: 'prediccion_riesgo', payload }),
      })
      const data = await res.json()

      if (data.ok) {
        setEsMock(data.mock === true)
        setRazonMock(data.razon ?? null)
        setPrediccionIA({ ...data.prediccion, timestamp: new Date().toISOString() })
      } else {
        setError(data.error || 'Error desconocido al llamar la API')
      }
    } catch {
      setError('No se pudo conectar con el servidor. Recarga la página e intenta de nuevo.')
    } finally {
      if (intervalRef.current) clearInterval(intervalRef.current)
      setLoading(false)
    }
  }

  const resultado = prediccionIA
  const riesgoCfg = resultado ? RIESGO_CONFIG[resultado.nivelRiesgoGlobal] : null

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-[#EEEBFB] flex items-center justify-center">
            <Brain size={20} className="text-[#6E56E0]" />
          </div>
          <div>
            <h1 className="text-2xl font-poppins font-semibold text-[#15233B]">Centro de Análisis Predictivo</h1>
            <p className="text-xs text-[#5A6B85]">Powered by Siesa AI — Gemini 1.5 Flash</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#EEEBFB] border border-[#6E56E0]/20">
            <span className="w-2 h-2 rounded-full bg-[#6E56E0] animate-pulse" />
            <span className="text-[10px] font-bold text-[#6E56E0]">IA ACTIVA</span>
          </div>
        </div>
      </div>

      {/* Panel principal — sin resultado */}
      {!resultado && !loading && (
        <div className="bg-white rounded-2xl border border-[#E8EDF4] shadow-sm p-10 flex flex-col items-center text-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-[#EEEBFB] flex items-center justify-center">
            <Brain size={32} className="text-[#6E56E0]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#15233B] mb-2">Analizar Riesgo de Producción</h2>
            <p className="text-sm text-[#5A6B85] max-w-md">
              Analiza <strong>{ordenes.length} órdenes activas</strong> y{' '}
              <strong>{fpyPorLinea.length} indicadores</strong> en tiempo real para detectar
              riesgos de fallo de calidad antes de que ocurran.
            </p>
          </div>

          {error && (
            <div className="w-full max-w-lg flex flex-col gap-2 p-4 rounded-xl bg-[#FDECEC] border border-[#EF4444]/20 text-left">
              <div className="flex items-start gap-2.5">
                <AlertTriangle size={16} className="text-[#EF4444] flex-shrink-0 mt-0.5" />
                <p className="text-sm font-semibold text-[#DC2626]">Error de conexión con Gemini</p>
              </div>
              <p className="text-xs font-mono text-[#5A6B85] bg-white/70 rounded-lg p-2 border border-[#EF4444]/10 break-all">
                {error}
              </p>
            </div>
          )}

          <button
            onClick={ejecutarAnalisis}
            className="flex items-center gap-2.5 px-8 py-3.5 rounded-xl bg-[#6E56E0] text-white font-bold text-sm hover:bg-[#5B45CC] transition-colors shadow-lg shadow-[#6E56E0]/20"
          >
            <Sparkles size={16} />
            Ejecutar Análisis Predictivo
          </button>
        </div>
      )}

      {/* Panel de carga */}
      {loading && (
        <div className="bg-white rounded-2xl border border-[#E8EDF4] shadow-sm p-10 flex flex-col items-center text-center gap-5">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-[#EEEBFB] flex items-center justify-center">
              <Brain size={32} className="text-[#6E56E0]" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white border-2 border-[#6E56E0] flex items-center justify-center">
              <Loader2 size={12} className="text-[#6E56E0] animate-spin" />
            </div>
          </div>
          <div>
            <p className="text-sm font-bold text-[#15233B] mb-1">Siesa AI está analizando…</p>
            <p className="text-xs text-[#6E56E0] font-medium transition-all duration-500">
              {MENSAJES_CARGA[mensajeCargaIdx]}
            </p>
          </div>
          <div className="w-48 h-1.5 bg-[#F4F7FB] rounded-full overflow-hidden">
            <div className="h-full bg-[#6E56E0] rounded-full animate-pulse w-3/4" />
          </div>
        </div>
      )}

      {/* ── RESULTADO ── */}
      {resultado && riesgoCfg && (
        <div className="space-y-5">
          {/* Botón actualizar + banner modo offline */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            {esMock ? (
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs ${
                razonMock === 'SIN_KEY' || razonMock === 'CLAVE_INVALIDA'
                  ? 'bg-[#FDECEC] text-[#DC2626]'
                  : 'bg-[#FEF3E2] text-[#D97706]'
              }`}>
                <AlertTriangle size={12} />
                <span>
                  {razonMock === 'SIN_KEY' && <><strong>Sin API Key</strong> — configura GEMINI_API_KEY en .env.local.</>}
                  {razonMock === 'CLAVE_INVALIDA' && <><strong>Clave Gemini inválida</strong> — verifica GEMINI_API_KEY en .env.local.</>}
                  {razonMock?.startsWith('CUOTA:') && (
                    countdown !== null
                      ? <><strong>Cuota agotada</strong> — reintentando automáticamente en <strong>{countdown}s</strong>… Análisis local activo.</>
                      : <><strong>Cuota agotada</strong> — límite gratuito de Gemini alcanzado. Reintentando… Análisis generado con lógica local.</>
                  )}
                  {(!razonMock || razonMock === 'RED') && <><strong>Modo offline</strong> — Análisis generado con lógica local basada en los datos reales.</>}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-[10px] text-[#97A4B8]">
                <Sparkles size={11} className="text-[#6E56E0]" />
                Análisis generado por Gemini 2.0 Flash
              </div>
            )}
            <button
              onClick={ejecutarAnalisis}
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white border border-[#E8EDF4] text-xs font-semibold text-[#5A6B85] hover:border-[#6E56E0] hover:text-[#6E56E0] transition-all"
            >
              <RefreshCw size={13} />
              Actualizar análisis
            </button>
          </div>

          {/* Riesgo global */}
          <div className="bg-white rounded-2xl border border-[#E8EDF4] p-5" style={{ borderLeft: `4px solid ${riesgoCfg.color}` }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs text-[#97A4B8] uppercase tracking-wide mb-0.5">Nivel de riesgo global</p>
                <p className="text-3xl font-bold" style={{ color: riesgoCfg.color }}>{resultado.nivelRiesgoGlobal}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-[#97A4B8] mb-0.5">Puntuación</p>
                <p className="text-2xl font-bold text-[#15233B]">{resultado.puntuacionRiesgo}<span className="text-sm text-[#97A4B8] font-normal">/100</span></p>
              </div>
            </div>
            <RiesgoBar score={resultado.puntuacionRiesgo} />
            <div className="flex justify-between text-[10px] text-[#D1D5DB] mt-1">
              <span>Bajo</span>
              <span>Medio</span>
              <span>Alto</span>
            </div>
          </div>

          {/* Órdenes críticas */}
          {resultado.ordenesCriticas.length > 0 && (
            <div>
              <p className="text-xs font-bold text-[#5A6B85] uppercase tracking-wide mb-3">
                Órdenes en riesgo ({resultado.ordenesCriticas.length})
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {resultado.ordenesCriticas.map((o) => (
                  <OrdenCard key={o.ordenId} orden={o} />
                ))}
              </div>
            </div>
          )}

          {/* Alertas predictivas */}
          {resultado.alertasPredictivas.length > 0 && (
            <div className="bg-white rounded-2xl border border-[#E8EDF4] overflow-hidden">
              <div className="px-5 py-3.5 border-b border-[#E8EDF4]">
                <p className="text-sm font-bold text-[#15233B]">Alertas Predictivas</p>
              </div>
              <div className="divide-y divide-[#EEF2F8]">
                {resultado.alertasPredictivas.map((alerta, i) => (
                  <div key={i} className="px-5 py-3.5 flex items-start gap-3">
                    <AlertTriangle size={14} className="text-[#F59E0B] flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-xs font-semibold text-[#15233B]">{alerta.tipo}</p>
                        <ProbBadge prob={alerta.probabilidad} />
                      </div>
                      <p className="text-xs text-[#5A6B85]">{alerta.descripcion}</p>
                      <p className="text-[10px] text-[#97A4B8] mt-0.5">Impacto estimado: {alerta.impactoEstimado}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Patrones detectados */}
          {resultado.patronesDetectados.length > 0 && (
            <div className="bg-white rounded-2xl border border-[#E8EDF4] p-5">
              <p className="text-sm font-bold text-[#15233B] mb-3">Patrones Detectados</p>
              <div className="flex flex-wrap gap-2">
                {resultado.patronesDetectados.map((p, i) => (
                  <span
                    key={i}
                    className="text-xs font-medium px-3 py-1 rounded-full"
                    style={{ background: '#EEEBFB', color: '#6E56E0' }}
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Resumen ejecutivo */}
          <div className="bg-white rounded-2xl border border-[#E8EDF4] p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-[#EEEBFB] flex items-center justify-center">
                <Bot size={14} className="text-[#6E56E0]" />
              </div>
              <p className="text-sm font-bold text-[#15233B]">Resumen Ejecutivo</p>
              <span className="ml-auto text-[10px] text-[#97A4B8]">
                {new Date(resultado.timestamp).toLocaleString('es-CO', {
                  day: '2-digit', month: 'short', year: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                  timeZone: 'America/Bogota',
                })}
              </span>
            </div>
            <p className="text-sm text-[#5A6B85] leading-relaxed">{resultado.resumenEjecutivo}</p>
            <p className="text-[10px] text-[#97A4B8] mt-3 flex items-center gap-1">
              <Sparkles size={10} />
              Análisis generado por Siesa AI — Gemini 2.0 Flash
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

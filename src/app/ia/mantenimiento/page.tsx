'use client'

import { useState } from 'react'
import {
  Wrench, Loader2, AlertTriangle, CheckCircle2, Sparkles, Brain,
  RefreshCw, Clock, TrendingDown, Activity, Zap,
} from 'lucide-react'
import { useManufacturaContext } from '@/context/ManufacturaContext'

// ─── TIPOS ────────────────────────────────────────────────────────────────────

interface EvaluacionCentro {
  centroId: string
  nombre: string
  riesgoFalla: 'ALTO' | 'MEDIO' | 'BAJO'
  estadoActual: string
  eficiencia: number
  accionRecomendada: string
  prioridad: number
}

interface AlertaMant {
  tipo: string
  descripcion: string
  centroId: string
}

interface ProximaIntervencion {
  centroId: string
  nombre: string
  tipo: string
  diasRecomendados: number
  costoEstimado: number
}

interface MantenimientoResult {
  evaluaciones: EvaluacionCentro[]
  alertas: AlertaMant[]
  proximasIntervenciones: ProximaIntervencion[]
  resumen: string
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const RIESGO_CONFIG = {
  ALTO:  { color: '#EF4444', bg: '#FDECEC', border: '#EF4444' },
  MEDIO: { color: '#F59E0B', bg: '#FEF3E2', border: '#F59E0B' },
  BAJO:  { color: '#16B364', bg: '#E7F8EF', border: '#16B364' },
}

const ALERTA_ICONS: Record<string, React.ElementType> = {
  MANTENIMIENTO_ACTIVO: Wrench,
  EFICIENCIA_BAJA: TrendingDown,
  CAPACIDAD_CRITICA: AlertTriangle,
  REVISION_PENDIENTE: Clock,
}

function formatCOP(n: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)
}

// ─── PÁGINA ───────────────────────────────────────────────────────────────────

export default function MantenimientoIAPage() {
  const { centros, registrosTiempos } = useManufacturaContext()

  const [resultado, setResultado] = useState<MantenimientoResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [esMock, setEsMock] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function analizar() {
    setLoading(true)
    setError(null)
    setResultado(null)

    try {
      const res = await fetch('/api/ia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modo: 'sugerir_mantenimiento',
          payload: {
            centros: centros.map((c) => ({
              id: c.id,
              nombre: c.nombre,
              tipo: c.tipo,
              estado: c.estado,
              eficiencia: c.eficiencia,
              costoHora: c.costoHora,
              capacidadHoraDia: c.capacidadHoraDia,
              operador: c.operador,
            })),
            registrosTiempos: registrosTiempos.slice(0, 20).map((r) => ({
              centroTrabajoId: r.centroTrabajoId,
              operacion: r.operacion,
              duracionMin: r.duracionMin,
              estado: r.estado,
            })),
          },
        }),
      })
      const data = await res.json()

      if (data.ok) {
        setResultado(data.mantenimiento)
        setEsMock(data.mock === true)
      } else {
        setError(data.error ?? 'Error al analizar')
      }
    } catch {
      setError('No se pudo conectar con Siesa AI.')
    } finally {
      setLoading(false)
    }
  }

  const enMantenimiento = centros.filter((c) => c.estado === 'MANTENIMIENTO').length
  const bajaEficiencia = centros.filter((c) => (c.eficiencia ?? 100) < 80 && c.estado !== 'MANTENIMIENTO').length

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#FEF3E2] flex items-center justify-center">
          <Wrench size={20} className="text-[#F59E0B]" />
        </div>
        <div>
          <h1 className="text-2xl font-poppins font-semibold text-[#15233B]">Análisis de Mantenimiento IA</h1>
          <p className="text-xs text-[#5A6B85]">Diagnóstico predictivo y recomendaciones de mantenimiento para los equipos de planta</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FEF3E2] border border-[#F59E0B]/20">
          <Brain size={12} className="text-[#F59E0B]" />
          <span className="text-[10px] font-bold text-[#D97706]">PREDICTIVO</span>
        </div>
      </div>

      {/* Resumen de estado actual */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Centros', value: centros.length, icon: Activity, color: '#1F6CF0', bg: '#EAF2FE' },
          { label: 'Operativos', value: centros.filter((c) => c.estado === 'OPERATIVO').length, icon: CheckCircle2, color: '#16B364', bg: '#E7F8EF' },
          { label: 'En Mantenimiento', value: enMantenimiento, icon: Wrench, color: enMantenimiento > 0 ? '#EF4444' : '#16B364', bg: enMantenimiento > 0 ? '#FDECEC' : '#E7F8EF' },
          { label: 'Eficiencia Baja', value: bajaEficiencia, icon: TrendingDown, color: bajaEficiencia > 0 ? '#F59E0B' : '#16B364', bg: bajaEficiencia > 0 ? '#FEF3E2' : '#E7F8EF' },
        ].map((stat, i) => {
          const Icon = stat.icon
          return (
            <div key={i} className="bg-white rounded-xl border border-[#E8EDF4] p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-semibold text-[#97A4B8] uppercase tracking-wide">{stat.label}</p>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: stat.bg }}>
                  <Icon size={13} style={{ color: stat.color }} />
                </div>
              </div>
              <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
            </div>
          )
        })}
      </div>

      {/* Botón de análisis */}
      <div className="bg-white rounded-2xl border border-[#E8EDF4] p-5 shadow-sm flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm font-bold text-[#15233B]">Análisis Predictivo de Mantenimiento</p>
          <p className="text-xs text-[#5A6B85] mt-0.5">
            La IA evalúa el estado, eficiencia y uso de cada centro para priorizar intervenciones
          </p>
        </div>
        <button
          onClick={analizar}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#F59E0B] text-white text-sm font-bold hover:bg-[#D97706] disabled:opacity-60 transition-all shadow-md shadow-[#F59E0B]/25"
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Zap size={15} />}
          {loading ? 'Analizando…' : 'Analizar Equipos'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-[#FDECEC] border border-[#EF4444]/20 text-sm text-[#DC2626]">
          <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="bg-white rounded-2xl border border-[#E8EDF4] p-10 flex flex-col items-center gap-4 text-center shadow-sm">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-[#FEF3E2] flex items-center justify-center">
              <Wrench size={26} className="text-[#F59E0B]" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white border-2 border-[#F59E0B] flex items-center justify-center">
              <Loader2 size={11} className="text-[#F59E0B] animate-spin" />
            </div>
          </div>
          <div>
            <p className="text-sm font-bold text-[#15233B]">Siesa AI está evaluando los equipos…</p>
            <p className="text-xs text-[#5A6B85] mt-1">Analizando {centros.length} centros de trabajo</p>
          </div>
        </div>
      )}

      {/* Resultados */}
      {resultado && !loading && (
        <div className="space-y-5">
          {/* Banner modo + regenerar */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            {esMock ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#FEF3E2] border border-[#FEF3E2] text-xs text-[#D97706]">
                <AlertTriangle size={12} />
                <span><strong>Modo offline</strong> — análisis generado con lógica local.</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-[10px] text-[#97A4B8]">
                <Sparkles size={11} className="text-[#F59E0B]" />
                Análisis generado por Siesa AI — Gemini 2.0 Flash
              </div>
            )}
            <button
              onClick={analizar}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E8EDF4] text-xs text-[#5A6B85] hover:border-[#F59E0B] hover:text-[#D97706] bg-white transition-all"
            >
              <RefreshCw size={12} />
              Actualizar análisis
            </button>
          </div>

          {/* Resumen */}
          <div className="bg-[#FEF3E2] rounded-xl px-5 py-4 border border-[#F59E0B]/20">
            <p className="text-xs font-bold text-[#D97706] uppercase tracking-wide mb-1">Resumen ejecutivo</p>
            <p className="text-sm text-[#15233B]">{resultado.resumen}</p>
          </div>

          {/* Alertas de mantenimiento */}
          {resultado.alertas?.length > 0 && (
            <div className="bg-white rounded-2xl border border-[#E8EDF4] overflow-hidden shadow-sm">
              <div className="px-5 py-3.5 border-b border-[#E8EDF4]">
                <p className="text-sm font-bold text-[#15233B]">Alertas de Mantenimiento</p>
              </div>
              <div className="divide-y divide-[#EEF2F8]">
                {resultado.alertas.map((alerta, i) => {
                  const Icon = ALERTA_ICONS[alerta.tipo] ?? AlertTriangle
                  const esAlto = alerta.tipo === 'MANTENIMIENTO_ACTIVO' || alerta.tipo === 'CAPACIDAD_CRITICA'
                  return (
                    <div key={i} className="px-5 py-3.5 flex items-start gap-3">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${esAlto ? 'bg-[#FDECEC]' : 'bg-[#FEF3E2]'}`}>
                        <Icon size={13} className={esAlto ? 'text-[#EF4444]' : 'text-[#F59E0B]'} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-[#15233B]">{alerta.tipo.replace(/_/g, ' ')}</p>
                        <p className="text-xs text-[#5A6B85] mt-0.5">{alerta.descripcion}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Evaluaciones por centro */}
          {resultado.evaluaciones?.length > 0 && (
            <div>
              <p className="text-xs font-bold text-[#5A6B85] uppercase tracking-wide mb-3">
                Evaluación por Centro de Trabajo
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {resultado.evaluaciones.map((ev) => {
                  const cfg = RIESGO_CONFIG[ev.riesgoFalla]
                  return (
                    <div
                      key={ev.centroId}
                      className="bg-white rounded-xl border border-[#E8EDF4] p-4 space-y-3 shadow-sm"
                      style={{ borderLeft: `3px solid ${cfg.border}` }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-mono text-[10px] text-[#97A4B8]">{ev.centroId}</p>
                          <p className="text-sm font-bold text-[#15233B]">{ev.nombre}</p>
                        </div>
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                          style={{ color: cfg.color, background: cfg.bg }}
                        >
                          Riesgo {ev.riesgoFalla}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="flex justify-between text-[10px] mb-1">
                            <span className="text-[#97A4B8]">Eficiencia</span>
                            <span className={`font-bold ${(ev.eficiencia ?? 100) < 80 ? 'text-[#EF4444]' : 'text-[#16B364]'}`}>
                              {ev.eficiencia ?? '–'}%
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-[#F4F7FB] overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${ev.eficiencia ?? 0}%`,
                                background: (ev.eficiencia ?? 100) >= 80 ? '#16B364' : '#F59E0B',
                              }}
                            />
                          </div>
                        </div>
                        <span
                          className="text-[9px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                          style={{
                            color: ev.estadoActual === 'OPERATIVO' ? '#16B364' : ev.estadoActual === 'MANTENIMIENTO' ? '#EF4444' : '#97A4B8',
                            background: ev.estadoActual === 'OPERATIVO' ? '#E7F8EF' : ev.estadoActual === 'MANTENIMIENTO' ? '#FDECEC' : '#F4F7FB',
                          }}
                        >
                          {ev.estadoActual}
                        </span>
                      </div>

                      <div className="pt-2 border-t border-[#EEF2F8]">
                        <p className="text-[10px] text-[#97A4B8] mb-1">Acción recomendada</p>
                        <p className="text-xs text-[#5A6B85] leading-snug">{ev.accionRecomendada}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Próximas intervenciones */}
          {resultado.proximasIntervenciones?.length > 0 && (
            <div className="bg-white rounded-2xl border border-[#E8EDF4] overflow-hidden shadow-sm">
              <div className="px-5 py-3.5 border-b border-[#E8EDF4]">
                <p className="text-sm font-bold text-[#15233B]">Próximas Intervenciones Recomendadas</p>
              </div>
              <div className="divide-y divide-[#EEF2F8]">
                {resultado.proximasIntervenciones.map((pi, i) => (
                  <div key={i} className="px-5 py-3.5 flex items-center gap-4">
                    <div className="w-9 h-9 rounded-xl bg-[#FEF3E2] flex items-center justify-center flex-shrink-0">
                      <Clock size={15} className="text-[#F59E0B]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#15233B]">{pi.nombre ?? pi.centroId}</p>
                      <p className="text-xs text-[#5A6B85]">{pi.tipo}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-bold text-[#F59E0B]">En {pi.diasRecomendados} días</p>
                      <p className="text-[10px] text-[#97A4B8]">{pi.costoEstimado > 0 ? formatCOP(pi.costoEstimado) : 'Costo a estimar'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Estado vacío */}
      {!resultado && !loading && !error && (
        <div className="bg-white rounded-2xl border border-[#E8EDF4] p-12 flex flex-col items-center text-center gap-4 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-[#FEF3E2] flex items-center justify-center">
            <Wrench size={28} className="text-[#F59E0B]" />
          </div>
          <div>
            <p className="text-base font-bold text-[#15233B] mb-1">Diagnóstico Predictivo de Equipos</p>
            <p className="text-sm text-[#5A6B85] max-w-sm">
              La IA evalúa la eficiencia, estado y uso de cada centro de trabajo para recomendar el plan de mantenimiento óptimo.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs text-[#97A4B8]">
            <span className="flex items-center gap-1"><CheckCircle2 size={12} className="text-[#16B364]" />{centros.filter((c) => c.estado === 'OPERATIVO').length} operativos</span>
            {enMantenimiento > 0 && <span className="flex items-center gap-1"><AlertTriangle size={12} className="text-[#EF4444]" />{enMantenimiento} en mantenimiento</span>}
            {bajaEficiencia > 0 && <span className="flex items-center gap-1"><TrendingDown size={12} className="text-[#F59E0B]" />{bajaEficiencia} baja eficiencia</span>}
          </div>
        </div>
      )}
    </div>
  )
}

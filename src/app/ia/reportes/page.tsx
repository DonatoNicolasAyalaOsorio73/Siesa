'use client'

import { useState, useMemo } from 'react'
import {
  FileText, Sparkles, Loader2, AlertTriangle, TrendingUp, TrendingDown,
  Minus, CheckCircle2, Brain, Download, RefreshCw,
} from 'lucide-react'
import { useAppContext } from '@/context/AppContext'
import { useManufacturaContext } from '@/context/ManufacturaContext'
import { useCalidadContext, tiempoEsperaMin } from '@/context/CalidadContext'

// ─── TIPOS ────────────────────────────────────────────────────────────────────

interface KPI {
  nombre: string
  valor: string
  tendencia: 'SUBIENDO' | 'BAJANDO' | 'ESTABLE'
  descripcion: string
}

interface Hallazgo {
  categoria: 'PRODUCCION' | 'CALIDAD' | 'EFICIENCIA' | 'SEGURIDAD'
  descripcion: string
  impacto: 'ALTO' | 'MEDIO' | 'BAJO'
}

interface Recomendacion {
  accion: string
  urgencia: 'INMEDIATA' | 'ESTA_SEMANA' | 'ESTE_MES'
  area: string
}

interface Reporte {
  titulo: string
  periodo: string
  kpis: KPI[]
  hallazgos: Hallazgo[]
  recomendaciones: Recomendacion[]
  narrativa: string
}

// ─── TIPOS DE REPORTE ─────────────────────────────────────────────────────────

const TIPOS_REPORTE = [
  { id: 'turno', label: 'Reporte de Turno', desc: 'Estado actual de producción y calidad', icon: '🏭' },
  { id: 'calidad', label: 'Reporte de Calidad', desc: 'NCs, FPY, inspecciones y tendencias', icon: '🔬' },
  { id: 'eficiencia', label: 'Reporte de Eficiencia', desc: 'OEE, tiempos y capacidad de planta', icon: '⚡' },
  { id: 'gerencial', label: 'Resumen Gerencial', desc: 'KPIs ejecutivos y recomendaciones clave', icon: '📊' },
]

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const TENDENCIA_ICON = {
  SUBIENDO: TrendingUp,
  BAJANDO: TrendingDown,
  ESTABLE: Minus,
}
const TENDENCIA_COLOR = { SUBIENDO: '#16B364', BAJANDO: '#EF4444', ESTABLE: '#97A4B8' }
const IMPACTO_COLOR = { ALTO: '#EF4444', MEDIO: '#F59E0B', BAJO: '#16B364' }
const IMPACTO_BG = { ALTO: '#FDECEC', MEDIO: '#FEF3E2', BAJO: '#E7F8EF' }
const URGENCIA_COLOR = { INMEDIATA: '#EF4444', ESTA_SEMANA: '#F59E0B', ESTE_MES: '#1F6CF0' }
const URGENCIA_BG = { INMEDIATA: '#FDECEC', ESTA_SEMANA: '#FEF3E2', ESTE_MES: '#EAF2FE' }
const CATEGORIA_COLOR: Record<string, string> = {
  PRODUCCION: '#1F6CF0',
  CALIDAD: '#6E56E0',
  EFICIENCIA: '#16B364',
  SEGURIDAD: '#EF4444',
}

// ─── PÁGINA ───────────────────────────────────────────────────────────────────

export default function ReportesPage() {
  const { ordenes } = useAppContext()
  const { centros, rutas } = useManufacturaContext()
  const { noConformidades, inspecciones, fichasMutable } = useCalidadContext()

  const [tipoSeleccionado, setTipoSeleccionado] = useState('turno')
  const [reporte, setReporte] = useState<Reporte | null>(null)
  const [loading, setLoading] = useState(false)
  const [esMock, setEsMock] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      return { linea, fpyHoy: fpy, fpySemana: fpy, tiempoEsperaProm, totalProducido: producido }
    })
  }, [ordenes, inspecciones])

  async function generarReporte() {
    setLoading(true)
    setError(null)
    setReporte(null)

    try {
      const tipoLabel = TIPOS_REPORTE.find((t) => t.id === tipoSeleccionado)?.label ?? 'Reporte General'

      const res = await fetch('/api/ia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modo: 'generar_reporte',
          payload: {
            tipoReporte: tipoLabel,
            ordenes: ordenes.map((o) => ({
              id: o.id,
              producto: o.producto,
              estado: o.estado,
              linea: o.lineaProduccion,
              prioridad: o.prioridad,
              avance: o.cantidadPlanificada > 0 ? Math.round((o.cantidadProducida / o.cantidadPlanificada) * 100) : 0,
              cantidadPlanificada: o.cantidadPlanificada,
              cantidadProducida: o.cantidadProducida,
              cantidadRechazada: o.cantidadRechazada,
            })),
            noConformidades: noConformidades.map((nc) => ({
              id: nc.id,
              tipo: nc.tipoDefecto,
              severidad: nc.severidad,
              producto: nc.producto,
              cantidadAfectada: nc.cantidadAfectada,
              estadoCierre: nc.estadoCierre,
            })),
            centros: centros.map((c) => ({ id: c.id, nombre: c.nombre, estado: c.estado, eficiencia: c.eficiencia, tipo: c.tipo })),
            indicadores: fpyPorLinea,
            fichas: fichasMutable.length,
            rutas: rutas.length,
          },
        }),
      })
      const data = await res.json()

      if (data.ok) {
        setReporte(data.reporte)
        setEsMock(data.mock === true)
      } else {
        setError(data.error ?? 'Error al generar el reporte')
      }
    } catch {
      setError('No se pudo conectar con Siesa AI. Verifica tu conexión.')
    } finally {
      setLoading(false)
    }
  }

  const tipoActual = TIPOS_REPORTE.find((t) => t.id === tipoSeleccionado)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#EAF2FE] flex items-center justify-center">
          <FileText size={20} className="text-[#1F6CF0]" />
        </div>
        <div>
          <h1 className="text-2xl font-poppins font-semibold text-[#15233B]">Generador de Reportes IA</h1>
          <p className="text-xs text-[#5A6B85]">Reportes ejecutivos generados automáticamente desde los datos de planta</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#EAF2FE] border border-[#1F6CF0]/20">
          <Brain size={12} className="text-[#1F6CF0]" />
          <span className="text-[10px] font-bold text-[#1F6CF0]">SIESA AI</span>
        </div>
      </div>

      {/* Selector de tipo */}
      <div className="bg-white rounded-2xl border border-[#E8EDF4] p-5 shadow-sm">
        <p className="text-xs font-bold text-[#5A6B85] uppercase tracking-wide mb-4">Selecciona el tipo de reporte</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {TIPOS_REPORTE.map((tipo) => (
            <button
              key={tipo.id}
              onClick={() => { setTipoSeleccionado(tipo.id); setReporte(null) }}
              className={`p-3 rounded-xl border text-left transition-all ${
                tipoSeleccionado === tipo.id
                  ? 'border-[#1F6CF0] bg-[#EAF2FE]'
                  : 'border-[#E8EDF4] hover:border-[#1F6CF0]/40 bg-white'
              }`}
            >
              <div className="text-xl mb-1.5">{tipo.icon}</div>
              <p className={`text-xs font-bold leading-tight ${tipoSeleccionado === tipo.id ? 'text-[#1557C9]' : 'text-[#15233B]'}`}>
                {tipo.label}
              </p>
              <p className="text-[10px] text-[#97A4B8] mt-0.5 leading-tight">{tipo.desc}</p>
            </button>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-[#EEF2F8] flex items-center justify-between">
          <div className="text-xs text-[#5A6B85]">
            Datos incluidos:
            <span className="ml-1 font-semibold text-[#15233B]">
              {ordenes.length} órdenes · {noConformidades.length} NCs · {centros.length} centros · {fpyPorLinea.length} líneas
            </span>
          </div>
          <button
            onClick={generarReporte}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1F6CF0] text-white text-sm font-bold hover:bg-[#1557C9] disabled:opacity-60 transition-all shadow-md shadow-[#1F6CF0]/25"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
            {loading ? 'Generando…' : 'Generar Reporte'}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-[#FDECEC] border border-[#EF4444]/20 text-sm text-[#DC2626]">
          <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="bg-white rounded-2xl border border-[#E8EDF4] p-10 flex flex-col items-center gap-4 text-center">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-[#EAF2FE] flex items-center justify-center">
              <FileText size={26} className="text-[#1F6CF0]" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white border-2 border-[#1F6CF0] flex items-center justify-center">
              <Loader2 size={11} className="text-[#1F6CF0] animate-spin" />
            </div>
          </div>
          <div>
            <p className="text-sm font-bold text-[#15233B]">Siesa AI está generando el reporte…</p>
            <p className="text-xs text-[#5A6B85] mt-1">Analizando {ordenes.length} órdenes y {noConformidades.length} NCs en tiempo real</p>
          </div>
          <div className="w-48 h-1.5 bg-[#F4F7FB] rounded-full overflow-hidden">
            <div className="h-full bg-[#1F6CF0] rounded-full animate-pulse w-2/3" />
          </div>
        </div>
      )}

      {/* Reporte generado */}
      {reporte && !loading && (
        <div className="space-y-5">
          {/* Cabecera del reporte */}
          <div className="bg-white rounded-2xl border border-[#E8EDF4] p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3 mb-1">
              <div>
                <h2 className="text-lg font-bold text-[#15233B]">{reporte.titulo}</h2>
                <p className="text-xs text-[#97A4B8]">{reporte.periodo}</p>
              </div>
              <div className="flex items-center gap-2">
                {esMock && (
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-[#D97706] bg-[#FEF3E2] px-2 py-1 rounded-full">
                    <AlertTriangle size={10} />
                    Modo offline
                  </span>
                )}
                <button
                  onClick={generarReporte}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E8EDF4] text-xs text-[#5A6B85] hover:border-[#1F6CF0] hover:text-[#1F6CF0] transition-all"
                >
                  <RefreshCw size={12} />
                  Regenerar
                </button>
              </div>
            </div>
            {!esMock && (
              <p className="text-[10px] text-[#97A4B8] flex items-center gap-1 mt-2">
                <Sparkles size={10} className="text-[#1F6CF0]" />
                Generado por Siesa AI — Gemini 2.0 Flash
              </p>
            )}
          </div>

          {/* KPIs */}
          {reporte.kpis?.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {reporte.kpis.map((kpi, i) => {
                const TrendIcon = TENDENCIA_ICON[kpi.tendencia]
                const tColor = TENDENCIA_COLOR[kpi.tendencia]
                return (
                  <div key={i} className="bg-white rounded-xl border border-[#E8EDF4] p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] font-semibold text-[#97A4B8] uppercase tracking-wide leading-tight">{kpi.nombre}</p>
                      <TrendIcon size={13} style={{ color: tColor }} />
                    </div>
                    <p className="text-2xl font-bold text-[#15233B] leading-none mb-1">{kpi.valor}</p>
                    <p className="text-[10px] text-[#97A4B8]">{kpi.descripcion}</p>
                  </div>
                )
              })}
            </div>
          )}

          {/* Hallazgos + Recomendaciones */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Hallazgos */}
            {reporte.hallazgos?.length > 0 && (
              <div className="bg-white rounded-2xl border border-[#E8EDF4] overflow-hidden shadow-sm">
                <div className="px-5 py-3.5 border-b border-[#E8EDF4]">
                  <p className="text-sm font-bold text-[#15233B]">Hallazgos Clave</p>
                </div>
                <div className="divide-y divide-[#EEF2F8]">
                  {reporte.hallazgos.map((h, i) => (
                    <div key={i} className="px-5 py-3.5 flex items-start gap-3">
                      <span
                        className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 mt-0.5"
                        style={{ color: CATEGORIA_COLOR[h.categoria] ?? '#5A6B85', background: `${CATEGORIA_COLOR[h.categoria]}18` }}
                      >
                        {h.categoria}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-[#15233B] leading-snug">{h.descripcion}</p>
                      </div>
                      <span
                        className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                        style={{ color: IMPACTO_COLOR[h.impacto], background: IMPACTO_BG[h.impacto] }}
                      >
                        {h.impacto}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recomendaciones */}
            {reporte.recomendaciones?.length > 0 && (
              <div className="bg-white rounded-2xl border border-[#E8EDF4] overflow-hidden shadow-sm">
                <div className="px-5 py-3.5 border-b border-[#E8EDF4]">
                  <p className="text-sm font-bold text-[#15233B]">Recomendaciones</p>
                </div>
                <div className="divide-y divide-[#EEF2F8]">
                  {reporte.recomendaciones.map((r, i) => (
                    <div key={i} className="px-5 py-3.5 flex items-start gap-3">
                      <span
                        className="text-[9px] font-bold px-1.5 py-1 rounded-lg flex-shrink-0 mt-0.5 whitespace-nowrap"
                        style={{ color: URGENCIA_COLOR[r.urgencia], background: URGENCIA_BG[r.urgencia] }}
                      >
                        {r.urgencia.replace('_', ' ')}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-[#15233B] leading-snug">{r.accion}</p>
                        <p className="text-[10px] text-[#97A4B8] mt-0.5">{r.area}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Narrativa */}
          {reporte.narrativa && (
            <div className="bg-white rounded-2xl border border-[#E8EDF4] p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-[#EAF2FE] flex items-center justify-center">
                  <Brain size={14} className="text-[#1F6CF0]" />
                </div>
                <p className="text-sm font-bold text-[#15233B]">Análisis Narrativo</p>
              </div>
              <div className="space-y-3">
                {reporte.narrativa.split('\n\n').filter(Boolean).map((parrafo, i) => (
                  <p key={i} className="text-sm text-[#5A6B85] leading-relaxed">{parrafo}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Estado vacío */}
      {!reporte && !loading && !error && (
        <div className="bg-white rounded-2xl border border-[#E8EDF4] p-12 flex flex-col items-center text-center gap-4 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-[#EAF2FE] flex items-center justify-center">
            <FileText size={28} className="text-[#1F6CF0]" />
          </div>
          <div>
            <p className="text-base font-bold text-[#15233B] mb-1">
              {tipoActual?.icon} {tipoActual?.label}
            </p>
            <p className="text-sm text-[#5A6B85] max-w-sm">{tipoActual?.desc}. Haz clic en &ldquo;Generar Reporte&rdquo; para que Siesa AI analice los datos actuales.</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[#97A4B8]">
            <CheckCircle2 size={13} className="text-[#16B364]" />
            {ordenes.length} órdenes disponibles para análisis
          </div>
        </div>
      )}
    </div>
  )
}

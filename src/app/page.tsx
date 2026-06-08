'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import {
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine,
  ResponsiveContainer,
} from 'recharts'
import { formatDistance } from 'date-fns'
import { es } from 'date-fns/locale'
import { useAppContext } from '@/context/AppContext'
import { useManufacturaContext } from '@/context/ManufacturaContext'
import { useCalidadContext, tiempoEsperaMin } from '@/context/CalidadContext'
import type { Alerta, PrediccionIA } from '@/context/AppContext'
import {
  Factory, ClipboardCheck, TrendingUp, Bell, AlertTriangle,
  Brain, ChevronRight, Sparkles, Clock, StopCircle, RefreshCw,
  ArrowUpRight, ArrowDownRight, CheckCircle2, Wrench,
} from 'lucide-react'

// ─── CONSTANTES ──────────────────────────────────────────────────────────────

const RIESGO_COLOR: Record<string, string> = {
  ALTO: '#EF4444', MEDIO: '#F59E0B', BAJO: '#16B364',
}
const COLORES_LINEA = ['#1F6CF0', '#16B364', '#F59E0B']
const LINEAS = ['Línea A', 'Línea B', 'Línea C']

// ─── KPI CARD ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
  titulo: string
  valor: string | number
  unidad?: string
  descripcion: string
  icono: React.ElementType
  color: string
  bgColor: string
  alerta?: boolean
  tendencia?: { valor: number; positiva: boolean }
  progreso?: { valor: number; meta: number }
}

function KpiCard({ titulo, valor, unidad, descripcion, icono: Icono, color, bgColor, alerta, tendencia, progreso }: KpiCardProps) {
  return (
    <div
      className={`bg-white rounded-2xl border flex flex-col gap-3 transition-all duration-200 cursor-default ${alerta ? 'border-[#EF4444] animate-pulse' : 'border-[#E8EDF4]'}`}
      style={{
        padding: '18px 20px',
        boxShadow: '0 1px 2px rgba(21,35,59,.03)',
      }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 10px 30px -16px rgba(21,35,59,.25)')}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 1px 2px rgba(21,35,59,.03)')}
    >
      <div className="flex items-start justify-between">
        {/* Icon 42×42 rounded-13px */}
        <div
          className="flex items-center justify-center shrink-0"
          style={{ width: 42, height: 42, borderRadius: 13, backgroundColor: bgColor }}
        >
          <Icono size={20} style={{ color }} strokeWidth={2} />
        </div>
        {tendencia && (
          <div className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${tendencia.positiva ? 'bg-[#E7F8EF] text-[#0E8A4D]' : 'bg-[#FDECEC] text-[#EF4444]'}`}>
            {tendencia.positiva ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
            {tendencia.valor}%
          </div>
        )}
      </div>
      <div>
        <div className="flex items-baseline gap-[5px]">
          <span className="font-poppins font-bold tabular-nums leading-none" style={{ fontSize: 30, letterSpacing: '-.02em', color }}>{valor}</span>
          {unidad && <span className="text-sm font-semibold text-[#97A4B8]">{unidad}</span>}
        </div>
        <p className="text-[13px] font-semibold text-[#15233B] mt-[6px]">{titulo}</p>
        <p className="text-[12px] text-[#97A4B8] mt-[2px]">{descripcion}</p>
      </div>
      {progreso && (
        <div className="relative h-2 rounded-full bg-[#EEF2F8] overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(progreso.valor, 100)}%`, backgroundColor: color }} />
          <div className="absolute inset-y-0 w-0.5 bg-[#EF4444] opacity-60" style={{ left: `${progreso.meta}%` }} />
        </div>
      )}
    </div>
  )
}

// ─── TOOLTIP ÁREA ─────────────────────────────────────────────────────────────

function TooltipArea({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const mins: number = payload[0]?.value ?? 0
  const sla = mins > 30
  return (
    <div className="bg-white border border-[#E8EDF4] rounded-lg px-3 py-2 text-xs shadow-sm">
      <p className="font-semibold text-[#5A6B85] mb-0.5">{label}</p>
      <p className={sla ? 'text-[#EF4444] font-medium' : 'text-[#16B364] font-medium'}>
        {mins} min — {sla ? '⚠ SLA vencido' : '✓ OK'}
      </p>
    </div>
  )
}

// ─── DOT PERSONALIZADO ────────────────────────────────────────────────────────

function PuntoDot(props: any) {
  const { cx, cy, payload } = props
  if (payload?.minutos > 30) {
    return <circle cx={cx} cy={cy} r={4} fill="#EF4444" stroke="white" strokeWidth={1.5} />
  }
  return <circle cx={cx} cy={cy} r={3} fill="#4C9FE6" stroke="white" strokeWidth={1} />
}

// ─── LABEL PIE ────────────────────────────────────────────────────────────────

function LabelPie({ cx, cy, midAngle, outerRadius, name, value, payload }: any) {
  if (!value) return null
  const RADIAN = Math.PI / 180
  const r = outerRadius + 35
  const x = cx + r * Math.cos(-midAngle * RADIAN)
  const y = cy + r * Math.sin(-midAngle * RADIAN)
  const pct = payload.total > 0 ? ((value / payload.total) * 100).toFixed(1) : '0'
  return (
    <text x={x} y={y} textAnchor={x > cx ? 'start' : 'end'} fill="#5A6B85" fontSize={11}>
      {`${name}: ${value} uds (${pct}%)`}
    </text>
  )
}

// ─── PANEL FPY + ÁREA ─────────────────────────────────────────────────────────

function PanelGraficas() {
  const { ordenes } = useAppContext()
  const { inspecciones } = useCalidadContext()

  const fpyPorLinea = useMemo(() => {
    const lineas = Array.from(new Set(ordenes.map((o) => o.lineaProduccion))).sort()
    return lineas.map((linea) => {
      const ol = ordenes.filter((o) => o.lineaProduccion === linea)
      const producido = ol.reduce((s, o) => s + o.cantidadProducida, 0)
      const rechazado = ol.reduce((s, o) => s + o.cantidadRechazada, 0)
      const fpy = producido > 0 ? parseFloat(((producido - rechazado) / producido * 100).toFixed(1)) : 0
      return { linea, fpyHoy: fpy, fpySemana: fpy }
    })
  }, [ordenes])

  const tendenciaTiempoEspera = useMemo(() => {
    const horas = Array.from({ length: 12 }, (_, i) => `${String(i + 6).padStart(2, '0')}:00`)
    return horas.map((hora) => {
      const h = parseInt(hora)
      const ins = inspecciones.filter((i) => new Date(i.fechaDisparo).getHours() === h)
      const minutos = ins.length > 0
        ? Math.round(ins.reduce((s, i) => s + tiempoEsperaMin(i), 0) / ins.length)
        : 0
      return { hora, minutos }
    })
  }, [inspecciones])

  const fpyData = fpyPorLinea.map(f => ({
    linea: f.linea.replace('Línea ', 'L.'),
    'FPY Hoy': f.fpyHoy,
    'FPY Semana': f.fpySemana,
  }))

  return (
    <div className="flex flex-col gap-5">
      {/* FPY por Línea */}
      <div className="bg-white rounded-2xl border border-[#E8EDF4] p-5">
        <p className="text-sm font-semibold text-[#5A6B85] mb-4">First Pass Yield por Línea</p>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={fpyData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F4F7FB" />
            <XAxis dataKey="linea" tick={{ fontSize: 12, fill: '#5A6B85' }} />
            <YAxis domain={[80, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: '#5A6B85' }} />
            <Tooltip formatter={(v: number) => [`${v}%`]} />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
            <ReferenceLine y={95} stroke="#EF4444" strokeDasharray="4 4" label={{ value: 'Meta 95%', fill: '#EF4444', fontSize: 11, position: 'right' }} />
            <Bar dataKey="FPY Hoy" fill="#1F6CF0" radius={[4, 4, 0, 0]} maxBarSize={40} />
            <Bar dataKey="FPY Semana" fill="#4C9FE6" radius={[4, 4, 0, 0]} maxBarSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Tiempo de Espera */}
      <div className="bg-white rounded-2xl border border-[#E8EDF4] p-5">
        <p className="text-sm font-semibold text-[#5A6B85] mb-4">Tiempo Espera Manufactura → Calidad (min)</p>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={tendenciaTiempoEspera} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <defs>
              <linearGradient id="gradTiempo" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4C9FE6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#4C9FE6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F4F7FB" />
            <XAxis dataKey="hora" tick={{ fontSize: 11, fill: '#5A6B85' }} />
            <YAxis tick={{ fontSize: 11, fill: '#5A6B85' }} />
            <Tooltip content={<TooltipArea />} />
            <ReferenceLine y={30} stroke="#F59E0B" strokeDasharray="4 4" label={{ value: 'SLA 30 min', fill: '#F59E0B', fontSize: 11, position: 'right' }} />
            <Area type="monotone" dataKey="minutos" stroke="#4C9FE6" fill="url(#gradTiempo)" strokeWidth={2} dot={<PuntoDot />} activeDot={{ r: 5, fill: '#1F6CF0' }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ─── PANEL CENTROS DE TRABAJO ─────────────────────────────────────────────────

function PanelCentros() {
  const { centros: centrosTrabajo } = useManufacturaContext()
  const operativos = centrosTrabajo.filter(c => c.estado === 'OPERATIVO')
  const capacidadGlobal = operativos.length > 0
    ? Math.round(operativos.reduce((s, c) => s + c.eficiencia, 0) / operativos.length * 100)
    : 0

  const colorEficiencia = (e: number, estado: string) => {
    if (estado === 'MANTENIMIENTO') return '#97A4B8'
    if (e >= 0.85) return '#16B364'
    if (e >= 0.60) return '#F59E0B'
    return '#EF4444'
  }

  const tipoBadge: Record<string, string> = {
    MAQUINARIA: 'bg-[#EAF2FE] text-[#1557C9]',
    INSPECCION: 'bg-[#E7F8EF] text-[#16B364]',
    ENSAMBLE: 'bg-[#EEEBFB] text-[#6E56E0]',
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E8EDF4] p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-[#5A6B85]">Centros de Trabajo</p>
        <span className="text-xs text-[#97A4B8]">Capacidad global: <strong className="text-[#1F6CF0]">{capacidadGlobal}%</strong></span>
      </div>

      <div className="flex flex-col gap-3">
        {centrosTrabajo.map(c => {
          const color = colorEficiencia(c.eficiencia, c.estado)
          const pct = c.estado === 'MANTENIMIENTO' ? 100 : Math.round(c.eficiencia * 100)
          return (
            <div key={c.id} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 min-w-0">
                  {c.estado === 'MANTENIMIENTO'
                    ? <Wrench size={13} className="text-[#97A4B8] shrink-0" />
                    : <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  }
                  <span className="text-xs font-medium text-[#5A6B85] truncate">{c.nombre}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${tipoBadge[c.tipo] ?? 'bg-gray-100 text-gray-600'}`}>{c.tipo}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${c.estado === 'MANTENIMIENTO' ? 'bg-[#F4F7FB] text-[#6B7280]' : 'bg-[#E7F8EF] text-[#16B364]'}`}>
                    {c.estado === 'MANTENIMIENTO' ? 'MANT.' : 'OPER.'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-[#F4F7FB] rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                </div>
                <span className="text-[10px] text-[#5A6B85] w-8 text-right tabular-nums">
                  {c.estado === 'MANTENIMIENTO' ? '—' : `${pct}%`}
                </span>
              </div>
              <p className="text-[10px] text-[#97A4B8]">{c.operador}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── GRÁFICA DEFECTOS POR LÍNEA ───────────────────────────────────────────────

function GraficaDefectos() {
  const { ordenes } = useAppContext()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const defectosPorLinea = LINEAS.map(linea => ({
    name: linea,
    value: mounted ? ordenes.filter(o => o.lineaProduccion === linea).reduce((s, o) => s + o.cantidadRechazada, 0) : 0,
    total: mounted ? ordenes.filter(o => o.lineaProduccion === linea).reduce((s, o) => s + o.cantidadProducida, 0) : 0,
  }))

  const totalDefectos = defectosPorLinea.reduce((s, d) => s + d.value, 0)

  return (
    <div className="bg-white rounded-2xl border border-[#E8EDF4] p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold text-[#5A6B85]">Defectos por Línea de Producción</p>
        <span className="text-xs text-[#97A4B8]">Total: <strong className="text-[#EF4444]">{totalDefectos}</strong> uds rechazadas</span>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={defectosPorLinea}
            cx="50%"
            cy="50%"
            outerRadius={80}
            dataKey="value"
            label={LabelPie}
            labelLine={{ stroke: '#E8EDF4', strokeWidth: 1 }}
          >
            {defectosPorLinea.map((_, i) => (
              <Cell key={i} fill={COLORES_LINEA[i]} />
            ))}
          </Pie>
          <Tooltip formatter={(v: number, _: string, props: any) => [
            `Total producido: ${props.payload.total} · Defectuosos: ${v}`,
          ]} />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

// ─── TABLA ÓRDENES UNIFICADA ──────────────────────────────────────────────────

const ESTADO_BADGE: Record<string, { cls: string; label: string }> = {
  EN_PROCESO:  { cls: 'bg-[#EAF2FE] text-[#1557C9]', label: 'En Proceso' },
  COMPLETADA:  { cls: 'bg-[#E7F8EF] text-[#16B364]', label: 'Completada' },
  DETENIDA:    { cls: 'bg-[#FDECEC] text-[#DC2626]', label: 'Detenida' },
  PENDIENTE:   { cls: 'bg-[#FEF3E2] text-[#D97706]', label: 'Pendiente' },
}

function EstadoCalidadBadge({ ordenId, ordenEstado, muestras }: { ordenId: string; ordenEstado: string; muestras: any[] }) {
  const muestra = muestras.find(m => m.ordenId === ordenId)
  if (ordenEstado === 'DETENIDA') {
    return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#FDECEC] text-[#DC2626]">✗ NC Registrada</span>
  }
  if (!muestra) {
    return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#F4F7FB] text-[#97A4B8]">Sin inspección</span>
  }
  const mapEstado: Record<string, { cls: string; label: string }> = {
    PENDIENTE:    { cls: 'bg-[#FEF3E2] text-[#D97706]', label: '⏳ Pendiente' },
    EN_REVISION:  { cls: 'bg-[#EAF2FE] text-[#1557C9]', label: '🔍 En revisión' },
    APROBADA:     { cls: 'bg-[#E7F8EF] text-[#16B364]', label: '✓ Liberado' },
    RECHAZADA:    { cls: 'bg-[#FDECEC] text-[#DC2626]', label: '✗ Rechazado' },
  }
  const est = mapEstado[muestra.estado] ?? { cls: 'bg-gray-100 text-gray-600', label: muestra.estado }
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${est.cls}`}>{est.label}</span>
}

function TablaOrdenes() {
  const { ordenes, muestras, completarOperacion } = useAppContext()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const ordenadas = mounted
    ? [...ordenes].sort((a, b) => b.fechaInicio.localeCompare(a.fechaInicio)).slice(0, 5)
    : []

  return (
    <div className="bg-white rounded-2xl border border-[#E8EDF4] overflow-hidden" style={{boxShadow:"0 1px 2px rgba(21,35,59,.03)"}}>
      <div className="px-6 py-4 border-b border-[#E8EDF4]">
        <p className="text-sm font-semibold text-[#5A6B85]">Órdenes Recientes — Vista Unificada</p>
        <p className="text-xs text-[#97A4B8] mt-0.5">Estado en tiempo real de Manufactura y Calidad</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-[#F7FAFD]">
              {['ID Orden', 'Producto', 'Línea', 'Progreso', 'Estado Manuf.', 'Estado Calidad', 'Acción Rápida'].map(h => (
                <th key={h} className="text-left px-4 py-3 font-semibold text-[#5A6B85] uppercase tracking-wide text-[10px] whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ordenadas.map(orden => {
              const pct = orden.cantidadPlanificada > 0
                ? Math.round((orden.cantidadProducida / orden.cantidadPlanificada) * 100)
                : 0
              const badge = ESTADO_BADGE[orden.estado]
              const tieneMuestra = muestras.some(m => m.ordenId === orden.id)
              const muestraPendiente = muestras.some(m => m.ordenId === orden.id && m.estado === 'PENDIENTE')
              return (
                <tr key={orden.id} className="border-b border-[#EEF2F8] hover:bg-[#F9FBFE] transition-colors">
                  <td className="px-4 py-3 font-mono font-semibold text-[#5A6B85]">{orden.id}</td>
                  <td className="px-4 py-3 max-w-[140px]">
                    <p className="font-medium text-[#5A6B85] truncate">{orden.producto}</p>
                    <p className="text-[#97A4B8]">{orden.operario}</p>
                  </td>
                  <td className="px-4 py-3 text-[#5A6B85]">{orden.lineaProduccion}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-[#F4F7FB] rounded-full overflow-hidden">
                        <div className="h-full bg-[#1F6CF0] rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[#5A6B85] tabular-nums w-7 text-right">{pct}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-semibold px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
                  </td>
                  <td className="px-4 py-3">
                    <EstadoCalidadBadge ordenId={orden.id} ordenEstado={orden.estado} muestras={muestras} />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {orden.estado === 'EN_PROCESO' && !tieneMuestra && (
                      <button
                        onClick={() => completarOperacion(orden.id)}
                        className="text-[10px] font-semibold px-2.5 py-1 rounded-lg bg-[#1F6CF0] text-white hover:bg-[#1557C9] transition-colors"
                      >
                        Completar op.
                      </button>
                    )}
                    {orden.estado === 'COMPLETADA' && muestraPendiente && (
                      <Link href="/calidad/inspecciones" className="text-[10px] font-semibold text-[#16B364] hover:text-[#0E8A4D] transition-colors">
                        → Inspeccionar
                      </Link>
                    )}
                    {orden.estado === 'DETENIDA' && (
                      <Link href="/calidad/no-conformidades" className="text-[10px] font-semibold text-[#DC2626] hover:text-[#B91C1C] transition-colors">
                        → Ver NC
                      </Link>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── PANEL ALERTAS ────────────────────────────────────────────────────────────

const ALERTA_ICONO: Record<string, { ic: React.ElementType; color: string }> = {
  INSPECCION_REQUERIDA: { ic: ClipboardCheck, color: '#1F6CF0' },
  LOTE_RECHAZADO:       { ic: AlertTriangle, color: '#EF4444' },
  TIEMPO_EXCEDIDO:      { ic: Clock, color: '#F59E0B' },
  MAQUINA_DETENIDA:     { ic: StopCircle, color: '#EF4444' },
}

function PanelAlertas() {
  const { alertas, marcarAlertaLeida } = useAppContext()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const noLeidas = mounted ? alertas.filter(a => !a.leida).length : 0
  const recientes = mounted ? [...alertas].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 5) : []

  const tiempoRelativo = (ts: string) => {
    if (!mounted) return '...'
    try {
      return formatDistance(new Date(ts), new Date(), { addSuffix: true, locale: es })
    } catch {
      return ts.slice(0, 10)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E8EDF4] p-5 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <p className="text-sm font-semibold text-[#5A6B85]">Alertas del Sistema</p>
        {noLeidas > 0 && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#EF4444] text-white">{noLeidas}</span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {recientes.map(a => {
          const cfg = ALERTA_ICONO[a.tipo] ?? { ic: Bell, color: '#5A6B85' }
          const Ic = cfg.ic
          return (
            <div
              key={a.id}
              className={`flex items-start gap-3 p-3 rounded-lg text-xs transition-all ${
                !a.leida
                  ? 'bg-[#EFF6FF] border-l-2 border-[#1F6CF0]'
                  : 'bg-white border border-[#F4F7FB] opacity-60'
              }`}
            >
              <Ic size={14} className="mt-0.5 shrink-0" style={{ color: cfg.color }} />
              <div className="flex-1 min-w-0">
                <p className="text-[#5A6B85] font-medium leading-tight">{a.mensaje}</p>
                <div className="flex items-center justify-between mt-1 flex-wrap gap-1">
                  <span className="text-[#97A4B8]">{a.modulo}</span>
                  <span className="text-[#97A4B8]" suppressHydrationWarning>{tiempoRelativo(a.timestamp)}</span>
                </div>
              </div>
              {!a.leida && (
                <button
                  onClick={() => marcarAlertaLeida(a.id)}
                  className="text-[#1F6CF0] hover:text-[#1557C9] transition-colors shrink-0"
                  title="Marcar leída"
                >
                  <CheckCircle2 size={14} />
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── WIDGET IA ────────────────────────────────────────────────────────────────

function WidgetIA({ prediccionIA, ordenes, noConformidades }: { prediccionIA: PrediccionIA | null; ordenes: any[]; noConformidades: number }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-[#6E56E0]/25 p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className={`w-10 h-10 rounded-xl bg-[#EEEBFB] flex items-center justify-center shrink-0 ${!prediccionIA ? 'animate-pulse' : ''}`}>
            <Brain size={20} className="text-[#6E56E0]" />
          </div>
          <div>
            <p className="text-sm font-bold text-[#15233B]">Siesa AI</p>
            <p className="text-[10px] text-[#97A4B8]">Análisis predictivo de calidad</p>
          </div>
        </div>
        <Link
          href="/ia/prediccion"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#6E56E0] text-white text-xs font-bold hover:bg-[#5B45CC] transition-colors shrink-0"
        >
          <Sparkles size={11} />
          {prediccionIA ? 'Ver análisis' : 'Ejecutar análisis →'}
        </Link>
      </div>

      {!prediccionIA ? (
        <div className="rounded-xl bg-gradient-to-br from-[#6E56E0]/5 to-[#4C9FE6]/5 border border-dashed border-[#6E56E0]/20 p-4 text-center">
          <p className="text-xs font-semibold text-[#6E56E0]">Siesa AI listo para analizar</p>
          <p className="text-[11px] text-[#97A4B8] mt-1">
            {ordenes.length} órdenes · {noConformidades} NCs disponibles
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {/* Nivel riesgo */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs text-[#5A6B85]">Riesgo global:</span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full" style={{
              backgroundColor: `${RIESGO_COLOR[prediccionIA.nivelRiesgoGlobal]}18`,
              color: RIESGO_COLOR[prediccionIA.nivelRiesgoGlobal],
            }}>
              {prediccionIA.nivelRiesgoGlobal} — {prediccionIA.puntuacionRiesgo}/100
            </span>
          </div>
          {/* Barra riesgo */}
          <div className="h-2 rounded-full bg-[#F4F7FB] overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700" style={{
              width: `${prediccionIA.puntuacionRiesgo}%`,
              background: `linear-gradient(to right, ${RIESGO_COLOR[prediccionIA.nivelRiesgoGlobal]}90, ${RIESGO_COLOR[prediccionIA.nivelRiesgoGlobal]})`,
            }} />
          </div>
          {/* Stats */}
          {prediccionIA.ordenesCriticas.length > 0 && (
            <p className="text-xs text-[#5A6B85] flex items-center gap-1.5">
              <AlertTriangle size={11} className="text-[#F59E0B]" />
              <strong>{prediccionIA.ordenesCriticas.length}</strong> órdenes críticas identificadas
            </p>
          )}
          {/* Primeras 2 críticas */}
          {prediccionIA.ordenesCriticas.slice(0, 2).map(oc => (
            <div key={oc.ordenId} className="flex items-center gap-2 text-[11px] bg-[#F4F7FB] rounded-lg px-3 py-1.5">
              <span className="font-mono text-[#5A6B85]">{oc.ordenId}</span>
              <span className="text-[#97A4B8] flex-1 truncate">{oc.producto}</span>
              <span className="font-bold" style={{ color: RIESGO_COLOR[oc.riesgo] }}>{oc.riesgo}</span>
            </div>
          ))}
          {/* Resumen truncado */}
          <p className="text-[11px] text-[#5A6B85] leading-relaxed line-clamp-2">
            {prediccionIA.resumenEjecutivo.slice(0, 150)}{prediccionIA.resumenEjecutivo.length > 150 ? '…' : ''}
          </p>
          <div className="flex items-center justify-between">
            <Link href="/ia/prediccion" className="flex items-center gap-1 text-[11px] font-semibold text-[#6E56E0] hover:text-[#5B45CC] transition-colors">
              Ver análisis completo <ChevronRight size={12} />
            </Link>
            <span className="text-[10px] text-[#97A4B8]" suppressHydrationWarning>
              {prediccionIA.timestamp ? prediccionIA.timestamp.slice(0, 16).replace('T', ' ') : ''}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── PÁGINA PRINCIPAL ─────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { ordenes, muestras, alertas, completarOperacion, prediccionIA } = useAppContext()
  const [actualizando, setActualizando] = useState(false)
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const handleActualizar = () => {
    setActualizando(true)
    setTimeout(() => setActualizando(false), 1200)
  }

  // ── KPIs — all guarded by mounted to avoid SSR/client localStorage mismatch ──
  const activas         = mounted ? ordenes.filter(o => o.estado === 'EN_PROCESO').length : 0
  const pendientes      = mounted ? ordenes.filter(o => o.estado === 'PENDIENTE').length : 0
  const detenidas       = mounted ? ordenes.filter(o => o.estado === 'DETENIDA').length : 0

  const inspecPendientes = mounted ? muestras.filter(m => m.estado === 'PENDIENTE').length : 0
  const vencidasSLA = mounted ? muestras.filter(m => {
    if (m.estado !== 'PENDIENTE') return false
    const diffMin = (Date.now() - new Date(m.fechaRegistro).getTime()) / 60000
    return diffMin > 30
  }).length : 0

  const completadas   = mounted ? ordenes.filter(o => o.estado === 'COMPLETADA') : []
  const totalProducido = completadas.reduce((s, o) => s + o.cantidadProducida, 0)
  const totalRechazado = completadas.reduce((s, o) => s + o.cantidadRechazada, 0)
  const fpyGlobal = totalProducido > 0
    ? parseFloat(((totalProducido - totalRechazado) / totalProducido * 100).toFixed(1))
    : 0
  const fpyColor = fpyGlobal >= 95 ? '#16B364' : '#EF4444'

  const alertasNoLeidas = mounted ? alertas.filter(a => !a.leida) : []
  const alertasManuf = alertasNoLeidas.filter(a => a.modulo === 'MANUFACTURA').length
  const alertasCal   = alertasNoLeidas.filter(a => a.modulo === 'CALIDAD').length

  const fechaHoy = mounted
    ? new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : ''

  return (
    <div className="max-w-7xl mx-auto space-y-6">

      {/* ── CABECERA ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-poppins font-semibold text-[#15233B]">Dashboard Ejecutivo</h1>
          <p className="text-sm text-[#5A6B85] mt-0.5">Vista unificada Manufactura + Calidad — Actualizado en tiempo real</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-medium text-[#5A6B85] px-3 py-1.5 bg-[#F4F7FB] rounded-lg capitalize" suppressHydrationWarning>
            {fechaHoy}
          </span>
          <button
            onClick={handleActualizar}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E8EDF4] text-xs font-semibold text-[#5A6B85] hover:bg-[#F4F7FB] transition-colors"
          >
            <RefreshCw size={13} className={actualizando ? 'animate-spin' : ''} />
            Actualizar datos
          </button>
        </div>
      </div>

      {/* ── SECCIÓN 1: KPI CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <KpiCard
          titulo="Órdenes Activas"
          valor={activas}
          descripcion={`${pendientes} pendientes · ${detenidas} detenida${detenidas !== 1 ? 's' : ''}`}
          icono={Factory}
          color="#1F6CF0"
          bgColor="#EAF2FE"
          tendencia={{ valor: 12, positiva: true }}
        />
        <KpiCard
          titulo="Inspecciones Pendientes"
          valor={inspecPendientes}
          descripcion={vencidasSLA > 0 ? `${vencidasSLA} con SLA vencido` : 'Todas dentro de SLA'}
          icono={ClipboardCheck}
          color={vencidasSLA > 0 ? '#EF4444' : '#16B364'}
          bgColor={vencidasSLA > 0 ? '#FDECEC' : '#E7F8EF'}
          alerta={vencidasSLA > 0}
          tendencia={{ valor: 2, positiva: false }}
        />
        <KpiCard
          titulo="First Pass Yield Global"
          valor={fpyGlobal}
          unidad="%"
          descripcion="Rendimiento de primera pasada — completadas"
          icono={TrendingUp}
          color={fpyColor}
          bgColor={fpyGlobal >= 95 ? '#E7F8EF' : '#FDECEC'}
          progreso={{ valor: fpyGlobal, meta: 95 }}
        />
        <KpiCard
          titulo="Alertas Críticas"
          valor={alertasNoLeidas.length}
          descripcion={`${alertasManuf} manufactura · ${alertasCal} calidad`}
          icono={Bell}
          color="#EF4444"
          bgColor="#FDECEC"
        />
      </div>

      {/* ── SECCIÓN 2: GRÁFICAS + CENTROS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <div className="lg:col-span-3">
          <PanelGraficas />
        </div>
        <div className="lg:col-span-2">
          <PanelCentros />
        </div>
      </div>

      {/* ── SECCIÓN 2B: DEFECTOS PIE ── */}
      <GraficaDefectos />

      {/* ── SECCIÓN 3: TABLA ÓRDENES ── */}
      <TablaOrdenes />

      {/* ── SECCIÓN 4: ALERTAS + IA ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <PanelAlertas />
        <WidgetIA prediccionIA={prediccionIA} ordenes={ordenes} noConformidades={1} />
      </div>

    </div>
  )
}

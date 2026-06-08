'use client'

import { useMemo } from 'react'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { CheckCircle2, Clock, AlertTriangle, TrendingUp } from 'lucide-react'
import { useCalidadContext, tiempoEsperaMin } from '@/context/CalidadContext'
import { useAppContext } from '@/context/AppContext'
import { SLA_MINUTOS } from '@/data/calidadData'
import PageHeader from '@/components/manufactura/PageHeader'
import MetaLine from '@/components/calidad/MetaLine'

const FPY_META = 95

// ─── TOOLTIP PERSONALIZADO ────────────────────────────────────────────────────

function TooltipFPY({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white rounded-xl shadow-lg border border-[#E8EDF4] px-4 py-3 text-xs">
      <p className="font-bold text-[#15233B] mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: <strong>{p.value.toFixed(1)}%</strong>
        </p>
      ))}
    </div>
  )
}

function TooltipEspera({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const min = payload[0]?.value
  return (
    <div className="bg-white rounded-xl shadow-lg border border-[#E8EDF4] px-4 py-3 text-xs">
      <p className="font-bold text-[#15233B] mb-1">{label}</p>
      <p style={{ color: min >= SLA_MINUTOS ? '#EF4444' : '#16B364' }}>
        Tiempo: <strong>{min} min</strong>
        {min >= SLA_MINUTOS && <span className="ml-1 text-[#EF4444]">⚠ sobre SLA</span>}
      </p>
    </div>
  )
}

// ─── PÁGINA ───────────────────────────────────────────────────────────────────

export default function IndicadoresPage() {
  const { inspecciones, noConformidades } = useCalidadContext()
  const { ordenes } = useAppContext()

  const fpyPorLinea = useMemo(() => {
    const lineas = Array.from(new Set(ordenes.map((o) => o.lineaProduccion))).sort()
    return lineas.map((linea) => {
      const ol = ordenes.filter((o) => o.lineaProduccion === linea)
      const producido = ol.reduce((s, o) => s + o.cantidadProducida, 0)
      const rechazado = ol.reduce((s, o) => s + o.cantidadRechazada, 0)
      const fpy = producido > 0 ? parseFloat(((producido - rechazado) / producido * 100).toFixed(1)) : 0
      const dpm = producido > 0 ? Math.round((rechazado / producido) * 1_000_000) : 0
      const insLinea = inspecciones.filter((i) => ol.some((o) => o.id === i.ordenId))
      const tiempoEsperaProm = insLinea.length > 0
        ? Math.round(insLinea.reduce((s, i) => s + tiempoEsperaMin(i), 0) / insLinea.length)
        : 0
      return { linea, fpyHoy: fpy, fpySemana: fpy, defectosPorMillon: dpm, tiempoEsperaProm }
    })
  }, [ordenes, inspecciones])

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

  const totalInspecciones = inspecciones.length
  const aprobadas = inspecciones.filter((i) => i.estado === 'APROBADA').length
  const rechazadas = inspecciones.filter((i) => i.estado === 'RECHAZADA').length
  const pendientes = inspecciones.filter((i) => i.estado === 'PENDIENTE' || i.estado === 'EN_PROCESO').length
  const fpyGlobal = totalInspecciones > 0 ? Math.round((aprobadas / (aprobadas + rechazadas || 1)) * 1000) / 10 : 100
  const ncCriticas = noConformidades.filter((nc) => nc.severidad === 'CRITICA').length
  const promedioEspera = tendenciaTiempoEspera.length > 0
    ? Math.round(tendenciaTiempoEspera.reduce((a, b) => a + b.minutos, 0) / tendenciaTiempoEspera.length)
    : 0

  const kpis = [
    {
      label: 'FPY Global',
      value: `${fpyGlobal.toFixed(1)}%`,
      sub: `Meta ${FPY_META}%`,
      color: fpyGlobal >= FPY_META ? '#16B364' : '#EF4444',
      bg: fpyGlobal >= FPY_META ? '#E7F8EF' : '#FDECEC',
      Icon: CheckCircle2,
    },
    {
      label: 'T. Espera Prom.',
      value: `${promedioEspera} min`,
      sub: `SLA ${SLA_MINUTOS} min`,
      color: promedioEspera <= SLA_MINUTOS ? '#16B364' : '#F59E0B',
      bg: promedioEspera <= SLA_MINUTOS ? '#E7F8EF' : '#FEF3E2',
      Icon: Clock,
    },
    {
      label: 'NC Críticas abiertas',
      value: String(ncCriticas),
      sub: `${noConformidades.length} NC totales`,
      color: ncCriticas === 0 ? '#16B364' : '#EF4444',
      bg: ncCriticas === 0 ? '#E7F8EF' : '#FDECEC',
      Icon: AlertTriangle,
    },
    {
      label: 'Inspecciones pendientes',
      value: String(pendientes),
      sub: `${totalInspecciones} totales`,
      color: pendientes === 0 ? '#16B364' : '#F59E0B',
      bg: pendientes === 0 ? '#E7F8EF' : '#FEF3E2',
      Icon: TrendingUp,
    },
  ]

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader titulo="Indicadores de Calidad" subtitulo="FPY, tiempos de respuesta y no conformidades — Calidad" />

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {kpis.map(({ label, value, sub, color, bg, Icon }) => (
          <div key={label} className="bg-white rounded-2xl border border-[#E8EDF4] p-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
              <Icon size={18} style={{ color }} />
            </div>
            <div>
              <p className="text-xl font-bold leading-none mb-0.5" style={{ color }}>{value}</p>
              <p className="text-xs font-semibold text-[#15233B]">{label}</p>
              <p className="text-[10px] text-[#97A4B8] mt-0.5">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        {/* FPY por línea */}
        <div className="bg-white rounded-2xl border border-[#E8EDF4] p-5">
          <p className="text-sm font-bold text-[#15233B] mb-4">FPY por Línea de Producción</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={fpyPorLinea} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="linea" tick={{ fontSize: 11, fill: '#5A6B85' }} />
              <YAxis domain={[80, 100]} tick={{ fontSize: 11, fill: '#5A6B85' }} unit="%" />
              <Tooltip content={<TooltipFPY />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <MetaLine value={FPY_META} label={`Meta ${FPY_META}%`} color="#16B364" dashed />
              <Bar dataKey="fpyHoy" name="FPY hoy" fill="#16B364" radius={[4, 4, 0, 0]} />
              <Bar dataKey="fpySemana" name="FPY semana" fill="#16B364" fillOpacity={0.45} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Tendencia tiempo espera */}
        <div className="bg-white rounded-2xl border border-[#E8EDF4] p-5">
          <p className="text-sm font-bold text-[#15233B] mb-4">Tiempo de Espera en Cola — Hoy</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={tendenciaTiempoEspera} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="hora" tick={{ fontSize: 11, fill: '#5A6B85' }} />
              <YAxis tick={{ fontSize: 11, fill: '#5A6B85' }} unit=" min" />
              <Tooltip content={<TooltipEspera />} />
              <MetaLine value={SLA_MINUTOS} label={`SLA ${SLA_MINUTOS} min`} color="#F59E0B" dashed />
              <Line
                type="monotone"
                dataKey="minutos"
                name="Tiempo espera"
                stroke="#4C9FE6"
                strokeWidth={2}
                dot={(props: any) => {
                  const { cx, cy, payload } = props
                  const over = payload.minutos >= SLA_MINUTOS
                  return <circle key={`dot-${props.index}`} cx={cx} cy={cy} r={4} fill={over ? '#EF4444' : '#4C9FE6'} stroke="white" strokeWidth={1.5} />
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabla detalle líneas */}
      <div className="bg-white rounded-2xl border border-[#E8EDF4] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E8EDF4]">
          <p className="text-sm font-bold text-[#15233B]">Detalle por Línea</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[#F7FAFD] border-b border-[#E8EDF4]">
                {['Línea', 'FPY Hoy', 'FPY Semana', 'DPM', 'T. Espera Prom.', 'Estatus'].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-[#5A6B85] font-semibold uppercase tracking-wide text-[10px]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {fpyPorLinea.map((linea) => {
                const fpyOk = linea.fpyHoy >= FPY_META
                const esperaOk = linea.tiempoEsperaProm <= SLA_MINUTOS
                const ok = fpyOk && esperaOk
                return (
                  <tr key={linea.linea} className="border-b border-[#EEF2F8] hover:bg-[#F9FBFE] transition-colors">
                    <td className="px-5 py-3.5 font-semibold text-[#15233B]">{linea.linea}</td>
                    <td className="px-5 py-3.5">
                      <span className="font-bold" style={{ color: fpyOk ? '#16B364' : '#EF4444' }}>
                        {linea.fpyHoy.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-[#5A6B85]">{linea.fpySemana.toFixed(1)}%</td>
                    <td className="px-5 py-3.5 font-mono text-[#5A6B85]">
                      {new Intl.NumberFormat('es-CO').format(linea.defectosPorMillon)}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="font-bold" style={{ color: esperaOk ? '#16B364' : '#F59E0B' }}>
                        {linea.tiempoEsperaProm} min
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{
                          background: ok ? '#E7F8EF' : '#FDECEC',
                          color: ok ? '#16B364' : '#EF4444',
                        }}
                      >
                        {ok ? 'En meta' : 'Fuera de meta'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

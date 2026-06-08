'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { estructuraCostos, formatCOPCurrency } from '@/data/manufacturaData'
import PageHeader from '@/components/manufactura/PageHeader'
import { TrendingDown, TrendingUp, DollarSign } from 'lucide-react'

// ─── FORMATEADOR COP COMPACTO ─────────────────────────────────────────────────

const fmtCompacto = (v: number) =>
  new Intl.NumberFormat('es-CO', { notation: 'compact', maximumFractionDigits: 1 }).format(v)

const fmtCOP = (v: number) => `$ ${new Intl.NumberFormat('es-CO').format(v)}`

// ─── TOOLTIP PERSONALIZADO ────────────────────────────────────────────────────

function TooltipPersonalizado({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { color: string; name: string; value: number }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-[#E8EDF4] rounded-xl shadow-lg px-4 py-3 text-xs">
      <p className="font-bold text-[#15233B] mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
          <span className="text-[#5A6B85]">{p.name}:</span>
          <span className="font-semibold text-[#5A6B85]">{fmtCOP(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

// ─── PÁGINA ───────────────────────────────────────────────────────────────────

export default function EstructuraCostosPage() {
  const datoGrafico = estructuraCostos.map((c) => ({
    orden: c.ordenId.replace('OP-2024-', 'OP-'),
    Estimado: c.totalEstimado,
    Real: c.totalReal,
  }))

  const totalEstimado = estructuraCostos.reduce((s, c) => s + c.totalEstimado, 0)
  const totalReal = estructuraCostos.reduce((s, c) => s + c.totalReal, 0)
  const variacionGlobal = totalEstimado > 0
    ? ((totalReal - totalEstimado) / totalEstimado) * 100
    : 0

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader titulo="Estructura de Costos" subtitulo="Análisis Estimado vs Real — Manufactura" />

      {/* Resumen global */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          {
            label: 'Total Estimado',
            valor: formatCOPCurrency(totalEstimado),
            icon: DollarSign,
            color: '#4C9FE6',
            bg: '#EAF2FE',
          },
          {
            label: 'Total Real',
            valor: formatCOPCurrency(totalReal),
            icon: DollarSign,
            color: '#1F6CF0',
            bg: '#EAF2FE',
          },
          {
            label: 'Variación Global',
            valor: `${variacionGlobal > 0 ? '+' : ''}${variacionGlobal.toFixed(1)}%`,
            icon: variacionGlobal <= 0 ? TrendingDown : TrendingUp,
            color: variacionGlobal <= 0 ? '#16B364' : '#EF4444',
            bg: variacionGlobal <= 0 ? '#E7F8EF' : '#FDECEC',
          },
        ].map(({ label, valor, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-2xl border border-[#E8EDF4] p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: bg }}>
              <Icon size={20} style={{ color }} />
            </div>
            <div>
              <p className="text-lg font-bold" style={{ color }}>{valor}</p>
              <p className="text-xs text-[#5A6B85] font-medium">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Gráfico comparativo */}
      <div className="bg-white rounded-xl border border-[#E8EDF4] shadow-sm p-6 mb-5">
        <h2 className="text-sm font-bold text-[#15233B] mb-4">
          Comparativo Estimado vs Real por Orden (COP)
        </h2>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart
            data={datoGrafico}
            margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
            barGap={4}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#F4F7FB" vertical={false} />
            <XAxis
              dataKey="orden"
              tick={{ fontSize: 11, fill: '#5A6B85', fontFamily: 'Roboto' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v) => `$${fmtCompacto(v)}`}
              tick={{ fontSize: 11, fill: '#5A6B85', fontFamily: 'Roboto' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<TooltipPersonalizado />} />
            <Legend
              wrapperStyle={{ fontSize: '12px', fontFamily: 'Roboto', color: '#5A6B85' }}
            />
            <Bar dataKey="Estimado" fill="#4C9FE6" radius={[4, 4, 0, 0]} maxBarSize={48} />
            <Bar dataKey="Real" fill="#1F6CF0" radius={[4, 4, 0, 0]} maxBarSize={48} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Tabla detalle */}
      <div className="bg-white rounded-2xl border border-[#E8EDF4] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E8EDF4]">
          <h2 className="text-sm font-bold text-[#15233B]">Desglose por Orden</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[#F7FAFD]">
                {['Orden', 'Producto', 'Mano de Obra', 'Materiales', 'CIF', 'Total Estimado', 'Total Real', 'Variación'].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-[#5A6B85] font-semibold uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {estructuraCostos.map((costo) => {
                const variacion = costo.totalEstimado > 0 && costo.totalReal > 0
                  ? ((costo.totalReal - costo.totalEstimado) / costo.totalEstimado) * 100
                  : null
                const esFavorable = variacion !== null && variacion <= 0

                return (
                  <tr key={costo.ordenId} className="border-t border-[#EEF2F8] hover:bg-[#F9FBFE] transition-colors">
                    <td className="px-5 py-3 font-mono font-bold text-[#15233B]">{costo.ordenId}</td>
                    <td className="px-5 py-3 text-[#5A6B85] font-medium max-w-[140px] truncate">{costo.producto}</td>
                    <td className="px-5 py-3 text-[#5A6B85]">{formatCOPCurrency(costo.manoObra)}</td>
                    <td className="px-5 py-3 text-[#5A6B85]">{formatCOPCurrency(costo.materiales)}</td>
                    <td className="px-5 py-3 text-[#5A6B85]">{formatCOPCurrency(costo.cif)}</td>
                    <td className="px-5 py-3 font-semibold text-[#4C9FE6]">{formatCOPCurrency(costo.totalEstimado)}</td>
                    <td className="px-5 py-3 font-semibold text-[#1F6CF0]">
                      {costo.totalReal > 0 ? formatCOPCurrency(costo.totalReal) : '—'}
                    </td>
                    <td className="px-5 py-3">
                      {variacion !== null ? (
                        <div className="flex items-center gap-1">
                          {esFavorable
                            ? <TrendingDown size={12} className="text-[#16B364]" />
                            : <TrendingUp size={12} className="text-[#DC2626]" />
                          }
                          <span
                            className={`font-bold ${esFavorable ? 'text-[#16B364]' : 'text-[#DC2626]'}`}
                          >
                            {variacion > 0 ? '+' : ''}{variacion.toFixed(1)}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-[#97A4B8]">—</span>
                      )}
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

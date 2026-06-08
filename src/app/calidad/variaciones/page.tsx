'use client'

import { useMemo, useState } from 'react'
import { Sliders, TrendingUp, TrendingDown, CheckCircle2, XCircle, Activity } from 'lucide-react'
import { useAppContext } from '@/context/AppContext'
import { useCalidadContext } from '@/context/CalidadContext'
import PageHeader from '@/components/manufactura/PageHeader'

// ─── TIPOS ────────────────────────────────────────────────────────────────────

interface MedicionAgregada {
  parametro: string
  unidad: string
  valorNominal: number
  tolerancia: number
  critico: boolean
  mediciones: { valorMedido: number; aprobado: boolean; ordenId: string; muestraId: string }[]
  totalMediciones: number
  aprobadas: number
  fpy: number
  desvMin: number
  desvMax: number
  desvProm: number
}

// ─── BARRA DE DESVIACIÓN ──────────────────────────────────────────────────────

function BarraDesviacion({ desviacion, tolerancia }: { desviacion: number; tolerancia: number }) {
  const pct = Math.min(Math.abs(desviacion) / tolerancia, 1)
  const color = pct >= 1 ? '#EF4444' : pct >= 0.7 ? '#F59E0B' : '#16B364'
  const lado = desviacion >= 0 ? 'right' : 'left'

  return (
    <div className="flex items-center gap-2">
      <div className="relative w-24 h-2 bg-[#F4F7FB] rounded-full overflow-hidden">
        {/* Centro */}
        <div className="absolute inset-y-0 left-1/2 w-px bg-[#D1D5DB]" />
        {/* Barra desviación */}
        <div
          className="absolute inset-y-0 rounded-full transition-all"
          style={{
            width: `${pct * 50}%`,
            [lado]: '50%',
            backgroundColor: color,
          }}
        />
      </div>
      <span className="font-mono text-[11px] font-semibold" style={{ color }}>
        {desviacion >= 0 ? '+' : ''}{desviacion.toFixed(3)}
      </span>
    </div>
  )
}

// ─── PÁGINA ───────────────────────────────────────────────────────────────────

export default function VariacionesPage() {
  const { muestras, ordenes } = useAppContext()
  const { inspecciones, fichasMutable } = useCalidadContext()
  const [filtro, setFiltro] = useState<'TODOS' | 'CRITICOS' | 'FUERA'>('TODOS')

  // Agregar todas las mediciones por parámetro
  const agregados = useMemo<MedicionAgregada[]>(() => {
    const map = new Map<string, MedicionAgregada>()

    // Construir catálogo de parámetros desde fichas técnicas
    fichasMutable.forEach((f) => {
      f.criterios.forEach((c) => {
        if (!map.has(c.parametro)) {
          map.set(c.parametro, {
            parametro: c.parametro,
            unidad: c.unidad,
            valorNominal: c.valorNominal,
            tolerancia: c.tolerancia,
            critico: c.critico,
            mediciones: [],
            totalMediciones: 0,
            aprobadas: 0,
            fpy: 0,
            desvMin: 0,
            desvMax: 0,
            desvProm: 0,
          })
        }
      })
    })

    // Agregar mediciones desde muestras de AppContext
    muestras.forEach((m) => {
      m.resultados.forEach((r) => {
        if (r.valorMedido === undefined || r.valorMedido === null) return
        const entrada = map.get(r.parametro)
        if (!entrada) return
        entrada.mediciones.push({
          valorMedido: r.valorMedido,
          aprobado: r.aprobado,
          ordenId: m.ordenId,
          muestraId: m.id,
        })
      })
    })

    // Agregar mediciones desde inspecciones del CalidadContext
    inspecciones.forEach((ins) => {
      ins.resultados.forEach((r) => {
        if (r.valorMedido === null || r.valorMedido === undefined) return
        const entrada = map.get(r.parametro)
        if (!entrada) return
        // Evitar duplicados (misma muestra puede estar en ambos contextos)
        const yaExiste = entrada.mediciones.some((m) => m.muestraId === ins.id)
        if (!yaExiste) {
          entrada.mediciones.push({
            valorMedido: r.valorMedido,
            aprobado: r.aprobado ?? false,
            ordenId: ins.ordenId,
            muestraId: ins.id,
          })
        }
      })
    })

    // Calcular estadísticas
    map.forEach((entrada) => {
      const n = entrada.mediciones.length
      entrada.totalMediciones = n
      entrada.aprobadas = entrada.mediciones.filter((m) => m.aprobado).length
      entrada.fpy = n > 0 ? Math.round((entrada.aprobadas / n) * 100) : 100

      if (n > 0) {
        const desvs = entrada.mediciones.map((m) => m.valorMedido - entrada.valorNominal)
        entrada.desvMin = Math.min(...desvs)
        entrada.desvMax = Math.max(...desvs)
        entrada.desvProm = desvs.reduce((s, d) => s + d, 0) / n
      }
    })

    return Array.from(map.values()).sort((a, b) => {
      // Primero críticos, luego por FPY ascendente
      if (a.critico !== b.critico) return a.critico ? -1 : 1
      return a.fpy - b.fpy
    })
  }, [muestras, inspecciones, fichasMutable])

  const filtrados = agregados.filter((a) => {
    if (filtro === 'CRITICOS') return a.critico
    if (filtro === 'FUERA') return a.fpy < 100
    return true
  })

  const totalMediciones = agregados.reduce((s, a) => s + a.totalMediciones, 0)
  const fueraTolerancia = agregados.reduce((s, a) => s + (a.totalMediciones - a.aprobadas), 0)
  const fpyGlobal =
    totalMediciones > 0 ? Math.round(((totalMediciones - fueraTolerancia) / totalMediciones) * 100) : 100
  const parametrosCriticos = agregados.filter((a) => a.critico).length

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader
        titulo="Análisis de Variaciones"
        subtitulo="Desviaciones de parámetros medidos vs. valores nominales de fichas técnicas"
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total mediciones', value: totalMediciones, color: '#1F6CF0', bg: '#EAF2FE', icon: Activity },
          { label: 'FPY global', value: `${fpyGlobal}%`, color: fpyGlobal >= 95 ? '#16B364' : fpyGlobal >= 85 ? '#F59E0B' : '#EF4444', bg: '#E7F8EF', icon: TrendingUp },
          { label: 'Fuera tolerancia', value: fueraTolerancia, color: fueraTolerancia > 0 ? '#EF4444' : '#16B364', bg: '#FDECEC', icon: TrendingDown },
          { label: 'Parámetros críticos', value: parametrosCriticos, color: '#F59E0B', bg: '#FEF3E2', icon: Sliders },
        ].map(({ label, value, color, bg, icon: Icon }) => (
          <div key={label} className="bg-white rounded-xl border border-[#E8EDF4] shadow-sm p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: bg }}>
              <Icon size={18} style={{ color }} />
            </div>
            <div>
              <p className="text-xl font-bold leading-none" style={{ color }}>{value}</p>
              <p className="text-[11px] text-[#5A6B85] mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-4">
        {[
          { key: 'TODOS', label: 'Todos los parámetros' },
          { key: 'CRITICOS', label: 'Solo críticos' },
          { key: 'FUERA', label: 'Con variaciones' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFiltro(key as typeof filtro)}
            className={`px-[13px] py-[8px] rounded-[10px] text-[12.5px] font-medium transition-all border ${
              filtro === key
                ? 'bg-[#16B364] text-white border-[#16B364]'
                : 'bg-white text-[#5A6B85] border-[#E8EDF4] hover:border-[#16B364]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tabla de variaciones */}
      <div className="bg-white rounded-2xl border border-[#E8EDF4] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[#F7FAFD] border-b border-[#E8EDF4]">
                {['Parámetro', 'Nominal ± Tol.', 'Mediciones', 'FPY', 'Desviación promedio', 'Rango [min, max]', 'Estado'].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-[#5A6B85] font-semibold uppercase tracking-wide text-[10px]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-[#97A4B8]">
                    <Sliders size={36} className="mx-auto mb-2 opacity-20" />
                    <p>No hay mediciones para los filtros seleccionados</p>
                  </td>
                </tr>
              )}
              {filtrados.map((a) => {
                const fueraSpec = a.totalMediciones - a.aprobadas
                const colorFpy = a.fpy >= 95 ? '#16B364' : a.fpy >= 85 ? '#F59E0B' : '#EF4444'

                return (
                  <tr key={a.parametro} className="border-b border-[#EEF2F8] hover:bg-[#F9FBFE] transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        {a.critico && <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] shrink-0" />}
                        <span className="font-semibold text-[#15233B]">{a.parametro}</span>
                        {a.critico && (
                          <span className="text-[10px] text-[#EF4444] font-bold border border-[#EF4444]/30 px-1.5 py-0.5 rounded">
                            CRÍTICO
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 font-mono text-[#5A6B85]">
                      {a.valorNominal} <span className="text-[#97A4B8]">± {a.tolerancia}</span> {a.unidad}
                    </td>
                    <td className="px-5 py-4">
                      {a.totalMediciones > 0 ? (
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-[#15233B]">{a.totalMediciones}</span>
                          {fueraSpec > 0 && (
                            <span className="text-[#EF4444] text-[10px]">({fueraSpec} fuera)</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[#D1D5DB]">Sin datos</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {a.totalMediciones > 0 ? (
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-1.5 bg-[#F4F7FB] rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${a.fpy}%`, backgroundColor: colorFpy }}
                            />
                          </div>
                          <span className="font-bold" style={{ color: colorFpy }}>{a.fpy}%</span>
                        </div>
                      ) : (
                        <span className="text-[#D1D5DB]">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {a.totalMediciones > 0 ? (
                        <BarraDesviacion desviacion={a.desvProm} tolerancia={a.tolerancia} />
                      ) : (
                        <span className="text-[#D1D5DB]">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4 font-mono text-[#5A6B85] text-[10px]">
                      {a.totalMediciones > 0 ? (
                        <span>
                          [{a.desvMin >= 0 ? '+' : ''}{a.desvMin.toFixed(3)},{' '}
                          {a.desvMax >= 0 ? '+' : ''}{a.desvMax.toFixed(3)}]
                        </span>
                      ) : (
                        <span className="text-[#D1D5DB]">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {a.totalMediciones === 0 ? (
                        <span className="text-xs text-[#D1D5DB]">Sin mediciones</span>
                      ) : fueraSpec === 0 ? (
                        <div className="flex items-center gap-1 text-[#16B364]">
                          <CheckCircle2 size={13} />
                          <span className="text-xs font-semibold">En spec</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-[#EF4444]">
                          <XCircle size={13} />
                          <span className="text-xs font-semibold">Variación</span>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Nota de fuente de datos */}
      <p className="text-[10px] text-[#97A4B8] mt-3 text-center">
        Datos consolidados de muestras de AppContext e inspecciones de CalidadContext · Fichas técnicas como referencia nominal
      </p>
    </div>
  )
}

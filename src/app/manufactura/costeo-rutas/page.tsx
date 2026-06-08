'use client'

import { useState, useMemo } from 'react'
import { useManufacturaContext } from '@/context/ManufacturaContext'
import PageHeader from '@/components/manufactura/PageHeader'
import Modal from '@/components/ui/Modal'
import FormField, { inputClass } from '@/components/ui/FormField'
import { Calculator, DollarSign, Clock, TrendingUp, Play } from 'lucide-react'

const formatCOP = (n: number) => new Intl.NumberFormat('es-CO').format(Math.round(n))
const formatCOPCurrency = (n: number) => `$ ${formatCOP(n)}`

interface CosteoRuta {
  rutaId: string
  nombre: string
  producto: string
  version: string
  estado: string
  totalMinutos: number
  costoMOTotal: number
  costoMaquina: number
  costoTotal: number
  operaciones: {
    nombre: string
    centroNombre: string
    totalMin: number
    costoMO: number
    costoMaquina: number
  }[]
}

export default function CosteoRutasPage() {
  const { rutas, centros } = useManufacturaContext()

  const [modalSimular, setModalSimular] = useState(false)
  const [tasaMO, setTasaMO] = useState<number | null>(null)
  const [tasaInput, setTasaInput] = useState('')
  const [expandida, setExpandida] = useState<string | null>(null)

  const costeos = useMemo((): CosteoRuta[] => {
    return rutas.map((ruta) => {
      const ops = ruta.operaciones.map((op) => {
        const centro = centros.find((c) => c.id === op.centroTrabajoId)
        const totalMin = op.tiempoSetupMin + op.tiempoOperacionMin
        const totalH = totalMin / 60
        const tasaMOActual = tasaMO ?? ruta.costoManoObraHora
        const costoMO = tasaMOActual * totalH
        const costoMaquinaOp = centro ? centro.costoHora * totalH : 0
        return {
          nombre: op.nombre,
          centroNombre: centro?.nombre ?? op.centroTrabajoId,
          totalMin,
          costoMO,
          costoMaquina: costoMaquinaOp,
        }
      })

      const totalMinutos = ops.reduce((s, o) => s + o.totalMin, 0)
      const costoMOTotal = ops.reduce((s, o) => s + o.costoMO, 0)
      const costoMaquina = ops.reduce((s, o) => s + o.costoMaquina, 0)

      return {
        rutaId: ruta.id,
        nombre: ruta.nombre,
        producto: ruta.producto,
        version: ruta.version,
        estado: ruta.estado,
        totalMinutos,
        costoMOTotal,
        costoMaquina,
        costoTotal: costoMOTotal + costoMaquina,
        operaciones: ops,
      }
    })
  }, [rutas, centros, tasaMO])

  const totalMO = costeos.reduce((s, c) => s + c.costoMOTotal, 0)
  const totalMaquina = costeos.reduce((s, c) => s + c.costoMaquina, 0)
  const totalGeneral = costeos.reduce((s, c) => s + c.costoTotal, 0)

  function handleSimular() {
    const val = Number(tasaInput.replace(/\./g, '').replace(/,/g, '.'))
    if (!isNaN(val) && val > 0) {
      setTasaMO(val)
      setModalSimular(false)
      setTasaInput('')
    }
  }

  const ESTADO_COLORS: Record<string, string> = {
    ACTIVA: '#16B364',
    BORRADOR: '#F59E0B',
    OBSOLETA: '#97A4B8',
  }

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader titulo="Costeo de Rutas" subtitulo="Análisis de costos por operación — Manufactura">
        <div className="flex items-center gap-3">
          {tasaMO !== null && (
            <span className="text-xs text-[#6E56E0] bg-[#F0ECFD] px-3 py-1.5 rounded-lg font-semibold">
              Simulando: {formatCOPCurrency(tasaMO)}/h MO
            </span>
          )}
          {tasaMO !== null && (
            <button
              onClick={() => setTasaMO(null)}
              className="text-xs text-[#5A6B85] border border-[#E8EDF4] bg-white px-3 py-1.5 rounded-lg hover:bg-[#F9FBFE] transition-all"
            >
              Restablecer
            </button>
          )}
          <button
            onClick={() => setModalSimular(true)}
            className="flex items-center gap-[7px] bg-[#6E56E0] text-white rounded-[11px] px-[15px] py-[9px] text-[13px] font-semibold hover:bg-[#5B45CC] transition-colors"
            style={{ boxShadow: '0 6px 16px -6px rgba(110,86,224,.5)' }}
          >
            <Play size={14} />
            Simular
          </button>
        </div>
      </PageHeader>

      {/* Resumen global */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Costo MO Total', valor: totalMO, color: '#1F6CF0', bg: '#EAF2FE', icon: DollarSign },
          { label: 'Costo Máquina Total', valor: totalMaquina, color: '#16B364', bg: '#E7F8EF', icon: TrendingUp },
          { label: 'Costo Total Rutas', valor: totalGeneral, color: '#6E56E0', bg: '#F0ECFD', icon: Calculator },
        ].map(({ label, valor, color, bg, icon: Icon }) => (
          <div key={label} className="bg-white rounded-2xl border border-[#E8EDF4] p-5 flex items-center gap-4" style={{boxShadow:"0 1px 2px rgba(21,35,59,.03)"}}>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: bg }}>
              <Icon size={20} style={{ color }} />
            </div>
            <div>
              <p className="text-lg font-bold font-mono" style={{ color }}>{formatCOPCurrency(valor)}</p>
              <p className="text-xs text-[#5A6B85] font-medium mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabla de rutas */}
      <div className="bg-white rounded-2xl border border-[#E8EDF4] overflow-hidden" style={{boxShadow:"0 1px 2px rgba(21,35,59,.03)"}}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F7FAFD]">
                {['Ruta', 'Producto', 'T. Total', 'Costo MO', 'Costo Máquina', 'Costo Total', 'Estado', 'Detalle'].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-[10.5px] font-semibold text-[#5A6B85] uppercase tracking-[.05em]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {costeos.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-[#97A4B8] text-sm">
                    No hay rutas configuradas.
                  </td>
                </tr>
              ) : (
                costeos.flatMap((c) => {
                  const rows = [
                    <tr
                      key={c.rutaId}
                      className="border-t border-[#EEF2F8] hover:bg-[#F9FBFE] transition-colors cursor-pointer"
                      onClick={() => setExpandida(expandida === c.rutaId ? null : c.rutaId)}
                    >
                      <td className="px-5 py-3">
                        <div>
                          <p className="font-mono text-xs font-bold text-[#1F6CF0]">{c.rutaId}</p>
                          <p className="text-xs text-[#5A6B85] mt-0.5 max-w-[160px] truncate">{c.nombre}</p>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-xs text-[#5A6B85] max-w-[140px] truncate">{c.producto}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1.5 text-xs text-[#5A6B85]">
                          <Clock size={12} />
                          <span className="font-semibold">{c.totalMinutos}</span>
                          <span className="text-[#97A4B8]">min</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-xs font-semibold text-[#1F6CF0]">
                        {formatCOPCurrency(c.costoMOTotal)}
                      </td>
                      <td className="px-5 py-3 text-xs font-semibold text-[#16B364]">
                        {formatCOPCurrency(c.costoMaquina)}
                      </td>
                      <td className="px-5 py-3 text-sm font-bold text-[#15233B]">
                        {formatCOPCurrency(c.costoTotal)}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{
                            color: ESTADO_COLORS[c.estado] ?? '#97A4B8',
                            background: `${ESTADO_COLORS[c.estado] ?? '#97A4B8'}18`,
                          }}
                        >
                          {c.estado}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs text-[#1F6CF0] font-semibold select-none">
                        {expandida === c.rutaId ? 'Ocultar ▲' : 'Ver ▼'}
                      </td>
                    </tr>,
                  ]

                  if (expandida === c.rutaId) {
                    rows.push(
                      <tr key={`${c.rutaId}-detail`} className="border-t border-[#EEF2F8] bg-[#F7FAFD]">
                        <td colSpan={8} className="px-5 py-3">
                          <div className="rounded-xl border border-[#E8EDF4] overflow-hidden">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="bg-[#EEF2F8]">
                                  <th className="text-left px-4 py-2 text-[#5A6B85] font-semibold">#</th>
                                  <th className="text-left px-4 py-2 text-[#5A6B85] font-semibold">Operación</th>
                                  <th className="text-left px-4 py-2 text-[#5A6B85] font-semibold">Centro</th>
                                  <th className="text-right px-4 py-2 text-[#5A6B85] font-semibold">T. (min)</th>
                                  <th className="text-right px-4 py-2 text-[#5A6B85] font-semibold">Costo MO</th>
                                  <th className="text-right px-4 py-2 text-[#5A6B85] font-semibold">Costo Máquina</th>
                                  <th className="text-right px-4 py-2 text-[#5A6B85] font-semibold">Total Op.</th>
                                </tr>
                              </thead>
                              <tbody>
                                {c.operaciones.map((op, i) => (
                                  <tr key={i} className="border-t border-[#E8EDF4] hover:bg-white transition-colors">
                                    <td className="px-4 py-2">
                                      <span className="w-5 h-5 rounded-full bg-[#EAF2FE] text-[#1557C9] font-bold text-[10px] flex items-center justify-center">
                                        {i + 1}
                                      </span>
                                    </td>
                                    <td className="px-4 py-2 font-medium text-[#15233B]">{op.nombre}</td>
                                    <td className="px-4 py-2 text-[#5A6B85]">{op.centroNombre}</td>
                                    <td className="px-4 py-2 text-right text-[#5A6B85]">{op.totalMin}</td>
                                    <td className="px-4 py-2 text-right text-[#1F6CF0]">{formatCOPCurrency(op.costoMO)}</td>
                                    <td className="px-4 py-2 text-right text-[#16B364]">{formatCOPCurrency(op.costoMaquina)}</td>
                                    <td className="px-4 py-2 text-right font-bold text-[#15233B]">
                                      {formatCOPCurrency(op.costoMO + op.costoMaquina)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )
                  }

                  return rows
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal simulación */}
      <Modal
        abierto={modalSimular}
        onCerrar={() => setModalSimular(false)}
        titulo="Simular Tasa MO Personalizada"
        subtitulo="Recalcula costos con una tasa de mano de obra diferente"
        ancho="sm"
      >
        <div className="space-y-4">
          <FormField label="Tasa MO / hora (COP)" hint="Ingresa el valor sin puntos. Ej: 45000">
            <input
              type="number"
              className={inputClass}
              placeholder="35000"
              value={tasaInput}
              onChange={(e) => setTasaInput(e.target.value)}
              min={0}
            />
          </FormField>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setModalSimular(false)}
              className="px-[15px] py-[9px] rounded-[11px] border border-[#E8EDF4] bg-white text-[13px] font-semibold text-[#5A6B85] hover:bg-[#F9FBFE] transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={handleSimular}
              className="px-[15px] py-[9px] rounded-[11px] text-[13px] font-semibold text-white bg-[#6E56E0] hover:bg-[#5B45CC] transition-all"
              style={{ boxShadow: '0 6px 16px -6px rgba(110,86,224,.5)' }}
            >
              Aplicar Simulación
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

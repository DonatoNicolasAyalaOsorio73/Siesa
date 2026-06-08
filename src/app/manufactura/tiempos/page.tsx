'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAppContext } from '@/context/AppContext'
import { useManufacturaContext } from '@/context/ManufacturaContext'
import { formatHora } from '@/lib/fecha'
import PageHeader from '@/components/manufactura/PageHeader'
import StatusBadge from '@/components/manufactura/StatusBadge'
import Toast from '@/components/manufactura/Toast'
import { useToast } from '@/hooks/useToast'
import {
  Play, Square, Pause, Clock, AlertCircle, ChevronDown, X, Trash2,
} from 'lucide-react'
import type { RegistroTiempo } from '@/context/ManufacturaContext'

// ─── CRONÓMETRO ───────────────────────────────────────────────────────────────

function formatearCronometro(segundos: number): string {
  const h = Math.floor(segundos / 3600)
  const m = Math.floor((segundos % 3600) / 60)
  const s = segundos % 60
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':')
}

// ─── MODAL FINALIZAR ─────────────────────────────────────────────────────────

interface ModalFinalizarProps {
  abierto: boolean
  segundos: number
  onCancelar: () => void
  onConfirmar: (cantidadProducida: number, observaciones: string) => void
}

function ModalFinalizar({ abierto, segundos, onCancelar, onConfirmar }: ModalFinalizarProps) {
  const [cantidad, setCantidad] = useState('')
  const [obs, setObs] = useState('')

  if (!abierto) return null

  const handleConfirmar = () => {
    const n = parseInt(cantidad, 10)
    if (!n || n <= 0) return
    onConfirmar(n, obs)
    setCantidad('')
    setObs('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancelar} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8EDF4]">
          <h3 className="font-bold text-[#15233B] text-base">Finalizar Operación</h3>
          <button onClick={onCancelar} className="text-[#5A6B85] hover:text-[#5A6B85]">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="bg-[#1F6CF0]/5 border border-[#1F6CF0]/20 rounded-xl px-4 py-3 flex items-center gap-3">
            <Clock size={16} className="text-[#1F6CF0] shrink-0" />
            <div>
              <p className="text-xs text-[#5A6B85]">Tiempo registrado</p>
              <p className="text-lg font-bold text-[#1F6CF0] font-mono">{formatearCronometro(segundos)}</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#5A6B85] mb-1.5">
              Cantidad Producida <span className="text-[#EF4444]">*</span>
            </label>
            <input
              type="number"
              min="1"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              placeholder="Ingrese la cantidad..."
              className="w-full border border-[#E8EDF4] rounded-lg px-3 py-2.5 text-sm text-[#5A6B85] focus:outline-none focus:border-[#1F6CF0] focus:ring-2 focus:ring-[#EAF2FE] transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#5A6B85] mb-1.5">
              Observaciones
            </label>
            <textarea
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              placeholder="Anomalías, incidencias u observaciones del operario..."
              rows={3}
              className="w-full border border-[#E8EDF4] rounded-lg px-3 py-2.5 text-sm text-[#5A6B85] focus:outline-none focus:border-[#1F6CF0] focus:ring-1 focus:ring-[#1F6CF0]/30 resize-none transition"
            />
          </div>
        </div>

        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={onCancelar}
            className="flex-1 border border-[#E8EDF4] text-[#5A6B85] rounded-lg py-2.5 text-sm font-semibold hover:bg-[#F4F7FB] transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirmar}
            disabled={!cantidad || parseInt(cantidad, 10) <= 0}
            className="flex-1 bg-[#16B364] text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-[#16B364] disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            Confirmar y Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── TABLA REGISTROS DEL TURNO ────────────────────────────────────────────────

function TablaRegistros({
  registros,
  centros,
  onEliminar,
}: {
  registros: RegistroTiempo[]
  centros: { id: string; nombre: string }[]
  onEliminar: (id: string) => void
}) {
  const getNombreCentro = (id: string) => centros.find((c) => c.id === id)?.nombre ?? id

  return (
    <div className="bg-white rounded-2xl border border-[#E8EDF4] overflow-hidden" style={{ boxShadow: '0 1px 2px rgba(21,35,59,.03)' }}>
      <div className="px-6 py-4 border-b border-[#E8EDF4]">
        <h2 className="text-sm font-bold text-[#15233B]">Registros del Turno</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-[#F7FAFD]">
              {['Orden', 'Operación', 'Centro', 'Inicio', 'Duración', 'Und. Prod.', 'Estado', ''].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-[#5A6B85] font-semibold uppercase tracking-wide text-[10.5px]">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {registros.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-12 text-[#97A4B8]">
                  <Clock size={28} className="mx-auto mb-2 opacity-20" />
                  <p className="text-sm">No hay registros aún — use el cronómetro para registrar operaciones</p>
                </td>
              </tr>
            )}
            {registros.map((reg) => {
              const durMin = reg.duracionMin ?? Math.round((Date.now() - new Date(reg.fechaInicio).getTime()) / 60000)
              return (
                <tr key={reg.id} className="border-t border-[#EEF2F8] hover:bg-[#F9FBFE] transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-mono font-semibold text-[#15233B]">{reg.ordenId}</span>
                  </td>
                  <td className="px-4 py-3 text-[#5A6B85] font-medium">{reg.operacion}</td>
                  <td className="px-4 py-3 text-[#5A6B85]">{getNombreCentro(reg.centroTrabajoId)}</td>
                  <td className="px-4 py-3 font-mono text-[#5A6B85]">
                    {formatHora(reg.fechaInicio)}
                  </td>
                  <td className="px-4 py-3 font-mono text-[#5A6B85] font-semibold">
                    {reg.estado === 'EN_CURSO' ? (
                      <span className="text-[#1F6CF0] animate-pulse">En curso…</span>
                    ) : (
                      `${durMin} min`
                    )}
                  </td>
                  <td className="px-4 py-3 text-[#5A6B85]">
                    {reg.cantidadProducida > 0
                      ? new Intl.NumberFormat('es-CO').format(reg.cantidadProducida)
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge estado={reg.estado} size="sm" />
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => onEliminar(reg.id)}
                      className="p-1 rounded-lg text-[#97A4B8] hover:text-[#EF4444] hover:bg-[#FDECEC] transition-all"
                      title="Eliminar registro"
                    >
                      <Trash2 size={13} />
                    </button>
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

// ─── PÁGINA PRINCIPAL ─────────────────────────────────────────────────────────

export default function TiemposPage() {
  const { ordenes, completarOperacion } = useAppContext()
  const { registrosTiempos, centros, rutas, agregarRegistroTiempo, eliminarRegistroTiempo: deleteRegistro } = useManufacturaContext()
  const { toast, mostrarToast, cerrarToast } = useToast()

  const ordenesEnProceso = ordenes.filter((o) => o.estado === 'EN_PROCESO')
  const [ordenSelecId, setOrdenSelecId] = useState(ordenesEnProceso[0]?.id ?? '')
  const ordenSeleccionada = ordenes.find((o) => o.id === ordenSelecId) ?? null

  const [corriendo, setCorriendo] = useState(false)
  const [enPausa, setEnPausa] = useState(false)
  const [segundos, setSegundos] = useState(0)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [inicioTimestamp, setInicioTimestamp] = useState<string>('')
  const [fechaHoy, setFechaHoy] = useState('')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    setFechaHoy(new Date().toLocaleDateString('es-CO', {
      timeZone: 'America/Bogota',
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }))
  }, [])

  useEffect(() => {
    if (corriendo && !enPausa) {
      intervalRef.current = setInterval(() => setSegundos((s) => s + 1), 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [corriendo, enPausa])

  const ruta = rutas.find((r) => r.id === ordenSeleccionada?.rutaId)
  const opActual = ruta?.operaciones.find(
    (op) => op.orden === ordenSeleccionada?.operacionActual.indice
  )
  const centro = centros.find((c) => c.id === opActual?.centroTrabajoId)

  const handleIniciar = () => {
    const now = new Date().toISOString()
    setInicioTimestamp(now)
    setSegundos(0)
    setCorriendo(true)
    setEnPausa(false)
  }

  const handlePausa = () => setEnPausa((p) => !p)

  const handleFinalizar = () => {
    setCorriendo(false)
    setEnPausa(false)
    setModalAbierto(true)
  }

  const handleConfirmarFinalizar = useCallback(
    (cantidad: number, obs: string) => {
      if (!ordenSeleccionada) return

      const finTimestamp = new Date().toISOString()
      const durMin = Math.max(1, Math.round(segundos / 60))

      agregarRegistroTiempo({
        ordenId: ordenSeleccionada.id,
        centroTrabajoId: opActual?.centroTrabajoId ?? '',
        operario: ordenSeleccionada.operario ?? 'Operario',
        operacion: opActual?.nombre ?? ordenSeleccionada.operacionActual.nombre,
        fechaInicio: inicioTimestamp || finTimestamp,
        fechaFin: finTimestamp,
        duracionMin: durMin,
        cantidadProducida: cantidad,
        observaciones: obs,
        estado: 'FINALIZADO',
      })

      completarOperacion(ordenSeleccionada.id)
      setModalAbierto(false)
      setCorriendo(false)
      setSegundos(0)
      mostrarToast(
        `Operación completada — ${cantidad} und producidas. Inspección enviada a Calidad.`,
        'success'
      )
    },
    [ordenSeleccionada, completarOperacion, mostrarToast, segundos, inicioTimestamp, opActual, agregarRegistroTiempo]
  )

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader
        titulo="Registro de Tiempos"
        subtitulo={`Turno actual — ${fechaHoy}`}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 mb-6">
        {/* ── PUNCH CLOCK ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#E8EDF4] overflow-hidden">
          {/* Selector orden */}
          <div className="px-6 py-4 border-b border-[#E8EDF4] bg-[#F4F7FB]">
            <label className="block text-xs font-semibold text-[#5A6B85] uppercase tracking-wide mb-1.5">
              Orden de Producción
            </label>
            <div className="relative">
              <select
                value={ordenSelecId}
                onChange={(e) => {
                  setOrdenSelecId(e.target.value)
                  setCorriendo(false)
                  setSegundos(0)
                  setEnPausa(false)
                }}
                className="w-full appearance-none bg-white border border-[#E8EDF4] rounded-lg px-3 py-2.5 pr-8 text-sm font-semibold text-[#15233B] focus:outline-none focus:border-[#1F6CF0] focus:ring-2 focus:ring-[#EAF2FE] transition"
              >
                {ordenesEnProceso.length === 0 ? (
                  <option value="">Sin órdenes en proceso</option>
                ) : (
                  ordenesEnProceso.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.id} — {o.producto}
                    </option>
                  ))
                )}
              </select>
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5A6B85] pointer-events-none" />
            </div>
          </div>

          {/* Info operación */}
          {ordenSeleccionada ? (
            <div className="px-6 py-4 border-b border-[#E8EDF4]">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-[#5A6B85] font-medium">Operación Activa</p>
                  <p className="font-bold text-[#1F6CF0] mt-0.5">{ordenSeleccionada.operacionActual.nombre}</p>
                </div>
                <div>
                  <p className="text-xs text-[#5A6B85] font-medium">Centro de Trabajo</p>
                  <p className="font-semibold text-[#5A6B85] mt-0.5 text-xs">{centro?.nombre ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-[#5A6B85] font-medium">Tiempo Estimado</p>
                  <p className="font-semibold text-[#5A6B85] mt-0.5">
                    {opActual ? `${opActual.tiempoSetupMin + opActual.tiempoOperacionMin} min` : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#5A6B85] font-medium">Estado</p>
                  <div className="mt-0.5"><StatusBadge estado={ordenSeleccionada.estado} size="sm" /></div>
                </div>
              </div>
            </div>
          ) : (
            <div className="px-6 py-4 border-b border-[#E8EDF4] text-center text-sm text-[#5A6B85]">
              Sin orden seleccionada
            </div>
          )}

          {/* Cronómetro */}
          <div className="px-6 py-10 flex flex-col items-center gap-6">
            <div className={`
              relative w-52 h-52 rounded-full flex items-center justify-center
              border-8 transition-all duration-300
              ${corriendo && !enPausa
                ? 'border-[#1F6CF0] shadow-[0_0_40px_rgba(33,150,243,0.2)]'
                : corriendo && enPausa
                ? 'border-[#F59E0B]'
                : 'border-[#E8EDF4]'
              }
            `}>
              <div className="text-center">
                <p
                  className={`text-4xl font-bold font-mono tabular-nums transition-colors ${
                    corriendo && !enPausa ? 'text-[#1F6CF0]' :
                    corriendo && enPausa ? 'text-[#D97706]' :
                    'text-[#15233B]'
                  }`}
                >
                  {formatearCronometro(segundos)}
                </p>
                <p className="text-xs text-[#5A6B85] mt-1">
                  {corriendo && !enPausa ? 'En operación' :
                   corriendo && enPausa ? 'En pausa' :
                   'Detenido'}
                </p>
              </div>
              {corriendo && !enPausa && (
                <div className="absolute inset-0 rounded-full border-8 border-[#1F6CF0] opacity-20 animate-ping" />
              )}
            </div>

            <div className="flex gap-3 w-full max-w-xs">
              {!corriendo ? (
                <button
                  onClick={handleIniciar}
                  disabled={!ordenSeleccionada || ordenSeleccionada.estado !== 'EN_PROCESO'}
                  className="flex-1 flex items-center justify-center gap-2 bg-[#1F6CF0] text-white rounded-xl py-3.5 font-bold text-sm hover:bg-[#1557C9] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  <Play size={18} fill="white" />
                  Iniciar Operación
                </button>
              ) : (
                <>
                  <button
                    onClick={handlePausa}
                    className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-3.5 font-bold text-sm transition-all duration-200 shadow-sm ${
                      enPausa
                        ? 'bg-[#1F6CF0] text-white hover:bg-[#1557C9]'
                        : 'bg-[#F59E0B] text-white hover:bg-[#D97706]'
                    }`}
                  >
                    <Pause size={18} />
                    {enPausa ? 'Reanudar' : 'Pausa'}
                  </button>
                  <button
                    onClick={handleFinalizar}
                    className="flex-1 flex items-center justify-center gap-2 bg-[#16B364] text-white rounded-xl py-3.5 font-bold text-sm hover:bg-[#16B364] transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    <Square size={18} fill="white" />
                    Finalizar
                  </button>
                </>
              )}
            </div>

            {corriendo && enPausa && (
              <div className="flex items-center gap-2 text-xs text-[#D97706] bg-[#FEF3E2] border border-[#F59E0B]/20 rounded-lg px-3 py-2">
                <AlertCircle size={14} />
                Operación en pausa — registre la incidencia al reanudar
              </div>
            )}
          </div>
        </div>

        {/* ── PANEL LATERAL ORDEN ── */}
        {ordenSeleccionada ? (
          <div className="bg-white rounded-2xl border border-[#E8EDF4] p-5">
            <h3 className="text-xs font-semibold text-[#5A6B85] uppercase tracking-widest mb-4">
              Detalle de la Orden
            </h3>

            <div className="space-y-4">
              <div>
                <p className="text-xs text-[#5A6B85]">Producto</p>
                <p className="text-sm font-semibold text-[#15233B] mt-0.5">{ordenSeleccionada.producto}</p>
              </div>
              <div>
                <p className="text-xs text-[#5A6B85]">Lote</p>
                <p className="text-sm font-mono font-semibold text-[#5A6B85] mt-0.5">{ordenSeleccionada.loteId}</p>
              </div>
              <div>
                <p className="text-xs text-[#5A6B85] mb-1.5">Progreso</p>
                <div className="w-full bg-[#F4F7FB] rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-[#1F6CF0] transition-all duration-500"
                    style={{
                      width: `${Math.round((ordenSeleccionada.cantidadProducida / ordenSeleccionada.cantidadPlanificada) * 100)}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-[#5A6B85] mt-1 text-right">
                  {new Intl.NumberFormat('es-CO').format(ordenSeleccionada.cantidadProducida)}
                  {' / '}
                  {new Intl.NumberFormat('es-CO').format(ordenSeleccionada.cantidadPlanificada)} und
                </p>
              </div>

              {ruta && (
                <div>
                  <p className="text-xs text-[#5A6B85] mb-2">Ruta de Producción</p>
                  <div className="space-y-1.5">
                    {ruta.operaciones.map((op) => {
                      const esActual = op.orden === ordenSeleccionada.operacionActual.indice
                      const esCompletada = ordenSeleccionada.estado === 'COMPLETADA' || op.orden < ordenSeleccionada.operacionActual.indice
                      return (
                        <div
                          key={op.orden}
                          className={`flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-lg ${
                            esActual ? 'bg-[#EAF2FE] text-[#1557C9] font-semibold' :
                            esCompletada ? 'text-[#16B364]' :
                            'text-[#97A4B8]'
                          }`}
                        >
                          <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold border ${
                            esActual ? 'border-[#1F6CF0] text-[#1F6CF0]' :
                            esCompletada ? 'border-[#16B364] text-[#16B364]' :
                            'border-[#E8EDF4] text-[#97A4B8]'
                          }`}>
                            {op.orden}
                          </span>
                          {op.nombre}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-[#E8EDF4] p-5 flex items-center justify-center text-sm text-[#97A4B8]">
            Seleccione una orden para ver el detalle
          </div>
        )}
      </div>

      {/* Tabla registros */}
      <TablaRegistros
        registros={registrosTiempos}
        centros={centros}
        onEliminar={deleteRegistro}
      />

      <ModalFinalizar
        abierto={modalAbierto}
        segundos={segundos}
        onCancelar={() => setModalAbierto(false)}
        onConfirmar={handleConfirmarFinalizar}
      />

      <Toast {...toast} onClose={cerrarToast} />
    </div>
  )
}

'use client'

import { useState } from 'react'
import { useManufacturaContext } from '@/context/ManufacturaContext'
import type { Ruta } from '@/context/ManufacturaContext'
import { formatCOPCurrency } from '@/data/manufacturaData'
import PageHeader from '@/components/manufactura/PageHeader'
import StatusBadge from '@/components/manufactura/StatusBadge'
import SlideOver from '@/components/manufactura/SlideOver'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import RutaForm from '@/components/manufactura/RutaForm'
import Toast from '@/components/manufactura/Toast'
import { useToast } from '@/hooks/useToast'
import { GitBranch, Eye, Clock, Layers, Plus, Pencil, Trash2 } from 'lucide-react'

// ─── PANEL OPERACIONES ─────────────────────────────────────────────────────────

function PanelOperaciones({ ruta }: { ruta: Ruta }) {
  const { centros } = useManufacturaContext()
  const totalMin = ruta.operaciones.reduce(
    (s, o) => s + o.tiempoSetupMin + o.tiempoOperacionMin, 0
  )

  return (
    <div className="p-6 space-y-5">
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-xs text-[#5A6B85]">Producto</p>
          <p className="font-semibold text-[#5A6B85] mt-0.5">{ruta.producto}</p>
        </div>
        <div>
          <p className="text-xs text-[#5A6B85]">Versión</p>
          <p className="font-semibold text-[#5A6B85] mt-0.5">{ruta.version}</p>
        </div>
        <div>
          <p className="text-xs text-[#5A6B85]">Costo MO / hora</p>
          <p className="font-semibold text-[#1F6CF0] mt-0.5">{formatCOPCurrency(ruta.costoManoObraHora)}</p>
        </div>
        <div>
          <p className="text-xs text-[#5A6B85]">Tiempo total</p>
          <p className="font-semibold text-[#5A6B85] mt-0.5">
            {totalMin} min ({Math.floor(totalMin / 60)}h {totalMin % 60}min)
          </p>
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold text-[#5A6B85] uppercase tracking-widest mb-3">
          Secuencia de Operaciones
        </h3>
        <div className="rounded-xl border border-[#E8EDF4] overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-[#F7FAFD]">
              <tr>
                <th className="text-left px-4 py-2.5 text-[#5A6B85] font-semibold">#</th>
                <th className="text-left px-4 py-2.5 text-[#5A6B85] font-semibold">Operación</th>
                <th className="text-left px-4 py-2.5 text-[#5A6B85] font-semibold hidden sm:table-cell">Centro</th>
                <th className="text-right px-4 py-2.5 text-[#5A6B85] font-semibold">Setup</th>
                <th className="text-right px-4 py-2.5 text-[#5A6B85] font-semibold">Oper.</th>
                <th className="text-right px-4 py-2.5 text-[#5A6B85] font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {ruta.operaciones.map((op) => {
                const ct = centros.find((c) => c.id === op.centroTrabajoId)
                return (
                  <tr key={op.orden} className="border-t border-[#EEF2F8] hover:bg-[#F9FBFE]">
                    <td className="px-4 py-2.5">
                      <span className="w-5 h-5 rounded-full bg-[#EAF2FE] text-[#1557C9] font-bold text-[10px] flex items-center justify-center">
                        {op.orden}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-medium text-[#5A6B85]">{op.nombre}</td>
                    <td className="px-4 py-2.5 text-[#5A6B85] hidden sm:table-cell">{ct?.nombre ?? op.centroTrabajoId}</td>
                    <td className="px-4 py-2.5 text-right text-[#5A6B85]">{op.tiempoSetupMin} min</td>
                    <td className="px-4 py-2.5 text-right text-[#5A6B85]">{op.tiempoOperacionMin} min</td>
                    <td className="px-4 py-2.5 text-right font-bold text-[#15233B]">
                      {op.tiempoSetupMin + op.tiempoOperacionMin} min
                    </td>
                  </tr>
                )
              })}
              <tr className="border-t-2 border-[#E8EDF4] bg-[#F4F7FB]">
                <td colSpan={5} className="px-4 py-2.5 text-right font-bold text-[#5A6B85]">Total</td>
                <td className="px-4 py-2.5 text-right font-bold text-[#1F6CF0]">{totalMin} min</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── PÁGINA ───────────────────────────────────────────────────────────────────

export default function RutasPage() {
  const { rutas, crearRuta, editarRuta, eliminarRuta } = useManufacturaContext()
  const { toast, mostrarToast, cerrarToast } = useToast()

  const [rutaSeleccionada, setRutaSeleccionada] = useState<Ruta | null>(null)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [rutaEditar, setRutaEditar] = useState<Ruta | null>(null)
  const [confirmAbierto, setConfirmAbierto] = useState(false)
  const [rutaEliminar, setRutaEliminar] = useState<Ruta | null>(null)

  function abrirCrear() {
    setRutaEditar(null)
    setModalAbierto(true)
  }

  function abrirEditar(ruta: Ruta) {
    setRutaEditar(ruta)
    setModalAbierto(true)
  }

  function handleGuardar(data: Omit<Ruta, 'id'>) {
    if (rutaEditar) {
      editarRuta(rutaEditar.id, data)
      mostrarToast('Ruta actualizada correctamente', 'success')
    } else {
      crearRuta(data)
      mostrarToast('Ruta creada correctamente', 'success')
    }
    setModalAbierto(false)
  }

  function confirmarEliminar(ruta: Ruta) {
    setRutaEliminar(ruta)
    setConfirmAbierto(true)
  }

  function handleEliminar() {
    if (!rutaEliminar) return
    eliminarRuta(rutaEliminar.id)
    setConfirmAbierto(false)
    setRutaEliminar(null)
    mostrarToast('Ruta eliminada', 'success')
  }

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader titulo="Rutas de Producción" subtitulo="Configuración — Manufactura">
        <button
          onClick={abrirCrear}
          className="flex items-center gap-[7px] bg-[#1F6CF0] text-white rounded-[11px] px-[15px] py-[9px] text-[13px] font-semibold hover:bg-[#1557C9] transition-colors"
          style={{ boxShadow: '0 6px 16px -6px rgba(31,108,240,.5)' }}
        >
          <Plus size={15} />
          Nueva Ruta
        </button>
      </PageHeader>

      <div className="bg-white rounded-2xl border border-[#E8EDF4] overflow-hidden" style={{boxShadow:"0 1px 2px rgba(21,35,59,.03)"}}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F7FAFD]">
                {['ID', 'Nombre', 'Producto', 'Versión', '# Oper.', 'Tiempo Total', 'Costo MO/h', 'Estado', 'Acciones'].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-[10.5px] font-semibold text-[#5A6B85] uppercase tracking-[.05em]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rutas.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-[#97A4B8] text-sm">
                    No hay rutas configuradas. Crea la primera.
                  </td>
                </tr>
              ) : (
                rutas.map((ruta) => {
                  const totalMin = ruta.operaciones.reduce(
                    (s, o) => s + o.tiempoSetupMin + o.tiempoOperacionMin, 0
                  )
                  return (
                    <tr key={ruta.id} className="border-t border-[#EEF2F8] hover:bg-[#F9FBFE] transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <GitBranch size={14} className="text-[#1F6CF0] shrink-0" />
                          <span className="font-mono text-xs font-bold text-[#1F6CF0]">{ruta.id}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 font-medium text-[#5A6B85]">{ruta.nombre}</td>
                      <td className="px-5 py-3 text-[#5A6B85] text-xs">{ruta.producto}</td>
                      <td className="px-5 py-3">
                        <span className="bg-[#EAF2FE] text-[#0288D1] text-xs font-semibold px-2 py-0.5 rounded-full">
                          {ruta.version}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1.5 text-xs text-[#5A6B85]">
                          <Layers size={12} />
                          <span className="font-semibold">{ruta.operaciones.length}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1.5 text-xs text-[#5A6B85]">
                          <Clock size={12} />
                          {totalMin} min
                        </div>
                      </td>
                      <td className="px-5 py-3 text-xs font-semibold text-[#1F6CF0]">
                        {formatCOPCurrency(ruta.costoManoObraHora)}/h
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge estado={ruta.estado} size="sm" />
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setRutaSeleccionada(ruta)}
                            className="p-1.5 text-[#5A6B85] hover:text-[#1F6CF0] hover:bg-[#EAF2FE] rounded-lg transition-all"
                            title="Ver operaciones"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={() => abrirEditar(ruta)}
                            className="p-1.5 text-[#5A6B85] hover:text-[#6E56E0] hover:bg-[#F0ECFD] rounded-lg transition-all"
                            title="Editar"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => confirmarEliminar(ruta)}
                            className="p-1.5 text-[#5A6B85] hover:text-[#EF4444] hover:bg-[#FDECEC] rounded-lg transition-all"
                            title="Eliminar"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SlideOver detalle operaciones */}
      <SlideOver
        abierto={rutaSeleccionada !== null}
        onCerrar={() => setRutaSeleccionada(null)}
        titulo={rutaSeleccionada?.nombre ?? ''}
        subtitulo={`${rutaSeleccionada?.id} · ${rutaSeleccionada?.version}`}
        ancho="md"
      >
        {rutaSeleccionada && <PanelOperaciones ruta={rutaSeleccionada} />}
      </SlideOver>

      {/* Modal Crear/Editar */}
      <Modal
        abierto={modalAbierto}
        onCerrar={() => setModalAbierto(false)}
        titulo={rutaEditar ? `Editar Ruta — ${rutaEditar.id}` : 'Nueva Ruta de Producción'}
        subtitulo={rutaEditar ? rutaEditar.producto : 'Configure la secuencia de operaciones'}
        ancho="xl"
      >
        <RutaForm
          ruta={rutaEditar}
          onGuardar={handleGuardar}
          onCancelar={() => setModalAbierto(false)}
        />
      </Modal>

      {/* Confirm Eliminar */}
      <ConfirmDialog
        abierto={confirmAbierto}
        titulo="Eliminar Ruta"
        descripcion={`¿Eliminar la ruta "${rutaEliminar?.nombre}"? Esta acción no se puede deshacer.`}
        labelConfirmar="Eliminar"
        colorConfirmar="red"
        onCancelar={() => setConfirmAbierto(false)}
        onConfirmar={handleEliminar}
      />

      <Toast {...toast} onClose={cerrarToast} />
    </div>
  )
}

'use client'

import { useState } from 'react'
import { FileText, ChevronRight, CheckCircle2, AlertTriangle, Package, Clock, Layers, Plus, Pencil, Trash2 } from 'lucide-react'
import { useAppContext } from '@/context/AppContext'
import { useCalidadContext } from '@/context/CalidadContext'
import type { FichaTecnica } from '@/context/CalidadContext'
import PageHeader from '@/components/manufactura/PageHeader'
import SlideOver from '@/components/manufactura/SlideOver'
import StatusBadge from '@/components/manufactura/StatusBadge'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import FichaForm from '@/components/calidad/FichaForm'
import Toast from '@/components/manufactura/Toast'
import { useToast } from '@/hooks/useToast'

export default function FichasTecnicasPage() {
  const { ordenes } = useAppContext()
  const { fichasMutable, crearFicha, editarFicha, eliminarFicha } = useCalidadContext()
  const { toast, mostrarToast, cerrarToast } = useToast()

  const [seleccionada, setSeleccionada] = useState<FichaTecnica | null>(null)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [fichaEditar, setFichaEditar] = useState<FichaTecnica | null>(null)
  const [confirmAbierto, setConfirmAbierto] = useState(false)
  const [fichaEliminar, setFichaEliminar] = useState<FichaTecnica | null>(null)

  function ordenesConFicha(fichaId: string) {
    return ordenes.filter((o) => o.fichaTecnicaId === fichaId)
  }

  const totalParametros = fichasMutable.reduce((s, f) => s + f.criterios.length, 0)
  const totalCriticos = fichasMutable.reduce((s, f) => s + f.criterios.filter((c) => c.critico).length, 0)

  function abrirCrear() {
    setFichaEditar(null)
    setModalAbierto(true)
  }

  function abrirEditar(ficha: FichaTecnica) {
    setFichaEditar(ficha)
    setModalAbierto(true)
  }

  function handleGuardar(data: Omit<FichaTecnica, 'id'>) {
    if (fichaEditar) {
      editarFicha(fichaEditar.id, data)
      mostrarToast('Ficha actualizada correctamente', 'success')
    } else {
      crearFicha(data)
      mostrarToast('Ficha técnica creada', 'success')
    }
    setModalAbierto(false)
  }

  function confirmarEliminar(ficha: FichaTecnica) {
    setFichaEliminar(ficha)
    setConfirmAbierto(true)
  }

  function handleEliminar() {
    if (!fichaEliminar) return
    eliminarFicha(fichaEliminar.id)
    setConfirmAbierto(false)
    setFichaEliminar(null)
    mostrarToast('Ficha eliminada', 'success')
  }

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader
        titulo="Fichas Técnicas de Calidad"
        subtitulo="Especificaciones y parámetros de aceptación por producto — vinculadas a Manufactura"
      >
        <button
          onClick={abrirCrear}
          className="flex items-center gap-[7px] bg-[#16B364] text-white rounded-[11px] px-[15px] py-[9px] text-[13px] font-semibold hover:bg-[#12954F] transition-colors"
          style={{ boxShadow: '0 6px 16px -6px rgba(22,179,100,.5)' }}
        >
          <Plus size={15} />
          Nueva Ficha
        </button>
      </PageHeader>

      {/* KPI */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Fichas activas', value: fichasMutable.length, color: '#16B364', bg: '#E7F8EF', icon: FileText },
          { label: 'Total parámetros', value: totalParametros, color: '#1F6CF0', bg: '#EAF2FE', icon: Layers },
          { label: 'Parámetros críticos', value: totalCriticos, color: '#EF4444', bg: '#FDECEC', icon: AlertTriangle },
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

      {/* Lista de fichas */}
      <div className="space-y-4">
        {fichasMutable.map((ficha) => {
          const todasOrdenes = ordenesConFicha(ficha.id)
          const activas = todasOrdenes.filter((o) => o.estado === 'EN_PROCESO' || o.estado === 'PENDIENTE')
          const completadas = todasOrdenes.filter((o) => o.estado === 'COMPLETADA')
          const detenidas = todasOrdenes.filter((o) => o.estado === 'DETENIDA')
          const criticos = ficha.criterios.filter((c) => c.critico).length

          return (
            <div key={ficha.id} className="bg-white rounded-2xl border border-[#E8EDF4] overflow-hidden">
              <div className="flex items-start justify-between p-5">
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[#E7F8EF] flex items-center justify-center shrink-0 mt-0.5">
                    <FileText size={18} className="text-[#16B364]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <h3 className="text-sm font-bold text-[#15233B]">{ficha.producto}</h3>
                      <span className="text-[10px] text-[#97A4B8] font-mono">{ficha.id}</span>
                      <span className="text-[10px] bg-[#F4F7FB] text-[#5A6B85] px-2 py-0.5 rounded font-medium">{ficha.version}</span>
                    </div>
                    <div className="flex flex-wrap gap-4 text-xs text-[#5A6B85]">
                      <span className="flex items-center gap-1">
                        <Layers size={11} />
                        {ficha.criterios.length} parámetros
                        {criticos > 0 && (
                          <span className="text-[#EF4444] font-semibold ml-1">({criticos} críticos)</span>
                        )}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={11} /> {ficha.frecuenciaMuestreo}
                      </span>
                      <span className="flex items-center gap-1">
                        <Package size={11} /> Muestra: {ficha.tamanoMuestra} und
                      </span>
                      <span>AQL: {(ficha.nivelAceptableCalidad * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 ml-4 flex-wrap justify-end">
                  {activas.length > 0 && (
                    <span className="text-xs font-semibold bg-[#EAF2FE] text-[#1557C9] px-2.5 py-1 rounded-full">
                      {activas.length} activa{activas.length > 1 ? 's' : ''}
                    </span>
                  )}
                  {detenidas.length > 0 && (
                    <span className="text-xs font-semibold bg-[#FDECEC] text-[#DC2626] px-2.5 py-1 rounded-full">
                      {detenidas.length} detenida{detenidas.length > 1 ? 's' : ''}
                    </span>
                  )}
                  {completadas.length > 0 && (
                    <span className="text-xs font-semibold bg-[#E7F8EF] text-[#16B364] px-2.5 py-1 rounded-full">
                      {completadas.length} completada{completadas.length > 1 ? 's' : ''}
                    </span>
                  )}
                  <button
                    onClick={() => abrirEditar(ficha)}
                    className="p-1.5 rounded-lg text-[#97A4B8] hover:text-[#6E56E0] hover:bg-[#F0ECFD] transition-all"
                    title="Editar"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => confirmarEliminar(ficha)}
                    className="p-1.5 rounded-lg text-[#97A4B8] hover:text-[#EF4444] hover:bg-[#FDECEC] transition-all"
                    title="Eliminar"
                  >
                    <Trash2 size={14} />
                  </button>
                  <button
                    onClick={() => setSeleccionada(ficha)}
                    className="flex items-center gap-1 text-[#16B364] text-xs font-semibold transition-colors"
                  >
                    Ver criterios <ChevronRight size={14} />
                  </button>
                </div>
              </div>

              <div className="border-t border-[#F4F7FB] px-5 py-3">
                <div className="flex flex-wrap gap-2">
                  {ficha.criterios.slice(0, 3).map((c) => (
                    <div
                      key={c.parametro}
                      className="flex items-center gap-2 text-xs bg-[#F7FAFD] border border-[#E8EDF4] rounded-lg px-3 py-2"
                    >
                      {c.critico ? (
                        <AlertTriangle size={11} className="text-[#EF4444] shrink-0" />
                      ) : (
                        <CheckCircle2 size={11} className="text-[#16B364] shrink-0" />
                      )}
                      <span className="text-[#5A6B85]">{c.parametro}</span>
                      <span className="font-mono font-bold text-[#15233B]">
                        {c.valorNominal} <span className="text-[#97A4B8] font-normal">+/-{c.tolerancia}</span> {c.unidad}
                      </span>
                    </div>
                  ))}
                  {ficha.criterios.length > 3 && (
                    <button
                      onClick={() => setSeleccionada(ficha)}
                      className="text-xs text-[#97A4B8] hover:text-[#16B364] px-3 py-2 transition-colors"
                    >
                      +{ficha.criterios.length - 3} más...
                    </button>
                  )}
                </div>
              </div>

              {activas.length > 0 && (
                <div className="border-t border-[#F4F7FB] px-5 py-3 bg-[#F9FBFE]">
                  <p className="text-[10px] text-[#97A4B8] uppercase tracking-wide mb-2">
                    Órdenes activas en Manufactura
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {activas.map((o) => (
                      <div
                        key={o.id}
                        className="flex items-center gap-2 text-xs bg-white border border-[#E8EDF4] rounded-lg px-3 py-1.5"
                      >
                        <span className="font-mono font-bold text-[#1F6CF0]">{o.id}</span>
                        <span className="text-[#5A6B85]">{o.lineaProduccion}</span>
                        <StatusBadge estado={o.estado} size="sm" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
        {fichasMutable.length === 0 && (
          <div className="text-center py-16 text-[#97A4B8]">
            <FileText size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No hay fichas técnicas. Crea la primera.</p>
          </div>
        )}
      </div>

      {/* SlideOver detalle */}
      <SlideOver
        abierto={Boolean(seleccionada)}
        onCerrar={() => setSeleccionada(null)}
        titulo={seleccionada?.producto ?? ''}
        subtitulo={seleccionada ? `${seleccionada.id} · ${seleccionada.version}` : ''}
        ancho="lg"
      >
        {seleccionada && (
          <div className="space-y-6 p-6">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Frecuencia muestreo', value: seleccionada.frecuenciaMuestreo },
                { label: 'Tamaño muestra', value: `${seleccionada.tamanoMuestra} unidades` },
                { label: 'Nivel AQL', value: `${(seleccionada.nivelAceptableCalidad * 100).toFixed(1)}%` },
                { label: 'Versión ficha', value: seleccionada.version },
              ].map(({ label, value }) => (
                <div key={label} className="bg-[#F4F7FB] rounded-lg px-3 py-2.5">
                  <p className="text-[10px] text-[#97A4B8] uppercase tracking-wide mb-0.5">{label}</p>
                  <p className="text-sm font-semibold text-[#15233B]">{value}</p>
                </div>
              ))}
            </div>

            <div>
              <p className="text-xs font-semibold text-[#5A6B85] uppercase tracking-wide mb-3">
                Criterios de aceptación ({seleccionada.criterios.length} parámetros)
              </p>
              <div className="space-y-2">
                {seleccionada.criterios.map((c, i) => (
                  <div
                    key={c.parametro}
                    className={`flex items-center justify-between p-3 rounded-xl border ${
                      c.critico ? 'border-[#EF4444]/25 bg-[#FEF2F2]' : 'border-[#E8EDF4] bg-[#F7FAFD]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-5 h-5 rounded-full bg-[#F4F7FB] flex items-center justify-center text-[10px] font-bold text-[#5A6B85] shrink-0">
                        {i + 1}
                      </span>
                      <div>
                        <p className="text-xs font-semibold text-[#15233B]">{c.parametro}</p>
                        {c.critico && (
                          <p className="text-[10px] text-[#EF4444] font-bold flex items-center gap-1">
                            <AlertTriangle size={9} /> CRITICO
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm font-bold text-[#15233B]">
                        {c.valorNominal}{' '}
                        <span className="text-[#97A4B8] text-xs font-normal">+/- {c.tolerancia}</span>
                      </p>
                      <p className="text-[10px] text-[#97A4B8]">{c.unidad}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </SlideOver>

      {/* Modal Crear/Editar */}
      <Modal
        abierto={modalAbierto}
        onCerrar={() => setModalAbierto(false)}
        titulo={fichaEditar ? `Editar Ficha — ${fichaEditar.id}` : 'Nueva Ficha Técnica'}
        subtitulo={fichaEditar ? fichaEditar.producto : 'Configure los parámetros de calidad del producto'}
        ancho="lg"
      >
        <FichaForm
          ficha={fichaEditar}
          onGuardar={handleGuardar}
          onCancelar={() => setModalAbierto(false)}
        />
      </Modal>

      {/* Confirm Eliminar */}
      <ConfirmDialog
        abierto={confirmAbierto}
        titulo="Eliminar Ficha Técnica"
        descripcion={`¿Eliminar la ficha técnica de "${fichaEliminar?.producto}"? Esta acción no se puede deshacer.`}
        labelConfirmar="Eliminar"
        colorConfirmar="red"
        onCancelar={() => setConfirmAbierto(false)}
        onConfirmar={handleEliminar}
      />

      <Toast {...toast} onClose={cerrarToast} />
    </div>
  )
}

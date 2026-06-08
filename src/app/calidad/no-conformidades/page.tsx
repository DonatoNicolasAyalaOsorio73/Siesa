'use client'

import { useState, useEffect } from 'react'
import { AlertOctagon, AlertTriangle, Info, Plus, Clock, Trash2 } from 'lucide-react'
import { useCalidadContext, type NoConformidad } from '@/context/CalidadContext'
import { formatFechaCorta } from '@/lib/fecha'
import PageHeader from '@/components/manufactura/PageHeader'
import SlideOver from '@/components/manufactura/SlideOver'
import NCCard from '@/components/calidad/NCCard'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import NCManualForm from '@/components/calidad/NCManualForm'
import { useToast } from '@/hooks/useToast'
import Toast from '@/components/manufactura/Toast'
import { textareaClass } from '@/components/ui/FormField'

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const SEVERIDAD_CONFIG = {
  CRITICA: { color: '#EF4444', bg: '#FDECEC', label: 'Crítica', icon: AlertOctagon },
  MAYOR: { color: '#F59E0B', bg: '#FEF3E2', label: 'Mayor', icon: AlertTriangle },
  MENOR: { color: '#4C9FE6', bg: '#EAF2FE', label: 'Menor', icon: Info },
}

const ESTADO_CIERRE_OPTS: Array<{ value: 'ABIERTA' | 'EN_PROCESO' | 'CERRADA'; label: string }> = [
  { value: 'ABIERTA', label: 'Abierta' },
  { value: 'EN_PROCESO', label: 'En proceso' },
  { value: 'CERRADA', label: 'Cerrada' },
]

const formatFecha = formatFechaCorta

// ─── PÁGINA ───────────────────────────────────────────────────────────────────

export default function NoConformidadesPage() {
  const { noConformidades, agregarNotaNC, cambiarEstadoCierreNC, crearNCManual, editarAccionCorrectiva, eliminarNC } = useCalidadContext()
  const { toast, mostrarToast, cerrarToast } = useToast()

  const [seleccionada, setSeleccionada] = useState<NoConformidad | null>(null)
  const [nuevaNota, setNuevaNota] = useState('')
  const [filtroSev, setFiltroSev] = useState<'TODAS' | 'CRITICA' | 'MAYOR' | 'MENOR'>('TODAS')

  // Acción correctiva editable
  const [editandoAccion, setEditandoAccion] = useState(false)
  const [accionText, setAccionText] = useState('')

  // Modal crear NC
  const [modalAbierto, setModalAbierto] = useState(false)

  // Confirm eliminar
  const [confirmAbierto, setConfirmAbierto] = useState(false)
  const [ncEliminar, setNcEliminar] = useState<NoConformidad | null>(null)

  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const ncFiltradas = mounted ? noConformidades.filter((nc) => filtroSev === 'TODAS' || nc.severidad === filtroSev) : []

  const kpiCriticas = mounted ? noConformidades.filter((nc) => nc.severidad === 'CRITICA').length : 0
  const kpiAbiertas = mounted ? noConformidades.filter((nc) => nc.estadoCierre === 'ABIERTA').length : 0
  const kpiEnProceso = mounted ? noConformidades.filter((nc) => nc.estadoCierre === 'EN_PROCESO').length : 0

  function handleAgregarNota() {
    if (!seleccionada || !nuevaNota.trim()) return
    agregarNotaNC(seleccionada.id, nuevaNota.trim())
    setNuevaNota('')
    setSeleccionada((prev) =>
      prev
        ? { ...prev, notas: [...prev.notas, { texto: nuevaNota.trim(), fecha: new Date().toISOString() }] }
        : prev
    )
    mostrarToast('Nota agregada', 'success')
  }

  function handleCambiarEstado(estado: 'ABIERTA' | 'EN_PROCESO' | 'CERRADA') {
    if (!seleccionada) return
    cambiarEstadoCierreNC(seleccionada.id, estado)
    setSeleccionada((prev) => prev ? { ...prev, estadoCierre: estado } : prev)
    mostrarToast(`Estado actualizado: ${estado.toLowerCase().replace('_', ' ')}`, 'success')
  }

  function handleGuardarAccion() {
    if (!seleccionada) return
    editarAccionCorrectiva(seleccionada.id, accionText)
    setSeleccionada((prev) => prev ? { ...prev, accionCorrectiva: accionText } : prev)
    setEditandoAccion(false)
    mostrarToast('Acción correctiva actualizada', 'success')
  }

  function iniciarEdicionAccion() {
    setAccionText(seleccionada?.accionCorrectiva ?? '')
    setEditandoAccion(true)
  }

  function handleCrearNC(data: Omit<NoConformidad, 'id' | 'fecha' | 'estadoCierre' | 'notas'>) {
    crearNCManual(data)
    setModalAbierto(false)
    mostrarToast('No conformidad registrada', 'success')
  }

  function confirmarEliminar(nc: NoConformidad) {
    setNcEliminar(nc)
    setConfirmAbierto(true)
  }

  function handleEliminar() {
    if (!ncEliminar) return
    eliminarNC(ncEliminar.id)
    setConfirmAbierto(false)
    setNcEliminar(null)
    if (seleccionada?.id === ncEliminar.id) setSeleccionada(null)
    mostrarToast('No conformidad eliminada', 'success')
  }

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader titulo="No Conformidades" subtitulo="Gestión de incidencias y acciones correctivas — Calidad">
        <button
          onClick={() => setModalAbierto(true)}
          className="flex items-center gap-[7px] bg-[#EF4444] text-white rounded-[11px] px-[15px] py-[9px] text-[13px] font-semibold hover:bg-[#DC2626] transition-colors"
          style={{ boxShadow: '0 6px 16px -6px rgba(239,68,68,.5)' }}
        >
          <Plus size={15} />
          Nueva NC
        </button>
      </PageHeader>

      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Críticas', value: kpiCriticas, color: '#EF4444', bg: '#FDECEC', Icon: AlertOctagon },
          { label: 'Abiertas', value: kpiAbiertas, color: '#F59E0B', bg: '#FEF3E2', Icon: AlertTriangle },
          { label: 'En proceso', value: kpiEnProceso, color: '#1F6CF0', bg: '#EAF2FE', Icon: Clock },
        ].map(({ label, value, color, bg, Icon }) => (
          <div key={label} className="bg-white rounded-2xl border border-[#E8EDF4] p-5 flex items-center gap-4" style={{boxShadow:"0 1px 2px rgba(21,35,59,.03)"}}>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
              <Icon size={20} style={{ color }} />
            </div>
            <div>
              <p className="text-2xl font-bold" style={{ color }}>{value}</p>
              <p className="text-xs text-[#5A6B85] font-medium">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filtro severidad */}
      <div className="flex flex-wrap gap-2 mb-4">
        {(['TODAS', 'CRITICA', 'MAYOR', 'MENOR'] as const).map((s) => {
          const count = s === 'TODAS' ? noConformidades.length : noConformidades.filter((nc) => nc.severidad === s).length
          const cfg = s === 'TODAS' ? { color: '#5A6B85', bg: 'rgba(84,89,95,0.1)' } : { color: SEVERIDAD_CONFIG[s].color, bg: SEVERIDAD_CONFIG[s].bg }
          const active = filtroSev === s
          return (
            <button
              key={s}
              onClick={() => setFiltroSev(s)}
              className={`px-[13px] py-[8px] rounded-[10px] text-[12.5px] font-medium transition-all border ${active ? 'border-transparent text-white shadow-sm' : 'bg-white text-[#5A6B85] border-[#E8EDF4] hover:border-current'}`}
              style={active ? { background: cfg.color, borderColor: cfg.color } : {}}
            >
              {s === 'TODAS' ? 'Todas' : SEVERIDAD_CONFIG[s].label}
              <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${active ? 'bg-white/20' : 'bg-[#F4F7FB]'}`}>{count}</span>
            </button>
          )
        })}
      </div>

      {/* Grid de NC cards */}
      {ncFiltradas.length === 0 ? (
        <div className="text-center py-16 text-[#97A4B8]">
          <AlertTriangle size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No hay no conformidades registradas</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ncFiltradas.map((nc) => (
            <div key={nc.id} className="relative group">
              <NCCard
                id={nc.id}
                descripcion={nc.descripcion.slice(0, 80) + (nc.descripcion.length > 80 ? '…' : '')}
                severidad={nc.severidad}
                estado={nc.estadoCierre}
                loteId={nc.loteId}
                ordenId={nc.ordenId}
                fechaDeteccion={nc.fecha}
                defecto={nc.tipoDefecto}
                onClick={() => setSeleccionada(nc)}
              />
              <button
                onClick={(e) => { e.stopPropagation(); confirmarEliminar(nc) }}
                className="absolute top-2 right-2 p-1.5 rounded-lg bg-white border border-[#E8EDF4] text-[#97A4B8] hover:text-[#EF4444] hover:bg-[#FDECEC] opacity-0 group-hover:opacity-100 transition-all shadow-sm"
                title="Eliminar NC"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* SlideOver detalle NC */}
      <SlideOver
        abierto={Boolean(seleccionada)}
        onCerrar={() => { setSeleccionada(null); setEditandoAccion(false) }}
        titulo={seleccionada ? seleccionada.id : ''}
        subtitulo={seleccionada ? seleccionada.tipoDefecto : ''}
        ancho="lg"
      >
        {seleccionada && (() => {
          const cfg = SEVERIDAD_CONFIG[seleccionada.severidad]
          const Icon = cfg.icon
          return (
            <div className="space-y-5">
              <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: cfg.bg, border: `1px solid ${cfg.color}30` }}>
                <Icon size={18} style={{ color: cfg.color }} />
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide" style={{ color: cfg.color }}>{cfg.label}</p>
                  <p className="text-sm text-[#15233B] font-medium mt-0.5">{seleccionada.descripcion}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Orden', value: seleccionada.ordenId },
                  { label: 'Lote', value: seleccionada.loteId },
                  { label: 'Producto', value: seleccionada.producto },
                  { label: 'Línea', value: seleccionada.lineaProduccion },
                  { label: 'Inspector', value: seleccionada.inspector },
                  { label: 'Cantidad afectada', value: `${seleccionada.cantidadAfectada} unidades` },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-[#F4F7FB] rounded-lg px-3 py-2.5">
                    <p className="text-[10px] text-[#97A4B8] uppercase tracking-wide mb-0.5">{label}</p>
                    <p className="text-sm font-semibold text-[#15233B]">{value || '—'}</p>
                  </div>
                ))}
              </div>

              {/* Acción correctiva editable */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-[#5A6B85] uppercase tracking-wide">Acción correctiva</p>
                  {!editandoAccion && (
                    <button
                      onClick={iniciarEdicionAccion}
                      className="text-[11px] font-semibold text-[#1F6CF0] hover:text-[#1557C9] transition-colors"
                    >
                      Editar
                    </button>
                  )}
                </div>
                {editandoAccion ? (
                  <div className="space-y-2">
                    <textarea
                      className={textareaClass}
                      rows={4}
                      value={accionText}
                      onChange={(e) => setAccionText(e.target.value)}
                      placeholder="Descripción de la acción correctiva…"
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => setEditandoAccion(false)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#5A6B85] border border-[#E8EDF4] hover:bg-[#F9FBFE] transition-all"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleGuardarAccion}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#1F6CF0] hover:bg-[#1557C9] transition-all"
                      >
                        Guardar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-[#F4F7FB] border border-[#E8EDF4] text-sm text-[#5A6B85]">
                    {seleccionada.accionCorrectiva || <em className="text-[#97A4B8]">Pendiente de definir</em>}
                  </div>
                )}
              </div>

              {/* Estado cierre */}
              <div>
                <p className="text-xs font-semibold text-[#5A6B85] uppercase tracking-wide mb-2">Estado de cierre</p>
                <div className="flex gap-2">
                  {ESTADO_CIERRE_OPTS.map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => handleCambiarEstado(value)}
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all ${
                        seleccionada.estadoCierre === value
                          ? value === 'CERRADA'
                            ? 'bg-[#16B364] text-white border-[#16B364]'
                            : value === 'EN_PROCESO'
                            ? 'bg-[#F59E0B] text-white border-[#F59E0B]'
                            : 'bg-[#EF4444] text-white border-[#EF4444]'
                          : 'bg-white text-[#5A6B85] border-[#E8EDF4] hover:border-[#16B364]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Eliminar NC */}
              <div className="pt-2 border-t border-[#EEF2F8]">
                <button
                  onClick={() => confirmarEliminar(seleccionada)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-[#EF4444] hover:text-[#DC2626] transition-colors"
                >
                  <Trash2 size={13} />
                  Eliminar esta No Conformidad
                </button>
              </div>

              {/* Notas */}
              <div>
                <p className="text-xs font-semibold text-[#5A6B85] uppercase tracking-wide mb-2">
                  Notas ({seleccionada.notas.length})
                </p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {seleccionada.notas.length === 0 && (
                    <p className="text-xs text-[#97A4B8] italic p-3 bg-[#F4F7FB] rounded-lg">Sin notas</p>
                  )}
                  {seleccionada.notas.map((nota, i) => (
                    <div key={i} className="p-3 bg-[#F4F7FB] rounded-lg border border-[#E8EDF4]">
                      <p className="text-xs text-[#5A6B85]">{nota.texto}</p>
                      <p className="text-[10px] text-[#97A4B8] mt-1">{formatFecha(nota.fecha)}</p>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 mt-3">
                  <input
                    value={nuevaNota}
                    onChange={(e) => setNuevaNota(e.target.value)}
                    placeholder="Agregar nota de seguimiento…"
                    className="flex-1 rounded-lg border border-[#E8EDF4] px-3 py-2 text-xs outline-none focus:border-[#16B364] focus:ring-1 focus:ring-[#16B364]/30"
                    onKeyDown={(e) => e.key === 'Enter' && handleAgregarNota()}
                  />
                  <button
                    onClick={handleAgregarNota}
                    disabled={!nuevaNota.trim()}
                    className="px-3 py-2 rounded-lg bg-[#16B364] text-white text-xs font-semibold disabled:opacity-40 hover:bg-[#12954F] transition-colors flex items-center gap-1"
                  >
                    <Plus size={13} />
                    Agregar
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-1 text-[10px] text-[#97A4B8]">
                <Clock size={11} />
                <span>Detectada el {formatFecha(seleccionada.fecha)}</span>
              </div>
            </div>
          )
        })()}
      </SlideOver>

      {/* Modal Nueva NC */}
      <Modal
        abierto={modalAbierto}
        onCerrar={() => setModalAbierto(false)}
        titulo="Nueva No Conformidad"
        subtitulo="Registro manual de incidencia de calidad"
        ancho="lg"
      >
        <NCManualForm
          onGuardar={handleCrearNC}
          onCancelar={() => setModalAbierto(false)}
        />
      </Modal>

      {/* Confirm Eliminar */}
      <ConfirmDialog
        abierto={confirmAbierto}
        titulo="Eliminar No Conformidad"
        descripcion={`¿Eliminar la NC ${ncEliminar?.id}? Esta acción no se puede deshacer.`}
        labelConfirmar="Eliminar"
        colorConfirmar="red"
        onCancelar={() => setConfirmAbierto(false)}
        onConfirmar={handleEliminar}
      />

      <Toast {...toast} onClose={cerrarToast} />
    </div>
  )
}

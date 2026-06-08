'use client'

import { useState, useMemo, useEffect } from 'react'
import { useAppContext } from '@/context/AppContext'
import { simularTiempoTranscurrido } from '@/data/manufacturaData'
import { formatFechaCorta } from '@/lib/fecha'
import PageHeader from '@/components/manufactura/PageHeader'
import StatusBadge from '@/components/manufactura/StatusBadge'
import ProgressBar, { colorPorEstado } from '@/components/manufactura/ProgressBar'
import OperationStepper from '@/components/manufactura/OperationStepper'
import SlideOver from '@/components/manufactura/SlideOver'
import Toast from '@/components/manufactura/Toast'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import OrdenForm from '@/components/manufactura/OrdenForm'
import { useToast } from '@/hooks/useToast'
import { useManufacturaContext } from '@/context/ManufacturaContext'
import type { OrdenProduccion } from '@/context/AppContext'
import {
  Search, Plus, Eye, PlayCircle, StopCircle,
  AlertTriangle, Clock, User, Pencil, Trash2, Rocket,
} from 'lucide-react'

// ─── TIPOS DE FILTRO ──────────────────────────────────────────────────────────

type Filtro = 'TODAS' | 'EN_PROCESO' | 'COMPLETADA' | 'DETENIDA' | 'PENDIENTE'

const FILTROS: { key: Filtro; label: string }[] = [
  { key: 'TODAS', label: 'Todas' },
  { key: 'EN_PROCESO', label: 'En Proceso' },
  { key: 'COMPLETADA', label: 'Completada' },
  { key: 'DETENIDA', label: 'Detenida' },
  { key: 'PENDIENTE', label: 'Pendiente' },
]

const PRIORIDAD_DOT: Record<string, string> = {
  ALTA:  'bg-[#EF4444]',
  MEDIA: 'bg-[#F59E0B]',
  BAJA:  'bg-[#97A4B8]',
}

// ─── PANEL DE DETALLE ─────────────────────────────────────────────────────────

function DetalleOrden({
  orden,
  onCompletarOperacion,
}: {
  orden: OrdenProduccion
  onCompletarOperacion: () => void
}) {
  const { rutas } = useManufacturaContext()
  const ruta = rutas.find((r) => r.id === orden.rutaId)
  const pct = orden.cantidadPlanificada > 0
    ? Math.round((orden.cantidadProducida / orden.cantidadPlanificada) * 100)
    : 0

  const tiempoTranscurrido = simularTiempoTranscurrido(pct / 100)

  const tiempoRestante = (() => {
    if (!ruta) return '—'
    const totalMin = ruta.operaciones.reduce(
      (s, o) => s + o.tiempoSetupMin + o.tiempoOperacionMin, 0
    )
    const restanteMin = Math.round(((100 - pct) / 100) * totalMin)
    const h = Math.floor(restanteMin / 60)
    const m = restanteMin % 60
    return h > 0 ? `${h}h ${m}min` : `${m}min`
  })()

  const campoFila = (label: string, valor: React.ReactNode) => (
    <div>
      <dt className="text-xs text-[#5A6B85] font-medium">{label}</dt>
      <dd className="mt-0.5 text-sm text-[#5A6B85] font-semibold">{valor}</dd>
    </div>
  )

  return (
    <div className="flex flex-col h-full">
      <div className="grid grid-cols-3 gap-3 px-6 py-4 bg-[#F4F7FB] border-b border-[#E8EDF4]">
        <div className="text-center">
          <p className="text-2xl font-bold text-[#1F6CF0]">{pct}%</p>
          <p className="text-xs text-[#5A6B85]">Avance</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-[#15233B]">{tiempoTranscurrido}</p>
          <p className="text-xs text-[#5A6B85]">Transcurrido</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-[#F59E0B]">{tiempoRestante}</p>
          <p className="text-xs text-[#5A6B85]">Restante est.</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
        {ruta && (
          <section>
            <h3 className="text-xs font-semibold text-[#5A6B85] uppercase tracking-widest mb-3">
              Secuencia de Operaciones — {ruta.nombre}
            </h3>
            <OperationStepper
              operaciones={ruta.operaciones}
              indiceActual={orden.operacionActual.indice}
              estadoOrden={orden.estado}
            />
          </section>
        )}

        <section>
          <h3 className="text-xs font-semibold text-[#5A6B85] uppercase tracking-widest mb-3">
            Datos de la Orden
          </h3>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
            {campoFila('Lote', orden.loteId)}
            {campoFila('Línea', orden.lineaProduccion)}
            {campoFila('Operario', orden.operario)}
            {campoFila('Prioridad', <StatusBadge estado={orden.prioridad} size="sm" />)}
            {campoFila('Estado', <StatusBadge estado={orden.estado} size="sm" />)}
            {campoFila('Ruta', ruta?.nombre ?? orden.rutaId)}
            {campoFila('Inicio', formatFechaCorta(orden.fechaInicio))}
            {campoFila('Fin estimado', orden.fechaFin ? formatFechaCorta(orden.fechaFin) : '— En proceso')}
          </dl>
        </section>

        <section>
          <h3 className="text-xs font-semibold text-[#5A6B85] uppercase tracking-widest mb-3">
            Producción
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-[#5A6B85]">Producidas</span>
              <span className="font-bold text-[#15233B]">
                {new Intl.NumberFormat('es-CO').format(orden.cantidadProducida)}
                {' / '}
                {new Intl.NumberFormat('es-CO').format(orden.cantidadPlanificada)} und
              </span>
            </div>
            <ProgressBar
              valor={pct}
              color={colorPorEstado(orden.estado)}
              height="h-3"
              mostrarPorcentaje
            />
            {orden.cantidadRechazada > 0 && (
              <div className="flex items-center gap-2 text-sm text-[#DC2626]">
                <AlertTriangle size={14} />
                <span>{new Intl.NumberFormat('es-CO').format(orden.cantidadRechazada)} unidades rechazadas</span>
              </div>
            )}
          </div>
        </section>

        {ruta && (
          <section>
            <h3 className="text-xs font-semibold text-[#5A6B85] uppercase tracking-widest mb-3">
              Tiempos Planificados por Operación
            </h3>
            <div className="overflow-x-auto rounded-lg border border-[#E8EDF4]">
              <table className="w-full text-xs">
                <thead className="bg-[#F7FAFD]">
                  <tr>
                    <th className="text-left px-3 py-2 text-[#5A6B85] font-semibold">Operación</th>
                    <th className="text-right px-3 py-2 text-[#5A6B85] font-semibold">Setup (min)</th>
                    <th className="text-right px-3 py-2 text-[#5A6B85] font-semibold">Oper. (min)</th>
                    <th className="text-right px-3 py-2 text-[#5A6B85] font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {ruta.operaciones.map((op) => {
                    const estaCompletada =
                      orden.estado === 'COMPLETADA' || op.orden < orden.operacionActual.indice
                    return (
                      <tr
                        key={op.orden}
                        className={`border-t border-[#E8EDF4] ${estaCompletada ? 'bg-[#16B364]/5' : ''}`}
                      >
                        <td className="px-3 py-2 text-[#5A6B85]">{op.orden}. {op.nombre}</td>
                        <td className="px-3 py-2 text-right text-[#5A6B85]">{op.tiempoSetupMin}</td>
                        <td className="px-3 py-2 text-right text-[#5A6B85]">{op.tiempoOperacionMin}</td>
                        <td className="px-3 py-2 text-right font-semibold text-[#5A6B85]">
                          {op.tiempoSetupMin + op.tiempoOperacionMin}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>

      {orden.estado === 'EN_PROCESO' && (
        <div className="px-6 py-4 border-t border-[#E8EDF4] shrink-0">
          <button
            onClick={onCompletarOperacion}
            className="w-full bg-[#1F6CF0] text-white rounded-[11px] py-[9px] px-[15px] font-semibold text-[13px] hover:bg-[#1557C9] transition-colors flex items-center justify-center gap-2 shadow-[0_6px_16px_-6px_rgba(31,108,240,0.5)]"
          >
            <PlayCircle size={16} />
            Completar Operación Actual — {orden.operacionActual.nombre}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── PÁGINA PRINCIPAL ─────────────────────────────────────────────────────────

export default function OrdenesPage() {
  const { ordenes, completarOperacion, crearOrden, editarOrden, eliminarOrden, iniciarOrden } = useAppContext()
  const [filtroActivo, setFiltroActivo] = useState<Filtro>('TODAS')
  const [busqueda, setBusqueda] = useState('')
  const [ordenSeleccionada, setOrdenSeleccionada] = useState<OrdenProduccion | null>(null)
  const { toast, mostrarToast, cerrarToast } = useToast()

  // Modal crear/editar
  const [modalAbierto, setModalAbierto] = useState(false)
  const [ordenEditar, setOrdenEditar] = useState<OrdenProduccion | null>(null)

  // Confirm delete
  const [confirmAbierto, setConfirmAbierto] = useState(false)
  const [ordenEliminar, setOrdenEliminar] = useState<OrdenProduccion | null>(null)

  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const conteos = useMemo(() => ({
    TODAS:      mounted ? ordenes.length : 0,
    EN_PROCESO: mounted ? ordenes.filter((o) => o.estado === 'EN_PROCESO').length : 0,
    COMPLETADA: mounted ? ordenes.filter((o) => o.estado === 'COMPLETADA').length : 0,
    DETENIDA:   mounted ? ordenes.filter((o) => o.estado === 'DETENIDA').length : 0,
    PENDIENTE:  mounted ? ordenes.filter((o) => o.estado === 'PENDIENTE').length : 0,
  }), [ordenes, mounted])

  const ordenesFiltradas = useMemo(() => {
    if (!mounted) return []
    const busq = busqueda.toLowerCase()
    return ordenes
      .filter((o) => filtroActivo === 'TODAS' || o.estado === filtroActivo)
      .filter(
        (o) =>
          busq === '' ||
          o.id.toLowerCase().includes(busq) ||
          o.producto.toLowerCase().includes(busq) ||
          o.operario.toLowerCase().includes(busq)
      )
  }, [ordenes, filtroActivo, busqueda, mounted])

  const handleCompletarOperacion = (ordenId: string) => {
    completarOperacion(ordenId)
    setOrdenSeleccionada(null)
    mostrarToast('Operación completada — Inspección generada en Calidad', 'success')
  }

  function abrirCrear() {
    setOrdenEditar(null)
    setModalAbierto(true)
  }

  function abrirEditar(orden: OrdenProduccion) {
    setOrdenEditar(orden)
    setModalAbierto(true)
  }

  function handleGuardar(data: Partial<OrdenProduccion>) {
    if (ordenEditar) {
      editarOrden(ordenEditar.id, data)
      mostrarToast('Orden actualizada correctamente', 'success')
    } else {
      crearOrden(data as Omit<OrdenProduccion, 'id' | 'loteId' | 'cantidadProducida' | 'cantidadRechazada' | 'fechaFin' | 'operacionActual'>)
      mostrarToast('Orden creada correctamente', 'success')
    }
    setModalAbierto(false)
  }

  function confirmarEliminar(orden: OrdenProduccion) {
    setOrdenEliminar(orden)
    setConfirmAbierto(true)
  }

  function handleEliminar() {
    if (!ordenEliminar) return
    eliminarOrden(ordenEliminar.id)
    setConfirmAbierto(false)
    setOrdenEliminar(null)
    mostrarToast('Orden eliminada', 'success')
  }

  function handleIniciar(orden: OrdenProduccion) {
    iniciarOrden(orden.id)
    mostrarToast(`Orden ${orden.id} iniciada`, 'success')
  }

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        titulo="Órdenes de Producción"
        subtitulo="Control de Piso — Manufactura"
      >
        <button
          onClick={abrirCrear}
          className="flex items-center gap-[7px] bg-[#1F6CF0] text-white rounded-[11px] px-[15px] py-[9px] text-[13px] font-semibold hover:bg-[#1557C9] transition-colors"
          style={{ boxShadow: '0 6px 16px -6px rgba(31,108,240,.5)' }}
        >
          <Plus size={15} />
          Nueva Orden
        </button>
      </PageHeader>

      {/* Barra de filtros + búsqueda */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-5">
        <div className="flex flex-wrap gap-2 flex-1">
          {FILTROS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFiltroActivo(key)}
              className={`px-[13px] py-[8px] rounded-[10px] text-[12.5px] font-medium border transition-all duration-150 ${
                filtroActivo === key
                  ? 'bg-[#1F6CF0] border-[#1F6CF0] text-white shadow-sm'
                  : 'bg-white border-[#E8EDF4] text-[#5A6B85] hover:border-[#1F6CF0] hover:text-[#1F6CF0]'
              }`}
            >
              {label} ({conteos[key]})
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5A6B85]" />
          <input
            type="text"
            placeholder="Buscar por ID, producto u operario…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-[#E8EDF4] rounded-lg text-[#5A6B85] placeholder-[#97A4B8] focus:outline-none focus:border-[#1F6CF0] focus:ring-2 focus:ring-[#EAF2FE] transition"
          />
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl border border-[#E8EDF4] overflow-hidden" style={{boxShadow:"0 1px 2px rgba(21,35,59,.03)"}}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F7FAFD]">
                <th className="text-left px-5 py-3 text-[10.5px] font-semibold text-[#5A6B85] uppercase tracking-[.05em]">ID Orden</th>
                <th className="text-left px-4 py-3 text-[10.5px] font-semibold text-[#5A6B85] uppercase tracking-[.05em]">Producto</th>
                <th className="text-left px-4 py-3 text-[10.5px] font-semibold text-[#5A6B85] uppercase tracking-[.05em] hidden md:table-cell">Línea</th>
                <th className="text-left px-4 py-3 text-[10.5px] font-semibold text-[#5A6B85] uppercase tracking-[.05em] hidden lg:table-cell">Progreso</th>
                <th className="text-left px-4 py-3 text-[10.5px] font-semibold text-[#5A6B85] uppercase tracking-[.05em] hidden lg:table-cell">Operación</th>
                <th className="text-left px-4 py-3 text-[10.5px] font-semibold text-[#5A6B85] uppercase tracking-[.05em] hidden xl:table-cell">Operario</th>
                <th className="text-center px-4 py-3 text-[10.5px] font-semibold text-[#5A6B85] uppercase tracking-[.05em] hidden sm:table-cell">Prior.</th>
                <th className="text-center px-4 py-3 text-[10.5px] font-semibold text-[#5A6B85] uppercase tracking-[.05em]">Estado</th>
                <th className="text-center px-4 py-3 text-[10.5px] font-semibold text-[#5A6B85] uppercase tracking-[.05em]">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {ordenesFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-[#5A6B85] text-sm">
                    No hay órdenes que coincidan con los filtros aplicados
                  </td>
                </tr>
              ) : (
                ordenesFiltradas.map((orden) => {
                  const pct = orden.cantidadPlanificada > 0
                    ? Math.round((orden.cantidadProducida / orden.cantidadPlanificada) * 100)
                    : 0

                  return (
                    <tr
                      key={orden.id}
                      className="border-t border-[#EEF2F8] hover:bg-[#F9FBFE] transition-colors"
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${PRIORIDAD_DOT[orden.prioridad]}`} />
                          <span className="font-mono text-xs font-semibold text-[#1F6CF0]">{orden.id}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <span className="text-xs font-medium text-[#5A6B85] block truncate max-w-[140px]">
                          {orden.producto}
                        </span>
                      </td>

                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-xs text-[#5A6B85]">{orden.lineaProduccion}</span>
                      </td>

                      <td className="px-4 py-3 hidden lg:table-cell w-40">
                        <ProgressBar
                          valor={pct}
                          color={colorPorEstado(orden.estado)}
                          mostrarPorcentaje
                        />
                      </td>

                      <td className="px-4 py-3 hidden lg:table-cell">
                        <div className="text-xs">
                          <span className="text-[#5A6B85]">
                            {orden.operacionActual.indice}/{orden.operacionActual.total}
                          </span>
                          <span className="text-[#5A6B85] font-medium ml-1">
                            {orden.operacionActual.nombre}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3 hidden xl:table-cell">
                        <div className="flex items-center gap-1.5 text-xs text-[#5A6B85]">
                          <User size={12} className="shrink-0" />
                          {orden.operario}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-center hidden sm:table-cell">
                        <StatusBadge estado={orden.prioridad} size="sm" />
                      </td>

                      <td className="px-4 py-3 text-center">
                        <StatusBadge estado={orden.estado} size="sm" />
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setOrdenSeleccionada(orden)}
                            className="p-1.5 text-[#5A6B85] hover:text-[#1F6CF0] hover:bg-[#EAF2FE] rounded-lg transition-all"
                            title="Ver detalle"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={() => abrirEditar(orden)}
                            className="p-1.5 text-[#5A6B85] hover:text-[#6E56E0] hover:bg-[#F0ECFD] rounded-lg transition-all"
                            title="Editar orden"
                          >
                            <Pencil size={14} />
                          </button>
                          {orden.estado === 'PENDIENTE' && (
                            <button
                              onClick={() => handleIniciar(orden)}
                              className="p-1.5 text-[#5A6B85] hover:text-[#16B364] hover:bg-[#E7F8EF] rounded-lg transition-all"
                              title="Iniciar orden"
                            >
                              <Rocket size={14} />
                            </button>
                          )}
                          {orden.estado === 'EN_PROCESO' && (
                            <button
                              onClick={() => handleCompletarOperacion(orden.id)}
                              className="p-1.5 text-[#5A6B85] hover:text-[#16B364] hover:bg-[#E7F8EF] rounded-lg transition-all"
                              title="Completar operación"
                            >
                              <PlayCircle size={14} />
                            </button>
                          )}
                          <button
                            onClick={() => confirmarEliminar(orden)}
                            className="p-1.5 text-[#5A6B85] hover:text-[#EF4444] hover:bg-[#FDECEC] rounded-lg transition-all"
                            title="Eliminar orden"
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

        <div className="px-5 py-3 border-t border-[#E8EDF4] bg-[#F4F7FB] flex items-center justify-between">
          <span className="text-xs text-[#5A6B85]">
            Mostrando {ordenesFiltradas.length} de {ordenes.length} órdenes
          </span>
          <div className="flex items-center gap-1 text-xs text-[#5A6B85]">
            <Clock size={12} />
            Actualizado en tiempo real
          </div>
        </div>
      </div>

      {/* Slide-over detalle */}
      <SlideOver
        abierto={ordenSeleccionada !== null}
        onCerrar={() => setOrdenSeleccionada(null)}
        titulo={ordenSeleccionada?.id ?? ''}
        subtitulo={ordenSeleccionada?.producto}
        ancho="lg"
      >
        {ordenSeleccionada && (
          <DetalleOrden
            orden={ordenSeleccionada}
            onCompletarOperacion={() => handleCompletarOperacion(ordenSeleccionada.id)}
          />
        )}
      </SlideOver>

      {/* Modal Crear/Editar */}
      <Modal
        abierto={modalAbierto}
        onCerrar={() => setModalAbierto(false)}
        titulo={ordenEditar ? `Editar Orden — ${ordenEditar.id}` : 'Nueva Orden de Producción'}
        subtitulo={ordenEditar ? ordenEditar.producto : 'Complete los datos para crear una nueva orden'}
        ancho="lg"
      >
        <OrdenForm
          orden={ordenEditar}
          onGuardar={handleGuardar}
          onCancelar={() => setModalAbierto(false)}
        />
      </Modal>

      {/* Confirm Eliminar */}
      <ConfirmDialog
        abierto={confirmAbierto}
        titulo="Eliminar Orden"
        descripcion={`¿Estás seguro de que deseas eliminar la orden ${ordenEliminar?.id}? Esta acción no se puede deshacer.`}
        labelConfirmar="Eliminar"
        colorConfirmar="red"
        onCancelar={() => setConfirmAbierto(false)}
        onConfirmar={handleEliminar}
      />

      <Toast {...toast} onClose={cerrarToast} />
    </div>
  )
}

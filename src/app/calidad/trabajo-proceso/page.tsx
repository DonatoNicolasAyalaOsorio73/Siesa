'use client'

import { useMemo, useState, useEffect } from 'react'
import { RefreshCw, AlertTriangle, CheckCircle2, Clock, Settings, User, Activity, XCircle } from 'lucide-react'
import { useAppContext } from '@/context/AppContext'
import { useCalidadContext } from '@/context/CalidadContext'
import PageHeader from '@/components/manufactura/PageHeader'
import ProgressBar, { colorPorEstado } from '@/components/manufactura/ProgressBar'
import StatusBadge from '@/components/manufactura/StatusBadge'
import SlideOver from '@/components/manufactura/SlideOver'
import type { OrdenProduccion } from '@/context/AppContext'
import type { Inspeccion, NoConformidad } from '@/context/CalidadContext'

// ─── TIPOS ────────────────────────────────────────────────────────────────────

interface OrdenConCalidad {
  orden: OrdenProduccion
  inspecciones: Inspeccion[]
  noConformidades: NoConformidad[]
  inspeccionActiva: Inspeccion | null
  ncAbiertas: number
}

// ─── BADGE CALIDAD INLINE ─────────────────────────────────────────────────────

function BadgeCalidad({ item }: { item: OrdenConCalidad }) {
  const { inspeccionActiva, ncAbiertas, inspecciones } = item
  const aprobadas = inspecciones.filter((i) => i.estado === 'APROBADA').length
  const rechazadas = inspecciones.filter((i) => i.estado === 'RECHAZADA').length

  if (ncAbiertas > 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#FDECEC] text-[#DC2626] border border-[#EF4444]/20">
        <XCircle size={10} /> {ncAbiertas} NC{ncAbiertas > 1 ? 's' : ''}
      </span>
    )
  }
  if (inspeccionActiva) {
    if (inspeccionActiva.estado === 'PENDIENTE') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#FEF3E2] text-[#D97706] border border-[#F59E0B]/20">
          <Clock size={10} /> Insp. pendiente
        </span>
      )
    }
    if (inspeccionActiva.estado === 'EN_PROCESO') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#EAF2FE] text-[#1557C9] border border-[#1F6CF0]/20">
          <Activity size={10} /> Insp. en proceso
        </span>
      )
    }
  }
  if (aprobadas > 0 && rechazadas === 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#E7F8EF] text-[#16B364] border border-[#16B364]/20">
        <CheckCircle2 size={10} /> Calidad OK
      </span>
    )
  }
  if (inspecciones.length === 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#F4F7FB] text-[#97A4B8] border border-[#E8EDF4]">
        Sin inspección
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#F4F7FB] text-[#5A6B85] border border-[#E8EDF4]">
      {inspecciones.length} insp.
    </span>
  )
}

// ─── PÁGINA ───────────────────────────────────────────────────────────────────

export default function TrabajoProcesoCPage() {
  const { ordenes, ordenesConInspeccionPendiente, completarOperacion, cargando } = useAppContext()
  const { inspecciones, noConformidades, cargando: cargandoCalidad } = useCalidadContext()
  const [filtroEstado, setFiltroEstado] = useState<'TODOS' | OrdenProduccion['estado']>('TODOS')
  const [seleccionada, setSeleccionada] = useState<OrdenConCalidad | null>(null)
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // Solo órdenes activas (no COMPLETADA) que requieren inspección.
  // Las COMPLETADA ya pasaron a Entregas de Producto Terminado.
  const inspeccionPendienteEnVista = ordenesConInspeccionPendiente.filter(
    (id) => ordenes.some((o) => o.id === id && o.estado !== 'COMPLETADA')
  )
  const completadasConInspeccion = ordenesConInspeccionPendiente.filter(
    (id) => ordenes.some((o) => o.id === id && o.estado === 'COMPLETADA')
  ).length

  // Cruzar órdenes con inspecciones y NCs
  const ordenesConCalidad = useMemo<OrdenConCalidad[]>(() => {
    return ordenes
      .filter((o) => o.estado !== 'COMPLETADA')
      .map((orden) => {
        const insOrden = inspecciones.filter((i) => i.ordenId === orden.id)
        const ncsOrden = noConformidades.filter((nc) => nc.ordenId === orden.id)
        const ncAbiertas = ncsOrden.filter((nc) => nc.estadoCierre !== 'CERRADA').length

        const inspeccionActiva =
          insOrden.find((i) => i.estado === 'PENDIENTE' || i.estado === 'EN_PROCESO') ?? null

        return {
          orden,
          inspecciones: insOrden,
          noConformidades: ncsOrden,
          inspeccionActiva,
          ncAbiertas,
        }
      })
      .sort((a, b) => {
        // Primero detenidas con NC, luego por estado
        if (a.ncAbiertas > 0 && b.ncAbiertas === 0) return -1
        if (a.ncAbiertas === 0 && b.ncAbiertas > 0) return 1
        const priority: Record<string, number> = { DETENIDA: 0, EN_PROCESO: 1, PENDIENTE: 2 }
        return (priority[a.orden.estado] ?? 3) - (priority[b.orden.estado] ?? 3)
      })
  }, [ordenes, inspecciones, noConformidades])

  const filtradas = ordenesConCalidad.filter(
    (e) => filtroEstado === 'TODOS' || e.orden.estado === filtroEstado
  )

  const enProceso = ordenesConCalidad.filter((e) => e.orden.estado === 'EN_PROCESO').length
  const pendientes = ordenesConCalidad.filter((e) => e.orden.estado === 'PENDIENTE').length
  const detenidas = ordenesConCalidad.filter((e) => e.orden.estado === 'DETENIDA').length
  const conNC = ordenesConCalidad.filter((e) => e.ncAbiertas > 0).length

  const cargandoTodo = !mounted || cargando || cargandoCalidad

  if (cargandoTodo) {
    return (
      <div className="max-w-6xl mx-auto">
        <PageHeader titulo="Trabajo en Proceso" subtitulo="Vista integrada Manufactura + Calidad — todas las órdenes activas con su estado de calidad" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-[#E8EDF4] shadow-sm p-4 h-20 animate-pulse">
              <div className="h-4 bg-[#F4F7FB] rounded w-1/2 mb-2" />
              <div className="h-6 bg-[#F4F7FB] rounded w-1/3" />
            </div>
          ))}
        </div>
        <div className="bg-white rounded-2xl border border-[#E8EDF4] p-8 text-center">
          <RefreshCw size={28} className="mx-auto mb-3 text-[#97A4B8] animate-spin" />
          <p className="text-sm text-[#5A6B85]">Cargando órdenes desde Sheets…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader
        titulo="Trabajo en Proceso"
        subtitulo="Vista integrada Manufactura + Calidad — todas las órdenes activas con su estado de calidad"
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'En proceso', value: enProceso, color: '#1F6CF0', bg: '#EAF2FE', icon: Activity },
          { label: 'Pendientes', value: pendientes, color: '#F59E0B', bg: '#FEF3E2', icon: Clock },
          { label: 'Detenidas', value: detenidas, color: '#EF4444', bg: '#FDECEC', icon: RefreshCw },
          { label: 'Con NCs abiertas', value: conNC, color: conNC > 0 ? '#EF4444' : '#16B364', bg: '#FDECEC', icon: AlertTriangle },
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

      {/* Alerta inspecciones pendientes — solo órdenes activas en esta vista */}
      {inspeccionPendienteEnVista.length > 0 && (
        <div className="mb-4 flex items-start gap-3 bg-[#FFF7ED] border border-[#F59E0B]/25 rounded-xl p-4">
          <AlertTriangle size={16} className="text-[#F59E0B] shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-[#D97706]">
              {inspeccionPendienteEnVista.length} inspección{inspeccionPendienteEnVista.length > 1 ? 'es' : ''} pendiente{inspeccionPendienteEnVista.length > 1 ? 's' : ''}
            </p>
            <p className="text-xs text-[#5A6B85] mt-0.5">
              Órdenes activas que esperan revisión de Calidad:{' '}
              {inspeccionPendienteEnVista.join(', ')}
            </p>
            {completadasConInspeccion > 0 && (
              <p className="text-xs text-[#97A4B8] mt-1">
                +{completadasConInspeccion} orden{completadasConInspeccion > 1 ? 'es completadas' : ' completada'} pendiente{completadasConInspeccion > 1 ? 's' : ''} de inspección → ver en <span className="font-semibold">Entregas</span>
              </p>
            )}
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {[
          { key: 'TODOS', label: 'Todos' },
          { key: 'EN_PROCESO', label: 'En proceso' },
          { key: 'PENDIENTE', label: 'Pendiente' },
          { key: 'DETENIDA', label: 'Detenida' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFiltroEstado(key as typeof filtroEstado)}
            className={`px-[13px] py-[8px] rounded-[10px] text-[12.5px] font-medium transition-all border ${
              filtroEstado === key
                ? 'bg-[#16B364] text-white border-[#16B364]'
                : 'bg-white text-[#5A6B85] border-[#E8EDF4] hover:border-[#16B364]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tabla principal */}
      <div className="bg-white rounded-2xl border border-[#E8EDF4] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[#F7FAFD] border-b border-[#E8EDF4]">
                {['Orden', 'Producto / Línea', 'Operación actual', 'Progreso Manufactura', 'Estado Calidad', 'Estado', ''].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-[#5A6B85] font-semibold uppercase tracking-wide text-[10px]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtradas.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-[#97A4B8]">
                    <RefreshCw size={36} className="mx-auto mb-2 opacity-20" />
                    <p>No hay órdenes activas para los filtros seleccionados</p>
                  </td>
                </tr>
              )}
              {filtradas.map((item) => {
                const { orden } = item
                const pct =
                  orden.cantidadPlanificada > 0
                    ? Math.round((orden.cantidadProducida / orden.cantidadPlanificada) * 100)
                    : 0
                const esDetenida = orden.estado === 'DETENIDA'

                return (
                  <tr
                    key={orden.id}
                    className={`border-b border-[#EEF2F8] transition-colors ${
                      esDetenida ? 'bg-[#FEF2F2]' : 'hover:bg-[#F9FBFE]'
                    }`}
                  >
                    <td className="px-5 py-4">
                      <p className="font-mono font-bold text-[#1F6CF0]">{orden.id}</p>
                      <p className="text-[#97A4B8] font-mono text-[10px]">{orden.loteId}</p>
                    </td>
                    <td className="px-5 py-4 max-w-[200px]">
                      <p className="font-medium text-[#15233B] truncate">{orden.producto}</p>
                      <p className="text-[#5A6B85]">{orden.lineaProduccion}</p>
                    </td>
                    <td className="px-5 py-4 text-[#5A6B85]">
                      <div className="flex items-center gap-1.5">
                        <Settings size={11} className="text-[#97A4B8] shrink-0" />
                        <span>{orden.operacionActual?.nombre ?? '—'}</span>
                        <span className="text-[#97A4B8]">
                          ({orden.operacionActual?.indice ?? 0}/{orden.operacionActual?.total ?? 1})
                        </span>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5 text-[#97A4B8]">
                        <User size={10} className="shrink-0" />
                        <span className="text-[10px]">{orden.operario}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 min-w-[140px]">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-[11px]" style={{ color: colorPorEstado(orden.estado) }}>
                          {pct}%
                        </span>
                        <span className="text-[#97A4B8] text-[10px]">
                          {new Intl.NumberFormat('es-CO').format(orden.cantidadProducida)}/
                          {new Intl.NumberFormat('es-CO').format(orden.cantidadPlanificada)}
                        </span>
                      </div>
                      <ProgressBar valor={pct} color={colorPorEstado(orden.estado)} height="h-1.5" />
                    </td>
                    <td className="px-5 py-4">
                      <BadgeCalidad item={item} />
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge estado={orden.estado} size="sm" />
                    </td>
                    <td className="px-5 py-4">
                      <button
                        onClick={() => setSeleccionada(item)}
                        className="text-[#16B364] hover:text-[#16B364] font-semibold transition-colors text-[11px]"
                      >
                        Ver →
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* SlideOver detalle integrado */}
      <SlideOver
        abierto={Boolean(seleccionada)}
        onCerrar={() => setSeleccionada(null)}
        titulo={seleccionada?.orden.id ?? ''}
        subtitulo={seleccionada ? `${seleccionada.orden.producto} · ${seleccionada.orden.lineaProduccion}` : ''}
        ancho="lg"
      >
        {seleccionada && (
          <div className="space-y-6">
            {/* Resumen estados */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[#F4F7FB] rounded-xl px-3 py-3 text-center">
                <p className="text-lg font-bold text-[#1F6CF0]">
                  {seleccionada.orden.cantidadPlanificada > 0
                    ? Math.round((seleccionada.orden.cantidadProducida / seleccionada.orden.cantidadPlanificada) * 100)
                    : 0}%
                </p>
                <p className="text-[10px] text-[#5A6B85]">Progreso manufactura</p>
              </div>
              <div className="bg-[#F4F7FB] rounded-xl px-3 py-3 text-center">
                <p className="text-lg font-bold text-[#16B364]">{seleccionada.inspecciones.length}</p>
                <p className="text-[10px] text-[#5A6B85]">Inspecciones</p>
              </div>
              <div className="bg-[#F4F7FB] rounded-xl px-3 py-3 text-center">
                <p className={`text-lg font-bold ${seleccionada.ncAbiertas > 0 ? 'text-[#EF4444]' : 'text-[#16B364]'}`}>
                  {seleccionada.ncAbiertas}
                </p>
                <p className="text-[10px] text-[#5A6B85]">NCs abiertas</p>
              </div>
            </div>

            {/* Datos manufactura */}
            <div>
              <p className="text-[10px] text-[#97A4B8] uppercase tracking-wide mb-3">Manufactura</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Operación actual', value: seleccionada.orden.operacionActual?.nombre ?? '—' },
                  { label: 'Operario', value: seleccionada.orden.operario },
                  { label: 'Producidas', value: `${new Intl.NumberFormat('es-CO').format(seleccionada.orden.cantidadProducida)} und` },
                  { label: 'Rechazadas', value: `${seleccionada.orden.cantidadRechazada} und` },
                  { label: 'Estado', value: seleccionada.orden.estado },
                  { label: 'Prioridad', value: seleccionada.orden.prioridad },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-[#F4F7FB] rounded-lg px-3 py-2.5">
                    <p className="text-[10px] text-[#97A4B8] uppercase tracking-wide mb-0.5">{label}</p>
                    <p className="text-xs font-semibold text-[#15233B]">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Inspecciones de Calidad */}
            {seleccionada.inspecciones.length > 0 ? (
              <div>
                <p className="text-[10px] text-[#97A4B8] uppercase tracking-wide mb-3">
                  Inspecciones de Calidad ({seleccionada.inspecciones.length})
                </p>
                <div className="space-y-2">
                  {seleccionada.inspecciones.map((ins) => (
                    <div key={ins.id} className="flex items-center justify-between p-3 bg-[#F7FAFD] border border-[#E8EDF4] rounded-lg">
                      <div>
                        <p className="text-xs font-bold text-[#4C9FE6] font-mono">{ins.id}</p>
                        <p className="text-[10px] text-[#5A6B85]">
                          Inspector: {ins.inspector ?? 'Sin asignar'} · {ins.resultados.length} parámetros
                        </p>
                      </div>
                      <StatusBadge estado={ins.estado} size="sm" />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-dashed border-[#E8EDF4] text-center">
                <CheckCircle2 size={20} className="mx-auto mb-1 text-[#D1D5DB]" />
                <p className="text-xs text-[#97A4B8]">Sin inspecciones de Calidad registradas</p>
              </div>
            )}

            {/* No Conformidades */}
            {seleccionada.noConformidades.length > 0 && (
              <div>
                <p className="text-[10px] text-[#97A4B8] uppercase tracking-wide mb-3">
                  No Conformidades ({seleccionada.noConformidades.length})
                </p>
                <div className="space-y-2">
                  {seleccionada.noConformidades.map((nc) => (
                    <div
                      key={nc.id}
                      className={`p-3 rounded-lg border ${
                        nc.estadoCierre !== 'CERRADA'
                          ? 'border-[#EF4444]/20 bg-[#FEF2F2]'
                          : 'border-[#E8EDF4] bg-[#F7FAFD]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-bold text-[#15233B]">{nc.tipoDefecto}</p>
                          <p className="text-[10px] text-[#5A6B85] mt-0.5">{nc.descripcion}</p>
                          <p className="text-[10px] text-[#97A4B8]">
                            {nc.cantidadAfectada} und afectadas · {nc.inspector}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              nc.severidad === 'CRITICA'
                                ? 'bg-[#FDECEC] text-[#DC2626]'
                                : nc.severidad === 'MAYOR'
                                ? 'bg-[#FEF3E2] text-[#D97706]'
                                : 'bg-[#F4F7FB] text-[#5A6B85]'
                            }`}
                          >
                            {nc.severidad}
                          </span>
                          <p className="text-[10px] text-[#97A4B8] mt-1">{nc.estadoCierre}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Acción: completar operación si aplica */}
            {seleccionada.orden.estado === 'EN_PROCESO' && seleccionada.ncAbiertas === 0 && (
              <div className="pt-2 border-t border-[#E8EDF4]">
                <button
                  onClick={() => {
                    completarOperacion(seleccionada.orden.id)
                    setSeleccionada(null)
                  }}
                  className="w-full py-2.5 bg-[#1F6CF0] text-white rounded-xl text-sm font-semibold hover:bg-[#1557C9] transition-colors"
                >
                  Completar operación actual
                </button>
              </div>
            )}
          </div>
        )}
      </SlideOver>
    </div>
  )
}

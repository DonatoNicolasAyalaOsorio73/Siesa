'use client'

import { useMemo, useState, useEffect } from 'react'
import { CheckCircle2, XCircle, Clock, Package, Truck, ShieldCheck, AlertTriangle, Search } from 'lucide-react'
import { useAppContext } from '@/context/AppContext'
import { useCalidadContext } from '@/context/CalidadContext'
import PageHeader from '@/components/manufactura/PageHeader'
import StatusBadge from '@/components/manufactura/StatusBadge'
import SlideOver from '@/components/manufactura/SlideOver'
import { formatFechaCorta } from '@/lib/fecha'
import type { OrdenProduccion } from '@/context/AppContext'
import type { Inspeccion } from '@/context/CalidadContext'

// ─── TIPOS ────────────────────────────────────────────────────────────────────

type EstadoLiberacion = 'LIBERADO' | 'RECHAZADO' | 'PENDIENTE_CALIDAD'

interface EntregaConCalidad {
  orden: OrdenProduccion
  inspeccion: Inspeccion | null
  estadoLiberacion: EstadoLiberacion
  fechaLiberacion: string | null
  inspector: string | null
}

// ─── BADGE LIBERACIÓN ─────────────────────────────────────────────────────────

function BadgeLiberacion({ estado }: { estado: EstadoLiberacion }) {
  if (estado === 'LIBERADO') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#E7F8EF] text-[#16B364] border border-[#16B364]/20">
        <ShieldCheck size={10} /> LIBERADO
      </span>
    )
  }
  if (estado === 'RECHAZADO') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#FDECEC] text-[#DC2626] border border-[#EF4444]/20">
        <XCircle size={10} /> RECHAZADO
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#FEF3E2] text-[#D97706] border border-[#F59E0B]/20">
      <Clock size={10} /> PENDIENTE CALIDAD
    </span>
  )
}

// ─── FORMATO FECHA ────────────────────────────────────────────────────────────

const formatFecha = formatFechaCorta

// ─── PÁGINA ───────────────────────────────────────────────────────────────────

export default function EntregasProductoPage() {
  const { ordenes } = useAppContext()
  const { inspecciones } = useCalidadContext()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<'TODOS' | EstadoLiberacion>('TODOS')
  const [seleccionada, setSeleccionada] = useState<EntregaConCalidad | null>(null)

  // Solo órdenes completadas (producción terminada)
  const entregas = useMemo<EntregaConCalidad[]>(() => {
    if (!mounted) return []
    const completadas = ordenes.filter((o) => o.estado === 'COMPLETADA')

    return completadas.map((orden) => {
      // Buscar la inspección más reciente para esta orden
      const insOrden = inspecciones
        .filter((i) => i.ordenId === orden.id)
        .sort((a, b) => new Date(b.fechaDisparo).getTime() - new Date(a.fechaDisparo).getTime())

      const inspeccion = insOrden[0] ?? null

      let estadoLiberacion: EstadoLiberacion = 'PENDIENTE_CALIDAD'
      let fechaLiberacion: string | null = null
      let inspector: string | null = null

      if (inspeccion) {
        inspector = inspeccion.inspector
        if (inspeccion.estado === 'APROBADA') {
          estadoLiberacion = 'LIBERADO'
          fechaLiberacion = inspeccion.fechaDisparo
        } else if (inspeccion.estado === 'RECHAZADA') {
          estadoLiberacion = 'RECHAZADO'
          fechaLiberacion = inspeccion.fechaDisparo
        }
      }

      return { orden, inspeccion, estadoLiberacion, fechaLiberacion, inspector }
    })
  }, [ordenes, inspecciones, mounted])

  const filtradas = entregas.filter((e) => {
    const okEstado = filtroEstado === 'TODOS' || e.estadoLiberacion === filtroEstado
    const okBusqueda =
      !busqueda ||
      e.orden.id.toLowerCase().includes(busqueda.toLowerCase()) ||
      e.orden.producto.toLowerCase().includes(busqueda.toLowerCase()) ||
      e.orden.loteId.toLowerCase().includes(busqueda.toLowerCase())
    return okEstado && okBusqueda
  })

  const liberadas = entregas.filter((e) => e.estadoLiberacion === 'LIBERADO').length
  const rechazadas = entregas.filter((e) => e.estadoLiberacion === 'RECHAZADO').length
  const pendientes = entregas.filter((e) => e.estadoLiberacion === 'PENDIENTE_CALIDAD').length
  const totalUnidades = entregas.reduce((s, e) => s + e.orden.cantidadPlanificada, 0)

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader
        titulo="Entregas de Producto Terminado"
        subtitulo="Órdenes completadas en Manufactura — estado de liberación por Calidad"
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total entregadas', value: entregas.length, sub: 'órdenes', color: '#1F6CF0', bg: '#EAF2FE', icon: Package },
          { label: 'Liberadas', value: liberadas, sub: 'por Calidad', color: '#16B364', bg: '#E7F8EF', icon: ShieldCheck },
          { label: 'Rechazadas', value: rechazadas, sub: 'requieren acción', color: '#EF4444', bg: '#FDECEC', icon: XCircle },
          { label: 'Pendiente calidad', value: pendientes, sub: 'sin inspección', color: '#F59E0B', bg: '#FEF3E2', icon: Clock },
        ].map(({ label, value, sub, color, bg, icon: Icon }) => (
          <div key={label} className="bg-white rounded-xl border border-[#E8EDF4] shadow-sm p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: bg }}>
              <Icon size={18} style={{ color }} />
            </div>
            <div>
              <p className="text-xl font-bold leading-none" style={{ color }}>{value}</p>
              <p className="text-[11px] text-[#5A6B85] font-medium">{label}</p>
              <p className="text-[10px] text-[#97A4B8]">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Alerta si hay rechazadas */}
      {rechazadas > 0 && (
        <div className="mb-4 flex items-start gap-3 bg-[#FEF2F2] border border-[#EF4444]/20 rounded-xl p-4">
          <AlertTriangle size={16} className="text-[#EF4444] shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-[#DC2626]">
              {rechazadas} orden{rechazadas > 1 ? 'es' : ''} rechazada{rechazadas > 1 ? 's' : ''} por Calidad
            </p>
            <p className="text-xs text-[#5A6B85] mt-0.5">
              Estas órdenes completadas en Manufactura no pasaron la inspección de Calidad. Se requiere revisión o reproceso.
            </p>
          </div>
        </div>
      )}

      {/* Filtros y búsqueda */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex gap-2">
          {[
            { key: 'TODOS', label: 'Todos' },
            { key: 'LIBERADO', label: 'Liberados' },
            { key: 'RECHAZADO', label: 'Rechazados' },
            { key: 'PENDIENTE_CALIDAD', label: 'Pendientes' },
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
        <div className="relative ml-auto">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#97A4B8]" />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar orden, producto, lote…"
            className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[#E8EDF4] bg-white outline-none focus:border-[#16B364] w-52"
          />
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl border border-[#E8EDF4] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[#F7FAFD] border-b border-[#E8EDF4]">
                {['Orden / Lote', 'Producto', 'Línea', 'Cantidad', 'Completada', 'Inspector', 'Liberación Calidad', ''].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-[#5A6B85] font-semibold uppercase tracking-wide text-[10px]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtradas.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-[#97A4B8]">
                    <Truck size={36} className="mx-auto mb-2 opacity-20" />
                    <p>No hay órdenes para los filtros seleccionados</p>
                  </td>
                </tr>
              )}
              {filtradas.map((e) => {
                const { orden, estadoLiberacion, fechaLiberacion, inspector } = e
                const fpy =
                  orden.cantidadPlanificada > 0
                    ? Math.round(((orden.cantidadPlanificada - orden.cantidadRechazada) / orden.cantidadPlanificada) * 100)
                    : 100

                return (
                  <tr key={orden.id} className="border-b border-[#EEF2F8] hover:bg-[#F9FBFE] transition-colors">
                    <td className="px-5 py-4">
                      <p className="font-mono font-bold text-[#1F6CF0]">{orden.id}</p>
                      <p className="text-[#97A4B8] font-mono text-[10px]">{orden.loteId}</p>
                    </td>
                    <td className="px-5 py-4 text-[#5A6B85] max-w-[180px]">
                      <span className="block truncate font-medium text-[#15233B]">{orden.producto}</span>
                    </td>
                    <td className="px-5 py-4 text-[#5A6B85]">{orden.lineaProduccion}</td>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-[#15233B]">
                        {new Intl.NumberFormat('es-CO').format(orden.cantidadPlanificada)} und
                      </p>
                      {orden.cantidadRechazada > 0 && (
                        <p className="text-[10px] text-[#EF4444]">
                          {orden.cantidadRechazada} rechazadas · FPY {fpy}%
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-4 text-[#5A6B85] whitespace-nowrap">
                      {formatFecha(orden.fechaFin)}
                    </td>
                    <td className="px-5 py-4 text-[#5A6B85]">{inspector ?? '—'}</td>
                    <td className="px-5 py-4">
                      <div className="space-y-1">
                        <BadgeLiberacion estado={estadoLiberacion} />
                        {fechaLiberacion && (
                          <p className="text-[10px] text-[#97A4B8]">{formatFecha(fechaLiberacion)}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <button
                        onClick={() => setSeleccionada(e)}
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

      {/* SlideOver detalle */}
      <SlideOver
        abierto={Boolean(seleccionada)}
        onCerrar={() => setSeleccionada(null)}
        titulo={seleccionada?.orden.id ?? ''}
        subtitulo={seleccionada ? `${seleccionada.orden.producto} · ${seleccionada.orden.loteId}` : ''}
        ancho="md"
      >
        {seleccionada && (
          <div className="space-y-5">
            {/* Estado liberación */}
            <div className="p-4 rounded-xl border border-[#E8EDF4] bg-[#F7FAFD] flex items-center justify-between">
              <div>
                <p className="text-[10px] text-[#97A4B8] uppercase tracking-wide mb-1">Estado de liberación</p>
                <BadgeLiberacion estado={seleccionada.estadoLiberacion} />
              </div>
              {seleccionada.estadoLiberacion === 'LIBERADO' && (
                <CheckCircle2 size={28} className="text-[#16B364] opacity-60" />
              )}
              {seleccionada.estadoLiberacion === 'RECHAZADO' && (
                <XCircle size={28} className="text-[#EF4444] opacity-60" />
              )}
              {seleccionada.estadoLiberacion === 'PENDIENTE_CALIDAD' && (
                <Clock size={28} className="text-[#F59E0B] opacity-60" />
              )}
            </div>

            {/* Datos de manufactura */}
            <div>
              <p className="text-[10px] text-[#97A4B8] uppercase tracking-wide mb-3">Datos de Manufactura</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Línea', value: seleccionada.orden.lineaProduccion },
                  { label: 'Operario', value: seleccionada.orden.operario },
                  { label: 'Planificadas', value: `${new Intl.NumberFormat('es-CO').format(seleccionada.orden.cantidadPlanificada)} und` },
                  { label: 'Rechazadas', value: `${seleccionada.orden.cantidadRechazada} und` },
                  { label: 'Inicio', value: formatFecha(seleccionada.orden.fechaInicio) },
                  { label: 'Fin', value: formatFecha(seleccionada.orden.fechaFin) },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-[#F4F7FB] rounded-lg px-3 py-2.5">
                    <p className="text-[10px] text-[#97A4B8] uppercase tracking-wide mb-0.5">{label}</p>
                    <p className="text-xs font-semibold text-[#15233B]">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Datos de inspección */}
            {seleccionada.inspeccion ? (
              <div>
                <p className="text-[10px] text-[#97A4B8] uppercase tracking-wide mb-3">Inspección de Calidad</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'ID Inspección', value: seleccionada.inspeccion.id },
                    { label: 'Inspector', value: seleccionada.inspeccion.inspector ?? 'Sin asignar' },
                    { label: 'Estado', value: seleccionada.inspeccion.estado },
                    { label: 'Parámetros medidos', value: `${seleccionada.inspeccion.resultados.filter((r) => r.valorMedido !== null).length}/${seleccionada.inspeccion.resultados.length}` },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-[#F4F7FB] rounded-lg px-3 py-2.5">
                      <p className="text-[10px] text-[#97A4B8] uppercase tracking-wide mb-0.5">{label}</p>
                      <p className="text-xs font-semibold text-[#15233B]">{value}</p>
                    </div>
                  ))}
                </div>
                {seleccionada.inspeccion.observaciones && (
                  <div className="mt-2 p-3 bg-[#F4F7FB] rounded-lg border border-[#E8EDF4]">
                    <p className="text-[10px] text-[#97A4B8] uppercase tracking-wide mb-1">Observaciones</p>
                    <p className="text-xs text-[#5A6B85]">{seleccionada.inspeccion.observaciones}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-dashed border-[#E8EDF4] text-center">
                <Clock size={24} className="mx-auto mb-2 text-[#D1D5DB]" />
                <p className="text-xs text-[#97A4B8]">Sin inspección de Calidad registrada</p>
                <p className="text-[10px] text-[#D1D5DB] mt-1">La orden fue completada en Manufactura pero no tiene inspección asignada</p>
              </div>
            )}
          </div>
        )}
      </SlideOver>
    </div>
  )
}

'use client'

import { useState, useMemo } from 'react'
import { Search, Package } from 'lucide-react'
import { useCalidadContext, type EventoTrazabilidad } from '@/context/CalidadContext'
import { useAppContext } from '@/context/AppContext'
import PageHeader from '@/components/manufactura/PageHeader'
import TimelineEvent, { type TipoEvento, type ModuloEvento } from '@/components/calidad/TimelineEvent'

// ─── MAPA TIPO EVENTO → PROPS TIMELINE ───────────────────────────────────────

const TIPO_MAP: Record<string, { tipo: TipoEvento; modulo: ModuloEvento }> = {
  INICIO_PRODUCCION: { tipo: 'ORDEN_CREADA', modulo: 'MANUFACTURA' },
  OPERACION_COMPLETADA: { tipo: 'OPERACION_COMPLETADA', modulo: 'MANUFACTURA' },
  INSPECCION_DISPARADA: { tipo: 'INSPECCION_DISPARADA', modulo: 'CALIDAD' },
  INSPECCION_APROBADA: { tipo: 'INSPECCION_APROBADA', modulo: 'CALIDAD' },
  NO_CONFORMIDAD: { tipo: 'NO_CONFORMIDAD', modulo: 'CALIDAD' },
  ORDEN_DETENIDA: { tipo: 'ORDEN_DETENIDA', modulo: 'CRUCE' },
  ORDEN_LIBERADA: { tipo: 'ORDEN_LIBERADA', modulo: 'CALIDAD' },
}

// ─── PÁGINA ───────────────────────────────────────────────────────────────────

export default function TrazabilidadPage() {
  const { trazabilidad, inspecciones, noConformidades } = useCalidadContext()
  const { ordenes } = useAppContext()
  const [busqueda, setBusqueda] = useState('')
  const [loteSeleccionado, setLoteSeleccionado] = useState<string | null>(null)

  // Sintetiza eventos en memoria para datos históricos que no tienen eventos en Sheets
  const eventosSinteticos = useMemo<EventoTrazabilidad[]>(() => {
    const existentes = new Set(trazabilidad.map((e) => `${e.tipo}::${e.ordenId}`))
    const sinteticos: EventoTrazabilidad[] = []

    ordenes.filter((o) => o.estado !== 'PENDIENTE').forEach((o) => {
      if (!existentes.has(`INICIO_PRODUCCION::${o.id}`))
        sinteticos.push({ id: `SYN-IP-${o.id}`, tipo: 'INICIO_PRODUCCION', ordenId: o.id, loteId: o.loteId, descripcion: `Orden ${o.id} iniciada — ${o.producto}`, actor: o.operario, timestamp: o.fechaInicio, modulo: 'MANUFACTURA' })
    })

    inspecciones.forEach((ins) => {
      if (!existentes.has(`INSPECCION_DISPARADA::${ins.ordenId}`))
        sinteticos.push({ id: `SYN-ID-${ins.ordenId}`, tipo: 'INSPECCION_DISPARADA', ordenId: ins.ordenId, loteId: ins.loteId, descripcion: 'Inspección de calidad disparada', actor: 'Sistema', timestamp: ins.fechaDisparo, modulo: 'CALIDAD' })
      if (ins.estado === 'APROBADA' && !existentes.has(`INSPECCION_APROBADA::${ins.ordenId}`))
        sinteticos.push({ id: `SYN-IA-${ins.ordenId}`, tipo: 'INSPECCION_APROBADA', ordenId: ins.ordenId, loteId: ins.loteId, descripcion: `Lote ${ins.loteId} aprobado`, actor: ins.inspector ?? 'Inspector', timestamp: ins.fechaDisparo, modulo: 'CALIDAD' })
      if (ins.estado === 'APROBADA' && !existentes.has(`ORDEN_LIBERADA::${ins.ordenId}`) && !sinteticos.some((s) => s.tipo === 'ORDEN_LIBERADA' && s.ordenId === ins.ordenId))
        sinteticos.push({ id: `SYN-OL-${ins.ordenId}`, tipo: 'ORDEN_LIBERADA', ordenId: ins.ordenId, loteId: ins.loteId, descripcion: `Lote ${ins.loteId} liberado`, actor: ins.inspector ?? 'Inspector', timestamp: ins.fechaDisparo, modulo: 'CALIDAD' })
    })

    noConformidades.forEach((nc) => {
      if (!existentes.has(`NO_CONFORMIDAD::${nc.ordenId}`) && !sinteticos.some((s) => s.tipo === 'NO_CONFORMIDAD' && s.ordenId === nc.ordenId))
        sinteticos.push({ id: `SYN-NC-${nc.id}`, tipo: 'NO_CONFORMIDAD', ordenId: nc.ordenId, loteId: nc.loteId, descripcion: `${nc.id} — ${nc.severidad}: ${nc.tipoDefecto}`, actor: nc.inspector, timestamp: nc.fecha, modulo: 'CALIDAD' })
    })

    ordenes.filter((o) => o.estado === 'DETENIDA').forEach((o) => {
      if (!existentes.has(`ORDEN_DETENIDA::${o.id}`))
        sinteticos.push({ id: `SYN-OD-${o.id}`, tipo: 'ORDEN_DETENIDA', ordenId: o.id, loteId: o.loteId, descripcion: `Orden ${o.id} detenida por rechazo de lote`, actor: 'Sistema', timestamp: o.fechaInicio, modulo: 'MANUFACTURA' })
    })

    return sinteticos
  }, [trazabilidad, ordenes, inspecciones, noConformidades])

  const todosLosEventos = useMemo(
    () => [...trazabilidad, ...eventosSinteticos],
    [trazabilidad, eventosSinteticos]
  )

  // Top 3 lotes con más actividad (chips dinámicos)
  const lotesRecientes = useMemo(() => {
    const conteo: Record<string, number> = {}
    todosLosEventos.forEach((e) => { conteo[e.loteId] = (conteo[e.loteId] ?? 0) + 1 })
    return Object.entries(conteo).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([l]) => l)
  }, [todosLosEventos])

  // Lotes únicos en todos los eventos
  const lotesDisponibles = useMemo(() => {
    const set = new Set<string>()
    todosLosEventos.forEach((e) => set.add(e.loteId))
    return Array.from(set)
  }, [todosLosEventos])

  // Filtrar eventos por lote o búsqueda
  const eventosFiltrados = useMemo(() => {
    let lista = todosLosEventos
    if (loteSeleccionado) {
      lista = lista.filter((e) => e.loteId === loteSeleccionado)
    }
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase()
      lista = lista.filter(
        (e) =>
          e.loteId.toLowerCase().includes(q) ||
          e.ordenId.toLowerCase().includes(q) ||
          e.descripcion.toLowerCase().includes(q)
      )
    }
    return lista.slice().sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
  }, [trazabilidad, loteSeleccionado, busqueda])

  // Agrupar por lote
  const porLote = useMemo(() => {
    const mapa: Record<string, EventoTrazabilidad[]> = {}
    eventosFiltrados.forEach((e) => {
      if (!mapa[e.loteId]) mapa[e.loteId] = []
      mapa[e.loteId].push(e)
    })
    return mapa
  }, [eventosFiltrados])

  const lotesMostrados = Object.keys(porLote)

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader titulo="Trazabilidad de Lotes" subtitulo="Historial completo de eventos por lote de producción — Calidad" />

      {/* Barra de búsqueda + chips */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#97A4B8]" />
          <input
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value)
              if (e.target.value) setLoteSeleccionado(null)
            }}
            placeholder="Buscar lote, orden, evento…"
            className="pl-8 pr-4 py-2 text-xs rounded-lg border border-[#E8EDF4] bg-white outline-none focus:border-[#16B364] focus:ring-1 focus:ring-[#16B364]/30 w-60"
          />
        </div>

        {/* Chips de lote rápido */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => { setLoteSeleccionado(null); setBusqueda('') }}
            className={`px-[13px] py-[8px] rounded-[10px] text-[12.5px] font-medium border transition-all ${
              !loteSeleccionado && !busqueda ? 'bg-[#16B364] text-white border-[#16B364]' : 'bg-white text-[#5A6B85] border-[#E8EDF4] hover:border-[#16B364]'
            }`}
          >
            Todos
          </button>
          {lotesRecientes.filter((l) => lotesDisponibles.includes(l)).map((lote) => (
            <button
              key={lote}
              onClick={() => { setLoteSeleccionado(lote); setBusqueda('') }}
              className={`px-[13px] py-[8px] rounded-[10px] text-[12.5px] font-medium font-mono border transition-all ${
                loteSeleccionado === lote ? 'bg-[#16B364] text-white border-[#16B364]' : 'bg-white text-[#5A6B85] border-[#E8EDF4] hover:border-[#16B364]'
              }`}
            >
              {lote}
            </button>
          ))}
        </div>
      </div>

      {/* Timelines por lote */}
      {lotesMostrados.length === 0 ? (
        <div className="text-center py-16 text-[#97A4B8]">
          <Package size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No se encontraron eventos para los filtros seleccionados</p>
        </div>
      ) : (
        <div className="space-y-8">
          {lotesMostrados.map((lote) => {
            const eventos = porLote[lote]
            const primeraOrden = eventos[0]?.ordenId ?? '—'
            return (
              <div key={lote} className="bg-white rounded-2xl border border-[#E8EDF4] overflow-hidden">
                {/* Header lote */}
                <div className="flex items-center gap-3 px-6 py-4 bg-[#F4F7FB] border-b border-[#E8EDF4]">
                  <div className="w-9 h-9 bg-[#E7F8EF] rounded-lg flex items-center justify-center flex-shrink-0">
                    <Package size={16} className="text-[#16B364]" />
                  </div>
                  <div>
                    <p className="font-bold text-[#15233B] text-sm">{lote}</p>
                    <p className="text-[10px] text-[#97A4B8] font-mono">{primeraOrden} · {eventos.length} evento{eventos.length !== 1 ? 's' : ''}</p>
                  </div>

                  {/* Módulos involucrados */}
                  <div className="ml-auto flex gap-1.5">
                    {eventos.some((e) => e.modulo === 'MANUFACTURA') && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EAF2FE] text-[#1F6CF0]">Manufactura</span>
                    )}
                    {eventos.some((e) => e.modulo === 'CALIDAD') && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E7F8EF] text-[#16B364]">Calidad</span>
                    )}
                  </div>
                </div>

                {/* Timeline */}
                <div className="px-6 py-5">
                  {eventos.map((evento, idx) => {
                    const mapCfg = TIPO_MAP[evento.tipo] ?? { tipo: 'ORDEN_CREADA' as TipoEvento, modulo: evento.modulo as ModuloEvento }
                    return (
                      <TimelineEvent
                        key={evento.id}
                        tipo={mapCfg.tipo}
                        modulo={mapCfg.modulo}
                        descripcion={evento.descripcion}
                        actor={evento.actor}
                        timestamp={evento.timestamp}
                        isLast={idx === eventos.length - 1}
                      />
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

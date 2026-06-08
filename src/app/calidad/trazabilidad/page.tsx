'use client'

import { useState, useMemo } from 'react'
import { Search, Package } from 'lucide-react'
import { useCalidadContext, type EventoTrazabilidad } from '@/context/CalidadContext'
import PageHeader from '@/components/manufactura/PageHeader'
import TimelineEvent, { type TipoEvento, type ModuloEvento } from '@/components/calidad/TimelineEvent'

// ─── LOTES RÁPIDOS ────────────────────────────────────────────────────────────

const LOTES_RAPIDOS = ['LOT-A-001', 'LOT-B-002', 'LOT-A-003']

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
  const { trazabilidad } = useCalidadContext()
  const [busqueda, setBusqueda] = useState('')
  const [loteSeleccionado, setLoteSeleccionado] = useState<string | null>(null)

  // Lotes únicos en todos los eventos
  const lotesDisponibles = useMemo(() => {
    const set = new Set<string>()
    trazabilidad.forEach((e) => set.add(e.loteId))
    return Array.from(set)
  }, [trazabilidad])

  // Filtrar eventos por lote o búsqueda
  const eventosFiltrados = useMemo(() => {
    let lista = trazabilidad
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
          {LOTES_RAPIDOS.filter((l) => lotesDisponibles.includes(l)).map((lote) => (
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

'use client'

import { useState } from 'react'
import { useAppContext } from '@/context/AppContext'
import { useManufacturaContext } from '@/context/ManufacturaContext'
import { simularTiempoTranscurrido } from '@/data/manufacturaData'
import PageHeader from '@/components/manufactura/PageHeader'
import StatusBadge from '@/components/manufactura/StatusBadge'
import ProgressBar, { colorPorEstado } from '@/components/manufactura/ProgressBar'
import { Clock, User, Settings, TrendingUp, Package, CheckSquare } from 'lucide-react'
import type { OrdenProduccion } from '@/context/AppContext'

type Turno = 'Mañana' | 'Tarde' | 'Noche'
const TURNOS: Turno[] = ['Mañana', 'Tarde', 'Noche']

// ─── CARD DE ORDEN KANBAN ────────────────────────────────────────────────────

function KanbanCard({ orden }: { orden: OrdenProduccion }) {
  const { rutas } = useManufacturaContext()
  const pct = orden.cantidadPlanificada > 0
    ? Math.round((orden.cantidadProducida / orden.cantidadPlanificada) * 100)
    : 0

  const tiempoTransc = simularTiempoTranscurrido(pct / 100)
  const ruta = rutas.find((r) => r.id === orden.rutaId)

  const esDetenida = orden.estado === 'DETENIDA'
  const esCompletada = orden.estado === 'COMPLETADA'

  const bordeColor = esDetenida
    ? 'border-l-[#EF4444]'
    : esCompletada
    ? 'border-l-[#16B364]'
    : orden.estado === 'EN_PROCESO'
    ? 'border-l-[#1F6CF0]'
    : 'border-l-[#97A4B8]'

  return (
    <div
      className={`
        bg-white rounded-xl border border-[#E8EDF4] border-l-4 ${bordeColor} p-4 shadow-sm
        transition-all duration-200 hover:shadow-md cursor-default
        ${esCompletada ? 'opacity-70' : ''}
        ${esDetenida ? 'bg-red-50/40' : ''}
      `}
    >
      {/* Header card */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <span className="font-mono text-xs font-bold text-[#1F6CF0]">{orden.id}</span>
          <p className="text-xs text-[#5A6B85] font-medium mt-0.5 leading-snug">{orden.producto}</p>
        </div>
        <StatusBadge estado={orden.prioridad} size="sm" />
      </div>

      {/* Barra progreso */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-[#5A6B85] mb-1.5">
          <span>
            {new Intl.NumberFormat('es-CO').format(orden.cantidadProducida)}
            {' / '}
            {new Intl.NumberFormat('es-CO').format(orden.cantidadPlanificada)} und
          </span>
          <span className="font-bold" style={{ color: colorPorEstado(orden.estado) }}>{pct}%</span>
        </div>
        <ProgressBar valor={pct} color={colorPorEstado(orden.estado)} height="h-2.5" />
      </div>

      {/* Operación actual */}
      <div className="flex items-center gap-1.5 text-xs text-[#5A6B85] mb-2">
        <Settings size={11} className="text-[#5A6B85] shrink-0" />
        <span className="font-medium">{orden.operacionActual.nombre}</span>
        <span className="text-[#97A4B8]">
          ({orden.operacionActual.indice}/{orden.operacionActual.total})
        </span>
      </div>

      {/* Operario */}
      <div className="flex items-center gap-1.5 text-xs text-[#5A6B85] mb-2">
        <User size={11} className="shrink-0" />
        {orden.operario}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2.5 border-t border-[#F4F7FB]">
        <div className="flex items-center gap-1.5 text-xs text-[#5A6B85]">
          <Clock size={11} className="shrink-0" />
          {tiempoTransc} transcurrido
        </div>
        <StatusBadge estado={orden.estado} size="sm" />
      </div>
    </div>
  )
}

// ─── COLUMNA KANBAN ──────────────────────────────────────────────────────────

function KanbanColumna({
  linea,
  ordenes,
}: {
  linea: string
  ordenes: OrdenProduccion[]
}) {
  const activas = ordenes.filter((o) => o.estado === 'EN_PROCESO').length

  return (
    <div className="flex flex-col min-w-[300px] flex-1">
      {/* Header columna */}
      <div className="flex items-center justify-between bg-white rounded-xl border border-[#E8EDF4] px-4 py-3 mb-3 shadow-sm">
        <h3 className="text-sm font-bold text-[#15233B]">{linea}</h3>
        <div className="flex items-center gap-2">
          {activas > 0 && (
            <span className="text-xs font-semibold bg-[#EAF2FE] text-[#1557C9] px-2 py-0.5 rounded-full">
              {activas} activa{activas > 1 ? 's' : ''}
            </span>
          )}
          <span className="text-xs text-[#5A6B85]">{ordenes.length} total</span>
        </div>
      </div>

      {/* Cards */}
      <div className="space-y-3">
        {ordenes.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-[#E8EDF4] p-6 text-center text-xs text-[#97A4B8]">
            Sin órdenes en esta línea
          </div>
        ) : (
          ordenes.map((o) => <KanbanCard key={o.id} orden={o} />)
        )}
      </div>
    </div>
  )
}

// ─── PANEL RESUMEN DE TURNO ───────────────────────────────────────────────────

function ResumenTurno({ ordenes }: { ordenes: OrdenProduccion[] }) {
  const totalProducido = ordenes.reduce((s, o) => s + o.cantidadProducida, 0)
  const ordenesCompletadas = ordenes.filter((o) => o.estado === 'COMPLETADA').length
  const totalPlanificadas = ordenes.length
  const fpy = (() => {
    const completadas = ordenes.filter((o) => o.estado === 'COMPLETADA')
    if (!completadas.length) return 0
    const total = completadas.reduce((s, o) => s + o.cantidadPlanificada, 0)
    const rechazadas = completadas.reduce((s, o) => s + o.cantidadRechazada, 0)
    return total > 0 ? Math.round(((total - rechazadas) / total) * 100) : 0
  })()

  const cards = [
    {
      icono: Package,
      label: 'Total Producido',
      valor: new Intl.NumberFormat('es-CO').format(totalProducido),
      unidad: 'unidades',
      color: '#1F6CF0',
      bg: '#EAF2FE',
    },
    {
      icono: TrendingUp,
      label: 'First Pass Yield',
      valor: `${fpy}%`,
      unidad: 'rendimiento',
      color: '#16B364',
      bg: '#E7F8EF',
    },
    {
      icono: CheckSquare,
      label: 'Órdenes Completadas',
      valor: `${ordenesCompletadas} / ${totalPlanificadas}`,
      unidad: 'órdenes',
      color: '#4C9FE6',
      bg: '#EAF2FE',
    },
  ]

  return (
    <div className="mt-6">
      <h2 className="text-sm font-bold text-[#15233B] mb-3">Resumen de Turno</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.map(({ icono: Icono, label, valor, unidad, color, bg }) => (
          <div
            key={label}
            className="bg-white rounded-xl border border-[#E8EDF4] p-5 flex items-center gap-4 shadow-sm"
          >
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: bg }}
            >
              <Icono size={20} style={{ color }} />
            </div>
            <div>
              <p className="text-xl font-bold text-[#15233B]">{valor}</p>
              <p className="text-sm font-medium text-[#5A6B85]">{label}</p>
              <p className="text-xs text-[#5A6B85]">{unidad}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── PÁGINA PRINCIPAL ─────────────────────────────────────────────────────────

export default function AvancePage() {
  const { ordenes } = useAppContext()
  const [turnoActivo, setTurnoActivo] = useState<Turno>('Mañana')

  const lineas = Array.from(new Set(ordenes.map((o) => o.lineaProduccion))).sort()

  return (
    <div className="max-w-[1400px] mx-auto">
      <PageHeader
        titulo="Avance en Planta"
        subtitulo="Vista Kanban — Control de Piso"
      >
        {/* Selector de turno */}
        <div className="flex gap-1 bg-[#F4F7FB] p-1 rounded-lg border border-[#E8EDF4]">
          {TURNOS.map((t) => (
            <button
              key={t}
              onClick={() => setTurnoActivo(t)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-150 ${
                turnoActivo === t
                  ? 'bg-[#1F6CF0] text-white shadow-sm'
                  : 'text-[#5A6B85] hover:text-[#1F6CF0]'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </PageHeader>

      {/* Kanban board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {lineas.map((linea) => (
          <KanbanColumna
            key={linea}
            linea={linea}
            ordenes={ordenes.filter((o) => o.lineaProduccion === linea)}
          />
        ))}
      </div>

      {/* Resumen turno */}
      <ResumenTurno ordenes={ordenes} />
    </div>
  )
}

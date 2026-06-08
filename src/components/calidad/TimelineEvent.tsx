'use client'

import { Factory, FlaskConical, ArrowRightLeft, CheckCircle2, XCircle, AlertTriangle, Clock, FileText, Play } from 'lucide-react'

export type TipoEvento =
  | 'ORDEN_CREADA'
  | 'OPERACION_COMPLETADA'
  | 'INSPECCION_DISPARADA'
  | 'INSPECCION_APROBADA'
  | 'INSPECCION_RECHAZADA'
  | 'NO_CONFORMIDAD'
  | 'ORDEN_DETENIDA'
  | 'ORDEN_LIBERADA'

export type ModuloEvento = 'MANUFACTURA' | 'CALIDAD' | 'CRUCE'

interface TimelineEventProps {
  tipo: TipoEvento
  descripcion: string
  actor: string
  timestamp: string
  modulo: ModuloEvento
  isLast?: boolean
}

const EVENTO_CONFIG: Record<TipoEvento, { icon: React.ElementType; color: string; bg: string }> = {
  ORDEN_CREADA: { icon: Play, color: '#1F6CF0', bg: '#EAF2FE' },
  OPERACION_COMPLETADA: { icon: CheckCircle2, color: '#1F6CF0', bg: '#EAF2FE' },
  INSPECCION_DISPARADA: { icon: Clock, color: '#F59E0B', bg: '#FEF3E2' },
  INSPECCION_APROBADA: { icon: CheckCircle2, color: '#16B364', bg: '#E7F8EF' },
  INSPECCION_RECHAZADA: { icon: XCircle, color: '#EF4444', bg: '#FDECEC' },
  NO_CONFORMIDAD: { icon: AlertTriangle, color: '#EF4444', bg: '#FDECEC' },
  ORDEN_DETENIDA: { icon: XCircle, color: '#EF4444', bg: '#FDECEC' },
  ORDEN_LIBERADA: { icon: FileText, color: '#16B364', bg: '#E7F8EF' },
}

const MODULO_CONFIG: Record<ModuloEvento, { label: string; color: string; icon: React.ElementType }> = {
  MANUFACTURA: { label: 'Manufactura', color: '#1F6CF0', icon: Factory },
  CALIDAD: { label: 'Calidad', color: '#16B364', icon: FlaskConical },
  CRUCE: { label: 'Integración', color: '#8B5CF6', icon: ArrowRightLeft },
}

function formatTimestamp(iso: string) {
  return new Date(iso).toLocaleString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Bogota',
  })
}

export default function TimelineEvent({ tipo, descripcion, actor, timestamp, modulo, isLast = false }: TimelineEventProps) {
  const cfg = EVENTO_CONFIG[tipo]
  const mod = MODULO_CONFIG[modulo]
  const Icon = cfg.icon
  const ModIcon = mod.icon

  const connectorStyle: React.CSSProperties =
    modulo === 'CRUCE'
      ? { borderLeft: '2px dashed #C4B5FD' }
      : modulo === 'MANUFACTURA'
      ? { borderLeft: '2px solid #1F6CF0' }
      : { borderLeft: '2px solid #16B364' }

  return (
    <div className="flex gap-4">
      {/* Icon column */}
      <div className="flex flex-col items-center flex-shrink-0">
        <div className="w-9 h-9 rounded-full flex items-center justify-center shadow-sm" style={{ background: cfg.bg, border: `2px solid ${cfg.color}` }}>
          <Icon size={15} style={{ color: cfg.color }} />
        </div>
        {!isLast && (
          <div className="flex-1 mt-1 min-h-[2rem]" style={{ width: 0, ...connectorStyle }} />
        )}
      </div>

      {/* Content */}
      <div className={`pb-5 flex-1 ${isLast ? '' : ''}`}>
        <div className="bg-white rounded-xl border border-[#E8EDF4] shadow-sm p-3.5 space-y-2">
          {/* Header */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-sm font-semibold text-[#15233B] leading-snug">{descripcion}</p>
            <span
              className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
              style={{ background: `${mod.color}15`, color: mod.color }}
            >
              <ModIcon size={10} />
              {mod.label}
            </span>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between text-[10px] text-[#97A4B8]">
            <span>{actor}</span>
            <span>{formatTimestamp(timestamp)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

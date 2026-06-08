'use client'

import { AlertTriangle, AlertOctagon, Info, Clock } from 'lucide-react'

interface NCCardProps {
  id: string
  descripcion: string
  severidad: 'CRITICA' | 'MAYOR' | 'MENOR'
  estado: string
  loteId: string
  ordenId: string
  fechaDeteccion: string
  defecto: string
  onClick?: () => void
}

const SEVERIDAD_CONFIG = {
  CRITICA: { color: '#EF4444', bg: '#FDECEC', label: 'Crítica', icon: AlertOctagon },
  MAYOR: { color: '#F59E0B', bg: '#FEF3E2', label: 'Mayor', icon: AlertTriangle },
  MENOR: { color: '#4C9FE6', bg: '#EAF2FE', label: 'Menor', icon: Info },
}

const ESTADO_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  ABIERTA: { bg: '#FDECEC', text: '#EF4444', label: 'Abierta' },
  EN_PROCESO: { bg: '#FEF3E2', text: '#F59E0B', label: 'En proceso' },
  CERRADA: { bg: '#E7F8EF', text: '#16B364', label: 'Cerrada' },
  RESUELTA: { bg: '#E7F8EF', text: '#16B364', label: 'Resuelta' },
}

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric',
    timeZone: 'America/Bogota',
  })
}

export default function NCCard({ id, descripcion, severidad, estado, loteId, ordenId, fechaDeteccion, defecto, onClick }: NCCardProps) {
  const cfg = SEVERIDAD_CONFIG[severidad]
  const Icon = cfg.icon
  const estadoCfg = ESTADO_BADGE[estado] ?? { bg: 'rgba(90,90,90,0.1)', text: '#5A6B85', label: estado }

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl border border-[#E8EDF4] shadow-sm hover:shadow-md transition-all cursor-pointer group"
      style={{ borderLeft: `4px solid ${cfg.color}` }}
    >
      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: cfg.bg }}>
              <Icon size={15} style={{ color: cfg.color }} />
            </div>
            <div>
              <p className="font-mono text-[10px] text-[#97A4B8]">{id}</p>
              <p className="text-sm font-semibold text-[#15233B] leading-tight group-hover:text-[#16B364] transition-colors">
                {descripcion}
              </p>
            </div>
          </div>

          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: estadoCfg.bg, color: estadoCfg.text }}>
            {estadoCfg.label}
          </span>
        </div>

        {/* Defecto */}
        <p className="text-xs text-[#5A6B85] leading-snug">{defecto}</p>

        {/* Footer */}
        <div className="flex items-center justify-between pt-1 border-t border-[#F3F4F6]">
          <div className="flex items-center gap-3 text-[10px] text-[#97A4B8]">
            <span className="font-mono">{loteId}</span>
            <span>·</span>
            <span className="font-mono">{ordenId}</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-[#97A4B8]">
            <Clock size={10} />
            <span>{formatFecha(fechaDeteccion)}</span>
          </div>
        </div>

        {/* Severidad badge */}
        <div>
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: cfg.bg, color: cfg.color }}
          >
            {cfg.label}
          </span>
        </div>
      </div>
    </div>
  )
}

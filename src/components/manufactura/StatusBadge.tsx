type BadgeEstado =
  | 'EN_PROCESO'
  | 'COMPLETADA'
  | 'DETENIDA'
  | 'PENDIENTE'
  | 'ALTA'
  | 'MEDIA'
  | 'BAJA'
  | 'OPERATIVO'
  | 'MANTENIMIENTO'
  | 'INACTIVO'
  | 'ACTIVA'
  | 'BORRADOR'
  | 'OBSOLETA'
  | 'MAQUINARIA'
  | 'INSPECCION'
  | 'ENSAMBLE'

const CONFIG: Record<BadgeEstado, { label: string; clase: string }> = {
  EN_PROCESO:    { label: 'En Proceso',     clase: 'bg-[#EAF2FE] text-[#1F6CF0]' },
  COMPLETADA:    { label: 'Completada',     clase: 'bg-[#E7F8EF] text-[#16B364]' },
  DETENIDA:      { label: 'Detenida',       clase: 'bg-[#FDECEC] text-[#DC2626]' },
  PENDIENTE:     { label: 'Pendiente',      clase: 'bg-[#FEF3E2] text-[#D97706]' },
  ALTA:          { label: 'Alta',           clase: 'bg-[#FDECEC] text-[#DC2626]' },
  MEDIA:         { label: 'Media',          clase: 'bg-[#FEF3E2] text-[#D97706]' },
  BAJA:          { label: 'Baja',           clase: 'bg-[#EEF2F8] text-[#97A4B8]' },
  OPERATIVO:     { label: 'Operativo',      clase: 'bg-[#E7F8EF] text-[#16B364]' },
  MANTENIMIENTO: { label: 'Mantenimiento',  clase: 'bg-[#FEF3E2] text-[#D97706]' },
  INACTIVO:      { label: 'Inactivo',       clase: 'bg-[#EEF2F8] text-[#97A4B8]' },
  ACTIVA:        { label: 'Activa',         clase: 'bg-[#E7F8EF] text-[#16B364]' },
  BORRADOR:      { label: 'Borrador',       clase: 'bg-[#FEF3E2] text-[#D97706]' },
  OBSOLETA:      { label: 'Obsoleta',       clase: 'bg-[#EEF2F8] text-[#97A4B8]' },
  MAQUINARIA:    { label: 'Maquinaria',     clase: 'bg-[#EAF2FE] text-[#1F6CF0]' },
  INSPECCION:    { label: 'Inspección',     clase: 'bg-[#EAF2FE] text-[#4C9FE6]' },
  ENSAMBLE:      { label: 'Ensamble',       clase: 'bg-[#EEEBFB] text-[#6E56E0]' },
}

interface StatusBadgeProps {
  estado: string
  size?: 'sm' | 'md'
}

export default function StatusBadge({ estado, size = 'md' }: StatusBadgeProps) {
  const cfg = CONFIG[estado as BadgeEstado] ?? { label: estado, clase: 'bg-gray-100 text-gray-500' }
  const padding = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-xs'

  return (
    <span className={`inline-flex items-center rounded-full font-medium ${padding} ${cfg.clase}`}>
      {cfg.label}
    </span>
  )
}

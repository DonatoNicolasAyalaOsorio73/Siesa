interface ProgressBarProps {
  valor: number        // 0-100
  color?: string
  height?: string
  mostrarPorcentaje?: boolean
  className?: string
}

const COLOR_ESTADO: Record<string, string> = {
  EN_PROCESO: '#1F6CF0',
  COMPLETADA: '#16B364',
  DETENIDA:   '#EF4444',
  PENDIENTE:  '#97A4B8',
}

export function colorPorEstado(estado: string): string {
  return COLOR_ESTADO[estado] ?? '#97A4B8'
}

export default function ProgressBar({
  valor,
  color = '#1F6CF0',
  height = 'h-2',
  mostrarPorcentaje = false,
  className = '',
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, valor))

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`flex-1 bg-[#EEF2F8] rounded-full overflow-hidden ${height}`}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      {mostrarPorcentaje && (
        <span className="text-xs text-[#97A4B8] w-8 text-right tabular-nums">
          {pct}%
        </span>
      )}
    </div>
  )
}

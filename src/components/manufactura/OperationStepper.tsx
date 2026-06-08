import { CheckCircle2, Circle, AlertCircle, Loader2, ChevronRight } from 'lucide-react'

interface Operacion {
  orden: number
  nombre: string
  centroTrabajoId: string
  tiempoSetupMin: number
  tiempoOperacionMin: number
}

interface OperationStepperProps {
  operaciones: Operacion[]
  indiceActual: number
  estadoOrden: string
}

type StepEstado = 'completada' | 'activa' | 'detenida' | 'pendiente'

function calcularEstepEstado(
  op: Operacion,
  indiceActual: number,
  estadoOrden: string
): StepEstado {
  if (estadoOrden === 'COMPLETADA') return 'completada'
  if (op.orden < indiceActual) return 'completada'
  if (op.orden === indiceActual) {
    if (estadoOrden === 'DETENIDA') return 'detenida'
    if (estadoOrden === 'PENDIENTE') return 'pendiente'
    return 'activa'
  }
  return 'pendiente'
}

const STEP_STYLES: Record<StepEstado, { border: string; bg: string; icon: string; text: string }> = {
  completada: { border: 'border-[#16B364]', bg: 'bg-[#E7F8EF]', icon: 'text-[#16B364]', text: 'text-[#16B364]' },
  activa:     { border: 'border-[#1F6CF0]', bg: 'bg-[#EAF2FE]', icon: 'text-[#1557C9]', text: 'text-[#1557C9]' },
  detenida:   { border: 'border-[#EF4444]', bg: 'bg-[#FDECEC]', icon: 'text-[#DC2626]', text: 'text-[#DC2626]' },
  pendiente:  { border: 'border-[#E8EDF4]', bg: 'bg-[#F4F7FB]',    icon: 'text-[#97A4B8]', text: 'text-[#5A6B85]' },
}

function StepIcon({ estado }: { estado: StepEstado }) {
  const s = STEP_STYLES[estado]
  const cls = `w-5 h-5 ${s.icon}`
  if (estado === 'completada') return <CheckCircle2 className={cls} />
  if (estado === 'activa')     return <Loader2 className={`${cls} animate-spin`} />
  if (estado === 'detenida')   return <AlertCircle className={cls} />
  return <Circle className={cls} />
}

export default function OperationStepper({
  operaciones,
  indiceActual,
  estadoOrden,
}: OperationStepperProps) {
  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex items-start gap-1 min-w-max">
        {operaciones.map((op, idx) => {
          const estado = calcularEstepEstado(op, indiceActual, estadoOrden)
          const s = STEP_STYLES[estado]

          return (
            <div key={op.orden} className="flex items-start">
              {/* Step */}
              <div className="flex flex-col items-center w-[88px]">
                <div
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center border-2
                    ${s.border} ${s.bg}
                    ${estado === 'activa' ? 'animate-pulse' : ''}
                  `}
                >
                  <StepIcon estado={estado} />
                </div>
                <span className={`text-[10px] font-medium text-center mt-1 leading-tight px-1 ${s.text}`}>
                  {op.nombre.split(' ').slice(0, 2).join('\n')}
                </span>
                <span className="text-[9px] text-[#5A6B85] mt-0.5">
                  {op.tiempoSetupMin + op.tiempoOperacionMin} min
                </span>
              </div>

              {/* Conector */}
              {idx < operaciones.length - 1 && (
                <div className="mt-4 shrink-0">
                  <ChevronRight size={16} className="text-[#CBD5E1]" />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

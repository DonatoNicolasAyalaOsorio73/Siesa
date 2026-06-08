'use client'

import { CheckCircle2, XCircle, AlertTriangle, X } from 'lucide-react'
import type { ToastTipo } from '@/hooks/useToast'

interface ToastProps {
  mensaje: string
  tipo: ToastTipo
  visible: boolean
  onClose: () => void
}

const CONFIG: Record<ToastTipo, { bg: string; border: string; icon: React.ElementType; iconColor: string }> = {
  success: {
    bg: 'bg-white',
    border: 'border-[#16B364]',
    icon: CheckCircle2,
    iconColor: 'text-[#16B364]',
  },
  error: {
    bg: 'bg-white',
    border: 'border-[#EF4444]',
    icon: XCircle,
    iconColor: 'text-[#DC2626]',
  },
  warning: {
    bg: 'bg-white',
    border: 'border-[#F59E0B]',
    icon: AlertTriangle,
    iconColor: 'text-[#D97706]',
  },
}

export default function Toast({ mensaje, tipo, visible, onClose }: ToastProps) {
  const { bg, border, icon: Icono, iconColor } = CONFIG[tipo]

  return (
    <div
      className={`
        fixed top-5 right-5 z-50 flex items-center gap-3
        ${bg} border-l-4 ${border}
        rounded-xl shadow-xl px-5 py-4 min-w-[300px] max-w-sm
        transition-all duration-300
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3 pointer-events-none'}
      `}
      role="alert"
    >
      <Icono size={20} className={`${iconColor} shrink-0`} />
      <p className="flex-1 text-sm font-medium text-[#5A6B85] leading-snug">{mensaje}</p>
      <button
        onClick={onClose}
        className="text-[#97A4B8] hover:text-[#5A6B85] transition-colors"
        aria-label="Cerrar notificación"
      >
        <X size={16} />
      </button>
    </div>
  )
}

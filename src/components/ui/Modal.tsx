'use client'

import { useEffect, useCallback, ReactNode } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  abierto: boolean
  onCerrar: () => void
  titulo: string
  subtitulo?: string
  ancho?: 'sm' | 'md' | 'lg' | 'xl'
  children: ReactNode
  footer?: ReactNode
}

const ANCHOS = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
}

export default function Modal({
  abierto,
  onCerrar,
  titulo,
  subtitulo,
  ancho = 'md',
  children,
  footer,
}: ModalProps) {
  const handleEsc = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar()
    },
    [onCerrar]
  )

  useEffect(() => {
    if (!abierto) return
    document.addEventListener('keydown', handleEsc)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = ''
    }
  }, [abierto, handleEsc])

  if (!abierto) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onCerrar}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className={`relative bg-white rounded-2xl border border-[#E8EDF4] shadow-xl w-full ${ANCHOS[ancho]} flex flex-col max-h-[90vh]`}
        style={{ boxShadow: '0 20px 60px -12px rgba(21,35,59,.22)' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-titulo"
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-[#E8EDF4] shrink-0">
          <div>
            <h2
              id="modal-titulo"
              className="text-[15px] font-bold text-[#15233B] font-poppins leading-tight"
            >
              {titulo}
            </h2>
            {subtitulo && (
              <p className="text-[12px] text-[#5A6B85] mt-0.5">{subtitulo}</p>
            )}
          </div>
          <button
            onClick={onCerrar}
            className="ml-4 shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-[#97A4B8] hover:text-[#5A6B85] hover:bg-[#F4F7FB] transition-all"
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-[#E8EDF4] bg-[#F9FBFE] rounded-b-2xl shrink-0 flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

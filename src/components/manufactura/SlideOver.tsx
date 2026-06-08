'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'

type Ancho = 'sm' | 'md' | 'lg'

const ANCHO_MAP: Record<Ancho, string> = {
  sm: 'max-w-sm',
  md: 'max-w-xl',
  lg: 'max-w-2xl',
}

interface SlideOverProps {
  abierto: boolean
  onCerrar: () => void
  titulo: string
  subtitulo?: string
  ancho?: Ancho
  children: React.ReactNode
}

export default function SlideOver({
  abierto,
  onCerrar,
  titulo,
  subtitulo,
  ancho = 'md',
  children,
}: SlideOverProps) {
  // Bloquear scroll del body cuando está abierto
  useEffect(() => {
    if (abierto) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [abierto])

  // Cerrar con Escape
  useEffect(() => {
    if (!abierto) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [abierto, onCerrar])

  return (
    <div
      className={`fixed inset-0 z-40 flex justify-end ${abierto ? '' : 'pointer-events-none'}`}
      aria-modal="true"
      role="dialog"
    >
      {/* Overlay */}
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${
          abierto ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onCerrar}
      />

      {/* Panel */}
      <div
        className={`
          relative h-full flex flex-col w-full ${ANCHO_MAP[ancho]}
          bg-white shadow-2xl
          transition-transform duration-300 ease-out
          ${abierto ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-[#E8EDF4] shrink-0">
          <div className="min-w-0 pr-4">
            <h2 className="text-base font-bold text-[#15233B] truncate">{titulo}</h2>
            {subtitulo && (
              <p className="text-sm text-[#5A6B85] mt-0.5 truncate">{subtitulo}</p>
            )}
          </div>
          <button
            onClick={onCerrar}
            className="shrink-0 text-[#5A6B85] hover:text-[#15233B] transition-colors p-1.5 rounded-lg hover:bg-[#F4F7FB] mt-0.5"
            aria-label="Cerrar panel"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body — scrollable, padded */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {children}
        </div>
      </div>
    </div>
  )
}

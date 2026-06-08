'use client'

import { useEffect, useCallback } from 'react'
import { AlertTriangle, X } from 'lucide-react'

interface ConfirmDialogProps {
  abierto: boolean
  titulo: string
  descripcion: string
  labelConfirmar?: string
  colorConfirmar?: 'red' | 'blue'
  onCancelar: () => void
  onConfirmar: () => void
}

export default function ConfirmDialog({
  abierto,
  titulo,
  descripcion,
  labelConfirmar = 'Confirmar',
  colorConfirmar = 'red',
  onCancelar,
  onConfirmar,
}: ConfirmDialogProps) {
  const handleEsc = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancelar()
    },
    [onCancelar]
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

  const confirmBg = colorConfirmar === 'red' ? '#EF4444' : '#1F6CF0'
  const confirmHover = colorConfirmar === 'red' ? '#DC2626' : '#1557C9'

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onCancelar}
        aria-hidden="true"
      />

      <div
        className="relative bg-white rounded-2xl border border-[#E8EDF4] shadow-xl w-full max-w-sm"
        style={{ boxShadow: '0 20px 60px -12px rgba(21,35,59,.22)' }}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-titulo"
      >
        <div className="flex items-start justify-between px-5 pt-5 pb-4">
          <div className="flex items-start gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: colorConfirmar === 'red' ? '#FDECEC' : '#EAF2FE' }}
            >
              <AlertTriangle
                size={18}
                style={{ color: colorConfirmar === 'red' ? '#EF4444' : '#1F6CF0' }}
              />
            </div>
            <div>
              <h3 id="confirm-titulo" className="text-[14px] font-bold text-[#15233B]">
                {titulo}
              </h3>
              <p className="text-[12.5px] text-[#5A6B85] mt-1 leading-relaxed">{descripcion}</p>
            </div>
          </div>
          <button
            onClick={onCancelar}
            className="ml-2 shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-[#97A4B8] hover:text-[#5A6B85] hover:bg-[#F4F7FB] transition-all"
          >
            <X size={14} />
          </button>
        </div>

        <div className="px-5 pb-5 flex justify-end gap-2">
          <button
            onClick={onCancelar}
            className="px-[15px] py-[8px] rounded-[11px] border border-[#E8EDF4] bg-white text-[13px] font-semibold text-[#5A6B85] hover:bg-[#F9FBFE] hover:text-[#15233B] transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirmar}
            className="px-[15px] py-[8px] rounded-[11px] text-[13px] font-semibold text-white transition-all"
            style={{ background: confirmBg }}
            onMouseEnter={(e) => (e.currentTarget.style.background = confirmHover)}
            onMouseLeave={(e) => (e.currentTarget.style.background = confirmBg)}
          >
            {labelConfirmar}
          </button>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState, useCallback, useRef } from 'react'

export type ToastTipo = 'success' | 'error' | 'warning'

export interface ToastState {
  mensaje: string
  tipo: ToastTipo
  visible: boolean
}

export function useToast(duracionMs = 3500) {
  const [toast, setToast] = useState<ToastState>({
    mensaje: '',
    tipo: 'success',
    visible: false,
  })
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const mostrarToast = useCallback(
    (mensaje: string, tipo: ToastTipo = 'success') => {
      if (timerRef.current) clearTimeout(timerRef.current)
      setToast({ mensaje, tipo, visible: true })
      timerRef.current = setTimeout(
        () => setToast((t) => ({ ...t, visible: false })),
        duracionMs
      )
    },
    [duracionMs]
  )

  const cerrarToast = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setToast((t) => ({ ...t, visible: false }))
  }, [])

  return { toast, mostrarToast, cerrarToast }
}

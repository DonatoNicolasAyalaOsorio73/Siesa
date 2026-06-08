'use client'

import { useAppContext } from '@/context/AppContext'
import { useManufacturaContext } from '@/context/ManufacturaContext'
import { useCalidadContext } from '@/context/CalidadContext'

export default function CargandoGlobal({ children }: { children: React.ReactNode }) {
  const { cargando: cApp } = useAppContext()
  const { cargando: cMfg } = useManufacturaContext()
  const { cargando: cCal } = useCalidadContext()

  const cargando = cApp || cMfg || cCal

  return (
    <>
      {cargando && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4"
          style={{ background: 'rgba(244,246,250,0.92)', backdropFilter: 'blur(4px)' }}
        >
          <div className="flex flex-col items-center gap-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: '#1A1A2E' }}
            >
              <svg viewBox="0 0 28 28" className="w-7 h-7 fill-white">
                <rect x="3" y="3" width="9" height="9" rx="2" />
                <rect x="16" y="3" width="9" height="9" rx="2" opacity=".6" />
                <rect x="3" y="16" width="9" height="9" rx="2" opacity=".6" />
                <rect x="16" y="16" width="9" height="9" rx="2" opacity=".3" />
              </svg>
            </div>
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-2 h-2 rounded-full"
                  style={{
                    background: '#6EC1E4',
                    animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                  }}
                />
              ))}
            </div>
            <p className="text-sm font-medium" style={{ color: '#5A6B85' }}>
              Cargando datos desde Google Sheets…
            </p>
          </div>
          <style>{`
            @keyframes pulse {
              0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
              40% { opacity: 1; transform: scale(1); }
            }
          `}</style>
        </div>
      )}
      {children}
    </>
  )
}

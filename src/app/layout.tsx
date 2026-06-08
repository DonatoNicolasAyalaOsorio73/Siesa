import type { Metadata } from 'next'
import './globals.css'
import { AppProvider } from '@/context/AppContext'
import { ManufacturaProvider } from '@/context/ManufacturaContext'
import { CalidadProvider } from '@/context/CalidadContext'
import SidebarWrapper from '@/components/SidebarWrapper'
import CargandoGlobal from '@/components/CargandoGlobal'

export const metadata: Metadata = {
  title: 'SIESA MES — Manufacturing Execution System',
  description: 'Sistema de Ejecución de Manufactura | Siesa Enterprise',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="font-figtree antialiased">
        <AppProvider>
          <ManufacturaProvider>
            <CalidadProvider>
              <CargandoGlobal>
                <SidebarWrapper>{children}</SidebarWrapper>
              </CargandoGlobal>
            </CalidadProvider>
          </ManufacturaProvider>
        </AppProvider>
      </body>
    </html>
  )
}

'use client'

import { useState } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'

export default function SidebarWrapper({ children }: { children: React.ReactNode }) {
  const [sidebarAbierto, setSidebarAbierto] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-[#F4F7FB]">
      <Sidebar
        isOpen={sidebarAbierto}
        onClose={() => setSidebarAbierto(false)}
      />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header onMenuClick={() => setSidebarAbierto((v) => !v)} />

        <main className="flex-1 overflow-y-auto bg-[#F4F7FB] p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}

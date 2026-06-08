'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { cargarDeSheets, pushASheets } from '@/lib/sheetsSync'

// ─── TIPOS ────────────────────────────────────────────────────────────────────

export interface CentroTrabajo {
  id: string
  nombre: string
  tipo: 'MAQUINARIA' | 'INSPECCION' | 'ENSAMBLE'
  capacidadHoraDia: number
  operador: string
  estado: 'OPERATIVO' | 'MANTENIMIENTO' | 'INACTIVO'
  eficiencia: number
  costoHora: number
}

export interface Operacion {
  orden: number
  nombre: string
  centroTrabajoId: string
  tiempoSetupMin: number
  tiempoOperacionMin: number
}

export interface Ruta {
  id: string
  nombre: string
  producto: string
  version: string
  estado: 'ACTIVA' | 'BORRADOR' | 'OBSOLETA'
  costoManoObraHora: number
  operaciones: Operacion[]
}

export interface BomComponente {
  id: string
  componente: string
  codigo: string
  nivel: number
  cantidad: number
  unidad: string
  costoUnitario: number
  proveedor: string
  leadTimeDias: number
}

export interface BomProducto {
  productoId: string
  producto: string
  version: string
  componentes: BomComponente[]
}

export interface RegistroTiempo {
  id: string
  ordenId: string
  centroTrabajoId: string
  operario: string
  operacion: string
  fechaInicio: string
  fechaFin: string | null
  duracionMin: number | null
  cantidadProducida: number
  observaciones: string
  estado: 'EN_CURSO' | 'FINALIZADO' | 'CANCELADO'
}

// ─── INTERFAZ DEL CONTEXTO ────────────────────────────────────────────────────

interface ManufacturaState {
  centros: CentroTrabajo[]
  rutas: Ruta[]
  bom: BomProducto[]
  registrosTiempos: RegistroTiempo[]
  cargando: boolean
  // Centros CRUD
  crearCentro: (data: Omit<CentroTrabajo, 'id'>) => void
  editarCentro: (id: string, data: Partial<CentroTrabajo>) => void
  eliminarCentro: (id: string) => void
  // Rutas CRUD
  crearRuta: (data: Omit<Ruta, 'id'>) => void
  editarRuta: (id: string, data: Partial<Ruta>) => void
  eliminarRuta: (id: string) => void
  // BOM CRUD
  crearBomProducto: (productoId: string, producto: string, version: string) => void
  crearBomItem: (productoId: string, item: Omit<BomComponente, 'id'>) => void
  editarBomItem: (productoId: string, itemId: string, data: Partial<BomComponente>) => void
  eliminarBomItem: (productoId: string, itemId: string) => void
  // Registros de tiempo CRUD
  agregarRegistroTiempo: (data: Omit<RegistroTiempo, 'id'>) => void
  editarRegistroTiempo: (id: string, data: Partial<RegistroTiempo>) => void
  eliminarRegistroTiempo: (id: string) => void
}

const ManufacturaContext = createContext<ManufacturaState | null>(null)

// ─── PROVEEDOR ────────────────────────────────────────────────────────────────

export function ManufacturaProvider({ children }: { children: ReactNode }) {
  const [centros, setCentros] = useState<CentroTrabajo[]>([])
  const [rutasState, setRutasState] = useState<Ruta[]>([])
  const [bom, setBom] = useState<BomProducto[]>([])
  const [registrosTiempos, setRegistrosTiempos] = useState<RegistroTiempo[]>([])
  const [cargando, setCargando] = useState(true)

  // Fuente de verdad: Google Sheets
  useEffect(() => {
    const safety = setTimeout(() => setCargando(false), 15000)
    Promise.all([
      cargarDeSheets<CentroTrabajo>('centros'),
      cargarDeSheets<Ruta>('rutas'),
      cargarDeSheets<BomProducto>('bom'),
      cargarDeSheets<RegistroTiempo>('registrosTiempos'),
    ]).then(([c, r, b, rt]) => {
      clearTimeout(safety)
      if (c && c.length > 0) setCentros(c)
      if (r && r.length > 0) setRutasState(r)
      if (b && b.length > 0) setBom(b)
      if (rt && rt.length > 0) setRegistrosTiempos(rt)
      setCargando(false)
    }).catch(() => { clearTimeout(safety); setCargando(false) })
  }, [])

  // ── Centros ──────────────────────────────────────────────────────────────────

  const crearCentro = useCallback((data: Omit<CentroTrabajo, 'id'>) => {
    const nuevo: CentroTrabajo = {
      ...data,
      id: `CT-${Date.now().toString().slice(-6)}`,
    }
    setCentros((prev) => [...prev, nuevo])
    pushASheets('centros', 'POST', nuevo as unknown as Record<string, unknown>)
  }, [])

  const editarCentro = useCallback((id: string, data: Partial<CentroTrabajo>) => {
    setCentros((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...data } : c))
    )
    pushASheets('centros', 'PUT', { id, ...data } as unknown as Record<string, unknown>)
  }, [])

  const eliminarCentro = useCallback((id: string) => {
    setCentros((prev) => prev.filter((c) => c.id !== id))
    pushASheets('centros', 'DELETE', { id })
  }, [])

  // ── Rutas ────────────────────────────────────────────────────────────────────

  const crearRuta = useCallback((data: Omit<Ruta, 'id'>) => {
    const nueva: Ruta = {
      ...data,
      id: `RUT-${Date.now().toString().slice(-6)}`,
    }
    setRutasState((prev) => [...prev, nueva])
    pushASheets('rutas', 'POST', nueva as unknown as Record<string, unknown>)
  }, [])

  const editarRuta = useCallback((id: string, data: Partial<Ruta>) => {
    setRutasState((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...data } : r))
    )
    pushASheets('rutas', 'PUT', { id, ...data } as unknown as Record<string, unknown>)
  }, [])

  const eliminarRuta = useCallback((id: string) => {
    setRutasState((prev) => prev.filter((r) => r.id !== id))
    pushASheets('rutas', 'DELETE', { id })
  }, [])

  // ── BOM ──────────────────────────────────────────────────────────────────────

  const crearBomProducto = useCallback((productoId: string, producto: string, version: string) => {
    const nuevo: BomProducto = { productoId, producto, version, componentes: [] }
    setBom((prev) => {
      if (prev.some((p) => p.productoId === productoId)) return prev
      pushASheets('bom', 'POST', nuevo as unknown as Record<string, unknown>)
      return [...prev, nuevo]
    })
  }, [])

  const crearBomItem = useCallback((productoId: string, item: Omit<BomComponente, 'id'>) => {
    const newItem: BomComponente = {
      ...item,
      id: `MAT-${Date.now().toString().slice(-6)}`,
    }
    setBom((prev) => {
      const updated = prev.map((p) =>
        p.productoId === productoId
          ? { ...p, componentes: [...p.componentes, newItem] }
          : p
      )
      const entry = updated.find((p) => p.productoId === productoId)
      if (entry) pushASheets('bom', 'PUT', { id: entry.productoId, ...entry } as unknown as Record<string, unknown>)
      return updated
    })
  }, [])

  const editarBomItem = useCallback((productoId: string, itemId: string, data: Partial<BomComponente>) => {
    setBom((prev) => {
      const updated = prev.map((p) =>
        p.productoId === productoId
          ? {
              ...p,
              componentes: p.componentes.map((c) =>
                c.id === itemId ? { ...c, ...data } : c
              ),
            }
          : p
      )
      const entry = updated.find((p) => p.productoId === productoId)
      if (entry) pushASheets('bom', 'PUT', { id: entry.productoId, ...entry } as unknown as Record<string, unknown>)
      return updated
    })
  }, [])

  const eliminarBomItem = useCallback((productoId: string, itemId: string) => {
    setBom((prev) => {
      const updated = prev.map((p) =>
        p.productoId === productoId
          ? { ...p, componentes: p.componentes.filter((c) => c.id !== itemId) }
          : p
      )
      const entry = updated.find((p) => p.productoId === productoId)
      if (entry) pushASheets('bom', 'PUT', { id: entry.productoId, ...entry } as unknown as Record<string, unknown>)
      return updated
    })
  }, [])

  // ── Registros de tiempo ───────────────────────────────────────────────────────

  const agregarRegistroTiempo = useCallback((data: Omit<RegistroTiempo, 'id'>) => {
    const nuevo: RegistroTiempo = {
      ...data,
      id: `RT-${Date.now().toString().slice(-6)}`,
    }
    setRegistrosTiempos((prev) => [...prev, nuevo])
    pushASheets('registrosTiempos', 'POST', nuevo as unknown as Record<string, unknown>)
  }, [])

  const editarRegistroTiempo = useCallback((id: string, data: Partial<RegistroTiempo>) => {
    setRegistrosTiempos((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...data } : r))
    )
    pushASheets('registrosTiempos', 'PUT', { id, ...data } as unknown as Record<string, unknown>)
  }, [])

  const eliminarRegistroTiempo = useCallback((id: string) => {
    setRegistrosTiempos((prev) => prev.filter((r) => r.id !== id))
    pushASheets('registrosTiempos', 'DELETE', { id })
  }, [])

  return (
    <ManufacturaContext.Provider
      value={{
        centros,
        rutas: rutasState,
        bom,
        registrosTiempos,
        cargando,
        crearCentro,
        editarCentro,
        eliminarCentro,
        crearRuta,
        editarRuta,
        eliminarRuta,
        crearBomProducto,
        crearBomItem,
        editarBomItem,
        eliminarBomItem,
        agregarRegistroTiempo,
        editarRegistroTiempo,
        eliminarRegistroTiempo,
      }}
    >
      {children}
    </ManufacturaContext.Provider>
  )
}

// ─── HOOK ─────────────────────────────────────────────────────────────────────

export function useManufacturaContext(): ManufacturaState {
  const ctx = useContext(ManufacturaContext)
  if (!ctx) throw new Error('useManufacturaContext debe usarse dentro de ManufacturaProvider')
  return ctx
}

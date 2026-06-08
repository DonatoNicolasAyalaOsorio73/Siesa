'use client'

import {
  createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode,
} from 'react'
import { useAppContext } from '@/context/AppContext'
import type { OrdenProduccion } from '@/context/AppContext'
import { cargarDeSheets, pushASheets } from '@/lib/sheetsSync'

// ─── TIPOS ───────────────────────────────────────────────────────────────────

export interface ResultadoParametro {
  parametro: string
  valorNominal: number
  tolerancia: number
  unidad: string
  critico: boolean
  valorMedido: number | null
  aprobado: boolean | null
}

export interface Inspeccion {
  id: string
  ordenId: string
  loteId: string
  producto: string
  lineaProduccion: string
  operario: string
  fichaTecnicaId: string
  fechaDisparo: string
  estado: 'PENDIENTE' | 'EN_PROCESO' | 'APROBADA' | 'RECHAZADA'
  inspector: string | null
  resultados: ResultadoParametro[]
  observaciones: string
  tiempoSimuladoMin?: number
}

export interface NoConformidad {
  id: string
  ordenId: string
  loteId: string
  producto: string
  lineaProduccion: string
  tipoDefecto: string
  descripcion: string
  cantidadAfectada: number
  severidad: 'CRITICA' | 'MAYOR' | 'MENOR'
  inspector: string
  fecha: string
  accionCorrectiva: string
  estadoCierre: 'ABIERTA' | 'EN_PROCESO' | 'CERRADA'
  notas: { texto: string; fecha: string }[]
}

export interface EventoTrazabilidad {
  id: string
  tipo:
    | 'INICIO_PRODUCCION'
    | 'OPERACION_COMPLETADA'
    | 'INSPECCION_DISPARADA'
    | 'NO_CONFORMIDAD'
    | 'ORDEN_DETENIDA'
    | 'INSPECCION_APROBADA'
  ordenId: string
  loteId: string
  descripcion: string
  actor: string
  timestamp: string
  modulo: 'MANUFACTURA' | 'CALIDAD'
}

export interface Criterio {
  parametro: string
  valorNominal: number
  tolerancia: number
  unidad: string
  critico: boolean
}

export interface FichaTecnica {
  id: string
  producto: string
  version: string
  nivelAceptableCalidad: number
  frecuenciaMuestreo: string
  tamanoMuestra: number
  criterios: Criterio[]
}

interface CalidadState {
  inspecciones: Inspeccion[]
  noConformidades: NoConformidad[]
  trazabilidad: EventoTrazabilidad[]
  ordenes: OrdenProduccion[]
  fichasMutable: FichaTecnica[]
  cargando: boolean
  aprobarInspeccion: (id: string, resultados: ResultadoParametro[], observaciones: string) => void
  rechazarInspeccion: (id: string, resultados: ResultadoParametro[], observaciones: string, motivo: string) => void
  cambiarInspector: (id: string, inspector: string) => void
  agregarNotaNC: (ncId: string, nota: string) => void
  cambiarEstadoCierreNC: (ncId: string, estado: 'ABIERTA' | 'EN_PROCESO' | 'CERRADA') => void
  // CRUD NC Manual
  crearNCManual: (data: Omit<NoConformidad, 'id' | 'fecha' | 'estadoCierre' | 'notas'>) => void
  editarAccionCorrectiva: (ncId: string, accion: string) => void
  eliminarNC: (ncId: string) => void
  // CRUD Fichas
  crearFicha: (data: Omit<FichaTecnica, 'id'>) => void
  editarFicha: (id: string, data: Partial<FichaTecnica>) => void
  eliminarFicha: (id: string) => void
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function crearInspeccionDesdeOrden(orden: OrdenProduccion): Inspeccion {
  return {
    id: `INS-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    ordenId: orden.id,
    loteId: orden.loteId,
    producto: orden.producto,
    lineaProduccion: orden.lineaProduccion,
    operario: orden.operario,
    fichaTecnicaId: orden.fichaTecnicaId,
    fechaDisparo: new Date().toISOString(),
    estado: 'PENDIENTE',
    inspector: null,
    resultados: [],
    observaciones: '',
  }
}

// ─── CONTEXTO ─────────────────────────────────────────────────────────────────

const CalidadContext = createContext<CalidadState | null>(null)

export function CalidadProvider({ children }: { children: ReactNode }) {
  const { ordenes, ordenesConInspeccionPendiente, rechazarLote: appRechazarLote, resolverInspeccionPendiente, crearAlerta } = useAppContext()

  const [inspecciones, setInspecciones] = useState<Inspeccion[]>([])
  const [noConformidades, setNoConformidades] = useState<NoConformidad[]>([])
  const [trazabilidad, setTrazabilidad] = useState<EventoTrazabilidad[]>([])
  const [fichasMutable, setFichasMutable] = useState<FichaTecnica[]>([])
  const [cargando, setCargando] = useState(true)

  // Fuente de verdad: Google Sheets
  useEffect(() => {
    const safety = setTimeout(() => setCargando(false), 15000)
    Promise.all([
      cargarDeSheets<Inspeccion>('inspecciones'),
      cargarDeSheets<NoConformidad>('noConformidades'),
      cargarDeSheets<FichaTecnica>('fichas'),
      cargarDeSheets<EventoTrazabilidad>('trazabilidad'),
    ]).then(([ins, ncs, fic, trz]) => {
      clearTimeout(safety)
      if (ins && ins.length > 0) setInspecciones(ins)
      if (ncs && ncs.length > 0) setNoConformidades(ncs)
      if (fic && fic.length > 0) setFichasMutable(fic)
      if (trz && trz.length > 0) setTrazabilidad(trz)
      setCargando(false)
    }).catch(() => { clearTimeout(safety); setCargando(false) })
  }, [])

  // Refs para evitar stale closures sin agregar inspecciones/ordenes al dep array
  const inspeccionesRef = useRef(inspecciones)
  const ordenesRef = useRef(ordenes)
  useEffect(() => { inspeccionesRef.current = inspecciones }, [inspecciones])
  useEffect(() => { ordenesRef.current = ordenes }, [ordenes])

  // Sincroniza nuevas inspecciones cuando Manufactura completa operaciones
  useEffect(() => {
    const nuevasIds = ordenesConInspeccionPendiente.filter(
      (oid) => !inspeccionesRef.current.some((i) => i.ordenId === oid)
    )
    if (nuevasIds.length === 0) return

    const nuevasInsp = nuevasIds
      .map((oid) => ordenesRef.current.find((o) => o.id === oid))
      .filter((o): o is OrdenProduccion => Boolean(o))
      .map(crearInspeccionDesdeOrden)

    setInspecciones((prev) => [...prev, ...nuevasInsp])
    // Persistir inspecciones nuevas en Sheets para que sobrevivan un reload
    nuevasInsp.forEach((ins) =>
      pushASheets('inspecciones', 'POST', ins as unknown as Record<string, unknown>)
    )

    const nuevosEventos: EventoTrazabilidad[] = nuevasInsp.map((ins) => ({
      id: `TR-${Date.now()}-${ins.id}`,
      tipo: 'INSPECCION_DISPARADA',
      ordenId: ins.ordenId,
      loteId: ins.loteId,
      descripcion: 'Inspección de calidad generada automáticamente al completar operación',
      actor: 'Sistema',
      timestamp: ins.fechaDisparo,
      modulo: 'CALIDAD',
    }))
    setTrazabilidad((prev) => [...prev, ...nuevosEventos])
    nuevosEventos.forEach((ev) =>
      pushASheets('trazabilidad', 'POST', ev as unknown as Record<string, unknown>)
    )
  }, [ordenesConInspeccionPendiente])

  const aprobarInspeccion = useCallback(
    (id: string, resultados: ResultadoParametro[], observaciones: string) => {
      const ins = inspecciones.find((i) => i.id === id)
      if (!ins) return

      setInspecciones((prev) =>
        prev.map((i) => (i.id === id ? { ...i, estado: 'APROBADA', resultados, observaciones } : i))
      )
      pushASheets('inspecciones', 'PUT', { id, estado: 'APROBADA', resultados, observaciones } as unknown as Record<string, unknown>)

      const evento: EventoTrazabilidad = {
        id: `TR-${Date.now()}`,
        tipo: 'INSPECCION_APROBADA',
        ordenId: ins.ordenId,
        loteId: ins.loteId,
        descripcion: `Lote ${ins.loteId} aprobado por control de calidad`,
        actor: ins.inspector ?? 'Inspector',
        timestamp: new Date().toISOString(),
        modulo: 'CALIDAD',
      }
      setTrazabilidad((prev) => [...prev, evento])
      pushASheets('trazabilidad', 'POST', evento as unknown as Record<string, unknown>)

      resolverInspeccionPendiente(ins.ordenId)

      crearAlerta({
        tipo: 'INSPECCION_APROBADA',
        mensaje: `Lote ${ins.loteId} aprobado por Calidad`,
        detalle: `Inspector: ${ins.inspector ?? 'Inspector'} · ${observaciones || 'Sin observaciones'}`,
        ordenId: ins.ordenId,
        loteId: ins.loteId,
        link: '/calidad/inspecciones',
        modulo: 'CALIDAD',
      })
    },
    [inspecciones, resolverInspeccionPendiente, crearAlerta]
  )

  const rechazarInspeccion = useCallback(
    (id: string, resultados: ResultadoParametro[], observaciones: string, motivo: string) => {
      const ins = inspecciones.find((i) => i.id === id)
      if (!ins) return

      setInspecciones((prev) =>
        prev.map((i) => (i.id === id ? { ...i, estado: 'RECHAZADA', resultados, observaciones } : i))
      )
      pushASheets('inspecciones', 'PUT', { id, estado: 'RECHAZADA', resultados, observaciones } as unknown as Record<string, unknown>)

      const criticosFallidos = resultados.filter((r) => r.critico && r.aprobado === false)
      const severidad: NoConformidad['severidad'] = criticosFallidos.length > 0
        ? 'CRITICA'
        : resultados.some((r) => r.aprobado === false)
        ? 'MAYOR'
        : 'MENOR'

      const nuevaNC: NoConformidad = {
        id: `NC-${Date.now().toString().slice(-5)}`,
        ordenId: ins.ordenId,
        loteId: ins.loteId,
        producto: ins.producto,
        lineaProduccion: ins.lineaProduccion,
        tipoDefecto: motivo || 'Parámetro fuera de especificación',
        descripcion: observaciones || `Lote ${ins.loteId} rechazado en inspección ${id}`,
        cantidadAfectada: 0,
        severidad,
        inspector: ins.inspector ?? 'Inspector',
        fecha: new Date().toISOString(),
        accionCorrectiva: '',
        estadoCierre: 'ABIERTA',
        notas: [],
      }
      setNoConformidades((prev) => [nuevaNC, ...prev])
      pushASheets('noConformidades', 'POST', nuevaNC as unknown as Record<string, unknown>)

      const ahora = new Date().toISOString()
      const eventosNuevos: EventoTrazabilidad[] = [
        {
          id: `TR-${Date.now()}-nc`,
          tipo: 'NO_CONFORMIDAD',
          ordenId: ins.ordenId,
          loteId: ins.loteId,
          descripcion: `${nuevaNC.id} registrada — ${severidad}: ${motivo}`,
          actor: ins.inspector ?? 'Inspector',
          timestamp: ahora,
          modulo: 'CALIDAD',
        },
        {
          id: `TR-${Date.now()}-det`,
          tipo: 'ORDEN_DETENIDA',
          ordenId: ins.ordenId,
          loteId: ins.loteId,
          descripcion: `Orden ${ins.ordenId} detenida por rechazo de lote`,
          actor: 'Sistema',
          timestamp: ahora,
          modulo: 'MANUFACTURA',
        },
      ]
      setTrazabilidad((prev) => [...prev, ...eventosNuevos])
      eventosNuevos.forEach((ev) => pushASheets('trazabilidad', 'POST', ev as unknown as Record<string, unknown>))

      resolverInspeccionPendiente(ins.ordenId)
      appRechazarLote(ins.loteId, ins.ordenId)

      crearAlerta({
        tipo: 'NC_CREADA',
        mensaje: `NC ${nuevaNC.id} registrada — ${severidad}`,
        detalle: `${motivo || 'Parámetro fuera de especificación'} · Orden ${ins.ordenId}`,
        ordenId: ins.ordenId,
        loteId: ins.loteId,
        link: '/calidad/no-conformidades',
        modulo: 'CALIDAD',
      })
    },
    [inspecciones, resolverInspeccionPendiente, appRechazarLote, crearAlerta]
  )

  const cambiarInspector = useCallback((id: string, inspector: string) => {
    const ins = inspecciones.find((i) => i.id === id)
    setInspecciones((prev) =>
      prev.map((i) => (i.id === id ? { ...i, inspector, estado: 'EN_PROCESO' } : i))
    )
    pushASheets('inspecciones', 'PUT', { id, inspector, estado: 'EN_PROCESO' })
    if (ins) {
      crearAlerta({
        tipo: 'INSPECCION_ASIGNADA',
        mensaje: `Inspección ${id} asignada a ${inspector}`,
        detalle: `Lote ${ins.loteId} · ${ins.producto}`,
        ordenId: ins.ordenId,
        loteId: ins.loteId,
        link: '/calidad/inspecciones',
        modulo: 'CALIDAD',
      })
    }
  }, [inspecciones, crearAlerta])

  const agregarNotaNC = useCallback((ncId: string, nota: string) => {
    const nc = noConformidades.find((n) => n.id === ncId)
    if (!nc) return
    const notasActualizadas = [...nc.notas, { texto: nota, fecha: new Date().toISOString() }]
    setNoConformidades((prev) =>
      prev.map((n) => (n.id === ncId ? { ...n, notas: notasActualizadas } : n))
    )
    pushASheets('noConformidades', 'PUT', { id: ncId, notas: notasActualizadas } as unknown as Record<string, unknown>)
  }, [noConformidades])

  const cambiarEstadoCierreNC = useCallback(
    (ncId: string, estado: 'ABIERTA' | 'EN_PROCESO' | 'CERRADA') => {
      const nc = noConformidades.find((n) => n.id === ncId)
      setNoConformidades((prev) =>
        prev.map((n) => (n.id === ncId ? { ...n, estadoCierre: estado } : n))
      )
      pushASheets('noConformidades', 'PUT', { id: ncId, estadoCierre: estado })
      if (nc && estado === 'CERRADA') {
        crearAlerta({
          tipo: 'NC_CERRADA',
          mensaje: `NC ${ncId} cerrada`,
          detalle: `${nc.tipoDefecto} · Orden ${nc.ordenId}`,
          ordenId: nc.ordenId,
          loteId: nc.loteId,
          link: '/calidad/no-conformidades',
          modulo: 'CALIDAD',
        })
      }
    },
    [noConformidades, crearAlerta]
  )

  // ── CRUD NC Manual ─────────────────────────────────────────────────────────

  const crearNCManual = useCallback(
    (data: Omit<NoConformidad, 'id' | 'fecha' | 'estadoCierre' | 'notas'>) => {
      const nueva: NoConformidad = {
        ...data,
        id: `NC-${Date.now().toString().slice(-5)}`,
        fecha: new Date().toISOString(),
        estadoCierre: 'ABIERTA',
        notas: [],
      }
      setNoConformidades((prev) => [nueva, ...prev])
      pushASheets('noConformidades', 'POST', nueva as unknown as Record<string, unknown>)
    },
    []
  )

  const editarAccionCorrectiva = useCallback((ncId: string, accion: string) => {
    setNoConformidades((prev) =>
      prev.map((nc) => (nc.id === ncId ? { ...nc, accionCorrectiva: accion } : nc))
    )
    pushASheets('noConformidades', 'PUT', { id: ncId, accionCorrectiva: accion })
  }, [])

  const eliminarNC = useCallback((ncId: string) => {
    setNoConformidades((prev) => prev.filter((nc) => nc.id !== ncId))
    pushASheets('noConformidades', 'DELETE', { id: ncId })
  }, [])

  // ── CRUD Fichas ────────────────────────────────────────────────────────────

  const crearFicha = useCallback((data: Omit<FichaTecnica, 'id'>) => {
    const nueva: FichaTecnica = {
      ...data,
      id: `FT-${Date.now().toString().slice(-5)}`,
    }
    setFichasMutable((prev) => [...prev, nueva])
    pushASheets('fichas', 'POST', nueva as unknown as Record<string, unknown>)
  }, [])

  const editarFicha = useCallback((id: string, data: Partial<FichaTecnica>) => {
    setFichasMutable((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...data } : f))
    )
    pushASheets('fichas', 'PUT', { id, ...data } as unknown as Record<string, unknown>)
  }, [])

  const eliminarFicha = useCallback((id: string) => {
    setFichasMutable((prev) => prev.filter((f) => f.id !== id))
    pushASheets('fichas', 'DELETE', { id })
  }, [])

  return (
    <CalidadContext.Provider
      value={{
        inspecciones,
        noConformidades,
        trazabilidad,
        ordenes,
        fichasMutable,
        cargando,
        aprobarInspeccion,
        rechazarInspeccion,
        cambiarInspector,
        agregarNotaNC,
        cambiarEstadoCierreNC,
        crearNCManual,
        editarAccionCorrectiva,
        eliminarNC,
        crearFicha,
        editarFicha,
        eliminarFicha,
      }}
    >
      {children}
    </CalidadContext.Provider>
  )
}

export function useCalidadContext(): CalidadState {
  const ctx = useContext(CalidadContext)
  if (!ctx) throw new Error('useCalidadContext debe usarse dentro de CalidadProvider')
  return ctx
}

// ─── HELPER EXPORTADO: TIEMPO DE ESPERA ──────────────────────────────────────

export function tiempoEsperaMin(inspeccion: Inspeccion): number {
  if (inspeccion.tiempoSimuladoMin !== undefined) return inspeccion.tiempoSimuladoMin
  const diffMs = Date.now() - new Date(inspeccion.fechaDisparo).getTime()
  return Math.max(0, Math.floor(diffMs / 60_000))
}

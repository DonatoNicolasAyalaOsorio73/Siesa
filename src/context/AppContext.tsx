'use client'

import { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from 'react'
import { cargarDeSheets, pushASheets } from '@/lib/sheetsSync'
import { calcularProgresoOperacion } from '@/lib/manufactura'

// ─── TIPOS ───────────────────────────────────────────────────────────────────

export interface OrdenProduccion {
  id: string
  producto: string
  fichaTecnicaId: string
  rutaId: string
  lineaProduccion: string
  cantidadPlanificada: number
  cantidadProducida: number
  cantidadRechazada: number
  estado: 'PENDIENTE' | 'EN_PROCESO' | 'COMPLETADA' | 'DETENIDA'
  prioridad: 'ALTA' | 'MEDIA' | 'BAJA'
  operario: string
  fechaInicio: string
  fechaFin: string | null
  operacionActual: { nombre: string; indice: number; total: number }
  requiereInspeccion: boolean
  loteId: string
}

export interface ResultadoInspeccion {
  parametro: string
  valorMedido: number
  valorNominal: number
  tolerancia: number
  unidad: string
  aprobado: boolean
  critico: boolean
}

export interface Muestra {
  id: string
  ordenId: string
  loteId: string
  producto: string
  fechaRegistro: string
  inspector: string
  estado: 'PENDIENTE' | 'APROBADA' | 'RECHAZADA' | 'EN_REVISION'
  resultados: ResultadoInspeccion[]
  observaciones: string
}

export interface Alerta {
  id: string
  tipo:
    | 'INSPECCION_REQUERIDA'
    | 'INSPECCION_APROBADA'
    | 'INSPECCION_ASIGNADA'
    | 'LOTE_RECHAZADO'
    | 'NC_CREADA'
    | 'NC_CERRADA'
    | 'TIEMPO_EXCEDIDO'
    | 'MAQUINA_DETENIDA'
    | 'MUESTRA_APROBADA'
    | 'MUESTRA_RECHAZADA'
  mensaje: string
  detalle?: string
  ordenId?: string
  loteId?: string
  link?: string
  timestamp: string
  leida: boolean
  modulo: 'MANUFACTURA' | 'CALIDAD'
}

// ─── TIPOS PREDICCIÓN IA ─────────────────────────────────────────────────────

export interface OrdenCriticaIA {
  ordenId: string
  producto: string
  riesgo: 'ALTO' | 'MEDIO' | 'BAJO'
  puntuacion: number
  factoresRiesgo: string[]
  recomendacion: string
}

export interface AlertaPredictivaIA {
  tipo: string
  descripcion: string
  probabilidad: number
  impactoEstimado: string
}

export interface PrediccionIA {
  nivelRiesgoGlobal: 'ALTO' | 'MEDIO' | 'BAJO'
  puntuacionRiesgo: number
  ordenesCriticas: OrdenCriticaIA[]
  patronesDetectados: string[]
  alertasPredictivas: AlertaPredictivaIA[]
  resumenEjecutivo: string
  timestamp: string
}

// ─── ESTADO GLOBAL ───────────────────────────────────────────────────────────

interface AppState {
  ordenes: OrdenProduccion[]
  muestras: Muestra[]
  alertas: Alerta[]
  cargando: boolean
  notificacionesCount: number
  ordenesConInspeccionPendiente: string[]
  lotesRechazados: string[]
  prediccionIA: PrediccionIA | null
  completarOperacion: (ordenId: string) => void
  rechazarLote: (loteId: string, ordenId: string) => void
  resolverInspeccionPendiente: (ordenId: string) => void
  marcarAlertaLeida: (alertaId: string) => void
  marcarTodasLeidas: () => void
  eliminarAlerta: (alertaId: string) => void
  crearAlerta: (data: Omit<Alerta, 'id' | 'timestamp' | 'leida'>) => void
  crearAlertaLocal: (data: Omit<Alerta, 'id' | 'timestamp' | 'leida'>, synId?: string) => void
  setPrediccionIA: (p: PrediccionIA | null) => void
  // CRUD Órdenes
  crearOrden: (data: Omit<OrdenProduccion, 'id' | 'loteId' | 'cantidadProducida' | 'cantidadRechazada' | 'fechaFin' | 'operacionActual'>) => void
  editarOrden: (id: string, data: Partial<OrdenProduccion>) => void
  eliminarOrden: (id: string) => void
  iniciarOrden: (id: string) => void
  // Muestras
  setMuestras: (m: Muestra[]) => void
  agregarMuestra: (m: Muestra) => void
  actualizarMuestra: (id: string, data: Partial<Muestra>) => void
}

const AppContext = createContext<AppState | null>(null)

// ─── PROVEEDOR ───────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: ReactNode }) {
  const [ordenes, setOrdenes] = useState<OrdenProduccion[]>([])
  const [muestras, setMuestras] = useState<Muestra[]>([])
  const [alertas, setAlertas] = useState<Alerta[]>([])
  const [cargando, setCargando] = useState(true)
  const [ordenesConInspeccionPendiente, setOrdenesConInspeccionPendiente] = useState<string[]>([])
  const [lotesRechazados, setLotesRechazados] = useState<string[]>([])
  const [prediccionIA, setPrediccionIA] = useState<PrediccionIA | null>(null)

  // Ref para leer ordenes actuales sin stale closures
  const ordenesRef = useRef(ordenes)
  useEffect(() => { ordenesRef.current = ordenes }, [ordenes])

  function cargarTodo() {
    setCargando(true)
    const safety = setTimeout(() => setCargando(false), 15000)
    Promise.all([
      cargarDeSheets<OrdenProduccion>('ordenes'),
      cargarDeSheets<Muestra>('muestras'),
      cargarDeSheets<Alerta>('alertas'),
    ]).then(([ord, mue, ale]) => {
      clearTimeout(safety)
      if (ord && ord.length > 0) {
        setOrdenes(ord)
        // Deduplicar IDs al cargar (protección contra filas duplicadas en Sheets)
        setOrdenesConInspeccionPendiente(Array.from(new Set(ord.filter((o) => o.requiereInspeccion).map((o) => o.id))))
        setLotesRechazados(Array.from(new Set(ord.filter((o) => o.estado === 'DETENIDA').map((o) => o.loteId))))
      }
      if (mue && mue.length > 0) setMuestras(mue)
      // Alertas: cargar existentes + sintetizar en memoria para estados activos sin alerta previa
      {
        const loaded = ale ?? []
        const synAlerts: Alerta[] = []
        if (ord && ord.length > 0) {
          const idsInspAlert = new Set(loaded.filter((a) => a.tipo === 'INSPECCION_REQUERIDA').map((a) => a.ordenId))
          const idsRechAlert = new Set(loaded.filter((a) => a.tipo === 'LOTE_RECHAZADO').map((a) => a.ordenId))
          ord.filter((o) => o.requiereInspeccion && !idsInspAlert.has(o.id)).forEach((o) =>
            synAlerts.push({ id: `SYN-INS-${o.id}`, tipo: 'INSPECCION_REQUERIDA', mensaje: `Orden ${o.id} requiere inspección de calidad`, detalle: `${o.producto} · Lote ${o.loteId}`, ordenId: o.id, loteId: o.loteId, link: '/calidad/inspecciones', modulo: 'CALIDAD', timestamp: o.fechaInicio, leida: false })
          )
          ord.filter((o) => o.estado === 'DETENIDA' && !idsRechAlert.has(o.id)).forEach((o) =>
            synAlerts.push({ id: `SYN-REC-${o.id}`, tipo: 'LOTE_RECHAZADO', mensaje: `Lote ${o.loteId} rechazado — Orden ${o.id} detenida`, detalle: `${o.producto} · requiere acción correctiva`, ordenId: o.id, loteId: o.loteId, link: '/calidad/no-conformidades', modulo: 'CALIDAD', timestamp: o.fechaInicio, leida: false })
          )
        }
        if (loaded.length > 0 || synAlerts.length > 0) setAlertas([...loaded, ...synAlerts])
      }
      setCargando(false)
    }).catch(() => { clearTimeout(safety); setCargando(false) })
  }

  // Fuente de verdad: Google Sheets
  useEffect(() => { cargarTodo() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const notificacionesCount = alertas.filter((a) => !a.leida).length

  const crearAlerta = useCallback((data: Omit<Alerta, 'id' | 'timestamp' | 'leida'>) => {
    const nueva: Alerta = {
      ...data,
      id: `ALT-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      timestamp: new Date().toISOString(),
      leida: false,
    }
    setAlertas((prev) => [nueva, ...prev])
    pushASheets('alertas', 'POST', nueva as unknown as Record<string, unknown>)
  }, [])

  // Igual que crearAlerta pero NO persiste en Sheets; para alertas sintéticas de datos históricos
  const crearAlertaLocal = useCallback((data: Omit<Alerta, 'id' | 'timestamp' | 'leida'>, synId?: string) => {
    const id = synId ?? `ALT-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`
    setAlertas((prev) => {
      if (prev.some((a) => a.id === id)) return prev
      return [{ ...data, id, timestamp: new Date().toISOString(), leida: false }, ...prev]
    })
  }, [])

  const completarOperacion = useCallback((ordenId: string) => {
    const orden = ordenesRef.current.find((o) => o.id === ordenId)
    if (!orden) return

    const { nuevoIndice, esCompletada, requiereInspeccion } = calcularProgresoOperacion(
      orden.operacionActual,
      orden.requiereInspeccion,
    )
    const updated: OrdenProduccion = {
      ...orden,
      operacionActual: { ...orden.operacionActual, indice: nuevoIndice },
      estado: esCompletada ? 'COMPLETADA' : orden.estado,
      fechaFin: esCompletada ? new Date().toISOString() : orden.fechaFin,
      requiereInspeccion,
    }
    setOrdenes((prev) => prev.map((o) => (o.id === ordenId ? updated : o)))
    pushASheets('ordenes', 'PUT', updated as unknown as Record<string, unknown>)

    // Solo disparar inspección cuando la orden pasa a requerirla por primera vez
    if (requiereInspeccion && !orden.requiereInspeccion) {
      setOrdenesConInspeccionPendiente((prev) =>
        prev.includes(ordenId) ? prev : [...prev, ordenId]
      )
      crearAlerta({
        tipo: 'INSPECCION_REQUERIDA',
        mensaje: `Orden ${ordenId} requiere inspección de calidad`,
        detalle: `${orden.producto} · Lote ${orden.loteId}`,
        ordenId,
        loteId: orden.loteId,
        link: '/calidad/inspecciones',
        modulo: 'CALIDAD',
      })
    }
  }, [crearAlerta])

  // Limpia el flag de inspección pendiente cuando una inspección se cierra (aprobada o rechazada)
  const resolverInspeccionPendiente = useCallback((ordenId: string) => {
    setOrdenesConInspeccionPendiente((prev) => prev.filter((id) => id !== ordenId))
    // Eliminar también la alerta sintética de sesión para que desaparezca sin reload
    setAlertas((prev) => prev.filter((a) => a.id !== `SYN-INS-${ordenId}`))
    const orden = ordenesRef.current.find((o) => o.id === ordenId)
    if (orden && orden.requiereInspeccion) {
      const updated = { ...orden, requiereInspeccion: false }
      setOrdenes((prev) => prev.map((o) => (o.id === ordenId ? updated : o)))
      pushASheets('ordenes', 'PUT', { id: ordenId, requiereInspeccion: false })
    }
  }, [])

  const rechazarLote = useCallback((loteId: string, ordenId: string) => {
    const orden = ordenesRef.current.find((o) => o.id === ordenId)
    if (orden) {
      const updated: OrdenProduccion = { ...orden, estado: 'DETENIDA' }
      setOrdenes((prev) => prev.map((o) => (o.id === ordenId ? updated : o)))
      pushASheets('ordenes', 'PUT', updated as unknown as Record<string, unknown>)
    }
    setLotesRechazados((prev) =>
      prev.includes(loteId) ? prev : [...prev, loteId]
    )
    crearAlerta({
      tipo: 'LOTE_RECHAZADO',
      mensaje: `Lote ${loteId} rechazado — Orden ${ordenId} detenida`,
      detalle: 'Inspección de calidad falló. Se requiere acción correctiva.',
      ordenId,
      loteId,
      link: '/calidad/no-conformidades',
      modulo: 'CALIDAD',
    })
  }, [crearAlerta])

  const marcarAlertaLeida = useCallback((alertaId: string) => {
    setAlertas((prev) =>
      prev.map((a) => (a.id === alertaId ? { ...a, leida: true } : a))
    )
    if (!alertaId.startsWith('SYN-')) pushASheets('alertas', 'PUT', { id: alertaId, leida: true })
  }, [])

  const marcarTodasLeidas = useCallback(() => {
    setAlertas((prev) => {
      prev.filter((a) => !a.leida && !a.id.startsWith('SYN-')).forEach((a) =>
        pushASheets('alertas', 'PUT', { id: a.id, leida: true })
      )
      return prev.map((a) => ({ ...a, leida: true }))
    })
  }, [])

  const eliminarAlerta = useCallback((alertaId: string) => {
    setAlertas((prev) => prev.filter((a) => a.id !== alertaId))
    if (!alertaId.startsWith('SYN-')) pushASheets('alertas', 'DELETE', { id: alertaId })
  }, [])

  // ── CRUD Órdenes ─────────────────────────────────────────────────────────────

  const crearOrden = useCallback((
    data: Omit<OrdenProduccion, 'id' | 'loteId' | 'cantidadProducida' | 'cantidadRechazada' | 'fechaFin' | 'operacionActual'>
  ) => {
    const id = `OP-${new Date().getFullYear()}-${String(ordenesRef.current.length + 1 + (Date.now() % 100)).padStart(3, '0')}`
    const ultimaLetra = data.lineaProduccion.charAt(data.lineaProduccion.length - 1)
    const loteId = `LOT-${ultimaLetra}-${Date.now().toString().slice(-3)}`
    const nueva: OrdenProduccion = {
      ...data,
      id,
      loteId,
      cantidadProducida: 0,
      cantidadRechazada: 0,
      fechaFin: null,
      operacionActual: { nombre: 'Pendiente', indice: 0, total: 1 },
    }
    setOrdenes((prev) => [...prev, nueva])
    pushASheets('ordenes', 'POST', nueva as unknown as Record<string, unknown>)
  }, [])

  const editarOrden = useCallback((id: string, data: Partial<OrdenProduccion>) => {
    setOrdenes((prev) =>
      prev.map((o) => (o.id === id ? { ...o, ...data } : o))
    )
    pushASheets('ordenes', 'PUT', { id, ...data } as unknown as Record<string, unknown>)
  }, [])

  const eliminarOrden = useCallback((id: string) => {
    setOrdenes((prev) => prev.filter((o) => o.id !== id))
    pushASheets('ordenes', 'DELETE', { id })
  }, [])

  const iniciarOrden = useCallback((id: string) => {
    const fechaInicio = new Date().toISOString()
    setOrdenes((prev) =>
      prev.map((o) =>
        o.id === id && o.estado === 'PENDIENTE'
          ? { ...o, estado: 'EN_PROCESO', fechaInicio }
          : o
      )
    )
    pushASheets('ordenes', 'PUT', { id, estado: 'EN_PROCESO', fechaInicio })
  }, [])

  const agregarMuestra = useCallback((m: Muestra) => {
    setMuestras((prev) => [...prev, m])
    pushASheets('muestras', 'POST', m as unknown as Record<string, unknown>)
  }, [])

  const actualizarMuestra = useCallback((id: string, data: Partial<Muestra>) => {
    setMuestras((prev) => prev.map((m) => (m.id === id ? { ...m, ...data } : m)))
    pushASheets('muestras', 'PUT', { id, ...data } as unknown as Record<string, unknown>)
  }, [])

  return (
    <AppContext.Provider
      value={{
        ordenes,
        muestras,
        alertas,
        cargando,
        notificacionesCount,
        ordenesConInspeccionPendiente,
        lotesRechazados,
        completarOperacion,
        rechazarLote,
        resolverInspeccionPendiente,
        marcarAlertaLeida,
        marcarTodasLeidas,
        eliminarAlerta,
        crearAlerta,
        crearAlertaLocal,
        prediccionIA,
        setPrediccionIA,
        crearOrden,
        editarOrden,
        eliminarOrden,
        iniciarOrden,
        setMuestras,
        agregarMuestra,
        actualizarMuestra,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

// ─── HOOK ─────────────────────────────────────────────────────────────────────

export function useAppContext(): AppState {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useAppContext debe usarse dentro de AppProvider')
  return ctx
}

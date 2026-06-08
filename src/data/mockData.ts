// ─── TIPOS ───────────────────────────────────────────────────────────────────

export type EstadoOrden = 'PENDIENTE' | 'EN_PROCESO' | 'COMPLETADA' | 'DETENIDA'
export type PrioridadOrden = 'ALTA' | 'MEDIA' | 'BAJA'
export type EstadoMaquina = 'OPERATIVO' | 'MANTENIMIENTO' | 'INACTIVO'
export type TipoCentro = 'MAQUINARIA' | 'INSPECCION' | 'ENSAMBLE'
export type EstadoRuta = 'ACTIVA' | 'BORRADOR' | 'OBSOLETA'

// ─── RUTAS ────────────────────────────────────────────────────────────────────

export const rutas = [
  {
    id: 'RUT-001',
    nombre: 'Ruta Válvulas Estándar',
    producto: 'Válvula de Escape XR-500',
    version: 'v2.1',
    estado: 'ACTIVA' as EstadoRuta,
    costoManoObraHora: 35000,
    operaciones: [
      { orden: 1, nombre: 'Torneado CNC', centroTrabajoId: 'CT-001', tiempoSetupMin: 15, tiempoOperacionMin: 8 },
      { orden: 2, nombre: 'Fresado', centroTrabajoId: 'CT-002', tiempoSetupMin: 10, tiempoOperacionMin: 12 },
      { orden: 3, nombre: 'Tratamiento Térmico', centroTrabajoId: 'CT-003', tiempoSetupMin: 30, tiempoOperacionMin: 45 },
      { orden: 4, nombre: 'Rectificado', centroTrabajoId: 'CT-004', tiempoSetupMin: 10, tiempoOperacionMin: 6 },
      { orden: 5, nombre: 'Inspección Final', centroTrabajoId: 'CT-005', tiempoSetupMin: 5, tiempoOperacionMin: 4 },
    ],
  },
  {
    id: 'RUT-002',
    nombre: 'Ruta Pistones Premium',
    producto: 'Pistón Motor 4L-200',
    version: 'v1.3',
    estado: 'ACTIVA' as EstadoRuta,
    costoManoObraHora: 42000,
    operaciones: [
      { orden: 1, nombre: 'Fundición', centroTrabajoId: 'CT-006', tiempoSetupMin: 45, tiempoOperacionMin: 60 },
      { orden: 2, nombre: 'Mecanizado CNC', centroTrabajoId: 'CT-001', tiempoSetupMin: 20, tiempoOperacionMin: 25 },
      { orden: 3, nombre: 'Anodizado', centroTrabajoId: 'CT-007', tiempoSetupMin: 15, tiempoOperacionMin: 30 },
      { orden: 4, nombre: 'Control Dimensional', centroTrabajoId: 'CT-005', tiempoSetupMin: 5, tiempoOperacionMin: 8 },
    ],
  },
]

// ─── CENTROS DE TRABAJO ──────────────────────────────────────────────────────

export const centrosTrabajo = [
  {
    id: 'CT-001',
    nombre: 'Torno CNC Mazak #1',
    tipo: 'MAQUINARIA' as TipoCentro,
    capacidadHoraDia: 8,
    operador: 'Carlos Mendoza',
    estado: 'OPERATIVO' as EstadoMaquina,
    eficiencia: 0.94,
    costoHora: 85000,
  },
  {
    id: 'CT-002',
    nombre: 'Fresadora DMG #1',
    tipo: 'MAQUINARIA' as TipoCentro,
    capacidadHoraDia: 8,
    operador: 'Ana Ríos',
    estado: 'OPERATIVO' as EstadoMaquina,
    eficiencia: 0.88,
    costoHora: 72000,
  },
  {
    id: 'CT-003',
    nombre: 'Horno Tratamiento Térmico',
    tipo: 'MAQUINARIA' as TipoCentro,
    capacidadHoraDia: 16,
    operador: 'Miguel Torres',
    estado: 'MANTENIMIENTO' as EstadoMaquina,
    eficiencia: 0,
    costoHora: 45000,
  },
  {
    id: 'CT-004',
    nombre: 'Rectificadora Studer',
    tipo: 'MAQUINARIA' as TipoCentro,
    capacidadHoraDia: 8,
    operador: 'Pedro Salcedo',
    estado: 'OPERATIVO' as EstadoMaquina,
    eficiencia: 0.91,
    costoHora: 68000,
  },
  {
    id: 'CT-005',
    nombre: 'Estación de Calidad',
    tipo: 'INSPECCION' as TipoCentro,
    capacidadHoraDia: 8,
    operador: 'Laura Gómez',
    estado: 'OPERATIVO' as EstadoMaquina,
    eficiencia: 1.0,
    costoHora: 55000,
  },
]

// ─── FICHAS TÉCNICAS ─────────────────────────────────────────────────────────

export const fichasTecnicas = [
  {
    id: 'FT-001',
    producto: 'Válvula de Escape XR-500',
    version: 'v3.0',
    nivelAceptableCalidad: 0.025,
    frecuenciaMuestreo: 'Cada 50 unidades',
    tamanoMuestra: 5,
    criterios: [
      { parametro: 'Diámetro exterior', valorNominal: 25.4, tolerancia: 0.02, unidad: 'mm', critico: true },
      { parametro: 'Dureza superficial', valorNominal: 58, tolerancia: 2, unidad: 'HRC', critico: true },
      { parametro: 'Rugosidad Ra', valorNominal: 0.8, tolerancia: 0.2, unidad: 'μm', critico: false },
      { parametro: 'Presión de prueba', valorNominal: 150, tolerancia: 5, unidad: 'PSI', critico: true },
    ],
  },
  {
    id: 'FT-002',
    producto: 'Pistón Motor 4L-200',
    version: 'v2.1',
    nivelAceptableCalidad: 0.015,
    frecuenciaMuestreo: 'Cada 25 unidades',
    tamanoMuestra: 8,
    criterios: [
      { parametro: 'Diámetro pistón', valorNominal: 89.0, tolerancia: 0.01, unidad: 'mm', critico: true },
      { parametro: 'Peso', valorNominal: 485, tolerancia: 5, unidad: 'g', critico: false },
      { parametro: 'Dureza superficial', valorNominal: 55, tolerancia: 3, unidad: 'HRC', critico: true },
      { parametro: 'Concentricidad', valorNominal: 0, tolerancia: 0.05, unidad: 'mm', critico: true },
    ],
  },
]

// ─── ÓRDENES DE PRODUCCIÓN ───────────────────────────────────────────────────

export const ordenesIniciales = [
  {
    id: 'OP-2024-001',
    producto: 'Válvula de Escape XR-500',
    fichaTecnicaId: 'FT-001',
    rutaId: 'RUT-001',
    lineaProduccion: 'Línea A',
    cantidadPlanificada: 500,
    cantidadProducida: 387,
    cantidadRechazada: 0,
    estado: 'EN_PROCESO' as EstadoOrden,
    prioridad: 'ALTA' as PrioridadOrden,
    operario: 'Carlos Mendoza',
    fechaInicio: '2024-01-15T06:00:00',
    fechaFin: null as string | null,
    operacionActual: { nombre: 'Rectificado', indice: 4, total: 5 },
    requiereInspeccion: false,
    loteId: 'LOT-A-001',
  },
  {
    id: 'OP-2024-002',
    producto: 'Pistón Motor 4L-200',
    fichaTecnicaId: 'FT-001',
    rutaId: 'RUT-002',
    lineaProduccion: 'Línea B',
    cantidadPlanificada: 200,
    cantidadProducida: 200,
    cantidadRechazada: 12,
    estado: 'COMPLETADA' as EstadoOrden,
    prioridad: 'MEDIA' as PrioridadOrden,
    operario: 'Ana Ríos',
    fechaInicio: '2024-01-14T07:00:00',
    fechaFin: '2024-01-15T16:30:00' as string | null,
    operacionActual: { nombre: 'Control Dimensional', indice: 4, total: 4 },
    requiereInspeccion: true,
    loteId: 'LOT-B-002',
  },
  {
    id: 'OP-2024-003',
    producto: 'Válvula de Escape XR-500',
    fichaTecnicaId: 'FT-001',
    rutaId: 'RUT-001',
    lineaProduccion: 'Línea A',
    cantidadPlanificada: 300,
    cantidadProducida: 145,
    cantidadRechazada: 23,
    estado: 'DETENIDA' as EstadoOrden,
    prioridad: 'ALTA' as PrioridadOrden,
    operario: 'Pedro Salcedo',
    fechaInicio: '2024-01-15T08:00:00',
    fechaFin: null as string | null,
    operacionActual: { nombre: 'Fresado', indice: 2, total: 5 },
    requiereInspeccion: false,
    loteId: 'LOT-A-003',
  },
  {
    id: 'OP-2024-004',
    producto: 'Pistón Motor 4L-200',
    fichaTecnicaId: 'FT-001',
    rutaId: 'RUT-002',
    lineaProduccion: 'Línea C',
    cantidadPlanificada: 150,
    cantidadProducida: 0,
    cantidadRechazada: 0,
    estado: 'PENDIENTE' as EstadoOrden,
    prioridad: 'BAJA' as PrioridadOrden,
    operario: 'Miguel Torres',
    fechaInicio: '2024-01-16T06:00:00',
    fechaFin: null as string | null,
    operacionActual: { nombre: 'Fundición', indice: 0, total: 4 },
    requiereInspeccion: false,
    loteId: 'LOT-C-004',
  },
]

// ─── MUESTRAS ─────────────────────────────────────────────────────────────────

export const muestrasIniciales = [
  {
    id: 'MUE-001',
    ordenId: 'OP-2024-002',
    loteId: 'LOT-B-002',
    producto: 'Pistón Motor 4L-200',
    fechaRegistro: '2024-01-15T16:40:00',
    inspector: 'Laura Gómez',
    estado: 'PENDIENTE' as const,
    resultados: [
      { parametro: 'Diámetro pistón', valorMedido: 89.0, valorNominal: 89.0, tolerancia: 0.01, unidad: 'mm', aprobado: true, critico: true },
      { parametro: 'Peso', valorMedido: 492, valorNominal: 485, tolerancia: 5, unidad: 'g', aprobado: false, critico: false },
      { parametro: 'Dureza superficial', valorMedido: 56, valorNominal: 55, tolerancia: 3, unidad: 'HRC', aprobado: true, critico: true },
    ],
    observaciones: 'Peso ligeramente fuera de tolerancia en 3 de 8 muestras',
  },
]

// ─── ALERTAS INICIALES ────────────────────────────────────────────────────────

export const alertasIniciales = [
  {
    id: 'ALT-001',
    tipo: 'INSPECCION_REQUERIDA' as const,
    mensaje: 'Lote LOT-B-002 requiere inspección de calidad',
    detalle: 'OP-2024-002 completó producción — 200 unidades listas para revisión',
    ordenId: 'OP-2024-002',
    loteId: 'LOT-B-002',
    link: '/calidad/inspecciones',
    timestamp: '2024-01-15T16:35:00',
    leida: false,
    modulo: 'CALIDAD' as const,
  },
  {
    id: 'ALT-002',
    tipo: 'LOTE_RECHAZADO' as const,
    mensaje: 'Lote LOT-A-003 rechazado — Orden OP-2024-003 detenida',
    detalle: 'NC-001 registrada: 23 unidades con dureza superficial fuera de tolerancia',
    ordenId: 'OP-2024-003',
    loteId: 'LOT-A-003',
    link: '/calidad/no-conformidades',
    timestamp: '2024-01-15T10:20:00',
    leida: false,
    modulo: 'CALIDAD' as const,
  },
  {
    id: 'ALT-003',
    tipo: 'MAQUINA_DETENIDA' as const,
    mensaje: 'Horno Tratamiento Térmico (CT-003) en mantenimiento',
    detalle: 'Mantenimiento preventivo programado — tiempo estimado: 4 horas',
    link: '/manufactura/centros-trabajo',
    timestamp: '2024-01-15T07:00:00',
    leida: true,
    modulo: 'MANUFACTURA' as const,
  },
]

// ─── KPIs CALCULADOS ─────────────────────────────────────────────────────────

export const calcularKPIs = (ordenes: typeof ordenesIniciales) => ({
  ordenesActivas: ordenes.filter((o) => o.estado === 'EN_PROCESO').length,
  inspeccionesPendientes: ordenes.filter((o) => o.requiereInspeccion).length,
  firstPassYield: (() => {
    const completadas = ordenes.filter((o) => o.estado === 'COMPLETADA')
    if (!completadas.length) return 0
    const total = completadas.reduce((sum, o) => sum + o.cantidadPlanificada, 0)
    const rechazadas = completadas.reduce((sum, o) => sum + o.cantidadRechazada, 0)
    return Math.round(((total - rechazadas) / total) * 100)
  })(),
  alertasCriticas: ordenes.filter((o) => o.estado === 'DETENIDA').length,
})

// ─── FETCH DESDE GOOGLE SHEETS (servidor) ────────────────────────────────────

const PUBLISHED_ID = '2PACX-1vQsPU676mE9kv7nlj8HRT6xjEE-kGAtvTkRumjYHURd0OPc9iv_gHpzrhXVcIJZOg'
const SHEET_ID = '1HwHCUEfGPRG8mpiEEV1qKjSbTqS2dnz3'

export async function fetchSheet<T>(
  sheetName: string,
  mapper: (r: (string | number | boolean | null)[]) => T
): Promise<T[]> {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`
    const res = await fetch(url, { next: { revalidate: 30 } })
    const text = await res.text()
    if (text.startsWith('google.visualization')) {
      const json = JSON.parse(text.substring(47).slice(0, -2))
      return (json.table.rows as { c: { v: string | number | boolean | null }[] }[])
        .filter((row) => row.c?.[0]?.v != null)
        .map((row) => mapper(row.c.map((c) => c?.v ?? null)))
    }
    throw new Error('Not gviz format')
  } catch {
    try {
      const csvUrl = `https://docs.google.com/spreadsheets/d/e/${PUBLISHED_ID}/pub?output=csv&sheet=${encodeURIComponent(sheetName)}`
      const res = await fetch(csvUrl, { next: { revalidate: 30 } })
      const text = await res.text()
      const rows = text.split('\n').slice(1)
      return rows
        .filter((row) => row.trim())
        .map((row) => {
          const cols = row.split(',').map((c) => c.replace(/^"|"$/g, '').trim())
          return mapper(cols)
        })
    } catch (e) {
      console.error(`Sheet fetch failed [${sheetName}]:`, e)
      return []
    }
  }
}

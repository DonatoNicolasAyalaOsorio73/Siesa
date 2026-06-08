import { NextResponse } from 'next/server'
import { inicializarHoja, leerHoja, agregarFilas } from '@/lib/googleSheets'
import { ordenesIniciales, muestrasIniciales, alertasIniciales, fichasTecnicas, centrosTrabajo, rutas } from '@/data/mockData'
import { listaMateriales } from '@/data/manufacturaData'

// ─── DATOS INICIALES ──────────────────────────────────────────────────────────

const inspeccionesIniciales = [
  {
    id: 'INS-001',
    ordenId: 'OP-2024-002',
    loteId: 'LOT-B-002',
    producto: 'Pistón Motor 4L-200',
    lineaProduccion: 'Línea B',
    operario: 'Ana Ríos',
    fichaTecnicaId: 'FT-001',
    fechaDisparo: '2024-01-15T16:35:00',
    estado: 'PENDIENTE',
    inspector: null,
    resultados: [],
    observaciones: '',
  },
]

const noConformidadesIniciales = [
  {
    id: 'NC-001',
    ordenId: 'OP-2024-003',
    loteId: 'LOT-A-003',
    producto: 'Válvula de Escape XR-500',
    lineaProduccion: 'Línea A',
    tipoDefecto: 'Dureza fuera de especificación',
    descripcion: '23 unidades presentan dureza superficial de 44 HRC, por debajo del mínimo de 56 HRC.',
    cantidadAfectada: 23,
    severidad: 'CRITICA',
    inspector: 'Laura Gómez',
    fecha: '2024-01-15T10:20:00',
    accionCorrectiva: 'Revisión del proceso de tratamiento térmico en Fresadora DMG #1.',
    estadoCierre: 'EN_PROCESO',
    notas: [{ texto: 'Temperatura de horno fuera de rango (+12 °C sobre el setpoint).', fecha: '2024-01-15T11:30:00' }],
  },
]

const trazabilidadInicial = [
  { id: 'TR-001', tipo: 'INICIO_PRODUCCION', ordenId: 'OP-2024-001', loteId: 'LOT-A-001', descripcion: 'Orden iniciada en Línea A', actor: 'Carlos Mendoza', timestamp: '2024-01-15T06:00:00', modulo: 'MANUFACTURA' },
  { id: 'TR-002', tipo: 'OPERACION_COMPLETADA', ordenId: 'OP-2024-001', loteId: 'LOT-A-001', descripcion: 'Torneado CNC completado — 387 unidades', actor: 'Carlos Mendoza', timestamp: '2024-01-15T07:23:00', modulo: 'MANUFACTURA' },
  { id: 'TR-003', tipo: 'OPERACION_COMPLETADA', ordenId: 'OP-2024-001', loteId: 'LOT-A-001', descripcion: 'Fresado completado', actor: 'Carlos Mendoza', timestamp: '2024-01-15T09:45:00', modulo: 'MANUFACTURA' },
  { id: 'TR-004', tipo: 'OPERACION_COMPLETADA', ordenId: 'OP-2024-001', loteId: 'LOT-A-001', descripcion: 'Tratamiento Térmico completado', actor: 'Carlos Mendoza', timestamp: '2024-01-15T14:20:00', modulo: 'MANUFACTURA' },
  { id: 'TR-005', tipo: 'INICIO_PRODUCCION', ordenId: 'OP-2024-002', loteId: 'LOT-B-002', descripcion: 'Orden iniciada en Línea B', actor: 'Ana Ríos', timestamp: '2024-01-14T07:00:00', modulo: 'MANUFACTURA' },
  { id: 'TR-006', tipo: 'OPERACION_COMPLETADA', ordenId: 'OP-2024-002', loteId: 'LOT-B-002', descripcion: 'Fundición completada — 200 unidades', actor: 'Ana Ríos', timestamp: '2024-01-14T11:30:00', modulo: 'MANUFACTURA' },
  { id: 'TR-007', tipo: 'OPERACION_COMPLETADA', ordenId: 'OP-2024-002', loteId: 'LOT-B-002', descripcion: 'Mecanizado CNC · Anodizado · Control Dimensional completados', actor: 'Ana Ríos', timestamp: '2024-01-15T16:30:00', modulo: 'MANUFACTURA' },
  { id: 'TR-008', tipo: 'INSPECCION_DISPARADA', ordenId: 'OP-2024-002', loteId: 'LOT-B-002', descripcion: 'Inspección de calidad generada automáticamente al completar producción', actor: 'Sistema', timestamp: '2024-01-15T16:35:00', modulo: 'CALIDAD' },
  { id: 'TR-009', tipo: 'INICIO_PRODUCCION', ordenId: 'OP-2024-003', loteId: 'LOT-A-003', descripcion: 'Orden iniciada en Línea A', actor: 'Pedro Salcedo', timestamp: '2024-01-15T08:00:00', modulo: 'MANUFACTURA' },
  { id: 'TR-010', tipo: 'OPERACION_COMPLETADA', ordenId: 'OP-2024-003', loteId: 'LOT-A-003', descripcion: 'Torneado CNC completado — 145 unidades procesadas', actor: 'Pedro Salcedo', timestamp: '2024-01-15T09:15:00', modulo: 'MANUFACTURA' },
  { id: 'TR-011', tipo: 'NO_CONFORMIDAD', ordenId: 'OP-2024-003', loteId: 'LOT-A-003', descripcion: 'NC-001 registrada — 23 unidades rechazadas: Dureza superficial fuera de tolerancia', actor: 'Laura Gómez', timestamp: '2024-01-15T10:20:00', modulo: 'CALIDAD' },
  { id: 'TR-012', tipo: 'ORDEN_DETENIDA', ordenId: 'OP-2024-003', loteId: 'LOT-A-003', descripcion: 'Orden detenida por rechazo de lote — 23 unidades no conformes (15.9%)', actor: 'Sistema', timestamp: '2024-01-15T10:21:00', modulo: 'MANUFACTURA' },
]

// BOM transformado al formato del contexto
const bomInicial = listaMateriales.map((p) => ({
  productoId: p.productoId,
  producto: p.producto,
  version: 'v1.0',
  componentes: p.componentes.map((c) => ({
    id: c.id,
    componente: c.componente,
    codigo: c.id,
    nivel: 1,
    cantidad: c.cantidad,
    unidad: c.unidad,
    costoUnitario: c.costoUnitario,
    proveedor: c.proveedor,
    leadTimeDias: 7,
  })),
}))

// ─── ESQUEMAS ─────────────────────────────────────────────────────────────────

const TABLAS: Record<string, { headers: string[]; datos: unknown[] }> = {
  ordenes: {
    headers: ['id','producto','fichaTecnicaId','rutaId','lineaProduccion','cantidadPlanificada','cantidadProducida','cantidadRechazada','estado','prioridad','operario','fechaInicio','fechaFin','operacionActual','requiereInspeccion','loteId'],
    datos: ordenesIniciales,
  },
  muestras: {
    headers: ['id','ordenId','loteId','producto','fechaRegistro','inspector','estado','resultados','observaciones'],
    datos: muestrasIniciales,
  },
  alertas: {
    headers: ['id','tipo','mensaje','detalle','ordenId','loteId','link','timestamp','leida','modulo'],
    datos: alertasIniciales,
  },
  inspecciones: {
    headers: ['id','ordenId','loteId','producto','lineaProduccion','operario','fichaTecnicaId','fechaDisparo','estado','inspector','resultados','observaciones'],
    datos: inspeccionesIniciales,
  },
  noConformidades: {
    headers: ['id','ordenId','loteId','producto','lineaProduccion','tipoDefecto','descripcion','cantidadAfectada','severidad','inspector','fecha','accionCorrectiva','estadoCierre','notas'],
    datos: noConformidadesIniciales,
  },
  fichas: {
    headers: ['id','producto','version','nivelAceptableCalidad','frecuenciaMuestreo','tamanoMuestra','criterios'],
    datos: fichasTecnicas,
  },
  registrosTiempos: {
    headers: ['id','ordenId','centroTrabajoId','operario','operacion','fechaInicio','fechaFin','duracionMin','cantidadProducida','observaciones','estado'],
    datos: [],
  },
  centros: {
    headers: ['id','nombre','tipo','capacidadHoraDia','operador','estado','eficiencia','costoHora'],
    datos: centrosTrabajo,
  },
  rutas: {
    headers: ['id','nombre','producto','version','estado','costoManoObraHora','operaciones'],
    datos: rutas,
  },
  bom: {
    headers: ['productoId','producto','version','componentes'],
    datos: bomInicial,
  },
  trazabilidad: {
    headers: ['id','tipo','ordenId','loteId','descripcion','actor','timestamp','modulo'],
    datos: trazabilidadInicial,
  },
}

export async function POST() {
  const key = process.env.GOOGLE_PRIVATE_KEY ?? ''
  if (!(process.env.GOOGLE_SPREADSHEET_ID && process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && key.startsWith('-----BEGIN'))) {
    return NextResponse.json({ error: 'Sheets no configurado' }, { status: 503 })
  }

  const resultado: Record<string, { migrados: number; omitidos: number; estado: string }> = {}

  for (const [tabla, { headers, datos }] of Object.entries(TABLAS)) {
    try {
      await inicializarHoja(tabla, headers)
      const existentes = await leerHoja(tabla) as unknown[]

      if (existentes.length > 0) {
        resultado[tabla] = { migrados: 0, omitidos: existentes.length, estado: 'ya_tenía_datos' }
        continue
      }

      if (datos.length > 0) {
        await agregarFilas(tabla, headers, datos as Record<string, unknown>[])
      }

      resultado[tabla] = { migrados: datos.length, omitidos: 0, estado: 'migrado' }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      resultado[tabla] = { migrados: 0, omitidos: 0, estado: `error: ${msg}` }
    }
  }

  const totalMigrados = Object.values(resultado).reduce((s, r) => s + r.migrados, 0)
  return NextResponse.json({ ok: true, totalMigrados, tablas: resultado })
}

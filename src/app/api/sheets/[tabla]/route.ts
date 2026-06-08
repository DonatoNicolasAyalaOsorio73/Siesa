import { NextRequest, NextResponse } from 'next/server'
import {
  leerHoja,
  agregarFila,
  actualizarFila,
  eliminarFila,
  inicializarHoja,
} from '@/lib/googleSheets'

// ─── CREDENCIALES CONFIGURADAS ────────────────────────────────────────────────

function sheetsConfigurado(): boolean {
  const key = process.env.GOOGLE_PRIVATE_KEY ?? ''
  return !!(
    process.env.GOOGLE_SPREADSHEET_ID &&
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    key.startsWith('-----BEGIN')
  )
}

// ─── ESQUEMAS — columnas por tabla ────────────────────────────────────────────

const SCHEMAS: Record<string, string[]> = {
  ordenes: [
    'id', 'producto', 'fichaTecnicaId', 'rutaId', 'lineaProduccion',
    'cantidadPlanificada', 'cantidadProducida', 'cantidadRechazada',
    'estado', 'prioridad', 'operario', 'fechaInicio', 'fechaFin',
    'operacionActual', 'requiereInspeccion', 'loteId',
  ],
  muestras: [
    'id', 'ordenId', 'loteId', 'producto', 'fechaRegistro',
    'inspector', 'estado', 'resultados', 'observaciones',
  ],
  alertas: [
    'id', 'tipo', 'mensaje', 'detalle', 'ordenId', 'loteId',
    'link', 'timestamp', 'leida', 'modulo',
  ],
  registrosTiempos: [
    'id', 'ordenId', 'centroTrabajoId', 'operario', 'operacion',
    'fechaInicio', 'fechaFin', 'duracionMin', 'cantidadProducida',
    'observaciones', 'estado',
  ],
  noConformidades: [
    'id', 'ordenId', 'loteId', 'producto', 'lineaProduccion',
    'tipoDefecto', 'descripcion', 'cantidadAfectada', 'severidad',
    'inspector', 'fecha', 'accionCorrectiva', 'estadoCierre', 'notas',
  ],
  inspecciones: [
    'id', 'ordenId', 'loteId', 'producto', 'lineaProduccion', 'operario',
    'fichaTecnicaId', 'fechaDisparo', 'estado', 'inspector',
    'resultados', 'observaciones',
  ],
  fichas: [
    'id', 'producto', 'version', 'nivelAceptableCalidad',
    'frecuenciaMuestreo', 'tamanoMuestra', 'criterios',
  ],
  centros: [
    'id', 'nombre', 'tipo', 'capacidadHoraDia',
    'operador', 'estado', 'eficiencia', 'costoHora',
  ],
  rutas: [
    'id', 'nombre', 'producto', 'version',
    'estado', 'costoManoObraHora', 'operaciones',
  ],
  bom: [
    'productoId', 'producto', 'version', 'componentes',
  ],
  trazabilidad: [
    'id', 'tipo', 'ordenId', 'loteId',
    'descripcion', 'actor', 'timestamp', 'modulo',
  ],
}

type Params = { params: { tabla: string } }

function headers(tabla: string) {
  return SCHEMAS[tabla]
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { tabla } = params
  const cols = headers(tabla)
  if (!cols) return NextResponse.json({ error: `Tabla desconocida: ${tabla}` }, { status: 400 })
  if (!sheetsConfigurado()) return NextResponse.json([])
  try {
    await inicializarHoja(tabla, cols)
    const data = await leerHoja(tabla)
    return NextResponse.json(data)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  const { tabla } = params
  const cols = headers(tabla)
  if (!cols) return NextResponse.json({ error: `Tabla desconocida: ${tabla}` }, { status: 400 })
  if (!sheetsConfigurado()) return NextResponse.json({ ok: true, skipped: true })
  try {
    const body = await req.json()
    await agregarFila(tabla, cols, body)
    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  const { tabla } = params
  const cols = headers(tabla)
  if (!cols) return NextResponse.json({ error: `Tabla desconocida: ${tabla}` }, { status: 400 })
  if (!sheetsConfigurado()) return NextResponse.json({ ok: true, skipped: true })
  try {
    const { id, ...data } = await req.json()
    if (!id) return NextResponse.json({ error: 'Se requiere id' }, { status: 400 })
    await actualizarFila(tabla, cols, String(id), data)
    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { tabla } = params
  if (!headers(tabla)) return NextResponse.json({ error: `Tabla desconocida: ${tabla}` }, { status: 400 })
  if (!sheetsConfigurado()) return NextResponse.json({ ok: true, skipped: true })
  try {
    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: 'Se requiere id' }, { status: 400 })
    await eliminarFila(tabla, String(id))
    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

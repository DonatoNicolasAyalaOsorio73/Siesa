import { describe, it, expect } from 'vitest'

// ─── Replica exacta de las funciones internas de googleSheets.ts ─────────────
// Las funciones son privadas, se replican aquí para testear la lógica de
// serialización sin depender de googleapis.

function objectToRow(obj: Record<string, unknown>, headers: string[]): string[] {
  return headers.map((h) => {
    const val = obj[h]
    if (val === null || val === undefined) return ''
    if (typeof val === 'object') return JSON.stringify(val)
    return String(val)
  })
}

function rowsToObjects(rows: string[][]): Record<string, unknown>[] {
  if (!rows || rows.length < 2) return []
  const headers = rows[0]
  return rows.slice(1).filter((r) => r[0]).map((row) => {
    const obj: Record<string, unknown> = {}
    headers.forEach((h, i) => {
      const val = row[i] ?? ''
      if (val === '') { obj[h] = null; return }
      const vLow = val.toLowerCase()
      if (vLow === 'true') { obj[h] = true; return }
      if (vLow === 'false') { obj[h] = false; return }
      if (val.startsWith('{') || val.startsWith('[')) {
        try { obj[h] = JSON.parse(val); return } catch { /* keep as string */ }
      }
      const num = Number(val)
      obj[h] = Number.isFinite(num) && val.trim() !== '' ? num : val
    })
    return obj
  })
}

const BOM_SCHEMA = ['productoId', 'producto', 'version', 'componentes']

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('BOM — ciclo POST → GET en Sheets', () => {
  it('productoId es la columna A (clave de búsqueda para actualizarFila)', () => {
    expect(BOM_SCHEMA[0]).toBe('productoId')
  })

  it('producto nuevo con componentes vacíos serializa correctamente', () => {
    const bom = { productoId: 'FT-001', producto: 'Árbol de Levas K-320', version: 'v1.0', componentes: [] }
    const row = objectToRow(bom as unknown as Record<string, unknown>, BOM_SCHEMA)
    expect(row).toEqual(['FT-001', 'Árbol de Levas K-320', 'v1.0', '[]'])
  })

  it('producto nuevo deserializa igual tras round-trip (simula reload)', () => {
    const bom = { productoId: 'FT-001', producto: 'Árbol de Levas K-320', version: 'v1.0', componentes: [] }
    const row = objectToRow(bom as unknown as Record<string, unknown>, BOM_SCHEMA)
    const [recovered] = rowsToObjects([BOM_SCHEMA, row])
    expect(recovered.productoId).toBe('FT-001')
    expect(recovered.producto).toBe('Árbol de Levas K-320')
    expect(recovered.version).toBe('v1.0')
    expect(recovered.componentes).toEqual([])
  })

  it('componentes con datos numéricos y strings round-trip sin pérdida', () => {
    const componente = {
      id: 'MAT-123456',
      componente: 'Acero Inoxidable 316L',
      codigo: 'ACERO316L',
      nivel: 1,
      cantidad: 2.5,
      unidad: 'kg',
      costoUnitario: 45000,
      proveedor: 'AcerosColombia S.A.',
      leadTimeDias: 7,
    }
    const bom = { productoId: 'FT-002', producto: 'Piñón Cónico', version: 'v2.1', componentes: [componente] }
    const row = objectToRow(bom as unknown as Record<string, unknown>, BOM_SCHEMA)

    // columna D debe ser JSON serializado
    expect(row[3]).toBe(JSON.stringify([componente]))

    const [recovered] = rowsToObjects([BOM_SCHEMA, row])
    expect(recovered.componentes).toEqual([componente])
  })

  it('múltiples componentes round-trip completos', () => {
    const componentes = [
      { id: 'MAT-001', componente: 'Acero', codigo: 'AC01', nivel: 1, cantidad: 3, unidad: 'kg', costoUnitario: 40000, proveedor: 'ProvA', leadTimeDias: 5 },
      { id: 'MAT-002', componente: 'Tornillo M8', codigo: 'TM8', nivel: 1, cantidad: 12, unidad: 'und', costoUnitario: 500, proveedor: 'ProvB', leadTimeDias: 2 },
    ]
    const bom = { productoId: 'FT-003', producto: 'Caja Diferencial', version: 'v3.0', componentes }
    const row = objectToRow(bom as unknown as Record<string, unknown>, BOM_SCHEMA)
    const [recovered] = rowsToObjects([BOM_SCHEMA, row])
    expect((recovered.componentes as typeof componentes).length).toBe(2)
    expect(recovered.componentes).toEqual(componentes)
  })

  it('PUT de crearBomItem usa productoId como id de fila', () => {
    // crearBomItem hace: pushASheets('bom', 'PUT', { id: entry.productoId, ...entry })
    // El API handler extrae: const { id, ...data } = body
    // actualizarFila busca 'id' en columna A (= productoId)
    const entry = {
      productoId: 'FT-001',
      producto: 'Árbol de Levas',
      version: 'v1.0',
      componentes: [{ id: 'MAT-001', componente: 'Acero', codigo: 'AC', nivel: 1, cantidad: 1, unidad: 'kg', costoUnitario: 40000, proveedor: 'P', leadTimeDias: 3 }],
    }
    const putPayload = { id: entry.productoId, ...entry }
    const { id, ...data } = putPayload

    expect(id).toBe('FT-001')

    // La fila resultante debe tener productoId en posición 0 (columna A)
    const row = objectToRow(data as Record<string, unknown>, BOM_SCHEMA)
    expect(row[0]).toBe('FT-001')
  })

  it('varios productos en la hoja — rowsToObjects los devuelve todos', () => {
    const bom1 = { productoId: 'FT-001', producto: 'Prod A', version: 'v1.0', componentes: [] }
    const bom2 = { productoId: 'FT-002', producto: 'Prod B', version: 'v2.0', componentes: [] }
    const rows = [
      BOM_SCHEMA,
      objectToRow(bom1 as unknown as Record<string, unknown>, BOM_SCHEMA),
      objectToRow(bom2 as unknown as Record<string, unknown>, BOM_SCHEMA),
    ]
    const recovered = rowsToObjects(rows)
    expect(recovered.length).toBe(2)
    expect(recovered[0].productoId).toBe('FT-001')
    expect(recovered[1].productoId).toBe('FT-002')
  })

  it('filas sin id (vacías) se filtran en rowsToObjects', () => {
    const bom = { productoId: 'FT-001', producto: 'Prod A', version: 'v1.0', componentes: [] }
    const filaVacia = ['', '', '', '']
    const rows = [
      BOM_SCHEMA,
      objectToRow(bom as unknown as Record<string, unknown>, BOM_SCHEMA),
      filaVacia,
    ]
    const recovered = rowsToObjects(rows)
    expect(recovered.length).toBe(1)
  })
})

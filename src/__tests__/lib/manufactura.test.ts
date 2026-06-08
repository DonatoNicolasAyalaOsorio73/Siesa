import { describe, it, expect } from 'vitest'
import { calcularProgresoOperacion, generarLoteId } from '@/lib/manufactura'

// ─── calcularProgresoOperacion ────────────────────────────────────────────────

describe('calcularProgresoOperacion', () => {
  it('avanza el índice en 1', () => {
    const r = calcularProgresoOperacion({ nombre: 'Torneado', indice: 1, total: 4 }, false)
    expect(r.nuevoIndice).toBe(2)
  })

  it('no supera el total', () => {
    const r = calcularProgresoOperacion({ nombre: 'Última', indice: 4, total: 4 }, false)
    expect(r.nuevoIndice).toBe(4)
  })

  it('marca como completada cuando el nuevo índice alcanza el total', () => {
    const r = calcularProgresoOperacion({ nombre: 'Última', indice: 3, total: 4 }, false)
    expect(r.esCompletada).toBe(true)
  })

  it('no está completada si aún quedan operaciones', () => {
    const r = calcularProgresoOperacion({ nombre: 'Primera', indice: 1, total: 4 }, false)
    expect(r.esCompletada).toBe(false)
  })

  it('requiere inspección cuando se completa la última operación', () => {
    const r = calcularProgresoOperacion({ nombre: 'Final', indice: 3, total: 4 }, false)
    expect(r.requiereInspeccion).toBe(true)
  })

  it('requiere inspección cuando el índice ya estaba en el total (esUltimaOperacion)', () => {
    const r = calcularProgresoOperacion({ nombre: 'Final', indice: 4, total: 4 }, false)
    expect(r.requiereInspeccion).toBe(true)
  })

  it('propaga requiereInspeccion previo aunque no sea la última operación', () => {
    const r = calcularProgresoOperacion({ nombre: 'Segunda', indice: 1, total: 5 }, true)
    expect(r.requiereInspeccion).toBe(true)
  })

  it('no requiere inspección en operaciones intermedias sin flag previo', () => {
    const r = calcularProgresoOperacion({ nombre: 'Segunda', indice: 1, total: 5 }, false)
    expect(r.requiereInspeccion).toBe(false)
  })

  it('orden de una sola operación se completa en el primer avance', () => {
    const r = calcularProgresoOperacion({ nombre: 'Única', indice: 0, total: 1 }, false)
    expect(r.esCompletada).toBe(true)
    expect(r.requiereInspeccion).toBe(true)
  })
})

// ─── generarLoteId ────────────────────────────────────────────────────────────

describe('generarLoteId', () => {
  it('usa la última letra de la línea de producción', () => {
    expect(generarLoteId('Línea A', '001')).toBe('LOT-A-001')
    expect(generarLoteId('Línea B', '042')).toBe('LOT-B-042')
    expect(generarLoteId('Línea C', '999')).toBe('LOT-C-999')
  })

  it('funciona con nombres de línea de un solo carácter', () => {
    expect(generarLoteId('A', '001')).toBe('LOT-A-001')
  })
})

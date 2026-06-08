import { describe, it, expect } from 'vitest'
import { evaluarParametro, calcularSeveridad, calcularFPY, calcularDPM } from '@/lib/calidad'
import type { ResultadoParametro } from '@/context/CalidadContext'

// ─── evaluarParametro ──────────────────────────────────────────────────────────

describe('evaluarParametro', () => {
  it('aprueba cuando el valor está exactamente en el nominal', () => {
    expect(evaluarParametro(25.0, 25.0, 0.1)).toBe(true)
  })

  it('aprueba cuando el valor está claramente dentro de la tolerancia (inferior)', () => {
    // 25.0 - 0.05 = 24.95, diff=0.05 < 0.1 → aprueba
    expect(evaluarParametro(24.95, 25.0, 0.1)).toBe(true)
  })

  it('aprueba cuando el valor está claramente dentro de la tolerancia (superior)', () => {
    // 25.0 + 0.05 = 25.05, diff=0.05 < 0.1 → aprueba
    expect(evaluarParametro(25.05, 25.0, 0.1)).toBe(true)
  })

  it('rechaza cuando el valor supera claramente el límite superior', () => {
    // diff=0.15 > 0.1 → rechaza (sin ambigüedad de float)
    expect(evaluarParametro(25.15, 25.0, 0.1)).toBe(false)
  })

  it('rechaza cuando el valor está claramente por debajo del límite inferior', () => {
    // diff=0.15 > 0.1 → rechaza (sin ambigüedad de float)
    expect(evaluarParametro(24.85, 25.0, 0.1)).toBe(false)
  })

  it('retorna null cuando el valor es NaN', () => {
    expect(evaluarParametro(NaN, 25.0, 0.1)).toBeNull()
  })

  it('maneja tolerancia cero — solo acepta el valor exacto', () => {
    expect(evaluarParametro(25.0, 25.0, 0)).toBe(true)
    expect(evaluarParametro(25.001, 25.0, 0)).toBe(false)
  })

  it('funciona con parámetros grandes (presión, temperatura)', () => {
    expect(evaluarParametro(150, 150, 5)).toBe(true)    // +0 dentro de ±5
    expect(evaluarParametro(155, 150, 5)).toBe(true)    // exactamente en límite
    expect(evaluarParametro(155.1, 150, 5)).toBe(false) // fuera por 0.1
  })
})

// ─── calcularSeveridad ────────────────────────────────────────────────────────

const makeResultado = (
  critico: boolean,
  aprobado: boolean | null,
): ResultadoParametro => ({
  parametro: 'test',
  valorNominal: 10,
  tolerancia: 0.5,
  unidad: 'mm',
  critico,
  valorMedido: aprobado === true ? 10 : aprobado === false ? 20 : null,
  aprobado,
})

describe('calcularSeveridad', () => {
  it('CRITICA cuando un parámetro crítico falla', () => {
    const resultados = [makeResultado(true, false), makeResultado(false, true)]
    expect(calcularSeveridad(resultados)).toBe('CRITICA')
  })

  it('CRITICA cuando múltiples parámetros críticos fallan', () => {
    const resultados = [makeResultado(true, false), makeResultado(true, false)]
    expect(calcularSeveridad(resultados)).toBe('CRITICA')
  })

  it('MAYOR cuando solo falla un parámetro no-crítico', () => {
    const resultados = [makeResultado(false, false), makeResultado(true, true)]
    expect(calcularSeveridad(resultados)).toBe('MAYOR')
  })

  it('MAYOR tiene menor prioridad que CRITICA', () => {
    const resultados = [makeResultado(false, false), makeResultado(true, false)]
    expect(calcularSeveridad(resultados)).toBe('CRITICA')
  })

  it('MENOR cuando todos los parámetros pasan', () => {
    const resultados = [makeResultado(true, true), makeResultado(false, true)]
    expect(calcularSeveridad(resultados)).toBe('MENOR')
  })

  it('MENOR con lista vacía de resultados', () => {
    expect(calcularSeveridad([])).toBe('MENOR')
  })

  it('MENOR cuando aprobado es null (no medido) y no hay fallas explícitas', () => {
    const resultados = [makeResultado(true, null), makeResultado(false, null)]
    expect(calcularSeveridad(resultados)).toBe('MENOR')
  })
})

// ─── calcularFPY ──────────────────────────────────────────────────────────────

describe('calcularFPY', () => {
  it('100% cuando no hay rechazados', () => {
    expect(calcularFPY(1000, 0)).toBe(100.0)
  })

  it('0% cuando todo se rechazó', () => {
    expect(calcularFPY(1000, 1000)).toBe(0.0)
  })

  it('0 cuando producido es 0 (sin división por cero)', () => {
    expect(calcularFPY(0, 0)).toBe(0)
  })

  it('95% con 50 rechazados de 1000 producidos', () => {
    expect(calcularFPY(1000, 50)).toBe(95.0)
  })

  it('retorna un decimal con 1 posición', () => {
    // 997/1000 = 99.7%
    expect(calcularFPY(1000, 3)).toBe(99.7)
  })

  it('meta del 95% — FPY por encima aprueba', () => {
    expect(calcularFPY(200, 5)).toBeGreaterThanOrEqual(95)  // 97.5%
  })
})

// ─── calcularDPM ─────────────────────────────────────────────────────────────

describe('calcularDPM', () => {
  it('0 DPM cuando no hay rechazados', () => {
    expect(calcularDPM(10000, 0)).toBe(0)
  })

  it('0 DPM cuando producido es 0', () => {
    expect(calcularDPM(0, 0)).toBe(0)
  })

  it('1000 DPM con 10 rechazados en 10000 producidos', () => {
    expect(calcularDPM(10000, 10)).toBe(1000)
  })

  it('1000000 DPM cuando todo se rechazó', () => {
    expect(calcularDPM(100, 100)).toBe(1_000_000)
  })

  it('retorna entero (sin decimales)', () => {
    const dpm = calcularDPM(3000, 7)
    expect(Number.isInteger(dpm)).toBe(true)
  })
})

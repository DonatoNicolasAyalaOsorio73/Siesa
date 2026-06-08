import { describe, it, expect } from 'vitest'
import { formatFechaCorta, formatFechaSolo, formatHora } from '@/lib/fecha'

describe('formatFechaCorta', () => {
  it('formatea una fecha ISO completa', () => {
    // 15 de enero de 2024, 16:35
    const iso = '2024-01-15T16:35:00.000Z'
    const result = formatFechaCorta(iso)
    expect(result).toMatch(/15/)
    expect(result).toMatch(/ene/)
    expect(result).toMatch(/2024/)
  })

  it('retorna — para null', () => {
    expect(formatFechaCorta(null)).toBe('—')
  })

  it('retorna — para undefined', () => {
    expect(formatFechaCorta(undefined)).toBe('—')
  })

  it('retorna — para fecha inválida', () => {
    expect(formatFechaCorta('no-es-fecha')).toBe('—')
  })

  it('incluye hora y minutos', () => {
    const result = formatFechaCorta('2024-06-01T09:05:00.000Z')
    // Verifica que haya dos pares de dígitos separados por : al final
    expect(result).toMatch(/\d{2}:\d{2}$/)
  })
})

describe('formatFechaSolo', () => {
  it('no incluye hora', () => {
    const result = formatFechaSolo('2024-03-20T10:00:00.000Z')
    expect(result).not.toMatch(/\d{2}:\d{2}/)
  })

  it('retorna — para null', () => {
    expect(formatFechaSolo(null)).toBe('—')
  })

  it('incluye día, mes abreviado y año', () => {
    // Usa mediodía UTC para evitar que la zona horaria local cambie el día
    const result = formatFechaSolo('2024-12-15T12:00:00.000Z')
    expect(result).toMatch(/15/)
    expect(result).toMatch(/dic/)
    expect(result).toMatch(/2024/)
  })
})

describe('formatHora', () => {
  it('retorna — para null', () => {
    expect(formatHora(null)).toBe('—')
  })

  it('retorna — para undefined', () => {
    expect(formatHora(undefined)).toBe('—')
  })

  it('retorna formato HH:MM', () => {
    const result = formatHora('2024-01-01T08:05:00.000Z')
    expect(result).toMatch(/^\d{2}:\d{2}$/)
  })

  it('retorna — para fecha inválida', () => {
    expect(formatHora('invalid')).toBe('—')
  })
})

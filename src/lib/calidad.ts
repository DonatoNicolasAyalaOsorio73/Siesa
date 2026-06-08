import type { ResultadoParametro, NoConformidad } from '@/context/CalidadContext'

// ─── PARÁMETROS ───────────────────────────────────────────────────────────────

export function evaluarParametro(
  medido: number,
  nominal: number,
  tolerancia: number,
): boolean | null {
  if (isNaN(medido)) return null
  return Math.abs(medido - nominal) <= tolerancia
}

// ─── SEVERIDAD DE NO-CONFORMIDAD ─────────────────────────────────────────────
// CRITICA: al menos un parámetro crítico está fuera de tolerancia
// MAYOR:   algún parámetro no-crítico está fuera de tolerancia
// MENOR:   todos aprobados (pero se rechazó por motivo externo)

export function calcularSeveridad(
  resultados: ResultadoParametro[],
): NoConformidad['severidad'] {
  const criticosFallidos = resultados.filter((r) => r.critico && r.aprobado === false)
  if (criticosFallidos.length > 0) return 'CRITICA'
  if (resultados.some((r) => r.aprobado === false)) return 'MAYOR'
  return 'MENOR'
}

// ─── KPIs DE CALIDAD ──────────────────────────────────────────────────────────

export function calcularFPY(producido: number, rechazado: number): number {
  if (producido <= 0) return 0
  return parseFloat(((producido - rechazado) / producido * 100).toFixed(1))
}

export function calcularDPM(producido: number, rechazado: number): number {
  if (producido <= 0) return 0
  return Math.round((rechazado / producido) * 1_000_000)
}

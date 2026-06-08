import type { OrdenProduccion } from '@/context/AppContext'

// ─── PROGRESO DE OPERACIÓN ────────────────────────────────────────────────────

export interface ResultadoProgreso {
  nuevoIndice: number
  esCompletada: boolean
  requiereInspeccion: boolean
}

export function calcularProgresoOperacion(
  actual: OrdenProduccion['operacionActual'],
  requiereInspeccionActual: boolean,
): ResultadoProgreso {
  const esUltimaOperacion = actual.indice >= actual.total
  const nuevoIndice = Math.min(actual.indice + 1, actual.total)
  const esCompletada = nuevoIndice >= actual.total
  return {
    nuevoIndice,
    esCompletada,
    requiereInspeccion: esCompletada || esUltimaOperacion || requiereInspeccionActual,
  }
}

// ─── GENERACIÓN DE IDs ────────────────────────────────────────────────────────

export function generarLoteId(lineaProduccion: string, sufijo: string): string {
  const ultima = lineaProduccion.charAt(lineaProduccion.length - 1)
  return `LOT-${ultima}-${sufijo}`
}

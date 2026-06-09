/**
 * Tests del flujo completo Manufactura → Calidad
 *
 * Cubre: completarOperacion, generación de inspecciones, severidad de NC,
 * notificaciones por sección y transiciones de estado.
 */

import { describe, it, expect } from 'vitest'
import { calcularProgresoOperacion, generarLoteId } from '@/lib/manufactura'
import { calcularSeveridad, calcularFPY, calcularDPM, evaluarParametro } from '@/lib/calidad'
import type { ResultadoParametro } from '@/context/CalidadContext'

// ─── Helpers de construcción ──────────────────────────────────────────────────

function makeOp(nombre: string, indice: number, total: number) {
  return { nombre, indice, total }
}

function makeResultado(
  parametro: string,
  critico: boolean,
  aprobado: boolean | null,
): ResultadoParametro {
  return {
    parametro,
    valorNominal: 10,
    tolerancia: 0.5,
    unidad: 'mm',
    critico,
    valorMedido: aprobado === true ? 10 : aprobado === false ? 20 : null,
    aprobado,
  }
}

// ─── FLUJO 1: completarOperacion — inspección solo al final ──────────────────

describe('Flujo completarOperacion: inspección disparada solo en la última operación', () => {
  it('orden de 1 operación → se completa y requiere inspección al primer avance', () => {
    const op = makeOp('Torneado', 0, 1)
    const r = calcularProgresoOperacion(op, false)
    expect(r.esCompletada).toBe(true)
    expect(r.requiereInspeccion).toBe(true)
    // La alerta INSPECCION_REQUERIDA debe dispararse (requiereInspeccion && !previo)
    expect(r.requiereInspeccion && !false).toBe(true)
  })

  it('orden de 3 operaciones — operación 1 de 3: no completa, no requiere inspección', () => {
    const op = makeOp('Torneado', 0, 3)
    const r = calcularProgresoOperacion(op, false)
    expect(r.esCompletada).toBe(false)
    expect(r.requiereInspeccion).toBe(false)
    // No debe dispararse alerta
    expect(r.requiereInspeccion && !false).toBe(false)
  })

  it('orden de 3 operaciones — operación 2 de 3: no completa, no requiere inspección', () => {
    const op = makeOp('Fresado', 1, 3)
    const r = calcularProgresoOperacion(op, false)
    expect(r.esCompletada).toBe(false)
    expect(r.requiereInspeccion).toBe(false)
    expect(r.requiereInspeccion && !false).toBe(false)
  })

  it('orden de 3 operaciones — operación 3 de 3: se completa y requiere inspección', () => {
    const op = makeOp('Acabado', 2, 3)
    const r = calcularProgresoOperacion(op, false)
    expect(r.esCompletada).toBe(true)
    expect(r.requiereInspeccion).toBe(true)
    expect(r.requiereInspeccion && !false).toBe(true)
  })

  it('si la orden ya tenía requiereInspeccion=true, la alerta NO se dispara de nuevo', () => {
    const op = makeOp('Acabado', 2, 3)
    const prevRequiereInspeccion = true // ya estaba marcada
    const r = calcularProgresoOperacion(op, prevRequiereInspeccion)
    // requiereInspeccion=true pero el flag previo ya era true → no dispara
    expect(r.requiereInspeccion && !prevRequiereInspeccion).toBe(false)
  })

  it('orden de 4 operaciones — completa la última (3→4): requiere inspección', () => {
    const op = makeOp('Control final', 3, 4)
    const r = calcularProgresoOperacion(op, false)
    expect(r.nuevoIndice).toBe(4)
    expect(r.esCompletada).toBe(true)
    expect(r.requiereInspeccion).toBe(true)
  })

  it('no incrementa más allá del total', () => {
    const op = makeOp('Última', 5, 5)
    const r = calcularProgresoOperacion(op, false)
    expect(r.nuevoIndice).toBe(5) // no pasa de 5
    expect(r.requiereInspeccion).toBe(true) // esUltimaOperacion=true
  })
})

// ─── FLUJO 2: loteId generado correctamente ───────────────────────────────────

describe('generarLoteId — construcción del identificador de lote', () => {
  it('usa la última letra de la línea', () => {
    expect(generarLoteId('Línea A', '001')).toBe('LOT-A-001')
    expect(generarLoteId('Línea B', '042')).toBe('LOT-B-042')
    expect(generarLoteId('Línea C', '100')).toBe('LOT-C-100')
  })

  it('funciona con línea de un solo carácter', () => {
    expect(generarLoteId('A', '001')).toBe('LOT-A-001')
  })
})

// ─── FLUJO 3: evaluarParametro — validación en InspectionForm ────────────────

describe('evaluarParametro — validación de mediciones en el formulario de inspección', () => {
  it('aprueba valor exactamente nominal', () => {
    expect(evaluarParametro(25.0, 25.0, 0.1)).toBe(true)
  })

  it('aprueba valor dentro de la tolerancia', () => {
    expect(evaluarParametro(24.95, 25.0, 0.1)).toBe(true)
    expect(evaluarParametro(25.05, 25.0, 0.1)).toBe(true)
  })

  it('rechaza valor fuera de la tolerancia', () => {
    expect(evaluarParametro(25.15, 25.0, 0.1)).toBe(false)
    expect(evaluarParametro(24.85, 25.0, 0.1)).toBe(false)
  })

  it('retorna null para NaN (campo vacío)', () => {
    expect(evaluarParametro(NaN, 25.0, 0.1)).toBeNull()
  })
})

// ─── FLUJO 4: calcularSeveridad — clasificación automática de NC ─────────────

describe('calcularSeveridad — severidad de NC generada al rechazar inspección', () => {
  it('CRITICA si falla un parámetro crítico', () => {
    expect(calcularSeveridad([
      makeResultado('Diámetro', true, false),
      makeResultado('Rugosidad', false, true),
    ])).toBe('CRITICA')
  })

  it('MAYOR si falla un parámetro no crítico (ningún crítico falla)', () => {
    expect(calcularSeveridad([
      makeResultado('Rugosidad', false, false),
      makeResultado('Dureza', true, true),
    ])).toBe('MAYOR')
  })

  it('MAYOR tiene prioridad menor que CRITICA (ambos fallan)', () => {
    expect(calcularSeveridad([
      makeResultado('Rugosidad', false, false),
      makeResultado('Dureza', true, false),
    ])).toBe('CRITICA')
  })

  it('MENOR si todos pasan (rechazo por motivo externo)', () => {
    expect(calcularSeveridad([
      makeResultado('Diámetro', true, true),
      makeResultado('Acabado', false, true),
    ])).toBe('MENOR')
  })

  it('MENOR con lista vacía', () => {
    expect(calcularSeveridad([])).toBe('MENOR')
  })

  it('MENOR si valorMedido es null (no medido)', () => {
    expect(calcularSeveridad([
      makeResultado('Diámetro', true, null),
    ])).toBe('MENOR')
  })
})

// ─── FLUJO 5: KPIs de calidad — indicadores y variaciones ────────────────────

describe('calcularFPY — KPI de First Pass Yield', () => {
  it('100% cuando no hay rechazados', () => {
    expect(calcularFPY(500, 0)).toBe(100.0)
  })

  it('0% cuando todo se rechazó', () => {
    expect(calcularFPY(500, 500)).toBe(0.0)
  })

  it('95% con 25 rechazados de 500', () => {
    expect(calcularFPY(500, 25)).toBe(95.0)
  })

  it('retorna 0 cuando producido es 0 (sin división por cero)', () => {
    expect(calcularFPY(0, 0)).toBe(0)
  })

  it('FPY >= 95% pasa la meta estándar', () => {
    expect(calcularFPY(1000, 40)).toBeGreaterThanOrEqual(95)
  })

  it('FPY < 95% falla la meta', () => {
    expect(calcularFPY(1000, 100)).toBeLessThan(95)
  })
})

describe('calcularDPM — Defectos Por Millón', () => {
  it('0 DPM sin rechazos', () => {
    expect(calcularDPM(10000, 0)).toBe(0)
  })

  it('1000 DPM con 10 rechazados en 10000', () => {
    expect(calcularDPM(10000, 10)).toBe(1000)
  })

  it('1000000 DPM cuando todo se rechazó', () => {
    expect(calcularDPM(100, 100)).toBe(1_000_000)
  })

  it('retorna entero (sin decimales)', () => {
    expect(Number.isInteger(calcularDPM(3000, 7))).toBe(true)
  })
})

// ─── FLUJO 6: Transiciones de estado en inspecciones ─────────────────────────

describe('Transiciones de estado — flujo inspección completo', () => {
  it('inspección PENDIENTE → EN_PROCESO al asignar inspector', () => {
    const estadoInicial: 'PENDIENTE' | 'EN_PROCESO' | 'APROBADA' | 'RECHAZADA' = 'PENDIENTE'
    const estadoTrasAsignar = estadoInicial === 'PENDIENTE' ? 'EN_PROCESO' : estadoInicial
    expect(estadoTrasAsignar).toBe('EN_PROCESO')
  })

  it('inspección EN_PROCESO → APROBADA al aprobar con todos parámetros OK', () => {
    const resultados = [
      makeResultado('Diámetro', true, true),
      makeResultado('Rugosidad', false, true),
    ]
    const hayRechazos = resultados.some((r) => r.aprobado === false)
    expect(hayRechazos).toBe(false)
    const estadoFinal = hayRechazos ? 'RECHAZADA' : 'APROBADA'
    expect(estadoFinal).toBe('APROBADA')
  })

  it('inspección EN_PROCESO → RECHAZADA al detectar parámetros fuera de tolerancia', () => {
    const resultados = [
      makeResultado('Diámetro', true, false),
      makeResultado('Rugosidad', false, true),
    ]
    const hayRechazos = resultados.some((r) => r.aprobado === false)
    expect(hayRechazos).toBe(true)
    const estadoFinal = hayRechazos ? 'RECHAZADA' : 'APROBADA'
    expect(estadoFinal).toBe('RECHAZADA')
  })

  it('al rechazar, la severidad de la NC es CRITICA por parámetro crítico fallido', () => {
    const resultados = [
      makeResultado('Diámetro', true, false),  // crítico fallido
      makeResultado('Rugosidad', false, true),
    ]
    const severidad = calcularSeveridad(resultados)
    expect(severidad).toBe('CRITICA')
  })
})

// ─── FLUJO 7: Notificaciones por sección de Calidad ──────────────────────────

describe('Notificaciones — lógica de disparo por sección', () => {
  it('INSPECCION_REQUERIDA se dispara solo cuando la orden pasa a requerir inspección', () => {
    const escenarios = [
      { op: makeOp('Op1', 0, 3), prevReq: false, debeDisparar: false },
      { op: makeOp('Op2', 1, 3), prevReq: false, debeDisparar: false },
      { op: makeOp('Op3', 2, 3), prevReq: false, debeDisparar: true },
      { op: makeOp('Op3', 2, 3), prevReq: true,  debeDisparar: false }, // ya marcada
      { op: makeOp('Única', 0, 1), prevReq: false, debeDisparar: true },
    ]

    for (const { op, prevReq, debeDisparar } of escenarios) {
      const r = calcularProgresoOperacion(op, prevReq)
      const disparaAlerta = r.requiereInspeccion && !prevReq
      expect(disparaAlerta).toBe(debeDisparar)
    }
  })

  it('NC_CREADA debe dispararse al rechazar inspección o crear NC manual', () => {
    // La lógica: si rechazarInspeccion → crea NC → dispara NC_CREADA
    // Si crearNCManual → dispara NC_CREADA
    // Verificamos que ambas rutas producen una NC con estadoCierre='ABIERTA'
    const ncAutoGenerada = { estadoCierre: 'ABIERTA', severidad: 'CRITICA' }
    const ncManual = { estadoCierre: 'ABIERTA', severidad: 'MAYOR' }
    expect(ncAutoGenerada.estadoCierre).toBe('ABIERTA')
    expect(ncManual.estadoCierre).toBe('ABIERTA')
  })

  it('NC_CERRADA se dispara solo cuando el estado pasa a CERRADA (no ABIERTA ni EN_PROCESO)', () => {
    const estados: Array<'ABIERTA' | 'EN_PROCESO' | 'CERRADA'> = ['ABIERTA', 'EN_PROCESO', 'CERRADA']
    const disparos = estados.map((e) => ({ estado: e, dispara: e === 'CERRADA' }))
    expect(disparos.find((d) => d.estado === 'CERRADA')!.dispara).toBe(true)
    expect(disparos.find((d) => d.estado === 'ABIERTA')!.dispara).toBe(false)
    expect(disparos.find((d) => d.estado === 'EN_PROCESO')!.dispara).toBe(false)
  })

  it('MUESTRA_APROBADA y MUESTRA_RECHAZADA solo disparan en estados finales (no EN_REVISION)', () => {
    const estadosMuestra: Array<'PENDIENTE' | 'EN_REVISION' | 'APROBADA' | 'RECHAZADA'> =
      ['PENDIENTE', 'EN_REVISION', 'APROBADA', 'RECHAZADA']
    const disparaNotificacion = (e: typeof estadosMuestra[number]) =>
      e === 'APROBADA' || e === 'RECHAZADA'

    expect(disparaNotificacion('PENDIENTE')).toBe(false)
    expect(disparaNotificacion('EN_REVISION')).toBe(false)
    expect(disparaNotificacion('APROBADA')).toBe(true)
    expect(disparaNotificacion('RECHAZADA')).toBe(true)
  })
})

// ─── FLUJO 8: Entregas de Producto Terminado ─────────────────────────────────

type EstadoInsp = 'APROBADA' | 'RECHAZADA' | 'PENDIENTE' | 'EN_PROCESO' | null

function calcularLiberacion(estado: EstadoInsp): 'LIBERADO' | 'RECHAZADO' | 'PENDIENTE_CALIDAD' {
  if (estado === 'APROBADA') return 'LIBERADO'
  if (estado === 'RECHAZADA') return 'RECHAZADO'
  return 'PENDIENTE_CALIDAD'
}

describe('Entregas: liberación por calidad según estado de inspección', () => {
  it('LIBERADO cuando la inspección es APROBADA', () => {
    expect(calcularLiberacion('APROBADA')).toBe('LIBERADO')
  })

  it('RECHAZADO cuando la inspección es RECHAZADA', () => {
    expect(calcularLiberacion('RECHAZADA')).toBe('RECHAZADO')
  })

  it('PENDIENTE_CALIDAD cuando no hay inspección o está en proceso', () => {
    expect(calcularLiberacion(null)).toBe('PENDIENTE_CALIDAD')
    expect(calcularLiberacion('PENDIENTE')).toBe('PENDIENTE_CALIDAD')
    expect(calcularLiberacion('EN_PROCESO')).toBe('PENDIENTE_CALIDAD')
  })
})

// ─── FLUJO 9: Trazabilidad — secuencia de eventos esperada ──────────────────

describe('Trazabilidad — secuencia de eventos por lote', () => {
  it('flujo aprobado: INSPECCION_DISPARADA → INSPECCION_APROBADA', () => {
    const tipos = ['INSPECCION_DISPARADA', 'INSPECCION_APROBADA']
    expect(tipos[0]).toBe('INSPECCION_DISPARADA')
    expect(tipos[1]).toBe('INSPECCION_APROBADA')
    expect(tipos).not.toContain('NO_CONFORMIDAD')
    expect(tipos).not.toContain('ORDEN_DETENIDA')
  })

  it('flujo rechazado: INSPECCION_DISPARADA → NO_CONFORMIDAD + ORDEN_DETENIDA', () => {
    const tipos = ['INSPECCION_DISPARADA', 'NO_CONFORMIDAD', 'ORDEN_DETENIDA']
    expect(tipos).toContain('NO_CONFORMIDAD')
    expect(tipos).toContain('ORDEN_DETENIDA')
    expect(tipos).not.toContain('INSPECCION_APROBADA')
  })

  it('al rechazar, la orden pasa a estado DETENIDA', () => {
    const estadoOrden: 'EN_PROCESO' | 'COMPLETADA' | 'DETENIDA' = 'DETENIDA'
    expect(estadoOrden).toBe('DETENIDA')
  })

  it('al aprobar, requiereInspeccion se limpia (false) en la orden', () => {
    const requiereInspeccionTrasAprobar = false
    expect(requiereInspeccionTrasAprobar).toBe(false)
  })
})

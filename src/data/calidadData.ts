// Datos adicionales del módulo Calidad — no modifica mockData.ts ni manufacturaData.ts

// ─── TENDENCIA TIEMPO DE ESPERA (horas del turno) ────────────────────────────

export interface PuntoTiempoEspera {
  hora: string
  minutos: number
}

export const tendenciaTiempoEspera: PuntoTiempoEspera[] = [
  { hora: '06:00', minutos: 18 },
  { hora: '07:00', minutos: 22 },
  { hora: '08:00', minutos: 35 },   // supera SLA
  { hora: '09:00', minutos: 28 },
  { hora: '10:00', minutos: 67 },   // supera SLA
  { hora: '11:00', minutos: 87 },   // supera SLA — NC-001
  { hora: '12:00', minutos: 25 },
  { hora: '13:00', minutos: 45 },   // supera SLA
  { hora: '14:00', minutos: 32 },   // supera SLA
  { hora: '15:00', minutos: 19 },
  { hora: '16:00', minutos: 21 },
  { hora: '17:00', minutos: 14 },
]

// ─── FPY POR LÍNEA ────────────────────────────────────────────────────────────

export interface FpyLinea {
  linea: string
  fpyHoy: number
  fpySemana: number
  defectosPorMillon: number
  tiempoEsperaProm: number
}

export const fpyPorLinea: FpyLinea[] = [
  { linea: 'Línea A', fpyHoy: 92.5, fpySemana: 94.2, defectosPorMillon: 75000, tiempoEsperaProm: 44 },
  { linea: 'Línea B', fpyHoy: 96.0, fpySemana: 95.8, defectosPorMillon: 40000, tiempoEsperaProm: 28 },
  { linea: 'Línea C', fpyHoy: 88.3, fpySemana: 91.5, defectosPorMillon: 117000, tiempoEsperaProm: 55 },
]

// ─── INSPECCIONES DE EJEMPLO ──────────────────────────────────────────────────

export const inspeccionesEjemplo = [
  {
    inspeccionId: 'INS-001',
    resultados: [
      {
        parametro: 'Diámetro exterior',
        valorMedido: 25.38,
        valorNominal: 25.4,
        tolerancia: 0.02,
        unidad: 'mm',
        critico: true,
        aprobado: true,
      },
      {
        parametro: 'Dureza superficial',
        valorMedido: 52,
        valorNominal: 58,
        tolerancia: 2,
        unidad: 'HRC',
        critico: true,
        aprobado: false,
      },
      {
        parametro: 'Rugosidad Ra',
        valorMedido: 0.75,
        valorNominal: 0.8,
        tolerancia: 0.2,
        unidad: 'μm',
        critico: false,
        aprobado: true,
      },
      {
        parametro: 'Presión de prueba',
        valorMedido: 148,
        valorNominal: 150,
        tolerancia: 5,
        unidad: 'PSI',
        critico: true,
        aprobado: true,
      },
    ],
  },
]

// ─── SLA CONFIGURACIÓN ────────────────────────────────────────────────────────

export const SLA_MINUTOS = 30          // meta de tiempo de respuesta
export const SLA_CRITICO_MINUTOS = 60  // umbral crítico

// ─── INSPECTORES DISPONIBLES ─────────────────────────────────────────────────

export const inspectoresDisponibles = [
  'Laura Gómez',
  'Andrés Castro',
  'Marcela Peña',
  'Ricardo Vásquez',
]

// ─── TIPOS DE DEFECTO ESTANDARIZADOS ─────────────────────────────────────────

export const tiposDefecto = [
  'Dureza fuera de especificación',
  'Dimensión fuera de tolerancia',
  'Rugosidad superficial inaceptable',
  'Presión de prueba fallida',
  'Defecto visual / acabado',
  'Peso fuera de rango',
  'Concentricidad excedida',
  'Material incorrecto',
]

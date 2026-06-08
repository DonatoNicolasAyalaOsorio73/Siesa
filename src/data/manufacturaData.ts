// Datos adicionales del módulo Manufactura — no modifica mockData.ts del Prompt 1

export interface ComponenteBOM {
  id: string
  componente: string
  cantidad: number
  unidad: string
  proveedor: string
  costoUnitario: number
}

export interface ProductoBOM {
  productoId: string
  producto: string
  rutaId: string
  componentes: ComponenteBOM[]
}

export interface EstructuraCosto {
  ordenId: string
  producto: string
  manoObra: number
  materiales: number
  cif: number
  totalEstimado: number
  totalReal: number
}

export interface RegistroTiempo {
  id: string
  ordenId: string
  operacion: string
  centro: string
  inicioTurno: string
  finTurno: string
  duracionMin: number
  unidadesProducidas: number
  tiempoEstimadoMin: number
}

// ─── LISTA DE MATERIALES (BOM) ────────────────────────────────────────────────

export const listaMateriales: ProductoBOM[] = [
  {
    productoId: 'FT-001',
    producto: 'Válvula de Escape XR-500',
    rutaId: 'RUT-001',
    componentes: [
      {
        id: 'MAT-001',
        componente: 'Acero Inoxidable 316L',
        cantidad: 0.85,
        unidad: 'kg',
        proveedor: 'AcerosColombia S.A.',
        costoUnitario: 18500,
      },
      {
        id: 'MAT-002',
        componente: 'Anillo de sellado NBR 40A',
        cantidad: 2,
        unidad: 'und',
        proveedor: 'SellosTec Ltda.',
        costoUnitario: 3200,
      },
      {
        id: 'MAT-003',
        componente: 'Resorte espiral CR-40',
        cantidad: 1,
        unidad: 'und',
        proveedor: 'Muelles del Valle',
        costoUnitario: 5800,
      },
      {
        id: 'MAT-004',
        componente: 'Lubricante alta temperatura WS2',
        cantidad: 0.05,
        unidad: 'lt',
        proveedor: 'LubriCor S.A.S.',
        costoUnitario: 45000,
      },
    ],
  },
  {
    productoId: 'FT-002',
    producto: 'Pistón Motor 4L-200',
    rutaId: 'RUT-002',
    componentes: [
      {
        id: 'MAT-005',
        componente: 'Aleación aluminio A380',
        cantidad: 1.2,
        unidad: 'kg',
        proveedor: 'AluFundi Medellín',
        costoUnitario: 14200,
      },
      {
        id: 'MAT-006',
        componente: 'Segmento de compresión SAE',
        cantidad: 3,
        unidad: 'und',
        proveedor: 'SegmenTech S.A.',
        costoUnitario: 8900,
      },
      {
        id: 'MAT-007',
        componente: 'Bulón de pistón SAE 4340',
        cantidad: 1,
        unidad: 'und',
        proveedor: 'AcerosColombia S.A.',
        costoUnitario: 12500,
      },
      {
        id: 'MAT-008',
        componente: 'Pasador retención DIN 471',
        cantidad: 2,
        unidad: 'und',
        proveedor: 'Sujetadores Col Ltda.',
        costoUnitario: 1800,
      },
    ],
  },
  {
    productoId: 'FT-003',
    producto: 'Árbol de Levas K-320',
    rutaId: 'RUT-001',
    componentes: [
      {
        id: 'MAT-009',
        componente: 'Acero de cementación 20MnCr5',
        cantidad: 2.4,
        unidad: 'kg',
        proveedor: 'AcerosColombia S.A.',
        costoUnitario: 16800,
      },
      {
        id: 'MAT-010',
        componente: 'Chaveta paralela DIN 6885',
        cantidad: 4,
        unidad: 'und',
        proveedor: 'Sujetadores Col Ltda.',
        costoUnitario: 2100,
      },
      {
        id: 'MAT-011',
        componente: 'Cojinete de agujas NK 25/20',
        cantidad: 6,
        unidad: 'und',
        proveedor: 'Rodamientos SKF Colombia',
        costoUnitario: 9400,
      },
    ],
  },
]

// ─── ESTRUCTURA DE COSTOS ─────────────────────────────────────────────────────

export const estructuraCostos: EstructuraCosto[] = [
  {
    ordenId: 'OP-2024-001',
    producto: 'Válvula de Escape XR-500',
    manoObra: 8_450_000,
    materiales: 12_890_000,
    cif: 3_200_000,
    totalEstimado: 25_000_000,
    totalReal: 24_540_000,
  },
  {
    ordenId: 'OP-2024-002',
    producto: 'Pistón Motor 4L-200',
    manoObra: 5_640_000,
    materiales: 8_920_000,
    cif: 2_100_000,
    totalEstimado: 17_100_000,
    totalReal: 16_660_000,
  },
  {
    ordenId: 'OP-2024-003',
    producto: 'Válvula de Escape XR-500',
    manoObra: 3_210_000,
    materiales: 6_540_000,
    cif: 1_450_000,
    totalEstimado: 12_000_000,
    totalReal: 11_200_000,
  },
  {
    ordenId: 'OP-2024-004',
    producto: 'Pistón Motor 4L-200',
    manoObra: 0,
    materiales: 0,
    cif: 0,
    totalEstimado: 9_800_000,
    totalReal: 0,
  },
]

// ─── REGISTROS DE TIEMPOS DEL TURNO ──────────────────────────────────────────

export const registrosTiempos: RegistroTiempo[] = [
  {
    id: 'RT-001',
    ordenId: 'OP-2024-001',
    operacion: 'Torneado CNC',
    centro: 'Torno CNC Mazak #1',
    inicioTurno: '06:00',
    finTurno: '07:23',
    duracionMin: 83,
    unidadesProducidas: 120,
    tiempoEstimadoMin: 90,
  },
  {
    id: 'RT-002',
    ordenId: 'OP-2024-001',
    operacion: 'Fresado',
    centro: 'Fresadora DMG #1',
    inicioTurno: '07:30',
    finTurno: '09:45',
    duracionMin: 135,
    unidadesProducidas: 120,
    tiempoEstimadoMin: 130,
  },
  {
    id: 'RT-003',
    ordenId: 'OP-2024-001',
    operacion: 'Tratamiento Térmico',
    centro: 'Horno Tratamiento Térmico',
    inicioTurno: '10:00',
    finTurno: '14:20',
    duracionMin: 260,
    unidadesProducidas: 120,
    tiempoEstimadoMin: 240,
  },
  {
    id: 'RT-004',
    ordenId: 'OP-2024-002',
    operacion: 'Fundición',
    centro: 'Horno Fundición #2',
    inicioTurno: '07:00',
    finTurno: '11:30',
    duracionMin: 270,
    unidadesProducidas: 200,
    tiempoEstimadoMin: 300,
  },
  {
    id: 'RT-005',
    ordenId: 'OP-2024-002',
    operacion: 'Mecanizado CNC',
    centro: 'Torno CNC Mazak #1',
    inicioTurno: '12:00',
    finTurno: '14:45',
    duracionMin: 165,
    unidadesProducidas: 200,
    tiempoEstimadoMin: 180,
  },
  {
    id: 'RT-006',
    ordenId: 'OP-2024-002',
    operacion: 'Anodizado',
    centro: 'Línea Anodizado #1',
    inicioTurno: '15:00',
    finTurno: '16:30',
    duracionMin: 90,
    unidadesProducidas: 200,
    tiempoEstimadoMin: 85,
  },
]

// ─── UTILIDADES ───────────────────────────────────────────────────────────────

export const formatCOP = (n: number): string =>
  new Intl.NumberFormat('es-CO').format(n)

export const formatCOPCurrency = (n: number): string =>
  `$ ${new Intl.NumberFormat('es-CO').format(n)}`

export const simularTiempoTranscurrido = (
  pct: number,
  turnoHoras = 8
): string => {
  const totalMin = turnoHoras * 60
  const transcurrido = Math.round(pct * totalMin)
  const h = Math.floor(transcurrido / 60)
  const m = transcurrido % 60
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}min` : `${m}min`
}

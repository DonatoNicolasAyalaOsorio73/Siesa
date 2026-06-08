'use client'

import { useState, useEffect } from 'react'
import { useManufacturaContext } from '@/context/ManufacturaContext'
import type { CentroTrabajo } from '@/context/ManufacturaContext'
import { formatCOPCurrency } from '@/data/manufacturaData'
import PageHeader from '@/components/manufactura/PageHeader'
import StatusBadge from '@/components/manufactura/StatusBadge'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import CentroForm from '@/components/manufactura/CentroForm'
import Toast from '@/components/manufactura/Toast'
import { useToast } from '@/hooks/useToast'
import { User, DollarSign, Gauge, Plus, Pencil, Trash2 } from 'lucide-react'

// ─── GAUGE CIRCULAR SVG ───────────────────────────────────────────────────────

function GaugeCircular({
  eficiencia,
  estado,
}: {
  eficiencia: number
  estado: string
}) {
  const radio = 34
  const circ = 2 * Math.PI * radio
  const offset = circ - eficiencia * circ
  const pct = Math.round(eficiencia * 100)

  const color =
    estado === 'MANTENIMIENTO' ? '#F59E0B'
    : eficiencia >= 0.85 ? '#16B364'
    : eficiencia >= 0.6 ? '#F59E0B'
    : '#EF4444'

  return (
    <div className="flex flex-col items-center gap-1">
      <svg viewBox="0 0 88 88" className="w-24 h-24" aria-label={`Eficiencia ${pct}%`}>
        <circle cx="44" cy="44" r={radio} fill="none" stroke="#E8EDF4" strokeWidth="9" />
        <circle
          cx="44" cy="44" r={radio}
          fill="none"
          stroke={color}
          strokeWidth="9"
          strokeDasharray={circ}
          strokeDashoffset={estado === 'MANTENIMIENTO' ? circ * 0.15 : offset}
          strokeLinecap="round"
          transform="rotate(-90 44 44)"
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
        <text
          x="44" y="44"
          textAnchor="middle"
          dominantBaseline="middle"
          fill={color}
          fontSize="14"
          fontWeight="700"
          fontFamily="Roboto, sans-serif"
        >
          {estado === 'MANTENIMIENTO' ? '—' : `${pct}%`}
        </text>
      </svg>
      <p className="text-[10px] font-medium" style={{ color }}>
        {estado === 'MANTENIMIENTO' ? 'En mant.' : 'Eficiencia'}
      </p>
    </div>
  )
}

// ─── CARD CENTRO DE TRABAJO ───────────────────────────────────────────────────

function CentroCard({
  centro,
  onEditar,
  onEliminar,
}: {
  centro: CentroTrabajo
  onEditar: () => void
  onEliminar: () => void
}) {
  const esMantenimiento = centro.estado === 'MANTENIMIENTO'

  return (
    <div
      className={`bg-white rounded-2xl border shadow-sm p-5 flex flex-col gap-4 hover:shadow-md transition-all duration-200 ${
        esMantenimiento ? 'border-[#F59E0B]/40' : 'border-[#E8EDF4]'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-[#15233B] leading-tight">{centro.nombre}</p>
          <p className="font-mono text-xs text-[#5A6B85] mt-0.5">{centro.id}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onEditar}
            className="p-1.5 rounded-lg text-[#97A4B8] hover:text-[#6E56E0] hover:bg-[#F0ECFD] transition-all"
            title="Editar"
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={onEliminar}
            className="p-1.5 rounded-lg text-[#97A4B8] hover:text-[#EF4444] hover:bg-[#FDECEC] transition-all"
            title="Eliminar"
          >
            <Trash2 size={13} />
          </button>
          <StatusBadge estado={centro.tipo} size="sm" />
        </div>
      </div>

      <div className="flex justify-center">
        <GaugeCircular eficiencia={centro.eficiencia} estado={centro.estado} />
      </div>

      <div className="space-y-2 text-xs">
        <div className="flex items-center gap-2 text-[#5A6B85]">
          <User size={13} className="shrink-0 text-[#4C9FE6]" />
          <span className="font-medium text-[#5A6B85]">{centro.operador}</span>
        </div>
        <div className="flex items-center gap-2 text-[#5A6B85]">
          <Gauge size={13} className="shrink-0 text-[#4C9FE6]" />
          <span>{centro.capacidadHoraDia}h/día de capacidad</span>
        </div>
        <div className="flex items-center gap-2 text-[#5A6B85]">
          <DollarSign size={13} className="shrink-0 text-[#4C9FE6]" />
          <span className="font-semibold text-[#1F6CF0]">
            {formatCOPCurrency(centro.costoHora)}/h
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-[#EEF2F8]">
        <StatusBadge estado={centro.estado} />
        {esMantenimiento && (
          <span className="text-[10px] text-[#D97706] font-medium">Fuera de servicio</span>
        )}
      </div>
    </div>
  )
}

// ─── PÁGINA ───────────────────────────────────────────────────────────────────

export default function CentrosTrabajoPage() {
  const { centros, crearCentro, editarCentro, eliminarCentro } = useManufacturaContext()
  const { toast, mostrarToast, cerrarToast } = useToast()

  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const [modalAbierto, setModalAbierto] = useState(false)
  const [centroEditar, setCentroEditar] = useState<CentroTrabajo | null>(null)
  const [confirmAbierto, setConfirmAbierto] = useState(false)
  const [centroEliminar, setCentroEliminar] = useState<CentroTrabajo | null>(null)

  const operativos = mounted ? centros.filter((c) => c.estado === 'OPERATIVO').length : 0
  const enMantenimiento = mounted ? centros.filter((c) => c.estado === 'MANTENIMIENTO').length : 0
  const eficienciaPromedio = mounted
    ? centros.filter((c) => c.estado === 'OPERATIVO').reduce((s, c) => s + c.eficiencia, 0) / (operativos || 1)
    : 0

  function abrirCrear() {
    setCentroEditar(null)
    setModalAbierto(true)
  }

  function abrirEditar(centro: CentroTrabajo) {
    setCentroEditar(centro)
    setModalAbierto(true)
  }

  function handleGuardar(data: Omit<CentroTrabajo, 'id'>) {
    if (centroEditar) {
      editarCentro(centroEditar.id, data)
      mostrarToast('Centro actualizado correctamente', 'success')
    } else {
      crearCentro(data)
      mostrarToast('Centro creado correctamente', 'success')
    }
    setModalAbierto(false)
  }

  function confirmarEliminar(centro: CentroTrabajo) {
    setCentroEliminar(centro)
    setConfirmAbierto(true)
  }

  function handleEliminar() {
    if (!centroEliminar) return
    eliminarCentro(centroEliminar.id)
    setConfirmAbierto(false)
    setCentroEliminar(null)
    mostrarToast('Centro eliminado', 'success')
  }

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader titulo="Centros de Trabajo" subtitulo="Configuración — Manufactura">
        <button
          onClick={abrirCrear}
          className="flex items-center gap-[7px] bg-[#1F6CF0] text-white rounded-[11px] px-[15px] py-[9px] text-[13px] font-semibold hover:bg-[#1557C9] transition-colors"
          style={{ boxShadow: '0 6px 16px -6px rgba(31,108,240,.5)' }}
        >
          <Plus size={15} />
          Nuevo Centro
        </button>
      </PageHeader>

      {/* Resumen rápido */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Operativos', valor: operativos, color: '#16B364', bg: '#E7F8EF' },
          { label: 'En Mantenimiento', valor: enMantenimiento, color: '#F59E0B', bg: '#FEF3E2' },
          { label: 'Eficiencia Promedio', valor: `${Math.round(eficienciaPromedio * 100)}%`, color: '#1F6CF0', bg: '#EAF2FE' },
        ].map(({ label, valor, color, bg }) => (
          <div
            key={label}
            className="bg-white rounded-2xl border border-[#E8EDF4] px-5 py-4" style={{boxShadow:"0 1px 2px rgba(21,35,59,.03)"}}
          >
            <p className="text-2xl font-bold" style={{ color }}>{valor}</p>
            <p className="text-xs text-[#5A6B85] font-medium mt-0.5">{label}</p>
            <div className="h-1 rounded-full mt-2" style={{ backgroundColor: bg }}>
              <div className="h-1 rounded-full w-full" style={{ backgroundColor: color, opacity: 0.5 }} />
            </div>
          </div>
        ))}
      </div>

      {/* Grid de cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {centros.map((centro) => (
          <CentroCard
            key={centro.id}
            centro={centro}
            onEditar={() => abrirEditar(centro)}
            onEliminar={() => confirmarEliminar(centro)}
          />
        ))}
        {centros.length === 0 && (
          <div className="col-span-3 text-center py-16 text-[#97A4B8]">
            <p className="text-sm">No hay centros de trabajo. Crea el primero.</p>
          </div>
        )}
      </div>

      {/* Modal Crear/Editar */}
      <Modal
        abierto={modalAbierto}
        onCerrar={() => setModalAbierto(false)}
        titulo={centroEditar ? `Editar — ${centroEditar.nombre}` : 'Nuevo Centro de Trabajo'}
        subtitulo={centroEditar ? centroEditar.id : 'Configure el nuevo centro de trabajo'}
        ancho="md"
      >
        <CentroForm
          centro={centroEditar}
          onGuardar={handleGuardar}
          onCancelar={() => setModalAbierto(false)}
        />
      </Modal>

      {/* Confirm Eliminar */}
      <ConfirmDialog
        abierto={confirmAbierto}
        titulo="Eliminar Centro de Trabajo"
        descripcion={`¿Eliminar "${centroEliminar?.nombre}"? Esta acción no se puede deshacer.`}
        labelConfirmar="Eliminar"
        colorConfirmar="red"
        onCancelar={() => setConfirmAbierto(false)}
        onConfirmar={handleEliminar}
      />

      <Toast {...toast} onClose={cerrarToast} />
    </div>
  )
}

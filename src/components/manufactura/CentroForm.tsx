'use client'

import { useState } from 'react'
import FormField, { inputClass, selectClass } from '@/components/ui/FormField'
import type { CentroTrabajo } from '@/context/ManufacturaContext'

interface CentroFormProps {
  centro?: CentroTrabajo | null
  onGuardar: (data: Omit<CentroTrabajo, 'id'>) => void
  onCancelar: () => void
}

interface Errores {
  nombre?: string
  operador?: string
  costoHora?: string
  capacidadHoraDia?: string
  eficiencia?: string
}

function formatNum(n: number): string {
  return new Intl.NumberFormat('es-CO').format(n)
}

function parseNum(s: string): number {
  return Number(s.replace(/\./g, '').replace(/,/g, '.')) || 0
}

export default function CentroForm({ centro, onGuardar, onCancelar }: CentroFormProps) {
  const editando = Boolean(centro)

  const [form, setForm] = useState({
    nombre: centro?.nombre ?? '',
    tipo: centro?.tipo ?? 'MAQUINARIA' as CentroTrabajo['tipo'],
    estado: centro?.estado ?? 'OPERATIVO' as CentroTrabajo['estado'],
    capacidadHoraDia: centro?.capacidadHoraDia ?? 8,
    costoHoraStr: centro ? formatNum(centro.costoHora) : '',
    costoHora: centro?.costoHora ?? 0,
    operador: centro?.operador ?? '',
    eficienciaPct: centro ? Math.round(centro.eficiencia * 100) : 90,
  })
  const [errores, setErrores] = useState<Errores>({})

  function setField(field: string, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrores((prev) => ({ ...prev, [field]: undefined }))
  }

  function handleCostoInput(val: string) {
    const digits = val.replace(/[^\d]/g, '')
    const num = Number(digits)
    setForm((prev) => ({
      ...prev,
      costoHoraStr: digits ? formatNum(num) : '',
      costoHora: num,
    }))
    setErrores((prev) => ({ ...prev, costoHora: undefined }))
  }

  function validar(): boolean {
    const errs: Errores = {}
    if (!form.nombre.trim()) errs.nombre = 'El nombre es requerido'
    if (!form.operador.trim()) errs.operador = 'El operador es requerido'
    if (!form.costoHora || form.costoHora <= 0) errs.costoHora = 'Ingrese un costo válido'
    if (form.capacidadHoraDia < 1 || form.capacidadHoraDia > 24) errs.capacidadHoraDia = 'Entre 1 y 24 horas/día'
    if (form.eficienciaPct < 0 || form.eficienciaPct > 100) errs.eficiencia = 'Entre 0 y 100'
    setErrores(errs)
    return Object.keys(errs).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validar()) return
    onGuardar({
      nombre: form.nombre.trim(),
      tipo: form.tipo,
      estado: form.estado,
      capacidadHoraDia: Number(form.capacidadHoraDia),
      costoHora: form.costoHora,
      operador: form.operador.trim(),
      eficiencia: form.eficienciaPct / 100,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Nombre del Centro" required error={errores.nombre}>
        <input
          type="text"
          className={inputClass}
          placeholder="Ej: Torno CNC Mazak #2"
          value={form.nombre}
          onChange={(e) => setField('nombre', e.target.value)}
        />
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Tipo" required>
          <select
            className={selectClass}
            value={form.tipo}
            onChange={(e) => setField('tipo', e.target.value)}
          >
            <option value="MAQUINARIA">Maquinaria</option>
            <option value="INSPECCION">Inspección</option>
            <option value="ENSAMBLE">Ensamble</option>
          </select>
        </FormField>

        <FormField label="Estado" required>
          <select
            className={selectClass}
            value={form.estado}
            onChange={(e) => setField('estado', e.target.value)}
          >
            <option value="OPERATIVO">Operativo</option>
            <option value="MANTENIMIENTO">Mantenimiento</option>
            <option value="INACTIVO">Inactivo</option>
          </select>
        </FormField>
      </div>

      <FormField label="Operador Asignado" required error={errores.operador}>
        <input
          type="text"
          className={inputClass}
          placeholder="Nombre del operador"
          value={form.operador}
          onChange={(e) => setField('operador', e.target.value)}
        />
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Capacidad (h/día)" error={errores.capacidadHoraDia} hint="1 – 24 horas">
          <input
            type="number"
            className={inputClass}
            min={1}
            max={24}
            value={form.capacidadHoraDia}
            onChange={(e) => setField('capacidadHoraDia', Number(e.target.value))}
          />
        </FormField>

        <FormField label="Costo por Hora (COP)" required error={errores.costoHora}>
          <input
            type="text"
            className={inputClass}
            placeholder="85.000"
            value={form.costoHoraStr}
            onChange={(e) => handleCostoInput(e.target.value)}
          />
        </FormField>
      </div>

      <FormField label="Eficiencia (%)" error={errores.eficiencia} hint="0 – 100%">
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={100}
            value={form.eficienciaPct}
            onChange={(e) => setField('eficienciaPct', Number(e.target.value))}
            className="flex-1 accent-[#1F6CF0]"
          />
          <span className="text-[13px] font-bold text-[#1F6CF0] w-12 text-right">
            {form.eficienciaPct}%
          </span>
        </div>
      </FormField>

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancelar}
          className="px-[15px] py-[9px] rounded-[11px] border border-[#E8EDF4] bg-white text-[13px] font-semibold text-[#5A6B85] hover:bg-[#F9FBFE] hover:text-[#15233B] transition-all"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="px-[15px] py-[9px] rounded-[11px] text-[13px] font-semibold text-white bg-[#1F6CF0] hover:bg-[#1557C9] transition-all"
          style={{ boxShadow: '0 6px 16px -6px rgba(31,108,240,.5)' }}
        >
          {editando ? 'Guardar Cambios' : 'Crear Centro'}
        </button>
      </div>
    </form>
  )
}

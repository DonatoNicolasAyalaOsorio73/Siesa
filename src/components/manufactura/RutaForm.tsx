'use client'

import { useState } from 'react'
import { Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react'
import { useManufacturaContext } from '@/context/ManufacturaContext'
import FormField, { inputClass, selectClass } from '@/components/ui/FormField'
import type { Ruta, Operacion } from '@/context/ManufacturaContext'

interface RutaFormProps {
  ruta?: Ruta | null
  onGuardar: (data: Omit<Ruta, 'id'>) => void
  onCancelar: () => void
}

interface OpFormItem {
  nombre: string
  centroTrabajoId: string
  tiempoSetupMin: number
  tiempoOperacionMin: number
}

const opVacia = (): OpFormItem => ({
  nombre: '',
  centroTrabajoId: '',
  tiempoSetupMin: 10,
  tiempoOperacionMin: 15,
})

interface Errores {
  nombre?: string
  producto?: string
  operaciones?: string
}

export default function RutaForm({ ruta, onGuardar, onCancelar }: RutaFormProps) {
  const { centros } = useManufacturaContext()
  const editando = Boolean(ruta)

  const [form, setForm] = useState({
    nombre: ruta?.nombre ?? '',
    producto: ruta?.producto ?? '',
    version: ruta?.version ?? 'v1.0',
    estado: ruta?.estado ?? 'ACTIVA' as Ruta['estado'],
    costoManoObraHora: ruta?.costoManoObraHora ?? 35000,
  })
  const [operaciones, setOperaciones] = useState<OpFormItem[]>(
    ruta?.operaciones.map((op) => ({
      nombre: op.nombre,
      centroTrabajoId: op.centroTrabajoId,
      tiempoSetupMin: op.tiempoSetupMin,
      tiempoOperacionMin: op.tiempoOperacionMin,
    })) ?? [opVacia()]
  )
  const [errores, setErrores] = useState<Errores>({})

  function setField(field: string, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrores((prev) => ({ ...prev, [field]: undefined }))
  }

  function setOp(idx: number, field: keyof OpFormItem, value: string | number) {
    setOperaciones((prev) =>
      prev.map((op, i) => (i === idx ? { ...op, [field]: value } : op))
    )
    setErrores((prev) => ({ ...prev, operaciones: undefined }))
  }

  function agregarOp() {
    setOperaciones((prev) => [...prev, opVacia()])
  }

  function eliminarOp(idx: number) {
    setOperaciones((prev) => prev.filter((_, i) => i !== idx))
  }

  function moverArriba(idx: number) {
    if (idx === 0) return
    setOperaciones((prev) => {
      const arr = [...prev]
      ;[arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]]
      return arr
    })
  }

  function moverAbajo(idx: number) {
    setOperaciones((prev) => {
      if (idx >= prev.length - 1) return prev
      const arr = [...prev]
      ;[arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]]
      return arr
    })
  }

  function validar(): boolean {
    const errs: Errores = {}
    if (!form.nombre.trim()) errs.nombre = 'El nombre es requerido'
    if (!form.producto.trim()) errs.producto = 'El producto es requerido'
    if (operaciones.length === 0) errs.operaciones = 'Agregue al menos una operación'
    if (operaciones.some((op) => !op.nombre.trim())) errs.operaciones = 'Todas las operaciones deben tener nombre'
    setErrores(errs)
    return Object.keys(errs).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validar()) return
    const ops: Operacion[] = operaciones.map((op, i) => ({
      orden: i + 1,
      nombre: op.nombre.trim(),
      centroTrabajoId: op.centroTrabajoId,
      tiempoSetupMin: Number(op.tiempoSetupMin),
      tiempoOperacionMin: Number(op.tiempoOperacionMin),
    }))
    onGuardar({
      nombre: form.nombre.trim(),
      producto: form.producto.trim(),
      version: form.version.trim() || 'v1.0',
      estado: form.estado,
      costoManoObraHora: Number(form.costoManoObraHora),
      operaciones: ops,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Nombre de la Ruta" required error={errores.nombre}>
        <input
          type="text"
          className={inputClass}
          placeholder="Ej: Ruta Válvulas Premium"
          value={form.nombre}
          onChange={(e) => setField('nombre', e.target.value)}
        />
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Producto" required error={errores.producto}>
          <input
            type="text"
            className={inputClass}
            placeholder="Ej: Válvula de Escape XR-500"
            value={form.producto}
            onChange={(e) => setField('producto', e.target.value)}
          />
        </FormField>

        <FormField label="Versión">
          <input
            type="text"
            className={inputClass}
            placeholder="v1.0"
            value={form.version}
            onChange={(e) => setField('version', e.target.value)}
          />
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Estado">
          <select
            className={selectClass}
            value={form.estado}
            onChange={(e) => setField('estado', e.target.value)}
          >
            <option value="ACTIVA">Activa</option>
            <option value="BORRADOR">Borrador</option>
            <option value="OBSOLETA">Obsoleta</option>
          </select>
        </FormField>

        <FormField label="Costo MO / hora (COP)">
          <input
            type="number"
            className={inputClass}
            min={0}
            value={form.costoManoObraHora}
            onChange={(e) => setField('costoManoObraHora', Number(e.target.value))}
          />
        </FormField>
      </div>

      {/* Operaciones */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-[12px] font-semibold text-[#5A6B85] uppercase tracking-[.05em]">
            Operaciones
            {errores.operaciones && (
              <span className="text-[#EF4444] ml-2 normal-case font-normal">{errores.operaciones}</span>
            )}
          </label>
          <button
            type="button"
            onClick={agregarOp}
            className="flex items-center gap-1.5 text-[12px] font-semibold text-[#1F6CF0] hover:text-[#1557C9] bg-[#EAF2FE] hover:bg-[#D5E8FC] px-3 py-1.5 rounded-[9px] transition-all"
          >
            <Plus size={13} />
            Agregar
          </button>
        </div>

        <div className="space-y-3">
          {operaciones.map((op, idx) => (
            <div
              key={idx}
              className="bg-[#F7FAFD] border border-[#E8EDF4] rounded-xl p-4 space-y-3"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="w-6 h-6 rounded-full bg-[#EAF2FE] text-[#1557C9] font-bold text-[11px] flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>
                <div className="flex items-center gap-1 ml-auto">
                  <button
                    type="button"
                    onClick={() => moverArriba(idx)}
                    disabled={idx === 0}
                    className="p-1 rounded hover:bg-[#E8EDF4] text-[#97A4B8] disabled:opacity-30 transition-all"
                    title="Subir"
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => moverAbajo(idx)}
                    disabled={idx === operaciones.length - 1}
                    className="p-1 rounded hover:bg-[#E8EDF4] text-[#97A4B8] disabled:opacity-30 transition-all"
                    title="Bajar"
                  >
                    <ChevronDown size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => eliminarOp(idx)}
                    className="p-1 rounded hover:bg-[#FDECEC] text-[#97A4B8] hover:text-[#EF4444] transition-all"
                    title="Eliminar"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-[11px] font-semibold text-[#5A6B85] uppercase tracking-[.05em] mb-1 block">
                    Nombre Operación *
                  </label>
                  <input
                    type="text"
                    className={inputClass}
                    placeholder="Ej: Torneado CNC"
                    value={op.nombre}
                    onChange={(e) => setOp(idx, 'nombre', e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[#5A6B85] uppercase tracking-[.05em] mb-1 block">
                    Centro de Trabajo
                  </label>
                  <select
                    className={selectClass}
                    value={op.centroTrabajoId}
                    onChange={(e) => setOp(idx, 'centroTrabajoId', e.target.value)}
                  >
                    <option value="">— Sin asignar —</option>
                    {centros.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold text-[#5A6B85] uppercase tracking-[.05em] mb-1 block">
                      Setup (min)
                    </label>
                    <input
                      type="number"
                      className={inputClass}
                      min={0}
                      value={op.tiempoSetupMin}
                      onChange={(e) => setOp(idx, 'tiempoSetupMin', Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-[#5A6B85] uppercase tracking-[.05em] mb-1 block">
                      Oper. (min)
                    </label>
                    <input
                      type="number"
                      className={inputClass}
                      min={0}
                      value={op.tiempoOperacionMin}
                      onChange={(e) => setOp(idx, 'tiempoOperacionMin', Number(e.target.value))}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}

          {operaciones.length === 0 && (
            <div className="text-center py-6 text-[#97A4B8] text-[13px] border border-dashed border-[#E8EDF4] rounded-xl">
              No hay operaciones. Agrega al menos una.
            </div>
          )}
        </div>
      </div>

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
          {editando ? 'Guardar Cambios' : 'Crear Ruta'}
        </button>
      </div>
    </form>
  )
}

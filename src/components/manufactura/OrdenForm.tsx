'use client'

import { useState } from 'react'
import { useManufacturaContext } from '@/context/ManufacturaContext'
import { useCalidadContext } from '@/context/CalidadContext'
import FormField, { inputClass, selectClass } from '@/components/ui/FormField'
import type { OrdenProduccion } from '@/context/AppContext'

interface OrdenFormProps {
  orden?: OrdenProduccion | null
  onGuardar: (data: Partial<OrdenProduccion>) => void
  onCancelar: () => void
}

interface Errores {
  producto?: string
  lineaProduccion?: string
  cantidadPlanificada?: string
  prioridad?: string
  operario?: string
}

export default function OrdenForm({ orden, onGuardar, onCancelar }: OrdenFormProps) {
  const { rutas } = useManufacturaContext()
  const { fichasMutable } = useCalidadContext()
  const editando = Boolean(orden)

  const [form, setForm] = useState({
    producto: orden?.producto ?? '',
    lineaProduccion: orden?.lineaProduccion ?? 'Línea A',
    cantidadPlanificada: orden?.cantidadPlanificada ?? 100,
    prioridad: orden?.prioridad ?? 'MEDIA',
    operario: orden?.operario ?? '',
    fichaTecnicaId: orden?.fichaTecnicaId ?? '',
    rutaId: orden?.rutaId ?? '',
    fechaInicio: orden?.fechaInicio ? orden.fechaInicio.slice(0, 16) : new Date().toISOString().slice(0, 16),
    requiereInspeccion: orden?.requiereInspeccion ?? false,
  })
  const [errores, setErrores] = useState<Errores>({})

  function set(field: string, value: string | number | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrores((prev) => ({ ...prev, [field]: undefined }))
  }

  function validar(): boolean {
    const errs: Errores = {}
    if (!form.producto.trim()) errs.producto = 'El producto es requerido'
    if (!form.lineaProduccion) errs.lineaProduccion = 'Seleccione una línea'
    if (!form.cantidadPlanificada || form.cantidadPlanificada < 1) errs.cantidadPlanificada = 'Cantidad mínima: 1'
    if (!form.prioridad) errs.prioridad = 'Seleccione una prioridad'
    if (!form.operario.trim()) errs.operario = 'El operario es requerido'
    setErrores(errs)
    return Object.keys(errs).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validar()) return
    onGuardar({
      producto: form.producto.trim(),
      lineaProduccion: form.lineaProduccion,
      cantidadPlanificada: Number(form.cantidadPlanificada),
      prioridad: form.prioridad as OrdenProduccion['prioridad'],
      operario: form.operario.trim(),
      fichaTecnicaId: form.fichaTecnicaId,
      rutaId: form.rutaId,
      fechaInicio: new Date(form.fechaInicio).toISOString(),
      requiereInspeccion: form.requiereInspeccion,
      estado: orden?.estado ?? 'PENDIENTE',
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Producto" required error={errores.producto}>
        <input
          type="text"
          className={inputClass}
          placeholder="Ej: Válvula de Escape XR-500"
          value={form.producto}
          onChange={(e) => set('producto', e.target.value)}
        />
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Línea de Producción" required error={errores.lineaProduccion}>
          <select
            className={selectClass}
            value={form.lineaProduccion}
            onChange={(e) => set('lineaProduccion', e.target.value)}
          >
            {['Línea A', 'Línea B', 'Línea C', 'Línea D'].map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </FormField>

        <FormField label="Prioridad" required error={errores.prioridad}>
          <select
            className={selectClass}
            value={form.prioridad}
            onChange={(e) => set('prioridad', e.target.value)}
          >
            <option value="ALTA">Alta</option>
            <option value="MEDIA">Media</option>
            <option value="BAJA">Baja</option>
          </select>
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Cantidad Planificada" required error={errores.cantidadPlanificada}>
          <input
            type="number"
            className={inputClass}
            min={1}
            value={form.cantidadPlanificada}
            onChange={(e) => set('cantidadPlanificada', Number(e.target.value))}
          />
        </FormField>

        <FormField label="Operario" required error={errores.operario}>
          <input
            type="text"
            className={inputClass}
            placeholder="Nombre del operario"
            value={form.operario}
            onChange={(e) => set('operario', e.target.value)}
          />
        </FormField>
      </div>

      <FormField label="Ficha Técnica" hint="Opcional — vincula la orden a una ficha de calidad">
        <select
          className={selectClass}
          value={form.fichaTecnicaId}
          onChange={(e) => set('fichaTecnicaId', e.target.value)}
        >
          <option value="">— Sin ficha asignada —</option>
          {fichasMutable.map((f) => (
            <option key={f.id} value={f.id}>
              {f.producto} ({f.id})
            </option>
          ))}
        </select>
      </FormField>

      <FormField label="Ruta de Producción" hint="Opcional — define la secuencia de operaciones">
        <select
          className={selectClass}
          value={form.rutaId}
          onChange={(e) => set('rutaId', e.target.value)}
        >
          <option value="">— Sin ruta asignada —</option>
          {rutas.map((r) => (
            <option key={r.id} value={r.id}>
              {r.nombre} ({r.id}) — {r.producto}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label="Fecha de Inicio">
        <input
          type="datetime-local"
          className={inputClass}
          value={form.fechaInicio}
          onChange={(e) => set('fechaInicio', e.target.value)}
        />
      </FormField>

      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="req-inspeccion"
          checked={form.requiereInspeccion}
          onChange={(e) => set('requiereInspeccion', e.target.checked)}
          className="w-4 h-4 rounded border-[#E8EDF4] text-[#1F6CF0] focus:ring-[#1F6CF0]"
        />
        <label htmlFor="req-inspeccion" className="text-[13px] text-[#5A6B85] cursor-pointer">
          Requiere inspección de calidad al completar
        </label>
      </div>

      {/* Botones */}
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
          {editando ? 'Guardar Cambios' : 'Crear Orden'}
        </button>
      </div>
    </form>
  )
}

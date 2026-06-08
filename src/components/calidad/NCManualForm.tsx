'use client'

import { useState, useEffect } from 'react'
import { useAppContext } from '@/context/AppContext'
import FormField, { inputClass, selectClass, textareaClass } from '@/components/ui/FormField'
import type { NoConformidad } from '@/context/CalidadContext'

interface NCManualFormProps {
  onGuardar: (data: Omit<NoConformidad, 'id' | 'fecha' | 'estadoCierre' | 'notas'>) => void
  onCancelar: () => void
}

interface Errores {
  tipoDefecto?: string
  descripcion?: string
  severidad?: string
  producto?: string
  inspector?: string
}

export default function NCManualForm({ onGuardar, onCancelar }: NCManualFormProps) {
  const { ordenes } = useAppContext()

  const [form, setForm] = useState({
    tipoDefecto: '',
    descripcion: '',
    severidad: 'MAYOR' as NoConformidad['severidad'],
    ordenId: '',
    loteId: '',
    producto: '',
    lineaProduccion: 'Línea A',
    cantidadAfectada: 0,
    inspector: '',
    accionCorrectiva: '',
  })
  const [errores, setErrores] = useState<Errores>({})

  function setField(field: string, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrores((prev) => ({ ...prev, [field]: undefined }))
  }

  // Auto-populate cuando se selecciona una orden
  useEffect(() => {
    if (!form.ordenId) return
    const orden = ordenes.find((o) => o.id === form.ordenId)
    if (orden) {
      setForm((prev) => ({
        ...prev,
        loteId: orden.loteId,
        producto: orden.producto,
        lineaProduccion: orden.lineaProduccion,
      }))
    }
  }, [form.ordenId, ordenes])

  function validar(): boolean {
    const errs: Errores = {}
    if (!form.tipoDefecto.trim()) errs.tipoDefecto = 'El tipo de defecto es requerido'
    if (!form.descripcion.trim()) errs.descripcion = 'La descripción es requerida'
    if (!form.severidad) errs.severidad = 'Seleccione una severidad'
    if (!form.producto.trim()) errs.producto = 'El producto es requerido'
    if (!form.inspector.trim()) errs.inspector = 'El inspector es requerido'
    setErrores(errs)
    return Object.keys(errs).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validar()) return
    onGuardar({
      tipoDefecto: form.tipoDefecto.trim(),
      descripcion: form.descripcion.trim(),
      severidad: form.severidad,
      ordenId: form.ordenId,
      loteId: form.loteId,
      producto: form.producto.trim(),
      lineaProduccion: form.lineaProduccion,
      cantidadAfectada: Number(form.cantidadAfectada),
      inspector: form.inspector.trim(),
      accionCorrectiva: form.accionCorrectiva.trim(),
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Tipo de Defecto" required error={errores.tipoDefecto}>
        <input
          type="text"
          className={inputClass}
          placeholder="Ej: Dureza fuera de especificación"
          value={form.tipoDefecto}
          onChange={(e) => setField('tipoDefecto', e.target.value)}
        />
      </FormField>

      <FormField label="Descripción" required error={errores.descripcion}>
        <textarea
          className={textareaClass}
          rows={3}
          placeholder="Descripción detallada del defecto encontrado…"
          value={form.descripcion}
          onChange={(e) => setField('descripcion', e.target.value)}
        />
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Severidad" required error={errores.severidad}>
          <select
            className={selectClass}
            value={form.severidad}
            onChange={(e) => setField('severidad', e.target.value)}
          >
            <option value="CRITICA">Crítica</option>
            <option value="MAYOR">Mayor</option>
            <option value="MENOR">Menor</option>
          </select>
        </FormField>

        <FormField label="Orden de Producción">
          <select
            className={selectClass}
            value={form.ordenId}
            onChange={(e) => setField('ordenId', e.target.value)}
          >
            <option value="">— Sin orden vinculada —</option>
            {ordenes.map((o) => (
              <option key={o.id} value={o.id}>
                {o.id} — {o.producto}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Lote ID">
          <input
            type="text"
            className={inputClass}
            placeholder="LOT-A-001"
            value={form.loteId}
            onChange={(e) => setField('loteId', e.target.value)}
          />
        </FormField>

        <FormField label="Línea de Producción">
          <select
            className={selectClass}
            value={form.lineaProduccion}
            onChange={(e) => setField('lineaProduccion', e.target.value)}
          >
            {['Línea A', 'Línea B', 'Línea C', 'Línea D'].map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </FormField>
      </div>

      <FormField label="Producto" required error={errores.producto}>
        <input
          type="text"
          className={inputClass}
          placeholder="Nombre del producto afectado"
          value={form.producto}
          onChange={(e) => setField('producto', e.target.value)}
        />
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Inspector" required error={errores.inspector}>
          <input
            type="text"
            className={inputClass}
            placeholder="Nombre del inspector"
            value={form.inspector}
            onChange={(e) => setField('inspector', e.target.value)}
          />
        </FormField>

        <FormField label="Cantidad Afectada (und)">
          <input
            type="number"
            className={inputClass}
            min={0}
            value={form.cantidadAfectada}
            onChange={(e) => setField('cantidadAfectada', Number(e.target.value))}
          />
        </FormField>
      </div>

      <FormField label="Acción Correctiva" hint="Opcional — puede editarse después">
        <textarea
          className={textareaClass}
          rows={3}
          placeholder="Descripción de la acción correctiva a tomar…"
          value={form.accionCorrectiva}
          onChange={(e) => setField('accionCorrectiva', e.target.value)}
        />
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
          className="px-[15px] py-[9px] rounded-[11px] text-[13px] font-semibold text-white bg-[#EF4444] hover:bg-[#DC2626] transition-all"
          style={{ boxShadow: '0 6px 16px -6px rgba(239,68,68,.5)' }}
        >
          Registrar NC
        </button>
      </div>
    </form>
  )
}

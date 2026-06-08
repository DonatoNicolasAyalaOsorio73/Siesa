'use client'

import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import FormField, { inputClass, selectClass, textareaClass } from '@/components/ui/FormField'
import type { FichaTecnica, Criterio } from '@/context/CalidadContext'

interface FichaFormProps {
  ficha?: FichaTecnica | null
  onGuardar: (data: Omit<FichaTecnica, 'id'>) => void
  onCancelar: () => void
}

interface CriterioForm {
  parametro: string
  valorNominal: number
  tolerancia: number
  unidad: string
  critico: boolean
}

const criterioVacio = (): CriterioForm => ({
  parametro: '',
  valorNominal: 0,
  tolerancia: 0.05,
  unidad: 'mm',
  critico: false,
})

interface Errores {
  producto?: string
  version?: string
  criterios?: string
}

export default function FichaForm({ ficha, onGuardar, onCancelar }: FichaFormProps) {
  const editando = Boolean(ficha)

  const [form, setForm] = useState({
    producto: ficha?.producto ?? '',
    version: ficha?.version ?? 'v1.0',
    nivelAceptableCalidad: ficha ? Math.round(ficha.nivelAceptableCalidad * 100) : 2.5,
    frecuenciaMuestreo: ficha?.frecuenciaMuestreo ?? 'Cada 50 unidades',
    tamanoMuestra: ficha?.tamanoMuestra ?? 5,
  })

  const [criterios, setCriterios] = useState<CriterioForm[]>(
    ficha?.criterios.map((c) => ({
      parametro: c.parametro,
      valorNominal: c.valorNominal,
      tolerancia: c.tolerancia,
      unidad: c.unidad,
      critico: c.critico,
    })) ?? [criterioVacio()]
  )

  const [errores, setErrores] = useState<Errores>({})

  function setField(field: string, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrores((prev) => ({ ...prev, [field]: undefined }))
  }

  function setCriterio(idx: number, field: keyof CriterioForm, value: string | number | boolean) {
    setCriterios((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, [field]: value } : c))
    )
    setErrores((prev) => ({ ...prev, criterios: undefined }))
  }

  function agregarCriterio() {
    setCriterios((prev) => [...prev, criterioVacio()])
  }

  function eliminarCriterio(idx: number) {
    setCriterios((prev) => prev.filter((_, i) => i !== idx))
  }

  function validar(): boolean {
    const errs: Errores = {}
    if (!form.producto.trim()) errs.producto = 'El producto es requerido'
    if (!form.version.trim()) errs.version = 'La versión es requerida'
    if (criterios.length === 0) errs.criterios = 'Agregue al menos un criterio'
    if (criterios.some((c) => !c.parametro.trim())) errs.criterios = 'Todos los criterios deben tener nombre'
    setErrores(errs)
    return Object.keys(errs).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validar()) return
    const cs: Criterio[] = criterios.map((c) => ({
      parametro: c.parametro.trim(),
      valorNominal: Number(c.valorNominal),
      tolerancia: Number(c.tolerancia),
      unidad: c.unidad.trim(),
      critico: c.critico,
    }))
    onGuardar({
      producto: form.producto.trim(),
      version: form.version.trim(),
      nivelAceptableCalidad: form.nivelAceptableCalidad / 100,
      frecuenciaMuestreo: form.frecuenciaMuestreo.trim(),
      tamanoMuestra: Number(form.tamanoMuestra),
      criterios: cs,
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
          onChange={(e) => setField('producto', e.target.value)}
        />
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Versión" required error={errores.version}>
          <input
            type="text"
            className={inputClass}
            placeholder="v1.0"
            value={form.version}
            onChange={(e) => setField('version', e.target.value)}
          />
        </FormField>

        <FormField label="Nivel AQL (%)" hint="0 – 100%">
          <input
            type="number"
            className={inputClass}
            min={0}
            max={100}
            step={0.1}
            value={form.nivelAceptableCalidad}
            onChange={(e) => setField('nivelAceptableCalidad', Number(e.target.value))}
          />
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Frecuencia de Muestreo">
          <input
            type="text"
            className={inputClass}
            placeholder="Ej: Cada 50 unidades"
            value={form.frecuenciaMuestreo}
            onChange={(e) => setField('frecuenciaMuestreo', e.target.value)}
          />
        </FormField>

        <FormField label="Tamaño de Muestra (und)" hint="Mínimo 1">
          <input
            type="number"
            className={inputClass}
            min={1}
            value={form.tamanoMuestra}
            onChange={(e) => setField('tamanoMuestra', Number(e.target.value))}
          />
        </FormField>
      </div>

      {/* Criterios */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-[12px] font-semibold text-[#5A6B85] uppercase tracking-[.05em]">
            Criterios de Aceptación
            {errores.criterios && (
              <span className="text-[#EF4444] ml-2 normal-case font-normal">{errores.criterios}</span>
            )}
          </label>
          <button
            type="button"
            onClick={agregarCriterio}
            className="flex items-center gap-1.5 text-[12px] font-semibold text-[#16B364] hover:text-[#12954F] bg-[#E7F8EF] hover:bg-[#D4F3E3] px-3 py-1.5 rounded-[9px] transition-all"
          >
            <Plus size={13} />
            Agregar
          </button>
        </div>

        <div className="space-y-3">
          {criterios.map((c, idx) => (
            <div key={idx} className="bg-[#F7FAFD] border border-[#E8EDF4] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#5A6B85] uppercase tracking-wider">
                  Criterio {idx + 1}
                </span>
                <button
                  type="button"
                  onClick={() => eliminarCriterio(idx)}
                  className="p-1 rounded hover:bg-[#FDECEC] text-[#97A4B8] hover:text-[#EF4444] transition-all"
                >
                  <Trash2 size={13} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-[11px] font-semibold text-[#5A6B85] uppercase tracking-[.05em] mb-1 block">
                    Parámetro *
                  </label>
                  <input
                    type="text"
                    className={inputClass}
                    placeholder="Ej: Diámetro exterior"
                    value={c.parametro}
                    onChange={(e) => setCriterio(idx, 'parametro', e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[#5A6B85] uppercase tracking-[.05em] mb-1 block">
                    Valor Nominal
                  </label>
                  <input
                    type="number"
                    className={inputClass}
                    step="any"
                    value={c.valorNominal}
                    onChange={(e) => setCriterio(idx, 'valorNominal', Number(e.target.value))}
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[#5A6B85] uppercase tracking-[.05em] mb-1 block">
                    Tolerancia (+/-)
                  </label>
                  <input
                    type="number"
                    className={inputClass}
                    step="any"
                    min={0}
                    value={c.tolerancia}
                    onChange={(e) => setCriterio(idx, 'tolerancia', Number(e.target.value))}
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[#5A6B85] uppercase tracking-[.05em] mb-1 block">
                    Unidad
                  </label>
                  <input
                    type="text"
                    className={inputClass}
                    placeholder="mm, HRC, PSI…"
                    value={c.unidad}
                    onChange={(e) => setCriterio(idx, 'unidad', e.target.value)}
                  />
                </div>

                <div className="flex items-center gap-2 self-center">
                  <input
                    type="checkbox"
                    id={`critico-${idx}`}
                    checked={c.critico}
                    onChange={(e) => setCriterio(idx, 'critico', e.target.checked)}
                    className="w-4 h-4 rounded border-[#E8EDF4] text-[#EF4444] focus:ring-[#EF4444]"
                  />
                  <label htmlFor={`critico-${idx}`} className="text-[12px] font-semibold text-[#EF4444] cursor-pointer">
                    Parámetro crítico
                  </label>
                </div>
              </div>
            </div>
          ))}

          {criterios.length === 0 && (
            <div className="text-center py-6 text-[#97A4B8] text-[13px] border border-dashed border-[#E8EDF4] rounded-xl">
              Agrega al menos un criterio de aceptación.
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
          className="px-[15px] py-[9px] rounded-[11px] text-[13px] font-semibold text-white bg-[#16B364] hover:bg-[#12954F] transition-all"
          style={{ boxShadow: '0 6px 16px -6px rgba(22,179,100,.5)' }}
        >
          {editando ? 'Guardar Cambios' : 'Crear Ficha'}
        </button>
      </div>
    </form>
  )
}

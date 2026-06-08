'use client'

import { useState } from 'react'
import { useManufacturaContext } from '@/context/ManufacturaContext'
import type { BomProducto, BomComponente } from '@/context/ManufacturaContext'
import { formatCOPCurrency } from '@/data/manufacturaData'
import PageHeader from '@/components/manufactura/PageHeader'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import FormField, { inputClass, selectClass } from '@/components/ui/FormField'
import Toast from '@/components/manufactura/Toast'
import { useToast } from '@/hooks/useToast'
import { ChevronDown, ChevronRight, Package, Search, Plus, Pencil, Trash2 } from 'lucide-react'

// ─── FORMULARIO DE COMPONENTE ─────────────────────────────────────────────────

interface ComponenteFormData {
  componente: string
  codigo: string
  cantidad: number
  unidad: string
  costoUnitario: number
  proveedor: string
  leadTimeDias: number
}

function ComponenteForm({
  inicial,
  onGuardar,
  onCancelar,
}: {
  inicial?: Partial<ComponenteFormData>
  onGuardar: (data: Omit<BomComponente, 'id'>) => void
  onCancelar: () => void
}) {
  const [form, setForm] = useState<ComponenteFormData>({
    componente: inicial?.componente ?? '',
    codigo: inicial?.codigo ?? '',
    cantidad: inicial?.cantidad ?? 1,
    unidad: inicial?.unidad ?? 'und',
    costoUnitario: inicial?.costoUnitario ?? 0,
    proveedor: inicial?.proveedor ?? '',
    leadTimeDias: inicial?.leadTimeDias ?? 7,
  })

  function setField(field: string, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.componente.trim()) return
    onGuardar({
      componente: form.componente.trim(),
      codigo: form.codigo.trim() || form.componente.slice(0, 10).toUpperCase(),
      nivel: 1,
      cantidad: Number(form.cantidad),
      unidad: form.unidad.trim() || 'und',
      costoUnitario: Number(form.costoUnitario),
      proveedor: form.proveedor.trim(),
      leadTimeDias: Number(form.leadTimeDias),
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Componente" required>
        <input
          type="text"
          className={inputClass}
          placeholder="Ej: Acero Inoxidable 316L"
          value={form.componente}
          onChange={(e) => setField('componente', e.target.value)}
        />
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Código">
          <input
            type="text"
            className={inputClass}
            placeholder="MAT-XXX"
            value={form.codigo}
            onChange={(e) => setField('codigo', e.target.value)}
          />
        </FormField>

        <FormField label="Unidad">
          <select
            className={selectClass}
            value={form.unidad}
            onChange={(e) => setField('unidad', e.target.value)}
          >
            {['und', 'kg', 'lt', 'm', 'm2', 'pza', 'caja'].map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Cantidad">
          <input
            type="number"
            className={inputClass}
            min={0}
            step="any"
            value={form.cantidad}
            onChange={(e) => setField('cantidad', e.target.value)}
          />
        </FormField>

        <FormField label="Costo Unitario (COP)">
          <input
            type="number"
            className={inputClass}
            min={0}
            value={form.costoUnitario}
            onChange={(e) => setField('costoUnitario', Number(e.target.value))}
          />
        </FormField>
      </div>

      <FormField label="Proveedor">
        <input
          type="text"
          className={inputClass}
          placeholder="Ej: AcerosColombia S.A."
          value={form.proveedor}
          onChange={(e) => setField('proveedor', e.target.value)}
        />
      </FormField>

      <FormField label="Lead Time (días)">
        <input
          type="number"
          className={inputClass}
          min={0}
          value={form.leadTimeDias}
          onChange={(e) => setField('leadTimeDias', Number(e.target.value))}
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
          className="px-[15px] py-[9px] rounded-[11px] text-[13px] font-semibold text-white bg-[#1F6CF0] hover:bg-[#1557C9] transition-all"
          style={{ boxShadow: '0 6px 16px -6px rgba(31,108,240,.5)' }}
        >
          Guardar
        </button>
      </div>
    </form>
  )
}

// ─── FORMULARIO DE NUEVO PRODUCTO BOM ─────────────────────────────────────────

function NuevoProductoForm({
  onGuardar,
  onCancelar,
}: {
  onGuardar: (productoId: string, producto: string, version: string) => void
  onCancelar: () => void
}) {
  const [form, setForm] = useState({ productoId: '', producto: '', version: 'v1.0' })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.producto.trim() || !form.productoId.trim()) return
    onGuardar(form.productoId.trim(), form.producto.trim(), form.version.trim())
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="ID del Producto" required>
        <input
          type="text"
          className={inputClass}
          placeholder="Ej: FT-003"
          value={form.productoId}
          onChange={(e) => setForm((p) => ({ ...p, productoId: e.target.value }))}
        />
      </FormField>
      <FormField label="Nombre del Producto" required>
        <input
          type="text"
          className={inputClass}
          placeholder="Ej: Árbol de Levas K-320"
          value={form.producto}
          onChange={(e) => setForm((p) => ({ ...p, producto: e.target.value }))}
        />
      </FormField>
      <FormField label="Versión">
        <input
          type="text"
          className={inputClass}
          placeholder="v1.0"
          value={form.version}
          onChange={(e) => setForm((p) => ({ ...p, version: e.target.value }))}
        />
      </FormField>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancelar}
          className="px-[15px] py-[9px] rounded-[11px] border border-[#E8EDF4] bg-white text-[13px] font-semibold text-[#5A6B85] hover:bg-[#F9FBFE] transition-all">
          Cancelar
        </button>
        <button type="submit"
          className="px-[15px] py-[9px] rounded-[11px] text-[13px] font-semibold text-white bg-[#1F6CF0] hover:bg-[#1557C9] transition-all"
          style={{ boxShadow: '0 6px 16px -6px rgba(31,108,240,.5)' }}>
          Crear Producto
        </button>
      </div>
    </form>
  )
}

// ─── PÁGINA ───────────────────────────────────────────────────────────────────

export default function ListaMaterialesPage() {
  const { bom, crearBomProducto, crearBomItem, editarBomItem, eliminarBomItem } = useManufacturaContext()
  const { toast, mostrarToast, cerrarToast } = useToast()

  const [expandidos, setExpandidos] = useState<Set<string>>(new Set([bom[0]?.productoId ?? '']))
  const [busqueda, setBusqueda] = useState('')

  // Modales
  const [modalNuevoProducto, setModalNuevoProducto] = useState(false)
  const [modalComponente, setModalComponente] = useState(false)
  const [productoActivo, setProductoActivo] = useState<string>('')
  const [componenteEditar, setComponenteEditar] = useState<BomComponente | null>(null)
  const [confirmAbierto, setConfirmAbierto] = useState(false)
  const [itemEliminar, setItemEliminar] = useState<{ productoId: string; itemId: string } | null>(null)

  function toggleExpansion(productoId: string) {
    setExpandidos((prev) => {
      const next = new Set(prev)
      if (next.has(productoId)) next.delete(productoId)
      else next.add(productoId)
      return next
    })
  }

  function abrirAgregarComponente(productoId: string) {
    setProductoActivo(productoId)
    setComponenteEditar(null)
    setModalComponente(true)
  }

  function abrirEditarComponente(productoId: string, comp: BomComponente) {
    setProductoActivo(productoId)
    setComponenteEditar(comp)
    setModalComponente(true)
  }

  function handleGuardarComponente(data: Omit<BomComponente, 'id'>) {
    if (componenteEditar) {
      editarBomItem(productoActivo, componenteEditar.id, data)
      mostrarToast('Componente actualizado', 'success')
    } else {
      crearBomItem(productoActivo, data)
      mostrarToast('Componente agregado', 'success')
    }
    setModalComponente(false)
  }

  function confirmarEliminar(productoId: string, itemId: string) {
    setItemEliminar({ productoId, itemId })
    setConfirmAbierto(true)
  }

  function handleEliminar() {
    if (!itemEliminar) return
    eliminarBomItem(itemEliminar.productoId, itemEliminar.itemId)
    setConfirmAbierto(false)
    setItemEliminar(null)
    mostrarToast('Componente eliminado', 'success')
  }

  function handleNuevoProducto(productoId: string, producto: string, version: string) {
    crearBomProducto(productoId, producto, version)
    setModalNuevoProducto(false)
    mostrarToast('Producto BOM creado. Agrega sus componentes.', 'success')
  }

  const listaFiltrada = bom.map((prod: BomProducto) => ({
    ...prod,
    componentes: prod.componentes.filter(
      (c: BomComponente) =>
        busqueda === '' ||
        c.componente.toLowerCase().includes(busqueda.toLowerCase()) ||
        c.proveedor.toLowerCase().includes(busqueda.toLowerCase()) ||
        prod.producto.toLowerCase().includes(busqueda.toLowerCase())
    ),
  })).filter((prod: BomProducto) => prod.componentes.length > 0 || busqueda === '')

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader titulo="Lista de Materiales" subtitulo="BOM — Bill of Materials">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5A6B85]" />
            <input
              type="text"
              placeholder="Buscar componente o proveedor…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm bg-white border border-[#E8EDF4] rounded-lg text-[#5A6B85] placeholder-[#97A4B8] focus:outline-none focus:border-[#1F6CF0] focus:ring-2 focus:ring-[#EAF2FE] transition w-56"
            />
          </div>
          <button
            onClick={() => setModalNuevoProducto(true)}
            className="flex items-center gap-[7px] bg-[#1F6CF0] text-white rounded-[11px] px-[15px] py-[9px] text-[13px] font-semibold hover:bg-[#1557C9] transition-colors whitespace-nowrap"
            style={{ boxShadow: '0 6px 16px -6px rgba(31,108,240,.5)' }}
          >
            <Plus size={15} />
            Nuevo Producto
          </button>
        </div>
      </PageHeader>

      <div className="space-y-4">
        {listaFiltrada.map((prod: BomProducto) => {
          const estaExpandido = expandidos.has(prod.productoId)
          const costoTotal = prod.componentes.reduce(
            (s: number, c: BomComponente) => s + c.cantidad * c.costoUnitario, 0
          )

          return (
            <div key={prod.productoId} className="bg-white rounded-2xl border border-[#E8EDF4] overflow-hidden">
              <div className="flex items-center gap-3 px-6 py-4 hover:bg-[#F9FBFE] transition-colors">
                <button
                  onClick={() => toggleExpansion(prod.productoId)}
                  className="flex items-center gap-3 flex-1 text-left"
                >
                  <div className="w-9 h-9 bg-[#EAF2FE] rounded-lg flex items-center justify-center shrink-0">
                    <Package size={16} className="text-[#1F6CF0]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-[#15233B] text-sm">{prod.producto}</p>
                      <span className="text-xs text-[#5A6B85] bg-[#F4F7FB] px-2 py-0.5 rounded-full">
                        {prod.productoId}
                      </span>
                    </div>
                    <p className="text-xs text-[#5A6B85] mt-0.5">
                      {prod.componentes.length} componentes · Costo base: {formatCOPCurrency(costoTotal)} / unidad
                    </p>
                  </div>
                  {estaExpandido
                    ? <ChevronDown size={18} className="text-[#5A6B85] shrink-0" />
                    : <ChevronRight size={18} className="text-[#5A6B85] shrink-0" />
                  }
                </button>

                <button
                  onClick={() => abrirAgregarComponente(prod.productoId)}
                  className="flex items-center gap-1.5 text-[12px] font-semibold text-[#1F6CF0] hover:text-[#1557C9] bg-[#EAF2FE] hover:bg-[#D5E8FC] px-3 py-1.5 rounded-[9px] transition-all shrink-0"
                >
                  <Plus size={13} />
                  Componente
                </button>
              </div>

              {estaExpandido && (
                <div className="border-t border-[#E8EDF4] overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#F7FAFD]">
                        {['ID', 'Componente', 'Cantidad', 'Unidad', 'Proveedor', 'Costo Unit.', 'Costo Total', 'Lead Time', 'Acciones'].map((h) => (
                          <th key={h} className="text-left px-5 py-3 text-[10.5px] font-semibold text-[#5A6B85] uppercase tracking-[.05em]">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {prod.componentes.map((comp: BomComponente) => (
                        <tr key={comp.id} className="border-t border-[#EEF2F8] hover:bg-[#F9FBFE] transition-colors">
                          <td className="px-5 py-3">
                            <span className="font-mono text-xs text-[#5A6B85]">{comp.id}</span>
                          </td>
                          <td className="px-5 py-3 font-medium text-[#5A6B85]">{comp.componente}</td>
                          <td className="px-5 py-3 text-[#5A6B85] font-semibold">
                            {new Intl.NumberFormat('es-CO').format(comp.cantidad)}
                          </td>
                          <td className="px-5 py-3 text-[#5A6B85]">{comp.unidad}</td>
                          <td className="px-5 py-3 text-[#5A6B85]">{comp.proveedor}</td>
                          <td className="px-5 py-3 text-[#1F6CF0] font-semibold">
                            {formatCOPCurrency(comp.costoUnitario)}
                          </td>
                          <td className="px-5 py-3 font-bold text-[#15233B]">
                            {formatCOPCurrency(comp.cantidad * comp.costoUnitario)}
                          </td>
                          <td className="px-5 py-3 text-[#5A6B85] text-xs">{comp.leadTimeDias} días</td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => abrirEditarComponente(prod.productoId, comp)}
                                className="p-1.5 rounded-lg text-[#97A4B8] hover:text-[#6E56E0] hover:bg-[#F0ECFD] transition-all"
                                title="Editar"
                              >
                                <Pencil size={13} />
                              </button>
                              <button
                                onClick={() => confirmarEliminar(prod.productoId, comp.id)}
                                className="p-1.5 rounded-lg text-[#97A4B8] hover:text-[#EF4444] hover:bg-[#FDECEC] transition-all"
                                title="Eliminar"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {prod.componentes.length === 0 && (
                        <tr>
                          <td colSpan={9} className="text-center py-6 text-[#97A4B8] text-xs">
                            Sin componentes. Agrega el primero con el botón &quot;+&quot;.
                          </td>
                        </tr>
                      )}
                      <tr className="border-t-2 border-[#E8EDF4] bg-[#F4F7FB]">
                        <td colSpan={6} className="px-5 py-3 text-right text-sm font-bold text-[#5A6B85]">
                          Costo total por unidad:
                        </td>
                        <td className="px-5 py-3 font-bold text-[#1F6CF0] text-sm">
                          {formatCOPCurrency(costoTotal)}
                        </td>
                        <td colSpan={2} />
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Modal Nuevo Producto */}
      <Modal
        abierto={modalNuevoProducto}
        onCerrar={() => setModalNuevoProducto(false)}
        titulo="Nuevo Producto BOM"
        ancho="sm"
      >
        <NuevoProductoForm
          onGuardar={handleNuevoProducto}
          onCancelar={() => setModalNuevoProducto(false)}
        />
      </Modal>

      {/* Modal Componente */}
      <Modal
        abierto={modalComponente}
        onCerrar={() => setModalComponente(false)}
        titulo={componenteEditar ? 'Editar Componente' : 'Agregar Componente'}
        ancho="md"
      >
        <ComponenteForm
          inicial={componenteEditar ?? undefined}
          onGuardar={handleGuardarComponente}
          onCancelar={() => setModalComponente(false)}
        />
      </Modal>

      {/* Confirm Eliminar */}
      <ConfirmDialog
        abierto={confirmAbierto}
        titulo="Eliminar Componente"
        descripcion="¿Estás seguro de que deseas eliminar este componente del BOM? Esta acción no se puede deshacer."
        labelConfirmar="Eliminar"
        colorConfirmar="red"
        onCancelar={() => setConfirmAbierto(false)}
        onConfirmar={handleEliminar}
      />

      <Toast {...toast} onClose={cerrarToast} />
    </div>
  )
}

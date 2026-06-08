'use client'

import { useState, useEffect } from 'react'
import { FlaskConical, CheckCircle2, XCircle, Clock, Search, Save, Plus } from 'lucide-react'
import { useAppContext } from '@/context/AppContext'
import { useCalidadContext } from '@/context/CalidadContext'
import { formatFechaCorta } from '@/lib/fecha'
import PageHeader from '@/components/manufactura/PageHeader'
import StatusBadge from '@/components/manufactura/StatusBadge'
import SlideOver from '@/components/manufactura/SlideOver'
import Toast from '@/components/manufactura/Toast'
import { useToast } from '@/hooks/useToast'
import type { Muestra, ResultadoInspeccion } from '@/context/AppContext'

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const formatFecha = formatFechaCorta

// ─── PANEL MEDICIÓN ───────────────────────────────────────────────────────────

function PanelMedicion({
  muestra,
  fichas,
  onGuardar,
}: {
  muestra: Muestra
  fichas: ReturnType<typeof useCalidadContext>['fichasMutable']
  onGuardar: (resultados: ResultadoInspeccion[], estado: Muestra['estado']) => void
}) {
  // Find matching ficha by product name
  const ficha = fichas.find(
    (f) => f.producto.toLowerCase().includes(muestra.producto.toLowerCase().split(' ')[0])
  )

  // Initialize mediciones from existing results or ficha criterios
  const initialMediciones: Record<string, string> = {}
  if (muestra.resultados.length > 0) {
    muestra.resultados.forEach((r) => {
      initialMediciones[r.parametro] = String(r.valorMedido ?? '')
    })
  } else if (ficha) {
    ficha.criterios.forEach((c) => {
      initialMediciones[c.parametro] = ''
    })
  }

  const [mediciones, setMediciones] = useState<Record<string, string>>(initialMediciones)
  const [observaciones, setObservaciones] = useState(muestra.observaciones ?? '')

  const criterios = ficha?.criterios ?? muestra.resultados.map((r) => ({
    parametro: r.parametro,
    valorNominal: r.valorNominal,
    tolerancia: r.tolerancia,
    unidad: r.unidad,
    critico: r.critico,
  }))

  if (criterios.length === 0) {
    return (
      <div className="text-center py-8 text-[#97A4B8]">
        <FlaskConical size={32} className="mx-auto mb-2 opacity-25" />
        <p className="text-sm">No hay ficha técnica asociada a este producto</p>
        <p className="text-xs mt-1">Cree una ficha en Fichas Técnicas para habilitar la medición</p>
      </div>
    )
  }

  const handleGuardar = () => {
    const resultados: ResultadoInspeccion[] = criterios.map((c) => {
      const val = parseFloat(mediciones[c.parametro] ?? '')
      const aprobado = !isNaN(val) && Math.abs(val - c.valorNominal) <= c.tolerancia
      return {
        parametro: c.parametro,
        valorMedido: isNaN(val) ? 0 : val,
        valorNominal: c.valorNominal,
        tolerancia: c.tolerancia,
        unidad: c.unidad,
        aprobado,
        critico: c.critico,
      }
    })

    const todosMedidos = criterios.every((c) => mediciones[c.parametro] !== '')
    const algunoFuera = resultados.some((r) => !r.aprobado)
    const algUnCriticoFuera = resultados.some((r) => r.critico && !r.aprobado)

    const nuevoEstado: Muestra['estado'] = !todosMedidos
      ? 'EN_REVISION'
      : algUnCriticoFuera || algunoFuera
      ? 'RECHAZADA'
      : 'APROBADA'

    onGuardar(resultados, nuevoEstado)
  }

  const allFilled = criterios.every((c) => mediciones[c.parametro]?.trim() !== '')

  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold text-[#5A6B85] uppercase tracking-wide">
        Ingreso de Mediciones
        {ficha && <span className="ml-2 text-[#1F6CF0] normal-case font-medium">· Ficha {ficha.id}</span>}
      </p>

      <div className="space-y-3">
        {criterios.map((c) => {
          const val = parseFloat(mediciones[c.parametro] ?? '')
          const medido = !isNaN(val) && mediciones[c.parametro] !== ''
          const aprobado = medido && Math.abs(val - c.valorNominal) <= c.tolerancia
          const desv = medido ? val - c.valorNominal : null

          return (
            <div
              key={c.parametro}
              className={`p-3 rounded-xl border transition-all ${
                medido
                  ? aprobado
                    ? 'border-[#16B364]/30 bg-[#E7F8EF]/50'
                    : 'border-[#EF4444]/30 bg-[#FDECEC]/50'
                  : 'border-[#E8EDF4] bg-[#F7FAFD]'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-[#15233B]">{c.parametro}</span>
                  {c.critico && (
                    <span className="text-[9px] font-bold text-[#EF4444] border border-[#EF4444]/30 px-1 py-px rounded">
                      CRÍTICO
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-[#97A4B8] font-mono">
                  {c.valorNominal} ± {c.tolerancia} {c.unidad}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.001"
                  value={mediciones[c.parametro] ?? ''}
                  onChange={(e) =>
                    setMediciones((prev) => ({ ...prev, [c.parametro]: e.target.value }))
                  }
                  placeholder={`Valor en ${c.unidad}`}
                  className="flex-1 border border-[#E8EDF4] rounded-lg px-3 py-2 text-sm text-[#15233B] focus:outline-none focus:border-[#1F6CF0] focus:ring-2 focus:ring-[#EAF2FE] transition font-mono"
                />
                {medido && (
                  aprobado
                    ? <CheckCircle2 size={18} className="text-[#16B364] shrink-0" />
                    : <XCircle size={18} className="text-[#EF4444] shrink-0" />
                )}
              </div>

              {desv !== null && (
                <p className={`text-[10px] mt-1.5 font-mono font-medium ${aprobado ? 'text-[#16B364]' : 'text-[#EF4444]'}`}>
                  Desv: {desv >= 0 ? '+' : ''}{desv.toFixed(3)} {c.unidad}
                  {!aprobado && <span className="ml-2">⚠ Fuera de tolerancia</span>}
                </p>
              )}
            </div>
          )
        })}
      </div>

      <div>
        <label className="block text-xs font-semibold text-[#5A6B85] mb-1.5">Observaciones</label>
        <textarea
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
          rows={2}
          placeholder="Anomalías o comentarios del inspector..."
          className="w-full border border-[#E8EDF4] rounded-lg px-3 py-2 text-xs text-[#5A6B85] focus:outline-none focus:border-[#1F6CF0] resize-none transition"
        />
      </div>

      <button
        onClick={handleGuardar}
        className="w-full flex items-center justify-center gap-2 bg-[#1F6CF0] text-white rounded-xl py-3 text-sm font-semibold hover:bg-[#1557C9] transition"
        style={{ boxShadow: '0 6px 16px -6px rgba(31,108,240,.5)' }}
      >
        <Save size={15} />
        {allFilled ? 'Guardar y Clasificar Muestra' : 'Guardar Mediciones Parciales'}
      </button>
    </div>
  )
}

// ─── PÁGINA ───────────────────────────────────────────────────────────────────

export default function MuestreoPage() {
  const { muestras, actualizarMuestra, agregarMuestra, ordenes } = useAppContext()
  const { fichasMutable: fichas } = useCalidadContext()
  const { toast, mostrarToast, cerrarToast } = useToast()

  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<'TODAS' | Muestra['estado']>('TODAS')
  const [seleccionada, setSeleccionada] = useState<Muestra | null>(null)
  const [tabDetalle, setTabDetalle] = useState<'info' | 'medicion'>('info')
  const [modalNueva, setModalNueva] = useState(false)
  const [nuevaForm, setNuevaForm] = useState({
    inspector: '',
    ordenId: '',
    observaciones: '',
  })

  const filtradas = mounted ? muestras.filter((m) => {
    const okEstado = filtroEstado === 'TODAS' || m.estado === filtroEstado
    const okBusqueda =
      !busqueda ||
      m.id.toLowerCase().includes(busqueda.toLowerCase()) ||
      m.ordenId.toLowerCase().includes(busqueda.toLowerCase()) ||
      m.producto.toLowerCase().includes(busqueda.toLowerCase()) ||
      m.loteId.toLowerCase().includes(busqueda.toLowerCase())
    return okEstado && okBusqueda
  }) : []

  const tabs = [
    { key: 'TODAS',      label: 'Todas'      },
    { key: 'PENDIENTE',  label: 'Pendiente'  },
    { key: 'EN_REVISION', label: 'En Revisión' },
    { key: 'APROBADA',   label: 'Aprobada'   },
    { key: 'RECHAZADA',  label: 'Rechazada'  },
  ] as const

  const countPor = (e: Muestra['estado'] | 'TODAS') =>
    mounted ? (e === 'TODAS' ? muestras.length : muestras.filter((m) => m.estado === e).length) : 0

  function handleGuardarMedicion(
    muestra: Muestra,
    resultados: ResultadoInspeccion[],
    estado: Muestra['estado']
  ) {
    actualizarMuestra(muestra.id, { resultados, estado, observaciones: muestra.observaciones })
    setSeleccionada((prev) => prev ? { ...prev, resultados, estado } : null)
    mostrarToast(
      estado === 'APROBADA'
        ? 'Muestra aprobada — todos los parámetros dentro de spec'
        : estado === 'RECHAZADA'
        ? 'Muestra rechazada — parámetros fuera de tolerancia'
        : 'Mediciones parciales guardadas',
      estado === 'APROBADA' ? 'success' : estado === 'RECHAZADA' ? 'error' : 'success'
    )
  }

  function handleCrearMuestra() {
    const orden = ordenes.find((o) => o.id === nuevaForm.ordenId)
    if (!orden || !nuevaForm.inspector) return
    const nueva: Muestra = {
      id: `MUE-${Date.now().toString().slice(-6)}`,
      ordenId: orden.id,
      loteId: orden.loteId,
      producto: orden.producto,
      fechaRegistro: new Date().toISOString(),
      inspector: nuevaForm.inspector,
      estado: 'PENDIENTE',
      resultados: [],
      observaciones: nuevaForm.observaciones,
    }
    agregarMuestra(nueva)
    setModalNueva(false)
    setNuevaForm({ inspector: '', ordenId: '', observaciones: '' })
    mostrarToast('Muestra creada correctamente', 'success')
  }

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader
        titulo="Muestreo de Calidad"
        subtitulo="Registro de muestras y resultados de inspección — Calidad"
      >
        <button
          onClick={() => setModalNueva(true)}
          className="flex items-center gap-[7px] bg-[#1F6CF0] text-white rounded-[11px] px-[15px] py-[9px] text-[13px] font-semibold hover:bg-[#1557C9] transition-colors"
          style={{ boxShadow: '0 6px 16px -6px rgba(31,108,240,.5)' }}
        >
          <Plus size={15} />
          Nueva Muestra
        </button>
      </PageHeader>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total muestras', value: muestras.length, color: '#1F6CF0', bg: '#EAF2FE' },
          { label: 'Aprobadas', value: countPor('APROBADA'), color: '#16B364', bg: '#E7F8EF' },
          { label: 'Rechazadas', value: countPor('RECHAZADA'), color: '#EF4444', bg: '#FDECEC' },
          { label: 'Pendientes', value: countPor('PENDIENTE') + countPor('EN_REVISION'), color: '#F59E0B', bg: '#FEF3E2' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className="bg-white rounded-xl border border-[#E8EDF4] shadow-sm p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
              <FlaskConical size={18} style={{ color }} />
            </div>
            <div>
              <p className="text-xl font-bold leading-none" style={{ color }}>{value}</p>
              <p className="text-[11px] text-[#5A6B85] mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex flex-wrap gap-2">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFiltroEstado(key)}
              className={`px-[13px] py-[8px] rounded-[10px] text-[12.5px] font-medium transition-all border ${
                filtroEstado === key
                  ? 'bg-[#16B364] text-white border-[#16B364] shadow-sm'
                  : 'bg-white text-[#5A6B85] border-[#E8EDF4] hover:border-[#16B364]'
              }`}
            >
              {label}
              <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${filtroEstado === key ? 'bg-white/20' : 'bg-[#F4F7FB]'}`}>
                {countPor(key === 'TODAS' ? 'TODAS' : key as Muestra['estado'])}
              </span>
            </button>
          ))}
        </div>

        <div className="relative ml-auto">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#97A4B8]" />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar muestra, orden, lote…"
            className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[#E8EDF4] bg-white outline-none focus:border-[#16B364] w-52"
          />
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl border border-[#E8EDF4] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[#F7FAFD] border-b border-[#E8EDF4]">
                {['ID Muestra', 'Orden / Lote', 'Producto', 'Inspector', 'Parámetros', 'Registrada', 'Estado', ''].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-[#5A6B85] font-semibold uppercase tracking-wide text-[10px]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtradas.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-[#97A4B8]">
                    <FlaskConical size={36} className="mx-auto mb-2 opacity-20" />
                    <p>No hay muestras para los filtros seleccionados</p>
                  </td>
                </tr>
              )}
              {filtradas.map((m) => {
                const aprobados = m.resultados.filter((r) => r.aprobado).length
                const total = m.resultados.length
                return (
                  <tr key={m.id} className="border-b border-[#EEF2F8] hover:bg-[#F9FBFE] transition-colors">
                    <td className="px-5 py-3.5 font-mono font-semibold text-[#4C9FE6]">{m.id}</td>
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-[#15233B]">{m.ordenId}</p>
                      <p className="text-[#97A4B8] font-mono">{m.loteId}</p>
                    </td>
                    <td className="px-5 py-3.5 text-[#5A6B85] max-w-[160px]">
                      <span className="truncate block">{m.producto}</span>
                    </td>
                    <td className="px-5 py-3.5 text-[#5A6B85]">{m.inspector}</td>
                    <td className="px-5 py-3.5">
                      {total > 0 ? (
                        <div className="flex items-center gap-1.5">
                          <div className="w-14 h-1.5 bg-[#F4F7FB] rounded-full overflow-hidden">
                            <div className="h-full bg-[#16B364] rounded-full" style={{ width: `${(aprobados / total) * 100}%` }} />
                          </div>
                          <span className="text-[#5A6B85]">{aprobados}/{total}</span>
                        </div>
                      ) : (
                        <span className="text-[#D1D5DB]">Sin medir</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-[#97A4B8] whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Clock size={11} />
                        {formatFecha(m.fechaRegistro)}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge estado={m.estado} size="sm" />
                    </td>
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => {
                          setSeleccionada(m)
                          setTabDetalle(m.estado === 'PENDIENTE' || m.estado === 'EN_REVISION' ? 'medicion' : 'info')
                        }}
                        className="text-[#16B364] hover:text-[#16B364] font-semibold transition-colors text-[11px]"
                      >
                        {m.estado === 'PENDIENTE' || m.estado === 'EN_REVISION' ? 'Medir →' : 'Ver →'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* SlideOver detalle / medición */}
      <SlideOver
        abierto={Boolean(seleccionada)}
        onCerrar={() => setSeleccionada(null)}
        titulo={seleccionada?.id ?? ''}
        subtitulo={seleccionada ? `${seleccionada.producto} · ${seleccionada.loteId}` : ''}
        ancho="md"
      >
        {seleccionada && (
          <div className="space-y-5">
            {/* Tabs */}
            <div className="flex gap-1 bg-[#F4F7FB] rounded-xl p-1">
              {[
                { key: 'info', label: 'Información' },
                { key: 'medicion', label: 'Medición' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setTabDetalle(key as 'info' | 'medicion')}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                    tabDetalle === key
                      ? 'bg-white text-[#15233B] shadow-sm'
                      : 'text-[#5A6B85] hover:text-[#15233B]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {tabDetalle === 'info' ? (
              <>
                {/* Info */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Orden', value: seleccionada.ordenId },
                    { label: 'Lote', value: seleccionada.loteId },
                    { label: 'Inspector', value: seleccionada.inspector },
                    { label: 'Registrada', value: formatFecha(seleccionada.fechaRegistro) },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-[#F4F7FB] rounded-lg px-3 py-2.5">
                      <p className="text-[10px] text-[#97A4B8] uppercase tracking-wide mb-0.5">{label}</p>
                      <p className="text-sm font-semibold text-[#15233B]">{value}</p>
                    </div>
                  ))}
                </div>

                {/* Resultados */}
                {seleccionada.resultados.length > 0 ? (
                  <div>
                    <p className="text-xs font-semibold text-[#5A6B85] uppercase tracking-wide mb-3">Resultados de parámetros</p>
                    <div className="space-y-2">
                      {seleccionada.resultados.map((r) => (
                        <div key={r.parametro} className="flex items-center justify-between p-3 rounded-lg border border-[#E8EDF4] bg-[#F7FAFD]">
                          <div>
                            <p className="text-xs font-medium text-[#15233B]">{r.parametro}</p>
                            <p className="text-[10px] text-[#97A4B8]">
                              Nominal: {r.valorNominal} {r.unidad} ± {r.tolerancia}
                              {r.critico && <span className="ml-2 text-[#EF4444] font-bold">CRÍTICO</span>}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-bold text-[#15233B]">{r.valorMedido} {r.unidad}</span>
                            {r.aprobado
                              ? <CheckCircle2 size={16} className="text-[#16B364]" />
                              : <XCircle size={16} className="text-[#EF4444]" />
                            }
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-[#97A4B8]">
                    <FlaskConical size={32} className="mx-auto mb-2 opacity-25" />
                    <p className="text-sm">Sin parámetros medidos aún</p>
                    <button
                      onClick={() => setTabDetalle('medicion')}
                      className="mt-3 text-xs text-[#1F6CF0] font-semibold hover:underline"
                    >
                      Ir a Medición →
                    </button>
                  </div>
                )}

                {seleccionada.observaciones && (
                  <div className="p-3 bg-[#F4F7FB] rounded-lg border border-[#E8EDF4]">
                    <p className="text-[10px] text-[#97A4B8] uppercase tracking-wide mb-1">Observaciones</p>
                    <p className="text-xs text-[#5A6B85]">{seleccionada.observaciones}</p>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <StatusBadge estado={seleccionada.estado} />
                </div>
              </>
            ) : (
              <PanelMedicion
                muestra={seleccionada}
                fichas={fichas}
                onGuardar={(resultados, estado) =>
                  handleGuardarMedicion(seleccionada, resultados, estado)
                }
              />
            )}
          </div>
        )}
      </SlideOver>

      {/* Modal nueva muestra manual */}
      {modalNueva && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setModalNueva(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8EDF4]">
              <div>
                <h3 className="font-bold text-[#15233B]">Nueva Muestra Manual</h3>
                <p className="text-xs text-[#5A6B85]">Crear muestra de inspección manualmente</p>
              </div>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#5A6B85] mb-1.5">
                  Orden de Producción <span className="text-[#EF4444]">*</span>
                </label>
                <select
                  value={nuevaForm.ordenId}
                  onChange={(e) => setNuevaForm((p) => ({ ...p, ordenId: e.target.value }))}
                  className="w-full border border-[#E8EDF4] rounded-lg px-3 py-2.5 text-sm text-[#15233B] focus:outline-none focus:border-[#1F6CF0] focus:ring-2 focus:ring-[#EAF2FE] transition"
                >
                  <option value="">Seleccionar orden…</option>
                  {ordenes.map((o) => (
                    <option key={o.id} value={o.id}>{o.id} — {o.producto}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#5A6B85] mb-1.5">
                  Inspector <span className="text-[#EF4444]">*</span>
                </label>
                <input
                  type="text"
                  value={nuevaForm.inspector}
                  onChange={(e) => setNuevaForm((p) => ({ ...p, inspector: e.target.value }))}
                  placeholder="Nombre del inspector"
                  className="w-full border border-[#E8EDF4] rounded-lg px-3 py-2.5 text-sm text-[#15233B] focus:outline-none focus:border-[#1F6CF0] focus:ring-2 focus:ring-[#EAF2FE] transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#5A6B85] mb-1.5">Observaciones</label>
                <textarea
                  value={nuevaForm.observaciones}
                  onChange={(e) => setNuevaForm((p) => ({ ...p, observaciones: e.target.value }))}
                  rows={2}
                  placeholder="Motivo de la muestra manual..."
                  className="w-full border border-[#E8EDF4] rounded-lg px-3 py-2.5 text-sm text-[#5A6B85] focus:outline-none focus:border-[#1F6CF0] resize-none transition"
                />
              </div>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button
                onClick={() => setModalNueva(false)}
                className="flex-1 border border-[#E8EDF4] text-[#5A6B85] rounded-lg py-2.5 text-sm font-semibold hover:bg-[#F4F7FB] transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleCrearMuestra}
                disabled={!nuevaForm.ordenId || !nuevaForm.inspector}
                className="flex-1 bg-[#1F6CF0] text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-[#1557C9] disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Crear Muestra
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast {...toast} onClose={cerrarToast} />
    </div>
  )
}

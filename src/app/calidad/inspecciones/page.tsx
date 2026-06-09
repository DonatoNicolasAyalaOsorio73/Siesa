'use client'

import { useState, useCallback, useEffect } from 'react'
import { FlaskConical, Clock, AlertTriangle, CheckCircle2, XCircle, User, ChevronRight, Search } from 'lucide-react'
import { useCalidadContext, tiempoEsperaMin, type Inspeccion, type ResultadoParametro } from '@/context/CalidadContext'
import { inspectoresDisponibles, SLA_MINUTOS, SLA_CRITICO_MINUTOS } from '@/data/calidadData'
import PageHeader from '@/components/manufactura/PageHeader'
import StatusBadge from '@/components/manufactura/StatusBadge'
import SlideOver from '@/components/manufactura/SlideOver'
import InspectionForm from '@/components/calidad/InspectionForm'
import { useToast } from '@/hooks/useToast'
import Toast from '@/components/manufactura/Toast'

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const ESTADO_TABS = ['TODAS', 'PENDIENTE', 'EN_PROCESO', 'APROBADA', 'RECHAZADA'] as const

function SlaChip({ min }: { min: number }) {
  if (min >= SLA_CRITICO_MINUTOS) {
    return (
      <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#FDECEC] text-[#EF4444]">
        <AlertTriangle size={10} />
        {min} min
      </span>
    )
  }
  if (min >= SLA_MINUTOS) {
    return (
      <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#FEF3E2] text-[#F59E0B]">
        <Clock size={10} />
        {min} min
      </span>
    )
  }
  return (
    <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-[#E7F8EF] text-[#16B364]">
      <CheckCircle2 size={10} />
      {min} min
    </span>
  )
}

// ─── PÁGINA ───────────────────────────────────────────────────────────────────

export default function InspeccionesPage() {
  const { inspecciones, aprobarInspeccion, rechazarInspeccion, cambiarInspector, fichasMutable } = useCalidadContext()
  const { toast, mostrarToast, cerrarToast } = useToast()

  const [filtroEstado, setFiltroEstado] = useState<typeof ESTADO_TABS[number]>('TODAS')
  const [busqueda, setBusqueda] = useState('')
  const [seleccionada, setSeleccionada] = useState<Inspeccion | null>(null)
  const [inspector, setInspector] = useState('')
  const [resultados, setResultados] = useState<ResultadoParametro[]>([])
  const [observaciones, setObservaciones] = useState('')
  const [motivoRechazo, setMotivoRechazo] = useState('')
  const [formCompleto, setFormCompleto] = useState(false)

  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const inspeccionesFiltradas = mounted ? inspecciones.filter((ins) => {
    if (filtroEstado !== 'TODAS' && ins.estado !== filtroEstado) return false
    if (busqueda) {
      const q = busqueda.toLowerCase()
      return ins.id.toLowerCase().includes(q) || ins.producto.toLowerCase().includes(q) || ins.loteId.toLowerCase().includes(q)
    }
    return true
  }) : []

  const counts = ESTADO_TABS.reduce((acc, e) => {
    acc[e] = mounted ? (e === 'TODAS' ? inspecciones.length : inspecciones.filter((i) => i.estado === e).length) : 0
    return acc
  }, {} as Record<string, number>)

  const pendientesReales = mounted
    ? inspecciones.filter((i) => i.estado === 'PENDIENTE' || i.estado === 'EN_PROCESO').length
    : 0

  function abrirInspeccion(ins: Inspeccion) {
    setSeleccionada(ins)
    setInspector(ins.inspector ?? '')
    setResultados(ins.resultados)
    setObservaciones(ins.observaciones)
    setMotivoRechazo('')
    setFormCompleto(false)
  }

  function cerrarPanel() {
    setSeleccionada(null)
  }

  function handleAsignarInspector() {
    if (!seleccionada || !inspector) return
    cambiarInspector(seleccionada.id, inspector)
    setSeleccionada((prev) => prev ? { ...prev, inspector, estado: 'EN_PROCESO' } : prev)
    mostrarToast(`Inspector ${inspector} asignado`, 'success')
  }

  function handleAprobar() {
    if (!seleccionada) return
    aprobarInspeccion(seleccionada.id, resultados, observaciones)
    cerrarPanel()
    mostrarToast(`✓ Inspección ${seleccionada.id} aprobada — Lote ${seleccionada.loteId} liberado`, 'success')
  }

  function handleRechazar() {
    if (!seleccionada) return
    rechazarInspeccion(seleccionada.id, resultados, observaciones, motivoRechazo)
    cerrarPanel()
    mostrarToast(`✗ Lote ${seleccionada.loteId} rechazado — NC generada`, 'error')
  }

  const handleResultadosChange = useCallback((res: ResultadoParametro[], completo: boolean) => {
    setResultados(res)
    setFormCompleto(completo)
  }, [])

  const fichaTecnica = seleccionada ? fichasMutable.find((f) => f.id === seleccionada.fichaTecnicaId) : null

  const hayRechazos = resultados.some((r) => r.aprobado === false)

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader titulo="Inspecciones de Calidad" subtitulo="Control de calidad en proceso — módulo Calidad">
        <div className="flex items-center gap-2">
          {pendientesReales > 0 && (
            <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-[#FEF3E2] text-[#F59E0B] border border-[#FEF3E2]">
              <AlertTriangle size={12} />
              {pendientesReales} inspecc. pendiente{pendientesReales > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </PageHeader>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex flex-wrap gap-2">
          {ESTADO_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setFiltroEstado(tab)}
              className={`px-[13px] py-[8px] rounded-[10px] text-[12.5px] font-medium transition-all border ${
                filtroEstado === tab
                  ? 'bg-[#16B364] text-white border-[#16B364] shadow-sm'
                  : 'bg-white text-[#5A6B85] border-[#E8EDF4] hover:border-[#16B364]'
              }`}
            >
              {tab === 'TODAS' ? 'Todas' : tab.charAt(0) + tab.slice(1).toLowerCase().replace('_', ' ')}
              <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${filtroEstado === tab ? 'bg-white/20' : 'bg-[#F4F7FB]'}`}>
                {counts[tab]}
              </span>
            </button>
          ))}
        </div>

        <div className="relative ml-auto">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#97A4B8]" />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar inspección, lote…"
            className="pl-8 pr-3 py-[9px] text-[13px] rounded-[11px] border border-[#E8EDF4] bg-white outline-none focus:border-[#16B364] focus:ring-1 focus:ring-[#16B364]/30 w-52"
          />
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl border border-[#E8EDF4] overflow-hidden" style={{boxShadow:"0 1px 2px rgba(21,35,59,.03)"}}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[#F7FAFD]">
                {['ID', 'Producto / Lote', 'Línea', 'Operario', 'Inspector', 'Tiempo espera', 'Estado', ''].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-[#5A6B85] font-semibold uppercase tracking-wide text-[10px]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {inspeccionesFiltradas.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-[#97A4B8]">
                    No hay inspecciones para los filtros seleccionados
                  </td>
                </tr>
              )}
              {inspeccionesFiltradas.map((ins) => {
                const espera = tiempoEsperaMin(ins)
                return (
                  <tr key={ins.id} className="border-b border-[#EEF2F8] hover:bg-[#F9FBFE] transition-colors">
                    <td className="px-5 py-3.5 font-mono text-[#1F6CF0] font-semibold">{ins.id}</td>
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-[#15233B]">{ins.producto}</p>
                      <p className="text-[#97A4B8] font-mono">{ins.loteId}</p>
                    </td>
                    <td className="px-5 py-3.5 text-[#5A6B85]">{ins.lineaProduccion}</td>
                    <td className="px-5 py-3.5 text-[#5A6B85]">{ins.operario}</td>
                    <td className="px-5 py-3.5">
                      {ins.inspector ? (
                        <span className="flex items-center gap-1 text-[#5A6B85]">
                          <User size={11} />
                          {ins.inspector}
                        </span>
                      ) : (
                        <span className="text-[#D1D5DB] italic">Sin asignar</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      {ins.estado === 'PENDIENTE' || ins.estado === 'EN_PROCESO' ? (
                        <SlaChip min={espera} />
                      ) : (
                        <span className="text-[#97A4B8]">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge estado={ins.estado} size="sm" />
                    </td>
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => abrirInspeccion(ins)}
                        className="flex items-center gap-1 text-[#16B364] font-semibold hover:text-[#16B364] transition-colors"
                      >
                        Ver <ChevronRight size={13} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* SlideOver detalle */}
      <SlideOver
        abierto={Boolean(seleccionada)}
        onCerrar={cerrarPanel}
        titulo={seleccionada ? seleccionada.id : ''}
        subtitulo={seleccionada ? `${seleccionada.producto} · ${seleccionada.loteId}` : ''}
        ancho="lg"
      >
        {seleccionada && (
          <div className="space-y-5">
            {/* Info rápida */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Orden', value: seleccionada.ordenId },
                { label: 'Lote', value: seleccionada.loteId },
                { label: 'Línea', value: seleccionada.lineaProduccion },
                { label: 'Operario', value: seleccionada.operario },
              ].map(({ label, value }) => (
                <div key={label} className="bg-[#F4F7FB] rounded-lg px-3 py-2.5">
                  <p className="text-[10px] text-[#97A4B8] uppercase tracking-wide mb-0.5">{label}</p>
                  <p className="text-sm font-semibold text-[#15233B]">{value}</p>
                </div>
              ))}
            </div>

            {/* Tiempo de espera */}
            {(seleccionada.estado === 'PENDIENTE' || seleccionada.estado === 'EN_PROCESO') && (
              <div className="flex items-center justify-between p-3 rounded-xl border border-[#E8EDF4] bg-white">
                <span className="text-xs font-semibold text-[#5A6B85]">Tiempo en cola</span>
                <SlaChip min={tiempoEsperaMin(seleccionada)} />
              </div>
            )}

            {/* Asignar inspector */}
            {(seleccionada.estado === 'PENDIENTE' || seleccionada.estado === 'EN_PROCESO') && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-[#5A6B85] uppercase tracking-wide">Inspector</p>
                <div className="flex gap-2">
                  <select
                    value={inspector}
                    onChange={(e) => setInspector(e.target.value)}
                    className="flex-1 rounded-lg border border-[#E8EDF4] px-3 py-2 text-sm text-[#15233B] outline-none focus:border-[#16B364] focus:ring-1 focus:ring-[#16B364]/30"
                  >
                    <option value="">Seleccionar inspector…</option>
                    {inspectoresDisponibles.map((i) => (
                      <option key={i} value={i}>{i}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleAsignarInspector}
                    disabled={!inspector}
                    className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#16B364] text-white disabled:opacity-40 hover:bg-[#16B364] transition-colors"
                  >
                    Asignar
                  </button>
                </div>
              </div>
            )}

            {/* Parámetros */}
            {fichaTecnica && (seleccionada.estado === 'EN_PROCESO' || seleccionada.estado === 'PENDIENTE') && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-[#5A6B85] uppercase tracking-wide">
                  Medición de parámetros — {fichaTecnica.producto}
                </p>
                <InspectionForm
                  parametros={fichaTecnica.criterios}
                  onResultadosChange={handleResultadosChange}
                />
              </div>
            )}

            {/* Resultados de inspección completada */}
            {(seleccionada.estado === 'APROBADA' || seleccionada.estado === 'RECHAZADA') && seleccionada.resultados.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-[#5A6B85] uppercase tracking-wide">Resultados</p>
                <div className="space-y-2">
                  {seleccionada.resultados.map((r) => (
                    <div key={r.parametro} className="flex items-center justify-between p-3 rounded-lg border border-[#E8EDF4] bg-[#FAFBFC]">
                      <div>
                        <p className="text-xs font-medium text-[#15233B]">{r.parametro}</p>
                        <p className="text-[10px] text-[#97A4B8]">Nominal: {r.valorNominal} {r.unidad} ± {r.tolerancia}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-[#15233B]">{r.valorMedido} {r.unidad}</span>
                        {r.aprobado ? <CheckCircle2 size={15} className="text-[#16B364]" /> : <XCircle size={15} className="text-[#EF4444]" />}
                      </div>
                    </div>
                  ))}
                </div>
                {seleccionada.observaciones && (
                  <p className="text-xs text-[#5A6B85] italic p-3 bg-[#F4F7FB] rounded-lg">{seleccionada.observaciones}</p>
                )}
              </div>
            )}

            {/* Observaciones + motivo */}
            {(seleccionada.estado === 'EN_PROCESO' || seleccionada.estado === 'PENDIENTE') && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-[#5A6B85] uppercase tracking-wide block mb-1.5">Observaciones</label>
                  <textarea
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-[#E8EDF4] px-3 py-2 text-sm text-[#15233B] outline-none resize-none focus:border-[#16B364] focus:ring-1 focus:ring-[#16B364]/30"
                    placeholder="Observaciones del inspector…"
                  />
                </div>
                {hayRechazos && (
                  <div>
                    <label className="text-xs font-semibold text-[#EF4444] uppercase tracking-wide block mb-1.5">Motivo de rechazo</label>
                    <select
                      value={motivoRechazo}
                      onChange={(e) => setMotivoRechazo(e.target.value)}
                      className="w-full rounded-lg border border-[#EF4444] px-3 py-2 text-sm text-[#15233B] outline-none focus:ring-1 focus:ring-[#EF4444]/30"
                    >
                      <option value="">Seleccionar motivo…</option>
                      {resultados.filter((r) => r.aprobado === false).map((r) => (
                        <option key={r.parametro} value={`${r.parametro} fuera de tolerancia`}>
                          {r.parametro} fuera de tolerancia
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* Botones de acción */}
            {(seleccionada.estado === 'EN_PROCESO' || seleccionada.estado === 'PENDIENTE') && formCompleto && (
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleRechazar}
                  disabled={!hayRechazos && !motivoRechazo}
                  className="flex-1 py-2.5 rounded-xl border-2 border-[#EF4444] text-[#EF4444] text-sm font-bold disabled:opacity-30 hover:bg-[#FFF5F5] transition-all flex items-center justify-center gap-2"
                >
                  <XCircle size={15} />
                  Rechazar lote
                </button>
                <button
                  onClick={handleAprobar}
                  disabled={hayRechazos}
                  className="flex-1 py-2.5 rounded-xl bg-[#16B364] text-white text-sm font-bold disabled:opacity-30 hover:bg-[#16B364] transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={15} />
                  Aprobar lote
                </button>
              </div>
            )}

            {/* Estado final */}
            {(seleccionada.estado === 'APROBADA' || seleccionada.estado === 'RECHAZADA') && (
              <div className={`p-4 rounded-xl text-center font-bold text-sm ${seleccionada.estado === 'APROBADA' ? 'bg-[#E7F8EF] text-[#16B364]' : 'bg-[#FDECEC] text-[#EF4444]'}`}>
                {seleccionada.estado === 'APROBADA' ? '✓ Lote aprobado' : '✗ Lote rechazado — NC generada'}
              </div>
            )}
          </div>
        )}
      </SlideOver>

      <Toast {...toast} onClose={cerrarToast} />
    </div>
  )
}

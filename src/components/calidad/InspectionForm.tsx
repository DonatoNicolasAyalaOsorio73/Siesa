'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  CheckCircle2, XCircle, AlertTriangle, Minus,
  Mic, MicOff, Sparkles, Bot, Loader2,
} from 'lucide-react'
import type { ResultadoParametro } from '@/context/CalidadContext'

// ─── TIPOS ───────────────────────────────────────────────────────────────────

interface ParametroInspeccion {
  parametro: string
  valorNominal: number
  tolerancia: number
  unidad: string
  critico: boolean
}

interface ClasificacionIA {
  tipoDefecto: string
  severidad: 'CRITICA' | 'MAYOR' | 'MENOR'
  descripcionEstructurada: string
  parametroAfectado: string
  accionInmediata: string
  requiereDetencion: boolean
  confianza: number
  _mock?: boolean
}

interface InspectionFormProps {
  parametros: ParametroInspeccion[]
  onResultadosChange: (resultados: ResultadoParametro[], todosCompletos: boolean) => void
  contextoOrden?: { id: string; producto: string; operacionActual: string }
  onAnalisisIA?: (datos: { descripcion: string; accionInmediata: string; tipoDefecto: string }) => void
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function evaluarParametro(medido: number, nominal: number, tolerancia: number): boolean | null {
  if (isNaN(medido)) return null
  return Math.abs(medido - nominal) <= tolerancia
}

const SEVERIDAD_COLOR = {
  CRITICA: { bg: '#FDECEC', text: '#EF4444' },
  MAYOR: { bg: '#FEF3E2', text: '#F59E0B' },
  MENOR: { bg: '#EAF2FE', text: '#4C9FE6' },
}

// ─── COMPONENTE ───────────────────────────────────────────────────────────────

export default function InspectionForm({ parametros, onResultadosChange, contextoOrden, onAnalisisIA }: InspectionFormProps) {
  // ── Estado formulario de parámetros ──
  const [valores, setValores] = useState<Record<string, string>>({})

  // ── Estado asistente IA ──
  const [mensajeOperario, setMensajeOperario] = useState('')
  const [iaLoading, setIaLoading] = useState(false)
  const [iaResultado, setIaResultado] = useState<ClasificacionIA | null>(null)
  const [iaError, setIaError] = useState<string | null>(null)
  const [iaAplicado, setIaAplicado] = useState(false)
  const [dictando, setDictando] = useState(false)
  const [speechDisponible] = useState(() => {
    if (typeof window === 'undefined') return false
    return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window
  })
  const reconocimientoRef = useRef<any>(null)

  const ctxOrden = contextoOrden ?? {
    id: 'N/D',
    producto: 'Producto en inspección',
    operacionActual: 'Control de calidad',
  }

  // ── Propagación de resultados ──
  useEffect(() => {
    const resultados: ResultadoParametro[] = parametros.map((p) => {
      const raw = valores[p.parametro]
      const medido = parseFloat(raw ?? '')
      const aprobado = evaluarParametro(medido, p.valorNominal, p.tolerancia)
      return {
        parametro: p.parametro,
        valorMedido: isNaN(medido) ? 0 : medido,
        valorNominal: p.valorNominal,
        tolerancia: p.tolerancia,
        unidad: p.unidad,
        critico: p.critico,
        aprobado: aprobado,
      }
    })

    const todosCompletos = parametros.every((p) => {
      const raw = valores[p.parametro]
      return raw !== undefined && raw.trim() !== '' && !isNaN(parseFloat(raw))
    })

    onResultadosChange(resultados, todosCompletos)
  }, [valores, parametros, onResultadosChange])

  function handleChange(parametro: string, val: string) {
    setValores((prev) => ({ ...prev, [parametro]: val }))
  }

  // ── Web Speech API ──
  function handleDictar() {
    if (!speechDisponible) return
    if (dictando) {
      reconocimientoRef.current?.stop()
      setDictando(false)
      return
    }
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const rec = new SpeechRec()
    rec.lang = 'es-CO'
    rec.continuous = false
    rec.interimResults = false
    rec.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript
      setMensajeOperario((prev) => (prev ? prev + ' ' + transcript : transcript))
      setDictando(false)
    }
    rec.onerror = () => setDictando(false)
    rec.onend = () => setDictando(false)
    rec.start()
    reconocimientoRef.current = rec
    setDictando(true)
  }

  // ── Llamada a la API de IA ──
  async function handleAnalizarIA() {
    if (!mensajeOperario.trim()) return
    setIaLoading(true)
    setIaResultado(null)
    setIaError(null)
    setIaAplicado(false)

    try {
      const res = await fetch('/api/ia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modo: 'asistente_defectos',
          payload: { mensaje: mensajeOperario, contextoOrden: ctxOrden },
        }),
      })
      const data = await res.json()
      if (data.ok) {
        setIaResultado({ ...data.clasificacion, _mock: data.mock === true })
      } else {
        setIaError('No se pudo analizar el mensaje. Intenta de nuevo.')
      }
    } catch {
      setIaError('⚠ Siesa AI no disponible — Completa el formulario manualmente')
    } finally {
      setIaLoading(false)
    }
  }

  function handleUsarAnalisis() {
    if (!iaResultado) return
    setIaAplicado(true)
    onAnalisisIA?.({
      descripcion: iaResultado.descripcionEstructurada,
      accionInmediata: iaResultado.accionInmediata,
      tipoDefecto: iaResultado.tipoDefecto,
    })
  }

  const sevCfg = iaResultado ? SEVERIDAD_COLOR[iaResultado.severidad] : null

  return (
    <div className="space-y-5">
      {/* ── SECCIÓN ASISTENTE IA ── */}
      <div className="rounded-xl border border-[#6E56E0]/25 bg-gradient-to-br from-[#6E56E0]/5 to-white overflow-hidden">
        {/* Header IA */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#6E56E0]/15">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#6E56E0]/15 flex items-center justify-center">
              <Bot size={14} className="text-[#6E56E0]" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#15233B]">Asistente de Calidad IA</p>
              <p className="text-[10px] text-[#97A4B8]">Describe el defecto en tus propias palabras</p>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EEEBFB] text-[#6E56E0]">
            SIESA AI
          </span>
        </div>

        <div className="p-4 space-y-3">
          {/* Textarea */}
          <textarea
            value={mensajeOperario}
            onChange={(e) => setMensajeOperario(e.target.value)}
            rows={3}
            placeholder={`"El diámetro está un poco grande, como que la máquina torneó de más, se nota al tacto..."`}
            className="w-full rounded-lg border border-[#E8EDF4] px-3 py-2.5 text-sm text-[#15233B] outline-none resize-none focus:border-[#6E56E0] focus:ring-1 focus:ring-[#6E56E0]/25 placeholder:text-[#D1D5DB] font-normal"
          />

          {/* Botones */}
          <div className="flex items-center gap-2">
            {/* Dictar */}
            <button
              type="button"
              onClick={handleDictar}
              title={speechDisponible ? (dictando ? 'Detener dictado' : 'Dictar defecto') : 'Dictado disponible en Chrome. Escribe el defecto manualmente.'}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${
                dictando
                  ? 'bg-[#EF4444] text-white border-[#EF4444] animate-pulse'
                  : speechDisponible
                  ? 'bg-white text-[#5A6B85] border-[#E8EDF4] hover:border-[#6E56E0] hover:text-[#6E56E0]'
                  : 'bg-[#F4F7FB] text-[#97A4B8] border-[#E8EDF4] cursor-not-allowed'
              }`}
              disabled={iaLoading}
            >
              {dictando ? <MicOff size={13} /> : <Mic size={13} />}
              {dictando ? 'Grabando…' : 'Dictar'}
            </button>

            {/* Analizar */}
            <button
              type="button"
              onClick={handleAnalizarIA}
              disabled={iaLoading || !mensajeOperario.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-[#6E56E0] text-white disabled:opacity-40 hover:bg-[#5B45CC] transition-colors"
            >
              {iaLoading ? (
                <><Loader2 size={13} className="animate-spin" />Analizando con Siesa AI…</>
              ) : (
                <><Sparkles size={13} />Analizar con IA</>
              )}
            </button>
          </div>

          {/* Error */}
          {iaError && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-[#FEF3E2] border border-[#FEF3E2] text-xs text-[#D97706]">
              <AlertTriangle size={13} className="mt-0.5 flex-shrink-0" />
              <span>{iaError}</span>
            </div>
          )}

          {/* Resultado IA */}
          {iaResultado && (
            <div className="rounded-xl border border-[#6E56E0]/20 bg-white p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold text-[#6E56E0] uppercase tracking-wide flex items-center gap-1.5">
                  <Sparkles size={11} />
                  Resultado del análisis
                </p>
                {iaResultado._mock && (
                  <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-[#FEF3E2] text-[#D97706]">
                    Modo offline
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-[10px] text-[#97A4B8] mb-0.5">Tipo</p>
                  <p className="font-semibold text-[#15233B]">{iaResultado.tipoDefecto}</p>
                </div>
                <div>
                  <p className="text-[10px] text-[#97A4B8] mb-0.5">Severidad</p>
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: sevCfg!.bg, color: sevCfg!.text }}
                  >
                    {iaResultado.severidad}
                  </span>
                </div>
                <div className="col-span-2">
                  <p className="text-[10px] text-[#97A4B8] mb-0.5">Parámetro afectado</p>
                  <p className="font-semibold text-[#15233B]">{iaResultado.parametroAfectado}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[10px] text-[#97A4B8] mb-0.5">Descripción técnica</p>
                  <p className="text-[#5A6B85] leading-snug">{iaResultado.descripcionEstructurada}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[10px] text-[#97A4B8] mb-0.5">Acción inmediata</p>
                  <p className="text-[#5A6B85] leading-snug">{iaResultado.accionInmediata}</p>
                </div>
                <div>
                  <p className="text-[10px] text-[#97A4B8] mb-0.5">Requiere detención</p>
                  <p className={`font-bold text-xs ${iaResultado.requiereDetencion ? 'text-[#EF4444]' : 'text-[#16B364]'}`}>
                    {iaResultado.requiereDetencion ? '✓ Sí' : '✗ No'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-[#97A4B8] mb-0.5">Confianza IA</p>
                  <div className="flex items-center gap-1.5">
                    <div className="flex-1 h-1.5 bg-[#F4F7FB] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#6E56E0]"
                        style={{ width: `${Math.round(iaResultado.confianza * 100)}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-[#6E56E0]">
                      {Math.round(iaResultado.confianza * 100)}%
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleUsarAnalisis}
                disabled={iaAplicado}
                className={`w-full py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  iaAplicado
                    ? 'bg-[#E7F8EF] text-[#16B364] border border-[#16B364]/30 cursor-default'
                    : 'bg-[#6E56E0] text-white hover:bg-[#5B45CC]'
                }`}
              >
                <CheckCircle2 size={13} />
                {iaAplicado ? 'Análisis aplicado' : 'Usar este análisis en el formulario'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── FORMULARIO DE PARÁMETROS ── */}
      <p className="text-[10px] font-bold text-[#5A6B85] uppercase tracking-wide">
        Medición de parámetros
      </p>

      {parametros.map((p) => {
        const raw = valores[p.parametro]
        const medido = parseFloat(raw ?? '')
        const aprobado = evaluarParametro(medido, p.valorNominal, p.tolerancia)
        const limInf = p.valorNominal - p.tolerancia
        const limSup = p.valorNominal + p.tolerancia

        let borderColor = '#E8EDF4'
        let bgAccent = 'transparent'
        if (aprobado === true) { borderColor = '#16B364'; bgAccent = '#F0FBF5' }
        if (aprobado === false) { borderColor = '#EF4444'; bgAccent = '#FFF5F5' }

        return (
          <div
            key={p.parametro}
            className="rounded-xl border p-4 space-y-2.5 transition-all"
            style={{ borderColor, background: bgAccent }}
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-[#15233B]">{p.parametro}</p>
                {p.critico && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#FDECEC] text-[#EF4444]">
                    Crítico
                  </span>
                )}
              </div>
              <div>
                {aprobado === null && <Minus size={16} className="text-[#D1D5DB]" />}
                {aprobado === true && <CheckCircle2 size={16} className="text-[#16B364]" />}
                {aprobado === false && <XCircle size={16} className="text-[#EF4444]" />}
              </div>
            </div>

            {/* Rango */}
            <div className="flex items-center gap-2 text-xs text-[#97A4B8]">
              <AlertTriangle size={11} className="flex-shrink-0" />
              <span>
                Nominal: <strong className="text-[#5A6B85]">{p.valorNominal} {p.unidad}</strong>
                &nbsp;·&nbsp;Rango: [{limInf.toFixed(3)}, {limSup.toFixed(3)}] {p.unidad}
              </span>
            </div>

            {/* Input */}
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="any"
                placeholder={`Medición en ${p.unidad}…`}
                value={raw ?? ''}
                onChange={(e) => handleChange(p.parametro, e.target.value)}
                className="flex-1 rounded-lg border px-3 py-2 text-sm font-mono text-[#15233B] outline-none transition-all"
                style={{
                  borderColor: aprobado === false ? '#EF4444' : aprobado === true ? '#16B364' : '#E8EDF4',
                  boxShadow: aprobado === false
                    ? '0 0 0 2px rgba(239,68,68,0.12)'
                    : aprobado === true
                    ? '0 0 0 2px rgba(97,206,112,0.12)'
                    : undefined,
                }}
              />
              <span className="text-xs text-[#97A4B8] w-8 flex-shrink-0">{p.unidad}</span>
            </div>

            {/* Mensaje de rechazo */}
            {aprobado === false && (
              <p className="text-xs text-[#EF4444] font-medium flex items-center gap-1">
                <XCircle size={11} />
                {p.critico ? 'Parámetro crítico fuera de tolerancia' : 'Fuera de tolerancia'}
                {' '}— desviación: {Math.abs(medido - p.valorNominal).toFixed(3)} {p.unidad}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}

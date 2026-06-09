'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  CheckCircle2, XCircle, AlertTriangle, Minus,
  Mic, MicOff, Sparkles, Bot, Loader2,
} from 'lucide-react'
import type { ResultadoParametro } from '@/context/CalidadContext'
import { evaluarParametro } from '@/lib/calidad'

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
  _razon?: string
}

interface InspectionFormProps {
  parametros: ParametroInspeccion[]
  onResultadosChange: (resultados: ResultadoParametro[], todosCompletos: boolean) => void
  contextoOrden?: { id: string; producto: string; operacionActual: string }
  onAnalisisIA?: (datos: { descripcion: string; accionInmediata: string; tipoDefecto: string }) => void
}

// evaluarParametro se importa desde @/lib/calidad

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
  const [textoInterino, setTextoInterino] = useState('')
  const [countdownIA, setCountdownIA] = useState<number | null>(null)
  // Detectado en useEffect para evitar el bug de SSR donde window es undefined
  const [speechDisponible, setSpeechDisponible] = useState(false)
  const reconocimientoRef = useRef<any>(null)
  const dictandoRef = useRef(false)
  const countdownIARef = useRef<ReturnType<typeof setInterval> | null>(null)
  const autoAnalizarTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Refs para evitar stale closures en timeouts/callbacks
  const mensajeOperarioRef = useRef(mensajeOperario)
  const handleAnalizarIA_ref = useRef<() => void>(() => {})
  useEffect(() => { mensajeOperarioRef.current = mensajeOperario }, [mensajeOperario])

  // Detectar Web Speech API solo en el cliente (no durante SSR)
  useEffect(() => {
    setSpeechDisponible(
      typeof window !== 'undefined' &&
      ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
    )
  }, [])

  // Auto-reintento cuando hay CUOTA:N
  useEffect(() => {
    if (countdownIARef.current) clearInterval(countdownIARef.current)
    const razon = iaResultado?._razon
    if (razon?.startsWith('CUOTA:') && razon !== 'CUOTA_CERO' && !iaLoading) {
      const seg = parseInt(razon.split(':')[1], 10) || 60
      setCountdownIA(seg)
      countdownIARef.current = setInterval(() => {
        setCountdownIA((prev) => {
          if (prev === null || prev <= 1) {
            if (countdownIARef.current) clearInterval(countdownIARef.current)
            setCountdownIA(null)
            setTimeout(() => handleAnalizarIA(), 100)
            return null
          }
          return prev - 1
        })
      }, 1000)
    } else {
      setCountdownIA(null)
    }
    return () => { if (countdownIARef.current) clearInterval(countdownIARef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iaResultado?._razon])

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
  // iniciarReconocimiento se llama también desde onend para auto-reiniciar
  // cuando Chrome para automáticamente por silencio (continuous=true no lo evita en Chrome).
  const iniciarReconocimiento = useCallback(() => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const rec = new SpeechRec()
    // es-CO primero; el navegador usa es-ES si no tiene es-CO disponible
    rec.lang = navigator.language.startsWith('es') ? navigator.language : 'es-CO'
    rec.continuous = true
    rec.interimResults = true

    rec.onresult = (e: any) => {
      let finalText = ''
      let interino = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          finalText += e.results[i][0].transcript + ' '
        } else {
          interino += e.results[i][0].transcript
        }
      }
      if (finalText.trim()) {
        setMensajeOperario((prev) => (prev ? prev.trimEnd() + ' ' + finalText.trimEnd() : finalText.trimEnd()))
        setTextoInterino('')
      } else {
        setTextoInterino(interino)
      }
    }

    rec.onerror = (e: any) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        dictandoRef.current = false
        setDictando(false)
        setTextoInterino('')
        setIaError('Permiso de micrófono denegado. Actívalo en la barra de dirección del navegador (ícono de candado o micrófono).')
      }
      // 'no-speech', 'audio-capture', 'network' → onend reiniciará si dictandoRef sigue en true
    }

    rec.onend = () => {
      setTextoInterino('')
      if (dictandoRef.current) {
        // Chrome para automáticamente por silencio — reiniciamos para mantener el micrófono activo
        try { iniciarReconocimiento() } catch { dictandoRef.current = false; setDictando(false) }
      } else {
        setDictando(false)
      }
    }

    try {
      rec.start()
      reconocimientoRef.current = rec
    } catch {
      dictandoRef.current = false
      setDictando(false)
    }
  }, [setMensajeOperario, setIaError])

  function handleDictar() {
    if (!speechDisponible) return
    if (dictandoRef.current) {
      // Detener dictado
      dictandoRef.current = false
      reconocimientoRef.current?.stop()
      setDictando(false)
      setTextoInterino('')
      // Auto-analizar con IA 800ms después de detener (si hay texto)
      if (autoAnalizarTimerRef.current) clearTimeout(autoAnalizarTimerRef.current)
      autoAnalizarTimerRef.current = setTimeout(() => {
        if (mensajeOperarioRef.current.trim()) handleAnalizarIA_ref.current()
      }, 800)
      return
    }
    // Limpiar cualquier análisis anterior al iniciar nueva dictación
    if (autoAnalizarTimerRef.current) clearTimeout(autoAnalizarTimerRef.current)
    setIaResultado(null)
    setIaError(null)
    setIaAplicado(false)
    dictandoRef.current = true
    setDictando(true)
    iniciarReconocimiento()
  }

  // ── Llamada a la API de IA ──
  const handleAnalizarIA = useCallback(async () => {
    const texto = mensajeOperarioRef.current.trim()
    if (!texto) return
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
          payload: { mensaje: texto, contextoOrden: ctxOrden },
        }),
      })
      const data = await res.json()
      if (data.ok) {
        setIaResultado({ ...data.clasificacion, _mock: data.mock === true, _razon: data.razon })
      } else {
        setIaError('No se pudo analizar el mensaje. Intenta de nuevo.')
      }
    } catch {
      setIaError('⚠ Error de red — Completa el formulario manualmente')
    } finally {
      setIaLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctxOrden])

  // Mantener el ref al día para que los timeouts siempre llamen la versión actual
  useEffect(() => { handleAnalizarIA_ref.current = handleAnalizarIA }, [handleAnalizarIA])

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

          {/* Indicador de texto en tiempo real */}
          {dictando && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#EF4444]/8 border border-[#EF4444]/20">
              <span className="inline-flex gap-[3px] items-end h-3">
                <span className="w-[3px] bg-[#EF4444] rounded-full animate-[bounce_0.8s_ease-in-out_infinite]" style={{ height: '100%', animationDelay: '0ms' }} />
                <span className="w-[3px] bg-[#EF4444] rounded-full animate-[bounce_0.8s_ease-in-out_infinite]" style={{ height: '70%', animationDelay: '150ms' }} />
                <span className="w-[3px] bg-[#EF4444] rounded-full animate-[bounce_0.8s_ease-in-out_infinite]" style={{ height: '100%', animationDelay: '300ms' }} />
              </span>
              <span className="text-xs text-[#DC2626] font-medium">
                {textoInterino ? <em className="not-italic">{textoInterino}</em> : 'Escuchando…'}
              </span>
            </div>
          )}

          {/* Botones */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Dictar */}
            <button
              type="button"
              onClick={handleDictar}
              title={
                !speechDisponible
                  ? 'Dictado disponible en Chrome/Edge. Escribe el defecto manualmente.'
                  : dictando
                  ? 'Detener dictado (la IA analizará automáticamente)'
                  : 'Dictar defecto con el micrófono'
              }
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${
                dictando
                  ? 'bg-[#EF4444] text-white border-[#EF4444]'
                  : speechDisponible
                  ? 'bg-white text-[#5A6B85] border-[#E8EDF4] hover:border-[#6E56E0] hover:text-[#6E56E0]'
                  : 'bg-[#F4F7FB] text-[#97A4B8] border-[#E8EDF4] cursor-not-allowed opacity-50'
              }`}
              disabled={iaLoading}
            >
              {dictando ? <MicOff size={13} /> : <Mic size={13} />}
              {dictando ? 'Detener y analizar' : 'Dictar'}
            </button>

            {/* Analizar manual */}
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

          {/* Hint flujo rápido */}
          {!dictando && !iaLoading && !iaResultado && speechDisponible && (
            <p className="text-[10px] text-[#97A4B8]">
              Pulsa <strong className="text-[#6E56E0]">Dictar</strong>, describe el defecto y al detener la IA analizará automáticamente.
            </p>
          )}

          {/* Banner sin API key / clave inválida */}
          {(iaResultado?._razon === 'SIN_KEY' || iaResultado?._razon === 'CLAVE_INVALIDA') && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-[#FDECEC] border border-[#EF4444]/20 text-xs text-[#DC2626]">
              <AlertTriangle size={13} className="mt-0.5 flex-shrink-0" />
              <span>
                <strong>{iaResultado._razon === 'SIN_KEY' ? 'Falta GEMINI_API_KEY' : 'Clave Gemini inválida'}</strong>
                {' '}— revisa <code className="font-mono bg-white/70 px-1 rounded">.env.local</code>. El análisis mostrado es local (aproximado).
              </span>
            </div>
          )}

          {/* Banner CUOTA_CERO — proyecto sin cuota asignada */}
          {iaResultado?._razon === 'CUOTA_CERO' && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-[#FDECEC] border border-[#EF4444]/20 text-xs text-[#DC2626]">
              <AlertTriangle size={13} className="mt-0.5 flex-shrink-0" />
              <span>
                <strong>Proyecto sin cuota Gemini (limit:0)</strong> — la API key no tiene cuota gratuita asignada.
                Crea una nueva key en{' '}
                <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener" className="underline font-bold">
                  aistudio.google.com/apikey
                </a>{' '}
                y pégala en <code className="bg-white/70 px-1 rounded">.env.local</code>.
              </span>
            </div>
          )}

          {/* Banner cuota por minuto agotada (temporal) */}
          {iaResultado?._razon?.startsWith('CUOTA:') && iaResultado._razon !== 'CUOTA_CERO' && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-[#FEF3E2] border border-[#F59E0B]/20 text-xs text-[#D97706]">
              <AlertTriangle size={13} className="mt-0.5 flex-shrink-0" />
              <span>
                <strong>Cuota por minuto agotada</strong> —{' '}
                {countdownIA !== null
                  ? <>reintentando automáticamente en <strong>{countdownIA}s</strong>…</>
                  : <>límite temporal alcanzado. El análisis mostrado es local (aproximado).</>
                }
              </span>
            </div>
          )}

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
                  <span
                    className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                    style={{
                      background: iaResultado._razon === 'SIN_KEY' || iaResultado._razon === 'CLAVE_INVALIDA' ? '#FDECEC' : '#FEF3E2',
                      color: iaResultado._razon === 'SIN_KEY' || iaResultado._razon === 'CLAVE_INVALIDA' ? '#DC2626' : '#D97706',
                    }}
                  >
                    {iaResultado._razon === 'SIN_KEY' ? '⚠ Sin API Key'
                      : iaResultado._razon === 'CLAVE_INVALIDA' ? '⚠ Clave inválida'
                      : iaResultado._razon?.startsWith('CUOTA:') ? '⏱ Cuota agotada'
                      : 'Modo offline'}
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

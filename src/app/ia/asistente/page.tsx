'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { Bot, Send, Plus, Loader2, User, Lightbulb, Sparkles, AlertTriangle } from 'lucide-react'
import { useAppContext } from '@/context/AppContext'
import { useManufacturaContext } from '@/context/ManufacturaContext'
import { useCalidadContext } from '@/context/CalidadContext'

interface Mensaje {
  rol: 'usuario' | 'asistente'
  texto: string
  ts: Date
  mock?: boolean
}

const SUGERENCIAS = [
  '¿Cuántas órdenes están activas ahora mismo?',
  'Dame un resumen del estado de la planta',
  '¿Qué líneas tienen problemas de calidad?',
  '¿Cuáles son las no conformidades más graves?',
  '¿Qué centros de trabajo están en mantenimiento?',
  '¿Hay alertas sin leer hoy?',
  '¿Qué producto tiene más defectos?',
  'Muéstrame las órdenes detenidas',
]

function BurbujaMensaje({ msg }: { msg: Mensaje }) {
  const esAsistente = msg.rol === 'asistente'
  return (
    <div className={`flex gap-2.5 ${esAsistente ? '' : 'flex-row-reverse'}`}>
      <div
        className={`w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center ${
          esAsistente ? 'bg-[#EEEBFB]' : 'bg-[#1F6CF0]'
        }`}
      >
        {esAsistente
          ? <Bot size={14} className="text-[#6E56E0]" />
          : <User size={14} className="text-white" />
        }
      </div>
      <div
        className={`max-w-[82%] rounded-2xl px-4 py-3 ${
          esAsistente
            ? 'bg-[#F7FAFD] border border-[#E8EDF4] rounded-tl-none'
            : 'bg-[#1F6CF0] rounded-tr-none'
        }`}
      >
        {msg.mock && esAsistente && (
          <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-[#D97706] bg-[#FEF3E2] px-1.5 py-0.5 rounded-full mb-1.5">
            <AlertTriangle size={8} /> offline
          </span>
        )}
        <p
          className={`text-sm leading-relaxed whitespace-pre-wrap ${
            esAsistente ? 'text-[#15233B]' : 'text-white'
          }`}
          dangerouslySetInnerHTML={{
            __html: msg.texto
              .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
              .replace(/\*(.*?)\*/g, '<em>$1</em>')
              .replace(/^• /gm, '&bull; ')
              .replace(/^- /gm, '&bull; '),
          }}
        />
        <p className={`text-[10px] mt-1.5 ${esAsistente ? 'text-[#97A4B8]' : 'text-white/50'}`}>
          {msg.ts.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  )
}

export default function AsistentePage() {
  const { ordenes, alertas } = useAppContext()
  const { centros } = useManufacturaContext()
  const { noConformidades, inspecciones, fichasMutable } = useCalidadContext()

  const mensajeInicial = useMemo<Mensaje>(() => ({
    rol: 'asistente',
    texto: `¡Hola! Soy **Siesa AI**, tu asistente de producción inteligente.\n\nTengo acceso en tiempo real a:\n• **${ordenes.length} órdenes** de producción\n• **${centros.length} centros** de trabajo\n• **${noConformidades.length} no conformidades** registradas\n• **${alertas.length} alertas** en el sistema\n\n¿Qué necesitas saber?`,
    ts: new Date(),
  }), []) // eslint-disable-line react-hooks/exhaustive-deps

  const [mensajes, setMensajes] = useState<Mensaje[]>([mensajeInicial])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [historial, setHistorial] = useState<{ role: string; text: string }[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes, loading])

  async function enviar(texto: string) {
    const trimmed = texto.trim()
    if (!trimmed || loading) return

    setMensajes((prev) => [...prev, { rol: 'usuario', texto: trimmed, ts: new Date() }])
    setInput('')
    setLoading(true)

    try {
      const contexto = {
        ordenes: ordenes.map((o) => ({
          id: o.id,
          producto: o.producto,
          estado: o.estado,
          linea: o.lineaProduccion,
          prioridad: o.prioridad,
          avance: o.cantidadPlanificada > 0 ? Math.round((o.cantidadProducida / o.cantidadPlanificada) * 100) : 0,
          requiereInspeccion: o.requiereInspeccion,
        })),
        centros: centros.map((c) => ({ id: c.id, nombre: c.nombre, estado: c.estado, eficiencia: c.eficiencia, tipo: c.tipo })),
        noConformidades: noConformidades.map((nc) => ({ id: nc.id, tipo: nc.tipoDefecto, severidad: nc.severidad, producto: nc.producto, estado: nc.estadoCierre, cantidadAfectada: nc.cantidadAfectada })),
        alertas: alertas.map((a) => ({ tipo: a.tipo, mensaje: a.mensaje, leida: a.leida, modulo: a.modulo })),
        inspecciones: inspecciones.map((i) => ({ ordenId: i.ordenId, estado: i.estado, inspector: i.inspector })),
        fichas: fichasMutable.map((f) => ({ id: f.id, producto: f.producto })),
      }

      const res = await fetch('/api/ia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modo: 'chat_asistente', payload: { pregunta: trimmed, contexto, historial } }),
      })
      const data = await res.json()

      if (data.ok) {
        const msg: Mensaje = { rol: 'asistente', texto: data.respuesta, ts: new Date(), mock: data.mock }
        setMensajes((prev) => [...prev, msg])
        setHistorial((prev) => [...prev, { role: 'user', text: trimmed }, { role: 'model', text: data.respuesta }].slice(-10))
      } else {
        throw new Error(data.error ?? 'Error')
      }
    } catch {
      setMensajes((prev) => [...prev, { rol: 'asistente', texto: 'No pude conectarme con Siesa AI en este momento. Verifica tu clave GEMINI_API_KEY en .env.local.', ts: new Date(), mock: true }])
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  function nuevoChat() {
    setMensajes([{
      rol: 'asistente',
      texto: `Chat reiniciado. Tengo acceso a los datos actuales de tu planta. ¿Qué necesitas?`,
      ts: new Date(),
    }])
    setHistorial([])
  }

  const mostrarSugerencias = mensajes.length === 1

  return (
    <div className="max-w-3xl mx-auto flex flex-col" style={{ height: 'calc(100vh - 96px)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#EEEBFB] flex items-center justify-center">
            <Bot size={20} className="text-[#6E56E0]" />
          </div>
          <div>
            <h1 className="text-xl font-poppins font-semibold text-[#15233B]">Asistente de Producción</h1>
            <p className="text-xs text-[#5A6B85]">Consulta datos de planta en lenguaje natural</p>
          </div>
          <div className="ml-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#EEEBFB]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#6E56E0] animate-pulse" />
            <span className="text-[10px] font-bold text-[#6E56E0]">EN LÍNEA</span>
          </div>
        </div>
        <button
          onClick={nuevoChat}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E8EDF4] text-xs text-[#5A6B85] hover:border-[#6E56E0] hover:text-[#6E56E0] bg-white transition-all"
        >
          <Plus size={13} />
          Nuevo chat
        </button>
      </div>

      {/* Chat container */}
      <div className="flex-1 bg-white rounded-2xl border border-[#E8EDF4] overflow-hidden flex flex-col shadow-sm">

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {mensajes.map((msg, i) => (
            <BurbujaMensaje key={i} msg={msg} />
          ))}

          {loading && (
            <div className="flex gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#EEEBFB] flex-shrink-0 flex items-center justify-center">
                <Bot size={14} className="text-[#6E56E0]" />
              </div>
              <div className="bg-[#F7FAFD] border border-[#E8EDF4] rounded-2xl rounded-tl-none px-4 py-3">
                <div className="flex gap-1.5 items-center h-5">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="w-2 h-2 bg-[#6E56E0]/40 rounded-full animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Sugerencias */}
        {mostrarSugerencias && (
          <div className="px-5 pb-3 border-t border-[#EEF2F8] pt-3">
            <p className="text-[10px] font-semibold text-[#97A4B8] uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <Lightbulb size={10} />
              Sugerencias
            </p>
            <div className="flex flex-wrap gap-1.5">
              {SUGERENCIAS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => enviar(s)}
                  className="text-xs px-3 py-1.5 rounded-full border border-[#E8EDF4] text-[#5A6B85] hover:border-[#6E56E0] hover:text-[#6E56E0] bg-white transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="border-t border-[#E8EDF4] p-3 flex gap-2">
          <div className="flex-1 flex items-center gap-2 bg-[#F7FAFD] rounded-xl border border-[#E8EDF4] px-4 focus-within:border-[#6E56E0] focus-within:bg-white transition-all">
            <Sparkles size={14} className="text-[#6E56E0]/40 flex-shrink-0" />
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(input) } }}
              placeholder="Pregunta algo sobre la producción..."
              className="flex-1 bg-transparent py-2.5 text-sm text-[#15233B] outline-none placeholder:text-[#C4CDD8]"
              disabled={loading}
            />
          </div>
          <button
            onClick={() => enviar(input)}
            disabled={!input.trim() || loading}
            className="w-10 h-10 rounded-xl bg-[#6E56E0] flex items-center justify-center text-white disabled:opacity-40 hover:bg-[#5B45CC] transition-colors flex-shrink-0"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          </button>
        </div>
      </div>

      <p className="text-center text-[10px] text-[#C4CDD8] mt-2">
        Powered by Siesa AI · Gemini · Los datos se actualizan en tiempo real desde Google Sheets
      </p>
    </div>
  )
}

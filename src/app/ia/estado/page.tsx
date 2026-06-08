'use client'

import { useState, useCallback } from 'react'
import {
  CheckCircle2, XCircle, AlertTriangle, Wifi, WifiOff,
  Loader2, RefreshCw, Key, Cpu, Zap, Info, Activity,
} from 'lucide-react'
import type { ModeloEstado } from '@/app/api/ia/status/route'

interface StatusResponse {
  ok: boolean
  hayModelo?: boolean
  claveInvalida?: boolean
  keyPreview?: string
  error?: string
  modelosAccesibles?: string[]
  modelos: ModeloEstado[]
}

// ─── CONFIGURACIÓN VISUAL POR ESTADO ─────────────────────────────────────────

const ESTADO_CONFIG: Record<ModeloEstado['estado'], {
  label: string; color: string; bg: string; icon: React.ElementType; descripcion: string
}> = {
  ACCESIBLE: {
    label: 'Accesible',
    color: '#16B364', bg: '#E7F8EF',
    icon: CheckCircle2,
    descripcion: 'El modelo existe y responde. Estará disponible para análisis (cuota se verifica al usarlo).',
  },
  NO_DISPONIBLE: {
    label: 'No disponible',
    color: '#97A4B8', bg: '#F4F7FB',
    icon: XCircle,
    descripcion: 'El modelo no existe en esta versión de API o no está disponible para esta key.',
  },
  CLAVE_INVALIDA: {
    label: 'Clave inválida',
    color: '#EF4444', bg: '#FDECEC',
    icon: Key,
    descripcion: 'La API key no tiene permisos para Gemini. Crea una nueva en aistudio.google.com/apikey.',
  },
  RED: {
    label: 'Sin conexión',
    color: '#EF4444', bg: '#FDECEC',
    icon: WifiOff,
    descripcion: 'No se pudo conectar con la API de Google. Verifica acceso a internet del servidor.',
  },
  ERROR: {
    label: 'Error HTTP',
    color: '#F59E0B', bg: '#FEF3E2',
    icon: AlertTriangle,
    descripcion: 'Respuesta inesperada del servidor.',
  },
}

const CONSEJOS: Record<ModeloEstado['estado'], { titulo: string; pasos: string[] }> = {
  ACCESIBLE: {
    titulo: 'Modelo listo para usar',
    pasos: [
      'El modelo aparecerá en la rotación automática del sistema.',
      'Si ves "cuota agotada" al usar la IA, el sistema esperará 65s y reintentará con otro modelo.',
      'Con múltiples modelos accesibles, la IA distribuye las solicitudes automáticamente.',
    ],
  },
  NO_DISPONIBLE: {
    titulo: 'Modelo no disponible para esta key',
    pasos: [
      'Puede ser un modelo deprecado, renombrado o no habilitado para tu proyecto.',
      'No afecta el funcionamiento si hay otros modelos accesibles.',
    ],
  },
  CLAVE_INVALIDA: {
    titulo: 'Cómo obtener una API key válida',
    pasos: [
      '1. Ve a aistudio.google.com/apikey',
      '2. Haz clic en "Create API key" → selecciona o crea un proyecto.',
      '3. Copia la nueva key (formato: AIza...).',
      '4. Edita .env.local y reemplaza GEMINI_API_KEY.',
      '5. Reinicia el servidor: npm run dev.',
    ],
  },
  RED: {
    titulo: 'Problemas de conectividad',
    pasos: [
      'Verifica que el servidor tenga salida a internet.',
      'Si estás en una red corporativa, puede haber un proxy bloqueando googleapis.com.',
      'Prueba abrir https://generativelanguage.googleapis.com en el navegador del servidor.',
    ],
  },
  ERROR: {
    titulo: 'Error HTTP inesperado',
    pasos: [
      'Revisa el código HTTP y el mensaje para más detalles.',
      'Puede ser un problema temporal — espera unos minutos y reintenta.',
    ],
  },
}

// ─── TARJETA DE MODELO ────────────────────────────────────────────────────────

function ModeloCard({ modelo }: { modelo: ModeloEstado }) {
  const [expandido, setExpandido] = useState(false)
  const cfg = ESTADO_CONFIG[modelo.estado]
  const consejo = CONSEJOS[modelo.estado]
  const Icon = cfg.icon

  return (
    <div className="bg-white rounded-xl border border-[#E8EDF4] overflow-hidden" style={{ borderLeft: `4px solid ${cfg.color}` }}>
      <div className="flex items-center gap-4 px-5 py-4">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: cfg.bg }}>
          <Icon size={16} style={{ color: cfg.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm font-bold text-[#15233B]">{modelo.modelo}</span>
            <span className="text-[9px] font-mono bg-[#F4F7FB] text-[#97A4B8] px-1.5 py-0.5 rounded">{modelo.apiVer}</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: cfg.bg, color: cfg.color }}>
              {cfg.label}
            </span>
            {modelo.statusCode !== null && (
              <span className="text-[10px] text-[#97A4B8] font-mono">HTTP {modelo.statusCode}</span>
            )}
          </div>
          {modelo.mensaje && modelo.estado !== 'ACCESIBLE' && (
            <p className="text-xs text-[#5A6B85] mt-0.5">{modelo.mensaje}</p>
          )}
        </div>
        <button
          onClick={() => setExpandido(!expandido)}
          className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[#F4F7FB] transition-colors text-[#97A4B8]"
        >
          <Info size={14} />
        </button>
      </div>

      {expandido && (
        <div className="px-5 pb-4 border-t border-[#EEF2F8] pt-3" style={{ background: cfg.bg + '40' }}>
          <p className="text-[11px] font-bold text-[#5A6B85] uppercase tracking-wide mb-1.5">{consejo.titulo}</p>
          <ul className="space-y-1">
            {consejo.pasos.map((paso, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-[#5A6B85]">
                <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: cfg.color }} />
                {paso}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// ─── PÁGINA ───────────────────────────────────────────────────────────────────

export default function EstadoIAPage() {
  const [estado, setEstado] = useState<StatusResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ultimaVerif, setUltimaVerif] = useState<Date | null>(null)

  const verificar = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/ia/status')
      const data = await res.json()
      setEstado(data)
      setUltimaVerif(new Date())
    } catch {
      setError('No se pudo conectar con el servidor. ¿Está corriendo npm run dev?')
    } finally {
      setLoading(false)
    }
  }, [])

  const accesibles = estado?.modelos.filter(m => m.estado === 'ACCESIBLE') ?? []
  const noDisp = estado?.modelos.filter(m => m.estado === 'NO_DISPONIBLE') ?? []
  const conErrores = estado?.modelos.filter(m => m.estado !== 'ACCESIBLE' && m.estado !== 'NO_DISPONIBLE') ?? []

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-[#EEEBFB] flex items-center justify-center">
            <Cpu size={20} className="text-[#6E56E0]" />
          </div>
          <div>
            <h1 className="text-2xl font-poppins font-semibold text-[#15233B]">Diagnóstico de Modelos IA</h1>
            <p className="text-xs text-[#5A6B85]">
              Verifica qué modelos Gemini están accesibles — sin consumir cuota de generación
            </p>
          </div>
        </div>
      </div>

      {/* Panel principal */}
      <div className="bg-white rounded-2xl border border-[#E8EDF4] shadow-sm p-8 mb-6">
        {!estado && !loading && (
          <div className="text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-[#EEEBFB] flex items-center justify-center mx-auto">
              <Activity size={28} className="text-[#6E56E0]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#15233B] mb-1">Verificar acceso a modelos</h2>
              <p className="text-sm text-[#5A6B85] max-w-md mx-auto">
                Comprueba cuáles modelos Gemini están disponibles para tu API key.
                Este diagnóstico <strong>no consume cuota</strong> de generación.
              </p>
            </div>
            {error && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-[#FDECEC] border border-[#EF4444]/20 text-sm text-[#DC2626] text-left max-w-sm mx-auto">
                <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
            <button
              onClick={verificar}
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-[#6E56E0] text-white font-bold text-sm hover:bg-[#5B45CC] transition-colors shadow-lg shadow-[#6E56E0]/20"
            >
              <Zap size={16} />
              Iniciar Diagnóstico
            </button>
          </div>
        )}

        {loading && (
          <div className="text-center py-6 space-y-4">
            <Loader2 size={32} className="animate-spin text-[#6E56E0] mx-auto" />
            <p className="text-sm font-bold text-[#15233B]">Verificando modelos…</p>
            <p className="text-xs text-[#5A6B85]">Solo verificación de acceso, sin consumir cuota</p>
          </div>
        )}

        {estado && !loading && (
          <div className="space-y-4">
            {/* Resumen */}
            <div className={`flex items-start gap-3 p-4 rounded-xl border ${
              estado.hayModelo ? 'bg-[#E7F8EF] border-[#16B364]/30' : 'bg-[#FDECEC] border-[#EF4444]/30'
            }`}>
              {estado.hayModelo
                ? <CheckCircle2 size={20} className="text-[#16B364] flex-shrink-0 mt-0.5" />
                : <AlertTriangle size={20} className="text-[#EF4444] flex-shrink-0 mt-0.5" />
              }
              <div className="flex-1">
                <p className={`font-bold text-sm ${estado.hayModelo ? 'text-[#16B364]' : 'text-[#DC2626]'}`}>
                  {estado.hayModelo
                    ? `${accesibles.length} modelo(s) accesible(s) — la IA debería funcionar`
                    : estado.claveInvalida
                    ? 'API key inválida — crea una nueva en aistudio.google.com/apikey'
                    : 'Ningún modelo accesible — revisa la key y la conexión'}
                </p>
                <p className="text-xs text-[#5A6B85] mt-0.5">
                  Key: <code className="font-mono bg-white/60 px-1 rounded">{estado.keyPreview}</code>
                  {ultimaVerif && (
                    <span className="ml-2">· {ultimaVerif.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                  )}
                </p>
                {estado.hayModelo && (
                  <p className="text-xs text-[#5A6B85] mt-1">
                    Si ves "cuota agotada" al usar la IA, el sistema espera 65s y reintenta automáticamente con otro modelo.
                  </p>
                )}
              </div>
              <button
                onClick={verificar}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/70 text-xs font-semibold text-[#5A6B85] hover:bg-white transition-colors border border-white"
              >
                <RefreshCw size={12} />
                Repetir
              </button>
            </div>

            {/* Estadísticas rápidas */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Accesibles', count: accesibles.length, color: '#16B364', bg: '#E7F8EF' },
                { label: 'No disp.', count: noDisp.length, color: '#97A4B8', bg: '#F4F7FB' },
                { label: 'Con error', count: conErrores.length, color: '#EF4444', bg: '#FDECEC' },
              ].map((s) => (
                <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: s.bg }}>
                  <p className="text-xl font-bold" style={{ color: s.color }}>{s.count}</p>
                  <p className="text-[10px] font-semibold" style={{ color: s.color }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Lista de modelos */}
      {estado && (
        <div className="space-y-3">
          <p className="text-xs font-bold text-[#5A6B85] uppercase tracking-wide">
            Estado por modelo ({estado.modelos.length} verificados)
          </p>
          {estado.modelos.map((m, i) => (
            <ModeloCard key={`${m.modelo}-${m.apiVer}-${i}`} modelo={m} />
          ))}
        </div>
      )}

      {/* Nota sobre cuota */}
      {estado?.hayModelo && (
        <div className="mt-6 bg-[#EEEBFB] rounded-2xl border border-[#6E56E0]/20 p-5">
          <p className="text-sm font-bold text-[#6E56E0] mb-2 flex items-center gap-2">
            <Wifi size={15} />
            Sobre la cuota de generación
          </p>
          <div className="space-y-1.5 text-xs text-[#5A6B85]">
            <p>El free tier de Gemini tiene <strong>15 solicitudes por minuto</strong> por modelo. Al alcanzar el límite:</p>
            <p>1. El sistema espera <strong>65 segundos</strong> (ventana completa de RPM) antes de reintentar.</p>
            <p>2. Prueba con todos los modelos accesibles antes de mostrar el error de cuota.</p>
            <p>3. Si la cuota persiste agotada, considera crear un proyecto nuevo en <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener" className="underline font-bold text-[#6E56E0]">aistudio.google.com</a> con una key fresca.</p>
          </div>
        </div>
      )}

      {/* Guía si no hay modelos */}
      {estado && !estado.hayModelo && (
        <div className="mt-6 bg-white rounded-2xl border border-[#E8EDF4] p-5">
          <p className="text-sm font-bold text-[#15233B] mb-3 flex items-center gap-2">
            <Info size={15} className="text-[#6E56E0]" />
            Pasos para activar la IA
          </p>
          <div className="space-y-2 text-xs text-[#5A6B85]">
            <p><strong className="text-[#15233B]">1. Obtén una API key de AI Studio:</strong> Ve a <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener" className="underline text-[#6E56E0] font-semibold">aistudio.google.com/apikey</a> → "Create API key"</p>
            <p><strong className="text-[#15233B]">2. Actualiza .env.local:</strong> <code className="bg-[#F4F7FB] px-1.5 py-0.5 rounded">GEMINI_API_KEY=AIzaSy...tu-key</code></p>
            <p><strong className="text-[#15233B]">3. Reinicia el servidor:</strong> <code className="bg-[#F4F7FB] px-1.5 py-0.5 rounded">npm run dev</code></p>
            <p><strong className="text-[#15233B]">4. Vuelve a ejecutar el diagnóstico</strong> para verificar.</p>
            <p className="pt-2 text-[#97A4B8]">Las keys de AI Studio incluyen 15 RPM y 1M tokens/día gratis para múltiples modelos.</p>
          </div>
        </div>
      )}
    </div>
  )
}

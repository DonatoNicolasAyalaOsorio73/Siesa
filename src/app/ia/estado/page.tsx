'use client'

import { useState, useCallback } from 'react'
import {
  CheckCircle2, XCircle, AlertTriangle, Wifi, WifiOff,
  Loader2, RefreshCw, Key, Cpu, Clock, Zap, Info,
} from 'lucide-react'
import type { ModeloEstado } from '@/app/api/ia/status/route'

// ─── TIPOS ─────────────────────────────────────────────────────────────────────

interface StatusResponse {
  ok: boolean
  hayModelo?: boolean
  todasCuota?: boolean
  claveInvalida?: boolean
  keyPreview?: string
  error?: string
  modelos: ModeloEstado[]
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const ESTADO_CONFIG: Record<ModeloEstado['estado'], {
  label: string
  color: string
  bg: string
  icon: React.ElementType
  descripcion: string
}> = {
  OK: {
    label: 'Operativo',
    color: '#16B364',
    bg: '#E7F8EF',
    icon: CheckCircle2,
    descripcion: 'Modelo disponible y respondiendo correctamente.',
  },
  CUOTA: {
    label: 'Cuota por minuto',
    color: '#F59E0B',
    bg: '#FEF3E2',
    icon: Clock,
    descripcion: 'Límite de solicitudes por minuto alcanzado. Se restablece automáticamente en ~60s.',
  },
  CUOTA_CERO: {
    label: 'Sin cuota asignada',
    color: '#EF4444',
    bg: '#FDECEC',
    icon: AlertTriangle,
    descripcion: 'El proyecto de esta API key tiene limit:0 — no tiene cuota gratuita asignada. Necesitas una key de AI Studio.',
  },
  NO_DISPONIBLE: {
    label: 'No disponible',
    color: '#97A4B8',
    bg: '#F4F7FB',
    icon: XCircle,
    descripcion: 'Modelo no existe en la API o ha sido deprecado.',
  },
  RED: {
    label: 'Sin conexión',
    color: '#EF4444',
    bg: '#FDECEC',
    icon: WifiOff,
    descripcion: 'No se pudo conectar con el servidor de Google. Verifica la conexión a internet.',
  },
  CLAVE_INVALIDA: {
    label: 'Clave inválida',
    color: '#EF4444',
    bg: '#FDECEC',
    icon: Key,
    descripcion: 'API key incorrecta o sin permisos para Gemini.',
  },
  ERROR: {
    label: 'Error HTTP',
    color: '#EF4444',
    bg: '#FDECEC',
    icon: AlertTriangle,
    descripcion: 'Respuesta inesperada del servidor.',
  },
}

const CONSEJOS: Record<ModeloEstado['estado'], { titulo: string; pasos: string[] }> = {
  OK: {
    titulo: '¿Qué significa OK?',
    pasos: ['El modelo acepta solicitudes y tiene cuota disponible.', 'Los análisis de IA usarán este modelo automáticamente.'],
  },
  CUOTA: {
    titulo: 'Cuota por minuto agotada — solución',
    pasos: [
      'Espera ~60 segundos — el límite de solicitudes por minuto se reinicia automáticamente.',
      'El sistema reintentará solo cuando el countdown llegue a 0.',
      'Si persiste, considera actualizar a un plan de pago en aistudio.google.com.',
    ],
  },
  CUOTA_CERO: {
    titulo: 'Proyecto sin cuota asignada — pasos para solucionarlo',
    pasos: [
      '1. Ve a aistudio.google.com/apikey (Google AI Studio).',
      '2. Haz clic en "Create API key" y selecciona un proyecto o crea uno nuevo.',
      '3. Copia la nueva key (empieza con "AIza...").',
      '4. Abre .env.local y reemplaza GEMINI_API_KEY con la nueva key.',
      '5. Reinicia el servidor con npm run dev.',
      'NOTA: Las keys de AI Studio incluyen cuota gratuita automáticamente (15 RPM, 1M tokens/día).',
    ],
  },
  NO_DISPONIBLE: {
    titulo: 'Modelo no disponible',
    pasos: [
      'Puede que el modelo no esté en tu región o haya sido reemplazado.',
      'El sistema tiene 5 modelos de respaldo — si otro funciona, este no importa.',
    ],
  },
  RED: {
    titulo: 'Sin conexión a Google',
    pasos: [
      'Verifica que el servidor Next.js tenga salida a internet.',
      'Prueba abrir https://generativelanguage.googleapis.com desde el servidor.',
      'Si hay un proxy corporativo, puede estar bloqueando la API.',
    ],
  },
  CLAVE_INVALIDA: {
    titulo: 'Clave API incorrecta',
    pasos: [
      'Ve a aistudio.google.com y crea una nueva API key.',
      'Cópiala en .env.local como: GEMINI_API_KEY=tu-clave-aquí',
      'Reinicia el servidor con npm run dev.',
    ],
  },
  ERROR: {
    titulo: 'Error HTTP',
    pasos: [
      'Revisa el mensaje de error para más detalles.',
      'Puede ser un problema temporal — intenta en unos minutos.',
    ],
  },
}

// ─── COMPONENTES ─────────────────────────────────────────────────────────────

function ModeloCard({ modelo }: { modelo: ModeloEstado }) {
  const [expandido, setExpandido] = useState(false)
  const cfg = ESTADO_CONFIG[modelo.estado]
  const consejo = CONSEJOS[modelo.estado]
  const Icon = cfg.icon

  return (
    <div
      className="bg-white rounded-xl border border-[#E8EDF4] overflow-hidden transition-all"
      style={{ borderLeft: `4px solid ${cfg.color}` }}
    >
      <div className="flex items-center gap-4 px-5 py-4">
        {/* Icono estado */}
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: cfg.bg }}>
          <Icon size={18} style={{ color: cfg.color }} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm font-bold text-[#15233B]">{modelo.modelo}</span>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: cfg.bg, color: cfg.color }}
            >
              {cfg.label}
            </span>
            {modelo.statusCode !== null && (
              <span className="text-[10px] text-[#97A4B8] font-mono">HTTP {modelo.statusCode}</span>
            )}
          </div>
          {modelo.mensaje && (
            <p className="text-xs text-[#5A6B85] mt-0.5 truncate">{modelo.mensaje}</p>
          )}
          {modelo.retrySegundos && (
            <p className="text-xs text-[#F59E0B] mt-0.5">Reintenta en ~{modelo.retrySegundos}s</p>
          )}
        </div>

        {/* Expand button */}
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

  const modelosOK = estado?.modelos.filter(m => m.estado === 'OK') ?? []
  const modelosCuota = estado?.modelos.filter(m => m.estado === 'CUOTA' || m.estado === 'CUOTA_CERO') ?? []
  const modelosNoDisp = estado?.modelos.filter(m => m.estado === 'NO_DISPONIBLE') ?? []
  const modelosError = estado?.modelos.filter(m => m.estado !== 'OK' && m.estado !== 'CUOTA' && m.estado !== 'CUOTA_CERO' && m.estado !== 'NO_DISPONIBLE') ?? []
  const hayCuotaCero = estado?.modelos.some(m => m.estado === 'CUOTA_CERO') ?? false

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
            <p className="text-xs text-[#5A6B85]">Verifica qué modelos Gemini están disponibles para tu API key</p>
          </div>
        </div>
      </div>

      {/* Panel de verificación */}
      <div className="bg-white rounded-2xl border border-[#E8EDF4] shadow-sm p-8 mb-6">
        {!estado && !loading && (
          <div className="text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-[#EEEBFB] flex items-center justify-center mx-auto">
              <Wifi size={28} className="text-[#6E56E0]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#15233B] mb-1">Verificar conectividad con Gemini</h2>
              <p className="text-sm text-[#5A6B85] max-w-sm mx-auto">
                Prueba cada modelo para identificar cuáles están disponibles y cuáles tienen cuota agotada.
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
            <div>
              <p className="text-sm font-bold text-[#15233B]">Verificando modelos…</p>
              <p className="text-xs text-[#5A6B85]">Probando disponibilidad y cuota de cada modelo</p>
            </div>
          </div>
        )}

        {estado && !loading && (
          <div className="space-y-4">
            {/* Resumen estado global */}
            <div className={`flex items-start gap-3 p-4 rounded-xl border ${
              estado.hayModelo
                ? 'bg-[#E7F8EF] border-[#16B364]/30'
                : estado.claveInvalida
                ? 'bg-[#FDECEC] border-[#EF4444]/30'
                : estado.todasCuota
                ? 'bg-[#FEF3E2] border-[#F59E0B]/30'
                : 'bg-[#FDECEC] border-[#EF4444]/30'
            }`}>
              {estado.hayModelo ? (
                <CheckCircle2 size={20} className="text-[#16B364] flex-shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle size={20} className="text-[#F59E0B] flex-shrink-0 mt-0.5" />
              )}
              <div>
                <p className={`font-bold text-sm ${
                  estado.hayModelo ? 'text-[#16B364]'
                    : estado.claveInvalida ? 'text-[#DC2626]'
                    : hayCuotaCero ? 'text-[#DC2626]'
                    : 'text-[#D97706]'
                }`}>
                  {estado.hayModelo
                    ? `IA Operativa — ${modelosOK.length} modelo(s) disponible(s)`
                    : estado.claveInvalida
                    ? 'API Key inválida — verifica GEMINI_API_KEY en .env.local'
                    : hayCuotaCero
                    ? 'Proyecto sin cuota Gemini — necesita nueva API key de AI Studio'
                    : estado.todasCuota
                    ? 'Cuota por minuto agotada — reintenta en ~60s'
                    : 'Sin modelos disponibles'}
                </p>
                <p className="text-xs text-[#5A6B85] mt-0.5">
                  Key: <code className="font-mono bg-white/60 px-1 rounded">{estado.keyPreview}</code>
                  {ultimaVerif && (
                    <span className="ml-2">
                      · Verificado: {ultimaVerif.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  )}
                </p>
              </div>
              <button
                onClick={verificar}
                className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/70 text-xs font-semibold text-[#5A6B85] hover:bg-white transition-colors border border-white"
              >
                <RefreshCw size={12} />
                Repetir
              </button>
            </div>

            {/* Estadísticas rápidas */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'OK', count: modelosOK.length, color: '#16B364', bg: '#E7F8EF' },
                { label: 'Cuota', count: modelosCuota.length, color: '#F59E0B', bg: '#FEF3E2' },
                { label: 'No disp.', count: modelosNoDisp.length, color: '#97A4B8', bg: '#F4F7FB' },
                { label: 'Error', count: modelosError.length, color: '#EF4444', bg: '#FDECEC' },
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
          {estado.modelos.map((m) => (
            <ModeloCard key={m.modelo} modelo={m} />
          ))}
        </div>
      )}

      {/* Guía de solución si hay problemas */}
      {estado && !estado.hayModelo && (
        <div className="mt-6 bg-white rounded-2xl border border-[#E8EDF4] p-5">
          <p className="text-sm font-bold text-[#15233B] mb-3 flex items-center gap-2">
            <Info size={15} className="text-[#6E56E0]" />
            Guía de solución de problemas
          </p>
          <div className="space-y-2 text-xs text-[#5A6B85]">
            <p><strong className="text-[#15233B]">1. Sin API Key:</strong> Abre <code className="bg-[#F4F7FB] px-1 rounded">.env.local</code> y agrega <code className="bg-[#F4F7FB] px-1 rounded">GEMINI_API_KEY=tu-clave</code></p>
            <p><strong className="text-[#15233B]">2. Clave inválida:</strong> Ve a <strong>aistudio.google.com</strong> → Get API Key → crea o copia tu clave</p>
            <p><strong className="text-[#15233B]">3. Cuota agotada:</strong> El free tier tiene límites por minuto. Espera 60s y reintenta, o activa facturación en console.cloud.google.com</p>
            <p><strong className="text-[#15233B]">4. Sin conexión:</strong> Verifica acceso a internet desde el servidor. En redes corporativas puede haber proxy bloqueando googleapis.com</p>
            <p className="pt-1 text-[#97A4B8]">Mientras la IA no esté disponible, todos los análisis usan lógica local con los datos reales de planta.</p>
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Bell, ChevronRight, Home, Menu, X, CheckCheck, Trash2, ExternalLink } from 'lucide-react'
import { useAppContext } from '@/context/AppContext'
import type { Alerta } from '@/context/AppContext'

// ─── RELOJ COLOMBIA ──────────────────────────────────────────────────────────

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

function formatearHoraColombia(date: Date): string {
  const colombiana = new Date(date.toLocaleString('en-US', { timeZone: 'America/Bogota' }))
  const dia = DIAS[colombiana.getDay()]
  const dd = String(colombiana.getDate()).padStart(2, '0')
  const mes = MESES[colombiana.getMonth()]
  const yyyy = colombiana.getFullYear()
  const hh = String(colombiana.getHours()).padStart(2, '0')
  const mm = String(colombiana.getMinutes()).padStart(2, '0')
  const ss = String(colombiana.getSeconds()).padStart(2, '0')
  return `${dia}, ${dd} ${mes} ${yyyy} — ${hh}:${mm}:${ss}`
}

function tiempoRelativo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60_000)
  if (min < 1) return 'ahora mismo'
  if (min < 60) return `hace ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `hace ${h}h`
  const d = Math.floor(h / 24)
  if (d === 1) return 'ayer'
  if (d < 7) return `hace ${d} días`
  return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
}

// ─── MAPA DE BREADCRUMBS ─────────────────────────────────────────────────────

const BREADCRUMB_MAP: Record<string, { crumbs: string[]; modulo?: 'manufactura' | 'calidad' }> = {
  '/': { crumbs: ['Dashboard Ejecutivo'], modulo: undefined },
  '/dashboard': { crumbs: ['Dashboard Ejecutivo'], modulo: undefined },
  '/manufactura/ordenes': { crumbs: ['Manufactura', 'Órdenes de Producción'], modulo: 'manufactura' },
  '/manufactura/rutas': { crumbs: ['Manufactura', 'Rutas'], modulo: 'manufactura' },
  '/manufactura/centros-trabajo': { crumbs: ['Manufactura', 'Centros de Trabajo'], modulo: 'manufactura' },
  '/manufactura/lista-materiales': { crumbs: ['Manufactura', 'Lista de Materiales'], modulo: 'manufactura' },
  '/manufactura/estructura-costos': { crumbs: ['Manufactura', 'Estructura de Costos'], modulo: 'manufactura' },
  '/manufactura/costeo-rutas': { crumbs: ['Manufactura', 'Costeo de Rutas'], modulo: 'manufactura' },
  '/manufactura/tiempos': { crumbs: ['Manufactura', 'Registro de Tiempos'], modulo: 'manufactura' },
  '/manufactura/avance': { crumbs: ['Manufactura', 'Avance en Planta'], modulo: 'manufactura' },
  '/calidad/trabajo-proceso': { crumbs: ['Calidad', 'Trabajo en Proceso'], modulo: 'calidad' },
  '/calidad/inspecciones': { crumbs: ['Calidad', 'Inspecciones'], modulo: 'calidad' },
  '/calidad/muestreo': { crumbs: ['Calidad', 'Muestreo'], modulo: 'calidad' },
  '/calidad/no-conformidades': { crumbs: ['Calidad', 'No Conformidades'], modulo: 'calidad' },
  '/calidad/fichas-tecnicas': { crumbs: ['Calidad', 'Fichas Técnicas'], modulo: 'calidad' },
  '/calidad/variaciones': { crumbs: ['Calidad', 'Variaciones'], modulo: 'calidad' },
  '/calidad/entregas-producto': { crumbs: ['Calidad', 'Entregas Prod. Terminado'], modulo: 'calidad' },
  '/calidad/trazabilidad': { crumbs: ['Calidad', 'Trazabilidad'], modulo: 'calidad' },
  '/calidad/indicadores': { crumbs: ['Calidad', 'Indicadores'], modulo: 'calidad' },
  '/ia/prediccion': { crumbs: ['IA', 'Análisis Predictivo'], modulo: undefined },
}

const MODULO_COLOR = { manufactura: '#1F6CF0', calidad: '#16B364' }

// ─── CONFIG TIPOS DE ALERTA ───────────────────────────────────────────────────

const ALERT_CONFIG: Record<
  Alerta['tipo'],
  { icon: string; color: string; bg: string; label: string }
> = {
  INSPECCION_REQUERIDA: { icon: '🔬', color: '#F59E0B', bg: '#FEF3E2', label: 'Inspección requerida' },
  INSPECCION_APROBADA:  { icon: '✅', color: '#16B364', bg: '#E7F8EF', label: 'Aprobado' },
  INSPECCION_ASIGNADA:  { icon: '👤', color: '#1F6CF0', bg: '#EAF2FE', label: 'Inspector asignado' },
  LOTE_RECHAZADO:       { icon: '🚫', color: '#EF4444', bg: '#FDECEC', label: 'Lote rechazado' },
  NC_CREADA:            { icon: '⚠️', color: '#EF4444', bg: '#FDECEC', label: 'NC creada' },
  NC_CERRADA:           { icon: '🔒', color: '#16B364', bg: '#E7F8EF', label: 'NC cerrada' },
  TIEMPO_EXCEDIDO:      { icon: '⏱️', color: '#F59E0B', bg: '#FEF3E2', label: 'Tiempo excedido' },
  MAQUINA_DETENIDA:     { icon: '🔧', color: '#EF4444', bg: '#FDECEC', label: 'Máquina detenida' },
  MUESTRA_APROBADA:     { icon: '🧪', color: '#16B364', bg: '#E7F8EF', label: 'Muestra aprobada' },
  MUESTRA_RECHAZADA:    { icon: '🧪', color: '#EF4444', bg: '#FDECEC', label: 'Muestra rechazada' },
}

// ─── ITEM DE NOTIFICACIÓN ─────────────────────────────────────────────────────

function AlertaItem({
  alerta,
  onRead,
  onDelete,
  onNavigate,
}: {
  alerta: Alerta
  onRead: () => void
  onDelete: () => void
  onNavigate: () => void
}) {
  const cfg = ALERT_CONFIG[alerta.tipo]

  return (
    <div
      className={`group relative flex items-start gap-3 px-4 py-3 border-b border-[#E8EDF4] transition-colors cursor-pointer ${
        alerta.leida ? 'opacity-60 hover:opacity-100 hover:bg-[#F4F7FB]' : 'bg-[#EAF2FE]/30 hover:bg-[#EAF2FE]/60'
      }`}
      onClick={() => {
        if (!alerta.leida) onRead()
        if (alerta.link) onNavigate()
      }}
    >
      {/* Icono tipo */}
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-sm"
        style={{ background: cfg.bg }}
      >
        {cfg.icon}
      </div>

      {/* Contenido */}
      <div className="flex-1 min-w-0 pr-6">
        <div className="flex items-center gap-2 flex-wrap">
          <p className={`text-xs leading-snug ${alerta.leida ? 'text-[#97A4B8]' : 'font-semibold text-[#15233B]'}`}>
            {alerta.mensaje}
          </p>
          {/* Badge módulo */}
          <span
            className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide"
            style={{
              color: alerta.modulo === 'MANUFACTURA' ? '#1F6CF0' : '#16B364',
              background: alerta.modulo === 'MANUFACTURA' ? '#EAF2FE' : '#E7F8EF',
            }}
          >
            {alerta.modulo === 'MANUFACTURA' ? 'MFG' : 'CAL'}
          </span>
        </div>

        {alerta.detalle && (
          <p className="text-[10px] text-[#97A4B8] mt-0.5 leading-relaxed line-clamp-2">{alerta.detalle}</p>
        )}

        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] text-[#97A4B8]">{tiempoRelativo(alerta.timestamp)}</span>
          {alerta.link && (
            <span className="text-[10px] text-[#1F6CF0] flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <ExternalLink size={9} /> Ver
            </span>
          )}
        </div>
      </div>

      {/* Indicador no leída */}
      {!alerta.leida && (
        <div className="absolute top-3.5 right-10 w-2 h-2 rounded-full bg-[#1F6CF0]" />
      )}

      {/* Botón eliminar */}
      <button
        onClick={(e) => { e.stopPropagation(); onDelete() }}
        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity text-[#97A4B8] hover:text-[#EF4444] p-0.5 rounded"
        title="Eliminar"
      >
        <X size={12} />
      </button>
    </div>
  )
}

// ─── PANEL DE NOTIFICACIONES ─────────────────────────────────────────────────

function PanelNotificaciones({ onClose }: { onClose: () => void }) {
  const { alertas, marcarAlertaLeida, marcarTodasLeidas, eliminarAlerta } = useAppContext()
  const router = useRouter()

  const sinLeer = alertas.filter((a) => !a.leida)
  const leidas  = alertas.filter((a) => a.leida)

  function handleNavigate(alerta: Alerta) {
    if (!alerta.leida) marcarAlertaLeida(alerta.id)
    if (alerta.link) {
      router.push(alerta.link)
      onClose()
    }
  }

  return (
    <div className="absolute right-0 top-full mt-2 w-[400px] bg-white rounded-xl shadow-2xl border border-[#E8EDF4] z-50 overflow-hidden">

      {/* Header panel */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#E8EDF4] bg-[#F4F7FB]">
        <div className="flex items-center gap-2">
          <h3 className="font-poppins font-bold text-[#15233B] text-sm">Notificaciones</h3>
          {sinLeer.length > 0 && (
            <span className="text-[10px] bg-[#EF4444] text-white px-1.5 py-0.5 rounded-full font-bold">
              {sinLeer.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {sinLeer.length > 0 && (
            <button
              onClick={marcarTodasLeidas}
              className="flex items-center gap-1 text-[10px] text-[#1F6CF0] hover:text-[#1557C9] font-semibold transition-colors"
              title="Marcar todas como leídas"
            >
              <CheckCheck size={12} /> Marcar todas
            </button>
          )}
          <button
            onClick={onClose}
            className="text-[#97A4B8] hover:text-[#5A6B85] transition-colors p-0.5"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Lista */}
      <div className="max-h-[420px] overflow-y-auto">
        {alertas.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">🔔</div>
            <p className="text-sm font-semibold text-[#5A6B85]">Sin notificaciones</p>
            <p className="text-xs text-[#97A4B8] mt-1">Estás al día con todo</p>
          </div>
        ) : (
          <>
            {/* Sin leer */}
            {sinLeer.length > 0 && (
              <div>
                <div className="px-4 py-2 bg-[#F4F7FB] border-b border-[#E8EDF4]">
                  <p className="text-[10px] text-[#5A6B85] uppercase tracking-widest font-bold">
                    Nuevas · {sinLeer.length}
                  </p>
                </div>
                {sinLeer.map((alerta) => (
                  <AlertaItem
                    key={alerta.id}
                    alerta={alerta}
                    onRead={() => marcarAlertaLeida(alerta.id)}
                    onDelete={() => eliminarAlerta(alerta.id)}
                    onNavigate={() => handleNavigate(alerta)}
                  />
                ))}
              </div>
            )}

            {/* Leídas */}
            {leidas.length > 0 && (
              <div>
                <div className="px-4 py-2 bg-[#F4F7FB] border-b border-[#E8EDF4]">
                  <p className="text-[10px] text-[#97A4B8] uppercase tracking-widest font-semibold">
                    Anteriores · {leidas.length}
                  </p>
                </div>
                {leidas.map((alerta) => (
                  <AlertaItem
                    key={alerta.id}
                    alerta={alerta}
                    onRead={() => marcarAlertaLeida(alerta.id)}
                    onDelete={() => eliminarAlerta(alerta.id)}
                    onNavigate={() => handleNavigate(alerta)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      {alertas.length > 0 && (
        <div className="px-4 py-2.5 border-t border-[#E8EDF4] bg-[#F4F7FB] flex items-center justify-between">
          <span className="text-[10px] text-[#97A4B8]">{alertas.length} notificación{alertas.length !== 1 ? 'es' : ''} en total</span>
          <button
            onClick={() => {
              if (window.confirm('¿Eliminar todas las notificaciones leídas?')) {
                leidas.forEach((a) => eliminarAlerta(a.id))
              }
            }}
            className="flex items-center gap-1 text-[10px] text-[#97A4B8] hover:text-[#EF4444] transition-colors"
          >
            <Trash2 size={10} /> Limpiar leídas
          </button>
        </div>
      )}
    </div>
  )
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────

interface HeaderProps {
  onMenuClick: () => void
}

export default function Header({ onMenuClick }: HeaderProps) {
  const [hora, setHora] = useState('')
  const [panelAbierto, setPanelAbierto] = useState(false)
  const [bellShake, setBellShake] = useState(false)
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()
  const { notificacionesCount } = useAppContext()
  const panelRef = useRef<HTMLDivElement>(null)
  const prevCountRef = useRef(notificacionesCount)

  useEffect(() => setMounted(true), [])

  // Reloj en tiempo real
  useEffect(() => {
    const tick = () => setHora(formatearHoraColombia(new Date()))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  // Animar campana cuando llega nueva notificación
  useEffect(() => {
    if (notificacionesCount > prevCountRef.current) {
      setBellShake(true)
      const t = setTimeout(() => setBellShake(false), 700)
      return () => clearTimeout(t)
    }
    prevCountRef.current = notificacionesCount
  }, [notificacionesCount])

  // Cerrar panel al hacer clic fuera
  useEffect(() => {
    if (!panelAbierto) return
    function handler(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setPanelAbierto(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [panelAbierto])

  // Breadcrumb
  const info = BREADCRUMB_MAP[pathname] ?? { crumbs: [pathname.replace(/\//g, ' › ').trim()], modulo: undefined }
  const moduloColor = info.modulo ? MODULO_COLOR[info.modulo] : '#4C9FE6'

  return (
    <header className="h-16 bg-white border-b border-[#E8EDF4] flex items-center px-6 gap-4 shrink-0 z-10" style={{ boxShadow: '0 6px 18px -12px rgba(21,35,59,.18)' }}>

      {/* Hamburger móvil */}
      <button
        onClick={onMenuClick}
        className="md:hidden text-[#97A4B8] hover:text-[#1F6CF0] transition-colors"
        aria-label="Abrir menú"
      >
        <Menu size={22} />
      </button>

      {/* ── BREADCRUMB ── */}
      <nav className="flex items-center gap-1.5 flex-1 min-w-0" aria-label="Breadcrumb">
        <Home size={14} className="text-[#97A4B8] shrink-0" />
        <ChevronRight size={12} className="text-[#CBD5E1] shrink-0" />
        {info.crumbs.map((crumb, idx) => {
          const esUltimo = idx === info.crumbs.length - 1
          return (
            <span key={idx} className="flex items-center gap-1.5">
              {idx > 0 && <ChevronRight size={12} className="text-[#CBD5E1] shrink-0" />}
              <span
                className={`text-[13.5px] truncate ${esUltimo ? 'font-semibold text-[#1F6CF0]' : 'text-[#97A4B8]'}`}
              >
                {crumb}
              </span>
            </span>
          )
        })}
      </nav>

      {/* ── LADO DERECHO ── */}
      <div className="flex items-center gap-4 shrink-0">

        {/* Indicador en línea */}
        <div className="hidden sm:flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#16B364] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#16B364]" />
          </span>
          <span className="text-xs font-medium text-[#16B364]">SIESA EN LÍNEA</span>
        </div>

        {/* Reloj */}
        <span
          className="hidden lg:block text-xs text-[#97A4B8] font-mono tabular-nums whitespace-nowrap"
          suppressHydrationWarning
        >
          {hora}
        </span>

        <div className="h-6 w-px bg-[#E8EDF4]" />

        {/* Campana de notificaciones */}
        <div className="relative" ref={panelRef}>
          <button
            onClick={() => setPanelAbierto((p) => !p)}
            className={`relative w-10 h-10 rounded-xl bg-[#F4F7FB] hover:bg-[#EAF2FE] flex items-center justify-center transition-all duration-150 ${
              bellShake ? 'animate-bounce' : ''
            } ${mounted && notificacionesCount > 0 ? 'text-[#1F6CF0]' : 'text-[#5A6B85]'}`}
            aria-label={`Notificaciones${mounted && notificacionesCount > 0 ? ` (${notificacionesCount} sin leer)` : ''}`}
          >
            <Bell size={18} />
            {mounted && notificacionesCount > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#EF4444] text-white text-[10px] font-bold leading-none">
                {notificacionesCount > 9 ? '9+' : notificacionesCount}
              </span>
            )}
          </button>

          {panelAbierto && (
            <PanelNotificaciones onClose={() => setPanelAbierto(false)} />
          )}
        </div>

        <div className="h-6 w-px bg-[#E8EDF4]" />

        {/* Avatar gradient */}
        <div
          className="w-[38px] h-[38px] rounded-[11px] flex items-center justify-center cursor-pointer font-poppins font-bold text-white text-[12px] hover:opacity-90 transition-opacity"
          style={{ background: 'linear-gradient(135deg,#1F6CF0,#4C9FE6)' }}
        >
          OP
        </div>
      </div>
    </header>
  )
}

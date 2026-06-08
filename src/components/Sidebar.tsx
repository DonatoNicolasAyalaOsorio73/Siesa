'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAppContext } from '@/context/AppContext'
import { useEffect, useState } from 'react'
import {
  Factory, GitBranch, Settings, Package, DollarSign, Calculator,
  Clock, BarChart2, FlaskConical, FileText, Sliders, CheckCircle,
  RefreshCw, ClipboardCheck, AlertTriangle, TrendingUp,
  LayoutDashboard, LogOut, X, Brain, Bot, Wrench, Zap,
} from 'lucide-react'

// ─── TIPOS ───────────────────────────────────────────────────────────────────

interface NavItem {
  icon: React.ElementType
  label: string
  href: string
  badge?: 'ordenes' | 'alertas'
  mod?: 'ia'
}

const manufacturaItems: NavItem[] = [
  { icon: Factory,    label: 'Órdenes de Producción', href: '/manufactura/ordenes',          badge: 'ordenes' },
  { icon: GitBranch,  label: 'Rutas',                 href: '/manufactura/rutas' },
  { icon: Settings,   label: 'Centros de Trabajo',    href: '/manufactura/centros-trabajo' },
  { icon: Package,    label: 'Lista de Materiales',   href: '/manufactura/lista-materiales' },
  { icon: DollarSign, label: 'Estructura de Costos',  href: '/manufactura/estructura-costos' },
  { icon: Calculator, label: 'Costeo de Rutas',       href: '/manufactura/costeo-rutas' },
  { icon: Clock,      label: 'Registro de Tiempos',   href: '/manufactura/tiempos' },
  { icon: BarChart2,  label: 'Avance en Planta',      href: '/manufactura/avance' },
]

const calidadItems: NavItem[] = [
  { icon: RefreshCw,      label: 'Trabajo en Proceso',       href: '/calidad/trabajo-proceso',  badge: 'alertas' },
  { icon: ClipboardCheck, label: 'Inspecciones',             href: '/calidad/inspecciones',     badge: 'alertas' },
  { icon: FlaskConical,   label: 'Muestreo',                 href: '/calidad/muestreo' },
  { icon: AlertTriangle,  label: 'No Conformidades',         href: '/calidad/no-conformidades' },
  { icon: FileText,       label: 'Fichas Técnicas',          href: '/calidad/fichas-tecnicas' },
  { icon: Sliders,        label: 'Variaciones',              href: '/calidad/variaciones' },
  { icon: CheckCircle,    label: 'Entregas Prod. Terminado', href: '/calidad/entregas-producto' },
  { icon: GitBranch,      label: 'Trazabilidad',             href: '/calidad/trazabilidad' },
  { icon: TrendingUp,     label: 'Indicadores',              href: '/calidad/indicadores' },
]

// ─── NAV ITEM ─────────────────────────────────────────────────────────────────

function NavItemLink({
  item,
  isActive,
  badgeValue,
}: {
  item: NavItem
  isActive: boolean
  badgeValue?: number
}) {
  const Icon = item.icon
  const isIA = item.mod === 'ia'

  return (
    <Link
      href={item.href}
      className={[
        'flex items-center gap-[11px] px-[10px] py-[8px] rounded-[11px] mb-[2px]',
        'text-[13.5px] font-medium transition-all duration-150 cursor-pointer',
        isActive
          ? `bg-white font-semibold ${isIA ? 'text-[#5B45CC]' : 'text-[#1557C9]'}`
          : 'text-white/80 hover:bg-white/10 hover:text-white',
      ].join(' ')}
      style={isActive ? { boxShadow: '0 4px 12px -4px rgba(8,28,72,.35)' } : {}}
    >
      {/* Icon container */}
      <span
        className={[
          'w-[30px] h-[30px] rounded-[9px] flex-shrink-0 flex items-center justify-center transition-all duration-150',
          isActive
            ? `${isIA ? 'bg-[#6E56E0]' : 'bg-[#1F6CF0]'} text-white`
            : 'bg-white/12 text-white group-hover:bg-white/20',
        ].join(' ')}
      >
        <Icon size={16} />
      </span>

      {/* Label */}
      <span className="flex-1 truncate">{item.label}</span>

      {/* Badge */}
      {badgeValue !== undefined && badgeValue > 0 && (
        <span
          className={[
            'text-[11px] font-semibold px-2 py-0.5 rounded-full',
            isActive
              ? item.badge === 'alertas'
                ? 'bg-[#FDECEC] text-[#EF4444]'
                : 'bg-[#EAF2FE] text-[#1F6CF0]'
              : item.badge === 'alertas'
                ? 'bg-[#FF6B6B] text-white'
                : 'bg-white/20 text-white',
          ].join(' ')}
        >
          {badgeValue}
        </span>
      )}
    </Link>
  )
}

// ─── SEPARADOR DE SECCIÓN ─────────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 px-[10px] pt-[14px] pb-[7px]">
      <div className="w-1.5 h-1.5 rounded-full bg-white/55 shrink-0" />
      <span className="text-[10.5px] font-semibold uppercase tracking-[.12em] text-white/55">
        {label}
      </span>
    </div>
  )
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()
  const { ordenes, ordenesConInspeccionPendiente } = useAppContext()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const ordenesActivas = mounted ? ordenes.filter((o) => o.estado === 'EN_PROCESO').length : 0
  const alertasCalidad = mounted ? ordenesConInspeccionPendiente.length : 0

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')
  const isDashboardActive = pathname === '/' || pathname === '/dashboard'

  return (
    <>
      {/* Overlay móvil */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-20 md:hidden" onClick={onClose} />
      )}

      {/* Sidebar */}
      <aside
        className={[
          'fixed md:static inset-y-0 left-0 z-30',
          'flex flex-col w-[264px] min-h-screen flex-shrink-0',
          'transition-transform duration-300',
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        ].join(' ')}
        style={{ background: 'linear-gradient(180deg,#1F6CF0 0%,#1450BE 100%)' }}
      >
        {/* ── BRAND ── */}
        <div className="flex items-center gap-[11px] px-[22px] py-[22px] pb-[18px]">
          {/* Logo mark */}
          <svg className="w-[30px] h-[30px] flex-shrink-0" viewBox="0 0 100 100" fill="none">
            <path d="M0 0 L50 0 L0 50 Z" fill="#fff"/>
            <path d="M50 50 L100 0 L100 50 Z" fill="#fff"/>
            <path d="M0 50 L50 50 L0 100 Z" fill="#fff"/>
            <path d="M50 100 L100 50 L100 100 Z" fill="#fff"/>
          </svg>
          <div className="flex flex-col leading-none">
            <div className="flex items-center gap-[7px]">
              <span className="font-poppins font-semibold text-[21px] text-white tracking-[-0.01em]">Siesa</span>
              <span className="font-figtree font-bold text-[10px] tracking-[.06em] text-white bg-white/20 px-[7px] py-[2px] rounded-[6px]">
                MES
              </span>
            </div>
            <span className="text-[10.5px] text-white/60 mt-[5px]">Manufacturing Execution</span>
          </div>
          <button
            onClick={onClose}
            className="md:hidden ml-auto text-white/60 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* ── NAVEGACIÓN ── */}
        <nav className="flex-1 overflow-y-auto px-[14px] pb-[14px]">

          <SectionLabel label="Manufactura" />
          {manufacturaItems.map((item) => (
            <NavItemLink
              key={item.href}
              item={item}
              isActive={isActive(item.href)}
              badgeValue={item.badge === 'ordenes' ? ordenesActivas : undefined}
            />
          ))}

          <SectionLabel label="Calidad" />
          {calidadItems.map((item) => (
            <NavItemLink
              key={item.href}
              item={item}
              isActive={isActive(item.href)}
              badgeValue={item.badge === 'alertas' ? alertasCalidad : undefined}
            />
          ))}

          <SectionLabel label="Gerencial" />
          <NavItemLink
            item={{ icon: LayoutDashboard, label: 'Dashboard Ejecutivo', href: '/' }}
            isActive={isDashboardActive}
          />

          <SectionLabel label="Inteligencia Artificial" />
          <NavItemLink
            item={{ icon: Brain, label: 'Análisis Predictivo', href: '/ia/prediccion', mod: 'ia' }}
            isActive={isActive('/ia/prediccion')}
          />
          <NavItemLink
            item={{ icon: Zap, label: 'Optimización IA', href: '/ia/optimizacion', mod: 'ia' }}
            isActive={isActive('/ia/optimizacion')}
          />
          <NavItemLink
            item={{ icon: Bot, label: 'Asistente de Planta', href: '/ia/asistente', mod: 'ia' }}
            isActive={isActive('/ia/asistente')}
          />
          <NavItemLink
            item={{ icon: FileText, label: 'Reportes IA', href: '/ia/reportes', mod: 'ia' }}
            isActive={isActive('/ia/reportes')}
          />
          <NavItemLink
            item={{ icon: Wrench, label: 'Mantenimiento IA', href: '/ia/mantenimiento', mod: 'ia' }}
            isActive={isActive('/ia/mantenimiento')}
          />
        </nav>

        {/* ── FOOTER USUARIO ── */}
        <div className="px-[14px] pb-[14px] border-t border-white/10">
          <div className="flex items-center gap-[11px] px-[8px] py-[8px] rounded-[12px] cursor-pointer hover:bg-white/10 transition-all duration-150 mt-[14px]">
            {/* Avatar blanco */}
            <div className="w-[36px] h-[36px] rounded-[10px] bg-white flex items-center justify-center shrink-0">
              <span className="text-[#1557C9] font-poppins font-bold text-[13px]">OP</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-white leading-[1.2] truncate">Operador Planta 1</p>
              <p className="text-[11px] text-white/60 truncate">Control de Piso</p>
            </div>
            <LogOut size={16} className="text-white/50 hover:text-white/80 transition-colors ml-auto shrink-0" />
          </div>
        </div>
      </aside>
    </>
  )
}

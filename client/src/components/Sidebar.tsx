import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { PERFIL, T } from '../theme'

// ── Ícone SVG inline ───────────────────────────────────────
export const Ico = ({ d, size = 16 }: { d: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
)

// ── Logo mark ──────────────────────────────────────────────
export const LogoIcon = ({ size = 30, bg }: { size?: number; bg?: string }) => (
  <div style={{
    width: size, height: size,
    borderRadius: Math.round(size * 0.28),
    background: bg || 'linear-gradient(135deg,#16a34a,#059669)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  }}>
    <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24"
      fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" opacity=".2"/>
      <path d="M7 13l3-3 2 2 3-4 2 2"/>
    </svg>
  </div>
)

// ── Tipos ──────────────────────────────────────────────────
export type NavItem = {
  to:    string
  label: string
  icon:  string
  badge?: number | string
  end?:  boolean
}

type SidebarProps = {
  perfil:   'supervisor' | 'recepcionista' | 'estagiario' | 'paciente'
  navItems: NavItem[]
  badges?:  Record<string, number>
  onNav?:   () => void
}

// ── Sidebar ────────────────────────────────────────────────
export default function Sidebar({ perfil, navItems, badges = {}, onNav }: SidebarProps) {
  const { user, logout } = useAuth()
  const nav = useNavigate()
  const P = PERFIL[perfil]

  return (
    <div style={{
      width: 228,
      height: '100%',
      background: P.sidebar,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Brand */}
      <div style={{
        padding: '18px 14px 14px',
        borderBottom: '1px solid rgba(255,255,255,.07)',
        display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
      }}>
        <LogoIcon size={32} bg="linear-gradient(135deg,#16a34a,#059669)"/>
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#fafaf9', letterSpacing: '-.01em' }}>
            SEP Sistema
          </div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,.3)', marginTop: 1 }}>
            Estácio Aracaju
          </div>
        </div>
      </div>

      {/* User */}
      <div style={{
        margin: '10px 10px 4px',
        padding: '10px 11px',
        background: 'rgba(255,255,255,.06)',
        borderRadius: 10,
        display: 'flex', alignItems: 'center', gap: 9,
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: P.active,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0,
        }}>
          {user?.nome?.charAt(0) || '?'}
        </div>
        <div style={{ overflow: 'hidden' }}>
          <div style={{
            fontSize: 11, fontWeight: 600, color: '#fafaf9',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {user?.nome?.split(' ')[0]}
          </div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,.35)', marginTop: 1 }}>
            {P.role}
          </div>
        </div>
      </div>

      {/* Nav label */}
      <div style={{
        fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,.25)',
        textTransform: 'uppercase', letterSpacing: '.1em',
        padding: '10px 14px 4px',
      }}>
        Menu
      </div>

      {/* Nav links */}
      <nav style={{
        flex: 1, padding: '2px 8px', display: 'flex',
        flexDirection: 'column', gap: 1, overflowY: 'auto',
      }}>
        {navItems.map(item => {
          const badgeRaw = item.badge ?? badges?.[item.label] ?? 0
          const badgeVal = typeof badgeRaw === 'number' ? badgeRaw : Number(badgeRaw) || 0
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onNav}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 9,
                padding: '9px 12px', borderRadius: 9,
                color: isActive ? '#fff' : 'rgba(255,255,255,.42)',
                background: isActive ? P.active : 'transparent',
                fontWeight: isActive ? 600 : 400,
                textDecoration: 'none', fontSize: 12,
                transition: 'all .15s', minHeight: 38,
                boxShadow: isActive ? '0 2px 10px rgba(0,0,0,.2)' : 'none',
              })}
            >
              <span style={{ opacity: .85, flexShrink: 0 }}>
                <Ico d={item.icon} size={15} />
              </span>
              <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {item.label}
              </span>
              {badgeVal > 0 && (
                <span style={{
                  background: '#ef4444', color: '#fff',
                  borderRadius: 20, padding: '1px 6px',
                  fontSize: 9, fontWeight: 700, flexShrink: 0,
                }}>
                  {badgeVal}
                </span>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Logout */}
      <div style={{ padding: '8px 10px 14px', flexShrink: 0 }}>
        <button
          onClick={() => { logout(); nav('/') }}
          style={{
            width: '100%', padding: '8px 12px', borderRadius: 9, border: 'none',
            background: 'rgba(255,255,255,.05)', color: 'rgba(255,255,255,.35)',
            fontSize: 11, fontWeight: 500, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'inherit',
            transition: 'background .15s',
          }}
        >
          <Ico d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" size={13} />
          Sair da conta
        </button>
      </div>
    </div>
  )
}

// ── Shell de layout (sidebar + main) ──────────────────────
export function AppShell({
  perfil, navItems, badges, children, title, subtitle,
}: {
  perfil:    'supervisor' | 'recepcionista' | 'estagiario' | 'paciente'
  navItems:  NavItem[]
  badges?:   Record<string, number>
  children:  React.ReactNode
  title?:    string
  subtitle?: string
}) {
  const [drawer, setDrawer] = React.useState(false)
  const { isMobile } = { isMobile: typeof window !== 'undefined' && window.innerWidth < 768 }
  const P = PERFIL[perfil]

  return (
    <div style={{ display: 'flex', height: '100vh', background: T.bg, overflow: 'hidden' }}>
      {/* Desktop sidebar */}
      {!isMobile && (
        <div style={{ flexShrink: 0, boxShadow: '2px 0 20px rgba(0,0,0,.12)' }}>
          <Sidebar perfil={perfil} navItems={navItems} badges={badges} />
        </div>
      )}

      {/* Mobile drawer */}
      {isMobile && drawer && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 200 }}
            onClick={() => setDrawer(false)}
          />
          <div style={{ position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 201, boxShadow: '4px 0 24px rgba(0,0,0,.25)' }}>
            <Sidebar perfil={perfil} navItems={navItems} badges={badges} onNav={() => setDrawer(false)} />
          </div>
        </>
      )}

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Mobile header */}
        {isMobile && (
          <header style={{
            background: P.sidebar,
            height: 54, padding: '0 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <LogoIcon size={28} />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#fafaf9' }}>SEP Sistema</span>
            </div>
            <button onClick={() => setDrawer(true)}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.5)', cursor: 'pointer', padding: 6 }}>
              <Ico d="M4 6h16M4 12h16M4 18h16" size={20} />
            </button>
          </header>
        )}

        {/* Topbar desktop */}
        {!isMobile && title && (
          <div style={{
            background: T.surface, borderBottom: `1px solid ${T.border}`,
            padding: '0 28px', height: 56,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
          }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: T.text, letterSpacing: '-.01em' }}>
                {title}
              </div>
              {subtitle && (
                <div style={{ fontSize: 11, color: T.muted, marginTop: 1 }}>{subtitle}</div>
              )}
            </div>
            <div style={{
              width: 34, height: 34, borderRadius: '50%',
              background: P.active,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700, color: '#fff', cursor: 'pointer',
              flexShrink: 0,
            }}>
              {/* user initial rendered by parent if needed */}
            </div>
          </div>
        )}

        <main style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '18px 14px' : '26px 30px' }}>
          {children}
        </main>
      </div>
    </div>
  )
}

import React, { useState, useEffect, useCallback } from 'react'
import { Routes, Route, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useResponsive } from '../../hooks/useResponsive'
import { S_COR, S_LBL, U_COR, U_LBL, DIA_LBL, fmtData, fmtDT, fmtHora, fmtCPF } from '../../components/ui'
import AgendaCalendar from '../../components/AgendaCalendar'
import * as api from '../../services/api'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip as ChartTooltip,
  Legend,
} from 'chart.js'
import { Bar as ChartBar, Doughnut } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, ChartTooltip, Legend)

// ── Design tokens — SEP Identity (acolhedor, verde base) ──
const C = {
  bg:'#faf9f6', surface:'#ffffff', surfaceAlt:'#f5f4f0',
  border:'#e7e5e4', borderMed:'#d6d3d1',
  text:'#1c1917', sub:'#57534e', muted:'#a8a29e',
  // Principal
  green:'#16a34a', greenD:'#14532d', greenL:'#dcfce7', greenMid:'#166534',
  // Semânticos
  red:'#dc2626', redL:'#fef2f2',
  amber:'#b45309', amberL:'#fef3c7',
  teal:'#0891b2', tealL:'#cffafe',
  purple:'#7c3aed', purpleL:'#ede9fe',
  blue:'#0891b2', blueL:'#cffafe', blueMid:'#0891b2',
  // Sidebar do supervisor
  sidebar:'#1c1a14',
  sideActive:'linear-gradient(135deg,#92400e,#b45309)',
}

// ── Toast context ──────────────────────────────────────────
const ToastCtx = React.createContext<(m:string)=>void>(()=>{})
const useToast  = () => React.useContext(ToastCtx)

// ── Chips ──────────────────────────────────────────────────
const Chip = ({label,color,bg,sm}:{label:string;color:string;bg:string;sm?:boolean}) => (
  <span style={{display:'inline-flex',alignItems:'center',background:bg,color,borderRadius:6,
    padding:sm?'2px 8px':'3px 10px',fontSize:sm?11:12,fontWeight:600,whiteSpace:'nowrap'}}>
    {label}
  </span>
)
const uChip = (u:string,sm=true) => <Chip label={U_LBL[u]||u} color={U_COR[u]||C.muted} bg={(U_COR[u]||C.muted)+'18'} sm={sm}/>
const sChip = (s:string,sm=true) => <Chip label={S_LBL[s]||s} color={S_COR[s]||C.muted} bg={(S_COR[s]||C.muted)+'18'} sm={sm}/>
const DEFAULT_SALAS = ['Sala 1','Sala 2','Sala 3','Sala 4','Sala 5','Sala Online']
const parseSalasConfig = (valor:any): string[] =>
  String(valor || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
const salasPresenciais = (salas:string[]) => {
  const fisicas = salas.filter(s => !/online/i.test(s))
  return fisicas.length ? fisicas : salas
}

// ── Button ─────────────────────────────────────────────────
type BtnV = 'primary'|'danger'|'ghost'|'success'|'outline'|'warn'|'teal'
const Btn = ({children,onClick,variant='primary',size='md',disabled,full,icon}:{
  children:React.ReactNode;onClick?:()=>void;variant?:BtnV;
  size?:'sm'|'md'|'lg';disabled?:boolean;full?:boolean;icon?:string
}) => {
  const vs:Record<BtnV,React.CSSProperties> = {
    primary:{background:C.amber,color:'#fff',border:'none'},
    danger:{background:C.red,color:'#fff',border:'none'},
    success:{background:C.green,color:'#fff',border:'none'},
    warn:{background:C.amber,color:'#fff',border:'none'},
    teal:{background:C.teal,color:'#fff',border:'none'},
    ghost:{background:'transparent',color:C.sub,border:`1.5px solid ${C.border}`},
    outline:{background:'transparent',color:C.amber,border:`1.5px solid ${C.amber}`},
  }
  const p={sm:'6px 14px',md:'9px 18px',lg:'12px 24px'}
  const f={sm:12,md:13,lg:14}
  return (
    <button onClick={onClick} disabled={disabled} style={{
      ...vs[variant],padding:p[size],borderRadius:8,fontSize:f[size],fontWeight:600,
      cursor:disabled?'not-allowed':'pointer',opacity:disabled?.5:1,
      display:'inline-flex',alignItems:'center',gap:6,minHeight:36,
      width:full?'100%':undefined,justifyContent:full?'center':undefined,
      transition:'opacity .15s',fontFamily:'inherit',
    }}>
      {icon&&<span style={{fontSize:13}}>{icon}</span>}{children}
    </button>
  )
}

// ── Field ──────────────────────────────────────────────────
const Inp = ({label,...p}:{label?:string}&React.InputHTMLAttributes<HTMLInputElement>) => (
  <div style={{display:'flex',flexDirection:'column',gap:5}}>
    {label&&<label style={{fontSize:12,fontWeight:600,color:C.sub}}>{label}</label>}
    <input {...p} style={{padding:'9px 12px',borderRadius:8,border:`1.5px solid ${C.border}`,
      background:'#fff',color:C.text,fontSize:13,outline:'none',minHeight:40,
      width:'100%',boxSizing:'border-box',fontFamily:'inherit',...p.style}}/>
  </div>
)
const Sel = ({label,children,...p}:{label?:string}&React.SelectHTMLAttributes<HTMLSelectElement>&{children:React.ReactNode}) => (
  <div style={{display:'flex',flexDirection:'column',gap:5}}>
    {label&&<label style={{fontSize:12,fontWeight:600,color:C.sub}}>{label}</label>}
    <select {...p} style={{padding:'9px 12px',borderRadius:8,border:`1.5px solid ${C.border}`,
      background:'#fff',color:C.text,fontSize:13,outline:'none',minHeight:40,
      width:'100%',fontFamily:'inherit',...p.style}}>{children}</select>
  </div>
)
const Txa = ({label,...p}:{label?:string}&React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <div style={{display:'flex',flexDirection:'column',gap:5}}>
    {label&&<label style={{fontSize:12,fontWeight:600,color:C.sub}}>{label}</label>}
    <textarea {...p} style={{padding:'9px 12px',borderRadius:8,border:`1.5px solid ${C.border}`,
      background:'#fff',color:C.text,fontSize:13,outline:'none',resize:'vertical',
      fontFamily:'inherit',minHeight:70,boxSizing:'border-box',...p.style}}/>
  </div>
)

// ── Card ───────────────────────────────────────────────────
const Card = ({children,style}:{children:React.ReactNode;style?:React.CSSProperties}) => (
  <div style={{background:C.surface,borderRadius:12,border:`1px solid ${C.border}`,
    boxShadow:'0 1px 4px rgba(15,23,42,.06)',...style}}>{children}</div>
)

// ── Stat card ──────────────────────────────────────────────
const Stat = ({v,label,color,bg,icon,alert}:{v:number|string;label:string;color:string;bg:string;icon:string;alert?:boolean}) => (
  <div style={{background:C.surface,borderRadius:12,padding:'16px 18px',
    border:`1px solid ${alert?color+'40':C.border}`,
    boxShadow:alert?`0 0 0 3px ${color}18`:'0 1px 4px rgba(15,23,42,.06)'}}>
    <div style={{width:36,height:36,borderRadius:9,background:bg,
      display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,marginBottom:10}}>{icon}</div>
    <div style={{fontSize:26,fontWeight:800,color,lineHeight:1,marginBottom:4}}>{v}</div>
    <div style={{fontSize:12,color:C.muted,fontWeight:500}}>{label}</div>
  </div>
)

// ── Spinner ────────────────────────────────────────────────
const Spin = () => (
  <div style={{display:'flex',alignItems:'center',justifyContent:'center',padding:64}}>
    <div style={{width:32,height:32,border:`3px solid ${C.border}`,borderTopColor:C.blue,
      borderRadius:'50%',animation:'spin 1s linear infinite'}}/>
  </div>
)

// ── Modal — header fixo, corpo com scroll ──────────────────
const Modal = ({title,subtitle,onClose,children,width=640}:{
  title:string;subtitle?:string;onClose:()=>void;children:React.ReactNode;width?:number
}) => {
  const {isMobile} = useResponsive()
  return (
    <div onClick={onClose} style={{
      position:'fixed',inset:0,zIndex:1000,
      background:'rgba(15,23,42,.6)',backdropFilter:'blur(3px)',
      display:'flex',alignItems:isMobile?'flex-end':'center',
      justifyContent:'center',padding:isMobile?0:'20px 16px',
    }}>
      <div onClick={e=>e.stopPropagation()} style={{
        width:'100%',maxWidth:width,
        background:C.surface,
        borderRadius:isMobile?'20px 20px 0 0':14,
        boxShadow:'0 20px 60px rgba(15,23,42,.2)',
        border:`1px solid ${C.border}`,
        display:'flex',flexDirection:'column',
        maxHeight:isMobile?'92vh':'88vh',
        animation:isMobile?'slideUp .25s ease':'fadeInM .2s ease',
      }}>
        {/* Handle mobile */}
        {isMobile&&(
          <div style={{padding:'12px 0 4px',display:'flex',justifyContent:'center',flexShrink:0}}>
            <div style={{width:36,height:4,background:C.border,borderRadius:2}}/>
          </div>
        )}
        {/* Header — NUNCA rola */}
        <div style={{
          padding:isMobile?'14px 20px 12px':'20px 24px 16px',
          borderBottom:`1px solid ${C.border}`,flexShrink:0,
          display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:12,
        }}>
          <div>
            <h2 style={{fontSize:17,fontWeight:700,color:C.text,margin:0,lineHeight:1.3}}>{title}</h2>
            {subtitle&&<p style={{fontSize:12,color:C.muted,marginTop:3}}>{subtitle}</p>}
          </div>
          <button onClick={onClose} style={{
            background:C.bg,border:`1px solid ${C.border}`,color:C.sub,
            width:32,height:32,borderRadius:8,display:'flex',alignItems:'center',
            justifyContent:'center',cursor:'pointer',fontSize:18,flexShrink:0,fontFamily:'inherit',
          }}>×</button>
        </div>
        {/* Corpo com scroll */}
        <div style={{padding:isMobile?'16px 20px 32px':'20px 24px 24px',overflowY:'auto',flex:1}}>
          {children}
        </div>
      </div>
    </div>
  )
}

// ── Info block ─────────────────────────────────────────────
const InfoBox = ({k,v}:{k:string;v:string}) => (
  <div style={{background:C.bg,borderRadius:8,padding:'10px 12px'}}>
    <div style={{fontSize:11,color:C.muted,marginBottom:3}}>{k}</div>
    <div style={{fontSize:13,fontWeight:600,color:C.text}}>{v}</div>
  </div>
)

// ══════════════════════════════════════════════════════════════
// SIDEBAR
// ══════════════════════════════════════════════════════════════
const NAV = [
  // ── Ambos: coordenador e supervisor ─────────────────────
  {to:'/supervisor',              end:true,  label:'Dashboard',       badge:'',               icon:'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6'},
  {to:'/supervisor/triagem',      end:false, label:'Triagem',         badge:'triagemPendente',icon:'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4'},
  {to:'/supervisor/pacientes',    end:false, label:'Pacientes',       badge:'',               icon:'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z'},
  {to:'/supervisor/agendamentos', end:false, label:'Agenda',          badge:'',               icon:'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'},
  {to:'/supervisor/estagiarios',  end:false, label:'Estagiários',     badge:'',               icon:'M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z'},
  {to:'/supervisor/slots-pendentes',end:false,label:'Aprovar Horários',badge:'slotsPendentes',icon:'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9'},
  {to:'/supervisor/prontuarios',  end:false, label:'Prontuários',     badge:'',               icon:'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'},
  {to:'/supervisor/altas',        end:false, label:'Altas Clínicas',  badge:'altasPendentes', icon:'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'},
  // ── Exclusivo coordenador ────────────────────────────────
  {to:'/supervisor/fila',         end:false, label:'Fila de Espera',  badge:'',               icon:'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',  perfil:'coordenador'},
  {to:'/supervisor/usuarios',     end:false, label:'Usuários',        badge:'',               icon:'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',        perfil:'coordenador'},
  {to:'/supervisor/seguranca',    end:false, label:'Segurança',       badge:'',               icon:'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',       perfil:'coordenador'},
]

const Ico = ({d}:{d:string}) => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d}/></svg>
)

function Sidebar({badges,onNav}:{badges:any;onNav?:()=>void}) {
  const {user,logout} = useAuth()
  const nav = useNavigate()
  const navItems = NAV.filter((lk:any)=>
    !lk.perfil || user?.perfil === lk.perfil
  )
  return (
    <div style={{background:C.sidebar,height:'100%',width:230,display:'flex',flexDirection:'column',overflow:'hidden'}}>
      {/* Brand */}
      <div style={{padding:'20px 16px 16px',borderBottom:'1px solid rgba(255,255,255,.07)',display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
        <div style={{width:36,height:36,borderRadius:10,background:'linear-gradient(135deg,#16a34a,#059669)',
          display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,
          boxShadow:'0 4px 12px rgba(59,130,246,.4)'}}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" opacity=".2"/><path d="M7 13l3-3 2 2 3-4 2 2"/>
          </svg>
        </div>
        <div>
          <div style={{fontSize:14,fontWeight:700,color:'#f1f5f9',letterSpacing:'-.01em'}}>SEP Sistema</div>
          <div style={{fontSize:10,color:'#475569',marginTop:1}}>Estácio Aracaju</div>
        </div>
      </div>

      {/* User */}
      <div style={{margin:'10px 12px',padding:'10px 12px',background:'rgba(255,255,255,.05)',
        borderRadius:10,display:'flex',alignItems:'center',gap:10}}>
        <div style={{width:32,height:32,borderRadius:'50%',background:'linear-gradient(135deg,#92400e,#b45309)',
          display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,color:'#fff',flexShrink:0}}>
          {user?.nome?.charAt(0)||'A'}
        </div>
        <div style={{overflow:'hidden'}}>
          <div style={{fontSize:12,fontWeight:600,color:'#e2e8f0',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
            {user?.nome?.split(' ')[0]}
          </div>
          <div style={{fontSize:10,color:'#64748b'}}>{user?.perfil==='coordenador'?'Coordenador':'Supervisor'}</div>
        </div>
      </div>

      {/* Nav links */}
      <nav style={{flex:1,padding:'4px 10px',display:'flex',flexDirection:'column',gap:1,overflowY:'auto'}}>
        <div style={{fontSize:10,fontWeight:700,color:'#475569',textTransform:'uppercase',letterSpacing:'.08em',padding:'8px 10px 4px'}}>
          Menu
        </div>
        {navItems.map((lk:any)=>(
          <NavLink key={lk.to} to={lk.to} end={lk.end} onClick={onNav}
            style={({isActive})=>({
              display:'flex',alignItems:'center',justifyContent:'space-between',
              gap:10,padding:'9px 12px',borderRadius:9,
              color:isActive?'#fff':'#94a3b8',
              background:isActive?'linear-gradient(135deg,#92400e,#b45309)':'transparent',
              fontWeight:isActive?600:400,textDecoration:'none',
              fontSize:13,transition:'all .15s',minHeight:40,
              boxShadow:isActive?'0 2px 8px rgba(30,64,175,.3)':'none',
            })}>
            <span style={{display:'flex',alignItems:'center',gap:10}}>
              <span style={{opacity:.85,flexShrink:0}}><Ico d={lk.icon}/></span>
              {lk.label}
            </span>
            {lk.badge&&(badges?.[lk.badge]||0)>0&&(
              <span style={{background:'#ef4444',color:'#fff',borderRadius:20,padding:'1px 7px',fontSize:10,fontWeight:700,flexShrink:0}}>
                {badges[lk.badge]}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Sair */}
      <div style={{padding:'8px 10px 16px'}}>
        <button onClick={()=>{logout();nav('/')}} style={{
          width:'100%',padding:'9px 12px',borderRadius:9,border:'none',
          background:'rgba(239,68,68,.1)',color:'#f87171',fontSize:13,fontWeight:500,
          cursor:'pointer',display:'flex',alignItems:'center',gap:10,fontFamily:'inherit',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
          </svg>
          Sair
        </button>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// PÁGINAS
// ══════════════════════════════════════════════════════════════

function Dashboard() {
  const [s,setS] = useState<any>(null)
  const location = useLocation()
  const nav = useNavigate()
  useEffect(()=>{ api.adminDashboard().then(setS) },[location.pathname])
  if(!s) return <Spin/>
  const k = s.kpi || {}

  // ── helpers ─────────────────────────────────────────────
  const fmt1 = (v:number|null) => v==null ? '—' : v.toFixed(1)
  const fmtPct = (v:number|null) => v==null ? '—' : `${v.toFixed(1)}%`
  const semColorCadastros = C.amber
  const semColorAltas     = C.green

  // ── mini barra de progresso ──────────────────────────────
  const Bar = ({pct,color,bg}:{pct:number;color:string;bg:string}) => (
    <div style={{height:6,background:bg,borderRadius:4,overflow:'hidden',marginTop:6}}>
      <div style={{width:`${Math.min(pct,100)}%`,height:'100%',background:color,
        borderRadius:4,transition:'width .6s ease'}}/>
    </div>
  )

  // ── card de KPI grande ───────────────────────────────────
  const KpiCard = ({icon,label,value,unit,sub,color,bg,bar}:{
    icon:string;label:string;value:string;unit?:string;
    sub?:string;color:string;bg:string;bar?:number
  }) => (
    <div style={{background:C.surface,borderRadius:8,padding:'16px 18px',
      border:`1px solid ${C.border}`,display:'flex',flexDirection:'column',gap:4,
      boxShadow:'0 8px 24px rgba(28,25,23,.06)',minHeight:132}}>
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
        <div style={{width:34,height:34,borderRadius:8,background:bg,
          display:'flex',alignItems:'center',justifyContent:'center',fontSize:16}}>
          {icon}
        </div>
        <span style={{fontSize:11,fontWeight:600,color:C.muted,textTransform:'uppercase',
          letterSpacing:'.06em'}}>{label}</span>
      </div>
      <div style={{display:'flex',alignItems:'baseline',gap:5}}>
        <span style={{fontSize:30,fontWeight:800,color,lineHeight:1}}>{value}</span>
        {unit&&<span style={{fontSize:12,color:C.muted,fontWeight:500}}>{unit}</span>}
      </div>
      {sub&&<div style={{fontSize:11,color:C.muted,marginTop:1}}>{sub}</div>}
      {bar!=null&&<Bar pct={bar} color={color} bg={bg}/>}
    </div>
  )

  // ── gráfico de barras simples (evolução semanal) ─────────
  const semanal: any[] = k.evolucaoSemanal || []

  const MesBR = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  const fmtSemana = (iso:string) => {
    if(!iso) return ''
    const d = new Date(iso)
    return `${d.getDate()} ${MesBR[d.getMonth()]}`
  }
  const filaTotal = (s.aguardando||0) + (s.emContato||0)
  const pendencias = (s.triagemPendente||0) + (s.slotsPendentes||0) + (s.altasPendentes||0)
  const chartGrid = 'rgba(231,229,228,.75)'
  const chartText = C.sub
  const semanalChartData = {
    labels: semanal.map((sem:any)=>fmtSemana(sem.inicio_semana)),
    datasets: [
      {
        label: 'Novos cadastros',
        data: semanal.map((sem:any)=>sem.novos_cadastros||0),
        backgroundColor: semColorCadastros,
        borderRadius: 5,
        maxBarThickness: 24,
      },
      {
        label: 'Altas',
        data: semanal.map((sem:any)=>sem.altas||0),
        backgroundColor: semColorAltas,
        borderRadius: 5,
        maxBarThickness: 24,
      },
    ],
  }
  const barOptions:any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        align: 'start',
        labels: { color: chartText, boxWidth: 10, boxHeight: 10, usePointStyle: true, font: { size: 12 } },
      },
      tooltip: { backgroundColor: '#1c1917', titleColor: '#fff', bodyColor: '#fff', padding: 10 },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: chartText, font: { size: 11 } } },
      y: { beginAtZero: true, grid: { color: chartGrid }, ticks: { color: chartText, precision: 0 } },
    },
  }
  const statusLabels = ['Triagem','Aguardando','Em contato','Agendado','Atendimento']
  const statusValues = [s.triagemPendente||0,s.aguardando||0,s.emContato||0,s.agendados||0,s.emAtendimento||0]
  const statusColors = [C.amber,'#94a3b8',C.teal,C.purple,C.green]
  const statusSemDados = statusValues.every(v=>v===0)
  const statusChartData = {
    labels: statusSemDados ? ['Sem pacientes ativos'] : statusLabels,
    datasets: [{
      data: statusSemDados ? [1] : statusValues,
      backgroundColor: statusSemDados ? [C.border] : statusColors,
      borderColor: C.surface,
      borderWidth: 3,
      hoverOffset: 6,
    }],
  }
  const doughnutOptions:any = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '68%',
    plugins: {
      legend: {
        position: 'right',
        labels: { color: chartText, boxWidth: 10, boxHeight: 10, usePointStyle: true, font: { size: 12 } },
      },
      tooltip: { enabled: !statusSemDados, backgroundColor: '#1c1917', titleColor: '#fff', bodyColor: '#fff', padding: 10 },
    },
  }

  return (
    <div>
      {/* ── Cabeçalho ── */}
      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,
        padding:'20px 22px',marginBottom:18,boxShadow:'0 10px 30px rgba(28,25,23,.06)'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',
          gap:14,flexWrap:'wrap'}}>
          <div>
            <div style={{fontSize:11,fontWeight:800,color:C.green,textTransform:'uppercase',
              letterSpacing:'.08em',marginBottom:6}}>Painel operacional</div>
            <h1 style={{fontSize:24,fontWeight:850,color:C.text,marginBottom:5,
              letterSpacing:'-.02em'}}>Visão Geral</h1>
            <p style={{fontSize:13,color:C.muted}}>
              {new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',
                month:'long',year:'numeric'})}
            </p>
          </div>
          <div style={{display:'flex',gap:8,flexWrap:'wrap',justifyContent:'flex-end'}}>
            <button onClick={()=>nav('/supervisor/triagem')} style={{padding:'8px 12px',
              borderRadius:8,border:`1px solid ${C.border}`,background:C.bg,color:C.sub,
              fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>Triagem</button>
            <button onClick={()=>nav('/supervisor/agendamentos')} style={{padding:'8px 12px',
              borderRadius:8,border:`1px solid ${C.green}40`,background:C.greenL,color:C.greenD,
              fontSize:12,fontWeight:800,cursor:'pointer',fontFamily:'inherit'}}>Agenda de hoje</button>
          </div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',
          gap:10,marginTop:18}}>
          {[
            {l:'Fila ativa',v:filaTotal,c:C.teal,bg:C.tealL,s:'aguardando + em contato'},
            {l:'Consultas hoje',v:s.agendamentosHoje||0,c:C.green,bg:C.greenL,s:'agenda operacional'},
            {l:'Pendências',v:pendencias,c:pendencias?C.amber:C.green,bg:pendencias?C.amberL:C.greenL,s:'triagem, horários e altas'},
            {l:'Risco',v:s.comRisco||0,c:(s.comRisco||0)>0?C.red:C.green,bg:(s.comRisco||0)>0?C.redL:C.greenL,s:'prioridade máxima'},
          ].map(item=>(
            <div key={item.l} style={{background:item.bg,border:`1px solid ${item.c}25`,
              borderRadius:8,padding:'12px 14px'}}>
              <div style={{fontSize:22,fontWeight:900,color:item.c,lineHeight:1}}>{item.v}</div>
              <div style={{fontSize:12,fontWeight:800,color:C.text,marginTop:6}}>{item.l}</div>
              <div style={{fontSize:11,color:C.sub,marginTop:2}}>{item.s}</div>
            </div>
          ))}
        </div>
        {(s.muitoUrgentes>0||s.comRisco>0)&&(
          <div style={{display:'flex',gap:8,marginTop:12,flexWrap:'wrap'}}>
            {s.muitoUrgentes>0&&(
              <div style={{background:C.redL,border:`1px solid ${C.red}40`,
                borderRadius:8,padding:'8px 12px',fontSize:12,fontWeight:800,color:C.red,
                display:'flex',alignItems:'center',gap:6}}>
                🚨 {s.muitoUrgentes} muito urgente(s)
              </div>
            )}
            {s.comRisco>0&&(
              <div style={{background:C.redL,border:`1px solid ${C.red}40`,
                borderRadius:8,padding:'8px 12px',fontSize:12,fontWeight:800,color:C.red,
                display:'flex',alignItems:'center',gap:6}}>
                ⚠️ {s.comRisco} com risco
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Fila em tempo real ── */}
      <div style={{display:'grid',
        gridTemplateColumns:'repeat(auto-fit,minmax(110px,1fr))',
        gap:10,marginBottom:20}}>
        {[
          {v:s.triagemPendente, l:'Triagem',    c:C.amber,  bg:C.amberL, alert:s.triagemPendente>0},
          {v:s.aguardando,      l:'Aguardando', c:C.sub,    bg:C.bg},
          {v:s.emContato,       l:'Em contato', c:C.teal,   bg:C.tealL},
          {v:s.agendados,       l:'Agendados',  c:C.purple, bg:C.purpleL},
          {v:s.emAtendimento,   l:'Atendendo',  c:C.green,  bg:C.greenL},
          {v:s.agendamentosHoje,l:'Hoje',       c:C.greenD, bg:C.greenL},
          {v:s.slotsPendentes,  l:'Horários',   c:C.amber,  bg:C.amberL, alert:s.slotsPendentes>0},
          {v:s.altasPendentes||0,l:'Altas pend.',c:C.purple,bg:C.purpleL,alert:(s.altasPendentes||0)>0},
        ].map(({v,l,c,bg,alert})=>(
          <div key={l} style={{background:C.surface,borderRadius:8,padding:'13px 14px',
            border:`1px solid ${alert?c+'60':C.border}`,boxShadow:'0 6px 18px rgba(28,25,23,.045)',
            position:'relative',overflow:'hidden'}}>
            <div style={{position:'absolute',left:0,top:0,bottom:0,width:3,background:c}}/>
            <div style={{fontSize:22,fontWeight:900,color:c,lineHeight:1,marginBottom:4}}>{v||0}</div>
            <div style={{fontSize:10,fontWeight:600,color:C.muted,textTransform:'uppercase',
              letterSpacing:'.05em'}}>{l}</div>
          </div>
        ))}
      </div>

      {/* ── KPIs de desempenho ── */}
      <div style={{fontSize:10,fontWeight:700,color:C.muted,textTransform:'uppercase',
        letterSpacing:'.1em',marginBottom:10,display:'flex',alignItems:'center',gap:8}}>
        <span>Indicadores de desempenho</span>
        <div style={{flex:1,height:1,background:C.border}}/>
        <span style={{fontWeight:400,textTransform:'none',letterSpacing:'normal',
          fontSize:10,color:C.muted}}>Fonte: dados históricos do sistema</span>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',
        gap:12,marginBottom:20}}>
        <KpiCard
          icon="⏱"
          label="Tempo médio de espera"
          value={fmt1(k.tempoEspera?.mediaDias)}
          unit="dias"
          sub={k.tempoEspera?.mediaDias==null
            ? 'Sem sessões realizadas ainda'
            : `Mín: ${k.tempoEspera.minDias}d · Máx: ${k.tempoEspera.maxDias}d`}
          color={
            k.tempoEspera?.mediaDias==null ? C.muted :
            k.tempoEspera.mediaDias <= 14 ? C.green :
            k.tempoEspera.mediaDias <= 30 ? C.amber : C.red
          }
          bg={
            k.tempoEspera?.mediaDias==null ? C.bg :
            k.tempoEspera.mediaDias <= 14 ? C.greenL :
            k.tempoEspera.mediaDias <= 30 ? C.amberL : C.redL
          }
        />
        <KpiCard
          icon="✅"
          label="Taxa de comparecimento"
          value={fmtPct(k.comparecimento?.taxa)}
          sub={k.comparecimento?.taxa==null
            ? 'Sem agendamentos nos últimos 30 dias'
            : `${k.comparecimento.realizados} realizadas · ${k.comparecimento.faltou} faltas`}
          color={
            k.comparecimento?.taxa==null ? C.muted :
            k.comparecimento.taxa >= 80 ? C.green :
            k.comparecimento.taxa >= 60 ? C.amber : C.red
          }
          bg={
            k.comparecimento?.taxa==null ? C.bg :
            k.comparecimento.taxa >= 80 ? C.greenL :
            k.comparecimento.taxa >= 60 ? C.amberL : C.redL
          }
          bar={k.comparecimento?.taxa ?? 0}
        />
        <KpiCard
          icon="🚪"
          label="Taxa de desistência"
          value={fmtPct(k.desistencia?.taxa)}
          sub={k.desistencia?.taxa==null
            ? 'Sem dados suficientes'
            : `${k.desistencia.total} de ${k.desistencia.totalCadastros} pacientes`}
          color={
            k.desistencia?.taxa==null ? C.muted :
            k.desistencia.taxa <= 10 ? C.green :
            k.desistencia.taxa <= 25 ? C.amber : C.red
          }
          bg={
            k.desistencia?.taxa==null ? C.bg :
            k.desistencia.taxa <= 10 ? C.greenL :
            k.desistencia.taxa <= 25 ? C.amberL : C.redL
          }
          bar={k.desistencia?.taxa ?? 0}
        />
        <KpiCard
          icon="🎓"
          label="Altas no mês"
          value={String(k.altasMes ?? 0)}
          sub={`Carga média: ${fmt1(k.cargaMedia)} pac/estagiário`}
          color={C.purple}
          bg={C.purpleL}
        />
      </div>

      {/* ── Evolução semanal ── */}
      {semanal.length>0&&(
        <>
          <div style={{fontSize:10,fontWeight:700,color:C.muted,textTransform:'uppercase',
            letterSpacing:'.1em',marginBottom:10,display:'flex',alignItems:'center',gap:8}}>
            <span>Evolução semanal — últimas 8 semanas</span>
            <div style={{flex:1,height:1,background:C.border}}/>
          </div>
          <div style={{background:C.surface,borderRadius:8,padding:'20px',
            border:`1px solid ${C.border}`,marginBottom:20,boxShadow:'0 8px 24px rgba(28,25,23,.05)'}}>
            <div style={{height:220}}>
              <ChartBar data={semanalChartData} options={barOptions}/>
            </div>
          </div>
        </>
      )}

      {/* ── Distribuição por status ── */}
      <div style={{background:C.surface,borderRadius:8,padding:'16px 20px',
        border:`1px solid ${C.border}`,boxShadow:'0 8px 24px rgba(28,25,23,.05)'}}>
        <div style={{display:'flex',justifyContent:'space-between',gap:16,alignItems:'center',flexWrap:'wrap'}}>
          <div style={{minWidth:220,flex:1}}>
            <div style={{fontSize:12,fontWeight:800,color:C.text,marginBottom:4}}>
              Distribuição atual por status
            </div>
            <div style={{fontSize:12,color:C.muted,lineHeight:1.6}}>
              Visualize rapidamente onde os pacientes estão no fluxo de atendimento.
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))',gap:8,marginTop:14}}>
              {statusLabels.map((label,i)=>(
                <div key={label} style={{fontSize:12,color:C.sub,display:'flex',alignItems:'center',gap:7}}>
                  <span style={{width:8,height:8,borderRadius:'50%',background:statusColors[i],flexShrink:0}}/>
                  {label}: <strong style={{color:C.text}}>{statusValues[i]}</strong>
                </div>
              ))}
            </div>
          </div>
          <div style={{height:220,minWidth:260,flex:'0 1 360px'}}>
            <Doughnut data={statusChartData} options={doughnutOptions}/>
          </div>
        </div>
      </div>
    </div>
  )
}

function Triagem() {
  const [lista,setLista] = useState<any[]>([])
  const [sel,setSel]     = useState<any>(null)
  const [obs,setObs]     = useState('')
  const [motivo,setMot]  = useState('')
  const [load,setLoad]   = useState(true)
  const toast = useToast()
  const location = useLocation()
  useEffect(()=>{
    setLoad(true)
    api.adminTriagem().then(d=>{setLista(d);setLoad(false)})
  },[location.pathname])
  const aprovar = async(id:number)=>{
    await api.adminAprovarTriagem(id,obs); setLista(l=>l.filter(p=>p.id!==id)); setSel(null)
    toast('✅ Triagem aprovada — entrou na fila!')
  }
  const rejeitar = async(id:number)=>{
    if(!motivo){toast('Informe o motivo');return}
    await api.adminRejeitarTriagem(id,motivo); setLista(l=>l.filter(p=>p.id!==id)); setSel(null)
    toast('Triagem rejeitada')
  }
  if(load) return <Spin/>
  return (
    <div>
      <div style={{marginBottom:24}}>
        <h1 style={{fontSize:22,fontWeight:700,color:C.text,marginBottom:4}}>Triagem de Pacientes</h1>
        <p style={{fontSize:13,color:C.muted}}>{lista.length} paciente(s) aguardando avaliação clínica</p>
      </div>
      {!lista.length&&<Card><div style={{padding:48,textAlign:'center'}}><div style={{fontSize:32,marginBottom:12}}>✅</div><p style={{color:C.muted}}>Nenhuma triagem pendente</p></div></Card>}
      <div style={{display:'flex',flexDirection:'column',gap:12}}>
        {lista.map(p=>(
          <Card key={p.id} style={{borderLeft:`4px solid ${p.risco_suicidio?C.red:U_COR[p.urgencia]||C.border}`}}>
            <div style={{padding:'16px 20px'}}>
              <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}>
                <div style={{flex:1,minWidth:200}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6,flexWrap:'wrap'}}>
                    <span style={{fontSize:15,fontWeight:700,color:C.text}}>{p.nome}</span>
                    {p.risco_suicidio===1&&<Chip label="⚠ RISCO" color={C.red} bg={C.redL} sm/>}
                    {uChip(p.urgencia)}{sChip(p.status)}
                  </div>
                  <div style={{fontSize:12,color:C.muted,marginBottom:8}}>{fmtCPF(p.cpf)} · {p.telefone} · {fmtData(p.timestamp_cadastro)}</div>
                  <div style={{background:C.bg,borderRadius:8,padding:'10px 14px',fontSize:13,color:C.sub,lineHeight:1.6,borderLeft:`3px solid ${C.border}`}}>
                    {p.motivo_busca?.slice(0,180)}{(p.motivo_busca?.length||0)>180?'…':''}
                  </div>
                </div>
                <Btn size="sm" variant="outline" onClick={()=>{setSel(p);setObs('');setMot('')}}>Ver detalhes</Btn>
              </div>
            </div>
          </Card>
        ))}
      </div>
      {sel&&(
        <Modal title={`Triagem — ${sel.nome}`} subtitle={`${fmtCPF(sel.cpf)} · ${sel.telefone}`} onClose={()=>setSel(null)} width={660}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:16}}>
            {[['Idade',sel.idade?`${sel.idade} anos`:'—'],['Gênero',sel.genero||'—'],['Escolaridade',sel.escolaridade||'—'],
              ['Renda',sel.renda_familiar||'—'],['Urgência',U_LBL[sel.urgencia]||'—'],['Intensidade',sel.intensidade_sintomas||'—'],
            ].map(([k,v])=><InfoBox key={k} k={k} v={v}/>)}
          </div>
          <div style={{marginBottom:14}}>
            <div style={{fontSize:12,fontWeight:600,color:C.sub,marginBottom:6}}>Motivo da busca</div>
            <div style={{background:C.bg,borderRadius:8,padding:'12px 14px',fontSize:13,color:C.sub,lineHeight:1.6,borderLeft:`3px solid ${C.blueMid}`}}>{sel.motivo_busca}</div>
          </div>
          {sel.impacto_vida&&(
            <div style={{marginBottom:14}}>
              <div style={{fontSize:12,fontWeight:600,color:C.sub,marginBottom:6}}>Impacto na vida</div>
              <div style={{fontSize:13,color:C.sub,lineHeight:1.6}}>{sel.impacto_vida}</div>
            </div>
          )}
          <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:16}}>
            {sel.risco_suicidio===1&&<Chip label="⚠ Risco suicídio" color={C.red} bg={C.redL}/>}
            {sel.ja_fez_terapia===1&&<Chip label="Já fez terapia" color={C.sub} bg={C.bg}/>}
            {sel.uso_medicamento===1&&<Chip label="Usa medicação" color={C.amber} bg={C.amberL}/>}
            {sel.medicamento_psiquiatra===1&&<Chip label="Psiquiatra" color={C.purple} bg={C.purpleL}/>}
            {sel.historico_internacao===1&&<Chip label="Internação prévia" color={C.red} bg={C.redL}/>}
          </div>
          <div style={{display:'grid',gap:10,marginBottom:20}}>
            <Txa label="Observações internas (opcional)" rows={2} value={obs} onChange={e=>setObs(e.target.value)} placeholder="Anotações sobre esta triagem..."/>
            <Txa label="Motivo da rejeição (preencha apenas se for rejeitar)" rows={2} value={motivo} onChange={e=>setMot(e.target.value)} placeholder="Descreva o motivo..."/>
          </div>
          <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
            <Btn variant="ghost" onClick={()=>setSel(null)}>Fechar</Btn>
            <Btn variant="danger" icon="✖" onClick={()=>rejeitar(sel.id)}>Rejeitar triagem</Btn>
            <Btn variant="success" icon="✔" onClick={()=>aprovar(sel.id)}>Aprovar — entrar na fila</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}

function FilaEspera() {
  const {user:u} = useAuth()
  if(u?.perfil==='supervisor') return (
    <div style={{padding:64,textAlign:'center',color:C.muted}}>
      <div style={{fontSize:40,marginBottom:12}}>🔒</div>
      <p style={{fontSize:14,fontWeight:600,color:C.text}}>Acesso restrito ao Coordenador</p>
      <p style={{fontSize:13,marginTop:8}}>A fila de espera é gerenciada pelo coordenador e pela recepção.</p>
    </div>
  )
  const [fila,setFila]       = useState<any[]>([])
  const [estagiarios,setEst] = useState<any[]>([])
  const [modalDisp,setMD]    = useState<any>(null)
  const [salas,setSalas]     = useState<string[]>(DEFAULT_SALAS)
  const toast = useToast()
  const location = useLocation()
  const pendenciasAgendamento = (p:any) => {
    const pendencias:string[] = []
    if ((p.total_contatos||0) < 1) pendencias.push('Registrar contato')
    if (p.status !== 'em_contato') pendencias.push('Contato efetivo')
    if (p.tem_agendamento_ativo===1) pendencias.push('Agendamento ativo')
    return pendencias
  }
  const podeAgendar = (p:any) =>
    p.status === 'em_contato' && (p.total_contatos||0) > 0 && p.tem_agendamento_ativo!==1
  useEffect(()=>{
    api.adminFila().then(setFila)
    api.adminEstagiarios().then(setEst)
    api.adminGetConfig().then(cfg=>{
      const configuradas = parseSalasConfig(cfg.salas_disponiveis)
      if (configuradas.length) setSalas(configuradas)
    }).catch(()=>{})
  },[location.pathname])
  const contatar = async(p:any,tipo:string)=>{
    await api.adminNotificacao(p.id,{tipo,assunto:'Contato para agendamento'})
    await api.adminStatus(p.id,'em_contato')
    setFila(f=>f.map(x=>x.id===p.id?{...x,status:'em_contato',total_contatos:(x.total_contatos||0)+1,ultimo_contato:new Date().toISOString()}:x))
    toast(`✅ ${tipo==='ligacao'?'Ligação':'WhatsApp'} registrado`)
  }
  return (
    <div>
      <div style={{marginBottom:24}}>
        <h1 style={{fontSize:22,fontWeight:700,color:C.text,marginBottom:4}}>Fila de Espera</h1>
        <p style={{fontSize:13,color:C.muted}}>{fila.length} paciente(s) — risco → urgência → data</p>
      </div>
      <Card style={{padding:16,borderRadius:8}}>
        {!fila.length && (
          <div style={{padding:48,textAlign:'center'}}>
            <div style={{fontSize:32,marginBottom:12}}>✅</div>
            <p style={{color:C.muted}}>Fila vazia</p>
          </div>
        )}
        {fila.map((p,i)=>(
          <div key={p.id} style={{display:'flex',alignItems:'center',gap:14,padding:'14px 20px',
            borderBottom:i<fila.length-1?`1px solid ${C.border}`:'none',
            background:p.risco_suicidio?C.redL:i===0?'#fefce8':C.surface,flexWrap:'wrap'}}>
            <div style={{width:32,height:32,borderRadius:'50%',flexShrink:0,
              background:(U_COR[p.urgencia]||C.muted)+'20',color:U_COR[p.urgencia]||C.muted,
              display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:800}}>{i+1}</div>
            <div style={{flex:1,minWidth:160}}>
              <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:3,flexWrap:'wrap'}}>
                <span style={{fontWeight:700,fontSize:14,color:C.text}}>{p.nome}</span>
                {p.risco_suicidio===1&&<Chip label="⚠ RISCO" color={C.red} bg={C.redL} sm/>}
                {p.tem_agendamento_ativo===1&&<Chip label="Tem agend." color={C.purple} bg={C.purpleL} sm/>}
                {uChip(p.urgencia)}{sChip(p.status)}
              </div>
              <div style={{fontSize:12,color:C.muted}}>{p.telefone} · {p.dias_espera}d na fila{p.ultimo_contato?` · Últ. contato: ${fmtData(p.ultimo_contato)}`:' · Sem contato'} · #{p.posicao_fila}</div>
            </div>
            <div style={{fontSize:11,color:podeAgendar(p)?C.green:C.amber,marginTop:4,fontWeight:600,flexBasis:'100%',paddingLeft:46}}>
              Posicao #{p.posicao_fila||i+1} Â· {podeAgendar(p)
                ? 'Pronto para agendar'
                : `Pendente: ${pendenciasAgendamento(p).join(', ')}`}
            </div>
            <div onClickCapture={(e)=>{
              const btn = (e.target as HTMLElement).closest('button')
              if (btn?.textContent?.includes('Agendar') && !podeAgendar(p)) {
                e.stopPropagation()
                toast(`Pendencias para agendar: ${pendenciasAgendamento(p).join(', ')}`)
              }
            }} style={{display:'flex',gap:7,flexShrink:0,flexWrap:'wrap'}}>
              {p.status==='aguardando'&&<>
                <Btn size="sm" variant="ghost" icon="📞" onClick={()=>contatar(p,'ligacao')}>Ligar</Btn>
                <Btn size="sm" variant="ghost" icon="💬" onClick={()=>contatar(p,'whatsapp')}>WhatsApp</Btn>
              </>}
              <Btn size="sm" variant="primary" icon="📅" onClick={async()=>{const d=await api.adminDisponibilidades(p.id);setMD({paciente:p,...d})}}>Agendar</Btn>
            </div>
          </div>
        ))}
      </Card>
      {modalDisp&&(
        <ModalAgendar paciente={modalDisp.paciente} slots={modalDisp.data||[]} dispPaciente={modalDisp.disponibilidade_paciente||{}}
          estagiarios={estagiarios} salas={salas} onClose={()=>setMD(null)}
          onSave={async(body:any)=>{await api.adminCriarAg(body);setFila(f=>f.filter(p=>p.id!==body.paciente_id));setMD(null);toast('✅ Consulta agendada e aguardando confirmação.')}}/>
      )}
    </div>
  )
}

function ModalAgendar({paciente,slots,dispPaciente,estagiarios,salas=DEFAULT_SALAS,onClose,onSave}:any) {
  const [slotSel,setSlot] = useState<any>(null)
  const [dt,setDt]   = useState('')
  const [sala,setSala] = useState('')
  const [mod,setMod] = useState('presencial')
  const cruzados = slots.filter((s:any)=>Object.keys(dispPaciente).includes(s.dia_semana))
  const opcoesSala = salasPresenciais(salas)
  return (
    <Modal title={`Agendar — ${paciente.nome}`} subtitle={`${paciente.cpf} · ${paciente.telefone}`} onClose={onClose} width={660}>
      {cruzados.length>0?(
        <div style={{marginBottom:18}}>
          <div style={{fontSize:12,fontWeight:600,color:C.sub,marginBottom:10}}>Horários que cruzam com a disponibilidade do paciente</div>
          <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
            {cruzados.map((s:any)=>(
              <button key={s.slot_id} onClick={()=>setSlot(s)} style={{
                padding:'8px 14px',borderRadius:9,cursor:'pointer',fontSize:12,fontWeight:600,fontFamily:'inherit',
                border:`2px solid ${slotSel?.slot_id===s.slot_id?C.blue:C.border}`,
                background:slotSel?.slot_id===s.slot_id?C.blueL:C.surface,
                color:slotSel?.slot_id===s.slot_id?C.blue:C.sub,transition:'all .15s',
              }}><strong>{DIA_LBL[s.dia_semana]}</strong> · {s.hora_inicio}–{s.hora_fim} · {s.estagiario_nome}</button>
            ))}
          </div>
        </div>
      ):(
        <div style={{background:C.amberL,border:`1px solid ${C.amber}`,borderRadius:9,padding:'10px 14px',fontSize:13,color:C.amber,marginBottom:16}}>
          ⚠ Nenhum horário cruza com a disponibilidade. Defina manualmente.
        </div>
      )}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:20}}>
        <div style={{gridColumn:'1/-1'}}><Inp label="Data e hora *" type="datetime-local" value={dt} onChange={e=>setDt(e.target.value)}/></div>
        <Sel label="Modalidade" value={mod} onChange={e=>{setMod(e.target.value); if(e.target.value==='online') setSala('')}}><option value="presencial">Presencial</option><option value="online">Online</option></Sel>
        {mod==='presencial'?(
          <Sel label="Sala" value={sala} onChange={e=>setSala(e.target.value)}>
            <option value="">Selecione a sala</option>
            {opcoesSala.map(s=><option key={s} value={s}>{s}</option>)}
          </Sel>
        ):(
          <div style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,padding:'10px 12px',fontSize:12,color:C.muted}}>
            Atendimento online não usa sala física.
          </div>
        )}
      </div>
      <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn full variant="primary" icon="📅" onClick={()=>{
          if(!dt){alert('Informe data e hora');return}
          if(mod==='presencial'&&!sala){alert('Selecione uma sala cadastrada');return}
          const est=slotSel?.estagiario_id||estagiarios[0]?.id
          onSave({paciente_id:paciente.id,estagiario_id:est,slot_id:slotSel?.slot_id||null,data_hora_inicio:dt,modalidade:mod,sala})
        }}>Confirmar agendamento</Btn>
      </div>
    </Modal>
  )
}

function Pacientes() {
  const {user} = useAuth()
  const [lista,setLista] = useState<any[]>([])
  const [q,setQ]   = useState('')
  const [sel,setSel] = useState<any>(null)
  const [retorno,setRetorno] = useState<any>(null)
  const [obsRetorno,setObsRetorno] = useState('')
  const [load,setL]  = useState(true)
  const toast = useToast()
  useEffect(()=>{api.adminPacientes().then(d=>{setLista(d);setL(false)})},[])
  const f = lista.filter(p=>!q||p.nome?.toLowerCase().includes(q.toLowerCase())||p.cpf?.includes(q.replace(/\D/g,'')))
  const podeRetornar = (p:any) => user?.perfil === 'coordenador' && p.status === 'desistencia'
  const retornarFila = async()=>{
    if(!retorno) return
    try {
      await api.adminRetornarFila(retorno.id, obsRetorno)
      const atualizado = (p:any) => p.id===retorno.id
        ? {...p,status:'aguardando',timestamp_cadastro:new Date().toISOString(),dias_espera:0,estagiario_id:null,estagiario_nome:null}
        : p
      setLista(l=>l.map(atualizado))
      setSel((s:any)=>s&&s.id===retorno.id?atualizado(s):s)
      setRetorno(null); setObsRetorno('')
      toast('Paciente retornou para a fila.')
    } catch(e:any) {
      toast(e.response?.data?.error||e.message||'Erro ao retornar paciente para fila')
    }
  }
  if(load) return <Spin/>
  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',marginBottom:20,flexWrap:'wrap',gap:12}}>
        <div>
          <h1 style={{fontSize:22,fontWeight:700,color:C.text,marginBottom:4}}>Pacientes</h1>
          <p style={{fontSize:13,color:C.muted}}>{f.length} registro(s)</p>
        </div>
        <Inp placeholder="🔍  Buscar por nome ou CPF..." value={q} onChange={e=>setQ(e.target.value)} style={{width:280}}/>
      </div>
      <Card>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',minWidth:580}}>
            <thead>
              <tr style={{borderBottom:`2px solid ${C.border}`}}>
                {['Paciente','Status','Urgência','Cadastro',''].map(h=>(
                  <th key={h} style={{padding:'12px 16px',textAlign:'left',fontSize:11,fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:'.05em'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {f.map(p=>(
                <tr key={p.id} style={{borderBottom:`1px solid ${C.border}`}}>
                  <td style={{padding:'12px 16px'}}>
                    <div style={{fontWeight:700,fontSize:14,color:C.text,marginBottom:2}}>{p.nome}</div>
                    <div style={{fontSize:12,color:C.muted}}>{fmtCPF(p.cpf)} · {p.telefone}</div>
                    {p.risco_suicidio===1&&<Chip label="⚠ RISCO" color={C.red} bg={C.redL} sm/>}
                  </td>
                  <td style={{padding:'12px 16px'}}>{sChip(p.status)}</td>
                  <td style={{padding:'12px 16px'}}>{uChip(p.urgencia)}</td>
                  <td style={{padding:'12px 16px',fontSize:12,color:C.muted,whiteSpace:'nowrap'}}>{fmtData(p.timestamp_cadastro)}</td>
                  <td style={{padding:'12px 16px'}}>
                    <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                      {podeRetornar(p)&&(
                        <Btn size="sm" variant="success" onClick={()=>{setRetorno(p);setObsRetorno('')}}>Retornar</Btn>
                      )}
                      <Btn size="sm" variant="ghost" onClick={async()=>{const d=await api.adminPaciente(p.id);setSel(d)}}>Ver</Btn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!f.length&&<div style={{padding:48,textAlign:'center',color:C.muted}}>Nenhum paciente encontrado</div>}
        </div>
      </Card>
      {sel&&(
        <Modal title={sel.nome} subtitle={`${fmtCPF(sel.cpf)} · ${sel.email||'—'}`} onClose={()=>setSel(null)} width={700}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
            {[['Telefone',sel.telefone],['Status',S_LBL[sel.status]],['Urgência',U_LBL[sel.urgencia]],['Estagiário',sel.estagiario_nome||'—']].map(([k,v])=><InfoBox key={k} k={k} v={v}/>)}
          </div>
          <div style={{marginBottom:14}}>
            <div style={{fontSize:12,fontWeight:600,color:C.sub,marginBottom:6}}>Motivo da busca</div>
            <div style={{background:C.bg,borderRadius:8,padding:'12px 14px',fontSize:13,color:C.sub,lineHeight:1.6}}>{sel.motivo_busca}</div>
          </div>
          {sel.agendamentos?.length>0&&(
            <div>
              <div style={{fontSize:12,fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:'.06em',marginBottom:10}}>Agendamentos</div>
              {sel.agendamentos.slice(0,5).map((a:any)=>(
                <div key={a.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 12px',background:C.bg,borderRadius:8,marginBottom:6,border:`1px solid ${C.border}`}}>
                  <span style={{fontSize:13,color:C.sub}}>{fmtDT(a.data_hora_inicio)}</span>
                  <span style={{fontSize:12,color:C.muted}}>{a.estagiario_nome}</span>
                </div>
              ))}
            </div>
          )}
          {podeRetornar(sel)&&(
            <div style={{display:'flex',justifyContent:'flex-end',marginTop:18}}>
              <Btn variant="success" onClick={()=>{setRetorno(sel);setObsRetorno('');setSel(null)}}>Retornar para fila</Btn>
            </div>
          )}
        </Modal>
      )}
      {retorno&&(
        <Modal title="Retornar paciente para fila" subtitle={retorno.nome} onClose={()=>setRetorno(null)} width={520}>
          <div style={{background:C.amberL,border:`1px solid ${C.amber}40`,borderRadius:9,padding:'10px 14px',fontSize:13,color:C.amber,marginBottom:16}}>
            O paciente voltara para a fila de espera com a data atual, perdendo a posicao anterior.
          </div>
          <Txa label="Observacao (opcional)" rows={3} value={obsRetorno} onChange={e=>setObsRetorno(e.target.value)} placeholder="Ex: Paciente solicitou retorno ao atendimento..."/>
          <div style={{display:'flex',gap:10,marginTop:20,flexWrap:'wrap'}}>
            <Btn variant="ghost" onClick={()=>setRetorno(null)}>Cancelar</Btn>
            <Btn full variant="success" onClick={retornarFila}>Confirmar retorno</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}

function Agendamentos() {
  const [ags,setAgs] = useState<any[]>([])
  const [range,setRange] = useState<{start:string;end:string}|null>(null)
  const [sel,setSel] = useState<any>(null)
  const [falta,setFalta] = useState<any>(null)
  const [motivoFalta,setMotivoFalta] = useState('')
  const [cancelar,setCancelar] = useState<any>(null)
  const [motivoCancelamento,setMotivoCancelamento] = useState('')
  const [load,setLoad] = useState(false)
  const toast = useToast()
  useEffect(()=>{
    if(!range) return
    setLoad(true)
    api.adminAgendamentos({inicio:range.start,fim:range.end})
      .then(setAgs)
      .finally(()=>setLoad(false))
  },[range?.start,range?.end])
  const stCor:any = {confirmado:C.green,pendente:C.amber,cancelado_admin:C.red,cancelado_paciente:C.red,realizado:C.blue,faltou:C.purple}
  const stLbl:any = {confirmado:'Confirmado',pendente:'Aguardando confirmacao',cancelado_admin:'Cancelado pela equipe',cancelado_paciente:'Cancelado pelo paciente',realizado:'Realizado',faltou:'Faltou'}
  const agAtivo = (s:string) => s==='pendente'||s==='confirmado'
  const confirmarAgendamento = async(ag:any)=>{
    try {
      const data = await api.adminConfirmarAg(ag.id)
      setAgs(a=>a.map(x=>x.id===ag.id?{...x,status:data.status||'confirmado'}:x))
      setSel((s:any)=>s?.id===ag.id?{...s,status:data.status||'confirmado'}:s)
      toast(data.message || 'Consulta confirmada.')
    } catch(e:any) {
      toast('Erro: '+(e.response?.data?.error||e.message))
    }
  }
  const cancelarAgendamento = async()=>{
    if(!cancelar) return
    if(!motivoCancelamento.trim()){toast('Informe o motivo do cancelamento.');return}
    try {
      const data = await api.adminCancelarAg(cancelar.id,motivoCancelamento)
      setAgs(a=>a.map(x=>x.id===cancelar.id?{...x,status:data.status||'cancelado_admin',notas_admin:`${x.notas_admin?`${x.notas_admin} | `:''}Cancelamento: ${motivoCancelamento}`}:x))
      setSel((s:any)=>s?.id===cancelar.id?{...s,status:data.status||'cancelado_admin'}:s)
      setCancelar(null); setMotivoCancelamento('')
      toast(data.message || 'Consulta cancelada.')
    } catch(e:any) {
      toast('Erro: '+(e.response?.data?.error||e.message))
    }
  }
  const registrarFalta = async()=>{
    if(!falta) return
    try {
      const data = await api.adminRegistrarFalta(falta.id,motivoFalta || 'Paciente ausente no horário agendado')
      setAgs(a=>a.map(x=>x.id===falta.id?{...x,status:'faltou',total_faltas:data.total_faltas,limite_faltas:data.limite_faltas}:x))
      setSel((s:any)=>s?.id===falta.id?{...s,status:'faltou',total_faltas:data.total_faltas,limite_faltas:data.limite_faltas}:s)
      setFalta(null); setMotivoFalta('')
      toast(data.message || 'Falta registrada.')
    } catch(e:any) {
      toast('❌ '+(e.response?.data?.error||e.message))
    }
  }
  return (
    <div>
      <div style={{display:'flex',alignItems:'flex-end',gap:16,marginBottom:20,flexWrap:'wrap',justifyContent:'space-between'}}>
        <div>
          <h1 style={{fontSize:22,fontWeight:800,color:C.text,marginBottom:4}}>Agenda</h1>
          <p style={{fontSize:13,color:C.muted}}>{ags.length} consulta(s) no periodo visivel</p>
        </div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          {['pendente','confirmado','realizado','faltou','cancelado_admin','cancelado_paciente'].map(s=>(
            <Chip key={s} label={stLbl[s]} color={stCor[s]} bg={stCor[s]+'15'} sm/>
          ))}
        </div>
      </div>
      <Card style={{padding:'16px 20px'}}>
        <AgendaCalendar
          items={ags}
          loading={load}
          accent={C.amber}
          onRangeChange={setRange}
          onEventClick={setSel}
        />
      </Card>
      {sel&&(
        <Modal title={sel.paciente_nome} subtitle={fmtDT(sel.data_hora_inicio)} onClose={()=>setSel(null)} width={560}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
            <InfoBox k="Status" v={stLbl[sel.status]||sel.status}/>
            <InfoBox k="Estagiario" v={sel.estagiario_nome||'-'}/>
            <InfoBox k="Modalidade" v={sel.modalidade||'-'}/>
            <InfoBox k="Sala" v={sel.sala||'-'}/>
            <InfoBox k="Sessao" v={sel.sessao_numero?`Sessao ${sel.sessao_numero}`:'-'}/>
            <InfoBox k="Horario" v={`${fmtHora(sel.data_hora_inicio)} - ${sel.data_hora_fim ? fmtHora(sel.data_hora_fim) : '--'}`}/>
            <InfoBox k="Faltas" v={`${sel.total_faltas||0}/${sel.limite_faltas||3}`}/>
          </div>
          {sel.notas_admin&&(
            <div style={{background:C.bg,borderRadius:8,padding:'10px 12px',fontSize:13,color:C.sub,marginBottom:14}}>
              {sel.notas_admin}
            </div>
          )}
          <div style={{display:'flex',justifyContent:'flex-end',gap:8,flexWrap:'wrap'}}>
            {sel.status==='pendente'&&(
              <Btn variant="success" onClick={()=>confirmarAgendamento(sel)}>Confirmar consulta</Btn>
            )}
            {agAtivo(sel.status)&&(
              <Btn variant="warn" onClick={()=>{setFalta(sel);setMotivoFalta('');setSel(null)}}>Registrar falta</Btn>
            )}
            {agAtivo(sel.status)&&(
              <Btn variant="danger" onClick={()=>{setCancelar(sel);setMotivoCancelamento('');setSel(null)}}>Cancelar consulta</Btn>
            )}
            <Btn variant="ghost" onClick={()=>setSel(null)}>Fechar</Btn>
          </div>
        </Modal>
      )}
      {cancelar&&(
        <Modal title="Cancelar consulta" subtitle={`${cancelar.paciente_nome} - ${fmtHora(cancelar.data_hora_inicio)}`} onClose={()=>setCancelar(null)} width={520}>
          <div style={{background:C.redL,border:`1px solid ${C.red}40`,borderRadius:9,padding:'10px 14px',fontSize:13,color:C.red,marginBottom:16}}>
            O cancelamento encerra este agendamento. Se for o unico agendamento ativo de um paciente ainda em "agendado", ele volta para a fila.
          </div>
          <Txa label="Motivo do cancelamento" rows={3} value={motivoCancelamento} onChange={e=>setMotivoCancelamento(e.target.value)} placeholder="Ex: paciente solicitou remarcacao..."/>
          <div style={{display:'flex',gap:10,marginTop:20,flexWrap:'wrap'}}>
            <Btn variant="ghost" onClick={()=>setCancelar(null)}>Voltar</Btn>
            <Btn full variant="danger" onClick={cancelarAgendamento}>Confirmar cancelamento</Btn>
          </div>
        </Modal>
      )}
      {falta&&(
        <Modal title="Registrar ausência" subtitle={`${falta.paciente_nome} — ${fmtHora(falta.data_hora_inicio)}`} onClose={()=>setFalta(null)} width={520}>
          <div style={{background:C.amberL,border:`1px solid ${C.amber}40`,borderRadius:9,padding:'10px 14px',fontSize:13,color:C.amber,marginBottom:16}}>
            Ao atingir o limite de faltas configurado, o paciente será desligado automaticamente do programa de atendimentos.
          </div>
          <InfoBox k="Controle de faltas" v={`${falta.total_faltas||0}/${falta.limite_faltas||3} registradas antes desta ausência`}/>
          <div style={{height:12}}/>
          <Txa label="Observação da ausência" rows={3} value={motivoFalta} onChange={e=>setMotivoFalta(e.target.value)} placeholder="Ex: paciente não compareceu e não justificou..."/>
          <div style={{display:'flex',gap:10,marginTop:20,flexWrap:'wrap'}}>
            <Btn variant="ghost" onClick={()=>setFalta(null)}>Voltar</Btn>
            <Btn full variant="warn" onClick={registrarFalta}>Confirmar falta</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}

function Estagiarios() {
  const [lista,setLista]      = useState<any[]>([])
  const [sel,setSel]          = useState<any>(null)
  const [pacientes,setPacs]   = useState<any[]>([])
  const [slots,setSlots]      = useState<any[]>([])
  const [aba,setAba]          = useState<'pacientes'|'horarios'>('pacientes')
  const [editSupModal,setES]  = useState(false)
  const [novoSup,setNS]       = useState('')
  const [transferModal,setTM] = useState<any>(null)  // paciente selecionado para transferir
  const [destEst,setDE]       = useState('')
  const [motivoTrans,setMT]   = useState('')
  const toast = useToast()
  const location = useLocation()

  useEffect(()=>{
    api.adminEstagiarios().then(setLista)
  },[location.pathname])

  const abrirEst = async(e:any)=>{
    setSel(e); setAba('pacientes')
    const [pacs,sls] = await Promise.all([
      api.adminEstPacientes(e.id),
      api.adminSlotsEst(e.id),
    ])
    setPacs(pacs); setSlots(sls)
  }

  const salvarSupervisor = async()=>{
    if(!novoSup.trim()){toast('Informe o nome do supervisor');return}
    try{
      await api.adminEstSupervisor(sel.id, novoSup)
      setLista(l=>l.map(e=>e.id===sel.id?{...e,supervisor:novoSup}:e))
      setSel((s:any)=>({...s,supervisor:novoSup}))
      setES(false); toast('✅ Supervisor atualizado!')
    }catch(e:any){toast('❌ '+(e.response?.data?.error||e.message))}
  }

  const toggleAtivo = async()=>{
    if(!sel)return
    const novoAtivo = !sel.ativo
    if(!confirm(novoAtivo?'Reativar este estagiário?':`Desativar ${sel.nome}? Todos os vínculos serão encerrados.`))return
    try{
      await api.adminEstToggle(sel.id, novoAtivo)
      setLista(l=>l.map(e=>e.id===sel.id?{...e,ativo:novoAtivo?1:0}:e))
      setSel((s:any)=>({...s,ativo:novoAtivo?1:0}))
      toast(novoAtivo?'✅ Estagiário reativado.':'Estagiário desativado.')
    }catch(e:any){toast('❌ '+(e.response?.data?.error||e.message))}
  }

  const transferirPaciente = async()=>{
    if(!destEst||!motivoTrans){toast('Selecione o estagiário de destino e informe o motivo');return}
    try{
      await api.vinculoTransferir(transferModal.id,{novo_estagiario_id:Number(destEst),motivo:motivoTrans})
      setPacs(p=>p.filter(x=>x.id!==transferModal.id))
      setTM(null); setDE(''); setMT('')
      toast('✅ Paciente transferido! Permissões de prontuário atualizadas.')
    }catch(e:any){toast('❌ '+(e.response?.data?.error||e.message))}
  }

  const CORES = [C.amber,C.purple,C.teal,C.green,C.red]

  return (
    <div>
      {!sel?(
        /* ── LISTA DE ESTAGIÁRIOS ── */
        <>
          <div style={{marginBottom:22}}>
            <h1 style={{fontSize:22,fontWeight:800,color:C.text,marginBottom:4,letterSpacing:'-.02em'}}>
              Gestão de Estagiários</h1>
            <p style={{fontSize:13,color:C.muted}}>
              {lista.length} estagiário(s) ativo(s) · clique para gerenciar pacientes, horários e supervisor
            </p>
          </div>
          {!lista.length&&(
            <Card><div style={{padding:48,textAlign:'center',color:C.muted}}>
              Nenhum estagiário cadastrado.</div></Card>
          )}
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:14}}>
            {lista.map((e,i)=>(
              <div key={e.id} onClick={()=>abrirEst(e)} style={{
                background:C.surface,borderRadius:16,border:`1px solid ${C.border}`,
                overflow:'hidden',cursor:'pointer',transition:'box-shadow .15s'}}>
                {/* Header colorido */}
                <div style={{height:6,background:CORES[i%CORES.length]}}/>
                <div style={{padding:'16px 18px'}}>
                  <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:14}}>
                    <div style={{width:46,height:46,borderRadius:'50%',
                      background:CORES[i%CORES.length]+'20',
                      color:CORES[i%CORES.length],
                      display:'flex',alignItems:'center',justifyContent:'center',
                      fontSize:18,fontWeight:800,flexShrink:0}}>
                      {e.nome?.charAt(0)}
                    </div>
                    <div style={{minWidth:0}}>
                      <div style={{fontWeight:700,fontSize:14,color:C.text,
                        whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                        {e.nome}</div>
                      <div style={{fontSize:11,color:C.muted}}>
                        Mat. {e.matricula} · {e.semestre}º sem.</div>
                    </div>
                  </div>

                  {/* Supervisor */}
                  <div style={{fontSize:11,color:C.sub,marginBottom:12,
                    padding:'6px 10px',background:C.bg,borderRadius:7}}>
                    <span style={{color:C.muted}}>Supervisor: </span>
                    {e.supervisor||<span style={{color:C.amber}}>Não definido</span>}
                  </div>

                  {/* Stats */}
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6}}>
                    {[
                      [e.pacientes_ativos||0,'Pacientes',C.purple],
                      [e.total_sessoes||0,'Sessões',C.teal],
                      [e.slots_aprovados||0,'Horários',C.green],
                    ].map(([n,l,cor])=>(
                      <div key={l as string} style={{textAlign:'center',background:C.bg,
                        borderRadius:8,padding:'8px 4px'}}>
                        <div style={{fontSize:18,fontWeight:800,color:cor as string,lineHeight:1}}>
                          {n}</div>
                        <div style={{fontSize:9,color:C.muted,marginTop:2}}>{l}</div>
                      </div>
                    ))}
                  </div>

                  {/* Badges */}
                  <div style={{display:'flex',gap:6,marginTop:10,flexWrap:'wrap'}}>
                    {(e.slots_pendentes||0)>0&&(
                      <span style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:20,
                        background:C.amberL,color:C.amber}}>{e.slots_pendentes} pendente(s)</span>
                    )}
                    {!e.ativo&&(
                      <span style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:20,
                        background:C.redL,color:C.red}}>Inativo</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      ):(
        /* ── DETALHE DO ESTAGIÁRIO ── */
        <div>
          {/* Header com botão voltar */}
          <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20,flexWrap:'wrap'}}>
            <button onClick={()=>setSel(null)} style={{
              padding:'7px 14px',borderRadius:9,border:`1px solid ${C.border}`,
              background:C.surface,color:C.sub,fontSize:12,fontWeight:600,
              cursor:'pointer',display:'flex',alignItems:'center',gap:6,fontFamily:'inherit'}}>
              <Ico d="M19 12H5M12 19l-7-7 7-7"/> Voltar
            </button>
            <div style={{flex:1,minWidth:200}}>
              <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
                <h1 style={{fontSize:20,fontWeight:800,color:C.text,letterSpacing:'-.02em'}}>
                  {sel.nome}</h1>
                {!sel.ativo&&(
                  <span style={{fontSize:11,fontWeight:700,padding:'3px 9px',
                    borderRadius:20,background:C.redL,color:C.red}}>Inativo</span>
                )}
              </div>
              <div style={{fontSize:12,color:C.muted}}>
                Mat. {sel.matricula} · {sel.semestre}º sem. ·{' '}
                Supervisor: <strong style={{color:C.sub}}>{sel.supervisor||'Não definido'}</strong>
              </div>
            </div>
            {/* Ações */}
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              <Btn size="sm" variant="outline" onClick={()=>{setNS(sel.supervisor||'');setES(true)}}>
                Editar supervisor
              </Btn>
              <Btn size="sm" variant={sel.ativo?'danger':'success'}
                onClick={toggleAtivo}>
                {sel.ativo?'Desativar':'Reativar'}
              </Btn>
            </div>
          </div>

          {/* Stats rápidos */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:20}}>
            {[
              [pacientes.length,'Pacientes ativos',C.purple],
              [sel.total_sessoes||0,'Total sessões',C.teal],
              [sel.slots_aprovados||0,'Horários aprov.',C.green],
              [sel.slots_pendentes||0,'Horários pend.',C.amber],
            ].map(([n,l,cor])=>(
              <div key={l as string} style={{background:C.surface,borderRadius:12,
                padding:'14px 16px',border:`1px solid ${C.border}`}}>
                <div style={{fontSize:24,fontWeight:800,color:cor as string,marginBottom:3}}>{n}</div>
                <div style={{fontSize:11,color:C.muted}}>{l}</div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div style={{display:'flex',background:C.surfaceAlt,borderRadius:10,padding:4,
            marginBottom:18,gap:4,border:`1px solid ${C.border}`,width:'fit-content'}}>
            {([['pacientes',`Pacientes (${pacientes.length})`],['horarios',`Horários (${slots.length})`]] as const).map(([k,l])=>(
              <button key={k} onClick={()=>setAba(k)} style={{
                padding:'8px 18px',borderRadius:8,border:'none',fontSize:12,fontWeight:600,
                cursor:'pointer',fontFamily:'inherit',transition:'all .15s',
                background:aba===k?C.sideActive:'transparent',
                color:aba===k?'#fff':C.muted}}>
                {l}
              </button>
            ))}
          </div>

          {/* ── PACIENTES ── */}
          {aba==='pacientes'&&(
            <div>
              {!pacientes.length&&(
                <Card><div style={{padding:40,textAlign:'center',color:C.muted}}>
                  Nenhum paciente vinculado atualmente.</div></Card>
              )}
              {pacientes.length>0&&(
                <div style={{background:C.surface,borderRadius:14,border:`1px solid ${C.border}`,overflow:'hidden'}}>
                  <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr auto',
                    padding:'10px 18px',background:C.surfaceAlt,
                    borderBottom:`1px solid ${C.border}`,
                    fontSize:10,fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:'.06em'}}>
                    <span>Paciente</span><span>Urgência</span>
                    <span>Sessões</span><span>Última sessão</span><span></span>
                  </div>
                  {pacientes.map((p,i)=>(
                    <div key={p.id} style={{
                      display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr auto',
                      padding:'12px 18px',borderBottom:i<pacientes.length-1?`1px solid ${C.border}`:'none',
                      alignItems:'center',fontSize:13}}>
                      <div>
                        <div style={{fontWeight:700,color:C.text}}>{p.nome}</div>
                        <div style={{fontSize:11,color:C.muted}}>{p.telefone}</div>
                      </div>
                      <span style={{fontSize:11,fontWeight:700,padding:'2px 9px',
                        borderRadius:20,background:U_COR[p.urgencia]+'20',
                        color:U_COR[p.urgencia],width:'fit-content'}}>
                        {U_LBL[p.urgencia]||'—'}
                      </span>
                      <span style={{fontWeight:600,color:C.text}}>{p.sessoes_com_este||0}</span>
                      <span style={{color:C.muted,fontSize:12}}>
                        {p.ultima_sessao?fmtData(p.ultima_sessao):'—'}</span>
                      <Btn size="sm" variant="outline"
                        onClick={()=>{setTM(p);setDE('');setMT('')}}>
                        Transferir
                      </Btn>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── HORÁRIOS ── */}
          {aba==='horarios'&&(
            <div>
              {!slots.length&&(
                <Card><div style={{padding:40,textAlign:'center',color:C.muted}}>
                  Nenhum horário cadastrado.</div></Card>
              )}
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {slots.map((s:any)=>(
                  <div key={s.id} style={{background:C.surface,border:`1px solid ${C.border}`,
                    borderRadius:10,padding:'12px 16px',
                    display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
                    <div>
                      <span style={{fontWeight:700,fontSize:13,color:C.text}}>
                        {DIA_LBL[s.dia_semana]}</span>
                      <span style={{fontSize:13,color:C.sub,marginLeft:10}}>
                        {s.hora_inicio}–{s.hora_fim}</span>
                      <span style={{fontSize:11,color:C.muted,marginLeft:8}}>({s.turno})</span>
                    </div>
                    <span style={{fontSize:11,fontWeight:700,padding:'3px 9px',borderRadius:20,
                      background:s.status==='aprovado'?C.greenL:s.status==='pendente'?C.amberL:C.redL,
                      color:s.status==='aprovado'?C.green:s.status==='pendente'?C.amber:C.red}}>
                      {s.status==='aprovado'?'Aprovado':s.status==='pendente'?'Pendente':'Rejeitado'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal — editar supervisor */}
      {editSupModal&&(
        <Modal title="Editar Supervisor" subtitle={sel?.nome} onClose={()=>setES(false)}>
          <p style={{fontSize:13,color:C.muted,marginBottom:16}}>
            Digite o nome do supervisor responsável por este estagiário no SEP.
          </p>
          <Inp label="Nome do supervisor" value={novoSup}
            onChange={(e:any)=>setNS(e.target.value)}
            placeholder="Ex: Prof. Dr. João Silva"/>
          <div style={{display:'flex',gap:10,marginTop:20}}>
            <Btn variant="ghost" onClick={()=>setES(false)}>Cancelar</Btn>
            <Btn onClick={salvarSupervisor}>Salvar</Btn>
          </div>
        </Modal>
      )}

      {/* Modal — transferir paciente */}
      {transferModal&&(
        <Modal title="Transferir Paciente"
          subtitle={`${transferModal.nome} → outro estagiário`}
          onClose={()=>setTM(null)}>
          <div style={{background:C.amberL,borderRadius:9,padding:'10px 14px',
            fontSize:12,color:C.amber,marginBottom:16}}>
            ⚠ A transferência encerra o vínculo atual e cria um novo vínculo.
            O acesso ao prontuário muda imediatamente.
          </div>
          <div style={{display:'grid',gap:12}}>
            <Sel label="Estagiário de destino *" value={destEst}
              onChange={(e:any)=>setDE(e.target.value)}>
              <option value="">Selecione...</option>
              {lista.filter(e=>e.id!==sel?.id&&e.ativo).map((e:any)=>(
                <option key={e.id} value={e.id}>
                  {e.nome} — {e.pacientes_ativos||0} paciente(s) atual(is)
                </option>
              ))}
            </Sel>
            <Txa label="Motivo da transferência *" rows={3} value={motivoTrans}
              onChange={(e:any)=>setMT(e.target.value)}
              placeholder="Descreva o motivo (ex: formatura do estagiário, incompatibilidade de horário...)"/>
          </div>
          <div style={{display:'flex',gap:10,marginTop:20}}>
            <Btn variant="ghost" onClick={()=>setTM(null)}>Cancelar</Btn>
            <Btn variant="warn" onClick={transferirPaciente}>Confirmar transferência</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}

function SlotsPendentes() {
  const {user} = useAuth()
  const [slots,setSlots]   = useState<any[]>([])
  const [cfg,setCfg]       = useState<any>({max_estagiarios_diurno:2,max_estagiarios_noturno:2,max_estagiarios_slot:1})
  const [editCfg,setEdit]  = useState(false)
  const [cfgForm,setCfgForm] = useState<any>({})
  const toast = useToast()

  const location = useLocation()
  useEffect(()=>{
    api.adminSlotsPendentes().then(setSlots)
    if(user?.perfil==='coordenador') api.adminGetConfig().then(d=>{ setCfg(d); setCfgForm(d) })
  },[location.pathname])

  const agir = async(id:number,status:string)=>{
    try {
      await api.adminAprovarSlot(id,status)
      setSlots(s=>s.filter(x=>x.id!==id))
      toast(status==='aprovado'?'✅ Horário aprovado!':'Horário rejeitado')
    } catch(e:any) {
      toast('❌ '+( e.response?.data?.error || e.message))
    }
  }

  const salvarCfg = async()=>{
    try {
      await api.adminSetConfig(cfgForm)
      setCfg(cfgForm); setEdit(false)
      toast('✅ Configurações salvas!')
    } catch(e:any){ toast('❌ '+(e.response?.data?.error||e.message)) }
  }

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',marginBottom:20,flexWrap:'wrap',gap:12}}>
        <div>
          <h1 style={{fontSize:22,fontWeight:700,color:C.text,marginBottom:4}}>Aprovar Horários</h1>
          <p style={{fontSize:13,color:C.muted}}>{slots.length} horário(s) aguardando aprovação</p>
        </div>
        <Btn variant="outline" size="sm" icon="⚙" onClick={()=>setEdit(e=>!e)}>
          {editCfg?'Fechar config':'Configurar capacidade'}
        </Btn>
      </div>

      {/* Painel de capacidade */}
      {editCfg&&(
        <Card style={{marginBottom:16,border:`1px solid ${C.blue}30`,background:C.blueL}}>
          <div style={{padding:'16px 20px'}}>
            <div style={{fontSize:14,fontWeight:700,color:C.blue,marginBottom:4}}>⚙ Capacidade por turno / horário</div>
            <div style={{fontSize:12,color:C.sub,marginBottom:14}}>
              Controla quantos estagiários podem ter horários aprovados simultaneamente. Conflitos com estagiários já aprovados são verificados automaticamente ao aprovar.
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:16}}>
              {[
                {k:'max_estagiarios_diurno', l:'Turno diurno (08h–18h)', desc:'Máx. de estagiários por dia no turno diurno'},
                {k:'max_estagiarios_noturno',l:'Turno noturno (18h+)',   desc:'Máx. de estagiários por dia no turno noturno'},
                {k:'max_estagiarios_slot',   l:'Mesmo horário exato',    desc:'Máx. de estagiários no mesmo dia+horário'},
                {k:'max_faltas_desligamento',l:'Faltas para desligar',    desc:'Paciente é desligado ao atingir este total'},
              ].map(f=>(
                <div key={f.k} style={{background:C.surface,borderRadius:10,padding:'12px 14px',border:`1px solid ${C.border}`}}>
                  <div style={{fontSize:12,fontWeight:700,color:C.text,marginBottom:3}}>{f.l}</div>
                  <div style={{fontSize:11,color:C.muted,marginBottom:8}}>{f.desc}</div>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <button onClick={()=>setCfgForm((p:any)=>({...p,[f.k]:Math.max(1,Number(p[f.k])-1)}))}
                      style={{width:28,height:28,borderRadius:7,border:`1px solid ${C.border}`,background:C.bg,cursor:'pointer',fontWeight:700,fontSize:16,fontFamily:'inherit'}}>−</button>
                    <span style={{fontSize:20,fontWeight:800,color:C.blue,minWidth:24,textAlign:'center'}}>{cfgForm[f.k]||cfg[f.k]||1}</span>
                    <button onClick={()=>setCfgForm((p:any)=>({...p,[f.k]:Math.min(10,Number(p[f.k])+1)}))}
                      style={{width:28,height:28,borderRadius:7,border:`1px solid ${C.border}`,background:C.bg,cursor:'pointer',fontWeight:700,fontSize:16,fontFamily:'inherit'}}>+</button>
                  </div>
                </div>
              ))}
            </div>
            <Txa
              label="Salas disponíveis"
              rows={2}
              value={cfgForm.salas_disponiveis ?? cfg.salas_disponiveis ?? DEFAULT_SALAS.join(',')}
              onChange={e=>setCfgForm((p:any)=>({...p,salas_disponiveis:e.target.value}))}
              placeholder="Sala 1, Sala 2, Sala 3, Sala Online"
              style={{marginBottom:14}}
            />
            <Btn variant="primary" onClick={salvarCfg}>Salvar configurações</Btn>
          </div>
        </Card>
      )}

      {/* Resumo atual */}
      {!editCfg&&(
        <div style={{display:'flex',gap:10,marginBottom:16,flexWrap:'wrap'}}>
          <Chip label={`Diurno: máx ${cfg.max_estagiarios_diurno} por dia`} color={C.blue} bg={C.blueL} sm/>
          <Chip label={`Noturno: máx ${cfg.max_estagiarios_noturno} por dia`} color={C.purple} bg={C.purpleL} sm/>
          <Chip label={`Mesmo horário: máx ${cfg.max_estagiarios_slot}`} color={C.teal} bg={C.tealL} sm/>
        </div>
      )}

      {!slots.length&&<Card><div style={{padding:48,textAlign:'center'}}><div style={{fontSize:32,marginBottom:12}}>✅</div><p style={{color:C.muted}}>Nenhum pendente</p></div></Card>}
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        {slots.map(s=>(
          <Card key={s.id}>
            <div style={{padding:'14px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}>
              <div>
                <div style={{fontWeight:700,fontSize:14,color:C.text,marginBottom:3}}>{s.estagiario_nome}</div>
                <div style={{fontSize:13,color:C.sub}}>{DIA_LBL[s.dia_semana]} · {s.hora_inicio}–{s.hora_fim} <span style={{fontSize:11,color:C.muted}}>({s.turno})</span></div>
                <div style={{fontSize:11,color:C.muted,marginTop:2}}>Solicitado: {fmtData(s.criado_em)}</div>
              </div>
              <div style={{display:'flex',gap:8}}>
                <Btn size="sm" variant="danger" icon="✖" onClick={()=>agir(s.id,'rejeitado')}>Rejeitar</Btn>
                <Btn size="sm" variant="success" icon="✔" onClick={()=>agir(s.id,'aprovado')}>Aprovar</Btn>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

function Seguranca() {
  const {user:_u} = useAuth()
  if(_u?.perfil !== 'coordenador') return (
    <div style={{padding:64,textAlign:'center',color:C.muted}}>
      <div style={{fontSize:40,marginBottom:12}}>🔒</div>
      <p style={{fontSize:14,fontWeight:600,color:C.text}}>Acesso restrito ao Coordenador</p>
    </div>
  )

  const [aba,setAba]           = useState<'sessoes'|'logs'|'audit'>('sessoes')
  const [sessoes,setSessoes]   = useState<any[]>([])
  const [logs,setLogs]         = useState<any[]>([])
  const [tipoLog,setTipoLog]   = useState<'app'|'error'|'audit'>('app')
  const [senha,setSenha]       = useState({atual:'',nova:''})
  const toast                  = useToast()
  const location               = useLocation()

  useEffect(()=>{ api.authSessoes().then(setSessoes) },[location.pathname])
  useEffect(()=>{
    if(aba!=='logs') return
    api.adminLogs(tipoLog,300).then((d:any)=>setLogs(Array.isArray(d)?d:[])).catch(()=>setLogs([]))
  },[aba,tipoLog])

  const trocar = async()=>{
    try{
      await api.authAlterarSenha(senha.atual,senha.nova)
      toast('✅ Senha alterada!'); setSenha({atual:'',nova:''})
    }catch(e:any){toast('❌ '+(e.response?.data?.error||e.message))}
  }

  const revogar = async(id:string)=>{
    await api.authRevogar(Number(id)); setSessoes(s=>s.filter((x:any)=>x.sessao_id!==id))
    toast('✅ Sessão encerrada.')
  }

  const LEVEL_COR:any = {
    INFO:'#16a34a', WARN:'#b45309', ERROR:'#dc2626',
    HTTP:'#0891b2', DEBUG:'#78716c', AUDIT:'#7c3aed'
  }

  const TABS = [
    {k:'sessoes', l:'Sessões ativas'},
    {k:'logs',    l:'Logs do sistema'},
  ]

  return (
    <div>
      <h1 style={{fontSize:22,fontWeight:800,color:C.text,marginBottom:16,letterSpacing:'-.02em'}}>
        Segurança & Logs
      </h1>

      {/* Abas */}
      <div style={{display:'flex',gap:2,background:C.bg,borderRadius:10,padding:3,
        border:`1px solid ${C.border}`,width:'fit-content',marginBottom:20}}>
        {TABS.map(t=>(
          <button key={t.k} onClick={()=>setAba(t.k as any)}
            style={{padding:'7px 18px',borderRadius:8,border:'none',fontSize:12,
              fontWeight:700,cursor:'pointer',fontFamily:'inherit',transition:'all .15s',
              background:aba===t.k?C.amber:'transparent',
              color:aba===t.k?'#fff':C.muted}}>
            {t.l}
          </button>
        ))}
      </div>

      {/* ── Sessões ── */}
      {aba==='sessoes'&&(<>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:20}}>
          <Card>
            <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:12,
              textTransform:'uppercase',letterSpacing:'.06em'}}>Alterar senha</div>
            <div style={{display:'grid',gap:10}}>
              <Inp label="Senha atual" type="password" value={senha.atual}
                onChange={e=>setSenha(p=>({...p,atual:e.target.value}))}/>
              <Inp label="Nova senha" type="password" value={senha.nova}
                onChange={e=>setSenha(p=>({...p,nova:e.target.value}))}/>
              <Btn variant="primary" onClick={trocar}
                disabled={!senha.atual||senha.nova.length<8}>
                Alterar senha
              </Btn>
            </div>
          </Card>
          <Card>
            <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:12,
              textTransform:'uppercase',letterSpacing:'.06em'}}>
              Sessões ativas ({sessoes.length})
            </div>
            {sessoes.map((s:any)=>(
              <div key={s.sessao_id} style={{display:'flex',alignItems:'center',
                justifyContent:'space-between',padding:'8px 0',
                borderBottom:`1px solid ${C.border}`,fontSize:13}}>
                <div>
                  <div style={{fontWeight:600,color:C.text}}>{s.dispositivo||'Navegador'}</div>
                  <div style={{fontSize:11,color:C.muted}}>{s.ip} · {fmtDT(s.criado_em)}</div>
                </div>
                <Btn size="sm" variant="danger" onClick={()=>revogar(s.sessao_id)}>Revogar</Btn>
              </div>
            ))}
          </Card>
        </div>
      </>)}

      {/* ── Logs ── */}
      {aba==='logs'&&(
        <div>
          {/* Filtros */}
          <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap',alignItems:'center'}}>
            {([['app','📋 Aplicação'],['error','❌ Erros'],['audit','🔍 Auditoria']] as const).map(([k,l])=>(
              <button key={k} onClick={()=>setTipoLog(k)}
                style={{padding:'6px 14px',borderRadius:8,border:`1px solid ${C.border}`,
                  fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',
                  background:tipoLog===k?C.amber:'#fff',
                  color:tipoLog===k?'#fff':C.muted}}>
                {l}
              </button>
            ))}
            <span style={{fontSize:12,color:C.muted,marginLeft:4}}>
              {logs.length} registro(s) — últimos 300
            </span>
            <button onClick={()=>api.adminLogs(tipoLog,300).then((d:any)=>setLogs(Array.isArray(d)?d:[]))}
              style={{marginLeft:'auto',padding:'6px 12px',borderRadius:8,border:`1px solid ${C.border}`,
                fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit',background:'#fff',color:C.sub}}>
              ↻ Atualizar
            </button>
          </div>

          {/* Tabela de logs */}
          <div style={{background:'#fff',borderRadius:12,border:`1px solid ${C.border}`,overflow:'hidden'}}>
            {/* Header */}
            <div style={{display:'grid',gridTemplateColumns:'90px 56px 1fr 1fr',
              padding:'8px 14px',background:C.bg,
              fontSize:10,fontWeight:700,color:C.muted,
              textTransform:'uppercase',letterSpacing:'.06em',
              borderBottom:`1px solid ${C.border}`}}>
              <span>Horário</span><span>Nível</span><span>Mensagem</span><span>Detalhes</span>
            </div>

            {!logs.length&&(
              <div style={{padding:'32px',textAlign:'center',color:C.muted,fontSize:13}}>
                Nenhum registro encontrado.
              </div>
            )}

            <div style={{maxHeight:520,overflowY:'auto'}}>
              {logs.map((log:any,i:number)=>{
                const cor = LEVEL_COR[log.level] || C.muted
                const hora = (log.brt||log.ts||'').slice(9,17)
                const meta = log.meta || {}
                const metaStr = Object.entries(meta)
                  .filter(([k])=>!['ts','brt','level','message'].includes(k))
                  .map(([k,v])=>`${k}: ${JSON.stringify(v)}`)
                  .join(' · ')
                const detailText = log.text || metaStr || (log.ip ? `ip: ${log.ip}` : '—')
                return (
                  <div key={i} style={{display:'grid',
                    gridTemplateColumns:'90px 56px 1fr 1fr',
                    padding:'7px 14px',alignItems:'start',
                    borderBottom:i<logs.length-1?`1px solid ${C.border}`:'none',
                    fontSize:12,
                    background:log.level==='ERROR'?'#fef2f2':
                               log.level==='WARN'?'#fefce8':'#fff'}}>
                    <span style={{color:C.muted,fontFamily:'monospace',fontSize:11}}>{hora}</span>
                    <span style={{color:cor,fontWeight:800,fontSize:11}}>{log.level}</span>
                    <span style={{color:C.text,fontWeight:500,wordBreak:'break-word'}}>
                      {log.message||log.acao||'—'}
                    </span>
                    <span style={{color:C.muted,fontSize:11,wordBreak:'break-all',
                      fontFamily:'monospace'}}>
                      {log.error?.message
                        ? <span style={{color:'#dc2626'}}>{log.error.message}</span>
                        : detailText}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


function VinculosSupervisor({listaEstagiarios}:{listaEstagiarios:any[]}) {
  const [supervisores,setSups] = useState<any[]>([])
  const [form,setForm] = useState({supervisor_id:'',estagiario_id:''})
  const toast = useToast()

  useEffect(()=>{
    api.adminSupervisores().then(setSups).catch(()=>{})
  },[])

  const vincular = async()=>{
    if(!form.supervisor_id||!form.estagiario_id){
      toast('Selecione supervisor e estagiário');return
    }
    try{
      await api.adminVincularSup(form)
      setSups(await api.adminSupervisores())
      setForm({supervisor_id:'',estagiario_id:''})
      toast('✅ Vínculo criado! O supervisor agora supervisa este estagiário.')
    }catch(e:any){toast('❌ '+(e.response?.data?.error||e.message))}
  }

  if(!supervisores.length && !listaEstagiarios.length) return null

  return (
    <div style={{marginTop:28}}>
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}>
        <div style={{flex:1,height:1,background:C.border}}/>
        <span style={{fontSize:10,fontWeight:700,color:C.muted,
          textTransform:'uppercase',letterSpacing:'.08em'}}>
          Vincular supervisor → estagiário
        </span>
        <div style={{flex:1,height:1,background:C.border}}/>
      </div>
      <p style={{fontSize:12,color:C.muted,marginBottom:14}}>
        Define qual supervisor acompanha cada estagiário. O supervisor só verá
        os horários, prontuários e pacientes dos estagiários vinculados a ele.
      </p>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr auto',gap:10,alignItems:'flex-end'}}>
        <Sel label="Supervisor" value={form.supervisor_id}
          onChange={(e:any)=>setForm(f=>({...f,supervisor_id:e.target.value}))}>
          <option value="">Selecione o supervisor...</option>
          {supervisores.map((s:any)=>(
            <option key={s.id} value={s.id}>
              {s.nome} ({s.total_estagiarios} estag.)
            </option>
          ))}
        </Sel>
        <Sel label="Estagiário" value={form.estagiario_id}
          onChange={(e:any)=>setForm(f=>({...f,estagiario_id:e.target.value}))}>
          <option value="">Selecione o estagiário...</option>
          {listaEstagiarios.map((e:any)=>(
            <option key={e.id} value={e.estagiario_id||e.id}>
              {e.nome} — Mat. {e.matricula||'—'}
            </option>
          ))}
        </Sel>
        <Btn onClick={vincular}>Vincular</Btn>
      </div>

      {/* Lista de supervisores e seus estagiários */}
      {supervisores.length>0&&(
        <div style={{marginTop:16,display:'flex',flexDirection:'column',gap:8}}>
          {supervisores.filter(s=>s.total_estagiarios>0).map((s:any)=>(
            <div key={s.id} style={{background:C.bg,borderRadius:10,
              padding:'10px 14px',border:`1px solid ${C.border}`,
              display:'flex',alignItems:'center',gap:10}}>
              <div style={{width:32,height:32,borderRadius:'50%',background:C.amberL,
                display:'flex',alignItems:'center',justifyContent:'center',
                fontSize:13,fontWeight:800,color:C.amber,flexShrink:0}}>
                {s.nome.charAt(0)}
              </div>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:13,color:C.text}}>{s.nome}</div>
                <div style={{fontSize:11,color:C.muted}}>{s.email}</div>
              </div>
              <span style={{fontSize:11,fontWeight:700,padding:'3px 9px',
                borderRadius:20,background:C.purpleL,color:C.purple}}>
                {s.total_estagiarios} estagiário(s)
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// GESTÃO DE USUÁRIOS (só coordenador)
// ══════════════════════════════════════════════════════════
function GestaoUsuarios() {
  const { user } = useAuth()
  const isCoord = user?.perfil === 'coordenador'
  const isSupervisor = user?.perfil === 'supervisor'
  if(!isCoord) return (
    <div style={{padding:64,textAlign:'center',color:C.muted}}>
      <div style={{fontSize:40,marginBottom:12}}>🔒</div>
      <p style={{fontSize:14,fontWeight:600,color:C.text}}>Acesso restrito ao Coordenador</p>
      <p style={{fontSize:13,marginTop:8}}>Apenas o coordenador do curso pode gerenciar usuários.</p>
    </div>
  )
  const [lista,setLista]    = useState<any[]>([])
  const [modal,setModal]    = useState(false)
  const [load,setLoad]      = useState(true)
  const [filtro,setFiltro]  = useState<string>('todos')
  const [form,setForm]      = useState({
    nome:'', email:'', perfil:'estagiario',
    matricula:'', semestre:'', senha_provisoria:''
  })
  const [senhaGerada,setSG] = useState<string|null>(null)
  const toast = useToast()
  const location = useLocation()

  useEffect(()=>{
    setLoad(true)
    api.adminUsuarios().then(setLista).finally(()=>setLoad(false))
  },[location.pathname])

  // Só coordenador pode acessar
  if(user?.perfil !== undefined && !isCoord && !isSupervisor) return (
    <div style={{padding:48,textAlign:'center',color:C.muted}}>
      <div style={{fontSize:32,marginBottom:12}}>🔒</div>
      <p>Acesso restrito à gestão interna do SEP.</p>
    </div>
  )

  const criar = async()=>{
    if(!form.nome||!form.email||!form.perfil){toast('Preencha nome, e-mail e perfil');return}
    if(form.perfil==='estagiario'&&!form.matricula){toast('Matrícula obrigatória para estagiário');return}
    try{
      const r = await api.adminCriarUsuario(form)
      setSG(r.senha_provisoria)
      setLista(await api.adminUsuarios())
      setForm({nome:'',email:'',perfil:'estagiario',matricula:'',semestre:'',senha_provisoria:''})
      toast('✅ Usuário criado com sucesso!')
    }catch(e:any){toast('❌ '+(e.response?.data?.error||e.message))}
  }

  const toggle = async(id:number,ativo:boolean)=>{
    const msg = ativo?'Reativar esta conta?':'Desativar esta conta? O usuário não conseguirá fazer login.'
    if(!confirm(msg))return
    try{
      await api.adminToggleUsuario(id,ativo)
      setLista(l=>l.map(u=>u.id===id?{...u,status_conta:ativo?'ativo':'suspenso'}:u))
      toast(ativo?'Conta reativada.':'Conta desativada.')
    }catch(e:any){toast('❌ '+(e.response?.data?.error||e.message))}
  }

  const PERFIL_INFO: Record<string,{label:string;cor:string;bg:string;dominio:string}> = {
    supervisor:   {label:'Supervisor',   cor:C.amber,  bg:C.amberL,  dominio:'@estacio.br'},
    recepcionista:{label:'Recepcionista',cor:C.teal,   bg:C.tealL,   dominio:'qualquer'},
    estagiario:   {label:'Estagiário',   cor:C.purple, bg:C.purpleL, dominio:'@alunos.estacio.br'},
  }

  const filtrados = filtro==='todos'?lista:lista.filter(u=>u.perfil===filtro)

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',
        marginBottom:22,flexWrap:'wrap',gap:12}}>
        <div>
          <h1 style={{fontSize:22,fontWeight:800,color:C.text,marginBottom:4,letterSpacing:'-.02em'}}>
            {isSupervisor?'Cadastro de Estagiários':'Gestão de Usuários'}</h1>
          <p style={{fontSize:13,color:C.muted}}>
            {isSupervisor
              ? 'Cadastre e acompanhe apenas os estagiários vinculados à sua supervisão.'
              : 'Crie e gerencie contas de supervisores, estagiários e recepcionistas. E-mails institucionais são obrigatórios.'}
          </p>
        </div>
        <Btn onClick={()=>{setModal(true);setSG(null)}}>+ {isSupervisor?'Novo estagiário':'Novo usuário'}</Btn>
      </div>

      {/* Filtros */}
      <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap'}}>
        {((isSupervisor
          ? [['todos','Todos'],['estagiario','Estagiários']]
          : [['todos','Todos'],['supervisor','Supervisores'],['estagiario','Estagiários'],['recepcionista','Recepcionistas']]) as [string,string][])
          .map(([k,l])=>(
          <button key={k} onClick={()=>setFiltro(k)} style={{
            padding:'6px 16px',borderRadius:9,border:`1.5px solid ${filtro===k?C.amber:C.border}`,
            background:filtro===k?C.amberL:'transparent',
            color:filtro===k?C.amber:C.muted,
            fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
            {l} ({k==='todos'?lista.length:lista.filter(u=>u.perfil===k).length})
          </button>
        ))}
      </div>

      {load&&<Spin/>}

      {/* Tabela */}
      {!load&&(
        <Card>
          <div style={{display:'grid',
            gridTemplateColumns:'2fr 1fr 1fr 1fr auto',
            padding:'10px 18px',background:C.surfaceAlt,
            borderBottom:`1px solid ${C.border}`,
            fontSize:10,fontWeight:700,color:C.muted,
            textTransform:'uppercase',letterSpacing:'.06em'}}>
            <span>Usuário</span><span>Perfil</span>
            <span>Matrícula</span><span>Status</span><span></span>
          </div>
          {!filtrados.length&&(
            <div style={{padding:40,textAlign:'center',color:C.muted}}>
              Nenhum usuário encontrado.</div>
          )}
          {filtrados.map((u,i)=>{
            const pi = PERFIL_INFO[u.perfil]
            const ativo = u.status_conta==='ativo'
            return (
              <div key={u.id} style={{
                display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr auto',
                padding:'13px 18px',
                borderBottom:i<filtrados.length-1?`1px solid ${C.border}`:'none',
                alignItems:'center',fontSize:13,
                opacity:ativo?1:.6}}>
                <div>
                  <div style={{fontWeight:700,color:C.text,marginBottom:2}}>{u.nome}</div>
                  <div style={{fontSize:11,color:C.muted}}>{u.email}</div>
                </div>
                <span style={{fontSize:11,fontWeight:700,padding:'3px 9px',borderRadius:20,
                  background:pi?.bg||C.bg,color:pi?.cor||C.muted,width:'fit-content'}}>
                  {pi?.label||u.perfil}
                </span>
                <span style={{color:C.sub,fontSize:12}}>{u.matricula||'—'}</span>
                <span style={{fontSize:11,fontWeight:700,padding:'3px 9px',borderRadius:20,
                  background:ativo?C.greenL:C.redL,color:ativo?C.green:C.red,width:'fit-content'}}>
                  {ativo?'Ativo':'Inativo'}
                </span>
                {isCoord ? (
                  <Btn size="sm" variant={ativo?'danger':'success'}
                    onClick={()=>toggle(u.id,!ativo)}>
                    {ativo?'Desativar':'Reativar'}
                  </Btn>
                ) : <span/>}
              </div>
            )
          })}
        </Card>
      )}

      {/* Seção de vínculos supervisor → estagiário */}
      {isCoord&&<VinculosSupervisor listaEstagiarios={lista.filter(u=>u.perfil==='estagiario')}/>}

      {/* Modal criar usuário */}
      {modal&&(
        <Modal title={isSupervisor?'Novo Estagiário':'Novo Usuário Interno'} onClose={()=>setModal(false)} width={560}>
          {senhaGerada?(
            <div style={{textAlign:'center',padding:'20px 0'}}>
              <div style={{fontSize:40,marginBottom:12}}>✅</div>
              <div style={{fontWeight:800,fontSize:16,color:C.text,marginBottom:8}}>
                Usuário criado com sucesso!</div>
              <div style={{background:C.amberL,border:`1px solid ${C.amber}`,
                borderRadius:12,padding:'16px 20px',margin:'0 auto 16px',maxWidth:320}}>
                <div style={{fontSize:11,color:C.amber,fontWeight:700,marginBottom:6}}>
                  SENHA PROVISÓRIA — anote agora</div>
                <div style={{fontSize:22,fontWeight:900,color:C.amber,
                  fontFamily:'monospace',letterSpacing:'.05em'}}>{senhaGerada}</div>
              </div>
              <p style={{fontSize:12,color:C.muted,marginBottom:20}}>
                Repasse esta senha ao usuário. Ela não será exibida novamente.</p>
              <Btn onClick={()=>{setModal(false);setSG(null)}}>Fechar</Btn>
            </div>
          ):(
            <>
              <div style={{display:'grid',gap:12}}>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                  <Inp label="Nome completo *" value={form.nome}
                    onChange={(e:any)=>setForm(f=>({...f,nome:e.target.value}))}
                    placeholder="Nome e sobrenome"/>
                  <Sel label="Perfil *" value={form.perfil}
                    onChange={(e:any)=>setForm(f=>({...f,perfil:e.target.value}))}>
                    {!isSupervisor&&<option value="supervisor">Supervisor (docente)</option>}
                    <option value="estagiario">Estagiário</option>
                    {!isSupervisor&&<option value="recepcionista">Recepcionista</option>}
                  </Sel>
                </div>
                <Inp label="E-mail institucional *"
                  type="email" value={form.email}
                  onChange={(e:any)=>setForm(f=>({...f,email:e.target.value}))}
                  placeholder={
                    form.perfil==='estagiario'?'joao.silva@alunos.estacio.br':
                    form.perfil==='supervisor'?'prof.joao@estacio.br':
                    form.perfil==='recepcionista'?'maria@email.com':'email@dominio.com'
                  }/>
                {form.perfil!=='recepcionista'&&(
                  <div style={{fontSize:11,color:C.muted,marginTop:-8}}>
                    Domínio definido nas configurações do servidor (.env).
                    Para {form.perfil==='estagiario'?'estagiários':'supervisores'},
                    apenas e-mails institucionais são aceitos.
                  </div>
                )}
                {form.perfil==='estagiario'&&(
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                    <Inp label="Matrícula *" value={form.matricula}
                      onChange={(e:any)=>setForm(f=>({...f,matricula:e.target.value}))}
                      placeholder="2024001"/>
                    <Inp label="Semestre" value={form.semestre}
                      onChange={(e:any)=>setForm(f=>({...f,semestre:e.target.value}))}
                      placeholder="8"/>
                  </div>
                )}
                <Inp label="Senha provisória (deixe vazio para gerar automaticamente)"
                  value={form.senha_provisoria}
                  onChange={(e:any)=>setForm(f=>({...f,senha_provisoria:e.target.value}))}
                  placeholder="Será gerada automaticamente se vazio"/>
              </div>
              <div style={{background:C.bg,borderRadius:9,padding:'10px 14px',
                fontSize:12,color:C.sub,marginTop:12,lineHeight:1.6}}>
                O usuário receberá acesso imediato com a senha provisória.
                Recomende que ele altere a senha no primeiro login.
              </div>
              <div style={{display:'flex',gap:10,marginTop:20}}>
                <Btn variant="ghost" onClick={()=>setModal(false)}>Cancelar</Btn>
                <Btn onClick={criar}>Criar usuário</Btn>
              </div>
            </>
          )}
        </Modal>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// PRONTUÁRIOS — visão do supervisor
// ══════════════════════════════════════════════════════════
function ProntuariosSupervisor() {
  const [pacientes,setPacs] = useState<any[]>([])
  const [sel,setSel]        = useState<any>(null)
  const [pronts,setPronts]  = useState<any[]>([])
  const [docs,setDocs]      = useState<any[]>([])
  const [audit,setAudit]    = useState<any[]>([])
  const [vinculos,setVincs] = useState<any[]>([])
  const [aba,setAba]        = useState<'prontuarios'|'documentos'|'vinculos'|'auditoria'>('prontuarios')
  const [selPront,setSelP]  = useState<any>(null)
  const toast = useToast()
  const location = useLocation()

  useEffect(()=>{
    // Carrega pacientes em atendimento ou com histórico
    api.adminPacientes({status:'em_atendimento'}).then(setPacs).catch(()=>{})
  },[location.pathname])

  const abrirPaciente = async(p:any)=>{
    setSel(p); setAba('prontuarios')
    try{
      const [pr,dc,au,vi] = await Promise.all([
        api.prontuariosPaciente(p.id),
        api.docsPaciente(p.id),
        api.auditoriaPaciente(p.id),
        api.vinculosHistorico(p.id),
      ])
      setPronts(pr); setDocs(dc); setAudit(au); setVincs(vi)
    }catch(e:any){toast('❌ Erro ao carregar dados')}
  }

  const fmtBytes=(b:number)=>b>1048576?`${(b/1048576).toFixed(1)} MB`:b>1024?`${(b/1024).toFixed(0)} KB`:`${b} B`

  if(sel) return (
    <div>
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20}}>
        <Btn variant="ghost" onClick={()=>{setSel(null);setPronts([]);setDocs([])}}>← Voltar</Btn>
        <div>
          <h1 style={{fontSize:20,fontWeight:800,color:C.text,letterSpacing:'-.02em'}}>{sel.nome}</h1>
          <div style={{fontSize:12,color:C.muted}}>{sel.telefone} · {sel.estagiario_nome||'Sem estagiário'}</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:'flex',background:C.surfaceAlt,borderRadius:10,padding:4,
        marginBottom:20,gap:4,border:`1px solid ${C.border}`,width:'fit-content'}}>
        {([
          ['prontuarios','Prontuários'],
          ['documentos','Documentos'],
          ['vinculos','Vínculos'],
          ['auditoria','Auditoria'],
        ] as const).map(([k,l])=>(
          <button key={k} onClick={()=>setAba(k)} style={{
            padding:'7px 16px',borderRadius:8,border:'none',fontSize:12,fontWeight:600,
            cursor:'pointer',fontFamily:'inherit',transition:'all .15s',
            background:aba===k?C.sideActive:'transparent',
            color:aba===k?'#fff':C.muted}}>
            {l}
          </button>
        ))}
      </div>

      {/* PRONTUÁRIOS */}
      {aba==='prontuarios'&&(
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {!pronts.length&&<Card><div style={{padding:40,textAlign:'center',color:C.muted}}>Nenhum prontuário registrado.</div></Card>}
          {pronts.map(p=>(
            <div key={p.id} onClick={()=>setSelP(p)} style={{
              background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,
              padding:'14px 18px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div>
                <div style={{fontWeight:700,fontSize:14,color:C.text,marginBottom:3}}>
                  Sessão {p.sessao_numero} · {fmtData(p.data_sessao)}</div>
                {p.queixa_principal&&<div style={{fontSize:12,color:C.muted}}>
                  {p.queixa_principal.slice(0,80)}{p.queixa_principal.length>80?'…':''}</div>}
              </div>
              <Ico d="M9 5l7 7-7 7"/>
            </div>
          ))}
        </div>
      )}

      {/* DOCUMENTOS */}
      {aba==='documentos'&&(
        <div>
          {!docs.length&&<Card><div style={{padding:40,textAlign:'center',color:C.muted}}>Nenhum documento.</div></Card>}
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {docs.map(d=>(
              <div key={d.id} style={{background:C.surface,border:`1px solid ${C.border}`,
                borderRadius:11,padding:'12px 16px',display:'flex',alignItems:'center',gap:12}}>
                <div style={{fontSize:22,flexShrink:0}}>📄</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:600,fontSize:13,color:C.text,
                    whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                    {d.nome_original}</div>
                  <div style={{fontSize:11,color:C.muted}}>
                    {d.tamanho_bytes?fmtBytes(d.tamanho_bytes):''} · {fmtData(d.criado_em)}
                    {d.enviado_por_nome?` · por ${d.enviado_por_nome}`:''}
                  </div>
                </div>
                <Btn size="sm" variant="ghost" onClick={async()=>{
                  try{const {url}=await api.docDownload(d.id);window.open(url,'_blank')}
                  catch(e:any){toast('❌ Erro ao gerar link')}
                }}>Baixar</Btn>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VÍNCULOS */}
      {aba==='vinculos'&&(
        <div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
            <p style={{fontSize:13,color:C.muted}}>Histórico de estagiários que atenderam este paciente</p>
            <Btn size="sm" onClick={async()=>{
              const novo = prompt('ID do novo estagiário:')
              const motivo = prompt('Motivo da transferência:')
              if(!novo||!motivo)return
              try{
                await api.vinculoTransferir(sel.id,{novo_estagiario_id:Number(novo),motivo})
                toast('✅ Transferência realizada!')
                const vi = await api.vinculosHistorico(sel.id); setVincs(vi)
              }catch(e:any){toast('❌ '+(e.response?.data?.error||e.message))}
            }}>Transferir estagiário</Btn>
          </div>
          <Card>
            {!vinculos.length&&<div style={{padding:40,textAlign:'center',color:C.muted}}>Sem histórico de vínculos.</div>}
            {vinculos.map((v,i)=>(
              <div key={v.id} style={{padding:'12px 18px',
                borderBottom:i<vinculos.length-1?`1px solid ${C.border}`:'none',
                display:'flex',alignItems:'center',gap:12}}>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,fontSize:13,color:C.text}}>
                    {v.estagiario_nome}</div>
                  <div style={{fontSize:11,color:C.muted}}>
                    {fmtData(v.data_inicio)} → {v.data_fim?fmtData(v.data_fim):'atual'}
                    {v.motivo_transferencia&&` · ${v.motivo_transferencia}`}
                  </div>
                </div>
                <span style={{fontSize:11,fontWeight:700,padding:'3px 9px',borderRadius:20,
                  background:v.ativo?C.greenL:C.bg,color:v.ativo?C.green:C.muted}}>
                  {v.ativo?'Ativo':'Encerrado'}
                </span>
              </div>
            ))}
          </Card>
        </div>
      )}

      {/* AUDITORIA */}
      {aba==='auditoria'&&(
        <div>
          <p style={{fontSize:13,color:C.muted,marginBottom:14}}>
            Registro LGPD de todo acesso aos dados deste paciente</p>
          <Card>
            {!audit.length&&<div style={{padding:40,textAlign:'center',color:C.muted}}>Nenhum acesso registrado.</div>}
            {audit.map((a,i)=>(
              <div key={a.id} style={{padding:'10px 18px',
                borderBottom:i<audit.length-1?`1px solid ${C.border}`:'none',
                display:'flex',alignItems:'center',gap:12,fontSize:12}}>
                <span style={{fontSize:18}}>{a.acao==='visualizou'?'👁':a.acao==='editou'?'✏️':a.acao==='criou'?'📝':a.acao==='baixou_arquivo'?'⬇️':'🗑'}</span>
                <div style={{flex:1}}>
                  <span style={{fontWeight:600,color:C.text}}>{a.usuario_nome}</span>
                  <span style={{color:C.muted}}> {a.acao} </span>
                  {a.detalhes&&<span style={{color:C.muted}}>— {a.detalhes}</span>}
                </div>
                <span style={{color:C.muted,flexShrink:0}}>{fmtDT(a.criado_em)}</span>
              </div>
            ))}
          </Card>
        </div>
      )}

      {/* Modal detalhe prontuário */}
      {selPront&&(
        <Modal title={`Sessão ${selPront.sessao_numero}`}
          subtitle={fmtData(selPront.data_sessao)} onClose={()=>setSelP(null)} width={660}>
          {[
            ['Queixa principal',selPront.queixa_principal],
            ['Descrição da sessão',selPront.descricao_sessao],
            ['Intervenções',selPront.intervencoes],
            ['Evolução',selPront.evolucao],
            ['Plano próxima sessão',selPront.plano_proxima],
          ].map(([k,v])=>v?(
            <div key={k} style={{marginBottom:14}}>
              <p style={{fontSize:10,fontWeight:700,color:C.muted,textTransform:'uppercase',
                letterSpacing:'.06em',marginBottom:5}}>{k}</p>
              <p style={{fontSize:13,color:C.sub,lineHeight:1.65,background:C.bg,
                padding:'10px 13px',borderRadius:9,border:`1px solid ${C.border}`}}>{v}</p>
            </div>
          ):null)}
          <Btn variant="ghost" onClick={()=>setSelP(null)}>Fechar</Btn>
        </Modal>
      )}
    </div>
  )

  return (
    <div>
      <div style={{marginBottom:22}}>
        <h1 style={{fontSize:22,fontWeight:800,color:C.text,marginBottom:4}}>Prontuários</h1>
        <p style={{fontSize:13,color:C.muted}}>
          Pacientes em atendimento ativo — clique para ver prontuários, documentos e auditoria
        </p>
      </div>
      {!pacientes.length&&(
        <Card><div style={{padding:48,textAlign:'center'}}>
          <div style={{fontSize:32,marginBottom:12}}>📋</div>
          <p style={{color:C.muted}}>Nenhum paciente em atendimento no momento.</p>
        </div></Card>
      )}
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        {pacientes.map(p=>(
          <div key={p.id} onClick={()=>abrirPaciente(p)} style={{
            background:C.surface,border:`1px solid ${C.border}`,borderRadius:13,
            padding:'14px 18px',cursor:'pointer',display:'flex',alignItems:'center',gap:14}}>
            <div style={{width:40,height:40,borderRadius:11,background:C.amberL,
              display:'flex',alignItems:'center',justifyContent:'center',
              fontSize:16,fontWeight:800,color:C.amber,flexShrink:0}}>
              {p.nome.charAt(0)}
            </div>
            <div style={{flex:1}}>
              <div style={{fontWeight:700,fontSize:14,color:C.text,marginBottom:3}}>{p.nome}</div>
              <div style={{fontSize:12,color:C.muted}}>
                {p.estagiario_nome||'Sem estagiário'} · {p.telefone}
              </div>
            </div>
              <Ico d="M9 5l7 7-7 7"/>
          </div>
        ))}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// ALTAS CLÍNICAS — supervisor aprova ou rejeita
// ══════════════════════════════════════════════════════════
function AltasSupervisor() {
  const [lista,setLista]    = useState<any[]>([])
  const [sel,setSel]        = useState<any>(null)
  const [obs,setObs]        = useState('')
  const [load,setLoad]      = useState(true)
  const toast = useToast()
  const location = useLocation()

  useEffect(()=>{
    setLoad(true)
    api.altasPendentes().then(setLista).finally(()=>setLoad(false))
  },[location.pathname])

  const avaliar = async(decisao:'aprovada'|'rejeitada')=>{
    if(!sel)return
    try{
      await api.altaAvaliar(sel.id,{decisao,obs_supervisor:obs})
      setLista(l=>l.filter(a=>a.id!==sel.id))
      setSel(null); setObs('')
      toast(decisao==='aprovada'?
        '✅ Alta aprovada — vínculo encerrado e paciente desligado.':
        'Alta rejeitada — atendimento continua.')
    }catch(e:any){toast('❌ '+(e.response?.data?.error||e.message))}
  }

  const MOTIVOS_LBL: Record<string,string> = {
    objetivo_alcancado:'Objetivo terapêutico alcançado',
    abandono:'Abandono do tratamento',
    encaminhamento:'Encaminhamento para outro serviço',
    desistencia:'Desistência do paciente',
    outro:'Outro motivo',
  }

  if(load) return <Spin/>
  return (
    <div>
      <div style={{marginBottom:22}}>
        <h1 style={{fontSize:22,fontWeight:800,color:C.text,marginBottom:4}}>Altas Clínicas</h1>
        <p style={{fontSize:13,color:C.muted}}>{lista.length} solicitação(ões) aguardando sua avaliação</p>
      </div>

      {!lista.length&&(
        <Card><div style={{padding:48,textAlign:'center'}}>
          <div style={{fontSize:32,marginBottom:12}}>✅</div>
          <p style={{color:C.muted}}>Nenhuma solicitação de alta pendente.</p>
        </div></Card>
      )}

      <div style={{display:'flex',flexDirection:'column',gap:12}}>
        {lista.map(a=>(
          <Card key={a.id}>
            <div style={{padding:'16px 20px',display:'flex',alignItems:'flex-start',
              justifyContent:'space-between',gap:12,flexWrap:'wrap'}}>
              <div style={{flex:1,minWidth:200}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                  <span style={{fontSize:15,fontWeight:700,color:C.text}}>{a.paciente_nome}</span>
                  <span style={{fontSize:11,fontWeight:700,padding:'2px 9px',borderRadius:20,
                    background:C.amberL,color:C.amber}}>Pendente</span>
                </div>
                <div style={{fontSize:12,color:C.muted,marginBottom:8}}>
                  Estagiário: {a.estagiario_nome} · {a.total_sessoes} sessão(ões)
                  · Solicitado em {fmtData(a.criado_em)}
                </div>
                <div style={{fontSize:13,fontWeight:600,color:C.sub,marginBottom:3}}>
                  Motivo: {MOTIVOS_LBL[a.motivo_alta]||a.motivo_alta}
                </div>
                {a.resumo_caso&&(
                  <div style={{background:C.bg,borderRadius:8,padding:'10px 14px',
                    fontSize:12,color:C.sub,lineHeight:1.6,borderLeft:`3px solid ${C.amber}`,marginTop:8}}>
                    {a.resumo_caso.slice(0,200)}{a.resumo_caso.length>200?'…':''}
                  </div>
                )}
              </div>
              <Btn size="sm" variant="outline" onClick={()=>{setSel(a);setObs('')}}>
                Avaliar
              </Btn>
            </div>
          </Card>
        ))}
      </div>

      {sel&&(
        <Modal title={`Alta — ${sel.paciente_nome}`}
          subtitle={`${sel.estagiario_nome} · ${sel.total_sessoes} sessão(ões)`}
          onClose={()=>setSel(null)} width={660}>
          <div style={{marginBottom:14}}>
            <div style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:'uppercase',
              letterSpacing:'.06em',marginBottom:6}}>Motivo</div>
            <div style={{fontSize:13,fontWeight:600,color:C.text}}>
              {MOTIVOS_LBL[sel.motivo_alta]||sel.motivo_alta}
            </div>
          </div>
          <div style={{marginBottom:14}}>
            <div style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:'uppercase',
              letterSpacing:'.06em',marginBottom:6}}>Resumo do caso</div>
            <div style={{background:C.bg,borderRadius:9,padding:'12px 14px',
              fontSize:13,color:C.sub,lineHeight:1.65,borderLeft:`3px solid ${C.amber}`}}>
              {sel.resumo_caso}
            </div>
          </div>
          {sel.recomendacoes&&(
            <div style={{marginBottom:14}}>
              <div style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:'uppercase',
                letterSpacing:'.06em',marginBottom:6}}>Recomendações</div>
              <div style={{fontSize:13,color:C.sub,lineHeight:1.65}}>{sel.recomendacoes}</div>
            </div>
          )}
          <div style={{background:C.redL,borderRadius:9,padding:'10px 14px',
            fontSize:12,color:C.red,marginBottom:16}}>
            ⚠ Ao aprovar: o vínculo do estagiário com o paciente será encerrado
            e o paciente receberá status "Alta". Esta ação não pode ser desfeita.
          </div>
          <Txa label="Observações do supervisor (opcional)" rows={2} value={obs}
            onChange={e=>setObs(e.target.value)} placeholder="Comentários, orientações..."/>
          <div style={{display:'flex',gap:10,marginTop:20,flexWrap:'wrap'}}>
            <Btn variant="ghost" onClick={()=>setSel(null)}>Fechar</Btn>
            <Btn variant="danger" onClick={()=>avaliar('rejeitada')}>Rejeitar — continuar atendimento</Btn>
            <Btn variant="success" onClick={()=>avaliar('aprovada')}>Aprovar alta clínica</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// APP ROOT
// ══════════════════════════════════════════════════════════════
export default function AdminApp() {
  const [drawer,setDrawer]   = useState(false)
  const [badges,setBadges]   = useState<any>({})
  const [toast,setToast]     = useState<string|null>(null)
  const {isMobile}           = useResponsive()
  const {user}               = useAuth()
  const showToast = useCallback((m:string)=>{setToast(m);setTimeout(()=>setToast(null),3500)},[])
  useEffect(()=>{api.adminDashboard().then(d=>setBadges(d))},[])

  return (
    <ToastCtx.Provider value={showToast}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeInM{from{opacity:0;transform:scale(.97) translateY(6px)}to{opacity:1;transform:scale(1) translateY(0)}}
        @keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
        @keyframes toastIn{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:translateX(0)}}
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'Inter',system-ui,-apple-system,sans-serif}
        input,select,textarea,button{font-family:inherit}
      `}</style>

      <div style={{display:'flex',height:'100vh',background:C.bg,overflow:'hidden'}}>
        {/* Sidebar desktop */}
        {!isMobile&&(
          <div style={{flexShrink:0,boxShadow:'2px 0 16px rgba(15,23,42,.1)'}}>
            <Sidebar badges={badges}/>
          </div>
        )}
        {/* Drawer mobile */}
        {isMobile&&drawer&&(
          <>
            <div style={{position:'fixed',inset:0,background:'rgba(15,23,42,.5)',zIndex:200}} onClick={()=>setDrawer(false)}/>
            <div style={{position:'fixed',top:0,left:0,bottom:0,zIndex:201,boxShadow:'4px 0 24px rgba(15,23,42,.2)'}}>
              <Sidebar badges={badges} onNav={()=>setDrawer(false)}/>
            </div>
          </>
        )}
        {/* Main */}
        <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
          {isMobile&&(
            <header style={{background:C.sidebar,padding:'0 16px',height:54,display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <div style={{width:30,height:30,borderRadius:8,background:'linear-gradient(135deg,#16a34a,#059669)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,color:'#fff'}}>+</div>
                <span style={{fontSize:14,fontWeight:700,color:'#f1f5f9'}}>SEP Sistema</span>
              </div>
              <button onClick={()=>setDrawer(true)} style={{background:'none',border:'none',color:'#94a3b8',cursor:'pointer',padding:8}}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
              </button>
            </header>
          )}
          <main style={{flex:1,overflowY:'auto',padding:isMobile?'20px 16px':'28px 32px'}}>
            <Routes>
              <Route path="/"                element={<Dashboard/>}/>
              <Route path="/triagem"         element={<Triagem/>}/>
              <Route path="/fila"            element={<FilaEspera/>}/>
              <Route path="/pacientes"       element={<Pacientes/>}/>
              <Route path="/agendamentos"    element={<Agendamentos/>}/>
              <Route path="/estagiarios"     element={<Estagiarios/>}/>
              <Route path="/slots-pendentes" element={<SlotsPendentes/>}/>
              <Route path="/prontuarios"     element={<ProntuariosSupervisor/>}/>
              <Route path="/altas"           element={<AltasSupervisor/>}/>
              <Route path="/usuarios"        element={<GestaoUsuarios/>}/>
              <Route path="/seguranca"       element={<Seguranca/>}/>
            </Routes>
          </main>
        </div>
      </div>

      {/* Toast */}
      {toast&&(
        <div style={{position:'fixed',bottom:24,right:24,zIndex:2000,background:C.text,color:'#fff',
          padding:'12px 18px',borderRadius:10,fontSize:13,fontWeight:600,
          boxShadow:'0 8px 32px rgba(15,23,42,.3)',animation:'toastIn .25s ease',maxWidth:340}}>
          {toast}
        </div>
      )}
    </ToastCtx.Provider>
  )
}

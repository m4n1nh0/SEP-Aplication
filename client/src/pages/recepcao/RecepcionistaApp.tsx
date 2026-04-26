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
import { Bar, Doughnut } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, ChartTooltip, Legend)

// ── Design tokens — Recepcionista (teal/verde) ──
const C = {
  bg:'#faf9f6', surface:'#ffffff', surfaceAlt:'#f5f4f0',
  border:'#e7e5e4', borderMed:'#d6d3d1',
  text:'#1c1917', sub:'#57534e', muted:'#a8a29e',
  green:'#16a34a', greenD:'#14532d', greenL:'#dcfce7',
  red:'#dc2626', redL:'#fef2f2',
  amber:'#b45309', amberL:'#fef3c7',
  teal:'#0891b2', tealL:'#cffafe', tealD:'#0e7490',
  purple:'#7c3aed', purpleL:'#ede9fe',
  blue:'#0891b2', blueL:'#cffafe', blueMid:'#0891b2',
  sidebar:'#0a1e24',
  sideActive:'linear-gradient(135deg,#0e7490,#0891b2)',
}

// ── Toast ──────────────────────────────────────────────────
const ToastCtx = React.createContext<(m:string,t?:'ok'|'err')=>void>(()=>{})
const useToast = () => React.useContext(ToastCtx)

// ── Componentes base ───────────────────────────────────────
const Chip = ({label,color,bg,sm}:{label:string;color:string;bg:string;sm?:boolean}) => (
  <span style={{display:'inline-flex',alignItems:'center',background:bg,color,borderRadius:6,
    padding:sm?'2px 8px':'3px 10px',fontSize:sm?11:12,fontWeight:600,whiteSpace:'nowrap'}}>{label}</span>
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

const Btn = ({children,onClick,v='primary',size='md',disabled,full,icon}:{
  children:React.ReactNode;onClick?:()=>void;
  v?:'primary'|'danger'|'ghost'|'success'|'outline'|'teal';
  size?:'sm'|'md'|'lg';disabled?:boolean;full?:boolean;icon?:string
}) => {
  const vs:any = {
    primary:{background:C.blue,color:'#fff',border:'none'},
    teal:{background:C.teal,color:'#fff',border:'none'},
    danger:{background:C.red,color:'#fff',border:'none'},
    success:{background:C.green,color:'#fff',border:'none'},
    ghost:{background:'transparent',color:C.sub,border:`1.5px solid ${C.border}`},
    outline:{background:'transparent',color:C.teal,border:`1.5px solid ${C.teal}`},
  }
  const p={sm:'6px 14px',md:'9px 18px',lg:'12px 24px'}
  const f={sm:12,md:13,lg:14}
  return (
    <button onClick={onClick} disabled={disabled} style={{
      ...vs[v],padding:p[size],borderRadius:8,fontSize:f[size],fontWeight:600,
      cursor:disabled?'not-allowed':'pointer',opacity:disabled?.5:1,
      display:'inline-flex',alignItems:'center',gap:6,minHeight:36,
      width:full?'100%':undefined,justifyContent:full?'center':undefined,
      transition:'opacity .15s',fontFamily:'inherit',
    }}>
      {icon&&<span style={{fontSize:13}}>{icon}</span>}{children}
    </button>
  )
}

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
      fontFamily:'inherit',minHeight:72,boxSizing:'border-box',...p.style}}/>
  </div>
)

const Card = ({children,style}:{children:React.ReactNode;style?:React.CSSProperties}) => (
  <div style={{background:C.surface,borderRadius:12,border:`1px solid ${C.border}`,
    boxShadow:'0 1px 4px rgba(15,23,42,.06)',...style}}>{children}</div>
)

const Spin = () => (
  <div style={{display:'flex',alignItems:'center',justifyContent:'center',padding:64}}>
    <div style={{width:32,height:32,border:`3px solid ${C.border}`,borderTopColor:C.teal,
      borderRadius:'50%',animation:'spin 1s linear infinite'}}/>
  </div>
)

// ── Modal ──────────────────────────────────────────────────
const Modal = ({title,subtitle,onClose,children,width=600}:{
  title:string;subtitle?:string;onClose:()=>void;children:React.ReactNode;width?:number
}) => {
  const {isMobile} = useResponsive()
  return (
    <div onClick={onClose} style={{
      position:'fixed',inset:0,zIndex:1000,background:'rgba(15,23,42,.6)',backdropFilter:'blur(3px)',
      display:'flex',alignItems:isMobile?'flex-end':'center',
      justifyContent:'center',padding:isMobile?0:'20px 16px',
    }}>
      <div onClick={e=>e.stopPropagation()} style={{
        width:'100%',maxWidth:width,background:C.surface,
        borderRadius:isMobile?'20px 20px 0 0':14,
        boxShadow:'0 20px 60px rgba(15,23,42,.2)',
        border:`1px solid ${C.border}`,display:'flex',flexDirection:'column',
        maxHeight:isMobile?'92vh':'88vh',
        animation:isMobile?'slideUp .25s ease':'fadeInM .2s ease',
      }}>
        {isMobile&&<div style={{padding:'12px 0 4px',display:'flex',justifyContent:'center',flexShrink:0}}>
          <div style={{width:36,height:4,background:C.border,borderRadius:2}}/>
        </div>}
        <div style={{padding:isMobile?'14px 20px 12px':'20px 24px 16px',
          borderBottom:`1px solid ${C.border}`,flexShrink:0,
          display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:12}}>
          <div>
            <h2 style={{fontSize:17,fontWeight:700,color:C.text,margin:0,lineHeight:1.3}}>{title}</h2>
            {subtitle&&<p style={{fontSize:12,color:C.muted,marginTop:3}}>{subtitle}</p>}
          </div>
          <button onClick={onClose} style={{background:C.bg,border:`1px solid ${C.border}`,color:C.sub,
            width:32,height:32,borderRadius:8,display:'flex',alignItems:'center',
            justifyContent:'center',cursor:'pointer',fontSize:18,flexShrink:0,fontFamily:'inherit'}}>×</button>
        </div>
        <div style={{padding:isMobile?'16px 20px 32px':'20px 24px 24px',overflowY:'auto',flex:1}}>
          {children}
        </div>
      </div>
    </div>
  )
}

const InfoBox = ({k,v}:{k:string;v:string}) => (
  <div style={{background:C.bg,borderRadius:8,padding:'10px 12px'}}>
    <div style={{fontSize:11,color:C.muted,marginBottom:3}}>{k}</div>
    <div style={{fontSize:13,fontWeight:600,color:C.text}}>{v}</div>
  </div>
)

// ── Sidebar ─────────────────────────────────────────────────
const HORARIOS_DISP = ['08:00','09:00','10:00','11:00','13:00','14:00','15:00','16:00','18:00','19:00']

const parseDisponibilidade = (valor:any): Record<string,string[]> => {
  if (!valor) return {}
  try {
    const parsed = typeof valor === 'string' ? JSON.parse(valor) : valor
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    return Object.entries(parsed).reduce<Record<string,string[]>>((acc,[dia,horas])=>{
      if (Array.isArray(horas)) {
        const lista = horas.filter((h): h is string => typeof h === 'string' && h.trim().length > 0)
        if (lista.length) acc[dia] = lista
      }
      return acc
    },{})
  } catch {
    return {}
  }
}

const normalizarDisponibilidade = (valor:Record<string,string[]>): Record<string,string[]> =>
  Object.entries(valor).reduce<Record<string,string[]>>((acc,[dia,horas])=>{
    const lista = Array.from(new Set((horas||[]).filter(h=>h && h.trim().length > 0)))
    if (lista.length) acc[dia] = lista
    return acc
  },{})

const NAV = [
  {to:'/recepcao',              end:true,  label:'Início do dia',      icon:'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6'},
  {to:'/recepcao/fila',         end:false, label:'Fila de Espera',     icon:'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'},
  {to:'/recepcao/agenda',       end:false, label:'Agenda',             icon:'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'},
  {to:'/recepcao/pacientes',    end:false, label:'Pacientes',          icon:'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z'},
  {to:'/recepcao/estagiarios',  end:false, label:'Estagiários',        icon:'M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0112 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z'},
  {to:'/recepcao/cadastrar',    end:false, label:'Cadastrar Paciente', icon:'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z'},
  {to:'/recepcao/agendar',      end:false, label:'Agendar Consulta',   icon:'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'},
  {to:'/recepcao/triagem',      end:false, label:'Triagem',            icon:'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4'},
]
const Ico = ({d}:{d:string}) => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d}/></svg>
)

function Sidebar({badges,onNav}:{badges:any;onNav?:()=>void}) {
  const {user,logout} = useAuth()
  const nav = useNavigate()
  return (
    <div style={{background:C.sidebar,height:'100%',width:230,display:'flex',flexDirection:'column',overflow:'hidden'}}>
      <div style={{padding:'20px 16px 16px',borderBottom:'1px solid rgba(255,255,255,.07)',display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
        <div style={{width:36,height:36,borderRadius:10,background:'linear-gradient(135deg,#0e7490,#0891b2)',
          display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,
          boxShadow:'0 4px 12px rgba(13,148,136,.4)'}}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
            <path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
          </svg>
        </div>
        <div>
          <div style={{fontSize:14,fontWeight:700,color:'#f1f5f9',letterSpacing:'-.01em'}}>SEP Sistema</div>
          <div style={{fontSize:10,color:'#475569',marginTop:1}}>Recepção / Atendimento</div>
        </div>
      </div>

      <div style={{margin:'10px 12px',padding:'10px 12px',background:'rgba(255,255,255,.05)',
        borderRadius:10,display:'flex',alignItems:'center',gap:10}}>
        <div style={{width:32,height:32,borderRadius:'50%',background:'linear-gradient(135deg,#0e7490,#0891b2)',
          display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,color:'#fff',flexShrink:0}}>
          {user?.nome?.charAt(0)||'R'}
        </div>
        <div style={{overflow:'hidden'}}>
          <div style={{fontSize:12,fontWeight:600,color:'#e2e8f0',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
            {user?.nome?.split(' ')[0]}
          </div>
          <div style={{fontSize:10,color:'#64748b'}}>Assistente Administrativo</div>
        </div>
      </div>

      <nav style={{flex:1,padding:'4px 10px',display:'flex',flexDirection:'column',gap:1,overflowY:'auto'}}>
        <div style={{fontSize:10,fontWeight:700,color:'#475569',textTransform:'uppercase',letterSpacing:'.08em',padding:'8px 10px 4px'}}>
          Operações
        </div>
        {NAV.map(lk=>(
          <NavLink key={lk.to} to={lk.to} end={lk.end} onClick={onNav}
            style={({isActive})=>({
              display:'flex',alignItems:'center',gap:10,
              padding:'9px 12px',borderRadius:9,
              color:isActive?'#fff':'#94a3b8',
              background:isActive?'linear-gradient(135deg,#0e7490,#0891b2)':'transparent',
              fontWeight:isActive?600:400,textDecoration:'none',
              fontSize:13,transition:'all .15s',minHeight:40,
              boxShadow:isActive?'0 2px 8px rgba(13,148,136,.3)':'none',
            })}>
            <span style={{opacity:.85,flexShrink:0}}><Ico d={lk.icon}/></span>
            {lk.label}
          </NavLink>
        ))}
      </nav>

      <div style={{padding:'8px 10px 16px'}}>
        <button onClick={()=>{logout();nav('/')}} style={{
          width:'100%',padding:'9px 12px',borderRadius:9,border:'none',
          background:'rgba(239,68,68,.1)',color:'#f87171',fontSize:13,fontWeight:500,
          cursor:'pointer',display:'flex',alignItems:'center',gap:10,fontFamily:'inherit',
        }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
          </svg>
          Sair
        </button>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// PÁGINAS
// ══════════════════════════════════════════════════════════

// ── Dashboard da recepção ──────────────────────────────────
function DashboardRecepcao() {
  const [d,setD] = useState<any>(null)
  const toast = useToast()
  const location = useLocation()
  const nav = useNavigate()
  useEffect(()=>{
    api.recepDashboard().then(setD).catch(console.error)
  },[location.pathname])
  if(!d) return <Spin/>
  const filaTotal = (d.fila.aguardando||0) + (d.fila.em_contato||0)
  const confirmacaoPct = d.hoje.total ? Math.round(((d.hoje.confirmados||0) / d.hoje.total) * 100) : 0
  const precisaAcao = (d.fila.com_risco||0) + (d.aguardandoSemContato||0) + (d.hoje.pendentes||0)
  const chartText = C.sub
  const chartGrid = 'rgba(231,229,228,.75)'
  const filaChartData = {
    labels: ['Aguardando','Em contato','Muito urgentes'],
    datasets: [{
      label: 'Pacientes',
      data: [d.fila.aguardando||0,d.fila.em_contato||0,d.fila.muito_urgentes||0],
      backgroundColor: [C.amber,C.teal,C.red],
      borderRadius: 5,
      maxBarThickness: 28,
    }],
  }
  const filaChartOptions:any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { backgroundColor: '#1c1917', titleColor: '#fff', bodyColor: '#fff', padding: 10 },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: chartText, font: { size: 11 } } },
      y: { beginAtZero: true, grid: { color: chartGrid }, ticks: { color: chartText, precision: 0 } },
    },
  }
  const agendaOutros = Math.max((d.hoje.total||0) - (d.hoje.confirmados||0) - (d.hoje.pendentes||0), 0)
  const agendaValores = [d.hoje.confirmados||0,d.hoje.pendentes||0,agendaOutros]
  const agendaSemDados = agendaValores.every(v=>v===0)
  const agendaChartData = {
    labels: agendaSemDados ? ['Sem consultas'] : ['Confirmadas','Pendentes','Outras'],
    datasets: [{
      data: agendaSemDados ? [1] : agendaValores,
      backgroundColor: agendaSemDados ? [C.border] : [C.green,C.purple,C.muted],
      borderColor: C.surface,
      borderWidth: 3,
      hoverOffset: 6,
    }],
  }
  const agendaChartOptions:any = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '68%',
    plugins: {
      legend: { position: 'bottom', labels: { color: chartText, boxWidth: 10, boxHeight: 10, usePointStyle: true, font: { size: 12 } } },
      tooltip: { enabled: !agendaSemDados, backgroundColor: '#1c1917', titleColor: '#fff', bodyColor: '#fff', padding: 10 },
    },
  }

  return (
    <div>
      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,
        padding:'20px 22px',marginBottom:18,boxShadow:'0 10px 30px rgba(28,25,23,.06)'}}>
        <div style={{display:'flex',justifyContent:'space-between',gap:14,flexWrap:'wrap',alignItems:'flex-start'}}>
          <div>
            <div style={{fontSize:11,fontWeight:800,color:C.teal,textTransform:'uppercase',
              letterSpacing:'.08em',marginBottom:6}}>Operação da recepção</div>
            <h1 style={{fontSize:24,fontWeight:850,color:C.text,marginBottom:5}}>Início do Dia</h1>
            <p style={{fontSize:13,color:C.muted}}>{new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'})}</p>
          </div>
          <div style={{display:'flex',gap:8,flexWrap:'wrap',justifyContent:'flex-end'}}>
            <button onClick={()=>nav('/recepcao/fila')} style={{padding:'8px 12px',borderRadius:8,
              border:`1px solid ${C.teal}35`,background:C.tealL,color:C.tealD,fontSize:12,
              fontWeight:800,cursor:'pointer',fontFamily:'inherit'}}>Abrir fila</button>
            <button onClick={()=>nav('/recepcao/agendar')} style={{padding:'8px 12px',borderRadius:8,
              border:`1px solid ${C.border}`,background:C.bg,color:C.sub,fontSize:12,
              fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>Agendar</button>
          </div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:10,marginTop:18}}>
          {[
            {l:'Fila ativa',v:filaTotal,s:'pacientes aguardando',c:C.teal,bg:C.tealL},
            {l:'Ação agora',v:precisaAcao,s:'pendências críticas',c:precisaAcao?C.amber:C.green,bg:precisaAcao?C.amberL:C.greenL},
            {l:'Consultas hoje',v:d.hoje.total||0,s:`${confirmacaoPct}% confirmadas`,c:C.green,bg:C.greenL},
            {l:'Com risco',v:d.fila.com_risco||0,s:'prioridade máxima',c:(d.fila.com_risco||0)>0?C.red:C.green,bg:(d.fila.com_risco||0)>0?C.redL:C.greenL},
          ].map(item=>(
            <div key={item.l} style={{background:item.bg,border:`1px solid ${item.c}25`,borderRadius:8,padding:'12px 14px'}}>
              <div style={{fontSize:22,fontWeight:900,color:item.c,lineHeight:1}}>{item.v}</div>
              <div style={{fontSize:12,fontWeight:800,color:C.text,marginTop:6}}>{item.l}</div>
              <div style={{fontSize:11,color:C.sub,marginTop:2}}>{item.s}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Alertas */}
      {(d.fila.com_risco>0||d.aguardandoSemContato>0)&&(
        <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:18}}>
          {d.fila.com_risco>0&&(
            <div style={{background:C.redL,border:`1px solid ${C.red}40`,borderLeft:`4px solid ${C.red}`,borderRadius:8,padding:'12px 16px',display:'flex',alignItems:'center',gap:12,boxShadow:'0 6px 18px rgba(220,38,38,.08)'}}>
              <span style={{fontSize:20}}>⚠️</span>
              <div><div style={{fontSize:14,fontWeight:700,color:C.red}}>{d.fila.com_risco} paciente(s) com risco na fila</div><div style={{fontSize:12,color:'#991b1b'}}>Prioridade máxima — entre em contato imediatamente</div></div>
            </div>
          )}
          {d.aguardandoSemContato>0&&(
            <div style={{background:C.amberL,border:`1px solid ${C.amber}40`,borderLeft:`4px solid ${C.amber}`,borderRadius:8,padding:'12px 16px',display:'flex',alignItems:'center',gap:12,boxShadow:'0 6px 18px rgba(180,83,9,.08)'}}>
              <span style={{fontSize:20}}>📞</span>
              <div><div style={{fontSize:14,fontWeight:700,color:C.amber}}>{d.aguardandoSemContato} paciente(s) sem contato há mais de 3 dias</div><div style={{fontSize:12,color:'#92400e'}}>Verificar e entrar em contato</div></div>
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:12,marginBottom:20}}>
        {[
          {v:d.fila.aguardando, l:'Aguardando contato', c:C.amber, bg:C.amberL, i:'⏳'},
          {v:d.fila.em_contato, l:'Em contato',         c:C.teal,  bg:C.tealL,  i:'📞'},
          {v:d.fila.muito_urgentes, l:'Muito urgentes', c:C.red,   bg:C.redL,   i:'🚨'},
          {v:d.hoje.total,     l:'Consultas hoje',      c:C.blue,  bg:C.blueL,  i:'📅'},
          {v:d.hoje.confirmados, l:'Confirmadas',       c:C.green, bg:C.greenL, i:'✅'},
          {v:d.hoje.pendentes, l:'Aguard. confirmação', c:C.purple,bg:C.purpleL,i:'🔔'},
        ].map(s=>(
          <div key={s.l} style={{background:C.surface,borderRadius:8,padding:'14px 16px',
            border:`1px solid ${C.border}`,boxShadow:'0 6px 18px rgba(28,25,23,.045)',
            position:'relative',overflow:'hidden'}}>
            <div style={{position:'absolute',left:0,top:0,bottom:0,width:3,background:s.c}}/>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8}}>
              <div>
                <div style={{fontSize:24,fontWeight:900,color:s.c,lineHeight:1,marginBottom:5}}>{s.v||0}</div>
                <div style={{fontSize:11,color:C.muted,fontWeight:700,textTransform:'uppercase',letterSpacing:'.04em'}}>{s.l}</div>
              </div>
              <div style={{width:34,height:34,borderRadius:8,background:s.bg,display:'grid',placeItems:'center',fontSize:18}}>{s.i}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:14,marginBottom:20}}>
        <Card style={{borderRadius:8,padding:18,boxShadow:'0 8px 24px rgba(28,25,23,.05)'}}>
          <div style={{display:'flex',justifyContent:'space-between',gap:10,alignItems:'flex-start',marginBottom:12}}>
            <div>
              <h3 style={{fontSize:14,fontWeight:800,color:C.text,marginBottom:3}}>Fila por prioridade operacional</h3>
              <p style={{fontSize:12,color:C.muted}}>Pacientes que precisam de contato ou evolução para agendamento.</p>
            </div>
            <Chip label={`${filaTotal} na fila`} color={C.teal} bg={C.tealL} sm/>
          </div>
          <div style={{height:220}}>
            <Bar data={filaChartData} options={filaChartOptions}/>
          </div>
        </Card>
        <Card style={{borderRadius:8,padding:18,boxShadow:'0 8px 24px rgba(28,25,23,.05)'}}>
          <h3 style={{fontSize:14,fontWeight:800,color:C.text,marginBottom:3}}>Confirmações do dia</h3>
          <p style={{fontSize:12,color:C.muted,marginBottom:12}}>Status das consultas agendadas para hoje.</p>
          <div style={{height:220}}>
            <Doughnut data={agendaChartData} options={agendaChartOptions}/>
          </div>
        </Card>
      </div>

      {/* Próximas consultas */}
      {d.proximasConsultas?.length>0&&(
        <Card style={{borderRadius:8,overflow:'hidden',boxShadow:'0 8px 24px rgba(28,25,23,.05)'}}>
          <div style={{padding:'14px 20px',borderBottom:`1px solid ${C.border}`,display:'flex',justifyContent:'space-between',alignItems:'center',background:C.surfaceAlt}}>
            <div>
              <h3 style={{fontSize:14,fontWeight:800,color:C.text}}>Próximas consultas de hoje</h3>
              <div style={{fontSize:11,color:C.muted,marginTop:2}}>Priorize confirmações pendentes antes do horário.</div>
            </div>
            <button onClick={()=>nav('/recepcao/agenda')} style={{padding:'7px 11px',borderRadius:8,
              border:`1px solid ${C.border}`,background:C.surface,color:C.sub,fontSize:12,
              fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>Ver agenda</button>
          </div>
          {d.proximasConsultas.map((a:any,i:number)=>(
            <div key={a.id} style={{display:'flex',alignItems:'center',gap:10,padding:'12px 20px',borderBottom:i<d.proximasConsultas.length-1?`1px solid ${C.border}`:'none',flexWrap:'wrap'}}>
              <div style={{textAlign:'center',background:C.tealL,borderRadius:10,padding:'8px 12px',flexShrink:0,minWidth:54}}>
                <div style={{fontSize:17,fontWeight:800,color:C.teal,lineHeight:1}}>{fmtHora(a.data_hora_inicio).split(':')[0]}</div>
                <div style={{fontSize:11,color:C.tealD}}>{fmtHora(a.data_hora_inicio).split(':')[1]}h</div>
              </div>
              <div style={{flex:1,minWidth:140}}>
                <div style={{fontWeight:700,fontSize:14,color:C.text,marginBottom:2}}>{a.paciente_nome}</div>
                <div style={{fontSize:12,color:C.muted}}>👩‍⚕️ {a.estagiario_nome} · {a.modalidade==='presencial'&&a.sala?`🚪 ${a.sala}`:'💻 Online'}</div>
              </div>
              <Chip label={a.status==='confirmado'?'Confirmado':'Aguard. confirmação'} color={a.status==='confirmado'?C.green:C.amber} bg={a.status==='confirmado'?C.greenL:C.amberL} sm/>
              {a.status!=='confirmado'&&(
                <Btn v="teal" size="sm" icon="✓" onClick={async()=>{
                  await api.recepConfirmar(a.id)
                  toast('✅ Consulta confirmada!')
                  setD((prev:any)=>({...prev,proximasConsultas:prev.proximasConsultas.map((x:any)=>x.id===a.id?{...x,status:'confirmado'}:x)}))
                }}>Confirmar</Btn>
              )}
            </div>
          ))}
        </Card>
      )}
    </div>
  )
}

// ── Fila de espera (operacional) ──────────────────────────
function FilaRecepcao() {
  const [fila,setFila]     = useState<any[]>([])
  const [sel,setSel]       = useState<any>(null)
  const [contato,setCtato] = useState({tipo:'ligacao',mensagem:'',resultado:'atendeu'})
  const [modoModal,setModoModal] = useState<'contato'|'disponibilidade'>('contato')
  const [dispEdit,setDispEdit] = useState<Record<string,string[]>>({})
  const [salvandoDisp,setSalvandoDisp] = useState(false)
  const [load,setLoad]     = useState(true)
  const toast = useToast()
  const nav = useNavigate()

  const location = useLocation()
  useEffect(()=>{
    setLoad(true)
    api.recepFila().then(setFila).catch(console.error).finally(()=>setLoad(false))
  },[location.pathname])

  const registrarContato = async()=>{
    await api.recepContatar(sel.id, contato)
    if(contato.resultado==='atendeu'){
      setFila(f=>f.map(p=>p.id===sel.id?{...p,status:'em_contato',total_contatos:(p.total_contatos||0)+1,ultimo_contato:new Date().toISOString()}:p))
    } else {
      setFila(f=>f.map(p=>p.id===sel.id?{...p,total_contatos:(p.total_contatos||0)+1,ultimo_contato:new Date().toISOString()}:p))
    }
    setSel(null)
    setModoModal('contato')
    setDispEdit({})
    setCtato({tipo:'ligacao',mensagem:'',resultado:'atendeu'})
    toast('✅ Contato registrado com sucesso!')
  }

  const abrirContato = (p:any, modo:'contato'|'disponibilidade'='contato') => {
    setSel(p)
    setModoModal(modo)
    setDispEdit(parseDisponibilidade(p.disponibilidade))
  }

  const toggleDisponibilidade = (dia:string,hora:string) => {
    setDispEdit(prev=>{
      const atual = prev[dia]||[]
      const next = atual.includes(hora) ? atual.filter(h=>h!==hora) : [...atual,hora]
      const novo = {...prev}
      if (next.length) novo[dia] = next
      else delete novo[dia]
      return novo
    })
  }

  const salvarDisponibilidade = async () => {
    if (!sel) return
    setSalvandoDisp(true)
    try {
      const disponibilidade = normalizarDisponibilidade(dispEdit)
      const data = await api.recepDisponib(sel.id, disponibilidade)
      const nova = data.disponibilidade || disponibilidade
      setDispEdit(nova)
      setSel((s:any)=>s?{...s,disponibilidade:nova}:s)
      setFila(f=>f.map(p=>p.id===sel.id?{...p,disponibilidade:nova}:p))
      toast('âœ… Disponibilidade atualizada!')
    } catch(e:any) {
      toast('âŒ '+(e.response?.data?.error||e.message||'Erro ao salvar disponibilidade'), 'err')
    } finally {
      setSalvandoDisp(false)
    }
  }

  const pendenciasAgendamento = (p:any) => {
    const pendencias:string[] = []
    if ((p.total_contatos||0) < 1) pendencias.push('Registrar contato')
    if (p.status !== 'em_contato') pendencias.push('Contato efetivo')
    if (p.tem_agendamento_ativo===1) pendencias.push('Agendamento ativo')
    return pendencias
  }

  const podeAgendar = (p:any) =>
    p.status === 'em_contato' && (p.total_contatos||0) > 0 && p.tem_agendamento_ativo!==1

  const abrirAgendamento = (p:any) => {
    const pendencias = pendenciasAgendamento(p)
    if (pendencias.length) {
      toast(`Pendencias para agendar: ${pendencias.join(', ')}`, 'err')
      return
    }
    nav(`/recepcao/agendar?paciente_id=${p.id}`)
  }

  const totalDispEdit = Object.values(dispEdit).reduce((total,horas)=>total+horas.length,0)

  if(load) return <Spin/>
  return (
    <div>
      <div style={{marginBottom:22}}>
        <h1 style={{fontSize:22,fontWeight:700,color:C.text,marginBottom:4}}>Fila de Espera</h1>
        <p style={{fontSize:13,color:C.muted}}>{fila.length} paciente(s) aguardando atendimento · ordenados por risco → urgência → data</p>
      </div>
      <Card>
        {!fila.length&&<div style={{padding:48,textAlign:'center'}}><div style={{fontSize:32,marginBottom:12}}>✅</div><p style={{color:C.muted}}>Fila vazia — todos foram contatados!</p></div>}
        {fila.map((p,i)=>(
          <div key={p.id} style={{
            display:'flex',alignItems:'center',gap:10,padding:'13px 20px',
            borderBottom:i<fila.length-1?`1px solid ${C.border}`:'none',
            background:p.risco_suicidio?C.redL:i===0?'#fefce8':C.surface,
            flexWrap:'wrap',
          }}>
            <div style={{width:30,height:30,borderRadius:'50%',flexShrink:0,
              background:(U_COR[p.urgencia]||C.muted)+'20',color:U_COR[p.urgencia]||C.muted,
              display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:800}}>
              {p.posicao_fila||i+1}
            </div>
            <div style={{flex:1,minWidth:160}}>
              <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:3,flexWrap:'wrap'}}>
                <span style={{fontWeight:700,fontSize:14,color:C.text}}>{p.nome}</span>
                {p.risco_suicidio===1&&<Chip label="⚠ RISCO" color={C.red} bg={C.redL} sm/>}
                {uChip(p.urgencia)}{sChip(p.status)}
                {p.total_contatos>0&&<Chip label={`${p.total_contatos} contato(s)`} color={C.teal} bg={C.tealL} sm/>}
                {p.tem_agendamento_ativo===1&&<Chip label="✅ Agendado" color={C.green} bg={C.greenL} sm/>}
              </div>
              <div style={{fontSize:12,color:C.muted}}>
                #{p.posicao_fila||''} · {p.telefone} · {p.dias_espera}d na fila
                {p.ultimo_contato&&` · Últ. contato: ${fmtData(p.ultimo_contato)}`}
              </div>
            </div>
            <div style={{fontSize:11,color:podeAgendar(p)?C.green:C.amber,marginTop:4,fontWeight:600,flexBasis:'100%',paddingLeft:40}}>
              Posicao #{p.posicao_fila||i+1} · {podeAgendar(p)
                ? 'Pronto para agendar'
                : `Pendente: ${pendenciasAgendamento(p).join(', ')}`}
            </div>
            <div onClick={(e)=>{
              const btn = (e.target as HTMLElement).closest('button')
              if (btn?.textContent?.includes('Agendar')) abrirAgendamento(p)
            }} style={{display:'flex',gap:7,flexShrink:0,flexWrap:'wrap'}}>
              <Btn v="teal" size="sm" icon="📞" onClick={()=>abrirContato(p)}>Registrar Contato</Btn>
              <Btn v="ghost" size="sm" icon="⏱" onClick={()=>abrirContato(p,'disponibilidade')}>Disponibilidade</Btn>
              <Btn v="outline" size="sm" icon="📅" onClick={()=>{}}>Agendar</Btn>
            </div>
          </div>
        ))}
      </Card>

      {sel&&(
        <Modal title={`${modoModal==='disponibilidade'?'Atualizar disponibilidade':'Registrar contato'} — ${sel.nome}`} subtitle={`${fmtCPF(sel.cpf)} · ${sel.telefone}${sel.whatsapp?` · WhatsApp: ${sel.whatsapp}`:''}`} onClose={()=>setSel(null)}>
          {/* Info rápida */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:16}}>
            <InfoBox k="Urgência" v={U_LBL[sel.urgencia]||sel.urgencia}/>
            <InfoBox k="Dias na fila" v={`${sel.dias_espera} dias`}/>
            <InfoBox k="Contatos anteriores" v={`${sel.total_contatos||0} registro(s)`}/>
          </div>
          <div style={{background:C.bg,borderRadius:8,padding:'10px 14px',fontSize:13,color:C.sub,lineHeight:1.6,borderLeft:`3px solid ${C.teal}`,marginBottom:16}}>
            {sel.motivo_busca?.slice(0,200)}{(sel.motivo_busca?.length||0)>200?'…':''}
          </div>

          <div style={{marginBottom:16,background:C.bg,borderRadius:10,padding:'12px 14px',border:`1px solid ${C.border}`}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10,marginBottom:12,flexWrap:'wrap'}}>
              <div>
                <div style={{fontSize:12,fontWeight:700,color:C.text}}>Disponibilidade do paciente</div>
                <div style={{fontSize:11,color:C.muted,marginTop:2}}>
                  {totalDispEdit ? `${totalDispEdit} horario(s) marcado(s)` : 'Nenhum horario marcado'}
                </div>
              </div>
              <Btn v="outline" size="sm" onClick={salvarDisponibilidade} disabled={salvandoDisp}>
                {salvandoDisp?'Salvando...':'Salvar disponibilidade'}
              </Btn>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {Object.entries(DIA_LBL).map(([dia,label])=>{
                const atual = dispEdit[dia]||[]
                return (
                  <div key={dia}>
                    <div style={{fontSize:11,fontWeight:700,color:C.sub,marginBottom:6}}>{label}</div>
                    <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                      {HORARIOS_DISP.map(hora=>{
                        const ativo = atual.includes(hora)
                        return (
                          <button key={`${dia}-${hora}`} onClick={()=>toggleDisponibilidade(dia,hora)} style={{
                            padding:'6px 10px',borderRadius:8,fontSize:12,fontWeight:600,cursor:'pointer',
                            border:`1.5px solid ${ativo?C.teal:C.border}`,
                            background:ativo?C.tealL:C.surface,color:ativo?C.teal:C.muted,
                            fontFamily:'inherit',
                          }}>{hora}</button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {modoModal==='contato'&&(
          <div style={{display:'grid',gap:10,marginBottom:20}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <Sel label="Canal de contato" value={contato.tipo} onChange={e=>setCtato(c=>({...c,tipo:e.target.value}))}>
                <option value="ligacao">📞 Ligação telefônica</option>
                <option value="whatsapp">💬 WhatsApp</option>
                <option value="email">📧 E-mail</option>
              </Sel>
              <Sel label="Resultado" value={contato.resultado} onChange={e=>setCtato(c=>({...c,resultado:e.target.value}))}>
                <option value="atendeu">Atendeu — contato realizado</option>
                <option value="nao_atendeu">Não atendeu / caixa postal</option>
                <option value="remarcou">Pediu para ligar depois</option>
                <option value="agendado">Consulta agendada</option>
              </Sel>
            </div>
            <Txa label="Observações do contato (opcional)" rows={2} value={contato.mensagem} onChange={e=>setCtato(c=>({...c,mensagem:e.target.value}))} placeholder="Ex: Paciente confirmou disponibilidade para terça às 9h..."/>
          </div>
          )}

          {modoModal==='contato'?(
            <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
              <Btn v="ghost" onClick={()=>setSel(null)}>Cancelar</Btn>
              <Btn full v="teal" icon="✓" onClick={registrarContato}>Salvar contato</Btn>
            </div>
          ):(
            <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
              <Btn v="ghost" onClick={()=>setSel(null)}>Fechar</Btn>
              <Btn full v="teal" icon="✓" onClick={salvarDisponibilidade} disabled={salvandoDisp}>
                {salvandoDisp?'Salvando...':'Salvar disponibilidade'}
              </Btn>
            </div>
          )}
        </Modal>
      )}
    </div>
  )
}

// ── Agenda do dia ─────────────────────────────────────────
function AgendaHoje() {
  const [agenda,setAgenda] = useState<any[]>([])
  const [range,setRange] = useState<{start:string;end:string}|null>(null)
  const [sel,setSel] = useState<any>(null)
  const [selCancelar,setSelC] = useState<any>(null)
  const [selFalta,setSelFalta] = useState<any>(null)
  const [motivo,setMotivo]    = useState('')
  const [motivoFalta,setMotivoFalta] = useState('')
  const [load,setLoad]        = useState(false)
  const toast = useToast()

  useEffect(()=>{
    if(!range) return
    setLoad(true)
    api.adminAgendamentos({inicio:range.start,fim:range.end})
      .then(setAgenda)
      .catch(console.error)
      .finally(()=>setLoad(false))
  },[range?.start,range?.end])

  const confirmar = async(id:number)=>{
    await api.recepConfirmar(id)
    setAgenda(a=>a.map(x=>x.id===id?{...x,status:'confirmado'}:x))
    setSel((s:any)=>s?.id===id?{...s,status:'confirmado'}:s)
    toast('✅ Consulta confirmada!')
  }

  const cancelar = async()=>{
    if(!motivo||!selCancelar) return
    await api.recepCancelar(selCancelar.id, motivo)
    setAgenda(a=>a.map(x=>x.id===selCancelar.id?{...x,status:'cancelado_admin'}:x))
    setSel((s:any)=>s?.id===selCancelar.id?{...s,status:'cancelado_admin'}:s)
    setSelC(null); setMotivo('')
    toast('✅ Consulta cancelada. Paciente retornou à fila.')
  }

  const registrarFalta = async()=>{
    if(!selFalta) return
    try {
      const data = await api.adminRegistrarFalta(selFalta.id,motivoFalta || 'Paciente ausente no horário agendado')
      setAgenda(a=>a.map(x=>x.id===selFalta.id?{...x,status:'faltou',total_faltas:data.total_faltas,limite_faltas:data.limite_faltas}:x))
      setSel((s:any)=>s?.id===selFalta.id?{...s,status:'faltou',total_faltas:data.total_faltas,limite_faltas:data.limite_faltas}:s)
      setSelFalta(null); setMotivoFalta('')
      toast(data.message || 'Falta registrada.')
    } catch(e:any) {
      toast('❌ '+(e.response?.data?.error||e.message), 'err')
    }
  }

  const stCor:any = {confirmado:C.green,pendente:C.amber,cancelado_admin:C.red,cancelado_paciente:C.red,realizado:C.blue,faltou:C.purple}
  const stLbl:any = {confirmado:'Confirmado',pendente:'Aguardando confirmação',cancelado_admin:'Cancelado',cancelado_paciente:'Cancelado pelo paciente',realizado:'Realizado',faltou:'Faltou'}
  const agAtivo = (s:string) => s==='pendente'||s==='confirmado'

  return (
    <div>
      <div style={{marginBottom:22}}>
        <h1 style={{fontSize:22,fontWeight:800,color:C.text,marginBottom:4}}>Agenda</h1>
        <p style={{fontSize:13,color:C.muted}}>{agenda.length} consulta(s) no periodo visivel</p>
      </div>
      <Card style={{padding:'16px 20px'}}>
        <AgendaCalendar
          items={agenda}
          loading={load}
          accent={C.teal}
          onRangeChange={setRange}
          onEventClick={setSel}
        />
      </Card>

      {sel&&(
        <Modal title={sel.paciente_nome} subtitle={fmtDT(sel.data_hora_inicio)} onClose={()=>setSel(null)}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
            <InfoBox k="Status" v={stLbl[sel.status]||sel.status}/>
            <InfoBox k="Telefone" v={sel.paciente_tel||'-'}/>
            <InfoBox k="Estagiario" v={sel.estagiario_nome||'-'}/>
            <InfoBox k="Modalidade" v={sel.modalidade||'-'}/>
            <InfoBox k="Sala" v={sel.sala||'-'}/>
            <InfoBox k="Sessao" v={sel.sessao_numero?`Sessao ${sel.sessao_numero}`:'-'}/>
            <InfoBox k="Horario" v={`${fmtHora(sel.data_hora_inicio)} - ${sel.data_hora_fim ? fmtHora(sel.data_hora_fim) : '--'}`}/>
            <InfoBox k="Faltas" v={`${sel.total_faltas||0}/${sel.limite_faltas||3}`}/>
          </div>
          {agAtivo(sel.status)&&(
            <div style={{display:'flex',gap:8,justifyContent:'flex-end',flexWrap:'wrap'}}>
              {sel.status!=='confirmado'&&(
                <Btn v="teal" icon="✓" onClick={()=>confirmar(sel.id)}>Confirmar consulta</Btn>
              )}
              <Btn v="outline" icon="!" onClick={()=>{setSelFalta(sel);setMotivoFalta('');setSel(null)}}>Registrar falta</Btn>
              <Btn v="ghost" icon="✖" onClick={()=>{setSelC(sel);setMotivo('');setSel(null)}}>Cancelar consulta</Btn>
            </div>
          )}
        </Modal>
      )}

      {selCancelar&&(
        <Modal title="Cancelar consulta" subtitle={`${selCancelar.paciente_nome} — ${fmtHora(selCancelar.data_hora_inicio)}`} onClose={()=>setSelC(null)}>
          <div style={{background:C.amberL,border:`1px solid ${C.amber}40`,borderRadius:9,padding:'10px 14px',fontSize:13,color:C.amber,marginBottom:16}}>
            ⚠ O paciente retornará automaticamente para a fila de espera.
          </div>
          <Txa label="Motivo do cancelamento *" rows={3} value={motivo} onChange={e=>setMotivo(e.target.value)} placeholder="Informe o motivo do cancelamento..."/>
          <div style={{display:'flex',gap:10,marginTop:20}}>
            <Btn v="ghost" onClick={()=>setSelC(null)}>Voltar</Btn>
            <Btn full v="danger" icon="✖" onClick={cancelar} disabled={!motivo}>Confirmar cancelamento</Btn>
          </div>
        </Modal>
      )}

      {selFalta&&(
        <Modal title="Registrar ausência" subtitle={`${selFalta.paciente_nome} — ${fmtHora(selFalta.data_hora_inicio)}`} onClose={()=>setSelFalta(null)}>
          <div style={{background:C.amberL,border:`1px solid ${C.amber}40`,borderRadius:9,padding:'10px 14px',fontSize:13,color:C.amber,marginBottom:16}}>
            Ao atingir o limite de faltas configurado, o paciente será desligado automaticamente do programa de atendimentos.
          </div>
          <InfoBox k="Controle de faltas" v={`${selFalta.total_faltas||0}/${selFalta.limite_faltas||3} registradas antes desta ausência`}/>
          <div style={{height:12}}/>
          <Txa label="Observação da ausência" rows={3} value={motivoFalta} onChange={e=>setMotivoFalta(e.target.value)} placeholder="Ex: paciente não compareceu e não justificou..."/>
          <div style={{display:'flex',gap:10,marginTop:20}}>
            <Btn v="ghost" onClick={()=>setSelFalta(null)}>Voltar</Btn>
            <Btn full v="teal" icon="!" onClick={registrarFalta}>Confirmar falta</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── Cadastrar paciente (recepcionista) ────────────────────
function CadastrarPaciente() {
  const [step,setStep] = useState(0)
  const [form,setForm] = useState<any>({urgencia:'sem_urgencia',ja_fez_terapia:false,uso_medicamento:false,risco_suicidio:false})
  const setF = (k:string,v:any) => setForm((p:any)=>({...p,[k]:v}))
  const [loading,setLoad] = useState(false)
  const toast = useToast()
  const nav = useNavigate()

  const salvar = async()=>{
    setLoad(true)
    try {
      const data = await api.recepCriarPac({...form,cpf:form.cpf?.replace(/\D/g,'')})
      if(!data.success) throw new Error(data.error)
      toast(`✅ Paciente cadastrado! ${data.senha_provisoria?`Senha provisória: ${data.senha_provisoria}`:''}`)
      nav('/recepcao/fila')
    } catch(e:any){ toast('❌ '+e.message) }
    finally{ setLoad(false) }
  }

  const STEPS = ['Dados Pessoais','Triagem Clínica','Disponibilidade','Acesso']
  const inp = (style?:React.CSSProperties):React.CSSProperties => ({
    width:'100%',padding:'10px 12px',borderRadius:8,border:`1.5px solid ${C.border}`,
    background:'#fff',color:C.text,fontSize:13,outline:'none',minHeight:40,
    boxSizing:'border-box',fontFamily:'inherit',...style
  })

  return (
    <div>
      <div style={{marginBottom:22}}>
        <h1 style={{fontSize:22,fontWeight:700,color:C.text,marginBottom:4}}>Cadastrar Paciente</h1>
        <p style={{fontSize:13,color:C.muted}}>Cadastro presencial — triagem já realizada pelo assistente</p>
      </div>

      <Card style={{maxWidth:700}}>
        {/* Progress */}
        <div style={{padding:'18px 24px',borderBottom:`1px solid ${C.border}`}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:12}}>
            {STEPS.map((s,i)=>(
              <div key={s} style={{textAlign:'center',flex:1}}>
                <div style={{width:28,height:28,borderRadius:'50%',margin:'0 auto 4px',display:'grid',placeItems:'center',
                  fontSize:11,fontWeight:700,
                  background:i<step?C.green:i===step?C.teal:C.border,
                  color:i<=step?'#fff':C.muted,transition:'all .3s'}}>
                  {i<step?'✓':i+1}
                </div>
                <div style={{fontSize:10,color:i===step?C.text:C.muted,fontWeight:i===step?700:400}}>{s}</div>
              </div>
            ))}
          </div>
          <div style={{height:3,background:C.border,borderRadius:2,overflow:'hidden'}}>
            <div style={{height:'100%',background:C.teal,width:`${(step/3)*100}%`,transition:'width .3s'}}/>
          </div>
        </div>

        <div style={{padding:'20px 24px'}}>
          {/* STEP 0 — Dados pessoais */}
          {step===0&&(
            <div style={{display:'grid',gap:12}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <Inp label="Nome completo *" value={form.nome||''} onChange={e=>setF('nome',e.target.value)} placeholder="Nome e sobrenome"/>
                <Inp label="CPF *" value={form.cpf||''} onChange={e=>setF('cpf',e.target.value)} placeholder="000.000.000-00"/>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <Inp label="Telefone *" type="tel" value={form.telefone||''} onChange={e=>setF('telefone',e.target.value)} placeholder="(79) 9 9999-9999"/>
                <Inp label="WhatsApp" type="tel" value={form.whatsapp||''} onChange={e=>setF('whatsapp',e.target.value)} placeholder="(79) 9 9999-9999"/>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <Inp label="Contato de emergência" type="tel" value={form.contato_emergencia||''} onChange={e=>setF('contato_emergencia',e.target.value)}/>
                <Inp label="Nome do contato" value={form.nome_emergencia||''} onChange={e=>setF('nome_emergencia',e.target.value)}/>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12}}>
                <Inp label="Data nascimento" type="date" value={form.data_nascimento||''} onChange={e=>setF('data_nascimento',e.target.value)}/>
                <Sel label="Gênero" value={form.genero||''} onChange={e=>setF('genero',e.target.value)}>
                  <option value="">Selecione</option>
                  <option value="masculino">Masculino</option>
                  <option value="feminino">Feminino</option>
                  <option value="nao_binario">Não-binário</option>
                  <option value="prefiro_nao_dizer">Prefiro não dizer</option>
                </Sel>
                <Sel label="Renda familiar" value={form.renda_familiar||''} onChange={e=>setF('renda_familiar',e.target.value)}>
                  <option value="">Selecione</option>
                  <option value="ate_1sm">Até 1 salário mínimo</option>
                  <option value="1_a_2sm">1 a 2 salários</option>
                  <option value="2_a_3sm">2 a 3 salários</option>
                  <option value="3_a_5sm">3 a 5 salários</option>
                  <option value="acima_5sm">Acima de 5 salários</option>
                </Sel>
              </div>
              <Sel label="Escolaridade" value={form.escolaridade||''} onChange={e=>setF('escolaridade',e.target.value)}>
                <option value="">Selecione</option>
                <option value="fundamental_incompleto">Fundamental incompleto</option>
                <option value="medio_completo">Médio completo</option>
                <option value="superior_incompleto">Superior incompleto</option>
                <option value="superior_completo">Superior completo</option>
              </Sel>
            </div>
          )}

          {/* STEP 1 — Triagem */}
          {step===1&&(
            <div style={{display:'grid',gap:12}}>
              <div>
                <label style={{fontSize:12,fontWeight:600,color:C.sub,display:'block',marginBottom:6}}>Motivo da busca por atendimento *</label>
                <textarea value={form.motivo_busca||''} onChange={e=>setF('motivo_busca',e.target.value)} rows={3}
                  style={{...inp(),resize:'vertical',minHeight:80}} placeholder="Descreva o que trouxe o paciente ao SEP..."/>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <Sel label="Tempo de sintomas" value={form.tempo_sintomas||''} onChange={e=>setF('tempo_sintomas',e.target.value)}>
                  <option value="">Selecione</option>
                  <option value="menos_1mes">Menos de 1 mês</option>
                  <option value="1_a_3meses">1 a 3 meses</option>
                  <option value="3_a_6meses">3 a 6 meses</option>
                  <option value="6_a_12meses">6 meses a 1 ano</option>
                  <option value="mais_1ano">Mais de 1 ano</option>
                </Sel>
                <Sel label="Intensidade percebida" value={form.intensidade_sintomas||''} onChange={e=>setF('intensidade_sintomas',e.target.value)}>
                  <option value="">Selecione</option>
                  <option value="leve">Leve</option>
                  <option value="moderado">Moderado</option>
                  <option value="intenso">Intenso</option>
                  <option value="muito_intenso">Muito intenso</option>
                </Sel>
              </div>
              <Sel label="Urgência" value={form.urgencia} onChange={e=>setF('urgencia',e.target.value)}>
                <option value="sem_urgencia">Sem urgência</option>
                <option value="pouco_urgente">Pouco urgente</option>
                <option value="urgente">Urgente</option>
                <option value="muito_urgente">Muito urgente</option>
              </Sel>
              <Sel label="Suporte social" value={form.suporte_social||''} onChange={e=>setF('suporte_social',e.target.value)}>
                <option value="">Selecione</option>
                <option value="nenhum">Nenhum / isolado</option>
                <option value="pouco">Pouco suporte</option>
                <option value="moderado">Suporte moderado</option>
                <option value="bom">Bom suporte</option>
              </Sel>
              <div style={{display:'grid',gap:8}}>
                {[
                  {k:'ja_fez_terapia',l:'Já realizou acompanhamento psicológico anteriormente'},
                  {k:'uso_medicamento',l:'Faz uso de medicação psiquiátrica'},
                  {k:'historico_internacao',l:'Histórico de internação psiquiátrica'},
                ].map(f=>(
                  <label key={f.k} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 12px',background:C.bg,borderRadius:8,border:`1px solid ${C.border}`,cursor:'pointer'}}>
                    <input type="checkbox" checked={!!form[f.k]} onChange={e=>setF(f.k,e.target.checked)} style={{width:16,height:16,accentColor:C.teal}}/>
                    <span style={{fontSize:13,color:C.text}}>{f.l}</span>
                  </label>
                ))}
                <div style={{border:`1.5px solid ${C.red}40`,borderRadius:9,padding:'12px 14px',background:C.redL}}>
                  <label style={{display:'flex',alignItems:'flex-start',gap:10,cursor:'pointer'}}>
                    <input type="checkbox" checked={!!form.risco_suicidio} onChange={e=>setF('risco_suicidio',e.target.checked)} style={{width:16,height:16,accentColor:C.red,marginTop:2}}/>
                    <div>
                      <div style={{fontSize:13,fontWeight:700,color:C.red}}>Pensamentos de auto-lesão ou suicídio</div>
                      <div style={{fontSize:11,color:'#991b1b',marginTop:3}}>Se relatado: urgência será elevada automaticamente para "Muito urgente"</div>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2 — Disponibilidade */}
          {step===2&&(
            <div>
              <p style={{fontSize:13,color:C.sub,marginBottom:14}}>Marque os dias e horários que o paciente pode comparecer ao SEP.</p>
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                {Object.entries(DIA_LBL).map(([k,l])=>{
                  const atual = form.disponibilidade?.[k]||[]
                  return (
                    <div key={k} style={{background:C.bg,borderRadius:10,padding:'12px 14px',border:`1px solid ${C.border}`}}>
                      <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:8}}>{l}</div>
                      <div style={{display:'flex',flexWrap:'wrap',gap:7}}>
                        {['08:00','09:00','10:00','11:00','13:00','14:00','15:00','16:00','18:00','19:00'].map(h=>{
                          const sel = atual.includes(h)
                          return (
                            <button key={h} onClick={()=>{
                              const cur = form.disponibilidade||{}
                              const arr = cur[k]||[]
                              const next = sel?arr.filter((x:string)=>x!==h):[...arr,h]
                              setF('disponibilidade',{...cur,[k]:next})
                            }} style={{
                              padding:'6px 13px',borderRadius:8,fontSize:12,fontWeight:500,cursor:'pointer',
                              border:`1.5px solid ${sel?C.teal:C.border}`,
                              background:sel?C.tealL:'transparent',color:sel?C.teal:C.muted,
                              transition:'all .15s',fontFamily:'inherit',
                            }}>{h}</button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* STEP 3 — Acesso */}
          {step===3&&(
            <div style={{display:'grid',gap:12}}>
              <Inp label="E-mail (para acesso ao portal)" type="email" value={form.email||''} onChange={e=>setF('email',e.target.value)} placeholder="email@paciente.com"/>
              <div>
                <Inp label="Senha provisória (deixe em branco para usar o CPF)" type="password" value={form.senha_provisoria||''} onChange={e=>setF('senha_provisoria',e.target.value)} placeholder="Padrão: CPF do paciente"/>
                <div style={{fontSize:12,color:C.muted,marginTop:6}}>
                  ℹ️ Se não informado, a senha provisória será o CPF do paciente. Oriente a troca no primeiro acesso.
                </div>
              </div>
              <div style={{background:C.tealL,border:`1px solid ${C.teal}30`,borderRadius:10,padding:'14px 16px'}}>
                <div style={{fontSize:13,fontWeight:700,color:C.teal,marginBottom:6}}>✅ Resumo do cadastro</div>
                <div style={{fontSize:12,color:C.tealD,lineHeight:1.8}}>
                  <div>Paciente: <strong>{form.nome}</strong></div>
                  <div>CPF: {fmtCPF(form.cpf?.replace(/\D/g,'')||'')}</div>
                  <div>Urgência: <strong>{U_LBL[form.urgencia]||form.urgencia}</strong>{form.risco_suicidio?' (elevada por risco)':''}</div>
                  <div>Status ao salvar: <strong>Aguardando</strong> (na fila, triagem presencial aprovada)</div>
                </div>
              </div>
            </div>
          )}

          {/* Navegação */}
          <div style={{display:'flex',gap:10,marginTop:22}}>
            {step>0&&<Btn v="ghost" onClick={()=>setStep(s=>s-1)}>← Voltar</Btn>}
            {step<3
              ? <Btn full v="teal" onClick={()=>{
                  if(step===0&&(!form.nome||!form.cpf||!form.telefone)){alert('Preencha nome, CPF e telefone');return}
                  if(step===1&&!form.motivo_busca){alert('Informe o motivo da busca');return}
                  setStep(s=>s+1)
                }}>Continuar →</Btn>
              : <Btn full v="teal" icon="✓" onClick={salvar} disabled={loading}>{loading?'Salvando...':'Finalizar cadastro'}</Btn>
            }
          </div>
        </div>
      </Card>
    </div>
  )
}

// ── Agendar consulta ───────────────────────────────────────
function AgendarConsulta() {
  const [pacientes,setPacientes] = useState<any[]>([])
  const [estagiarios,setEst]     = useState<any[]>([])
  const [selPac,setSelPac]       = useState<any>(null)
  const [slots,setSlots]         = useState<any[]>([])
  const [dispPac,setDispPac]     = useState<any>({})
  const [form,setForm]           = useState({slot_id:'',data_hora_inicio:'',modalidade:'presencial',sala:'',estagiario_id:''})
  const [salas,setSalas]         = useState<string[]>(DEFAULT_SALAS)
  const [loading,setLoad]        = useState(false)
  const toast = useToast()
  const nav = useNavigate()
  const location = useLocation()

  const selecionarPaciente = async(p:any)=>{
    setSelPac(p)
    setForm(f=>({...f,slot_id:'',estagiario_id:'',data_hora_inicio:''}))
    const data = await api.adminDisponibilidades(p.id)
    setSlots(data.data||[]); setDispPac(data.disponibilidade_paciente||{})
  }

  useEffect(()=>{
    const pacienteId = new URLSearchParams(location.search).get('paciente_id')
    api.adminPacientes({status:'em_contato'}).then(async(lista:any[])=>{
      setPacientes(lista)
      if (pacienteId) {
        const paciente = lista.find(p=>String(p.id)===pacienteId)
        if (paciente) await selecionarPaciente(paciente)
        else toast('Paciente nao esta pronto para agendamento.', 'err')
      }
    }).catch(console.error)
    api.adminEstagiarios().then(setEst).catch(console.error)
    api.adminGetConfig().then(cfg=>{
      const configuradas = parseSalasConfig(cfg.salas_disponiveis)
      if (configuradas.length) setSalas(configuradas)
    }).catch(()=>{})
  },[location.search])

  const cruzados = slots.filter((s:any)=>Object.keys(dispPac).includes(s.dia_semana))
  const opcoesSala = salasPresenciais(salas)

  const agendar = async()=>{
    if(!selPac||!form.data_hora_inicio){ alert('Selecione paciente e data/hora'); return }
    if(form.modalidade==='presencial'&&!form.sala){ alert('Selecione uma sala cadastrada'); return }
    setLoad(true)
    try {
      const body = {
        paciente_id: selPac.id,
        estagiario_id: form.estagiario_id || cruzados[0]?.estagiario_id || estagiarios[0]?.id,
        slot_id: form.slot_id||null,
        data_hora_inicio: form.data_hora_inicio,
        modalidade: form.modalidade,
        sala: form.modalidade==='presencial' ? form.sala : '',
      }
      const data = await api.adminCriarAg(body)
      if(!data.success) throw new Error(data.error)
      toast('✅ Consulta agendada e aguardando confirmação.')
      nav('/recepcao/agenda')
    } catch(e:any){ toast('❌ '+e.message) }
    finally{ setLoad(false) }
  }

  return (
    <div>
      <div style={{marginBottom:22}}>
        <h1 style={{fontSize:22,fontWeight:700,color:C.text,marginBottom:4}}>Agendar Consulta</h1>
        <p style={{fontSize:13,color:C.muted}}>Cruze a disponibilidade do paciente com os horários aprovados dos estagiários</p>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,maxWidth:900}}>
        {/* Pacientes em contato */}
        <Card>
          <div style={{padding:'14px 20px',borderBottom:`1px solid ${C.border}`}}>
            <h3 style={{fontSize:14,fontWeight:700,color:C.text}}>1. Selecione o paciente</h3>
            <p style={{fontSize:12,color:C.muted,marginTop:3}}>Pacientes em contato</p>
          </div>
          <div>
            {!pacientes.length&&<div style={{padding:24,textAlign:'center',color:C.muted,fontSize:13}}>Nenhum paciente em contato</div>}
            {pacientes.map(p=>(
              <div key={p.id} onClick={()=>selecionarPaciente(p)} style={{
                padding:'12px 18px',borderBottom:`1px solid ${C.border}`,cursor:'pointer',
                background:selPac?.id===p.id?C.tealL:'transparent',transition:'background .15s',
              }}>
                <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:2}}>
                  <span style={{fontWeight:700,fontSize:13,color:C.text}}>{p.nome}</span>
                  {uChip(p.urgencia)}
                </div>
                <div style={{fontSize:11,color:C.muted}}>{p.telefone} · {p.dias_espera}d na fila</div>
              </div>
            ))}
          </div>
        </Card>

        {/* Cruzamento de horários */}
        <Card>
          <div style={{padding:'14px 20px',borderBottom:`1px solid ${C.border}`}}>
            <h3 style={{fontSize:14,fontWeight:700,color:C.text}}>2. Horários disponíveis</h3>
            <p style={{fontSize:12,color:C.muted,marginTop:3}}>
              {selPac?'Horários que cruzam com a disponibilidade do paciente':'Selecione um paciente primeiro'}
            </p>
          </div>
          <div style={{padding:'14px 18px'}}>
            {!selPac&&<div style={{textAlign:'center',color:C.muted,padding:24,fontSize:13}}>← Selecione um paciente</div>}
            {selPac&&cruzados.length===0&&(
              <div style={{background:C.amberL,border:`1px solid ${C.amber}40`,borderRadius:9,padding:'10px 14px',fontSize:13,color:C.amber,marginBottom:12}}>
                ⚠ Nenhum horário cruza. Defina manualmente abaixo.
              </div>
            )}
            {selPac&&cruzados.length>0&&(
              <div style={{display:'flex',flexWrap:'wrap',gap:8,marginBottom:14}}>
                {cruzados.map((s:any)=>(
                  <button key={s.slot_id} onClick={()=>setForm(f=>({...f,slot_id:s.slot_id,estagiario_id:s.estagiario_id}))}
                    style={{padding:'8px 14px',borderRadius:9,cursor:'pointer',fontSize:12,fontWeight:600,fontFamily:'inherit',
                      border:`2px solid ${form.slot_id===s.slot_id?C.teal:C.border}`,
                      background:form.slot_id===s.slot_id?C.tealL:C.surface,
                      color:form.slot_id===s.slot_id?C.teal:C.sub}}>
                    <strong>{DIA_LBL[s.dia_semana]}</strong> · {s.hora_inicio}–{s.hora_fim}<br/>
                    <span style={{fontSize:11,color:C.muted}}>{s.estagiario_nome}</span>
                  </button>
                ))}
              </div>
            )}
            {selPac&&(
              <div style={{display:'grid',gap:10}}>
                <Inp label="Data e hora *" type="datetime-local" value={form.data_hora_inicio} onChange={e=>setForm(f=>({...f,data_hora_inicio:e.target.value}))}/>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                  <Sel label="Modalidade" value={form.modalidade} onChange={e=>setForm(f=>({...f,modalidade:e.target.value,sala:e.target.value==='online'?'':f.sala}))}>
                    <option value="presencial">Presencial</option>
                    <option value="online">Online</option>
                  </Sel>
                  {form.modalidade==='presencial'?(
                    <Sel label="Sala" value={form.sala} onChange={e=>setForm(f=>({...f,sala:e.target.value}))}>
                      <option value="">Selecione a sala</option>
                      {opcoesSala.map(s=><option key={s} value={s}>{s}</option>)}
                    </Sel>
                  ):(
                    <div style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,padding:'10px 12px',fontSize:12,color:C.muted}}>
                      Atendimento online não usa sala física.
                    </div>
                  )}
                </div>
                {cruzados.length===0&&(
                  <Sel label="Estagiário" value={form.estagiario_id} onChange={e=>setForm(f=>({...f,estagiario_id:e.target.value}))}>
                    <option value="">Selecione o estagiário</option>
                    {estagiarios.map((e:any)=><option key={e.id} value={e.id}>{e.nome}</option>)}
                  </Sel>
                )}
                <Btn full v="teal" icon="📅" onClick={agendar} disabled={loading}>
                  {loading?'Agendando...':'Confirmar agendamento'}
                </Btn>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}


// ── Triagem (recepcionista avalia e aprova/rejeita) ───────
function TriagemRecepcao() {
  const [lista,setLista] = useState<any[]>([])
  const [sel,setSel]     = useState<any>(null)
  const [obs,setObs]     = useState('')
  const [motivo,setMot]  = useState('')
  const [load,setLoad]   = useState(true)
  const toast = useToast()

  useEffect(()=>{ api.adminTriagem().then(setLista).finally(()=>setLoad(false)) },[])

  const aprovar = async(id:number) => {
    await api.adminAprovarTriagem(id, obs)
    setLista(l=>l.filter(p=>p.id!==id)); setSel(null)
    toast('✅ Triagem aprovada — paciente entrou na fila!')
  }
  const rejeitar = async(id:number) => {
    if(!motivo){ toast('Informe o motivo'); return }
    await api.adminRejeitarTriagem(id, motivo)
    setLista(l=>l.filter(p=>p.id!==id)); setSel(null)
    toast('Triagem rejeitada')
  }

  if(load) return <Spin/>
  return (
    <div>
      <div style={{marginBottom:22}}>
        <h1 style={{fontSize:22,fontWeight:700,color:C.text,marginBottom:4}}>Triagem de Pacientes</h1>
        <p style={{fontSize:13,color:C.muted}}>{lista.length} paciente(s) aguardando avaliação · cadastros online</p>
      </div>

      {!lista.length&&(
        <Card><div style={{padding:48,textAlign:'center'}}>
          <div style={{fontSize:32,marginBottom:12}}>✅</div>
          <p style={{color:C.muted}}>Nenhuma triagem pendente!</p>
        </div></Card>
      )}

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
                  <div style={{fontSize:12,color:C.muted,marginBottom:8}}>
                    {fmtCPF(p.cpf)} · {p.telefone} · {fmtData(p.timestamp_cadastro)}
                  </div>
                  <div style={{background:C.bg,borderRadius:8,padding:'10px 14px',fontSize:13,color:C.sub,lineHeight:1.6,borderLeft:`3px solid ${C.teal}`}}>
                    {p.motivo_busca?.slice(0,200)}{(p.motivo_busca?.length||0)>200?'…':''}
                  </div>
                  {p.intensidade_sintomas&&(
                    <div style={{marginTop:8,display:'flex',gap:6,flexWrap:'wrap'}}>
                      <Chip label={`Intensidade: ${p.intensidade_sintomas}`} color={C.sub} bg={C.bg} sm/>
                    </div>
                  )}
                </div>
                <Btn v="outline" size="sm" onClick={()=>{setSel(p);setObs('');setMot('')}}>Ver detalhes</Btn>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {sel&&(
        <Modal title={`Triagem — ${sel.nome}`} subtitle={`${fmtCPF(sel.cpf)} · ${sel.telefone}`} onClose={()=>setSel(null)} width={660}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:16}}>
            {[['Urgência',U_LBL[sel.urgencia]||'—'],['Intensidade',sel.intensidade_sintomas||'—'],['Tempo sintomas',sel.tempo_sintomas||'—'],
              ['Gênero',sel.genero||'—'],['Renda',sel.renda_familiar||'—'],['Escolaridade',sel.escolaridade||'—']
            ].map(([k,v])=><InfoBox key={k} k={k} v={v}/>)}
          </div>
          <div style={{marginBottom:14}}>
            <div style={{fontSize:12,fontWeight:600,color:C.sub,marginBottom:6}}>Motivo da busca</div>
            <div style={{background:C.bg,borderRadius:8,padding:'12px 14px',fontSize:13,color:C.sub,lineHeight:1.6,borderLeft:`3px solid ${C.teal}`}}>{sel.motivo_busca}</div>
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
          </div>
          <div style={{display:'grid',gap:10,marginBottom:20}}>
            <Txa label="Observações internas (opcional)" rows={2} value={obs} onChange={e=>setObs(e.target.value)} placeholder="Anotações sobre esta triagem..."/>
            <Txa label="Motivo da rejeição (preencha somente se for rejeitar)" rows={2} value={motivo} onChange={e=>setMot(e.target.value)} placeholder="Descreva o motivo..."/>
          </div>
          <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
            <Btn v="ghost" onClick={()=>setSel(null)}>Fechar</Btn>
            <Btn v="danger" icon="✖" onClick={()=>rejeitar(sel.id)}>Rejeitar</Btn>
            <Btn v="teal" icon="✔" onClick={()=>aprovar(sel.id)}>Aprovar — entrar na fila</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// APP ROOT
// ══════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════
// PACIENTES — visão recepcionista
// Lista todos os pacientes com busca, filtro de status e
// acesso rápido a contato + agendamento
// ══════════════════════════════════════════════════════════
function PacientesRecepcao() {
  const [lista,setLista]   = useState<any[]>([])
  const [busca,setBusca]   = useState('')
  const [filtro,setFiltro] = useState('')
  const [sel,setSel]       = useState<any>(null)
  const [retorno,setRetorno] = useState<any>(null)
  const [obsRetorno,setObsRetorno] = useState('')
  const [hist,setHist]     = useState<any[]>([])
  const [load,setLoad]     = useState(true)
  const toast = useToast()
  const location = useLocation()

  useEffect(()=>{
    setLoad(true)
    api.adminPacientes({}).then(setLista).finally(()=>setLoad(false))
  },[location.pathname])

  const abrirPac = async (p:any) => {
    setSel(p)
    try { setHist(await api.recepHistoricoContatos(p.id)) } catch { setHist([]) }
  }

  const retornarFila = async () => {
    if (!retorno) return
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
      toast(e.response?.data?.error||e.message||'Erro ao retornar paciente para fila', 'err')
    }
  }

  const FILTROS = [
    {v:'',              l:'Todos'},
    {v:'triagem_pendente',l:'Triagem pendente'},
    {v:'aguardando',    l:'Fila de espera'},
    {v:'em_contato',    l:'Em contato'},
    {v:'agendado',      l:'Agendado'},
    {v:'em_atendimento',l:'Em atendimento'},
    {v:'alta',          l:'Alta'},
    {v:'desistencia',   l:'Desistencia'},
  ]

  const filtrados = lista.filter(p => {
    const matchBusca = !busca || p.nome?.toLowerCase().includes(busca.toLowerCase()) ||
      p.cpf?.includes(busca) || p.telefone?.includes(busca)
    const matchFiltro = !filtro || p.status === filtro
    return matchBusca && matchFiltro
  })

  return (
    <div>
      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',
        marginBottom:20,flexWrap:'wrap',gap:12}}>
        <div>
          <h1 style={{fontSize:20,fontWeight:800,color:C.text,marginBottom:3,letterSpacing:'-.02em'}}>
            Pacientes</h1>
          <p style={{fontSize:13,color:C.muted}}>{filtrados.length} resultado(s)</p>
        </div>
      </div>

      {/* Filtros */}
      <div style={{display:'flex',gap:10,marginBottom:16,flexWrap:'wrap'}}>
        <Inp placeholder="Buscar por nome, CPF ou telefone..."
          value={busca} onChange={(e:any)=>setBusca(e.target.value)}
          style={{minWidth:240,flex:1}}/>
        <Sel value={filtro} onChange={(e:any)=>setFiltro(e.target.value)}
          style={{minWidth:180}}>
          {FILTROS.map(f=><option key={f.v} value={f.v}>{f.l}</option>)}
        </Sel>
      </div>

      {load&&<Spin/>}

      {!load&&(
        <Card>
          {!filtrados.length&&(
            <div style={{padding:48,textAlign:'center',color:C.muted}}>
              Nenhum paciente encontrado.
            </div>
          )}
          {filtrados.map((p,i)=>(
            <div key={p.id} onClick={()=>abrirPac(p)} style={{
              display:'flex',alignItems:'center',gap:14,
              padding:'13px 18px',
              borderBottom:i<filtrados.length-1?`1px solid ${C.border}`:'none',
              cursor:'pointer',transition:'background .1s'}}>
              <div style={{width:38,height:38,borderRadius:10,background:C.tealL,
                display:'flex',alignItems:'center',justifyContent:'center',
                fontSize:15,fontWeight:800,color:C.tealD,flexShrink:0}}>
                {p.nome?.charAt(0)}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:700,fontSize:13,color:C.text,marginBottom:2}}>
                  {p.nome}</div>
                <div style={{fontSize:11,color:C.muted,display:'flex',gap:8,flexWrap:'wrap'}}>
                  <span>{fmtCPF(p.cpf)}</span>
                  <span>·</span>
                  <span>{p.telefone}</span>
                  {p.dias_espera>0&&<span>· {p.dias_espera}d na fila</span>}
                </div>
              </div>
              <div style={{display:'flex',gap:6,alignItems:'center',flexShrink:0}}>
                {p.status==='desistencia'&&(
                  <div onClick={(e:any)=>e.stopPropagation()}>
                    <Btn v="teal" size="sm" onClick={()=>{setRetorno(p);setObsRetorno('')}}>Retornar</Btn>
                  </div>
                )}
                {uChip(p.urgencia)}
                {sChip(p.status)}
              </div>
            </div>
          ))}
        </Card>
      )}

      {/* Modal detalhe */}
      {sel&&(
        <Modal title={sel.nome} subtitle={`CPF: ${fmtCPF(sel.cpf)}`} onClose={()=>setSel(null)}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:16}}>
            <InfoBox k="Telefone"    v={sel.telefone||'—'}/>
            <InfoBox k="Status"      v={S_LBL[sel.status]||sel.status}/>
            <InfoBox k="Urgência"    v={U_LBL[sel.urgencia]||'—'}/>
            <InfoBox k="Na fila há"  v={sel.dias_espera?`${sel.dias_espera} dias`:'—'}/>
          </div>

          {/* Histórico de contatos */}
          <div style={{marginBottom:4}}>
            <p style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:'uppercase',
              letterSpacing:'.06em',marginBottom:8}}>Histórico de contatos ({hist.length})</p>
            {!hist.length&&(
              <p style={{fontSize:12,color:C.muted,padding:'8px 0'}}>Nenhum contato registrado.</p>
            )}
            {hist.slice(0,5).map((h:any)=>(
              <div key={h.id} style={{padding:'8px 0',
                borderBottom:`1px solid ${C.border}`,
                display:'flex',gap:10,fontSize:12}}>
                <span style={{fontSize:18}}>{h.tipo==='ligacao'?'📞':h.tipo==='whatsapp'?'💬':'✉️'}</span>
                <div>
                  <div style={{fontWeight:600,color:C.text}}>{h.assunto||h.tipo}</div>
                  <div style={{color:C.muted}}>{fmtDT(h.criado_em)}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{display:'flex',gap:8,marginTop:16}}>
            <Btn v="ghost" onClick={()=>setSel(null)}>Fechar</Btn>
            {sel.status==='desistencia'&&(
              <Btn v="teal" onClick={()=>{setRetorno(sel);setObsRetorno('');setSel(null)}}>Retornar para fila</Btn>
            )}
          </div>
        </Modal>
      )}
      {retorno&&(
        <Modal title="Retornar paciente para fila" subtitle={retorno.nome} onClose={()=>setRetorno(null)}>
          <div style={{background:C.amberL,border:`1px solid ${C.amber}40`,borderRadius:9,padding:'10px 14px',fontSize:13,color:C.amber,marginBottom:16}}>
            O paciente voltara para a fila de espera com a data atual, perdendo a posicao anterior.
          </div>
          <Txa label="Observacao (opcional)" rows={3} value={obsRetorno} onChange={e=>setObsRetorno(e.target.value)} placeholder="Ex: Paciente entrou em contato solicitando retorno..."/>
          <div style={{display:'flex',gap:10,marginTop:20}}>
            <Btn v="ghost" onClick={()=>setRetorno(null)}>Cancelar</Btn>
            <Btn full v="teal" onClick={retornarFila}>Confirmar retorno</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// ESTAGIÁRIOS — visão recepcionista
// Lista estagiários com horários aprovados para cruzar
// disponibilidade ao agendar consultas
// ══════════════════════════════════════════════════════════
function EstagiarioesRecepcao() {
  const [lista,setLista]  = useState<any[]>([])
  const [sel,setSel]      = useState<any>(null)
  const [slots,setSlots]  = useState<any[]>([])
  const [load,setLoad]    = useState(true)
  const location = useLocation()

  useEffect(()=>{
    setLoad(true)
    api.adminEstagiarios().then(setLista).finally(()=>setLoad(false))
  },[location.pathname])

  const abrirEst = async(e:any) => {
    setSel(e)
    try { setSlots(await api.adminSlotsEst(e.id)) } catch { setSlots([]) }
  }

  const DIAS_ORD = ['seg','ter','qua','qui','sex','sab']
  const DIAS_LBL: Record<string,string> = {
    seg:'Segunda',ter:'Terça',qua:'Quarta',
    qui:'Quinta',sex:'Sexta',sab:'Sábado'
  }

  const slotsByDia = slots.filter(s=>s.status==='aprovado')
    .reduce((a:any,s:any)=>({...a,[s.dia_semana]:[...(a[s.dia_semana]||[]),s]}),{})

  return (
    <div>
      <div style={{marginBottom:20}}>
        <h1 style={{fontSize:20,fontWeight:800,color:C.text,marginBottom:3,letterSpacing:'-.02em'}}>
          Estagiários</h1>
        <p style={{fontSize:13,color:C.muted}}>
          Horários aprovados para cruzar disponibilidade com pacientes
        </p>
      </div>

      {load&&<Spin/>}

      {!load&&(
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:12}}>
          {!lista.length&&(
            <p style={{color:C.muted,gridColumn:'1/-1',textAlign:'center',padding:48}}>
              Nenhum estagiário ativo.
            </p>
          )}
          {lista.map(e=>(
            <div key={e.id} onClick={()=>abrirEst(e)} style={{
              background:C.surface,borderRadius:12,border:`1px solid ${C.border}`,
              padding:'16px',cursor:'pointer',transition:'box-shadow .15s'}}>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
                <div style={{width:40,height:40,borderRadius:'50%',background:C.tealL,
                  display:'flex',alignItems:'center',justifyContent:'center',
                  fontSize:16,fontWeight:800,color:C.tealD,flexShrink:0}}>
                  {e.nome?.charAt(0)}
                </div>
                <div>
                  <div style={{fontWeight:700,fontSize:13,color:C.text}}>{e.nome}</div>
                  <div style={{fontSize:11,color:C.muted}}>Mat. {e.matricula}</div>
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
                <div style={{background:C.bg,borderRadius:7,padding:'7px 10px',textAlign:'center'}}>
                  <div style={{fontSize:16,fontWeight:800,color:C.purple}}>{e.pacientes_ativos||0}</div>
                  <div style={{fontSize:10,color:C.muted}}>Pacientes</div>
                </div>
                <div style={{background:C.bg,borderRadius:7,padding:'7px 10px',textAlign:'center'}}>
                  <div style={{fontSize:16,fontWeight:800,color:C.teal}}>{e.slots_aprovados||0}</div>
                  <div style={{fontSize:10,color:C.muted}}>Horários</div>
                </div>
              </div>
              <div style={{marginTop:10,fontSize:11,color:C.teal,textAlign:'right',fontWeight:600}}>
                Ver horários →
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal horários do estagiário */}
      {sel&&(
        <Modal title={sel.nome}
          subtitle={`Mat. ${sel.matricula} · ${sel.semestre}º sem.`}
          onClose={()=>setSel(null)} width={480}>
          <p style={{fontSize:12,color:C.muted,marginBottom:14}}>
            Horários aprovados disponíveis para agendamento
          </p>
          {!Object.keys(slotsByDia).length&&(
            <p style={{fontSize:13,color:C.muted,padding:'16px 0',textAlign:'center'}}>
              Nenhum horário aprovado.
            </p>
          )}
          {DIAS_ORD.filter(d=>slotsByDia[d]).map(d=>(
            <div key={d} style={{marginBottom:12}}>
              <div style={{fontSize:11,fontWeight:700,color:C.teal,textTransform:'uppercase',
                letterSpacing:'.06em',marginBottom:6}}>{DIAS_LBL[d]}</div>
              {slotsByDia[d].map((s:any)=>(
                <div key={s.id} style={{display:'flex',justifyContent:'space-between',
                  alignItems:'center',padding:'7px 12px',background:C.tealL,
                  borderRadius:7,marginBottom:4,fontSize:13}}>
                  <span style={{fontWeight:600,color:C.tealD}}>
                    {s.hora_inicio} – {s.hora_fim}
                  </span>
                  <span style={{fontSize:11,color:C.teal,fontWeight:500}}>{s.turno}</span>
                </div>
              ))}
            </div>
          ))}
          <Btn v="ghost" onClick={()=>setSel(null)}>Fechar</Btn>
        </Modal>
      )}
    </div>
  )
}


export default function RecepcionistaApp() {
  const [drawer,setDrawer] = useState(false)
  const [toast,setToast]   = useState<{msg:string;type:'ok'|'err'}|null>(null)
  const {isMobile}         = useResponsive()

  const showToast = useCallback((m:string,t:'ok'|'err'='ok')=>{
    setToast({msg:m,type:t}); setTimeout(()=>setToast(null),3500)
  },[])

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
        {!isMobile&&(
          <div style={{flexShrink:0,boxShadow:'2px 0 16px rgba(15,23,42,.1)'}}>
            <Sidebar badges={{}}/>
          </div>
        )}
        {isMobile&&drawer&&(
          <>
            <div style={{position:'fixed',inset:0,background:'rgba(15,23,42,.5)',zIndex:200}} onClick={()=>setDrawer(false)}/>
            <div style={{position:'fixed',top:0,left:0,bottom:0,zIndex:201,boxShadow:'4px 0 24px rgba(15,23,42,.2)'}}>
              <Sidebar badges={{}} onNav={()=>setDrawer(false)}/>
            </div>
          </>
        )}

        <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
          {isMobile&&(
            <header style={{background:C.sidebar,padding:'0 16px',height:54,display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <div style={{width:30,height:30,borderRadius:8,background:'linear-gradient(135deg,#0e7490,#0891b2)',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:13}}>R</div>
                <span style={{fontSize:14,fontWeight:700,color:'#f1f5f9'}}>Recepção SEP</span>
              </div>
              <button onClick={()=>setDrawer(true)} style={{background:'none',border:'none',color:'#94a3b8',cursor:'pointer',padding:8}}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
              </button>
            </header>
          )}
          <main style={{flex:1,overflowY:'auto',padding:isMobile?'20px 16px':'28px 32px'}}>
            <Routes>
              <Route path="/"           element={<DashboardRecepcao/>}/>
              <Route path="/fila"       element={<FilaRecepcao/>}/>
              <Route path="/agenda"     element={<AgendaHoje/>}/>
              <Route path="/pacientes"  element={<PacientesRecepcao/>}/>
              <Route path="/estagiarios" element={<EstagiarioesRecepcao/>}/>
              <Route path="/cadastrar"  element={<CadastrarPaciente/>}/>
              <Route path="/agendar"    element={<AgendarConsulta/>}/>
              <Route path="/triagem"    element={<TriagemRecepcao/>}/>
            </Routes>
          </main>
        </div>
      </div>

      {toast&&(
        <div style={{position:'fixed',bottom:24,right:24,zIndex:2000,
          background:toast.type==='err'?C.red:C.text,color:'#fff',
          padding:'12px 18px',borderRadius:10,fontSize:13,fontWeight:600,
          boxShadow:'0 8px 32px rgba(15,23,42,.3)',animation:'toastIn .25s ease',maxWidth:340}}>
          {toast.msg}
        </div>
      )}
    </ToastCtx.Provider>
  )
}

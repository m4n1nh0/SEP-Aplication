import React, { ReactNode, useState } from 'react'
import { useResponsive } from '../hooks/useResponsive'

// ── Tokens ────────────────────────────────────────────────
export const U_COR: Record<string,string> = { muito_urgente:'#dc2626',urgente:'#b45309',pouco_urgente:'#b45309',sem_urgencia:'#16a34a' }
export const U_LBL: Record<string,string> = { muito_urgente:'Muito urgente',urgente:'Urgente',pouco_urgente:'Pouco urgente',sem_urgencia:'Sem urgência' }
export const S_COR: Record<string,string> = { triagem_pendente:'#b45309',triagem_aprovada:'#16a34a',aguardando:'#78716c',em_contato:'#0891b2',agendado:'#7c3aed',em_atendimento:'#16a34a',alta:'#14532d',cancelado:'#dc2626',desistencia:'#a8a29e' }
export const S_LBL: Record<string,string> = { triagem_pendente:'Triagem pendente',triagem_aprovada:'Triagem aprovada',aguardando:'Aguardando',em_contato:'Em Contato',agendado:'Agendado',em_atendimento:'Em Atendimento',alta:'Alta clínica',cancelado:'Cancelado',desistencia:'Desistência' }
export const DIA_LBL: Record<string,string> = { seg:'Segunda',ter:'Terça',qua:'Quarta',qui:'Quinta',sex:'Sexta',sab:'Sábado' }

// Extrai data e hora diretamente da string do banco ("2026-04-27 11:00:00" ou "2026-04-27T11:00:00")
// Sem passar pelo Date para evitar offset de timezone
const parseLocalStr = (s:string) => {
  const clean = String(s).trim().slice(0, 19).replace('T', ' ')
  const [datePart, timePart = '00:00:00'] = clean.split(' ')
  const [year, month, day] = datePart.split('-').map(Number)
  const [hour, min]        = timePart.split(':').map(Number)
  return { year, month, day, hour, min }
}
export const fmtData = (s:string) => {
  const { day, month, year } = parseLocalStr(s)
  return `${String(day).padStart(2,'0')}/${String(month).padStart(2,'0')}/${year}`
}
export const fmtHora = (s:string) => {
  const { hour, min } = parseLocalStr(s)
  return `${String(hour).padStart(2,'0')}:${String(min).padStart(2,'0')}`
}
export const fmtDT = (s:string) => `${fmtData(s)} ${fmtHora(s)}`
export const fmtCPF  = (v:string) => v?.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/,'$1.$2.$3-$4')

// ── Badge ─────────────────────────────────────────────────
export const Chip = ({ l,c,sm }:{l:string;c:string;sm?:boolean}) => (
  <span style={{background:c+'1e',color:c,border:`1px solid ${c}33`,borderRadius:6,padding:sm?'2px 7px':'3px 10px',fontSize:sm?10:11,fontWeight:700,whiteSpace:'nowrap',display:'inline-block'}}>
    {l}
  </span>
)

// ── Botão ─────────────────────────────────────────────────
export const Btn = ({ children,onClick,variant='primary',size='md',disabled,full,style,type='button' }:{
  children:ReactNode;onClick?:()=>void;variant?:'primary'|'danger'|'ghost'|'success'|'warn'|'purple';
  size?:'sm'|'md'|'lg';disabled?:boolean;full?:boolean;style?:React.CSSProperties;type?:'button'|'submit'|'reset'
}) => {
  const BG:any = {primary:'#1d4ed8',danger:'#ef4444',ghost:'transparent',success:'#16a34a',warn:'#d97706',purple:'#7c3aed'}
  const CL:any = {primary:'#fff',danger:'#fff',ghost:'#8b949e',success:'#fff',warn:'#fff',purple:'#fff'}
  const BD:any = {primary:'none',danger:'none',ghost:'1px solid #30363d',success:'none',warn:'none',purple:'none'}
  const PAD:any= {sm:'6px 14px',md:'10px 20px',lg:'13px 24px'}
  const FS:any = {sm:12,md:13,lg:15}
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={{
      padding:PAD[size],borderRadius:10,border:BD[variant],
      background:disabled?'#30363d':BG[variant],color:disabled?'#64748b':CL[variant],
      fontSize:FS[size],fontWeight:600,cursor:disabled?'default':'pointer',
      minHeight:44,width:full?'100%':undefined,transition:'opacity .15s',
      ...style
    }}>
      {children}
    </button>
  )
}

// ── Input ─────────────────────────────────────────────────
export const Input = ({ label,error,...props }:{ label?:string;error?:string } & React.InputHTMLAttributes<HTMLInputElement>) => (
  <div style={{display:'flex',flexDirection:'column',gap:6}}>
    {label&&<label style={{fontSize:13,fontWeight:600,color:'#8b949e'}}>{label}</label>}
    <input {...props} style={{
      width:'100%',padding:'11px 14px',borderRadius:10,
      border:`1.5px solid ${error?'#ef4444':'#30363d'}`,
      background:'#0d1117',color:'#e6edf3',fontSize:15,outline:'none',
      minHeight:44,boxSizing:'border-box',...props.style
    }}/>
    {error&&<span style={{fontSize:12,color:'#ef4444'}}>{error}</span>}
  </div>
)

export const Select = ({ label,children,...props }:{ label?:string } & React.SelectHTMLAttributes<HTMLSelectElement> & {children:ReactNode}) => (
  <div style={{display:'flex',flexDirection:'column',gap:6}}>
    {label&&<label style={{fontSize:13,fontWeight:600,color:'#8b949e'}}>{label}</label>}
    <select {...props} style={{
      width:'100%',padding:'11px 14px',borderRadius:10,border:'1.5px solid #30363d',
      background:'#0d1117',color:'#e6edf3',fontSize:15,outline:'none',minHeight:44,...props.style
    }}>{children}</select>
  </div>
)

export const Textarea = ({ label,...props }:{label?:string}&React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <div style={{display:'flex',flexDirection:'column',gap:6}}>
    {label&&<label style={{fontSize:13,fontWeight:600,color:'#8b949e'}}>{label}</label>}
    <textarea {...props} style={{
      width:'100%',padding:'11px 14px',borderRadius:10,border:'1.5px solid #30363d',
      background:'#0d1117',color:'#e6edf3',fontSize:14,outline:'none',
      resize:'vertical',fontFamily:'inherit',boxSizing:'border-box',minHeight:80,...props.style
    }}/>
  </div>
)

// ── Card ──────────────────────────────────────────────────
export const Card = ({ children,p,style }:{children:ReactNode;p?:string;style?:React.CSSProperties}) => (
  <div style={{background:'#161b22',border:'1px solid #30363d',borderRadius:14,padding:p??'18px',...style}}>
    {children}
  </div>
)

// ── Modal — centralizado no desktop, bottom sheet no mobile ──
export const Modal = ({ title,subtitle,onClose,children,width=600 }:{title:string;subtitle?:string;onClose:()=>void;children:ReactNode;width?:number}) => {
  const { isMobile } = useResponsive()
  return (
    <div
      onClick={onClose}
      style={{
        position:'fixed',inset:0,
        background:'rgba(0,0,0,.8)',
        zIndex:200,
        display:'flex',
        alignItems: isMobile ? 'flex-end' : 'center',
        justifyContent:'center',
        padding: isMobile ? 0 : '24px 16px',
        overflowY:'auto',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background:'#161b22',
          borderRadius: isMobile ? '20px 20px 0 0' : '16px',
          width:'100%',
          maxWidth: width,
          border:'1px solid #30363d',
          boxShadow:'0 32px 80px rgba(0,0,0,.7)',
          display:'flex',
          flexDirection:'column',
          maxHeight: isMobile ? '90vh' : '85vh',
          animation: isMobile ? 'slideUp .25s ease' : 'fadeIn .2s ease',
          flexShrink: 0,
        }}
      >
        {/* Handle mobile */}
        {isMobile && (
          <div style={{padding:'14px 0 0',display:'flex',justifyContent:'center',flexShrink:0}}>
            <div style={{width:40,height:4,background:'#30363d',borderRadius:2}}/>
          </div>
        )}

        {/* Header fixo */}
        <div style={{
          display:'flex',alignItems:'center',justifyContent:'space-between',
          padding: isMobile ? '16px 20px 12px' : '20px 24px 16px',
          borderBottom:'1px solid #30363d',
          flexShrink:0,
        }}>
          <div>
            <h3 style={{fontSize:17,fontWeight:800,color:'#e6edf3',margin:0}}>{title}</h3>
            {subtitle&&<div style={{fontSize:12,color:'#8b949e',marginTop:4}}>{subtitle}</div>}
          </div>
          <button
            onClick={onClose}
            style={{
              background:'#21262d',border:'1px solid #30363d',
              color:'#8b949e',fontSize:20,cursor:'pointer',
              width:34,height:34,borderRadius:8,
              display:'flex',alignItems:'center',justifyContent:'center',
              flexShrink:0, lineHeight:1,
            }}
          >×</button>
        </div>

        {/* Corpo com scroll */}
        <div style={{
          padding: isMobile ? '18px 20px 32px' : '22px 24px 28px',
          overflowY:'auto',
          flex:1,
        }}>
          {children}
        </div>
      </div>
    </div>
  )
}

// ── Bottom Sheet (mobile-native) ──────────────────────────
export const Sheet = ({ open,onClose,children,title }:{open:boolean;onClose:()=>void;children:ReactNode;title?:string}) => {
  if (!open) return null
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:300,display:'flex',alignItems:'flex-end',justifyContent:'center'}} onClick={onClose}>
      <div style={{background:'#fff',borderRadius:'20px 20px 0 0',padding:'20px 20px calc(20px + var(--safe-bottom))',width:'100%',maxWidth:540,maxHeight:'90vh',overflowY:'auto',animation:'slideUp .25s ease',color:'#0f172a'}} onClick={e=>e.stopPropagation()}>
        <div style={{width:40,height:4,background:'#e2e8f0',borderRadius:2,margin:'0 auto 16px'}}/>
        {title&&<h3 style={{fontSize:17,fontWeight:800,color:'#0f172a',marginBottom:14}}>{title}</h3>}
        {children}
      </div>
    </div>
  )
}

// ── Toast ─────────────────────────────────────────────────
export const Toast = ({ msg }:{msg:string|null}) => msg ? (
  <div style={{position:'fixed',bottom:'calc(24px + var(--safe-bottom))',left:'50%',transform:'translateX(-50%)',background:'#0f172a',color:'#fff',padding:'12px 20px',borderRadius:12,fontSize:13,fontWeight:600,boxShadow:'0 8px 32px rgba(0,0,0,.4)',zIndex:400,whiteSpace:'nowrap',maxWidth:'90vw',overflowX:'hidden',textOverflow:'ellipsis'}}>
    {msg}
  </div>
) : null

export const useToast = () => {
  const [msg,setMsg] = useState<string|null>(null)
  const show = (m:string,ms=3500) => { setMsg(m); setTimeout(()=>setMsg(null),ms) }
  return { msg, show }
}

// ── Spinner ───────────────────────────────────────────────
export const Spinner = ({ label='Carregando...' }:{label?:string}) => (
  <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:64,gap:12}}>
    <div style={{width:32,height:32,border:'3px solid #30363d',borderTopColor:'#1d4ed8',borderRadius:'50%',animation:'spin 1s linear infinite'}}/>
    <p style={{color:'#8b949e',fontSize:13}}>{label}</p>
  </div>
)

// ── Stat Card ─────────────────────────────────────────────
export const StatCard = ({ v,l,c,i }:{v:number|string;l:string;c:string;i:string}) => (
  <div style={{background:'#161b22',border:'1px solid #30363d',borderRadius:12,padding:'14px 16px'}}>
    <div style={{fontSize:20,marginBottom:8}}>{i}</div>
    <div style={{fontSize:26,fontWeight:900,color:c,lineHeight:1,marginBottom:4}}>{v}</div>
    <div style={{fontSize:11,color:'#8b949e'}}>{l}</div>
  </div>
)

// ── Força de Senha ────────────────────────────────────────
export const ForcaSenha = ({ senha }:{senha:string}) => {
  const checks = [
    { ok: senha.length >= 8,              label: 'Mínimo 8 caracteres' },
    { ok: /[A-Z]/.test(senha),            label: 'Letra maiúscula' },
    { ok: /[a-z]/.test(senha),            label: 'Letra minúscula' },
    { ok: /\d/.test(senha),               label: 'Número' },
    { ok: /[!@#$%^&*]/.test(senha),       label: 'Caractere especial' },
  ]
  const score = checks.filter(c=>c.ok).length
  const cores = ['#ef4444','#f97316','#eab308','#84cc16','#22c55e']
  if (!senha) return null
  return (
    <div style={{marginTop:8}}>
      <div style={{display:'flex',gap:4,marginBottom:8}}>
        {[1,2,3,4,5].map(i=>(
          <div key={i} style={{flex:1,height:3,borderRadius:2,background:i<=score?cores[score-1]:'#30363d',transition:'background .3s'}}/>
        ))}
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:3}}>
        {checks.map(c=>(
          <div key={c.label} style={{display:'flex',alignItems:'center',gap:6,fontSize:11,color:c.ok?'#4ade80':'#64748b'}}>
            <span>{c.ok?'✓':'○'}</span>{c.label}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Drawer Mobile (sidebar adaptável) ─────────────────────
export const Drawer = ({ open,onClose,children }:{open:boolean;onClose:()=>void;children:ReactNode}) => (
  <>
    {open && <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.6)',zIndex:150}} onClick={onClose}/>}
    <div style={{
      position:'fixed',top:0,left:0,bottom:0,width:240,
      background:'#161b22',borderRight:'1px solid #30363d',
      zIndex:160,transform:open?'translateX(0)':'translateX(-100%)',
      transition:'transform .25s ease',overflowY:'auto',
      paddingBottom:'calc(20px + var(--safe-bottom))'
    }}>
      {children}
    </div>
  </>
)

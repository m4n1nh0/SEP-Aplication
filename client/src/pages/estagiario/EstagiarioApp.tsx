import React, { useState, useEffect, useRef } from 'react'
import { Routes, Route, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import AgendaCalendar from '../../components/AgendaCalendar'
import { Modal, Btn, Input, Select, Textarea, Toast, useToast, DIA_LBL, fmtData, fmtHora, fmtDT, U_COR, U_LBL } from '../../components/ui'
import * as api from '../../services/api'

// ── Tokens ────────────────────────────────────────────────
const C = {
  bg:'#faf9f6', surface:'#ffffff', surfaceAlt:'#f5f4f0',
  border:'#e7e5e4', text:'#1c1917', sub:'#57534e', muted:'#a8a29e',
  green:'#16a34a', greenL:'#dcfce7', greenD:'#14532d',
  red:'#dc2626', redL:'#fef2f2',
  amber:'#b45309', amberL:'#fef3c7',
  purple:'#7c3aed', purpleL:'#ede9fe', purpleD:'#5b21b6',
  teal:'#0891b2', tealL:'#cffafe',
  sidebar:'#130e24',
  sideGrad:'linear-gradient(135deg,#5b21b6,#7c3aed)',
}

// ── Helpers ───────────────────────────────────────────────
const Ico = ({d,size=15}:{d:string;size?:number}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d}/></svg>
)
const Chip = ({l,c,bg,sm}:{l:string;c:string;bg:string;sm?:boolean}) => (
  <span style={{fontSize:sm?10:11,fontWeight:700,padding:sm?'2px 8px':'3px 10px',
    borderRadius:20,background:bg,color:c,whiteSpace:'nowrap'}}>{l}</span>
)
const PageHdr = ({title,sub,action}:{title:string;sub?:string;action?:React.ReactNode}) => (
  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',
    marginBottom:22,flexWrap:'wrap',gap:12}}>
    <div>
      <h1 style={{fontSize:22,fontWeight:800,color:C.text,marginBottom:4,letterSpacing:'-.02em'}}>{title}</h1>
      {sub&&<p style={{fontSize:13,color:C.muted}}>{sub}</p>}
    </div>
    {action}
  </div>
)
const Card = ({children,style}:{children:React.ReactNode;style?:React.CSSProperties}) => (
  <div style={{background:C.surface,borderRadius:14,border:`1px solid ${C.border}`,overflow:'hidden',...style}}>{children}</div>
)
const Row = ({children,last}:{children:React.ReactNode;last?:boolean}) => (
  <div style={{padding:'13px 18px',borderBottom:last?'none':`1px solid ${C.border}`,
    display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>{children}</div>
)
const InfoGrid = ({items}:{items:[string,string][]}) => (
  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))',gap:8,marginBottom:14}}>
    {items.map(([k,v])=>(
      <div key={k} style={{background:C.bg,borderRadius:9,padding:'9px 12px',border:`1px solid ${C.border}`}}>
        <div style={{fontSize:10,fontWeight:700,color:C.muted,textTransform:'uppercase',
          letterSpacing:'.06em',marginBottom:3}}>{k}</div>
        <div style={{fontSize:12,fontWeight:600,color:C.text}}>{v||'—'}</div>
      </div>
    ))}
  </div>
)
const Divider = ({label}:{label:string}) => (
  <div style={{display:'flex',alignItems:'center',gap:8,margin:'16px 0 12px'}}>
    <div style={{flex:1,height:1,background:C.border}}/>
    <span style={{fontSize:10,fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:'.08em'}}>{label}</span>
    <div style={{flex:1,height:1,background:C.border}}/>
  </div>
)

// ── Status chips ──────────────────────────────────────────
const SCHIP: Record<string,[string,string,string]> = {
  aprovado:          ['Aprovado',C.green,C.greenL],
  pendente:          ['Aguardando',C.amber,C.amberL],
  rejeitado:         ['Rejeitado',C.red,C.redL],
  confirmado:        ['Confirmado',C.green,C.greenL],
  realizado:         ['Realizado',C.purple,C.purpleL],
  cancelado_paciente:['Cancelado',C.red,C.redL],
  cancelado_admin:   ['Cancelado',C.red,C.redL],
  faltou:            ['Faltou',C.muted,'#f5f4f0'],
}
const SChip = ({s,sm}:{s:string;sm?:boolean}) => {
  const [l,c,bg]=SCHIP[s]||[s,C.muted,'#f5f4f0']
  return <Chip l={l} c={c} bg={bg} sm={sm}/>
}

// ── NAV ───────────────────────────────────────────────────
const NAV = [
  {to:'/estagiario',            end:true,  label:'Início',         icon:'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3'},
  {to:'/estagiario/horarios',   end:false, label:'Meus Horários',  icon:'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'},
  {to:'/estagiario/agenda',     end:false, label:'Minha Agenda',   icon:'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'},
  {to:'/estagiario/pacientes',  end:false, label:'Meus Pacientes', icon:'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z'},
  {to:'/estagiario/altas',      end:false, label:'Solicitar Alta', icon:'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'},
]

// ── Sidebar ───────────────────────────────────────────────
function Sidebar({badges={}}:{badges?:Record<string,number>}) {
  const {logout,user} = useAuth()
  const nav = useNavigate()
  return (
    <div style={{width:225,height:'100%',background:C.sidebar,display:'flex',
      flexDirection:'column',overflow:'hidden',flexShrink:0}}>
      <div style={{padding:'18px 14px 14px',borderBottom:'1px solid rgba(255,255,255,.07)',
        display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
        <div style={{width:32,height:32,borderRadius:9,
          background:'linear-gradient(135deg,#16a34a,#059669)',
          display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff"
            strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" opacity=".2"/>
            <path d="M7 13l3-3 2 2 3-4 2 2"/>
          </svg>
        </div>
        <div>
          <div style={{fontSize:13,fontWeight:800,color:'#fafaf9'}}>SEP Sistema</div>
          <div style={{fontSize:9,color:'rgba(255,255,255,.3)',marginTop:1}}>Estácio Aracaju</div>
        </div>
      </div>
      <div style={{margin:'10px 10px 4px',padding:'10px 11px',background:'rgba(255,255,255,.06)',
        borderRadius:10,display:'flex',alignItems:'center',gap:9}}>
        <div style={{width:28,height:28,borderRadius:'50%',background:C.sideGrad,
          display:'flex',alignItems:'center',justifyContent:'center',
          fontSize:11,fontWeight:700,color:'#fff',flexShrink:0}}>
          {user?.nome?.charAt(0)||'E'}
        </div>
        <div>
          <div style={{fontSize:11,fontWeight:600,color:'#fafaf9'}}>{user?.nome?.split(' ')[0]}</div>
          <div style={{fontSize:9,color:'rgba(255,255,255,.35)',marginTop:1}}>Estagiário(a)</div>
        </div>
      </div>
      <div style={{fontSize:9,fontWeight:700,color:'rgba(255,255,255,.25)',
        textTransform:'uppercase',letterSpacing:'.1em',padding:'10px 14px 4px'}}>Menu</div>
      <nav style={{flex:1,padding:'2px 8px',display:'flex',flexDirection:'column',
        gap:1,overflowY:'auto'}}>
        {NAV.map(lk=>(
          <NavLink key={lk.to} to={lk.to} end={lk.end} style={({isActive})=>({
            display:'flex',alignItems:'center',gap:9,padding:'9px 12px',borderRadius:9,
            color:isActive?'#fff':'rgba(255,255,255,.42)',
            background:isActive?C.sideGrad:'transparent',
            fontWeight:isActive?600:400,textDecoration:'none',fontSize:12,
            transition:'all .15s',minHeight:38,
            boxShadow:isActive?'0 2px 10px rgba(0,0,0,.2)':'none',
          })}>
            <span style={{opacity:.85,flexShrink:0}}><Ico d={lk.icon}/></span>
            <span style={{flex:1}}>{lk.label}</span>
            {badges[lk.label]>0&&(
              <span style={{background:'#ef4444',color:'#fff',borderRadius:20,
                padding:'1px 6px',fontSize:9,fontWeight:700}}>{badges[lk.label]}</span>
            )}
          </NavLink>
        ))}
      </nav>
      <div style={{padding:'8px 10px 14px',flexShrink:0}}>
        <button onClick={()=>{logout();nav('/')}} style={{
          width:'100%',padding:'8px 12px',borderRadius:9,border:'none',
          background:'rgba(255,255,255,.05)',color:'rgba(255,255,255,.35)',
          fontSize:11,fontWeight:500,cursor:'pointer',
          display:'flex',alignItems:'center',gap:8,fontFamily:'inherit'}}>
          <Ico d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" size={13}/>
          Sair da conta
        </button>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// PÁGINAS
// ══════════════════════════════════════════════════════════

function Inicio() {
  const [agenda,setAgenda] = useState<any[]>([])
  const location = useLocation()
  const nav = useNavigate()
  const hoje = new Date().toISOString().slice(0,10)
  useEffect(()=>{ api.estAgenda({data_inicio:hoje,data_fim:hoje}).then(setAgenda) },[location.pathname])
  const confirmadas = agenda.filter(a=>a.status==='confirmado').length
  const pendentes = agenda.filter(a=>a.status==='pendente').length
  return (
    <div>
      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,
        padding:'20px 22px',marginBottom:18,boxShadow:'0 10px 30px rgba(28,25,23,.06)'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:14,flexWrap:'wrap'}}>
          <div>
            <div style={{fontSize:11,fontWeight:800,color:C.purple,textTransform:'uppercase',
              letterSpacing:'.08em',marginBottom:6}}>Painel do estagiário</div>
            <h1 style={{fontSize:24,fontWeight:850,color:C.text,marginBottom:5}}>Bom dia!</h1>
            <p style={{fontSize:13,color:C.muted}}>{new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'})}</p>
          </div>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            <button onClick={()=>nav('/estagiario/agenda')} style={{padding:'8px 12px',borderRadius:8,
              border:`1px solid ${C.purple}35`,background:C.purpleL,color:C.purpleD,fontSize:12,
              fontWeight:800,cursor:'pointer',fontFamily:'inherit'}}>Minha agenda</button>
            <button onClick={()=>nav('/estagiario/horarios')} style={{padding:'8px 12px',borderRadius:8,
              border:`1px solid ${C.border}`,background:C.bg,color:C.sub,fontSize:12,
              fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>Meus horários</button>
          </div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:10,marginTop:18}}>
          {[
            {l:'Consultas hoje',v:agenda.length,s:'sessões do dia',c:C.purple,bg:C.purpleL},
            {l:'Confirmadas',v:confirmadas,s:'consulta confirmada',c:C.green,bg:C.greenL},
            {l:'Pendentes',v:pendentes,s:'aguardando confirmação',c:C.amber,bg:C.amberL},
          ].map(item=>(
            <div key={item.l} style={{background:item.bg,border:`1px solid ${item.c}25`,borderRadius:8,padding:'12px 14px'}}>
              <div style={{fontSize:22,fontWeight:900,color:item.c,lineHeight:1}}>{item.v}</div>
              <div style={{fontSize:12,fontWeight:800,color:C.text,marginTop:6}}>{item.l}</div>
              <div style={{fontSize:11,color:C.sub,marginTop:2}}>{item.s}</div>
            </div>
          ))}
        </div>
      </div>
      <Card style={{borderRadius:8,overflow:'hidden',boxShadow:'0 8px 24px rgba(28,25,23,.05)'}}>
        <div style={{padding:'12px 18px',borderBottom:`1px solid ${C.border}`,
          background:C.surfaceAlt,display:'flex',justifyContent:'space-between',alignItems:'center',gap:10}}>
          <span style={{fontSize:12,fontWeight:800,color:C.muted,textTransform:'uppercase',
            letterSpacing:'.06em'}}>Consultas hoje ({agenda.length})</span>
          <button onClick={()=>nav('/estagiario/pacientes')} style={{padding:'6px 10px',borderRadius:8,
            border:`1px solid ${C.border}`,background:C.surface,color:C.sub,fontSize:11,
            fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>Meus pacientes</button>
        </div>
        {!agenda.length&&<div style={{padding:32,textAlign:'center',color:C.muted,fontSize:13}}>
          Nenhuma consulta agendada para hoje.</div>}
        {agenda.map((a,i)=>(
          <Row key={a.id} last={i===agenda.length-1}>
            <div style={{textAlign:'center',background:C.purpleL,borderRadius:10,
              padding:'8px 12px',minWidth:50,flexShrink:0}}>
              <div style={{fontSize:15,fontWeight:800,color:C.purple,lineHeight:1}}>
                {fmtHora(a.data_hora_inicio)}</div>
            </div>
            <div style={{flex:1}}>
              <div style={{fontWeight:700,fontSize:13,color:C.text,marginBottom:2}}>
                {a.paciente_nome}</div>
              <div style={{fontSize:11,color:C.muted}}>
                {a.modalidade==='presencial'?`Sala ${a.sala}`:'Online'} · Sessão {a.sessao_numero}
              </div>
            </div>
            <SChip s={a.status} sm/>
          </Row>
        ))}
      </Card>
    </div>
  )
}

function MeusHorarios() {
  const [slots,setSlots] = useState<any[]>([])
  const [modal,setModal] = useState(false)
  const [form,setForm]   = useState({dia_semana:'seg',hora_inicio:'08:00',hora_fim:'10:00'})
  const {msg,show}       = useToast()
  const location = useLocation()
  useEffect(()=>{ api.estSlots().then(setSlots) },[location.pathname])
  const criar = async()=>{
    try{await api.estCriarSlot(form);setSlots(await api.estSlots());setModal(false);show('✅ Enviado para aprovação!')}
    catch(e:any){show('❌ '+(e.response?.data?.error||e.message))}
  }
  const del = async(id:number)=>{
    if(!confirm('Remover?'))return
    try{await api.estDeletarSlot(id);setSlots(s=>s.filter(x=>x.id!==id));show('Removido')}
    catch(e:any){show('❌ '+(e.response?.data?.error||e.message))}
  }
  const byDia=slots.reduce((a:any,s:any)=>({...a,[s.dia_semana]:[...(a[s.dia_semana]||[]),s]}),{})
  return (
    <div>
      <PageHdr title="Meus Horários"
        sub="Cadastre seus horários e aguarde aprovação do supervisor"
        action={<Btn onClick={()=>setModal(true)}>+ Novo horário</Btn>}/>
      {!Object.keys(byDia).length&&(
        <div style={{padding:48,textAlign:'center',color:C.muted,background:C.surface,
          borderRadius:14,border:`1px solid ${C.border}`}}>Nenhum horário cadastrado.</div>
      )}
      <div style={{display:'grid',gap:12}}>
        {(['seg','ter','qua','qui','sex','sab'] as const).filter(d=>byDia[d]).map(d=>(
          <Card key={d}>
            <div style={{padding:'11px 18px',borderBottom:`1px solid ${C.border}`,
              fontWeight:700,fontSize:13,color:C.purple,background:C.purpleL}}>
              {DIA_LBL[d]}
            </div>
            {byDia[d].map((s:any)=>(
              <Row key={s.id}>
                <div style={{flex:1}}>
                  <span style={{fontSize:14,fontWeight:700,color:C.text}}>
                    {s.hora_inicio} – {s.hora_fim}</span>
                  <span style={{fontSize:11,color:C.muted,marginLeft:8}}>{s.turno}</span>
                </div>
                <SChip s={s.status} sm/>
                {s.status!=='aprovado'&&(
                  <button onClick={()=>del(s.id)} style={{width:28,height:28,borderRadius:7,
                    border:`1px solid ${C.border}`,background:C.bg,color:C.red,
                    cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
                )}
              </Row>
            ))}
          </Card>
        ))}
      </div>
      {modal&&(
        <Modal title="Novo Horário" onClose={()=>setModal(false)}>
          <div style={{display:'grid',gap:12}}>
            <Select label="Dia da semana" value={form.dia_semana}
              onChange={e=>setForm(f=>({...f,dia_semana:e.target.value}))}>
              {Object.entries(DIA_LBL).map(([k,v])=><option key={k} value={k}>{v}</option>)}
            </Select>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <Input label="Hora início" type="time" value={form.hora_inicio}
                onChange={e=>setForm(f=>({...f,hora_inicio:e.target.value}))}/>
              <Input label="Hora fim" type="time" value={form.hora_fim}
                onChange={e=>setForm(f=>({...f,hora_fim:e.target.value}))}/>
            </div>
            <div style={{background:C.amberL,borderRadius:9,padding:'10px 14px',
              fontSize:12,color:C.amber}}>
              Turno definido automaticamente: antes 18h = diurno, após = noturno.
            </div>
          </div>
          <div style={{display:'flex',gap:10,marginTop:20}}>
            <Btn variant="ghost" onClick={()=>setModal(false)}>Cancelar</Btn>
            <Btn onClick={criar}>Enviar para aprovação</Btn>
          </div>
        </Modal>
      )}
      <Toast msg={msg}/>
    </div>
  )
}

function MinhaAgenda() {
  const [ags,setAgs]     = useState<any[]>([])
  const [range,setRange] = useState<{start:string;end:string}|null>(null)
  const [sel,setSel]     = useState<any>(null)
  const [pront,setPront] = useState({
    queixa_principal:'',descricao_sessao:'',
    intervencoes:'',evolucao:'',plano_proxima:'',
  })
  const [load,setLoad]   = useState(false)
  const {msg,show}       = useToast()

  useEffect(()=>{
    if(!range) return
    setLoad(true)
    api.estAgenda({data_inicio:range.start.slice(0,10), data_fim:range.end.slice(0,10)})
      .then(setAgs).finally(()=>setLoad(false))
  },[range?.start,range?.end])

  const abrirSessao = (item:any) => {
    setSel(item)
    setPront({queixa_principal:'',descricao_sessao:'',
      intervencoes:'',evolucao:'',plano_proxima:''})
  }

  const salvar = async()=>{
    if(!sel) return
    try{
      await api.prontuarioSalvar({
        agendamento_id:sel.id, paciente_id:sel.paciente_id,
        sessao_numero:sel.sessao_numero, ...pront,
      })
      setAgs(a=>a.map(x=>x.id===sel.id?{...x,status:'realizado'}:x))
      setSel(null)
      show('✅ Prontuário salvo!')
    } catch(e:any){show('❌ '+(e.response?.data?.error||e.message))}
  }

  return (
    <div>
      <PageHdr title="Minha Agenda"
        sub="Clique em uma consulta para registrar o prontuário"/>

      <div style={{background:'#fff',borderRadius:14,border:`1px solid ${C.border}`,padding:'16px 20px'}}>
        <AgendaCalendar
          items={ags}
          loading={load}
          accent={C.purple}
          onRangeChange={setRange}
          onEventClick={abrirSessao}
        />
      </div>

      {sel&&(
        <Modal
          title={sel.paciente_nome}
          subtitle={`${fmtDT(sel.data_hora_inicio)} · Sessão ${sel.sessao_numero}`}
          onClose={()=>setSel(null)}
          width={660}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:16}}>
            {[
              ['Modalidade', sel.modalidade==='presencial'?'Presencial':'Online'],
              ['Sala',       sel.sala||'—'],
              ['Sessão',     `Nº ${sel.sessao_numero}`],
              ['Status',     sel.status==='confirmado'?'Confirmado':
                             sel.status==='realizado'?'Realizado':'Pendente'],
            ].map(([k,v])=>(
              <div key={k} style={{background:C.surfaceAlt,borderRadius:9,padding:'9px 12px',
                border:`1px solid ${C.border}`}}>
                <div style={{fontSize:10,fontWeight:700,color:C.muted,textTransform:'uppercase',
                  letterSpacing:'.06em',marginBottom:3}}>{k}</div>
                <div style={{fontSize:13,fontWeight:600,color:C.text}}>{v}</div>
              </div>
            ))}
          </div>
          {sel.status==='realizado' ? (
            <div style={{background:C.purpleL,borderRadius:9,padding:'12px 16px',
              fontSize:13,color:C.purpleD,marginBottom:12}}>
              ✅ Prontuário já registrado para esta sessão.
            </div>
          ) : (
            <div style={{display:'grid',gap:11}}>
              <Textarea label="Queixa principal *" rows={2}
                value={pront.queixa_principal}
                onChange={e=>setPront(p=>({...p,queixa_principal:e.target.value}))}/>
              <Textarea label="Descrição da sessão *" rows={4}
                value={pront.descricao_sessao}
                onChange={e=>setPront(p=>({...p,descricao_sessao:e.target.value}))}/>
              <Textarea label="Intervenções realizadas" rows={3}
                value={pront.intervencoes}
                onChange={e=>setPront(p=>({...p,intervencoes:e.target.value}))}/>
              <Textarea label="Evolução do paciente" rows={2}
                value={pront.evolucao}
                onChange={e=>setPront(p=>({...p,evolucao:e.target.value}))}/>
              <Textarea label="Plano para próxima sessão" rows={2}
                value={pront.plano_proxima}
                onChange={e=>setPront(p=>({...p,plano_proxima:e.target.value}))}/>
            </div>
          )}
          <div style={{display:'flex',gap:10,marginTop:18}}>
            <Btn variant="ghost" onClick={()=>setSel(null)}>Fechar</Btn>
            {sel.status!=='realizado'&&(
              <Btn variant="success" onClick={salvar}
                disabled={!pront.queixa_principal||!pront.descricao_sessao}>
                Salvar prontuário
              </Btn>
            )}
          </div>
        </Modal>
      )}
      <Toast msg={msg}/>
    </div>
  )
}


function ProntuarioPaciente({paciente,onBack}:{paciente:any;onBack:()=>void}) {
  const [pronts,setPronts]  = useState<any[]>([])
  const [docs,setDocs]      = useState<any[]>([])
  const [aba,setAba]        = useState<'prontuarios'|'documentos'>('prontuarios')
  const [selPront,setSelP]  = useState<any>(null)
  const [uploading,setUpl]  = useState(false)
  const fileRef             = useRef<HTMLInputElement>(null)
  const {msg,show}          = useToast()

  useEffect(()=>{
    api.prontuariosPaciente(paciente.id).then(setPronts).catch(()=>{})
    api.docsPaciente(paciente.id).then(setDocs).catch(()=>{})
  },[paciente.id])

  const baixarDoc = async(docId:number,nome:string)=>{
    try{
      const {url} = await api.docDownload(docId)
      const a = document.createElement('a'); a.href=url; a.download=nome; a.click()
    }catch(e:any){show('❌ '+(e.response?.data?.error||e.message))}
  }

  const uploadArquivo = async(e:React.ChangeEvent<HTMLInputElement>)=>{
    const file = e.target.files?.[0]; if(!file)return
    setUpl(true)
    try{
      const form = new FormData()
      form.append('arquivo',file)
      form.append('paciente_id',String(paciente.id))
      form.append('tipo','prontuario')
      await api.docUpload(form)
      const d = await api.docsPaciente(paciente.id)
      setDocs(d); show('✅ Arquivo enviado com segurança!')
    }catch(e:any){show('❌ '+(e.response?.data?.error||e.message))}
    finally{setUpl(false);if(fileRef.current)fileRef.current.value=''}
  }

  const fmtBytes = (b:number)=> b>1048576?`${(b/1048576).toFixed(1)} MB`:b>1024?`${(b/1024).toFixed(0)} KB`:`${b} B`
  const MIME_ICON: Record<string,string> = {
    'application/pdf':'📄','image/jpeg':'🖼','image/png':'🖼','image/webp':'🖼',
    'application/msword':'📝',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document':'📝',
  }

  return (
    <div>
      {/* Header com botão voltar */}
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20}}>
        <button onClick={onBack} style={{padding:'7px 14px',borderRadius:9,
          border:`1px solid ${C.border}`,background:C.surface,color:C.sub,
          fontSize:12,fontWeight:600,cursor:'pointer',display:'flex',
          alignItems:'center',gap:6,fontFamily:'inherit'}}>
          <Ico d="M19 12H5M12 19l-7-7 7-7" size={14}/> Voltar
        </button>
        <div>
          <h1 style={{fontSize:20,fontWeight:800,color:C.text,letterSpacing:'-.02em'}}>
            {paciente.nome}
          </h1>
          <div style={{fontSize:12,color:C.muted}}>
            {paciente.telefone}
            {paciente.urgencia&&(
              <span style={{marginLeft:8,fontSize:11,fontWeight:700,padding:'2px 8px',
                borderRadius:20,background:U_COR[paciente.urgencia]+'20',
                color:U_COR[paciente.urgencia]}}>
                {U_LBL[paciente.urgencia]}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:'flex',background:C.surfaceAlt,borderRadius:10,padding:4,
        marginBottom:20,gap:4,border:`1px solid ${C.border}`,width:'fit-content'}}>
        {([['prontuarios','Prontuários'],['documentos','Documentos']] as const).map(([k,l])=>(
          <button key={k} onClick={()=>setAba(k)} style={{
            padding:'8px 20px',borderRadius:8,border:'none',fontSize:13,fontWeight:600,
            cursor:'pointer',fontFamily:'inherit',transition:'all .15s',
            background:aba===k?C.sideGrad:'transparent',
            color:aba===k?'#fff':C.muted}}>
            {l} {k==='prontuarios'?`(${pronts.length})`:`(${docs.length})`}
          </button>
        ))}
      </div>

      {/* ── PRONTUÁRIOS ── */}
      {aba==='prontuarios'&&(
        <div>
          {!pronts.length&&(
            <div style={{padding:48,textAlign:'center',color:C.muted,background:C.surface,
              borderRadius:14,border:`1px solid ${C.border}`}}>
              <div style={{fontSize:32,marginBottom:8}}>📋</div>
              Nenhum prontuário registrado ainda.<br/>
              <span style={{fontSize:12}}>Registre após cada sessão confirmada na aba Minha Agenda.</span>
            </div>
          )}
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {pronts.map(p=>(
              <div key={p.id} onClick={()=>setSelP(p)} style={{
                background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,
                padding:'14px 18px',cursor:'pointer',display:'flex',
                alignItems:'center',justifyContent:'space-between',
                transition:'border-color .15s'}}>
                <div>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}>
                    <span style={{fontWeight:700,fontSize:14,color:C.text}}>
                      Sessão {p.sessao_numero}</span>
                    <span style={{fontSize:11,color:C.muted}}>·</span>
                    <span style={{fontSize:12,color:C.sub}}>{fmtData(p.data_sessao)}</span>
                  </div>
                  {p.queixa_principal&&(
                    <div style={{fontSize:12,color:C.muted,maxWidth:400}}>
                      {p.queixa_principal.slice(0,80)}{p.queixa_principal.length>80?'…':''}
                    </div>
                  )}
                </div>
                <Ico d="M9 5l7 7-7 7" size={16}/>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── DOCUMENTOS ── */}
      {aba==='documentos'&&(
        <div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
            <p style={{fontSize:13,color:C.muted}}>
              Arquivos enviados com criptografia AES-256 · URLs expiram em 15 min
            </p>
            <div>
              <input ref={fileRef} type="file" style={{display:'none'}}
                accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                onChange={uploadArquivo}/>
              <Btn onClick={()=>fileRef.current?.click()} disabled={uploading}>
                {uploading?'Enviando…':'+ Enviar arquivo'}
              </Btn>
            </div>
          </div>

          {!docs.length&&(
            <div style={{padding:48,textAlign:'center',color:C.muted,background:C.surface,
              borderRadius:14,border:`1px solid ${C.border}`}}>
              <div style={{fontSize:32,marginBottom:8}}>📁</div>
              Nenhum documento. Formatos aceitos: PDF, imagens, Word (máx. 20 MB).
            </div>
          )}
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {docs.map(d=>(
              <div key={d.id} style={{background:C.surface,border:`1px solid ${C.border}`,
                borderRadius:11,padding:'12px 16px',display:'flex',
                alignItems:'center',gap:12}}>
                <div style={{fontSize:24,flexShrink:0}}>
                  {MIME_ICON[d.mime_type]||'📎'}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:600,fontSize:13,color:C.text,
                    whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                    {d.nome_original}
                  </div>
                  <div style={{fontSize:11,color:C.muted,marginTop:2}}>
                    {d.tamanho_bytes?fmtBytes(d.tamanho_bytes):''} · {fmtData(d.criado_em)}
                    {d.enviado_por_nome?` · por ${d.enviado_por_nome}`:''}
                  </div>
                </div>
                <button onClick={()=>baixarDoc(d.id,d.nome_original)} style={{
                  padding:'7px 14px',borderRadius:8,border:`1px solid ${C.border}`,
                  background:C.bg,color:C.purple,fontSize:12,fontWeight:600,
                  cursor:'pointer',fontFamily:'inherit',display:'flex',
                  alignItems:'center',gap:6,flexShrink:0}}>
                  <Ico d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" size={13}/>
                  Baixar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal prontuário detalhe */}
      {selPront&&(
        <Modal title={`Sessão ${selPront.sessao_numero}`}
          subtitle={fmtData(selPront.data_sessao)} onClose={()=>setSelP(null)} width={660}>
          {[
            ['Queixa principal',selPront.queixa_principal],
            ['Descrição da sessão',selPront.descricao_sessao],
            ['Intervenções realizadas',selPront.intervencoes],
            ['Evolução do paciente',selPront.evolucao],
            ['Plano para próxima sessão',selPront.plano_proxima],
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
      <Toast msg={msg}/>
    </div>
  )
}

// ── Meus Pacientes (com navegação para prontuários) ───────
function MeusPacientes() {
  const [lista,setLista]  = useState<any[]>([])
  const [sel,setSel]      = useState<any>(null)
  const location = useLocation()
  useEffect(()=>{ api.estPacientes().then(setLista) },[location.pathname])

  if(sel) return <ProntuarioPaciente paciente={sel} onBack={()=>setSel(null)}/>

  return (
    <div>
      <PageHdr title="Meus Pacientes" sub={`${lista.length} paciente(s) com vínculo ativo`}/>
      {!lista.length&&(
        <div style={{padding:48,textAlign:'center',color:C.muted,background:C.surface,
          borderRadius:14,border:`1px solid ${C.border}`}}>
          Nenhum paciente vinculado ainda.</div>
      )}
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        {lista.map(p=>(
          <div key={p.id} onClick={()=>setSel(p)} style={{
            background:C.surface,border:`1px solid ${C.border}`,borderRadius:13,
            padding:'16px 18px',cursor:'pointer',display:'flex',
            alignItems:'center',gap:14,transition:'border-color .15s'}}>
            <div style={{width:42,height:42,borderRadius:12,background:C.purpleL,
              display:'flex',alignItems:'center',justifyContent:'center',
              fontSize:16,fontWeight:800,color:C.purple,flexShrink:0}}>
              {p.nome.charAt(0)}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontWeight:700,fontSize:14,color:C.text,marginBottom:3}}>
                {p.nome}</div>
              <div style={{fontSize:12,color:C.muted,display:'flex',gap:10,flexWrap:'wrap'}}>
                <span>{p.telefone}</span>
                <span>{p.total_sessoes||0} sessão(ões)</span>
                {p.ultima_sessao&&<span>Última: {fmtData(p.ultima_sessao)}</span>}
              </div>
            </div>
            <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:6}}>
              <span style={{fontSize:11,fontWeight:700,padding:'3px 9px',borderRadius:20,
                background:U_COR[p.urgencia]+'20',color:U_COR[p.urgencia]}}>
                {U_LBL[p.urgencia]||'—'}
              </span>
              <div style={{display:'flex',alignItems:'center',gap:4,color:C.muted,fontSize:11}}>
                Ver prontuários <Ico d="M9 5l7 7-7 7" size={12}/>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Solicitar Alta Clínica ────────────────────────────────
function SolicitarAlta() {
  const [pacientes,setPacs] = useState<any[]>([])
  const [sel,setSel]        = useState<any>(null)
  const [altaExist,setAE]   = useState<any>(null)
  const [form,setForm]      = useState({motivo_alta:'objetivo_alcancado',resumo_caso:'',recomendacoes:''})
  const {msg,show}          = useToast()
  const location = useLocation()

  useEffect(()=>{
    api.estPacientes().then(list=>{
      // Só mostra pacientes em atendimento
      setPacs(list.filter((p:any)=>p.status==='em_atendimento'))
    })
  },[location.pathname])

  const carregarAlta = async(p:any)=>{
    setSel(p)
    try{const a=await api.altaDetalhe(p.id); setAE(a)}
    catch{setAE(null)}
  }

  const solicitar = async()=>{
    if(!sel)return
    if(!form.resumo_caso){show('⚠ Preencha o resumo do caso');return}
    try{
      await api.altaSolicitar(sel.id,form)
      show('✅ Solicitação enviada ao supervisor!')
      setSel(null); setAE(null)
      const list=await api.estPacientes()
      setPacs(list.filter((p:any)=>p.status==='em_atendimento'))
    }catch(e:any){show('❌ '+(e.response?.data?.error||e.message))}
  }

  const MOTIVOS: Record<string,string> = {
    objetivo_alcancado:'Objetivo terapêutico alcançado',
    abandono:'Abandono do tratamento',
    encaminhamento:'Encaminhamento para outro serviço',
    desistencia:'Desistência do paciente',
    outro:'Outro motivo',
  }

  return (
    <div>
      <PageHdr title="Solicitar Alta Clínica"
        sub="A alta precisa ser aprovada pelo supervisor antes de ser efetivada"/>

      {!pacientes.length&&(
        <div style={{padding:48,textAlign:'center',color:C.muted,background:C.surface,
          borderRadius:14,border:`1px solid ${C.border}`}}>
          <div style={{fontSize:32,marginBottom:8}}>✅</div>
          Nenhum paciente em atendimento ativo no momento.
        </div>
      )}

      <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:24}}>
        {pacientes.map(p=>(
          <div key={p.id} onClick={()=>carregarAlta(p)} style={{
            background:C.surface,border:`2px solid ${sel?.id===p.id?C.purple:C.border}`,
            borderRadius:13,padding:'14px 18px',cursor:'pointer',
            display:'flex',alignItems:'center',gap:12}}>
            <div style={{flex:1}}>
              <div style={{fontWeight:700,fontSize:14,color:C.text,marginBottom:2}}>{p.nome}</div>
              <div style={{fontSize:12,color:C.muted}}>
                {p.total_sessoes||0} sessão(ões) · {p.telefone}
              </div>
            </div>
            {sel?.id===p.id&&(
              <span style={{fontSize:11,fontWeight:700,padding:'3px 10px',borderRadius:20,
                background:C.purpleL,color:C.purple}}>Selecionado</span>
            )}
          </div>
        ))}
      </div>

      {sel&&(
        <Card style={{padding:20}}>
          {altaExist?.status_aprovacao==='pendente'?(
            <div style={{textAlign:'center',padding:24}}>
              <div style={{fontSize:32,marginBottom:8}}>⏳</div>
              <div style={{fontWeight:700,color:C.text,marginBottom:4}}>
                Solicitação já enviada</div>
              <p style={{fontSize:13,color:C.muted}}>
                Aguardando avaliação do supervisor.</p>
            </div>
          ):altaExist?.status_aprovacao==='aprovada'?(
            <div style={{textAlign:'center',padding:24}}>
              <div style={{fontSize:32,marginBottom:8}}>✅</div>
              <div style={{fontWeight:700,color:C.green,marginBottom:4}}>Alta aprovada</div>
              <p style={{fontSize:13,color:C.muted}}>
                Aprovada em {fmtData(altaExist.atualizado_em)}.</p>
            </div>
          ):(
            <div>
              <div style={{fontWeight:700,fontSize:15,color:C.text,marginBottom:16}}>
                Formulário de Alta — {sel.nome}
              </div>
              <div style={{display:'grid',gap:12}}>
                <Select label="Motivo da alta" value={form.motivo_alta}
                  onChange={e=>setForm(f=>({...f,motivo_alta:e.target.value}))}>
                  {Object.entries(MOTIVOS).map(([k,v])=>(
                    <option key={k} value={k}>{v}</option>
                  ))}
                </Select>
                <Textarea label="Resumo do caso *" rows={5} value={form.resumo_caso}
                  onChange={e=>setForm(f=>({...f,resumo_caso:e.target.value}))}
                  placeholder="Descreva a evolução do paciente, objetivos alcançados, intervenções principais..."/>
                <Textarea label="Recomendações para o paciente" rows={3} value={form.recomendacoes}
                  onChange={e=>setForm(f=>({...f,recomendacoes:e.target.value}))}
                  placeholder="Orientações após a alta, encaminhamentos, etc."/>
              </div>
              <div style={{background:C.amberL,borderRadius:9,padding:'10px 14px',
                fontSize:12,color:C.amber,margin:'16px 0'}}>
                ⚠ A alta só será efetivada após aprovação do supervisor. O paciente
                continua em atendimento até então.
              </div>
              <div style={{display:'flex',gap:10}}>
                <Btn variant="ghost" onClick={()=>{setSel(null);setAE(null)}}>Cancelar</Btn>
                <Btn variant="success" onClick={solicitar}>Enviar solicitação de alta</Btn>
              </div>
            </div>
          )}
        </Card>
      )}
      <Toast msg={msg}/>
    </div>
  )
}

// ── App root ──────────────────────────────────────────────
export default function EstagiarioApp() {
  return (
    <div style={{display:'flex',height:'100vh',background:C.bg,
      fontFamily:"'Segoe UI',system-ui,sans-serif",overflow:'hidden'}}>
      <div style={{flexShrink:0,boxShadow:'2px 0 20px rgba(0,0,0,.12)'}}>
        <Sidebar/>
      </div>
      <main style={{flex:1,overflowY:'auto',padding:'26px 30px'}}>
        <Routes>
          <Route path="/"            element={<Inicio/>}/>
          <Route path="/horarios"    element={<MeusHorarios/>}/>
          <Route path="/agenda"      element={<MinhaAgenda/>}/>
          <Route path="/pacientes"   element={<MeusPacientes/>}/>
          <Route path="/altas"       element={<SolicitarAlta/>}/>
        </Routes>
      </main>
    </div>
  )
}

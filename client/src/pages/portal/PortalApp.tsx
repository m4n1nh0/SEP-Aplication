import AgendaCalendar from '../../components/AgendaCalendar'
import React, { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { Toast, useToast } from '../../components/ui'
import * as api from '../../services/api'

const C = {
  bg:'#faf9f6', surface:'#ffffff', surfaceAlt:'#f5f4f0',
  border:'#e7e5e4', text:'#1c1917', sub:'#57534e', muted:'#a8a29e',
  green:'#16a34a', greenD:'#14532d', greenL:'#dcfce7', greenMid:'#166534',
  red:'#dc2626', redL:'#fef2f2',
  amber:'#b45309', amberL:'#fef3c7',
  teal:'#0891b2', tealL:'#cffafe',
  header:'linear-gradient(160deg,#0a1f12,#14301e)',
  tabActive:'#16a34a',
}

const fmtDia  = (s:string) => new Date(s).getDate()
const fmtMes  = (s:string) => new Date(s).toLocaleDateString('pt-BR',{month:'short'}).toUpperCase().replace('.','')
const fmtHora = (s:string) => new Date(s).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})
const fmtFull = (s:string) => new Date(s).toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'})

const STATUS_MAP: Record<string,{label:string;cor:string;bg:string;desc:string}> = {
  aguardando:     {label:'Aguardando contato', cor:C.amber,   bg:C.amberL, desc:'Você está na fila. Em breve nossa equipe entrará em contato.'},
  em_contato:     {label:'Em contato',         cor:C.teal,    bg:C.tealL,  desc:'Nossa equipe já está em contato para agendar sua consulta.'},
  agendado:       {label:'Consulta agendada',  cor:'#7c3aed', bg:'#ede9fe',desc:'Você tem uma consulta agendada. Veja os detalhes abaixo.'},
  em_atendimento: {label:'Em atendimento',     cor:C.green,   bg:C.greenL, desc:'Você está com acompanhamento psicológico ativo.'},
  alta:           {label:'Alta clínica',       cor:C.greenD,  bg:C.greenL, desc:'Seu atendimento foi concluído com sucesso.'},
  cancelado:      {label:'Cancelado',          cor:C.red,     bg:C.redL,   desc:'Atendimento cancelado. Entre em contato para retornar.'},
  desistencia:    {label:'Saiu da fila',       cor:C.muted,   bg:'#f5f4f0',desc:'Você saiu da fila de espera.'},
}

function Card({children,style}:{children:React.ReactNode;style?:React.CSSProperties}) {
  return <div style={{background:C.surface,borderRadius:14,padding:18,border:`1px solid ${C.border}`,marginBottom:14,...style}}>{children}</div>
}

function Sheet({open,onClose,children}:{open:boolean;onClose:()=>void;children:React.ReactNode}) {
  if(!open) return null
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.45)',zIndex:100,display:'flex',alignItems:'flex-end',justifyContent:'center'}} onClick={onClose}>
      <div style={{background:C.surface,borderRadius:'20px 20px 0 0',padding:'22px 22px 44px',width:'100%',maxWidth:500,animation:'slideUp .25s ease'}} onClick={e=>e.stopPropagation()}>
        <div style={{width:36,height:4,background:C.border,borderRadius:2,margin:'0 auto 18px'}}/>
        {children}
      </div>
    </div>
  )
}

export default function PortalApp() {
  const {logout,user}      = useAuth()
  const [dados,setDados]   = useState<any>(null)
  const [aba,setAba]       = useState<'inicio'|'consultas'|'fila'|'disponibilidade'>('inicio')
  const [sheetCancel,setSC]= useState(false)
  const [sheetFila,setSF]  = useState(false)
  const [motivo,setMotivo] = useState('')
  const [agSel,setAgSel]   = useState<any>(null)
  const [loading,setLoad]  = useState(true)
  const {msg,show}         = useToast()

  const DIAS  = ['seg','ter','qua','qui','sex']
  const HORAS = ['08:00','09:00','10:00','11:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00']
  const DIAS_LBL: Record<string,string> = {seg:'Segunda',ter:'Terça',qua:'Quarta',qui:'Quinta',sex:'Sexta'}
  const [disp,setDisp] = useState<Record<string,string[]>>({})

  useEffect(()=>{
    api.portalDados().then(d=>{
      setDados(d)
      if(d.disponibilidade) setDisp(typeof d.disponibilidade==='string'?JSON.parse(d.disponibilidade):d.disponibilidade)
      setLoad(false)
    }).catch(()=>setLoad(false))
  },[])

  if(loading) return <div style={{minHeight:'100vh',background:C.bg,display:'flex',alignItems:'center',justifyContent:'center',color:C.muted,fontSize:14}}>Carregando...</div>
  if(!dados)  return <div style={{minHeight:'100vh',background:C.bg,display:'flex',alignItems:'center',justifyContent:'center',color:C.red,fontSize:14}}>Erro ao carregar dados.</div>

  const info    = STATUS_MAP[dados.status]||STATUS_MAP.aguardando
  const proxima = dados.agendamentos?.find((a:any)=>(a.status==='confirmado'||a.status==='pendente')&&new Date(a.data_hora_inicio)>new Date())

  const cancelar = async () => {
    if(!motivo){show('Selecione um motivo');return}
    await api.portalCancelarAg(agSel.id,motivo)
    setDados((d:any)=>({...d,status:'aguardando',posicao_fila:99,agendamentos:d.agendamentos.map((a:any)=>a.id===agSel.id?{...a,status:'cancelado_paciente'}:a)}))
    setSC(false);setMotivo('');show('Consulta cancelada. Você voltou para a fila.')
  }
  const confirmar = async (id:number) => {
    await api.portalConfirmarAg(id)
    setDados((d:any)=>({...d,agendamentos:(d.agendamentos||[]).map((a:any)=>
      a.id===id?{...a,status:'confirmado'}:a
    )}))
    show('✅ Consulta confirmada!')
  }
  const sairFila = async () => {
    await api.portalSairFila()
    setDados((d:any)=>({...d,status:'desistencia',posicao_fila:null}))
    setSF(false);show('Você saiu da fila.')
  }
  const salvarDisp = async () => {
    await api.portalDisponib(disp)
    setDados((d:any)=>({...d,disponibilidade:disp}))
    show('✅ Disponibilidade atualizada!')
  }
  const toggleHora = (dia:string,h:string) => {
    setDisp(prev=>({...prev,[dia]:(prev[dia]||[]).includes(h)?(prev[dia]||[]).filter(x=>x!==h):[...(prev[dia]||[]),h]}))
  }

  const TABS: {k:'inicio'|'consultas'|'fila'|'disponibilidade';l:string}[] = [
    {k:'inicio',l:'Início'},{k:'consultas',l:'Consultas'},{k:'fila',l:'Fila'},{k:'disponibilidade',l:'Disponibilidade'}
  ]

  return (
    <div style={{minHeight:'100vh',background:C.bg,fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
      <style>{`@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>

      {/* Header */}
      <header style={{background:C.header,padding:'0 20px',height:58,display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:10}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:32,height:32,borderRadius:9,background:'linear-gradient(135deg,#16a34a,#059669)',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" opacity=".2"/>
              <path d="M7 13l3-3 2 2 3-4 2 2"/>
            </svg>
          </div>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:'#fafaf9'}}>Portal do Paciente</div>
            <div style={{fontSize:9,color:'rgba(255,255,255,.4)'}}>SEP · Estácio Aracaju</div>
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <span style={{fontSize:12,color:'rgba(255,255,255,.6)',fontWeight:500}}>Olá, {user?.nome.split(' ')[0]}</span>
          <button onClick={logout} style={{padding:'5px 13px',borderRadius:8,border:'1px solid rgba(255,255,255,.15)',background:'rgba(255,255,255,.08)',color:'rgba(255,255,255,.6)',fontSize:11,fontWeight:600,cursor:'pointer'}}>Sair</button>
        </div>
      </header>

      {/* Tabs */}
      <nav style={{background:C.surface,borderBottom:`1px solid ${C.border}`,display:'flex',overflowX:'auto',position:'sticky',top:58,zIndex:9}}>
        {TABS.map(t=>(
          <button key={t.k} onClick={()=>setAba(t.k)} style={{
            padding:'13px 18px',border:'none',
            borderBottom:`2.5px solid ${aba===t.k?C.tabActive:'transparent'}`,
            background:'transparent',fontSize:13,cursor:'pointer',
            color:aba===t.k?C.green:C.muted,
            fontWeight:aba===t.k?700:500,flexShrink:0,fontFamily:'inherit',
          }}>{t.l}</button>
        ))}
      </nav>

      <div style={{maxWidth:560,margin:'0 auto',padding:'22px 18px'}}>

        {/* ── INÍCIO ── */}
        {aba==='inicio'&&(
          <div>
            {/* Status card */}
            <Card style={{borderLeft:`4px solid ${info.cor}`,borderRadius:'0 14px 14px 0'}}>
              <div style={{display:'flex',alignItems:'flex-start',gap:14}}>
                <div style={{width:46,height:46,borderRadius:12,background:info.bg,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:20}}>
                  {dados.status==='aguardando'?'⏳':dados.status==='em_contato'?'📞':dados.status==='agendado'?'📅':dados.status==='em_atendimento'?'💚':dados.status==='alta'?'✅':'🚪'}
                </div>
                <div>
                  <div style={{fontSize:10,color:C.muted,fontWeight:700,textTransform:'uppercase',letterSpacing:'.06em',marginBottom:3}}>Seu status</div>
                  <div style={{fontSize:17,fontWeight:800,color:info.cor,marginBottom:5}}>{info.label}</div>
                  <div style={{fontSize:13,color:C.sub,lineHeight:1.55}}>{info.desc}</div>
                </div>
              </div>
              {dados.posicao_fila&&(
                <div style={{marginTop:14,padding:'11px 14px',background:C.bg,borderRadius:10,border:`1px solid ${C.border}`,display:'flex',alignItems:'center',gap:12}}>
                  <div style={{fontSize:26,fontWeight:900,color:C.green,lineHeight:1}}>#{dados.posicao_fila}</div>
                  <div>
                    <div style={{fontSize:12,fontWeight:700,color:C.text}}>Posição na fila</div>
                    <div style={{fontSize:11,color:C.muted}}>Aguardando há {dados.dias_espera} dia(s)</div>
                  </div>
                </div>
              )}
            </Card>

            {/* Próxima consulta */}
            {proxima&&(
              <Card>
                <div style={{fontSize:10,color:C.muted,fontWeight:700,textTransform:'uppercase',letterSpacing:'.06em',marginBottom:12}}>Próxima Consulta</div>
                <div style={{display:'flex',gap:14,marginBottom:14}}>
                  <div style={{textAlign:'center',background:C.greenL,borderRadius:11,padding:'10px 13px',flexShrink:0}}>
                    <div style={{fontSize:24,fontWeight:900,color:C.greenD,lineHeight:1}}>{fmtDia(proxima.data_hora_inicio)}</div>
                    <div style={{fontSize:10,color:C.green,fontWeight:700}}>{fmtMes(proxima.data_hora_inicio)}</div>
                  </div>
                  <div>
                    <div style={{fontWeight:700,fontSize:16,color:C.text,marginBottom:4}}>{fmtHora(proxima.data_hora_inicio)}</div>
                    <div style={{fontSize:13,color:C.sub,marginBottom:2}}>{proxima.estagiario_nome}</div>
                    <div style={{fontSize:13,color:C.sub,marginBottom:2}}>{proxima.modalidade==='presencial'?`Sala ${proxima.sala}`:'Online'}</div>
                    <div style={{fontSize:11,color:C.muted}}>{fmtFull(proxima.data_hora_inicio)}</div>
                  </div>
                </div>
                <div style={{display:'flex',gap:8}}>
                  <button onClick={()=>{setAgSel(proxima);setSC(true)}} style={{flex:1,padding:10,borderRadius:10,border:`1.5px solid ${C.red}40`,background:C.redL,color:C.red,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>Cancelar</button>
                  <button onClick={()=>confirmar(proxima.id)} style={{flex:1,padding:10,borderRadius:10,border:`1.5px solid ${C.green}40`,background:C.greenL,color:C.greenD,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>✅ Confirmar consulta</button>
                </div>
              </Card>
            )}

            {/* Ações rápidas */}
            <Card>
              <div style={{fontSize:10,color:C.muted,fontWeight:700,textTransform:'uppercase',letterSpacing:'.06em',marginBottom:12}}>Ações rápidas</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                {([['📅 Ver consultas','consultas'],['⏳ Status na fila','fila'],['🗓 Disponibilidade','disponibilidade']] as const).map(([l,t])=>(
                  <button key={t} onClick={()=>setAba(t as any)} style={{padding:12,borderRadius:10,border:`1px solid ${C.border}`,background:C.bg,color:C.text,fontSize:12,fontWeight:500,cursor:'pointer',textAlign:'left',fontFamily:'inherit'}}>{l}</button>
                ))}
                {['aguardando','em_contato'].includes(dados.status)&&(
                  <button onClick={()=>setSF(true)} style={{padding:12,borderRadius:10,border:`1px solid ${C.red}40`,background:C.redL,color:C.red,fontSize:12,fontWeight:500,cursor:'pointer',textAlign:'left',fontFamily:'inherit'}}>🚪 Sair da fila</button>
                )}
              </div>
            </Card>

            {/* Endereço */}
            <div style={{background:C.greenL,borderRadius:13,padding:'14px 16px',border:`1px solid ${C.green}30`,display:'flex',alignItems:'center',gap:12}}>
              <div style={{fontSize:20}}>📍</div>
              <div>
                <div style={{fontSize:12,fontWeight:700,color:C.greenD}}>SEP — Estácio Aracaju</div>
                <div style={{fontSize:11,color:C.green,marginTop:2}}>Seg–Sex · 08h–18h · (79) 3217-0000</div>
              </div>
            </div>
          </div>
        )}

        {/* ── CONSULTAS ── */}
        {aba==='consultas'&&(
          <div>
            <h2 style={{fontSize:18,fontWeight:800,color:C.text,marginBottom:12,
              letterSpacing:'-.02em'}}>Minhas Consultas</h2>
            <p style={{fontSize:13,color:C.muted,marginBottom:16}}>
              Navegue por mês, semana ou dia e clique em uma consulta para confirmar ou cancelar.
            </p>
            <div style={{background:'#fff',borderRadius:14,border:`1px solid ${C.border}`,
              padding:'14px 16px'}}>
              <AgendaCalendar
                items={(dados.agendamentos||[]).map((a:any)=>({
                  id:          a.id,
                  paciente_nome: dados.nome || 'Você',
                  estagiario_nome: a.estagiario_nome,
                  data_hora_inicio: a.data_hora_inicio,
                  data_hora_fim:    a.data_hora_fim,
                  status:      a.status,
                  modalidade:  a.modalidade,
                  sala:        a.sala,
                  sessao_numero: a.sessao_numero,
                }))}
                accent="#16a34a"
                onEventClick={(item:any)=>{
                  if(item.status==='confirmado'||item.status==='pendente'){
                    if(window.confirm(`Cancelar consulta de ${new Date(item.data_hora_inicio.replace(' ','T')).toLocaleDateString('pt-BR')}?`)){
                      api.portalCancelarAg(item.id,'Cancelado pelo paciente').then(()=>{
                        setDados((d:any)=>({...d,agendamentos:(d.agendamentos||[]).map((x:any)=>
                          x.id===item.id?{...x,status:'cancelado_paciente'}:x
                        )}))
                      }).catch(()=>{})
                    }
                  }
                }}
              />
            </div>
            <p style={{fontSize:11,color:C.muted,marginTop:10,textAlign:'center'}}>
              Consultas confirmadas aparecem em verde · Pendentes em laranja
            </p>
          </div>
        )}
        {aba==='fila'&&(
          <div>
            <h2 style={{fontSize:18,fontWeight:800,color:C.text,marginBottom:16,letterSpacing:'-.02em'}}>Status na Fila</h2>
            <Card style={{textAlign:'center',padding:'28px 20px'}}>
              {dados.posicao_fila?(
                <>
                  <div style={{fontSize:68,fontWeight:900,color:C.green,lineHeight:1,marginBottom:8}}>#{dados.posicao_fila}</div>
                  <div style={{fontSize:16,fontWeight:700,color:C.text,marginBottom:8}}>Sua posição na fila</div>
                  <div style={{fontSize:13,color:C.sub,marginBottom:18}}>Aguardando há <strong>{dados.dias_espera}</strong> dia(s)</div>
                  <div style={{background:C.greenL,borderRadius:11,padding:'13px 15px',border:`1px solid ${C.green}30`,textAlign:'left'}}>
                    <div style={{fontSize:11,fontWeight:700,color:C.greenD,marginBottom:5}}>Como funciona a fila?</div>
                    <p style={{fontSize:12,color:C.green,lineHeight:1.6,margin:0}}>A ordem é por <strong>urgência</strong> e depois por <strong>data de cadastro</strong>. Pacientes com risco têm prioridade máxima.</p>
                  </div>
                </>
              ):(
                <>
                  <div style={{fontSize:48,marginBottom:12}}>{dados.status==='agendado'||dados.status==='em_atendimento'?'📅':'😔'}</div>
                  <div style={{fontSize:15,fontWeight:700,color:C.text,marginBottom:8}}>Você não está na fila</div>
                  <p style={{fontSize:13,color:C.sub,margin:0}}>{dados.status==='agendado'||dados.status==='em_atendimento'?'Você já tem consulta agendada ou está em atendimento.':'Entre em contato com o SEP para retornar.'}</p>
                </>
              )}
            </Card>
            {['aguardando','em_contato'].includes(dados.status)&&(
              <button onClick={()=>setSF(true)} style={{width:'100%',padding:13,borderRadius:12,border:`1.5px solid ${C.red}40`,background:C.redL,color:C.red,fontSize:14,fontWeight:700,cursor:'pointer',marginTop:4,fontFamily:'inherit'}}>
                Solicitar saída da fila
              </button>
            )}
          </div>
        )}

        {/* ── DISPONIBILIDADE ── */}
        {aba==='disponibilidade'&&(
          <div>
            <h2 style={{fontSize:18,fontWeight:800,color:C.text,marginBottom:4,letterSpacing:'-.02em'}}>Minha Disponibilidade</h2>
            <p style={{fontSize:13,color:C.muted,marginBottom:18}}>Marque os horários em que pode comparecer ao SEP para consultas.</p>
            <div style={{display:'grid',gap:10,marginBottom:20}}>
              {DIAS.map(d=>(
                <div key={d} style={{background:C.surface,borderRadius:12,padding:14,border:`1px solid ${C.border}`}}>
                  <p style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:10}}>{DIAS_LBL[d]}</p>
                  <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                    {HORAS.map(h=>{
                      const sel=(disp[d]||[]).includes(h)
                      return (
                        <button key={h} onClick={()=>toggleHora(d,h)} style={{
                          padding:'5px 12px',borderRadius:8,fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit',
                          border:`1.5px solid ${sel?C.green:C.border}`,
                          background:sel?C.greenL:C.bg,color:sel?C.greenD:C.muted,
                        }}>{h}</button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
            <button onClick={salvarDisp} style={{width:'100%',padding:13,borderRadius:12,border:'none',background:`linear-gradient(135deg,${C.greenMid},${C.green})`,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
              Salvar disponibilidade
            </button>
          </div>
        )}
      </div>

      {/* Sheet cancelar */}
      <Sheet open={sheetCancel} onClose={()=>setSC(false)}>
        <h3 style={{fontSize:17,fontWeight:800,color:C.text,marginBottom:6}}>Cancelar Consulta</h3>
        {agSel&&<p style={{fontSize:13,color:C.sub,marginBottom:14}}>{fmtFull(agSel.data_hora_inicio)} às {fmtHora(agSel.data_hora_inicio)}</p>}
        <div style={{background:C.amberL,border:`1px solid ${C.amber}30`,borderRadius:10,padding:'11px 13px',marginBottom:14,fontSize:12,color:C.amber}}>
          Ao cancelar você <strong>voltará para a fila de espera</strong>.
        </div>
        <select value={motivo} onChange={e=>setMotivo(e.target.value)} style={{width:'100%',padding:'10px 13px',borderRadius:10,border:`1.5px solid ${C.border}`,fontSize:13,outline:'none',background:C.bg,color:C.text,marginBottom:14,fontFamily:'inherit'}}>
          <option value="">Selecione um motivo...</option>
          <option value="compromisso">Tenho um compromisso no horário</option>
          <option value="saude">Problemas de saúde</option>
          <option value="transporte">Dificuldade de transporte</option>
          <option value="horario">Preciso de outro horário</option>
          <option value="melhora">Me sinto melhor</option>
          <option value="outro">Outro motivo</option>
        </select>
        <div style={{display:'flex',gap:9}}>
          <button onClick={()=>setSC(false)} style={{flex:1,padding:12,borderRadius:11,border:`1.5px solid ${C.border}`,background:C.surface,color:C.sub,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Manter</button>
          <button onClick={cancelar} style={{flex:1.5,padding:12,borderRadius:11,border:'none',background:motivo?C.red:'#fca5a5',color:'#fff',fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>Confirmar cancelamento</button>
        </div>
      </Sheet>

      {/* Sheet sair fila */}
      <Sheet open={sheetFila} onClose={()=>setSF(false)}>
        <h3 style={{fontSize:17,fontWeight:800,color:C.text,marginBottom:6}}>Sair da Fila</h3>
        <p style={{fontSize:13,color:C.sub,marginBottom:14}}>Você perderá sua posição atual. Para retornar, precisará entrar em contato com o SEP.</p>
        <div style={{background:C.redL,border:`1px solid ${C.red}30`,borderRadius:10,padding:'11px 13px',marginBottom:14,fontSize:12,color:C.red}}>
          Esta ação <strong>removerá seu cadastro da fila</strong>.
        </div>
        <div style={{display:'flex',gap:9}}>
          <button onClick={()=>setSF(false)} style={{flex:1,padding:12,borderRadius:11,border:`1.5px solid ${C.border}`,background:C.surface,color:C.sub,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Permanecer</button>
          <button onClick={sairFila} style={{flex:1,padding:12,borderRadius:11,border:'none',background:C.red,color:'#fff',fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>Sair da fila</button>
        </div>
      </Sheet>

      <Toast msg={msg}/>
    </div>
  )
}

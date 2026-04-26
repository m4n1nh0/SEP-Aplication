import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { ForcaSenha, Btn } from '../components/ui'

const DEMOS = [
  { perfil:'Coordenador',   email:'admin@sep.estacio.br',        senha:'Admin@123',   c:'#16a34a', bg:'#dcfce7' },
  { perfil:'Supervisor',    email:'supervisor@sep.estacio.br',   senha:'Superv@123',  c:'#b45309', bg:'#fef3c7' },
  { perfil:'Recepcionista', email:'recepcao@sep.estacio.br',     senha:'Recep@123',   c:'#0e7490', bg:'#cffafe' },
  { perfil:'Estagiária',    email:'ana.paula@estacio.br',        senha:'Estag@123',   c:'#5b21b6', bg:'#ede9fe' },
  { perfil:'Paciente',      email:'pedro@email.com',             senha:'Pac@123',     c:'#14532d', bg:'#dcfce7' },
]

const DIAS_SEMANA = [
  {k:'seg',l:'Segunda'},{k:'ter',l:'Terça'},{k:'qua',l:'Quarta'},{k:'qui',l:'Quinta'},{k:'sex',l:'Sexta'}
]
const HORAS = ['08:00','09:00','10:00','11:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00']

export default function Login() {
  const { login } = useAuth()
  const [aba,     setAba]     = useState<'login'|'cadastro'>('login')
  // Login
  const [email,   setEmail]   = useState('')
  const [senha,   setSenha]   = useState('')
  const [totp,    setTotp]    = useState('')
  const [reqTotp, setReqTotp] = useState(false)
  const [err,     setErr]     = useState('')
  const [loading, setLoad]    = useState(false)
  // Cadastro — etapas
  const [step,    setStep]    = useState(0)
  const [cad,     setCad]     = useState<any>({
    urgencia:'sem_urgencia', ja_fez_terapia:false, uso_medicamento:false,
    medicamento_psiquiatra:false, historico_internacao:false, risco_suicidio:false,
  })
  const setF = (k:string,v:any) => setCad((p:any)=>({...p,[k]:v}))

  const inp = (style?:React.CSSProperties): React.CSSProperties => ({
    width:'100%',padding:'11px 14px',borderRadius:10,border:'1.5px solid #e7e5e4',
    background:'#faf9f6',color:'#1c1917',fontSize:14,outline:'none',minHeight:42,
    boxSizing:'border-box',fontFamily:'inherit',...style
  })

  const handleLogin = async () => {
    setErr(''); setLoad(true)
    try {
      const res = await login(email, senha, reqTotp ? totp : undefined)
      if (res.requires_totp) setReqTotp(true)
    } catch (e:any) { setErr(e.message) }
    finally { setLoad(false) }
  }

  const handleCadastro = async () => {
    setErr(''); setLoad(true)
    try {
      const res = await fetch('/api/auth/cadastro', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ ...cad, cpf: cad.cpf?.replace(/\D/g,'') }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      if (import.meta.env.DEV && data.email_token) {
        await fetch(`/api/auth/verificar/${data.email_token}`)
      }
      await login(cad.email, cad.senha)
    } catch(e:any) { setErr(e.message); setStep(0) }
    finally { setLoad(false) }
  }

  const STEPS = ['Dados pessoais','Triagem clínica','Disponibilidade','Acesso']
  const canNext = [
    !!cad.nome && !!cad.cpf && !!cad.telefone && !!cad.email,
    !!cad.motivo_busca,
    true,
    !!(cad.senha && cad.senha.length >= 8 && /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(cad.senha)),
  ]

  const wrap: React.CSSProperties = { minHeight:'100vh',background:'#faf9f6',display:'flex',alignItems:'stretch',fontFamily:"'Segoe UI',system-ui,sans-serif" }
  const box:  React.CSSProperties = { background:'#ffffff',borderRadius:0,padding:'40px 36px',width:'100%',maxWidth:420,maxHeight:'100vh',overflowY:'auto',display:'flex',flexDirection:'column',justifyContent:'center',marginLeft:'auto' }

  return (
    <div style={wrap}>
      {/* Painel esquerdo — identidade */}
      <div style={{flex:1,background:'linear-gradient(145deg,#1a3a2a,#2d5a3d,#1e4530)',padding:'44px',display:'flex',flexDirection:'column',justifyContent:'center',minHeight:'100vh'}}>
        <div style={{display:'inline-flex',alignItems:'center',gap:7,background:'rgba(255,255,255,.1)',border:'1px solid rgba(255,255,255,.15)',borderRadius:10,padding:'6px 13px',fontSize:11,color:'rgba(255,255,255,.55)',marginBottom:22,width:'fit-content'}}>
          <div style={{width:6,height:6,borderRadius:'50%',background:'#86efac'}}/>Sistema ativo · v3.0
        </div>
        <div style={{width:60,height:60,borderRadius:17,background:'rgba(255,255,255,.1)',border:'1px solid rgba(255,255,255,.15)',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:20}}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round">
            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" opacity=".2"/>
            <path d="M7 13l3-3 2 2 3-4 2 2"/>
          </svg>
        </div>
        <h1 style={{fontSize:26,fontWeight:800,color:'#fff',lineHeight:1.2,marginBottom:12,letterSpacing:'-.02em'}}>Serviço Escola<br/>de Psicologia</h1>
        <p style={{fontSize:13,color:'rgba(255,255,255,.42)',lineHeight:1.75,maxWidth:280}}>Cuidado acessível, organizado e humano. Estácio Aracaju.</p>
        <div style={{marginTop:26,display:'flex',flexDirection:'column',gap:9}}>
          {['Atendimento psicológico gratuito','Fila de espera organizada e justa','Prontuários seguros na nuvem','4 perfis com controle de acesso'].map(f=>(
            <div key={f} style={{display:'flex',alignItems:'center',gap:10,fontSize:12,color:'rgba(255,255,255,.45)'}}>
              <div style={{width:5,height:5,borderRadius:'50%',background:'#86efac',flexShrink:0}}/>
              {f}
            </div>
          ))}
        </div>
      </div>
      <div style={box}>
        {/* Logo */}
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:28}}>
          <div style={{width:36,height:36,borderRadius:10,background:'linear-gradient(135deg,#16a34a,#059669)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><path d="M7 13l3-3 2 2 3-4 2 2"/></svg>
          </div>
          <span style={{fontSize:15,fontWeight:800,color:'#1c1917',letterSpacing:'-.02em'}}>SEP Sistema</span>
        </div>
        {/* Tabs */}
        <div style={{display:'flex',background:'#f5f4f0',borderRadius:10,padding:4,marginBottom:24,gap:4}}>
          {(['login','cadastro'] as const).map(t=>(
            <button key={t} onClick={()=>{setAba(t);setErr('');setStep(0)}} style={{
              flex:1,padding:'9px',borderRadius:8,border:'none',fontSize:13,fontWeight:600,
              cursor:'pointer',minHeight:38,fontFamily:'inherit',
              background:aba===t?'linear-gradient(135deg,#166534,#16a34a)':'transparent',
              color:aba===t?'#fff':'#a8a29e',transition:'all .2s'
            }}>
              {t==='login'?'Entrar':'Quero atendimento'}
            </button>
          ))}
        </div>

        {/* ── LOGIN ── */}
        {aba==='login' && (
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            {!reqTotp ? (
              <>
                <div style={{display:'flex',flexDirection:'column',gap:6}}>
                  <label style={{fontSize:13,fontWeight:600,color:'#8b949e'}}>E-mail</label>
                  <input type="email" placeholder="seu@email.com" value={email} onChange={e=>setEmail(e.target.value)} style={inp()} onKeyDown={e=>e.key==='Enter'&&handleLogin()}/>
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:6}}>
                  <label style={{fontSize:13,fontWeight:600,color:'#8b949e'}}>Senha</label>
                  <input type="password" placeholder="••••••••" value={senha} onChange={e=>setSenha(e.target.value)} style={inp()} onKeyDown={e=>e.key==='Enter'&&handleLogin()}/>
                </div>
              </>
            ) : (
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                <label style={{fontSize:13,fontWeight:600,color:'#8b949e'}}>Código do autenticador (2FA)</label>
                <input type="text" inputMode="numeric" maxLength={6} placeholder="000000" value={totp} onChange={e=>setTotp(e.target.value)} style={{...inp(),letterSpacing:'0.3em',textAlign:'center',fontSize:22}} onKeyDown={e=>e.key==='Enter'&&handleLogin()}/>
                <p style={{fontSize:12,color:'#8b949e'}}>Abra seu aplicativo de autenticação e insira o código de 6 dígitos.</p>
              </div>
            )}

            {err && <p style={{color:'#dc2626',fontSize:12,background:'#fef2f2',padding:'10px 14px',borderRadius:9,border:'1px solid #fecaca'}}>{err}</p>}

            <Btn full onClick={handleLogin} disabled={loading} style={{background:'linear-gradient(135deg,#166534,#16a34a)',borderRadius:11,padding:'13px',fontSize:14}}>
              {loading?'Entrando...':reqTotp?'Verificar código':'Entrar →'}
            </Btn>

            <div style={{margin:'10px 0 0 0',textAlign:'right'}}>
              <a href="/recuperar-senha" style={{fontSize:12,color:'#166534',textDecoration:'underline',cursor:'pointer'}}>Esqueci minha senha</a>
            </div>

            {/* Demos */}
            <div>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
                <div style={{flex:1,height:'1px',background:'#e7e5e4'}}/>
                <span style={{fontSize:10,fontWeight:600,color:'#a8a29e'}}>Acesso rápido (demo)</span>
                <div style={{flex:1,height:'1px',background:'#e7e5e4'}}/>
              </div>
              <div style={{display:'flex',gap:7,flexWrap:'wrap'}}>
                {DEMOS.map(d=>(
                  <button key={d.perfil} onClick={()=>{setEmail(d.email);setSenha(d.senha);setErr('');setReqTotp(false)}}
                    style={{fontSize:11,fontWeight:700,padding:'5px 13px',borderRadius:20,border:'none',cursor:'pointer',background:d.bg,color:d.c,fontFamily:'inherit'}}>
                    {d.perfil}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── CADASTRO ── */}
        {aba==='cadastro' && (
          <div>
            {/* Progress */}
            <div style={{marginBottom:24}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:10}}>
                {STEPS.map((s,i)=>(
                  <div key={s} style={{textAlign:'center',flex:1}}>
                    <div style={{width:28,height:28,borderRadius:'50%',margin:'0 auto 4px',display:'grid',placeItems:'center',fontSize:12,fontWeight:700,background:i<step?'#16a34a':i===step?'linear-gradient(135deg,#166534,#16a34a)':'#e7e5e4',color:i<=step?'#fff':'#a8a29e',transition:'all .3s'}}>{i<step?'✓':i+1}</div>
                    <div style={{fontSize:10,color:i===step?'#1c1917':'#a8a29e',fontWeight:i===step?700:400}}>{s}</div>
                  </div>
                ))}
              </div>
              <div style={{height:2,background:'#e7e5e4',borderRadius:3,overflow:'hidden'}}>
                <div style={{height:'100%',background:'linear-gradient(to right,#166534,#16a34a)',width:`${(step/3)*100}%`,transition:'width .3s'}}/>
              </div>
            </div>

            {/* Etapa 0 — Dados pessoais */}
            {step===0 && (
              <div style={{display:'flex',flexDirection:'column',gap:12}}>
                <p style={{fontSize:12,color:'#8b949e',marginBottom:4}}>Preencha seus dados pessoais para solicitar atendimento psicológico no SEP.</p>
                {[{l:'Nome completo *',k:'nome',t:'text',p:'Nome e sobrenome'},{l:'CPF *',k:'cpf',t:'text',p:'000.000.000-00'},{l:'Telefone / WhatsApp *',k:'telefone',t:'tel',p:'(79) 9 9999-9999'},{l:'Contato de emergência',k:'contato_emergencia',t:'tel',p:'(79) 9 9999-9999'},{l:'Nome do contato de emergência',k:'nome_emergencia',t:'text',p:'Nome completo'},{l:'Data de nascimento',k:'data_nascimento',t:'date',p:''},{l:'E-mail *',k:'email',t:'email',p:'seu@email.com'}].map(f=>(
                  <div key={f.k} style={{display:'flex',flexDirection:'column',gap:6}}>
                    <label style={{fontSize:13,fontWeight:600,color:'#8b949e'}}>{f.l}</label>
                    <input type={f.t} placeholder={f.p} value={cad[f.k]||''} onChange={e=>setF(f.k,e.target.value)} style={inp()}/>
                  </div>
                ))}
                <div style={{display:'flex',flexDirection:'column',gap:6}}>
                  <label style={{fontSize:13,fontWeight:600,color:'#8b949e'}}>Gênero</label>
                  <select value={cad.genero||''} onChange={e=>setF('genero',e.target.value)} style={inp()}>
                    <option value="">Selecione</option>
                    <option value="masculino">Masculino</option>
                    <option value="feminino">Feminino</option>
                    <option value="nao_binario">Não-binário</option>
                    <option value="outro">Outro</option>
                    <option value="prefiro_nao_dizer">Prefiro não dizer</option>
                  </select>
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:6}}>
                  <label style={{fontSize:13,fontWeight:600,color:'#8b949e'}}>Escolaridade</label>
                  <select value={cad.escolaridade||''} onChange={e=>setF('escolaridade',e.target.value)} style={inp()}>
                    <option value="">Selecione</option>
                    <option value="fundamental_incompleto">Fundamental incompleto</option>
                    <option value="fundamental_completo">Fundamental completo</option>
                    <option value="medio_incompleto">Médio incompleto</option>
                    <option value="medio_completo">Médio completo</option>
                    <option value="superior_incompleto">Superior incompleto</option>
                    <option value="superior_completo">Superior completo</option>
                    <option value="pos_graduacao">Pós-graduação</option>
                  </select>
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:6}}>
                  <label style={{fontSize:13,fontWeight:600,color:'#8b949e'}}>Renda familiar</label>
                  <select value={cad.renda_familiar||''} onChange={e=>setF('renda_familiar',e.target.value)} style={inp()}>
                    <option value="">Selecione</option>
                    <option value="ate_1sm">Até 1 salário mínimo</option>
                    <option value="1_a_2sm">1 a 2 salários mínimos</option>
                    <option value="2_a_3sm">2 a 3 salários mínimos</option>
                    <option value="3_a_5sm">3 a 5 salários mínimos</option>
                    <option value="acima_5sm">Acima de 5 salários mínimos</option>
                  </select>
                </div>
              </div>
            )}

            {/* Etapa 1 — Triagem clínica */}
            {step===1 && (
              <div style={{display:'flex',flexDirection:'column',gap:14}}>
                <p style={{fontSize:12,color:'#8b949e'}}>Essas informações são confidenciais e serão avaliadas pelo nosso supervisor clínico para verificar a necessidade de atendimento.</p>
                <div style={{display:'flex',flexDirection:'column',gap:6}}>
                  <label style={{fontSize:13,fontWeight:600,color:'#8b949e'}}>Motivo pelo qual busca atendimento * <span style={{fontWeight:400}}>(descreva com detalhes)</span></label>
                  <textarea rows={4} value={cad.motivo_busca||''} onChange={e=>setF('motivo_busca',e.target.value)} placeholder="Descreva o que está sentindo, o que motivou a busca por atendimento psicológico..." style={{...inp(),resize:'vertical',fontFamily:'inherit',minHeight:100}}/>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                  <div style={{display:'flex',flexDirection:'column',gap:6}}>
                    <label style={{fontSize:13,fontWeight:600,color:'#8b949e'}}>Há quanto tempo?</label>
                    <select value={cad.tempo_sintomas||''} onChange={e=>setF('tempo_sintomas',e.target.value)} style={inp()}>
                      <option value="">Selecione</option>
                      <option value="menos_1mes">Menos de 1 mês</option>
                      <option value="1_a_3meses">1 a 3 meses</option>
                      <option value="3_a_6meses">3 a 6 meses</option>
                      <option value="6_a_12meses">6 meses a 1 ano</option>
                      <option value="mais_1ano">Mais de 1 ano</option>
                    </select>
                  </div>
                  <div style={{display:'flex',flexDirection:'column',gap:6}}>
                    <label style={{fontSize:13,fontWeight:600,color:'#8b949e'}}>Intensidade</label>
                    <select value={cad.intensidade_sintomas||''} onChange={e=>setF('intensidade_sintomas',e.target.value)} style={inp()}>
                      <option value="">Selecione</option>
                      <option value="leve">Leve</option>
                      <option value="moderado">Moderado</option>
                      <option value="intenso">Intenso</option>
                      <option value="muito_intenso">Muito intenso</option>
                    </select>
                  </div>
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:6}}>
                  <label style={{fontSize:13,fontWeight:600,color:'#8b949e'}}>Como isso impacta sua vida? <span style={{fontWeight:400}}>(trabalho, estudos, relacionamentos)</span></label>
                  <textarea rows={3} value={cad.impacto_vida||''} onChange={e=>setF('impacto_vida',e.target.value)} style={{...inp(),resize:'vertical',fontFamily:'inherit'}}/>
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:6}}>
                  <label style={{fontSize:13,fontWeight:600,color:'#8b949e'}}>Suporte social</label>
                  <select value={cad.suporte_social||''} onChange={e=>setF('suporte_social',e.target.value)} style={inp()}>
                    <option value="">Selecione</option>
                    <option value="nenhum">Nenhum / Muito isolado(a)</option>
                    <option value="pouco">Pouco suporte</option>
                    <option value="moderado">Suporte moderado</option>
                    <option value="bom">Bom suporte familiar e de amigos</option>
                  </select>
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:6}}>
                  <label style={{fontSize:13,fontWeight:600,color:'#8b949e'}}>Urgência percebida</label>
                  <select value={cad.urgencia} onChange={e=>setF('urgencia',e.target.value)} style={inp()}>
                    <option value="sem_urgencia">Sem urgência — posso aguardar</option>
                    <option value="pouco_urgente">Pouco urgente</option>
                    <option value="urgente">Urgente</option>
                    <option value="muito_urgente">Muito urgente</option>
                  </select>
                </div>
                {/* Checkboxes */}
                {[
                  {k:'ja_fez_terapia',    l:'Já realizou acompanhamento psicológico anteriormente?'},
                  {k:'uso_medicamento',   l:'Faz uso de medicação?'},
                  {k:'medicamento_psiquiatra', l:'O medicamento foi prescrito por psiquiatra?'},
                  {k:'historico_internacao',l:'Possui histórico de internação psiquiátrica?'},
                ].map(f=>(
                  <label key={f.k} style={{display:'flex',alignItems:'flex-start',gap:12,cursor:'pointer',padding:'10px 14px',background:'#0d1117',borderRadius:10,border:'1px solid #30363d'}}>
                    <input type="checkbox" checked={!!cad[f.k]} onChange={e=>setF(f.k,e.target.checked)} style={{width:20,height:20,accentColor:'#1d4ed8',marginTop:1,flexShrink:0}}/>
                    <span style={{fontSize:14,color:'#c9d1d9',lineHeight:1.4}}>{f.l}</span>
                  </label>
                ))}
                {/* Risco suicídio — destaque */}
                <div style={{border:'1.5px solid #ef4444',borderRadius:12,padding:'14px 16px',background:'#ef44441a'}}>
                  <label style={{display:'flex',alignItems:'flex-start',gap:12,cursor:'pointer'}}>
                    <input type="checkbox" checked={!!cad.risco_suicidio} onChange={e=>setF('risco_suicidio',e.target.checked)} style={{width:20,height:20,accentColor:'#ef4444',marginTop:2,flexShrink:0}}/>
                    <div>
                      <p style={{fontSize:14,color:'#fca5a5',fontWeight:700,marginBottom:4}}>Pensamentos de se machucar ou de suicídio</p>
                      <p style={{fontSize:12,color:'#f87171'}}>Se estiver em crise agora, ligue 188 (CVV) — disponível 24h.</p>
                    </div>
                  </label>
                  {cad.risco_suicidio && (
                    <textarea rows={2} value={cad.risco_desc||''} onChange={e=>setF('risco_desc',e.target.value)} placeholder="Descreva brevemente (opcional)..." style={{...inp({marginTop:10}),background:'#0d1117',color:'#e6edf3',fontFamily:'inherit'}}/>
                  )}
                </div>
              </div>
            )}

            {/* Etapa 2 — Disponibilidade */}
            {step===2 && (
              <div style={{display:'flex',flexDirection:'column',gap:14}}>
                <p style={{fontSize:13,color:'#8b949e'}}>Marque os dias e horários em que pode comparecer ao SEP. Isso ajuda a cruzar com a disponibilidade dos estagiários.</p>
                <div style={{display:'flex',flexDirection:'column',gap:10}}>
                  {DIAS_SEMANA.map(({k,l})=>{
                    const atual = cad.disponibilidade?.[k] || []
                    return (
                      <div key={k} style={{background:'#0d1117',borderRadius:10,padding:'12px 14px',border:'1px solid #30363d'}}>
                        <p style={{fontSize:13,fontWeight:700,color:'#e6edf3',marginBottom:10}}>{l}</p>
                        <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                          {HORAS.map(h=>{
                            const sel = atual.includes(h)
                            return (
                              <button key={h} onClick={()=>{
                                const cur = cad.disponibilidade||{}
                                const arr = cur[k]||[]
                                const next = sel?arr.filter((x:string)=>x!==h):[...arr,h]
                                setF('disponibilidade',{...cur,[k]:next})
                              }} style={{
                                padding:'6px 12px',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer',
                                minHeight:36,border:`1.5px solid ${sel?'#1d4ed8':'#30363d'}`,
                                background:sel?'#1d4ed820':'transparent',color:sel?'#60a5fa':'#8b949e',transition:'all .15s'
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

            {/* Etapa 3 — Acesso */}
            {step===3 && (
              <div style={{display:'flex',flexDirection:'column',gap:14}}>
                <p style={{fontSize:13,color:'#8b949e'}}>Crie uma senha para acessar o Portal do Paciente e acompanhar sua situação.</p>
                <div style={{display:'flex',flexDirection:'column',gap:6}}>
                  <label style={{fontSize:13,fontWeight:600,color:'#8b949e'}}>Senha *</label>
                  <input type="password" value={cad.senha||''} onChange={e=>setF('senha',e.target.value)} placeholder="Mínimo 8 caracteres" style={inp()}/>
                  <ForcaSenha senha={cad.senha||''}/>
                </div>
                <div style={{background:'#1d4ed81a',border:'1px solid #1d4ed844',borderRadius:12,padding:'14px 16px'}}>
                  <p style={{fontSize:12,color:'#93c5fd',fontWeight:700,marginBottom:6}}>ℹ️ O que acontece após o envio?</p>
                  <ul style={{fontSize:12,color:'#60a5fa',paddingLeft:16,lineHeight:1.8}}>
                    <li>Você receberá um email de confirmação</li>
                    <li>Nossa equipe avaliará sua triagem em até 3 dias úteis</li>
                    <li>Se aprovado, você entrará na fila de espera</li>
                    <li>Entraremos em contato pelo telefone informado para agendar</li>
                  </ul>
                </div>
                <div style={{border:'1px solid #30363d',borderRadius:12,padding:'14px 16px',fontSize:12,color:'#8b949e',lineHeight:1.6}}>
                  🔒 Seus dados são protegidos conforme a <strong style={{color:'#c9d1d9'}}>LGPD</strong> e são de uso exclusivo do SEP para fins de atendimento psicológico.
                </div>
              </div>
            )}

            {err && <p style={{color:'#f87171',fontSize:13,background:'#f871711a',padding:'10px 14px',borderRadius:9,marginTop:8}}>{err}</p>}

            {/* Navegação entre etapas */}
            <div style={{display:'flex',gap:10,marginTop:20}}>
              {step>0 && <Btn variant="ghost" onClick={()=>setStep(s=>s-1)} disabled={loading}>← Voltar</Btn>}
              {step<3 ? (
                <Btn full onClick={()=>{if(!canNext[step]){setErr('Preencha os campos obrigatórios');return}setErr('');setStep(s=>s+1)}} disabled={!canNext[step]}>
                  Continuar →
                </Btn>
              ) : (
                <Btn full onClick={handleCadastro} disabled={loading||!canNext[3]}>
                  {loading?'Enviando...':'Solicitar atendimento →'}
                </Btn>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

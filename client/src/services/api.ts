import axios from 'axios'

const http = axios.create({ baseURL: '/api' })
const DEBUG_HTTP_KEY = 'sep_debug_http'

const httpLogsAtivos = () =>
  import.meta.env.DEV || localStorage.getItem(DEBUG_HTTP_KEY) === '1'

const isSensitiveKey = (key: string) =>
  /(senha|password|token|authorization|secret|cpf|totp)/i.test(key)

const redact = (value: any, key = '', depth = 0): any => {
  if (isSensitiveKey(key)) return '[redigido]'
  if (value === null || value === undefined) return value
  if (depth > 2) return '[objeto]'
  if (Array.isArray(value)) return value.slice(0, 5).map(v => redact(v, key, depth + 1))
  if (typeof value === 'object') {
    return Object.entries(value).reduce<Record<string, any>>((acc, [k, v]) => {
      acc[k] = redact(v, k, depth + 1)
      return acc
    }, {})
  }
  return value
}

const resumoAgenda = (payload: any) => {
  const data = payload?.data?.data ?? payload?.data ?? payload
  const lista = Array.isArray(data)
    ? data
    : Array.isArray(data?.agendamentos)
      ? data.agendamentos
      : []
  if (!lista.length) return null
  return lista.slice(0, 3).map((a: any) => ({
    id: a.id,
    inicio: a.data_hora_inicio,
    fim: a.data_hora_fim,
    status: a.status,
  }))
}

const resumoPayload = (payload: any) => {
  const data = payload?.data?.data ?? payload?.data ?? payload
  if (Array.isArray(data)) return `${data.length} item(ns)`
  if (Array.isArray(data?.agendamentos)) return `${data.agendamentos.length} agendamento(s)`
  if (data && typeof data === 'object') return Object.keys(data).slice(0, 8).join(', ')
  return typeof data
}

// Injeta token em toda requisição
http.interceptors.request.use(cfg => {
  const t = localStorage.getItem('sep_token')
  if (t) cfg.headers.Authorization = `Bearer ${t}`
  ;(cfg as any).sepStartedAt = performance.now()
  if (httpLogsAtivos()) {
    console.info('[SEP][API] Enviando requisicao', {
      metodo: (cfg.method || 'GET').toUpperCase(),
      url: cfg.url,
      params: redact(cfg.params),
      body: redact(cfg.data),
    })
  }
  return cfg
})

// Em caso de 401, limpa sessão e redireciona para login
http.interceptors.response.use(
  r => {
    if (httpLogsAtivos()) {
      const inicio = (r.config as any).sepStartedAt
      const ms = typeof inicio === 'number' ? Math.round(performance.now() - inicio) : null
      const agenda = resumoAgenda(r)
      console.info('[SEP][API] Resposta recebida', {
        metodo: (r.config.method || 'GET').toUpperCase(),
        url: r.config.url,
        status: r.status,
        tempo_ms: ms,
        resumo: resumoPayload(r),
        ...(agenda ? { agenda_amostra: agenda } : {}),
      })
    }
    return r
  },
  err => {
    if (httpLogsAtivos()) {
      const inicio = (err.config as any)?.sepStartedAt
      const ms = typeof inicio === 'number' ? Math.round(performance.now() - inicio) : null
      console.warn('[SEP][API] Falha na requisicao', {
        metodo: (err.config?.method || 'GET').toUpperCase(),
        url: err.config?.url,
        status: err.response?.status,
        tempo_ms: ms,
        erro: err.response?.data?.error || err.message,
      })
    }
    if (err.response?.status === 401) {
      localStorage.removeItem('sep_token')
      localStorage.removeItem('sep_user')
      // Só redireciona se não estiver já na raiz
      if (window.location.pathname !== '/') {
        window.location.href = '/'
      }
    }
    return Promise.reject(err)
  }
)

const d = (r: any) => r.data.data ?? r.data

// ── Auth ───────────────────────────────────────────────────
export const authLogin       = (e:string,s:string,t?:string) => http.post('/auth/login',{email:e,senha:s,...(t?{totp_code:t}:{})}).then(r=>r.data)
export const authCadastro    = (b:any) => http.post('/auth/cadastro',b).then(r=>r.data)
export const authSessoes     = () => http.get('/auth/sessoes').then(d)
export const authRevogar     = (id:number) => http.delete(`/auth/sessoes/${id}`).then(d)
export const authLogoutTodos = () => http.post('/auth/logout-todos').then(d)
export const authAlterarSenha= (atual:string,nova:string) => http.post('/auth/alterar-senha',{senha_atual:atual,nova_senha:nova}).then(r=>r.data)
export const auth2FAativar   = () => http.post('/auth/2fa/ativar').then(d)
export const auth2FAconfirmar= (c:string) => http.post('/auth/2fa/confirmar',{code:c}).then(r=>r.data)
export const auth2FAdesativar= () => http.post('/auth/2fa/desativar').then(r=>r.data)

// ── Supervisor / Admin ─────────────────────────────────────
export const adminDashboard      = () => http.get('/admin/dashboard').then(d)
export const adminFila           = () => http.get('/admin/fila').then(d)
export const adminTriagem        = () => http.get('/admin/triagem').then(d)
export const adminAprovarTriagem = (id:number,obs?:string) => http.post(`/admin/triagem/${id}/aprovar`,{obs}).then(d)
export const adminRejeitarTriagem= (id:number,motivo:string) => http.post(`/admin/triagem/${id}/rejeitar`,{motivo}).then(d)
export const adminDocs           = (id:number) => http.get(`/admin/pacientes/${id}/documentos`).then(d)
export const adminRevisarDoc     = (id:number,status:string,obs?:string) => http.patch(`/admin/documentos/${id}/revisar`,{status,obs_admin:obs}).then(d)
export const adminPacientes      = (p?:any) => http.get('/admin/pacientes',{params:p}).then(d)
export const adminPaciente       = (id:number) => http.get(`/admin/pacientes/${id}`).then(d)
export const adminStatus         = (id:number,status:string,obs?:string) => http.patch(`/admin/pacientes/${id}/status`,{status,observacao:obs}).then(d)
export const adminRetornarFila   = (id:number,obs?:string) => http.patch(`/admin/pacientes/${id}/retornar-fila`,{observacao:obs}).then(d)
export const adminAtribuir       = (id:number,estagiario_id:number) => http.patch(`/admin/pacientes/${id}/estagiario`,{estagiario_id}).then(d)
export const adminNotificacao    = (id:number,b:any) => http.post(`/admin/pacientes/${id}/notificacao`,b).then(d)
export const adminDisponibilidades=(id:number) => http.get(`/admin/pacientes/${id}/disponibilidades`).then(r=>r.data)
export const adminEstagiarios       = () => http.get('/admin/estagiarios').then(d)
export const adminEstPacientes      = (id:number) => http.get(`/admin/estagiarios/${id}/pacientes`).then(d)
export const adminEstSupervisor     = (id:number,supervisor:string) => http.patch(`/admin/estagiarios/${id}/supervisor`,{supervisor}).then(r=>r.data)
export const adminEstToggle         = (id:number,ativo:boolean) => http.patch(`/admin/estagiarios/${id}/toggle`,{ativo}).then(r=>r.data)
export const adminSupervisores      = () => http.get('/admin/supervisores').then(d)
export const adminVincularSup       = (b:any) => http.post('/admin/supervisores/vincular',b).then(r=>r.data)
export const adminSlotsPendentes = () => http.get('/admin/slots/pendentes').then(d)
export const adminSlotsEst       = (id:number) => http.get(`/admin/estagiarios/${id}/slots`).then(d)
export const adminAprovarSlot    = (id:number,status:string,obs?:string) => http.patch(`/admin/slots/${id}/aprovar`,{status,obs_admin:obs}).then(d)
export const adminAgendamentos   = (p?:any) => http.get('/admin/agendamentos',{params:p}).then(d)
export const adminCriarAg        = (b:any) => http.post('/admin/agendamentos',b).then(r=>r.data)
export const adminConfirmarAg    = (id:number) => http.patch(`/admin/agendamentos/${id}/confirmar`,{}).then(r=>r.data)
export const adminCancelarAg     = (id:number,motivo:string) => http.patch(`/admin/agendamentos/${id}/cancelar`,{motivo}).then(r=>r.data)
export const adminRegistrarFalta = (id:number,motivo?:string) => http.patch(`/admin/agendamentos/${id}/falta`,{motivo}).then(r=>r.data)
export const adminLogs        = (tipo='app',limite=200) => http.get(`/admin/logs?tipo=${tipo}&limite=${limite}`).then(d)
export const adminGetConfig      = () => http.get('/admin/config').then(r=>r.data.data)
export const adminSetConfig      = (b:any) => http.patch('/admin/config',b).then(r=>r.data)

// ── Recepção ───────────────────────────────────────────────
export const recepHistoricoContatos = (id:number) => http.get(`/recepcao/historico-contatos/${id}`).then(d)
export const recepDashboard    = () => http.get('/recepcao/dashboard').then(d)
export const recepFila         = () => http.get('/recepcao/fila').then(d)
export const recepAgendaHoje   = () => http.get('/recepcao/agenda-hoje').then(d)
export const recepContatar     = (id:number,b:any) => http.post(`/recepcao/contatar/${id}`,b).then(r=>r.data)
export const recepConfirmar    = (id:number) => http.patch(`/recepcao/agendamentos/${id}/confirmar`,{}).then(r=>r.data)
export const recepCancelar     = (id:number,motivo:string) => http.patch(`/recepcao/agendamentos/${id}/cancelar`,{motivo}).then(r=>r.data)
export const recepCriarPac     = (b:any) => http.post('/recepcao/pacientes',b).then(r=>r.data)
export const recepCompletar    = (id:number,b:any) => http.patch(`/recepcao/pacientes/${id}/completar`,b).then(r=>r.data)
export const recepDisponib     = (id:number,disponibilidade:any) => http.patch(`/recepcao/pacientes/${id}/disponibilidade`,{disponibilidade}).then(r=>r.data)
export const recepHistContatos = (id:number) => http.get(`/recepcao/historico-contatos/${id}`).then(d)

// ── Estagiário ─────────────────────────────────────────────
export const estSlots        = () => http.get('/estagiario/slots').then(d)
export const estCriarSlot    = (b:any) => http.post('/estagiario/slots',b).then(r=>r.data)
export const estDeletarSlot  = (id:number) => http.delete(`/estagiario/slots/${id}`).then(r=>r.data)
export const estAgenda       = (p?:any) => http.get('/estagiario/agenda',{params:p}).then(d)
export const estPacientes    = () => http.get('/estagiario/pacientes').then(d)
export const estProntuarios  = () => http.get('/estagiario/prontuarios').then(d)
export const estCriarPront   = (b:any) => http.post('/estagiario/prontuarios',b).then(r=>r.data)

// ── Portal ─────────────────────────────────────────────────
export const portalDados         = () => http.get('/portal/dados').then(d)
export const portalDisponib      = (disponibilidade:any) => http.patch('/portal/disponibilidade',{disponibilidade}).then(r=>r.data)
export const portalCancelarAg    = (id:number,motivo:string) => http.patch(`/portal/agendamentos/${id}/cancelar`,{motivo}).then(r=>r.data)
export const portalConfirmarAg   = (id:number) => http.patch(`/portal/agendamentos/${id}/confirmar`,{}).then(r=>r.data)
export const portalSairFila      = () => http.post('/portal/sair-fila',{}).then(r=>r.data)
export const portalUploadDoc     = (form:FormData) => http.post('/portal/documentos',form,{headers:{'Content-Type':'multipart/form-data'}}).then(r=>r.data)
export const logsSeguranca       = () => http.get('/admin/logs-seguranca').then(d)
export const adminUsuarios       = () => http.get('/admin/usuarios').then(d)
export const adminCriarUsuario   = (b:any) => http.post('/admin/usuarios',b).then(r=>r.data)
export const adminToggleUsuario  = (id:number,ativo:boolean) => http.patch(`/admin/usuarios/${id}/toggle`,{ativo}).then(r=>r.data)

// ── Prontuários (com controle de acesso por vínculo) ───────
export const prontuariosPaciente  = (id:number) => http.get(`/prontuarios/paciente/${id}`).then(d)
export const prontuarioDetalhe    = (prontId:number,pacId:number) => http.get(`/prontuarios/${prontId}/paciente/${pacId}`).then(d)
export const prontuarioSalvar     = (b:any) => http.post('/prontuarios',b).then(r=>r.data)
export const prontuarioAtualizar  = (id:number,b:any) => http.put(`/prontuarios/${id}`,b).then(r=>r.data)
export const docsPaciente         = (id:number) => http.get(`/documentos/paciente/${id}`).then(d)
export const docDownload          = (docId:number) => http.get(`/documentos/${docId}/download`).then(d)
export const docUpload            = (form:FormData) => http.post('/documentos/upload',form,{headers:{'Content-Type':'multipart/form-data'}}).then(r=>r.data)
export const auditoriaPaciente    = (id:number) => http.get(`/auditoria/paciente/${id}`).then(d)

// ── Vínculos ────────────────────────────────────────────────
export const vinculosHistorico    = (pacId:number) => http.get(`/vinculos/paciente/${pacId}/historico`).then(d)
export const vinculoAtivo         = (pacId:number) => http.get(`/vinculos/paciente/${pacId}/ativo`).then(d)
export const vinculoTransferir    = (pacId:number,b:any) => http.post(`/vinculos/paciente/${pacId}/transferir`,b).then(r=>r.data)

// ── Alta clínica ────────────────────────────────────────────
export const altasPendentes       = () => http.get('/altas/pendentes').then(d)
export const altaSolicitar        = (pacId:number,b:any) => http.post(`/altas/paciente/${pacId}/solicitar`,b).then(r=>r.data)
export const altaAvaliar          = (altaId:number,b:any) => http.patch(`/altas/${altaId}/avaliar`,b).then(r=>r.data)
export const altaDetalhe          = (pacId:number) => http.get(`/altas/paciente/${pacId}`).then(d)

import { Router } from 'express';
import { auth, permitir } from '../middleware/auth';
import { limiterAuth, limiterCadastro, limiterUpload } from '../middleware/rateLimiter';
import { uploadDoc } from '../middleware/upload';
import {
  login, logout, cadastroPaciente, verificarEmail,
  me, minhasSessoes, revogarSessao, logoutTodos, alterarSenha,
  ativar2FA, confirmar2FA, desativar2FA, logsSeguranca,
  criarUsuarioInterno, listarUsuariosInternos, toggleStatusConta
} from '../controllers/auth';
import {
  dashboard, fila, listaPendentesTriagem, aprovarTriagem, rejeitarTriagem,
  listarDocumentos, revisarDocumento, listarPacientes, detalharPaciente,
  atualizarStatus, retornarPacienteFila, atribuirEstagiario, registrarNotificacao,
  listarEstagiarios, slotsPendentes, aprovarSlot, slotsEstagiario,
  pacientesDoEstagiario, atualizarSupervisor, toggleEstagiario,
  vincularSupervisorEstagiario, listarSupervisores,
  listarAgendamentos, criarAgendamento, confirmarAgendamentoAdmin, cancelarAgendamentoAdmin,
  registrarFaltaAgendamento, cruzarDisponibilidades,
  getConfig, setConfig
} from '../controllers/admin';
import {
  meusSlotsGet, criarSlot, deletarSlot, minhaAgenda,
  meusPacientes, listarProntuarios, criarProntuario,
  portalDados, uploadDocumento, atualizarDisponibilidade,
  cancelarAgendamento, confirmarPresenca, sairFila
} from '../controllers/outros';
import {
  dashboardRecepcao, filaRecepcao, contatarPaciente,
  agendaHoje, confirmarPresencaAdmin, cancelarConsultaAdmin,
  criarPacienteCompleto, completarCadastroPaciente,
  atualizarDisponibilidadePaciente, historicoContatos
} from '../controllers/recepcao';
import {
  listarProntuariosPaciente, detalharProntuario, salvarProntuario,
  uploadDocumento as uploadDocS3, downloadDocumento, listarDocumentosPaciente,
  auditoriaProntuario
} from '../controllers/prontuarios';
import { historicoVinculos, vinculoAtivo, transferirEstagiario } from '../controllers/vinculos';
import { solicitarAlta, avaliarAlta, altasPendentes, detalharAlta } from '../controllers/altas';
import { checkVinculo, auditAccess } from '../middleware/vinculo';
import logger from '../utils/logger';
import { getLogs } from '../controllers/logs';

const r = Router();

// ═══════════════════════════════════════════════════════════
// GRUPOS DE PERFIS
//
// Regras de acesso:
//   COORD     = coordenador (admin do curso) — vê tudo
//   SUP       = supervisor  (docente)        — vê só os seus estagiários e pacientes
//   COORD_SUP = coordenador + supervisor
//   COORD_REC = coordenador + recepcionista  (fila, triagem, pacientes operacional)
//   COORD_SUP_REC = todos os três            (agenda, agendamentos, contato)
//
// SUPERVISOR NUNCA altera: fila, usuários, config, logs de segurança
// SUPERVISOR SEMPRE filtra: seus estagiários, seus pacientes, seus agendamentos
// ═══════════════════════════════════════════════════════════
const COORD         = ['coordenador'] as const;
const COORD_SUP     = ['coordenador','supervisor'] as const;
const COORD_REC     = ['coordenador','recepcionista'] as const;
const COORD_SUP_REC = ['coordenador','supervisor','recepcionista'] as const;

// ── Público ────────────────────────────────────────────────
r.post('/auth/login',    limiterAuth,     login);
r.post('/auth/cadastro', limiterCadastro, cadastroPaciente);
r.get ('/auth/verificar/:token',          verificarEmail);
r.get ('/auth/health',                    (_req,res)=>res.json({ok:true}));

r.post('/auth/recuperar-senha', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ ok:false, error:'Email obrigatório.' });
  try {
    const pool = require('../db/connection').default;
    const [rows]: any = await pool.query('SELECT id,nome FROM usuarios WHERE email=?',[email.toLowerCase().trim()]);
    if (!rows.length) return res.json({ ok:true, message:'Se o e-mail existir, enviaremos instruções.' });
    const token = require('crypto').randomBytes(32).toString('hex');
    const expira = new Date(Date.now() + 1800000);
    await pool.query('INSERT INTO recuperacao_senha (usuario_id,token,expira_em) VALUES (?,?,?)',[rows[0].id,token,expira]);
    logger.info('Recuperacao de senha solicitada', {
      usuario_id: rows[0].id,
      email: email.toLowerCase().trim(),
      expira_em: expira.toISOString(),
    });
    res.json({ ok:true, message:'Se o e-mail existir, enviaremos instruções.' });
  } catch { res.status(500).json({ ok:false, error:'Erro ao processar.' }); }
});
r.post('/auth/redefinir-senha', async (req, res) => {
  const { token, novaSenha } = req.body;
  if (!token||!novaSenha) return res.status(400).json({ ok:false, error:'Token e nova senha obrigatórios.' });
  if (novaSenha.length < 8) return res.status(400).json({ ok:false, error:'Senha mínima: 8 caracteres.' });
  try {
    const pool = require('../db/connection').default;
    const [rows]: any = await pool.query(
      'SELECT * FROM recuperacao_senha WHERE token=? AND usado=0 AND expira_em>NOW()',[token]);
    if (!rows.length) return res.status(400).json({ ok:false, error:'Token inválido ou expirado.' });
    const hash = await require('bcryptjs').hash(novaSenha,12);
    await pool.query('UPDATE usuarios SET senha_hash=?,senha_alterada_em=NOW() WHERE id=?',[hash,rows[0].usuario_id]);
    await pool.query('UPDATE recuperacao_senha SET usado=1 WHERE id=?',[rows[0].id]);
    res.json({ ok:true, message:'Senha redefinida com sucesso.' });
  } catch { res.status(500).json({ ok:false, error:'Erro ao redefinir.' }); }
});

// ── Auth autenticado ───────────────────────────────────────
r.get   ('/auth/me',                auth, me);
r.post  ('/auth/logout',            auth, logout);
r.post  ('/auth/logout-todos',      auth, logoutTodos);
r.get   ('/auth/sessoes',           auth, minhasSessoes);
r.delete('/auth/sessoes/:sessao_id',auth, revogarSessao);
r.post  ('/auth/alterar-senha',     auth, alterarSenha);
r.post  ('/auth/2fa/ativar',        auth, ativar2FA);
r.post  ('/auth/2fa/confirmar',     auth, confirmar2FA);
r.post  ('/auth/2fa/desativar',     auth, desativar2FA);

// ══════════════════════════════════════════════════════════
// DASHBOARD
// Coordenador: números gerais
// Supervisor : números filtrados pelos seus estagiários (controller diferencia)
// ══════════════════════════════════════════════════════════
r.get('/admin/dashboard', auth, permitir(...COORD_SUP), dashboard);

// ══════════════════════════════════════════════════════════
// CONFIGURAÇÕES / ADMINISTRAÇÃO
// ══════════════════════════════════════════════════════════
r.get  ('/admin/logs-seguranca',        auth, permitir(...COORD), logsSeguranca);
r.get  ('/admin/logs',                  auth, permitir(...COORD), getLogs);
r.get  ('/admin/config',                auth, permitir(...COORD_SUP_REC), getConfig);
r.patch('/admin/config',                auth, permitir(...COORD), setConfig);
r.get  ('/admin/supervisores',          auth, permitir(...COORD), listarSupervisores);
r.post ('/admin/supervisores/vincular', auth, permitir(...COORD), vincularSupervisorEstagiario);
r.get  ('/admin/usuarios',             auth, permitir(...COORD), listarUsuariosInternos);
r.post ('/admin/usuarios',             auth, permitir(...COORD), criarUsuarioInterno);
r.patch('/admin/usuarios/:id/toggle',  auth, permitir(...COORD), toggleStatusConta);
r.patch('/admin/estagiarios/:id/supervisor', auth, permitir(...COORD), atualizarSupervisor);
r.patch('/admin/estagiarios/:id/toggle',     auth, permitir(...COORD), toggleEstagiario);

// ══════════════════════════════════════════════════════════
// FILA DE ESPERA — coordenador e recepcionista
// Supervisor NÃO vê a fila geral
// ══════════════════════════════════════════════════════════
r.get('/admin/fila', auth, permitir(...COORD_REC), fila);

// ══════════════════════════════════════════════════════════
// TRIAGEM
// Coordenador: aprova/rejeita qualquer paciente
// Recepcionista: aprova/rejeita qualquer paciente
// Supervisor: aprova/rejeita APENAS pacientes que serão dos seus estagiários
//   (controller verifica: se supervisor, paciente deve estar vinculado a seu estagiário
//    ou sem vínculo ainda — a triagem é pré-vínculo, então supervisor vê todos os
//    triagem_pendente mas ao aprovar, o sistema registra quem aprovou)
// ══════════════════════════════════════════════════════════
r.get ('/admin/triagem',               auth, permitir(...COORD_SUP_REC), listaPendentesTriagem);
r.post('/admin/triagem/:id/aprovar',   auth, permitir(...COORD_SUP_REC), aprovarTriagem);
r.post('/admin/triagem/:id/rejeitar',  auth, permitir(...COORD_SUP_REC), rejeitarTriagem);

// ══════════════════════════════════════════════════════════
// PACIENTES
// Coordenador: todos os pacientes
// Supervisor : APENAS pacientes dos seus estagiários (filtrado no controller)
// Recepcionista: acessa via /recepcao/* (endpoints próprios)
// ══════════════════════════════════════════════════════════
r.get  ('/admin/pacientes',                              auth, permitir(...COORD_SUP_REC), listarPacientes);
r.get  ('/admin/pacientes/:id',                          auth, permitir(...COORD_SUP_REC), detalharPaciente);
r.patch('/admin/pacientes/:id/status',                   auth, permitir(...COORD_SUP_REC), atualizarStatus);
r.patch('/admin/pacientes/:id/retornar-fila',            auth, permitir(...COORD_REC), retornarPacienteFila);
r.patch('/admin/pacientes/:id/estagiario',               auth, permitir(...COORD_SUP_REC), atribuirEstagiario);
r.post ('/admin/pacientes/:id/notificacao',              auth, permitir(...COORD_SUP_REC), registrarNotificacao);
r.get  ('/admin/pacientes/:paciente_id/disponibilidades',auth, permitir(...COORD_SUP_REC), cruzarDisponibilidades);
r.get  ('/admin/pacientes/:id/documentos',               auth, permitir(...COORD_SUP_REC), listarDocumentos);
r.patch('/admin/documentos/:id/revisar',                 auth, permitir(...COORD_SUP_REC), revisarDocumento);

// ══════════════════════════════════════════════════════════
// AGENDAMENTOS
// Coordenador: todos
// Supervisor : APENAS dos seus estagiários (filtrado no controller)
// Recepcionista: acessa via /recepcao/* e /admin/agendamentos para agendar
// ══════════════════════════════════════════════════════════
r.get ('/admin/agendamentos', auth, permitir(...COORD_SUP_REC), listarAgendamentos);
r.post('/admin/agendamentos', auth, permitir(...COORD_SUP_REC), criarAgendamento);
r.patch('/admin/agendamentos/:id/confirmar', auth, permitir(...COORD_SUP_REC), confirmarAgendamentoAdmin);
r.patch('/admin/agendamentos/:id/cancelar', auth, permitir(...COORD_SUP_REC), cancelarAgendamentoAdmin);
r.patch('/admin/agendamentos/:id/falta', auth, permitir(...COORD_SUP_REC), registrarFaltaAgendamento);

// ══════════════════════════════════════════════════════════
// ESTAGIÁRIOS E HORÁRIOS
// Coordenador: todos
// Supervisor : APENAS os seus (filtrado no controller)
// ══════════════════════════════════════════════════════════
r.get  ('/admin/estagiarios',               auth, permitir(...COORD_SUP_REC), listarEstagiarios);
r.get  ('/admin/estagiarios/:id/pacientes', auth, permitir(...COORD_SUP_REC), pacientesDoEstagiario);
r.get  ('/admin/estagiarios/:id/slots',     auth, permitir(...COORD_SUP_REC), slotsEstagiario);
r.get  ('/admin/slots/pendentes',           auth, permitir(...COORD_SUP), slotsPendentes);
r.patch('/admin/slots/:id/aprovar',         auth, permitir(...COORD_SUP), aprovarSlot);

// ══════════════════════════════════════════════════════════
// RECEPÇÃO — operacional do dia a dia
// Coordenador: acesso total (supervisão geral)
// Recepcionista: acesso total
// Supervisor: NÃO acessa endpoints de recepção
// ══════════════════════════════════════════════════════════
r.get  ('/recepcao/dashboard',                   auth, permitir(...COORD_REC), dashboardRecepcao);
r.get  ('/recepcao/fila',                        auth, permitir(...COORD_REC), filaRecepcao);
r.get  ('/recepcao/agenda-hoje',                 auth, permitir(...COORD_REC), agendaHoje);
r.get  ('/recepcao/historico-contatos/:id',      auth, permitir(...COORD_REC), historicoContatos);
r.post ('/recepcao/contatar/:id',                auth, permitir(...COORD_REC), contatarPaciente);
r.patch('/recepcao/agendamentos/:id/confirmar',  auth, permitir(...COORD_REC), confirmarPresencaAdmin);
r.patch('/recepcao/agendamentos/:id/cancelar',   auth, permitir(...COORD_REC), cancelarConsultaAdmin);
r.post ('/recepcao/pacientes',                   auth, permitir(...COORD_REC), criarPacienteCompleto);
r.patch('/recepcao/pacientes/:id/completar',     auth, permitir(...COORD_REC), completarCadastroPaciente);
r.patch('/recepcao/pacientes/:id/disponibilidade',auth, permitir(...COORD_REC), atualizarDisponibilidadePaciente);

// ══════════════════════════════════════════════════════════
// ESTAGIÁRIO — apenas seus próprios dados
// ══════════════════════════════════════════════════════════
r.get   ('/estagiario/slots',       auth, permitir('estagiario'), meusSlotsGet);
r.post  ('/estagiario/slots',       auth, permitir('estagiario'), criarSlot);
r.delete('/estagiario/slots/:id',   auth, permitir('estagiario'), deletarSlot);
r.get   ('/estagiario/agenda',      auth, permitir('estagiario'), minhaAgenda);
r.get   ('/estagiario/pacientes',   auth, permitir('estagiario'), meusPacientes);
r.get   ('/estagiario/prontuarios', auth, permitir('estagiario'), listarProntuarios);
r.post  ('/estagiario/prontuarios', auth, permitir('estagiario'), criarProntuario);

// ══════════════════════════════════════════════════════════
// PORTAL PACIENTE — apenas seus próprios dados
// ══════════════════════════════════════════════════════════
r.get  ('/portal/dados',                     auth, permitir('paciente'), portalDados);
r.post ('/portal/documentos', limiterUpload, auth, permitir('paciente'), uploadDoc.single('arquivo'), uploadDocumento);
r.patch('/portal/disponibilidade',           auth, permitir('paciente'), atualizarDisponibilidade);
r.patch('/portal/agendamentos/:id/cancelar', auth, permitir('paciente'), cancelarAgendamento);
r.patch('/portal/agendamentos/:id/confirmar',auth, permitir('paciente'), confirmarPresenca);
r.post ('/portal/sair-fila',                 auth, permitir('paciente'), sairFila);

// ══════════════════════════════════════════════════════════
// PRONTUÁRIOS
// Coordenador: vê todos (checkVinculo bypassa para coord/sup)
// Supervisor : vê apenas dos seus estagiários (checkVinculo valida)
// Estagiário : vê apenas se tiver vínculo ativo com o paciente
// ══════════════════════════════════════════════════════════
r.get('/prontuarios/paciente/:paciente_id',
  auth, permitir('coordenador','supervisor','estagiario'),
  checkVinculo('visualizou'),
  listarProntuariosPaciente);

r.get('/prontuarios/:prontuario_id/paciente/:paciente_id',
  auth, permitir('coordenador','supervisor','estagiario'),
  checkVinculo('visualizou'),
  detalharProntuario);

r.post('/prontuarios',
  auth, permitir('estagiario'),
  salvarProntuario);

r.put('/prontuarios/:prontuario_id',
  auth, permitir('estagiario'),
  salvarProntuario);

// ══════════════════════════════════════════════════════════
// DOCUMENTOS
// ══════════════════════════════════════════════════════════
r.post('/documentos/upload',
  auth, permitir('coordenador','supervisor','estagiario'),
  uploadDoc.single('arquivo'),
  uploadDocS3);

r.get('/documentos/paciente/:paciente_id',
  auth, permitir('coordenador','supervisor','estagiario'),
  checkVinculo('visualizou'),
  listarDocumentosPaciente);

r.get('/documentos/:doc_id/download',
  auth, permitir('coordenador','supervisor','recepcionista','estagiario','paciente'),
  downloadDocumento);

// ══════════════════════════════════════════════════════════
// AUDITORIA
// ══════════════════════════════════════════════════════════
r.get('/auditoria/paciente/:paciente_id',
  auth, permitir('coordenador','supervisor'),
  auditAccess('visualizou'),
  auditoriaProntuario);

// ══════════════════════════════════════════════════════════
// VÍNCULOS ESTAGIÁRIO-PACIENTE
// ══════════════════════════════════════════════════════════
r.get('/vinculos/paciente/:paciente_id/historico',
  auth, permitir('coordenador','supervisor','estagiario'),
  historicoVinculos);

r.get('/vinculos/paciente/:paciente_id/ativo',
  auth, permitir('coordenador','supervisor','recepcionista','estagiario'),
  vinculoAtivo);

r.post('/vinculos/paciente/:paciente_id/transferir',
  auth, permitir('coordenador','supervisor'),
  transferirEstagiario);

// ══════════════════════════════════════════════════════════
// ALTA CLÍNICA
// ══════════════════════════════════════════════════════════
r.get  ('/altas/pendentes',
  auth, permitir('coordenador','supervisor'), altasPendentes);

r.post ('/altas/paciente/:paciente_id/solicitar',
  auth, permitir('estagiario'), solicitarAlta);

r.patch('/altas/:alta_id/avaliar',
  auth, permitir('coordenador','supervisor'), avaliarAlta);

r.get  ('/altas/paciente/:paciente_id',
  auth, permitir('coordenador','supervisor','estagiario'), detalharAlta);

export default r;

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const rateLimiter_1 = require("../middleware/rateLimiter");
const upload_1 = require("../middleware/upload");
const auth_2 = require("../controllers/auth");
const admin_1 = require("../controllers/admin");
const outros_1 = require("../controllers/outros");
const recepcao_1 = require("../controllers/recepcao");
const prontuarios_1 = require("../controllers/prontuarios");
const vinculos_1 = require("../controllers/vinculos");
const altas_1 = require("../controllers/altas");
const vinculo_1 = require("../middleware/vinculo");
const logger_1 = __importDefault(require("../utils/logger"));
const logs_1 = require("../controllers/logs");
const r = (0, express_1.Router)();
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
const COORD = ['coordenador'];
const COORD_SUP = ['coordenador', 'supervisor'];
const COORD_REC = ['coordenador', 'recepcionista'];
const COORD_SUP_REC = ['coordenador', 'supervisor', 'recepcionista'];
// ── Público ────────────────────────────────────────────────
r.post('/auth/login', rateLimiter_1.limiterAuth, auth_2.login);
r.post('/auth/cadastro', rateLimiter_1.limiterCadastro, auth_2.cadastroPaciente);
r.get('/auth/verificar/:token', auth_2.verificarEmail);
r.get('/auth/health', (_req, res) => res.json({ ok: true }));
r.post('/auth/recuperar-senha', async (req, res) => {
    const { email } = req.body;
    if (!email)
        return res.status(400).json({ ok: false, error: 'Email obrigatório.' });
    try {
        const pool = require('../db/connection').default;
        const [rows] = await pool.query('SELECT id,nome FROM usuarios WHERE email=?', [email.toLowerCase().trim()]);
        if (!rows.length)
            return res.json({ ok: true, message: 'Se o e-mail existir, enviaremos instruções.' });
        const token = require('crypto').randomBytes(32).toString('hex');
        const expira = new Date(Date.now() + 1800000);
        await pool.query('INSERT INTO recuperacao_senha (usuario_id,token,expira_em) VALUES (?,?,?)', [rows[0].id, token, expira]);
        logger_1.default.info('Recuperacao de senha solicitada', {
            usuario_id: rows[0].id,
            email: email.toLowerCase().trim(),
            expira_em: expira.toISOString(),
        });
        res.json({ ok: true, message: 'Se o e-mail existir, enviaremos instruções.' });
    }
    catch {
        res.status(500).json({ ok: false, error: 'Erro ao processar.' });
    }
});
r.post('/auth/redefinir-senha', async (req, res) => {
    const { token, novaSenha } = req.body;
    if (!token || !novaSenha)
        return res.status(400).json({ ok: false, error: 'Token e nova senha obrigatórios.' });
    if (novaSenha.length < 8)
        return res.status(400).json({ ok: false, error: 'Senha mínima: 8 caracteres.' });
    try {
        const pool = require('../db/connection').default;
        const [rows] = await pool.query('SELECT * FROM recuperacao_senha WHERE token=? AND usado=0 AND expira_em>NOW()', [token]);
        if (!rows.length)
            return res.status(400).json({ ok: false, error: 'Token inválido ou expirado.' });
        const hash = await require('bcryptjs').hash(novaSenha, 12);
        await pool.query('UPDATE usuarios SET senha_hash=?,senha_alterada_em=NOW() WHERE id=?', [hash, rows[0].usuario_id]);
        await pool.query('UPDATE recuperacao_senha SET usado=1 WHERE id=?', [rows[0].id]);
        res.json({ ok: true, message: 'Senha redefinida com sucesso.' });
    }
    catch {
        res.status(500).json({ ok: false, error: 'Erro ao redefinir.' });
    }
});
// ── Auth autenticado ───────────────────────────────────────
r.get('/auth/me', auth_1.auth, auth_2.me);
r.post('/auth/logout', auth_1.auth, auth_2.logout);
r.post('/auth/logout-todos', auth_1.auth, auth_2.logoutTodos);
r.get('/auth/sessoes', auth_1.auth, auth_2.minhasSessoes);
r.delete('/auth/sessoes/:sessao_id', auth_1.auth, auth_2.revogarSessao);
r.post('/auth/alterar-senha', auth_1.auth, auth_2.alterarSenha);
r.post('/auth/2fa/ativar', auth_1.auth, auth_2.ativar2FA);
r.post('/auth/2fa/confirmar', auth_1.auth, auth_2.confirmar2FA);
r.post('/auth/2fa/desativar', auth_1.auth, auth_2.desativar2FA);
// ══════════════════════════════════════════════════════════
// DASHBOARD
// Coordenador: números gerais
// Supervisor : números filtrados pelos seus estagiários (controller diferencia)
// ══════════════════════════════════════════════════════════
r.get('/admin/dashboard', auth_1.auth, (0, auth_1.permitir)(...COORD_SUP), admin_1.dashboard);
// ══════════════════════════════════════════════════════════
// CONFIGURAÇÕES / ADMINISTRAÇÃO
// ══════════════════════════════════════════════════════════
r.get('/admin/logs-seguranca', auth_1.auth, (0, auth_1.permitir)(...COORD), auth_2.logsSeguranca);
r.get('/admin/logs', auth_1.auth, (0, auth_1.permitir)(...COORD), logs_1.getLogs);
r.get('/admin/config', auth_1.auth, (0, auth_1.permitir)(...COORD_SUP_REC), admin_1.getConfig);
r.patch('/admin/config', auth_1.auth, (0, auth_1.permitir)(...COORD), admin_1.setConfig);
r.get('/admin/supervisores', auth_1.auth, (0, auth_1.permitir)(...COORD), admin_1.listarSupervisores);
r.post('/admin/supervisores/vincular', auth_1.auth, (0, auth_1.permitir)(...COORD), admin_1.vincularSupervisorEstagiario);
r.get('/admin/usuarios', auth_1.auth, (0, auth_1.permitir)(...COORD), auth_2.listarUsuariosInternos);
r.post('/admin/usuarios', auth_1.auth, (0, auth_1.permitir)(...COORD), auth_2.criarUsuarioInterno);
r.patch('/admin/usuarios/:id/toggle', auth_1.auth, (0, auth_1.permitir)(...COORD), auth_2.toggleStatusConta);
r.patch('/admin/estagiarios/:id/supervisor', auth_1.auth, (0, auth_1.permitir)(...COORD), admin_1.atualizarSupervisor);
r.patch('/admin/estagiarios/:id/toggle', auth_1.auth, (0, auth_1.permitir)(...COORD), admin_1.toggleEstagiario);
// ══════════════════════════════════════════════════════════
// FILA DE ESPERA — coordenador e recepcionista
// Supervisor NÃO vê a fila geral
// ══════════════════════════════════════════════════════════
r.get('/admin/fila', auth_1.auth, (0, auth_1.permitir)(...COORD_REC), admin_1.fila);
// ══════════════════════════════════════════════════════════
// TRIAGEM
// Coordenador: aprova/rejeita qualquer paciente
// Recepcionista: aprova/rejeita qualquer paciente
// Supervisor: aprova/rejeita APENAS pacientes que serão dos seus estagiários
//   (controller verifica: se supervisor, paciente deve estar vinculado a seu estagiário
//    ou sem vínculo ainda — a triagem é pré-vínculo, então supervisor vê todos os
//    triagem_pendente mas ao aprovar, o sistema registra quem aprovou)
// ══════════════════════════════════════════════════════════
r.get('/admin/triagem', auth_1.auth, (0, auth_1.permitir)(...COORD_SUP_REC), admin_1.listaPendentesTriagem);
r.post('/admin/triagem/:id/aprovar', auth_1.auth, (0, auth_1.permitir)(...COORD_SUP_REC), admin_1.aprovarTriagem);
r.post('/admin/triagem/:id/rejeitar', auth_1.auth, (0, auth_1.permitir)(...COORD_SUP_REC), admin_1.rejeitarTriagem);
// ══════════════════════════════════════════════════════════
// PACIENTES
// Coordenador: todos os pacientes
// Supervisor : APENAS pacientes dos seus estagiários (filtrado no controller)
// Recepcionista: acessa via /recepcao/* (endpoints próprios)
// ══════════════════════════════════════════════════════════
r.get('/admin/pacientes', auth_1.auth, (0, auth_1.permitir)(...COORD_SUP_REC), admin_1.listarPacientes);
r.get('/admin/pacientes/:id', auth_1.auth, (0, auth_1.permitir)(...COORD_SUP_REC), admin_1.detalharPaciente);
r.patch('/admin/pacientes/:id/status', auth_1.auth, (0, auth_1.permitir)(...COORD_SUP_REC), admin_1.atualizarStatus);
r.patch('/admin/pacientes/:id/retornar-fila', auth_1.auth, (0, auth_1.permitir)(...COORD_REC), admin_1.retornarPacienteFila);
r.patch('/admin/pacientes/:id/estagiario', auth_1.auth, (0, auth_1.permitir)(...COORD_SUP_REC), admin_1.atribuirEstagiario);
r.post('/admin/pacientes/:id/notificacao', auth_1.auth, (0, auth_1.permitir)(...COORD_SUP_REC), admin_1.registrarNotificacao);
r.get('/admin/pacientes/:paciente_id/disponibilidades', auth_1.auth, (0, auth_1.permitir)(...COORD_SUP_REC), admin_1.cruzarDisponibilidades);
r.get('/admin/pacientes/:id/documentos', auth_1.auth, (0, auth_1.permitir)(...COORD_SUP_REC), admin_1.listarDocumentos);
r.patch('/admin/documentos/:id/revisar', auth_1.auth, (0, auth_1.permitir)(...COORD_SUP_REC), admin_1.revisarDocumento);
// ══════════════════════════════════════════════════════════
// AGENDAMENTOS
// Coordenador: todos
// Supervisor : APENAS dos seus estagiários (filtrado no controller)
// Recepcionista: acessa via /recepcao/* e /admin/agendamentos para agendar
// ══════════════════════════════════════════════════════════
r.get('/admin/agendamentos', auth_1.auth, (0, auth_1.permitir)(...COORD_SUP_REC), admin_1.listarAgendamentos);
r.post('/admin/agendamentos', auth_1.auth, (0, auth_1.permitir)(...COORD_SUP_REC), admin_1.criarAgendamento);
r.patch('/admin/agendamentos/:id/confirmar', auth_1.auth, (0, auth_1.permitir)(...COORD_SUP_REC), admin_1.confirmarAgendamentoAdmin);
r.patch('/admin/agendamentos/:id/cancelar', auth_1.auth, (0, auth_1.permitir)(...COORD_SUP_REC), admin_1.cancelarAgendamentoAdmin);
r.patch('/admin/agendamentos/:id/falta', auth_1.auth, (0, auth_1.permitir)(...COORD_SUP_REC), admin_1.registrarFaltaAgendamento);
// ══════════════════════════════════════════════════════════
// ESTAGIÁRIOS E HORÁRIOS
// Coordenador: todos
// Supervisor : APENAS os seus (filtrado no controller)
// ══════════════════════════════════════════════════════════
r.get('/admin/estagiarios', auth_1.auth, (0, auth_1.permitir)(...COORD_SUP_REC), admin_1.listarEstagiarios);
r.get('/admin/estagiarios/:id/pacientes', auth_1.auth, (0, auth_1.permitir)(...COORD_SUP_REC), admin_1.pacientesDoEstagiario);
r.get('/admin/estagiarios/:id/slots', auth_1.auth, (0, auth_1.permitir)(...COORD_SUP_REC), admin_1.slotsEstagiario);
r.get('/admin/slots/pendentes', auth_1.auth, (0, auth_1.permitir)(...COORD_SUP), admin_1.slotsPendentes);
r.patch('/admin/slots/:id/aprovar', auth_1.auth, (0, auth_1.permitir)(...COORD_SUP), admin_1.aprovarSlot);
// ══════════════════════════════════════════════════════════
// RECEPÇÃO — operacional do dia a dia
// Coordenador: acesso total (supervisão geral)
// Recepcionista: acesso total
// Supervisor: NÃO acessa endpoints de recepção
// ══════════════════════════════════════════════════════════
r.get('/recepcao/dashboard', auth_1.auth, (0, auth_1.permitir)(...COORD_REC), recepcao_1.dashboardRecepcao);
r.get('/recepcao/fila', auth_1.auth, (0, auth_1.permitir)(...COORD_REC), recepcao_1.filaRecepcao);
r.get('/recepcao/agenda-hoje', auth_1.auth, (0, auth_1.permitir)(...COORD_REC), recepcao_1.agendaHoje);
r.get('/recepcao/historico-contatos/:id', auth_1.auth, (0, auth_1.permitir)(...COORD_REC), recepcao_1.historicoContatos);
r.post('/recepcao/contatar/:id', auth_1.auth, (0, auth_1.permitir)(...COORD_REC), recepcao_1.contatarPaciente);
r.patch('/recepcao/agendamentos/:id/confirmar', auth_1.auth, (0, auth_1.permitir)(...COORD_REC), recepcao_1.confirmarPresencaAdmin);
r.patch('/recepcao/agendamentos/:id/cancelar', auth_1.auth, (0, auth_1.permitir)(...COORD_REC), recepcao_1.cancelarConsultaAdmin);
r.post('/recepcao/pacientes', auth_1.auth, (0, auth_1.permitir)(...COORD_REC), recepcao_1.criarPacienteCompleto);
r.patch('/recepcao/pacientes/:id/completar', auth_1.auth, (0, auth_1.permitir)(...COORD_REC), recepcao_1.completarCadastroPaciente);
r.patch('/recepcao/pacientes/:id/disponibilidade', auth_1.auth, (0, auth_1.permitir)(...COORD_REC), recepcao_1.atualizarDisponibilidadePaciente);
// ══════════════════════════════════════════════════════════
// ESTAGIÁRIO — apenas seus próprios dados
// ══════════════════════════════════════════════════════════
r.get('/estagiario/slots', auth_1.auth, (0, auth_1.permitir)('estagiario'), outros_1.meusSlotsGet);
r.post('/estagiario/slots', auth_1.auth, (0, auth_1.permitir)('estagiario'), outros_1.criarSlot);
r.delete('/estagiario/slots/:id', auth_1.auth, (0, auth_1.permitir)('estagiario'), outros_1.deletarSlot);
r.get('/estagiario/agenda', auth_1.auth, (0, auth_1.permitir)('estagiario'), outros_1.minhaAgenda);
r.get('/estagiario/pacientes', auth_1.auth, (0, auth_1.permitir)('estagiario'), outros_1.meusPacientes);
r.get('/estagiario/prontuarios', auth_1.auth, (0, auth_1.permitir)('estagiario'), outros_1.listarProntuarios);
r.post('/estagiario/prontuarios', auth_1.auth, (0, auth_1.permitir)('estagiario'), outros_1.criarProntuario);
// ══════════════════════════════════════════════════════════
// PORTAL PACIENTE — apenas seus próprios dados
// ══════════════════════════════════════════════════════════
r.get('/portal/dados', auth_1.auth, (0, auth_1.permitir)('paciente'), outros_1.portalDados);
r.post('/portal/documentos', rateLimiter_1.limiterUpload, auth_1.auth, (0, auth_1.permitir)('paciente'), upload_1.uploadDoc.single('arquivo'), outros_1.uploadDocumento);
r.patch('/portal/disponibilidade', auth_1.auth, (0, auth_1.permitir)('paciente'), outros_1.atualizarDisponibilidade);
r.patch('/portal/agendamentos/:id/cancelar', auth_1.auth, (0, auth_1.permitir)('paciente'), outros_1.cancelarAgendamento);
r.patch('/portal/agendamentos/:id/confirmar', auth_1.auth, (0, auth_1.permitir)('paciente'), outros_1.confirmarPresenca);
r.post('/portal/sair-fila', auth_1.auth, (0, auth_1.permitir)('paciente'), outros_1.sairFila);
// ══════════════════════════════════════════════════════════
// PRONTUÁRIOS
// Coordenador: vê todos (checkVinculo bypassa para coord/sup)
// Supervisor : vê apenas dos seus estagiários (checkVinculo valida)
// Estagiário : vê apenas se tiver vínculo ativo com o paciente
// ══════════════════════════════════════════════════════════
r.get('/prontuarios/paciente/:paciente_id', auth_1.auth, (0, auth_1.permitir)('coordenador', 'supervisor', 'estagiario'), (0, vinculo_1.checkVinculo)('visualizou'), prontuarios_1.listarProntuariosPaciente);
r.get('/prontuarios/:prontuario_id/paciente/:paciente_id', auth_1.auth, (0, auth_1.permitir)('coordenador', 'supervisor', 'estagiario'), (0, vinculo_1.checkVinculo)('visualizou'), prontuarios_1.detalharProntuario);
r.post('/prontuarios', auth_1.auth, (0, auth_1.permitir)('estagiario'), prontuarios_1.salvarProntuario);
r.put('/prontuarios/:prontuario_id', auth_1.auth, (0, auth_1.permitir)('estagiario'), prontuarios_1.salvarProntuario);
// ══════════════════════════════════════════════════════════
// DOCUMENTOS
// ══════════════════════════════════════════════════════════
r.post('/documentos/upload', auth_1.auth, (0, auth_1.permitir)('coordenador', 'supervisor', 'estagiario'), upload_1.uploadDoc.single('arquivo'), prontuarios_1.uploadDocumento);
r.get('/documentos/paciente/:paciente_id', auth_1.auth, (0, auth_1.permitir)('coordenador', 'supervisor', 'estagiario'), (0, vinculo_1.checkVinculo)('visualizou'), prontuarios_1.listarDocumentosPaciente);
r.get('/documentos/:doc_id/download', auth_1.auth, (0, auth_1.permitir)('coordenador', 'supervisor', 'recepcionista', 'estagiario', 'paciente'), prontuarios_1.downloadDocumento);
// ══════════════════════════════════════════════════════════
// AUDITORIA
// ══════════════════════════════════════════════════════════
r.get('/auditoria/paciente/:paciente_id', auth_1.auth, (0, auth_1.permitir)('coordenador', 'supervisor'), (0, vinculo_1.auditAccess)('visualizou'), prontuarios_1.auditoriaProntuario);
// ══════════════════════════════════════════════════════════
// VÍNCULOS ESTAGIÁRIO-PACIENTE
// ══════════════════════════════════════════════════════════
r.get('/vinculos/paciente/:paciente_id/historico', auth_1.auth, (0, auth_1.permitir)('coordenador', 'supervisor', 'estagiario'), vinculos_1.historicoVinculos);
r.get('/vinculos/paciente/:paciente_id/ativo', auth_1.auth, (0, auth_1.permitir)('coordenador', 'supervisor', 'recepcionista', 'estagiario'), vinculos_1.vinculoAtivo);
r.post('/vinculos/paciente/:paciente_id/transferir', auth_1.auth, (0, auth_1.permitir)('coordenador', 'supervisor'), vinculos_1.transferirEstagiario);
// ══════════════════════════════════════════════════════════
// ALTA CLÍNICA
// ══════════════════════════════════════════════════════════
r.get('/altas/pendentes', auth_1.auth, (0, auth_1.permitir)('coordenador', 'supervisor'), altas_1.altasPendentes);
r.post('/altas/paciente/:paciente_id/solicitar', auth_1.auth, (0, auth_1.permitir)('estagiario'), altas_1.solicitarAlta);
r.patch('/altas/:alta_id/avaliar', auth_1.auth, (0, auth_1.permitir)('coordenador', 'supervisor'), altas_1.avaliarAlta);
r.get('/altas/paciente/:paciente_id', auth_1.auth, (0, auth_1.permitir)('coordenador', 'supervisor', 'estagiario'), altas_1.detalharAlta);
exports.default = r;

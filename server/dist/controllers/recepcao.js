"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.historicoContatos = exports.atualizarDisponibilidadePaciente = exports.completarCadastroPaciente = exports.criarPacienteCompleto = exports.cancelarConsultaAdmin = exports.confirmarPresencaAdmin = exports.agendaHoje = exports.contatarPaciente = exports.filaRecepcao = exports.dashboardRecepcao = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const connection_1 = __importDefault(require("../db/connection"));
const logger_1 = __importDefault(require("../utils/logger"));
const normalizarDisponibilidadePaciente = (body) => {
    const valor = body && Object.prototype.hasOwnProperty.call(body, 'disponibilidade')
        ? body.disponibilidade
        : body;
    if (!valor || typeof valor !== 'object' || Array.isArray(valor))
        return null;
    const normalizada = {};
    for (const [dia, horas] of Object.entries(valor)) {
        if (!Array.isArray(horas))
            return null;
        const lista = Array.from(new Set(horas
            .filter((h) => typeof h === 'string' && h.trim().length > 0)
            .map(h => h.trim())));
        if (lista.length)
            normalizada[dia] = lista;
    }
    return normalizada;
};
// ── Dashboard da recepção ─────────────────────────────────
const dashboardRecepcao = async (_req, res) => {
    try {
        const [fila] = await connection_1.default.query(`
      SELECT COUNT(*) AS total,
        SUM(status='aguardando')  AS aguardando,
        SUM(status='em_contato')  AS em_contato,
        SUM(urgencia='muito_urgente' AND status IN('aguardando','em_contato')) AS muito_urgentes,
        SUM(risco_suicidio=1 AND status IN('aguardando','em_contato')) AS com_risco
      FROM pacientes WHERE status IN('aguardando','em_contato')`);
        const [hoje] = await connection_1.default.query(`
      SELECT COUNT(*) AS total,
        SUM(status='confirmado') AS confirmados,
        SUM(status='pendente') AS pendentes,
        SUM(status IN('cancelado_paciente','cancelado_admin')) AS cancelados
      FROM agendamentos
      WHERE DATE(data_hora_inicio)=CURDATE() AND status NOT IN('cancelado_admin','cancelado_paciente','faltou')`);
        const [prox] = await connection_1.default.query(`
      SELECT a.id, a.data_hora_inicio, a.data_hora_fim, a.status, a.sala, a.modalidade,
             up.nome AS paciente_nome, ue.nome AS estagiario_nome
      FROM agendamentos a
      JOIN pacientes p ON a.paciente_id=p.id
      JOIN usuarios up ON p.usuario_id=up.id
      JOIN estagiarios e ON a.estagiario_id=e.id
      JOIN usuarios ue ON e.usuario_id=ue.id
      WHERE DATE(a.data_hora_inicio)=CURDATE()
        AND a.status IN('pendente','confirmado')
      ORDER BY a.data_hora_inicio ASC LIMIT 5`);
        const [semContato] = await connection_1.default.query(`
      SELECT COUNT(*) AS total FROM pacientes
      WHERE status='aguardando' AND timestamp_cadastro < DATE_SUB(NOW(), INTERVAL 3 DAY)`);
        res.json({ success: true, data: {
                fila: fila[0],
                hoje: hoje[0],
                proximasConsultas: prox,
                aguardandoSemContato: semContato[0].total,
            } });
    }
    catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
};
exports.dashboardRecepcao = dashboardRecepcao;
// ── Fila da recepção — mega query com estado completo ────
const filaRecepcao = async (_req, res) => {
    try {
        const [rows] = await connection_1.default.query(`
      SELECT
        p.id, p.nome, p.cpf, p.telefone, p.whatsapp, p.email,
        p.urgencia, p.status, p.risco_suicidio, p.motivo_busca,
        p.intensidade_sintomas, p.disponibilidade, p.timestamp_cadastro,

        TIMESTAMPDIFF(DAY, p.timestamp_cadastro, NOW()) AS dias_espera,

        ROW_NUMBER() OVER (
          ORDER BY p.risco_suicidio DESC,
            FIELD(p.urgencia,'muito_urgente','urgente','pouco_urgente','sem_urgencia'),
            p.timestamp_cadastro ASC
        ) AS posicao_fila,

        (SELECT COUNT(*) FROM notificacoes n WHERE n.paciente_id=p.id) AS total_contatos,
        (SELECT MAX(n.criado_em) FROM notificacoes n WHERE n.paciente_id=p.id) AS ultimo_contato,
        (SELECT n.assunto FROM notificacoes n WHERE n.paciente_id=p.id
         ORDER BY n.criado_em DESC LIMIT 1) AS ultimo_contato_assunto,

        (SELECT a.data_hora_inicio FROM agendamentos a
         WHERE a.paciente_id=p.id AND a.status IN('pendente','confirmado')
           AND a.data_hora_inicio > NOW()
         ORDER BY a.data_hora_inicio ASC LIMIT 1) AS proximo_agendamento,

        (SELECT COUNT(*) FROM agendamentos a
         WHERE a.paciente_id=p.id AND a.status='realizado') AS total_sessoes,

        ve.estagiario_id AS vinculo_estagiario_id,
        ue.nome AS estagiario_nome,

        EXISTS(
          SELECT 1 FROM agendamentos a
          WHERE a.paciente_id=p.id AND a.status IN('pendente','confirmado')
            AND a.data_hora_inicio > NOW()
        ) AS tem_agendamento_ativo

      FROM pacientes p
      LEFT JOIN vinculos_estagiario_paciente ve ON ve.paciente_id=p.id AND ve.ativo=1
      LEFT JOIN estagiarios est ON est.id=ve.estagiario_id
      LEFT JOIN usuarios ue ON ue.id=est.usuario_id

      WHERE p.status IN('aguardando','em_contato')

      ORDER BY p.risco_suicidio DESC,
        FIELD(p.urgencia,'muito_urgente','urgente','pouco_urgente','sem_urgencia'),
        p.timestamp_cadastro ASC`);
        res.json({ success: true, data: rows });
    }
    catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
};
exports.filaRecepcao = filaRecepcao;
// ── Registrar contato com paciente ────────────────────────
const contatarPaciente = async (req, res) => {
    const conn = await connection_1.default.getConnection();
    try {
        await conn.beginTransaction();
        const { tipo, mensagem, resultado } = req.body;
        // tipo: 'ligacao' | 'whatsapp' | 'email'
        // resultado: 'atendeu' | 'nao_atendeu' | 'agendado' | 'remarcou'
        const assunto = resultado === 'atendeu'
            ? `Contato realizado — ${tipo}`
            : `Tentativa de contato — ${tipo} (${resultado})`;
        await conn.query('INSERT INTO notificacoes (paciente_id,tipo,assunto,mensagem,status,usuario_id) VALUES (?,?,?,?,?,?)', [req.params.id, tipo, assunto, mensagem || null, 'enviado', req.user.id]);
        // Se atendeu, muda status para em_contato
        if (resultado === 'atendeu') {
            const [atual] = await conn.query('SELECT status FROM pacientes WHERE id=?', [req.params.id]);
            if (atual[0]?.status === 'aguardando') {
                await conn.query('UPDATE pacientes SET status="em_contato",atualizado_em=NOW() WHERE id=?', [req.params.id]);
                await conn.query('INSERT INTO historico_status (paciente_id,status_anterior,status_novo,usuario_id,canal,observacao) VALUES (?,?,?,?,?,?)', [req.params.id, 'aguardando', 'em_contato', req.user.id, 'recepcionista', `${tipo} — ${resultado}`]);
            }
        }
        await conn.commit();
        res.json({ success: true, message: 'Contato registrado com sucesso.' });
    }
    catch (e) {
        await conn.rollback();
        res.status(500).json({ success: false, error: e.message });
    }
    finally {
        conn.release();
    }
};
exports.contatarPaciente = contatarPaciente;
// ── Agenda do dia (visão da recepção) ─────────────────────
const agendaHoje = async (_req, res) => {
    try {
        const [rows] = await connection_1.default.query(`
      SELECT a.id, a.data_hora_inicio, a.data_hora_fim, a.status,
             a.sala, a.modalidade, a.sessao_numero, a.link_online,
             up.nome AS paciente_nome, p.telefone AS paciente_tel,
             p.whatsapp AS paciente_whatsapp, p.urgencia,
             ue.nome AS estagiario_nome
      FROM agendamentos a
      JOIN pacientes p ON a.paciente_id=p.id
      JOIN usuarios up ON p.usuario_id=up.id
      JOIN estagiarios e ON a.estagiario_id=e.id
      JOIN usuarios ue ON e.usuario_id=ue.id
      WHERE DATE(a.data_hora_inicio)=CURDATE()
      ORDER BY a.data_hora_inicio ASC`);
        logger_1.default.info('Agenda de hoje da recepcao listada', {
            total: Array.isArray(rows) ? rows.length : 0,
            primeiro_agendamento: Array.isArray(rows) && rows[0] ? {
                id: rows[0].id,
                inicio: rows[0].data_hora_inicio,
                fim: rows[0].data_hora_fim,
                status: rows[0].status,
            } : null,
        });
        res.json({ success: true, data: rows });
    }
    catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
};
exports.agendaHoje = agendaHoje;
// ── Confirmar consulta (pela recepção) ────────────────────
const confirmarPresencaAdmin = async (req, res) => {
    try {
        await connection_1.default.query("UPDATE agendamentos SET status='confirmado',atualizado_em=NOW() WHERE id=?", [req.params.id]);
        logger_1.default.info('Consulta confirmada pela recepcao', {
            agendamento_id: req.params.id,
            usuario_id: req.user?.id,
        });
        // Registra notificação automática
        const [ag] = await connection_1.default.query('SELECT paciente_id FROM agendamentos WHERE id=?', [req.params.id]);
        if (ag.length) {
            await connection_1.default.query('INSERT INTO notificacoes (paciente_id,tipo,assunto,status,usuario_id) VALUES (?,?,?,?,?)', [ag[0].paciente_id, 'sistema', 'Consulta confirmada pela recepção', 'enviado', req.user.id]);
        }
        res.json({ success: true, message: 'Consulta confirmada.' });
    }
    catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
};
exports.confirmarPresencaAdmin = confirmarPresencaAdmin;
// ── Cancelar consulta (pela recepção) ─────────────────────
const cancelarConsultaAdmin = async (req, res) => {
    const conn = await connection_1.default.getConnection();
    try {
        await conn.beginTransaction();
        const { motivo } = req.body;
        if (!motivo)
            return res.status(400).json({ success: false, error: 'Informe o motivo do cancelamento' });
        const [ag] = await conn.query("SELECT id, paciente_id, status FROM agendamentos WHERE id=? AND status IN('pendente','confirmado')", [req.params.id]);
        if (!ag.length)
            return res.status(404).json({ success: false, error: 'Agendamento não encontrado ou já encerrado' });
        await conn.query("UPDATE agendamentos SET status='cancelado_admin',notas_admin=?,atualizado_em=NOW() WHERE id=?", [motivo, req.params.id]);
        logger_1.default.info('Consulta cancelada pela recepcao', {
            agendamento_id: req.params.id,
            paciente_id: ag[0].paciente_id,
            usuario_id: req.user?.id,
            motivo,
        });
        await conn.query("UPDATE pacientes SET status='aguardando',estagiario_id=NULL,atualizado_em=NOW() WHERE id=?", [ag[0].paciente_id]);
        await conn.query('INSERT INTO historico_status (paciente_id,status_anterior,status_novo,usuario_id,canal,observacao) VALUES (?,?,?,?,?,?)', [ag[0].paciente_id, 'agendado', 'aguardando', req.user.id, 'recepcionista', motivo]);
        await conn.query('INSERT INTO notificacoes (paciente_id,tipo,assunto,mensagem,status,usuario_id) VALUES (?,?,?,?,?,?)', [ag[0].paciente_id, 'sistema', 'Consulta cancelada', motivo, 'enviado', req.user.id]);
        await conn.commit();
        res.json({ success: true, message: 'Consulta cancelada. Paciente retornou à fila.' });
    }
    catch (e) {
        await conn.rollback();
        res.status(500).json({ success: false, error: e.message });
    }
    finally {
        conn.release();
    }
};
exports.cancelarConsultaAdmin = cancelarConsultaAdmin;
// ── Cadastrar paciente completo (recepcionista) ───────────
// Difere do cadastro público: recepcionista cria a conta e ativa direto
const criarPacienteCompleto = async (req, res) => {
    const conn = await connection_1.default.getConnection();
    try {
        await conn.beginTransaction();
        const { nome, cpf, email, senha_provisoria, telefone, whatsapp, contato_emergencia, nome_emergencia, data_nascimento, genero, escolaridade, ocupacao, renda_familiar, endereco, bairro, motivo_busca, tempo_sintomas, intensidade_sintomas, impacto_vida, ja_fez_terapia, uso_medicamento, medicamento_desc, medicamento_psiquiatra, historico_internacao, suporte_social, risco_suicidio, risco_desc, outras_informacoes, urgencia, disponibilidade, } = req.body;
        if (!nome || !cpf || !telefone || !motivo_busca)
            return res.status(400).json({ success: false, error: 'Nome, CPF, telefone e motivo são obrigatórios' });
        const cpfLimpo = cpf.replace(/\D/g, '');
        const [dupCPF] = await conn.query('SELECT id FROM pacientes WHERE cpf=?', [cpfLimpo]);
        if (dupCPF.length)
            return res.status(409).json({ success: false, error: 'CPF já cadastrado' });
        // Cria usuário já ativo (recepcionista faz o cadastro presencialmente)
        let usuario_id = null;
        if (email) {
            const [dupEmail] = await conn.query('SELECT id FROM usuarios WHERE email=?', [email.toLowerCase()]);
            if (dupEmail.length)
                return res.status(409).json({ success: false, error: 'Email já cadastrado' });
            const hash = await bcryptjs_1.default.hash(senha_provisoria || cpfLimpo, 12);
            const [ru] = await conn.query('INSERT INTO usuarios (nome,email,senha_hash,perfil,status_conta,email_verificado) VALUES (?,?,?,?,?,?)', [nome, email.toLowerCase(), hash, 'paciente', 'ativo', 1]);
            usuario_id = ru.insertId;
        }
        const urgenciaFinal = risco_suicidio ? 'muito_urgente' : (urgencia || 'sem_urgencia');
        // Recepcionista cadastra direto como triagem_aprovada (bypass da triagem)
        const [rp] = await conn.query(`INSERT INTO pacientes
         (usuario_id,nome,cpf,email,telefone,whatsapp,contato_emergencia,nome_emergencia,
          data_nascimento,genero,escolaridade,ocupacao,renda_familiar,endereco,bairro,
          motivo_busca,tempo_sintomas,intensidade_sintomas,impacto_vida,
          ja_fez_terapia,uso_medicamento,medicamento_desc,medicamento_psiquiatra,
          historico_internacao,suporte_social,risco_suicidio,risco_desc,outras_informacoes,
          urgencia,status,disponibilidade,triagem_admin_id,triagem_em,triagem_obs)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [usuario_id, nome, cpfLimpo, email || null, telefone, whatsapp || null,
            contato_emergencia || null, nome_emergencia || null, data_nascimento || null,
            genero || null, escolaridade || null, ocupacao || null, renda_familiar || null,
            endereco || null, bairro || null, motivo_busca,
            tempo_sintomas || null, intensidade_sintomas || null, impacto_vida || null,
            ja_fez_terapia ? 1 : 0, uso_medicamento ? 1 : 0, medicamento_desc || null,
            medicamento_psiquiatra ? 1 : 0, historico_internacao ? 1 : 0,
            suporte_social || null, risco_suicidio ? 1 : 0, risco_desc || null, outras_informacoes || null,
            urgenciaFinal, 'aguardando',
            disponibilidade ? JSON.stringify(disponibilidade) : null,
            req.user.id, new Date(), 'Cadastrado presencialmente pela recepção']);
        await conn.query('INSERT INTO historico_status (paciente_id,status_anterior,status_novo,usuario_id,canal,observacao) VALUES (?,?,?,?,?,?)', [rp.insertId, null, 'aguardando', req.user.id, 'recepcionista', 'Cadastro presencial — triagem presencial realizada']);
        await conn.commit();
        res.status(201).json({
            success: true,
            id: rp.insertId,
            usuario_id,
            message: 'Paciente cadastrado e adicionado à fila com sucesso.',
            senha_provisoria: !req.body.senha_provisoria ? cpfLimpo : undefined,
        });
    }
    catch (e) {
        await conn.rollback();
        res.status(500).json({ success: false, error: e.message });
    }
    finally {
        conn.release();
    }
};
exports.criarPacienteCompleto = criarPacienteCompleto;
// ── Completar cadastro de paciente que se auto-cadastrou ──
// Paciente veio pela triagem → recepcionista aprova + cria acesso completo
const completarCadastroPaciente = async (req, res) => {
    const conn = await connection_1.default.getConnection();
    try {
        await conn.beginTransaction();
        const { email, senha_provisoria, obs } = req.body;
        const [p] = await conn.query('SELECT * FROM pacientes WHERE id=?', [req.params.id]);
        if (!p.length)
            return res.status(404).json({ success: false, error: 'Paciente não encontrado' });
        // Se ainda não tem usuário, cria
        if (!p[0].usuario_id && email) {
            const hash = await bcryptjs_1.default.hash(senha_provisoria || p[0].cpf, 12);
            const [ru] = await conn.query('INSERT INTO usuarios (nome,email,senha_hash,perfil,status_conta,email_verificado) VALUES (?,?,?,?,?,?)', [p[0].nome, email.toLowerCase(), hash, 'paciente', 'ativo', 1]);
            await conn.query('UPDATE pacientes SET usuario_id=?,email=? WHERE id=?', [ru.insertId, email, req.params.id]);
        }
        // Atualiza status
        await conn.query('UPDATE pacientes SET status="aguardando",triagem_admin_id=?,triagem_em=NOW(),triagem_obs=?,atualizado_em=NOW() WHERE id=?', [req.user.id, obs || 'Cadastro complementado pela recepção', req.params.id]);
        await conn.query('INSERT INTO historico_status (paciente_id,status_anterior,status_novo,usuario_id,canal,observacao) VALUES (?,?,?,?,?,?)', [req.params.id, p[0].status, 'aguardando', req.user.id, 'recepcionista', obs || 'Cadastro complementado']);
        await conn.commit();
        res.json({ success: true, message: 'Cadastro complementado. Paciente na fila de espera.' });
    }
    catch (e) {
        await conn.rollback();
        res.status(500).json({ success: false, error: e.message });
    }
    finally {
        conn.release();
    }
};
exports.completarCadastroPaciente = completarCadastroPaciente;
// ── Histórico de contatos de um paciente ──────────────────
const atualizarDisponibilidadePaciente = async (req, res) => {
    try {
        const disponibilidade = normalizarDisponibilidadePaciente(req.body);
        if (!disponibilidade) {
            return res.status(400).json({ success: false, error: 'Disponibilidade invalida' });
        }
        const [r] = await connection_1.default.query('UPDATE pacientes SET disponibilidade=?,atualizado_em=NOW() WHERE id=?', [JSON.stringify(disponibilidade), req.params.id]);
        if (!r.affectedRows)
            return res.status(404).json({ success: false, error: 'Paciente nao encontrado' });
        res.json({ success: true, disponibilidade });
    }
    catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
};
exports.atualizarDisponibilidadePaciente = atualizarDisponibilidadePaciente;
const historicoContatos = async (req, res) => {
    try {
        const [rows] = await connection_1.default.query(`
      SELECT n.*, u.nome AS operador_nome
      FROM notificacoes n
      LEFT JOIN usuarios u ON n.usuario_id=u.id
      WHERE n.paciente_id=?
      ORDER BY n.criado_em DESC`, [req.params.id]);
        res.json({ success: true, data: rows });
    }
    catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
};
exports.historicoContatos = historicoContatos;

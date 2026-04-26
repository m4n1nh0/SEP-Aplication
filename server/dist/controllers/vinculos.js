"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.transferirEstagiario = exports.vinculoAtivo = exports.historicoVinculos = void 0;
const connection_1 = __importDefault(require("../db/connection"));
// ── Histórico de vínculos de um paciente ─────────────────
const historicoVinculos = async (req, res) => {
    try {
        const [rows] = await connection_1.default.query(`
      SELECT v.*, u.nome AS estagiario_nome, e.matricula,
             ut.nome AS transferido_por_nome
      FROM vinculos_estagiario_paciente v
      JOIN estagiarios e ON v.estagiario_id = e.id
      JOIN usuarios u ON e.usuario_id = u.id
      LEFT JOIN usuarios ut ON v.transferido_por = ut.id
      WHERE v.paciente_id = ?
      ORDER BY v.data_inicio DESC`, [req.params.paciente_id]);
        res.json({ success: true, data: rows });
    }
    catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
};
exports.historicoVinculos = historicoVinculos;
// ── Vínculo ativo atual ───────────────────────────────────
const vinculoAtivo = async (req, res) => {
    try {
        const [rows] = await connection_1.default.query(`
      SELECT v.*, u.nome AS estagiario_nome, e.matricula, e.semestre
      FROM vinculos_estagiario_paciente v
      JOIN estagiarios e ON v.estagiario_id = e.id
      JOIN usuarios u ON e.usuario_id = u.id
      WHERE v.paciente_id = ? AND v.ativo = 1
      LIMIT 1`, [req.params.paciente_id]);
        res.json({ success: true, data: rows[0] || null });
    }
    catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
};
exports.vinculoAtivo = vinculoAtivo;
// ── Transferir paciente para outro estagiário ─────────────
const transferirEstagiario = async (req, res) => {
    const conn = await connection_1.default.getConnection();
    try {
        await conn.beginTransaction();
        const { paciente_id } = req.params;
        const { novo_estagiario_id, motivo } = req.body;
        if (!novo_estagiario_id || !motivo) {
            return res.status(400).json({
                success: false,
                error: 'novo_estagiario_id e motivo são obrigatórios',
            });
        }
        // Verifica se o novo estagiário existe e é do perfil correto
        const [estRows] = await conn.query(`SELECT e.id FROM estagiarios e JOIN usuarios u ON e.usuario_id=u.id
       WHERE e.id=? AND u.perfil='estagiario' AND e.ativo=1`, [novo_estagiario_id]);
        if (!estRows.length)
            return res.status(404).json({ success: false, error: 'Estagiário não encontrado ou inativo' });
        // Supervisor: só pode transferir entre seus próprios estagiários
        if (req.user.perfil === 'supervisor') {
            const [sup] = await conn.query(`SELECT 1 FROM vinculos_supervisor_estagiario
         WHERE supervisor_id=? AND estagiario_id=? AND ativo=1`, [req.user.id, novo_estagiario_id]);
            if (!sup.length)
                return res.status(403).json({ success: false, error: 'Acesso negado: o estagiário de destino não é supervisionado por você.' });
        }
        // Encerra vínculo atual (se existir)
        const [atual] = await conn.query('SELECT id, estagiario_id FROM vinculos_estagiario_paciente WHERE paciente_id=? AND ativo=1', [paciente_id]);
        if (atual.length) {
            if (atual[0].estagiario_id === Number(novo_estagiario_id)) {
                await conn.rollback();
                return res.status(409).json({ success: false, error: 'Paciente já está vinculado a este estagiário' });
            }
            await conn.query(`UPDATE vinculos_estagiario_paciente
         SET ativo=0, data_fim=NOW(), motivo_transferencia=?, transferido_por=?
         WHERE id=?`, [motivo, req.user.id, atual[0].id]);
        }
        // Cria novo vínculo
        await conn.query(`INSERT INTO vinculos_estagiario_paciente (paciente_id, estagiario_id, ativo, motivo_transferencia, transferido_por)
       VALUES (?, ?, 1, ?, ?)`, [paciente_id, novo_estagiario_id, motivo, req.user.id]);
        // Atualiza paciente
        await conn.query('UPDATE pacientes SET estagiario_id=?, atualizado_em=NOW() WHERE id=?', [novo_estagiario_id, paciente_id]);
        // Histórico de status
        await conn.query(`INSERT INTO historico_status (paciente_id,status_anterior,status_novo,usuario_id,canal,observacao)
       VALUES (?,?,?,'em_atendimento',?,'supervisor','Transferência de estagiário: ${motivo}')`, [paciente_id, 'em_atendimento', 'em_atendimento', req.user.id]);
        // Log de auditoria
        await conn.query(`INSERT INTO audit_prontuarios (paciente_id,usuario_id,acao,ip,user_agent,detalhes)
       VALUES (?,?,'editou',?,?,?)`, [paciente_id, req.user.id, req.clientIp || '', req.headers['user-agent'] || '',
            `Transferência para estagiário ID ${novo_estagiario_id}: ${motivo}`]);
        await conn.commit();
        res.json({ success: true, message: 'Transferência realizada. Permissões de acesso atualizadas.' });
    }
    catch (e) {
        await conn.rollback();
        res.status(500).json({ success: false, error: e.message });
    }
    finally {
        conn.release();
    }
};
exports.transferirEstagiario = transferirEstagiario;

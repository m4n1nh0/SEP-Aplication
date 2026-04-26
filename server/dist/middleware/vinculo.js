"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditAccess = exports.checkVinculo = void 0;
const connection_1 = __importDefault(require("../db/connection"));
/**
 * Verifica se o estagiário logado tem vínculo ativo com o paciente
 * especificado em req.params.paciente_id ou req.body.paciente_id.
 *
 * Coordenadores, supervisores e recepcionistas passam direto (acesso total).
 * Estagiários só passam se tiverem vínculo ativo.
 *
 * Registra o acesso na tabela audit_prontuarios.
 */
const checkVinculo = (acao) => async (req, res, next) => {
    const user = req.user;
    // Coordenador, supervisor e recepcionista têm acesso irrestrito
    if (user.perfil === 'coordenador' || user.perfil === 'supervisor' || user.perfil === 'recepcionista') {
        return next();
    }
    // Estagiário: verifica vínculo ativo
    if (user.perfil === 'estagiario') {
        const pacienteId = req.params.paciente_id ||
            req.params.id ||
            req.body?.paciente_id;
        if (!pacienteId) {
            return res.status(400).json({ success: false, error: 'paciente_id não informado' });
        }
        const [rows] = await connection_1.default.query(`SELECT v.id FROM vinculos_estagiario_paciente v
         WHERE v.paciente_id = ? AND v.estagiario_id = ? AND v.ativo = 1
         LIMIT 1`, [pacienteId, user.ref_id]);
        if (!rows.length) {
            return res.status(403).json({
                success: false,
                error: 'Acesso negado: você não tem vínculo ativo com este paciente.',
            });
        }
        // Registra acesso na auditoria (async — não bloqueia a requisição)
        const prontuarioId = req.params.prontuario_id || null;
        connection_1.default.query(`INSERT INTO audit_prontuarios (prontuario_id, paciente_id, usuario_id, acao, ip, user_agent)
         VALUES (?, ?, ?, ?, ?, ?)`, [prontuarioId, pacienteId, user.id, acao, req.clientIp || '', req.headers['user-agent'] || '']).catch(() => { }); // ignora erro de auditoria para não bloquear
        return next();
    }
    return res.status(403).json({ success: false, error: 'Perfil sem acesso a prontuários' });
};
exports.checkVinculo = checkVinculo;
/**
 * Verifica e registra acesso a supervisor — só registra auditoria,
 * sem bloquear (supervisor tem acesso total).
 */
const auditAccess = (acao) => async (req, _res, next) => {
    const user = req.user;
    const pacienteId = req.params.paciente_id || req.params.id || req.body?.paciente_id;
    const prontuarioId = req.params.prontuario_id || null;
    if (pacienteId) {
        connection_1.default.query(`INSERT INTO audit_prontuarios (prontuario_id, paciente_id, usuario_id, acao, ip, user_agent)
         VALUES (?, ?, ?, ?, ?, ?)`, [prontuarioId, pacienteId, user.id, acao, req.clientIp || '', req.headers['user-agent'] || '']).catch(() => { });
    }
    next();
};
exports.auditAccess = auditAccess;

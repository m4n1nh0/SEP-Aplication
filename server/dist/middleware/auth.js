"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.permitir = exports.auth = exports.ipMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const connection_1 = __importDefault(require("../db/connection"));
const SECRET = process.env.JWT_SECRET || 'sep_secret';
// Extrai IP real (considera proxies)
const ipMiddleware = (req, _res, next) => {
    req.clientIp = (req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
        req.socket.remoteAddress ||
        'unknown');
    next();
};
exports.ipMiddleware = ipMiddleware;
// Autenticação JWT com validação de sessão no banco
const auth = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token)
        return res.status(401).json({ success: false, error: 'Token não fornecido' });
    try {
        const payload = jsonwebtoken_1.default.verify(token, SECRET);
        // Verifica se a sessão ainda está ativa no banco
        const [sess] = await connection_1.default.query('SELECT id FROM sessoes WHERE token_hash = ? AND ativo = 1 AND expira_em > NOW()', [payload.jti]);
        if (!sess.length) {
            return res.status(401).json({ success: false, error: 'Sessão expirada ou revogada. Faça login novamente.' });
        }
        // Verifica se a conta ainda está ativa
        const [u] = await connection_1.default.query('SELECT status_conta FROM usuarios WHERE id = ?', [payload.id]);
        if (!u.length || u[0].status_conta !== 'ativo') {
            return res.status(401).json({ success: false, error: 'Conta suspensa ou bloqueada.' });
        }
        req.user = payload;
        next();
    }
    catch (err) {
        return res.status(401).json({ success: false, error: 'Token inválido ou expirado' });
    }
};
exports.auth = auth;
// Permissão por perfil
const permitir = (...perfis) => (req, res, next) => {
    if (!req.user || !perfis.includes(req.user.perfil))
        return res.status(403).json({ success: false, error: 'Acesso negado para este perfil' });
    next();
};
exports.permitir = permitir;

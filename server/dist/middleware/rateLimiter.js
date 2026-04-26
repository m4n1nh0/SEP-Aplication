"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.limiterUpload = exports.limiterCadastro = exports.limiterAuth = exports.limiterGeral = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000; // 15 min
// Geral — todas as rotas
exports.limiterGeral = (0, express_rate_limit_1.default)({
    windowMs,
    max: Number(process.env.RATE_LIMIT_MAX) || 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Muitas requisições. Tente novamente em alguns minutos.' },
});
// Autenticação — mais restrito
exports.limiterAuth = (0, express_rate_limit_1.default)({
    windowMs,
    max: Number(process.env.AUTH_RATE_LIMIT_MAX) || 10,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // só conta erros
    message: { success: false, error: 'Muitas tentativas de login. Aguarde 15 minutos.' },
    keyGenerator: (req) => req.clientIp || req.ip || 'unknown',
});
// Cadastro — muito restrito para evitar spam
exports.limiterCadastro = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 3,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Limite de cadastros por hora atingido.' },
});
// Upload de documentos
exports.limiterUpload = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000,
    max: 20,
    message: { success: false, error: 'Limite de uploads atingido.' },
});

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logSeguranca = void 0;
const connection_1 = __importDefault(require("../db/connection"));
const logSeguranca = async (evento, opts) => {
    try {
        await connection_1.default.query('INSERT INTO logs_seguranca (usuario_id,evento,ip,user_agent,detalhe) VALUES (?,?,?,?,?)', [opts.usuario_id || null, evento, opts.ip || null, opts.user_agent || null, opts.detalhe || null]);
    }
    catch {
        // Não deixa falha de log derrubar a requisição
    }
};
exports.logSeguranca = logSeguranca;

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLogs = void 0;
const logger_1 = require("../utils/logger");
const logger_2 = __importDefault(require("../utils/logger"));
/**
 * GET /admin/logs?tipo=app|error|audit&limite=200
 * Retorna os últimos N registros de log para o painel do coordenador
 */
const getLogs = (req, res) => {
    try {
        const tipo = req.query.tipo || 'app';
        const limite = Math.min(Number(req.query.limite) || 200, 1000);
        logger_2.default.audit(req, 'visualizou_logs', { tipo, limite });
        const logs = (0, logger_1.readLogs)(tipo, limite);
        res.json({ success: true, data: logs, total: logs.length });
    }
    catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
};
exports.getLogs = getLogs;

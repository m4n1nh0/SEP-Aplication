"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
const logger_1 = __importDefault(require("./utils/logger"));
const rateLimiter_1 = require("./middleware/rateLimiter");
const auth_1 = require("./middleware/auth");
const routes_1 = __importDefault(require("./routes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = Number(process.env.PORT) || 3001;
// ── Segurança HTTP ────────────────────────────────────────
app.use((0, helmet_1.default)({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            imgSrc: ["'self'", 'data:', 'blob:'],
        },
    },
}));
app.use((0, cors_1.default)({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express_1.default.json({ limit: '2mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '2mb' }));
// IP real
app.use(auth_1.ipMiddleware);
// Log de requisições HTTP
app.use(logger_1.default.middleware);
// Rate limit geral
app.use(rateLimiter_1.limiterGeral);
// Arquivos de upload (protegidos)
app.use('/uploads', express_1.default.static(path_1.default.join(process.env.UPLOAD_DIR || './uploads'), { dotfiles: 'deny' }));
// Health
app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'SEP API v3', ts: new Date().toISOString() }));
// Rotas
app.use('/api', routes_1.default);
// 404
app.use('/api/*', (_req, res) => res.status(404).json({ success: false, error: 'Rota não encontrada' }));
app.listen(PORT, () => {
    logger_1.default.info('SEP API v3 iniciado', {
        url: `http://localhost:${PORT}/api`,
        env: process.env.NODE_ENV || 'development',
        uploads: process.env.UPLOAD_DIR || './uploads',
        cors: process.env.CLIENT_URL || 'http://localhost:5173',
    });
});
exports.default = app;

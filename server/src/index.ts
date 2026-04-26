import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import logger from './utils/logger';
import { limiterGeral } from './middleware/rateLimiter';
import { ipMiddleware } from './middleware/auth';
import routes from './routes';

dotenv.config();

const app  = express();
const PORT = Number(process.env.PORT) || 3001;

// ── Segurança HTTP ────────────────────────────────────────
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
    },
  },
}));

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}));

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// IP real
app.use(ipMiddleware);

// Log de requisições HTTP
app.use(logger.middleware);

// Rate limit geral
app.use(limiterGeral);

// Arquivos de upload (protegidos)
app.use('/uploads', express.static(
  path.join(process.env.UPLOAD_DIR || './uploads'),
  { dotfiles: 'deny' }
));

// Health
app.get('/api/health', (_req, res) =>
  res.json({ ok: true, service: 'SEP API v3', ts: new Date().toISOString() }));

// Rotas
app.use('/api', routes);

// 404
app.use('/api/*', (_req, res) =>
  res.status(404).json({ success: false, error: 'Rota não encontrada' }));

// Frontend compilado para deploy monolitico.
const clientDist = process.env.CLIENT_DIST_DIR || path.resolve(__dirname, '../../client/dist');
const clientIndex = path.join(clientDist, 'index.html');

if (process.env.SERVE_CLIENT !== 'false') {
  app.use(express.static(clientDist));
  app.get('*', (_req, res, next) => {
    if (!fs.existsSync(clientIndex)) return next();
    res.sendFile(clientIndex);
  });
}

app.listen(PORT, () => {
  logger.info('SEP API v3 iniciado', {
    url:      `http://localhost:${PORT}/api`,
    env:      process.env.NODE_ENV || 'development',
    uploads:  process.env.UPLOAD_DIR || './uploads',
    cors:     process.env.CLIENT_URL || 'http://localhost:5173',
    client_dist: process.env.SERVE_CLIENT === 'false' ? 'desabilitado' : clientDist,
  });
});

export default app;

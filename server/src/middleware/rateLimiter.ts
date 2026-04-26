import rateLimit from 'express-rate-limit';

const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000; // 15 min

// Geral — todas as rotas
export const limiterGeral = rateLimit({
  windowMs,
  max: Number(process.env.RATE_LIMIT_MAX) || 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Muitas requisições. Tente novamente em alguns minutos.' },
});

// Autenticação — mais restrito
export const limiterAuth = rateLimit({
  windowMs,
  max: Number(process.env.AUTH_RATE_LIMIT_MAX) || 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // só conta erros
  message: { success: false, error: 'Muitas tentativas de login. Aguarde 15 minutos.' },
  keyGenerator: (req) => req.clientIp || req.ip || 'unknown',
});

// Cadastro — muito restrito para evitar spam
export const limiterCadastro = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Limite de cadastros por hora atingido.' },
});

// Upload de documentos
export const limiterUpload = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: { success: false, error: 'Limite de uploads atingido.' },
});

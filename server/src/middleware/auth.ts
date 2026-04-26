import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JwtPayload, Perfil } from '../types';
import pool from '../db/connection';

const SECRET = process.env.JWT_SECRET || 'sep_secret';

// Extrai IP real (considera proxies)
export const ipMiddleware = (req: Request, _res: Response, next: NextFunction) => {
  req.clientIp = (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    'unknown'
  );
  next();
};

// Autenticação JWT com validação de sessão no banco
export const auth = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, error: 'Token não fornecido' });

  try {
    const payload = jwt.verify(token, SECRET) as JwtPayload;

    // Verifica se a sessão ainda está ativa no banco
    const [sess]: any = await pool.query(
      'SELECT id FROM sessoes WHERE token_hash = ? AND ativo = 1 AND expira_em > NOW()',
      [payload.jti]
    );
    if (!sess.length) {
      return res.status(401).json({ success: false, error: 'Sessão expirada ou revogada. Faça login novamente.' });
    }

    // Verifica se a conta ainda está ativa
    const [u]: any = await pool.query(
      'SELECT status_conta FROM usuarios WHERE id = ?', [payload.id]
    );
    if (!u.length || u[0].status_conta !== 'ativo') {
      return res.status(401).json({ success: false, error: 'Conta suspensa ou bloqueada.' });
    }

    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Token inválido ou expirado' });
  }
};

// Permissão por perfil
export const permitir = (...perfis: Perfil[]) =>
  (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !perfis.includes(req.user.perfil))
      return res.status(403).json({ success: false, error: 'Acesso negado para este perfil' });
    next();
  };

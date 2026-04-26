import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { Secret, SignOptions } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import pool from '../db/connection';
import logger from '../utils/logger';
import { logSeguranca } from '../utils/security';
import { JwtPayload } from '../types';

const SECRET: Secret = process.env.JWT_SECRET || 'sep_secret';
const EXPIRES_IN: SignOptions['expiresIn'] = (process.env.JWT_EXPIRES_IN as SignOptions['expiresIn']) || '8h';
const MAX_TENTATIVAS = Number(process.env.MAX_LOGIN_ATTEMPTS) || 5;
const LOCK_MIN    = Number(process.env.LOCK_TIME_MINUTES)     || 30;

const getExpiresAt = () => new Date(Date.now() + 8 * 60 * 60 * 1000);

const parseDevice = (ua: string = '') => {
  if (/mobile|android|iphone|ipad/i.test(ua)) return 'Mobile';
  if (/tablet/i.test(ua)) return 'Tablet';
  return 'Desktop';
};

// ── LOGIN ─────────────────────────────────────────────────
export const login = async (req: Request, res: Response) => {
  const { email, senha, totp_code } = req.body;
  const ip = req.clientIp || '';
  const ua = req.headers['user-agent'] || '';

  if (!email || !senha)
    return res.status(400).json({ success: false, error: 'Email e senha obrigatórios' });

  try {
    const [rows]: any = await pool.query(
      `SELECT id,nome,email,senha_hash,perfil,status_conta,email_verificado,
              tentativas_login,bloqueado_ate,totp_secret,totp_ativo
       FROM usuarios WHERE email = ?`, [email.toLowerCase().trim()]
    );
    const u = rows[0];

    // Usuário não encontrado — log genérico para não revelar se email existe
    if (!u) {
      await logSeguranca('login_falhou', { ip, user_agent: ua, detalhe: `Email não encontrado: ${email}` });
      logger.warn('Tentativa de login inválida', { email: email?.toLowerCase(), ip: req.clientIp });
    return res.status(401).json({ success: false, error: 'Credenciais inválidas' });
    }

    // Conta bloqueada por tentativas?
    if (u.bloqueado_ate && new Date(u.bloqueado_ate) > new Date()) {
      const restante = Math.ceil((new Date(u.bloqueado_ate).getTime() - Date.now()) / 60000);
      await logSeguranca('tentativa_suspeita', { usuario_id: u.id, ip, user_agent: ua, detalhe: `Conta bloqueada, tentativa de acesso. ${restante}min restantes.` });
      return res.status(401).json({ success: false, error: `Conta bloqueada por excesso de tentativas. Tente novamente em ${restante} minuto(s).` });
    }

    // Verifica status
    if (u.status_conta === 'pendente_email') {
      return res.status(401).json({ success: false, error: 'Confirme seu email antes de fazer login.', code: 'EMAIL_PENDING' });
    }
    if (u.status_conta !== 'ativo') {
      return res.status(401).json({ success: false, error: 'Conta suspensa. Entre em contato com o SEP.' });
    }

    // Verifica senha
    const senhaOk = await bcrypt.compare(senha, u.senha_hash);
    if (!senhaOk) {
      const novasTentativas = (u.tentativas_login || 0) + 1;
      const bloqueado = novasTentativas >= MAX_TENTATIVAS;
      await pool.query(
        'UPDATE usuarios SET tentativas_login=?, bloqueado_ate=? WHERE id=?',
        [
          bloqueado ? 0 : novasTentativas,
          bloqueado ? new Date(Date.now() + LOCK_MIN * 60000) : null,
          u.id,
        ]
      );
      if (bloqueado) {
        await logSeguranca('conta_bloqueada', { usuario_id: u.id, ip, user_agent: ua, detalhe: `${MAX_TENTATIVAS} tentativas falhas. Bloqueado por ${LOCK_MIN}min.` });
        return res.status(401).json({ success: false, error: `Muitas tentativas. Conta bloqueada por ${LOCK_MIN} minutos.` });
      }
      await logSeguranca('login_falhou', { usuario_id: u.id, ip, user_agent: ua, detalhe: `Tentativa ${novasTentativas}/${MAX_TENTATIVAS}` });
      return res.status(401).json({ success: false, error: `Credenciais inválidas. ${MAX_TENTATIVAS - novasTentativas} tentativa(s) restante(s).` });
    }

    // 2FA
    if (u.totp_ativo && u.totp_secret) {
      if (!totp_code) return res.status(200).json({ success: false, requires_totp: true });
      const valid = authenticator.verify({ token: totp_code, secret: u.totp_secret });
      if (!valid) {
        await logSeguranca('login_falhou', { usuario_id: u.id, ip, user_agent: ua, detalhe: 'Código TOTP inválido' });
        return res.status(401).json({ success: false, error: 'Código de autenticação inválido.' });
      }
    }

    // Busca ref_id
    let ref_id = u.id;
    if (u.perfil === 'estagiario') {
      const [e]: any = await pool.query('SELECT id FROM estagiarios WHERE usuario_id=?', [u.id]);
      ref_id = e[0]?.id ?? u.id;
    } else if (u.perfil === 'paciente') {
      const [p]: any = await pool.query('SELECT id FROM pacientes WHERE usuario_id=?', [u.id]);
      ref_id = p[0]?.id ?? u.id;
    }

    // Cria JWT com jti único
    const jti = uuidv4();
    const payload: JwtPayload = { id: u.id, perfil: u.perfil, nome: u.nome, ref_id, jti };
    const token = jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN });

    // Persiste sessão
    await pool.query(
      'INSERT INTO sessoes (usuario_id,token_hash,ip,user_agent,dispositivo,expira_em) VALUES (?,?,?,?,?,?)',
      [u.id, jti, ip, ua.slice(0, 500), parseDevice(ua), getExpiresAt()]
    );

    // Reset tentativas + atualiza último login
    await pool.query(
      'UPDATE usuarios SET tentativas_login=0,bloqueado_ate=NULL,ultimo_login_em=NOW(),ultimo_login_ip=? WHERE id=?',
      [ip, u.id]
    );

    await logSeguranca('login_ok', { usuario_id: u.id, ip, user_agent: ua, detalhe: `Dispositivo: ${parseDevice(ua)}` });
    logger.info('Login bem-sucedido', { usuario_id: u.id, perfil: u.perfil, ip });

    res.json({
      success: true,
      token,
      user: { id: u.id, nome: u.nome, email: u.email, perfil: u.perfil, ref_id },
    });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
};

// ── LOGOUT ────────────────────────────────────────────────
export const logout = async (req: Request, res: Response) => {
  try {
    const jti = req.user!.jti;
    await pool.query('UPDATE sessoes SET ativo=0,encerrado_em=NOW() WHERE token_hash=?', [jti]);
    await logSeguranca('logout', { usuario_id: req.user!.id, ip: req.clientIp });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
};

// ── CADASTRO DE PACIENTE ──────────────────────────────────
export const cadastroPaciente = async (req: Request, res: Response) => {
  const conn = await pool.getConnection();
  const ip = req.clientIp || '';
  const ua = req.headers['user-agent'] || '';
  try {
    await conn.beginTransaction();
    const {
      nome, cpf, email, senha, telefone, whatsapp, contato_emergencia, nome_emergencia,
      data_nascimento, genero, escolaridade, ocupacao, renda_familiar, endereco, bairro,
      motivo_busca, tempo_sintomas, intensidade_sintomas, impacto_vida,
      ja_fez_terapia, tempo_terapia_anterior, uso_medicamento, medicamento_desc,
      medicamento_psiquiatra, historico_internacao, suporte_social,
      risco_suicidio, risco_desc, outras_informacoes, urgencia, disponibilidade,
    } = req.body;

    if (!nome || !cpf || !email || !senha || !telefone || !motivo_busca)
      return res.status(400).json({ success: false, error: 'Campos obrigatórios faltando' });

    // Valida senha
    if (senha.length < 8)
      return res.status(400).json({ success: false, error: 'Senha deve ter pelo menos 8 caracteres' });

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(senha))
      return res.status(400).json({ success: false, error: 'Senha deve conter letras maiúsculas, minúsculas e números' });

    // CPF limpo
    const cpfLimpo = cpf.replace(/\D/g, '');
    if (cpfLimpo.length !== 11)
      return res.status(400).json({ success: false, error: 'CPF inválido' });

    // Duplicatas
    const [dupEmail]: any = await conn.query('SELECT id FROM usuarios WHERE email=?', [email.toLowerCase()]);
    if (dupEmail.length) return res.status(409).json({ success: false, error: 'Email já cadastrado' });

    const [dupCPF]: any = await conn.query('SELECT id FROM pacientes WHERE cpf=?', [cpfLimpo]);
    if (dupCPF.length) return res.status(409).json({ success: false, error: 'CPF já cadastrado' });

    // Cria usuário com status pendente_email
    const emailToken = uuidv4().replace(/-/g, '');
    const hash = await bcrypt.hash(senha, 12);
    const [ru]: any = await conn.query(
      'INSERT INTO usuarios (nome,email,senha_hash,perfil,status_conta,email_token) VALUES (?,?,?,?,?,?)',
      [nome, email.toLowerCase(), hash, 'paciente', 'pendente_email', emailToken]
    );

    // Urgência automática por risco
    const urgenciaFinal = risco_suicidio ? 'muito_urgente' : (urgencia || 'sem_urgencia');

    // Cria paciente com status triagem_pendente
    const [rp]: any = await conn.query(
      `INSERT INTO pacientes
         (usuario_id,nome,cpf,email,telefone,whatsapp,contato_emergencia,nome_emergencia,
          data_nascimento,genero,escolaridade,ocupacao,renda_familiar,endereco,bairro,
          motivo_busca,tempo_sintomas,intensidade_sintomas,impacto_vida,
          ja_fez_terapia,tempo_terapia_anterior,uso_medicamento,medicamento_desc,
          medicamento_psiquiatra,historico_internacao,suporte_social,
          risco_suicidio,risco_desc,outras_informacoes,urgencia,disponibilidade)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [ru.insertId, nome, cpfLimpo, email.toLowerCase(), telefone, whatsapp||null,
       contato_emergencia||null, nome_emergencia||null, data_nascimento||null,
       genero||null, escolaridade||null, ocupacao||null, renda_familiar||null,
       endereco||null, bairro||null, motivo_busca,
       tempo_sintomas||null, intensidade_sintomas||null, impacto_vida||null,
       ja_fez_terapia?1:0, tempo_terapia_anterior||null,
       uso_medicamento?1:0, medicamento_desc||null,
       medicamento_psiquiatra?1:0, historico_internacao?1:0,
       suporte_social||null, risco_suicidio?1:0, risco_desc||null,
       outras_informacoes||null, urgenciaFinal,
       disponibilidade ? JSON.stringify(disponibilidade) : null]
    );

    await conn.commit();
    await logSeguranca('cadastro', { usuario_id: ru.insertId, ip, user_agent: ua, detalhe: `CPF: ${cpfLimpo}` });

    // Em produção: enviar email de confirmação com emailToken
    // await sendConfirmationEmail(email, emailToken);

    res.status(201).json({
      success: true,
      id: rp.insertId,
      message: 'Cadastro realizado! Verifique seu email para ativar a conta.',
      // Em dev, retorna o token para facilitar testes
      ...(process.env.NODE_ENV === 'development' ? { email_token: emailToken } : {}),
    });
  } catch (e: any) {
    await conn.rollback();
    res.status(500).json({ success: false, error: e.message });
  } finally {
    conn.release();
  }
};

// ── VERIFICAR EMAIL ───────────────────────────────────────
export const verificarEmail = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const [rows]: any = await pool.query(
      'SELECT id FROM usuarios WHERE email_token=? AND email_verificado=0', [token]
    );
    if (!rows.length) return res.status(400).json({ success: false, error: 'Token inválido ou já utilizado' });

    await pool.query(
      'UPDATE usuarios SET status_conta="ativo",email_verificado=1,email_verificado_em=NOW(),email_token=NULL WHERE id=?',
      [rows[0].id]
    );
    await logSeguranca('email_verificado', { usuario_id: rows[0].id });
    res.json({ success: true, message: 'Email confirmado! Agora você pode fazer login.' });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
};

// ── MINHAS SESSÕES ────────────────────────────────────────
export const minhasSessoes = async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.query(
      `SELECT id,ip,dispositivo,user_agent,criado_em,expira_em,
              (token_hash = ?) AS atual
       FROM sessoes
       WHERE usuario_id=? AND ativo=1 AND expira_em > NOW()
       ORDER BY criado_em DESC`, [req.user!.jti, req.user!.id]
    );
    res.json({ success: true, data: rows });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
};

// ── REVOGAR SESSÃO ────────────────────────────────────────
export const revogarSessao = async (req: Request, res: Response) => {
  try {
    const { sessao_id } = req.params;
    await pool.query(
      'UPDATE sessoes SET ativo=0,encerrado_em=NOW() WHERE id=? AND usuario_id=?',
      [sessao_id, req.user!.id]
    );
    await logSeguranca('sessao_revogada', { usuario_id: req.user!.id, ip: req.clientIp, detalhe: `Sessão ${sessao_id} revogada` });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
};

// ── LOGOUT DE TODOS OS DEVICES ────────────────────────────
export const logoutTodos = async (req: Request, res: Response) => {
  try {
    await pool.query(
      "UPDATE sessoes SET ativo=0,encerrado_em=NOW() WHERE usuario_id=? AND ativo=1",
      [req.user!.id]
    );
    await logSeguranca('sessao_revogada', { usuario_id: req.user!.id, ip: req.clientIp, detalhe: 'Todas as sessões revogadas' });
    res.json({ success: true, message: 'Todas as sessões encerradas.' });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
};

// ── ALTERAR SENHA ─────────────────────────────────────────
export const alterarSenha = async (req: Request, res: Response) => {
  try {
    const { senha_atual, nova_senha } = req.body;
    if (!senha_atual || !nova_senha)
      return res.status(400).json({ success: false, error: 'Informe a senha atual e a nova senha' });

    if (nova_senha.length < 8 || !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(nova_senha))
      return res.status(400).json({ success: false, error: 'Nova senha fraca. Mínimo 8 caracteres com maiúsculas, minúsculas e números.' });

    const [u]: any = await pool.query('SELECT senha_hash FROM usuarios WHERE id=?', [req.user!.id]);
    const ok = await bcrypt.compare(senha_atual, u[0].senha_hash);
    if (!ok) return res.status(401).json({ success: false, error: 'Senha atual incorreta' });

    const hash = await bcrypt.hash(nova_senha, 12);
    await pool.query('UPDATE usuarios SET senha_hash=?,senha_alterada_em=NOW() WHERE id=?', [hash, req.user!.id]);

    // Revoga todas as outras sessões
    await pool.query(
      "UPDATE sessoes SET ativo=0,encerrado_em=NOW() WHERE usuario_id=? AND token_hash != ? AND ativo=1",
      [req.user!.id, req.user!.jti]
    );

    await logSeguranca('senha_alterada', { usuario_id: req.user!.id, ip: req.clientIp });
    res.json({ success: true, message: 'Senha alterada. Outras sessões foram encerradas.' });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
};

// ── ATIVAR 2FA ────────────────────────────────────────────
export const ativar2FA = async (req: Request, res: Response) => {
  try {
    const secret = authenticator.generateSecret();
    const otp_uri = authenticator.keyuri(req.user!.nome, 'SEP Estácio', secret);
    const qr = await QRCode.toDataURL(otp_uri);
    // Salva temporariamente (ainda não ativado)
    await pool.query('UPDATE usuarios SET totp_secret=? WHERE id=?', [secret, req.user!.id]);
    res.json({ success: true, qr, secret });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
};

export const confirmar2FA = async (req: Request, res: Response) => {
  try {
    const { code } = req.body;
    const [u]: any = await pool.query('SELECT totp_secret FROM usuarios WHERE id=?', [req.user!.id]);
    const valid = authenticator.verify({ token: code, secret: u[0].totp_secret });
    if (!valid) return res.status(400).json({ success: false, error: 'Código inválido' });
    await pool.query('UPDATE usuarios SET totp_ativo=1 WHERE id=?', [req.user!.id]);
    await logSeguranca('totp_ativado', { usuario_id: req.user!.id, ip: req.clientIp });
    res.json({ success: true, message: '2FA ativado com sucesso!' });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
};

export const desativar2FA = async (req: Request, res: Response) => {
  try {
    await pool.query('UPDATE usuarios SET totp_ativo=0,totp_secret=NULL WHERE id=?', [req.user!.id]);
    await logSeguranca('totp_desativado', { usuario_id: req.user!.id, ip: req.clientIp });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
};

// ── LOGS DE SEGURANÇA (só admin) ──────────────────────────
export const logsSeguranca = async (req: Request, res: Response) => {
  try {
    const { usuario_id, evento, limit = 100 } = req.query;
    let sql = `SELECT l.*,u.nome AS usuario_nome,u.email AS usuario_email
               FROM logs_seguranca l LEFT JOIN usuarios u ON l.usuario_id=u.id WHERE 1=1`;
    const params: any[] = [];
    if (usuario_id) { sql += ' AND l.usuario_id=?'; params.push(usuario_id); }
    if (evento)     { sql += ' AND l.evento=?';     params.push(evento); }
    sql += ` ORDER BY l.criado_em DESC LIMIT ${Number(limit)}`;
    const [rows] = await pool.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
};

export const me = (req: Request, res: Response) => {
  res.json({ success: true, user: req.user });
};

// ── Validação de domínio institucional ────────────────────
function validarDominioInstitucional(email: string, perfil: string): string|null {
  // Lê domínios do .env — ex: EMAIL_DOMINIO_ESTAGIARIO=alunos.estacio.br
  // Múltiplos domínios separados por vírgula: estacio.br,prof.estacio.br
  const envKey = `EMAIL_DOMINIO_${perfil.toUpperCase()}`;
  const dominiosRaw = process.env[envKey] || '';
  if (!dominiosRaw.trim()) return null; // sem restrição configurada

  const dominios = dominiosRaw.split(',').map(d => d.trim().toLowerCase()).filter(Boolean);
  const emailLower = email.toLowerCase();
  const valido = dominios.some(d => emailLower.endsWith(`@${d}`));

  if (!valido) {
    const lista = dominios.map(d => `@${d}`).join(' ou ');
    return `E-mail institucional obrigatório para ${perfil}. Use: ${lista}`;
  }
  return null;
}

// ── Criar usuário interno (coordenador cria supervisor/estagiário/recepcionista) ──
export const criarUsuarioInterno = async (req: Request, res: Response) => {
  const conn = await pool.getConnection();
  const ip = req.clientIp || '';
  const ua = req.headers['user-agent'] || '';
  try {
    await conn.beginTransaction();
    const { nome, email, perfil, matricula, semestre, senha_provisoria } = req.body;

    if (!nome || !email || !perfil)
      return res.status(400).json({ success: false, error: 'nome, email e perfil são obrigatórios' });

    const perfisPermitidos = ['supervisor','recepcionista','estagiario'];
    if (!perfisPermitidos.includes(perfil))
      return res.status(400).json({ success: false, error: `Perfil inválido. Permitido: ${perfisPermitidos.join(', ')}` });

    if (req.user!.perfil === 'supervisor' && perfil !== 'estagiario') {
      return res.status(403).json({ success: false, error: 'Supervisor pode cadastrar apenas estagiários.' });
    }

    // Valida domínio institucional
    const erroEmail = validarDominioInstitucional(email, perfil);
    if (erroEmail) return res.status(400).json({ success: false, error: erroEmail });

    // Verifica duplicata
    const [dup]: any = await conn.query('SELECT id FROM usuarios WHERE email=?', [email.toLowerCase()]);
    if (dup.length) return res.status(409).json({ success: false, error: 'E-mail já cadastrado' });

    // Gera senha provisória se não informada
    const senhaFinal = senha_provisoria || `Sep@${Math.floor(1000+Math.random()*9000)}`;
    const hash = await bcrypt.hash(senhaFinal, 12);

    // Cria usuário já ativo (coordenador faz o onboarding)
    const [ru]: any = await conn.query(
      'INSERT INTO usuarios (nome,email,senha_hash,perfil,status_conta,email_verificado) VALUES (?,?,?,?,?,?)',
      [nome, email.toLowerCase(), hash, perfil, 'ativo', 1]
    );

    let estagiarioId: number | null = null;

    // Se for estagiário: cria registro na tabela estagiarios
    if (perfil === 'estagiario') {
      if (!matricula) {
        await conn.rollback();
        return res.status(400).json({ success: false, error: 'matricula é obrigatória para estagiário' });
      }
      const [dupMat]: any = await conn.query('SELECT id FROM estagiarios WHERE matricula=?', [matricula]);
      if (dupMat.length) {
        await conn.rollback();
        return res.status(409).json({ success: false, error: 'Matrícula já cadastrada' });
      }
      const [re]: any = await conn.query(
        'INSERT INTO estagiarios (usuario_id,matricula,semestre,ativo,supervisor_id) VALUES (?,?,?,?,?)',
        [ru.insertId, matricula, semestre||null, 1, req.user!.perfil === 'supervisor' ? req.user!.id : null]
      );
      estagiarioId = re.insertId;

      if (req.user!.perfil === 'supervisor') {
        await conn.query(
          'INSERT INTO vinculos_supervisor_estagiario (supervisor_id,estagiario_id,criado_por) VALUES (?,?,?)',
          [req.user!.id, estagiarioId, req.user!.id]
        );
      }
    }

    await conn.commit();
    await logSeguranca('criar_usuario_interno', {
      usuario_id: req.user!.id, ip, user_agent: ua,
      detalhe: `${perfil} criado: ${email}`
    });

    res.status(201).json({
      success: true,
      id: ru.insertId,
      estagiario_id: estagiarioId,
      senha_provisoria: senhaFinal,
      message: `${perfil.charAt(0).toUpperCase()+perfil.slice(1)} criado com sucesso. Senha provisória enviada.`,
    });
  } catch (e: any) {
    await conn.rollback();
    res.status(500).json({ success: false, error: e.message });
  } finally { conn.release(); }
};

// ── Listar usuários internos ───────────────────────────────
export const listarUsuariosInternos = async (req: Request, res: Response) => {
  try {
    const isSupervisor = req.user!.perfil === 'supervisor';
    const [rows] = await pool.query(`
      SELECT u.id, u.nome, u.email, u.perfil, u.status_conta, u.criado_em,
             e.id AS estagiario_id, e.matricula, e.semestre, e.ativo AS estagiario_ativo,
             e.supervisor_id,
             us.nome AS supervisor_nome
      FROM usuarios u
      LEFT JOIN estagiarios e ON e.usuario_id=u.id
      LEFT JOIN usuarios us ON us.id=e.supervisor_id
      WHERE u.perfil IN('supervisor','recepcionista','estagiario')
        ${isSupervisor ? "AND u.perfil='estagiario' AND EXISTS (SELECT 1 FROM vinculos_supervisor_estagiario vs WHERE vs.estagiario_id=e.id AND vs.supervisor_id=? AND vs.ativo=1)" : ''}
      ORDER BY u.perfil, u.nome`,
      isSupervisor ? [req.user!.id] : []
    );
    res.json({ success: true, data: rows });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
};

// ── Atualizar status de conta ──────────────────────────────
export const toggleStatusConta = async (req: Request, res: Response) => {
  try {
    const { ativo } = req.body;
    const [u]: any = await pool.query('SELECT perfil,status_conta FROM usuarios WHERE id=?', [req.params.id]);
    if (!u.length) return res.status(404).json({ success: false, error: 'Usuário não encontrado' });
    if (u[0].perfil === 'coordenador')
      return res.status(403).json({ success: false, error: 'Não é possível desativar o coordenador' });

    const novoStatus = ativo ? 'ativo' : 'suspenso';
    await pool.query('UPDATE usuarios SET status_conta=? WHERE id=?', [novoStatus, req.params.id]);
    res.json({ success: true, message: `Conta ${novoStatus}.` });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
};

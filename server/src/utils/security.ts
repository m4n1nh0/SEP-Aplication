import pool from '../db/connection';

type Evento =
  | 'login_ok' | 'login_falhou' | 'logout' | 'senha_alterada'
  | 'email_verificado' | 'conta_bloqueada' | 'conta_desbloqueada'
  | 'totp_ativado' | 'totp_desativado' | 'sessao_revogada'
  | 'cadastro' | 'tentativa_suspeita' | 'reset_senha'
  | 'criar_usuario_interno';

export const logSeguranca = async (
  evento: Evento,
  opts: { usuario_id?: number; ip?: string; user_agent?: string; detalhe?: string }
) => {
  try {
    await pool.query(
      'INSERT INTO logs_seguranca (usuario_id,evento,ip,user_agent,detalhe) VALUES (?,?,?,?,?)',
      [opts.usuario_id || null, evento, opts.ip || null, opts.user_agent || null, opts.detalhe || null]
    );
  } catch {
    // Não deixa falha de log derrubar a requisição
  }
};

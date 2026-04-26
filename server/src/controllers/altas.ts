import { Request, Response } from 'express';
import pool from '../db/connection';

// ── Solicitar alta (estagiário inicia) ────────────────────
export const solicitarAlta = async (req: Request, res: Response) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { paciente_id } = req.params;
    const { motivo_alta, resumo_caso, recomendacoes } = req.body;

    if (!motivo_alta || !resumo_caso) {
      return res.status(400).json({ success: false, error: 'motivo_alta e resumo_caso são obrigatórios' });
    }

    const [est]: any = await conn.query(
      'SELECT id FROM estagiarios WHERE usuario_id=?', [req.user!.id]);
    if (!est.length)
      return res.status(403).json({ success: false, error: 'Usuário não é estagiário' });

    // Verifica se paciente está em atendimento
    const [pac]: any = await conn.query(
      'SELECT status FROM pacientes WHERE id=?', [paciente_id]);
    if (!pac.length)
      return res.status(404).json({ success: false, error: 'Paciente não encontrado' });
    if (pac[0].status !== 'em_atendimento')
      return res.status(409).json({ success: false, error: 'Paciente não está em atendimento ativo' });

    // Conta sessões realizadas
    const [sessoes]: any = await conn.query(
      `SELECT COUNT(*) AS total FROM agendamentos
       WHERE paciente_id=? AND estagiario_id=? AND status='realizado'`,
      [paciente_id, est[0].id]
    );

    // Verifica se já tem alta pendente
    const [altaExist]: any = await conn.query(
      "SELECT id FROM altas_clinicas WHERE paciente_id=? AND status_aprovacao='pendente'",
      [paciente_id]
    );
    if (altaExist.length)
      return res.status(409).json({ success: false, error: 'Já existe solicitação de alta pendente para este paciente' });

    const [r]: any = await conn.query(
      `INSERT INTO altas_clinicas
       (paciente_id,estagiario_id,total_sessoes,motivo_alta,resumo_caso,recomendacoes,status_aprovacao)
       VALUES (?,?,?,?,?,?,'pendente')`,
      [paciente_id, est[0].id, sessoes[0].total, motivo_alta, resumo_caso, recomendacoes || null]
    );

    await conn.commit();
    res.status(201).json({
      success: true,
      id: r.insertId,
      message: 'Solicitação de alta enviada para aprovação do supervisor.',
    });
  } catch (e: any) {
    await conn.rollback();
    res.status(500).json({ success: false, error: e.message });
  } finally { conn.release(); }
};

// ── Supervisor aprova ou rejeita alta ─────────────────────
export const avaliarAlta = async (req: Request, res: Response) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { alta_id } = req.params;
    const { decisao, obs_supervisor } = req.body; // decisao: 'aprovada' | 'rejeitada'

    if (!['aprovada', 'rejeitada'].includes(decisao))
      return res.status(400).json({ success: false, error: 'decisao deve ser "aprovada" ou "rejeitada"' });

    const [alta]: any = await conn.query(
      "SELECT * FROM altas_clinicas WHERE id=? AND status_aprovacao='pendente'", [alta_id]);
    if (!alta.length)
      return res.status(404).json({ success: false, error: 'Alta não encontrada ou já processada' });

    await conn.query(
      `UPDATE altas_clinicas
       SET status_aprovacao=?, supervisor_id=?, obs_supervisor=?, atualizado_em=NOW()
       WHERE id=?`,
      [decisao, req.user!.id, obs_supervisor || null, alta_id]
    );

    if (decisao === 'aprovada') {
      // Muda status do paciente para 'alta'
      await conn.query(
        "UPDATE pacientes SET status='alta',estagiario_id=NULL,atualizado_em=NOW() WHERE id=?",
        [alta[0].paciente_id]
      );
      // Encerra vínculo
      await conn.query(
        `UPDATE vinculos_estagiario_paciente
         SET ativo=0, data_fim=NOW(), motivo_transferencia='Alta clínica aprovada'
         WHERE paciente_id=? AND ativo=1`,
        [alta[0].paciente_id]
      );
      // Histórico de status
      await conn.query(
        `INSERT INTO historico_status (paciente_id,status_anterior,status_novo,usuario_id,canal,observacao)
         VALUES (?,'em_atendimento','alta',?,'supervisor',?)`,
        [alta[0].paciente_id, req.user!.id, `Alta clínica aprovada. ${obs_supervisor || ''}`]
      );
    }

    await conn.commit();
    res.json({
      success: true,
      message: decisao === 'aprovada'
        ? 'Alta aprovada. Paciente encerrado com sucesso. Vínculos removidos.'
        : 'Alta rejeitada. Atendimento continua.',
    });
  } catch (e: any) {
    await conn.rollback();
    res.status(500).json({ success: false, error: e.message });
  } finally { conn.release(); }
};

// ── Listar altas pendentes (supervisor) ───────────────────
export const altasPendentes = async (_req: Request, res: Response) => {
  try {
    const [rows] = await pool.query(`
      SELECT a.*, up.nome AS paciente_nome, ue.nome AS estagiario_nome, e.matricula
      FROM altas_clinicas a
      JOIN pacientes p ON a.paciente_id = p.id
      JOIN usuarios up ON p.usuario_id = up.id
      JOIN estagiarios e ON a.estagiario_id = e.id
      JOIN usuarios ue ON e.usuario_id = ue.id
      WHERE a.status_aprovacao = 'pendente'
      ORDER BY a.criado_em ASC`);
    res.json({ success: true, data: rows });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
};

// ── Detalhar alta ─────────────────────────────────────────
export const detalharAlta = async (req: Request, res: Response) => {
  try {
    const [rows]: any = await pool.query(`
      SELECT a.*, up.nome AS paciente_nome, ue.nome AS estagiario_nome,
             e.matricula, us.nome AS supervisor_nome
      FROM altas_clinicas a
      JOIN pacientes p ON a.paciente_id = p.id
      JOIN usuarios up ON p.usuario_id = up.id
      JOIN estagiarios e ON a.estagiario_id = e.id
      JOIN usuarios ue ON e.usuario_id = ue.id
      LEFT JOIN usuarios us ON a.supervisor_id = us.id
      WHERE a.paciente_id = ?
      ORDER BY a.criado_em DESC LIMIT 1`, [req.params.paciente_id]);
    res.json({ success: true, data: rows[0] || null });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
};

import { Request, Response } from 'express';
import pool from '../db/connection';
import {
  uploadToS3, getPresignedUrl, deleteFromS3,
  isMimeAllowed, MAX_FILE_SIZE
} from '../utils/s3';

// ── Listar prontuários do paciente ────────────────────────
// Estagiário vê só seus pacientes (middleware checkVinculo já verificou)
export const listarProntuariosPaciente = async (req: Request, res: Response) => {
  try {
    const { paciente_id } = req.params;
    const user = req.user!;
    // Supervisor: só vê prontuários de pacientes dos seus estagiários
    if (user.perfil === 'supervisor') {
      const [acesso]: any = await pool.query(
        `SELECT 1 FROM vinculos_estagiario_paciente v
         JOIN vinculos_supervisor_estagiario vs ON vs.estagiario_id=v.estagiario_id
         WHERE v.paciente_id=? AND vs.supervisor_id=? AND vs.ativo=1 LIMIT 1`,
        [paciente_id, user.id]
      );
      if (!acesso.length)
        return res.status(403).json({ success: false, error: 'Acesso negado: paciente não pertence a nenhum dos seus estagiários.' });
    }
    const [rows] = await pool.query(`
      SELECT p.*, ue.nome AS estagiario_nome, a.data_hora_inicio,
             u.nome AS paciente_nome
      FROM prontuarios p
      JOIN agendamentos a ON p.agendamento_id = a.id
      JOIN estagiarios e ON p.estagiario_id = e.id
      JOIN usuarios ue ON e.usuario_id = ue.id
      JOIN pacientes pac ON p.paciente_id = pac.id
      JOIN usuarios u ON pac.usuario_id = u.id
      WHERE p.paciente_id = ?
      ORDER BY p.data_sessao DESC`, [paciente_id]);
    res.json({ success: true, data: rows });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
};

// ── Detalhar prontuário ───────────────────────────────────
export const detalharProntuario = async (req: Request, res: Response) => {
  try {
    const [rows]: any = await pool.query(`
      SELECT p.*, ue.nome AS estagiario_nome, a.data_hora_inicio
      FROM prontuarios p
      JOIN agendamentos a ON p.agendamento_id = a.id
      JOIN estagiarios e ON p.estagiario_id = e.id
      JOIN usuarios ue ON e.usuario_id = ue.id
      WHERE p.id = ?`, [req.params.prontuario_id]);
    if (!rows.length) return res.status(404).json({ success: false, error: 'Não encontrado' });

    // Busca documentos vinculados
    const [docs] = await pool.query(
      `SELECT id, nome_original, tipo, mime_type, tamanho_bytes, descricao, criado_em
       FROM documentos WHERE prontuario_id = ? AND status = 'ativo'`,
      [req.params.prontuario_id]
    );

    res.json({ success: true, data: { ...rows[0], documentos: docs } });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
};

// ── Criar/atualizar prontuário ────────────────────────────
export const salvarProntuario = async (req: Request, res: Response) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const {
      agendamento_id, paciente_id, sessao_numero,
      queixa_principal, descricao_sessao, intervencoes,
      evolucao, plano_proxima,
    } = req.body;

    const user = req.user!;

    // Busca estagiario_id do usuário logado
    const [est]: any = await conn.query(
      'SELECT id FROM estagiarios WHERE usuario_id = ?', [user.id]);
    if (!est.length) return res.status(403).json({ success: false, error: 'Usuário não é estagiário' });
    const estagiario_id = est[0].id;

    // Verifica se já existe prontuário para este agendamento
    const [exist]: any = await conn.query(
      'SELECT id FROM prontuarios WHERE agendamento_id = ?', [agendamento_id]);

    let prontuarioId: number;
    if (exist.length) {
      await conn.query(
        `UPDATE prontuarios SET queixa_principal=?,descricao_sessao=?,intervencoes=?,
         evolucao=?,plano_proxima=?,atualizado_em=NOW() WHERE id=?`,
        [queixa_principal, descricao_sessao, intervencoes, evolucao, plano_proxima, exist[0].id]
      );
      prontuarioId = exist[0].id;
    } else {
      const [r]: any = await conn.query(
        `INSERT INTO prontuarios
         (agendamento_id,paciente_id,estagiario_id,sessao_numero,data_sessao,
          queixa_principal,descricao_sessao,intervencoes,evolucao,plano_proxima)
         VALUES (?,?,?,?,CURDATE(),?,?,?,?,?)`,
        [agendamento_id, paciente_id, estagiario_id, sessao_numero,
         queixa_principal, descricao_sessao, intervencoes, evolucao, plano_proxima]
      );
      prontuarioId = r.insertId;

      // Na primeira sessão: garante vínculo ativo
      const [vExist]: any = await conn.query(
        'SELECT id FROM vinculos_estagiario_paciente WHERE paciente_id=? AND estagiario_id=? AND ativo=1',
        [paciente_id, estagiario_id]
      );
      if (!vExist.length) {
        await conn.query(
          'INSERT INTO vinculos_estagiario_paciente (paciente_id,estagiario_id,ativo) VALUES (?,?,1)',
          [paciente_id, estagiario_id]
        );
      }

      // 1ª sessão → status em_atendimento
      const [pat]: any = await conn.query('SELECT status FROM pacientes WHERE id=?', [paciente_id]);
      if (pat[0]?.status !== 'em_atendimento') {
        await conn.query(
          "UPDATE pacientes SET status='em_atendimento',atualizado_em=NOW() WHERE id=?", [paciente_id]);
        await conn.query(
          `INSERT INTO historico_status (paciente_id,status_anterior,status_novo,usuario_id,canal)
           VALUES (?,?,?,?,'estagiario')`,
          [paciente_id, pat[0]?.status, 'em_atendimento', user.id]
        );
      }
    }

    // Auditoria
    await conn.query(
      `INSERT INTO audit_prontuarios (prontuario_id,paciente_id,usuario_id,acao,ip,user_agent)
       VALUES (?,?,?,?,?,?)`,
      [prontuarioId, paciente_id, user.id,
       exist.length ? 'editou' : 'criou',
       req.clientIp || '', req.headers['user-agent'] || '']
    );

    await conn.commit();
    res.status(exist.length ? 200 : 201).json({ success: true, id: prontuarioId });
  } catch (e: any) {
    await conn.rollback();
    res.status(500).json({ success: false, error: e.message });
  } finally { conn.release(); }
};

// ── Upload de arquivo para S3 ─────────────────────────────
export const uploadDocumento = async (req: Request, res: Response) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    if (!req.file) return res.status(400).json({ success: false, error: 'Nenhum arquivo enviado' });
    if (!isMimeAllowed(req.file.mimetype))
      return res.status(400).json({ success: false, error: `Tipo de arquivo não permitido: ${req.file.mimetype}` });
    if (req.file.size > MAX_FILE_SIZE)
      return res.status(400).json({ success: false, error: 'Arquivo maior que 20 MB' });

    const { paciente_id, prontuario_id, tipo = 'outro', descricao } = req.body;
    const user = req.user!;

    // Determina subfolder pelo tipo
    const subfolderMap: Record<string,string> = {
      prontuario: 'prontuarios', laudo: 'laudos', receita: 'receitas',
      exame: 'exames', consentimento: 'consentimentos', outro: 'documentos',
    };
    const subfolder = subfolderMap[tipo] || 'documentos';

    // Upload para S3
    const { key, bucket, tamanho } = await uploadToS3({
      buffer:       req.file.buffer,
      mimeType:     req.file.mimetype,
      pacienteId:   Number(paciente_id),
      nomeOriginal: req.file.originalname,
      subfolder,
      uploadedBy:   user.id,
    });

    // Busca estagiario_id se for estagiário
    let estId: number | null = null;
    if (user.perfil === 'estagiario') {
      const [e]: any = await conn.query('SELECT id FROM estagiarios WHERE usuario_id=?', [user.id]);
      estId = e[0]?.id ?? null;
    }

    // Salva metadados no banco
    const [r]: any = await conn.query(
      `INSERT INTO documentos
       (paciente_id,estagiario_id,prontuario_id,tipo,nome_original,s3_key,s3_bucket,mime_type,tamanho_bytes,descricao,enviado_por)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [paciente_id, estId, prontuario_id || null, tipo,
       req.file.originalname, key, bucket,
       req.file.mimetype, tamanho, descricao || null, user.id]
    );

    // Auditoria
    await conn.query(
      `INSERT INTO audit_prontuarios (prontuario_id,paciente_id,usuario_id,acao,ip,user_agent,detalhes)
       VALUES (?,?,?,'criou',?,?,?)`,
      [prontuario_id || null, paciente_id, user.id,
       req.clientIp || '', req.headers['user-agent'] || '',
       `Upload: ${req.file.originalname}`]
    );

    await conn.commit();
    res.status(201).json({
      success: true,
      id: r.insertId,
      nome: req.file.originalname,
      tipo,
      tamanho,
      message: 'Arquivo enviado com segurança para o armazenamento em nuvem.',
    });
  } catch (e: any) {
    await conn.rollback();
    res.status(500).json({ success: false, error: e.message });
  } finally { conn.release(); }
};

// ── Gerar URL presigned para download ─────────────────────
export const downloadDocumento = async (req: Request, res: Response) => {
  try {
    const [docs]: any = await pool.query(
      `SELECT d.*, pac.id AS pac_id FROM documentos d
       JOIN pacientes pac ON d.paciente_id = pac.id
       WHERE d.id = ? AND d.status = 'ativo'`,
      [req.params.doc_id]
    );
    if (!docs.length) return res.status(404).json({ success: false, error: 'Documento não encontrado' });
    const doc = docs[0];

    // Estagiário: verifica vínculo
    if (req.user!.perfil === 'estagiario') {
      const [est]: any = await pool.query('SELECT id FROM estagiarios WHERE usuario_id=?', [req.user!.id]);
      const [vinc]: any = await pool.query(
        'SELECT id FROM vinculos_estagiario_paciente WHERE paciente_id=? AND estagiario_id=? AND ativo=1',
        [doc.paciente_id, est[0]?.id]
      );
      if (!vinc.length) return res.status(403).json({ success: false, error: 'Sem vínculo ativo com este paciente' });
    }

    // Gera URL presigned (15 min)
    const url = await getPresignedUrl(doc.s3_key, doc.nome_original);

    // Auditoria de download
    pool.query(
      `INSERT INTO audit_prontuarios (prontuario_id,paciente_id,usuario_id,acao,ip,user_agent,detalhes)
       VALUES (?,?,?,'baixou_arquivo',?,?,?)`,
      [doc.prontuario_id, doc.paciente_id, req.user!.id,
       req.clientIp || '', req.headers['user-agent'] || '',
       `Download: ${doc.nome_original}`]
    ).catch(() => {});

    res.json({ success: true, url, expira_em: new Date(Date.now() + 900000).toISOString() });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
};

// ── Listar documentos de um paciente ─────────────────────
export const listarDocumentosPaciente = async (req: Request, res: Response) => {
  try {
    const [docs] = await pool.query(
      `SELECT d.id, d.tipo, d.nome_original, d.mime_type, d.tamanho_bytes,
              d.descricao, d.criado_em, u.nome AS enviado_por_nome
       FROM documentos d
       JOIN usuarios u ON d.enviado_por = u.id
       WHERE d.paciente_id = ? AND d.status = 'ativo'
       ORDER BY d.criado_em DESC`,
      [req.params.paciente_id]
    );
    res.json({ success: true, data: docs });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
};

// ── Auditoria de um prontuário/paciente ───────────────────
export const auditoriaProntuario = async (req: Request, res: Response) => {
  try {
    const { paciente_id } = req.params;
    const [rows] = await pool.query(`
      SELECT a.*, u.nome AS usuario_nome, u.perfil AS usuario_perfil
      FROM audit_prontuarios a
      JOIN usuarios u ON a.usuario_id = u.id
      WHERE a.paciente_id = ?
      ORDER BY a.criado_em DESC LIMIT 200`, [paciente_id]);
    res.json({ success: true, data: rows });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
};

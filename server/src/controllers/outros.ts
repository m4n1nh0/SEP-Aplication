// ── ESTAGIÁRIO ────────────────────────────────────────────
import { Request, Response } from 'express';
import pool from '../db/connection';
import logger from '../utils/logger';

export const meusSlotsGet = async (req: Request, res: Response) => {
  const [r] = await pool.query(`SELECT * FROM estagiario_slots WHERE estagiario_id=? ORDER BY FIELD(dia_semana,'seg','ter','qua','qui','sex','sab'),hora_inicio`,[req.user!.ref_id]).catch(e=>{throw e});
  res.json({ success:true, data:r });
};

export const criarSlot = async (req: Request, res: Response) => {
  try {
    const { dia_semana, hora_inicio, hora_fim } = req.body;
    if (!dia_semana||!hora_inicio||!hora_fim) return res.status(400).json({ success:false, error:'Preencha todos os campos' });
    const [ov]: any = await pool.query(`SELECT id FROM estagiario_slots WHERE estagiario_id=? AND dia_semana=? AND status!='rejeitado' AND NOT(hora_fim<=? OR hora_inicio>=?)`,[req.user!.ref_id,dia_semana,hora_inicio,hora_fim]);
    if (ov.length) return res.status(409).json({ success:false, error:'Conflito com horário existente neste dia' });
    const [r]: any = await pool.query('INSERT INTO estagiario_slots (estagiario_id,dia_semana,hora_inicio,hora_fim) VALUES (?,?,?,?)',[req.user!.ref_id,dia_semana,hora_inicio,hora_fim]);
    res.status(201).json({ success:true, id:r.insertId, message:'Enviado para aprovação do administrador' });
  } catch (e: any) { res.status(500).json({ success:false, error:e.message }); }
};

export const deletarSlot = async (req: Request, res: Response) => {
  try {
    const [ags]: any = await pool.query(`SELECT id FROM agendamentos WHERE slot_id=? AND status NOT IN('cancelado_admin','cancelado_paciente','faltou') AND data_hora_inicio>NOW()`,[req.params.id]);
    if (ags.length) return res.status(409).json({ success:false, error:'Existem agendamentos futuros neste horário' });
    await pool.query('DELETE FROM estagiario_slots WHERE id=? AND estagiario_id=?',[req.params.id,req.user!.ref_id]);
    res.json({ success:true });
  } catch (e: any) { res.status(500).json({ success:false, error:e.message }); }
};

export const minhaAgenda = async (req: Request, res: Response) => {
  try {
    const { data_inicio, data_fim } = req.query;
    let sql = `SELECT a.*,up.nome AS paciente_nome,p.telefone AS paciente_tel,p.urgencia FROM agendamentos a JOIN pacientes p ON a.paciente_id=p.id JOIN usuarios up ON p.usuario_id=up.id WHERE a.estagiario_id=? AND a.status NOT IN('cancelado_admin','cancelado_paciente')`;
    const params: any[]=[req.user!.ref_id];
    if (data_inicio){sql+=' AND a.data_hora_inicio>=?';params.push(data_inicio);}
    if (data_fim)   {sql+=' AND a.data_hora_inicio<=?';params.push(data_fim);}
    sql+=' ORDER BY a.data_hora_inicio ASC';
    const [r]: any = await pool.query(sql,params);
    logger.info('Agenda do estagiario listada', {
      estagiario_id: req.user!.ref_id,
      filtros: { data_inicio, data_fim },
      total: r.length,
      primeiro_agendamento: r[0] ? {
        id: r[0].id,
        inicio: r[0].data_hora_inicio,
        fim: r[0].data_hora_fim,
        status: r[0].status,
      } : null,
    });
    res.json({ success:true, data:r });
  } catch (e: any) { res.status(500).json({ success:false, error:e.message }); }
};

export const meusPacientes = async (req: Request, res: Response) => {
  try {
    const [r]=await pool.query(`SELECT p.id,up.nome,p.telefone,p.email,p.status,p.urgencia,p.motivo_busca,p.timestamp_cadastro,COUNT(a.id) AS total_sessoes,MAX(a.data_hora_inicio) AS ultima_sessao FROM pacientes p JOIN usuarios up ON p.usuario_id=up.id LEFT JOIN agendamentos a ON p.id=a.paciente_id AND a.status='realizado' WHERE p.estagiario_id=? AND p.status NOT IN('cancelado','desistencia') GROUP BY p.id ORDER BY up.nome`,[req.user!.ref_id]);
    res.json({ success:true, data:r });
  } catch (e: any) { res.status(500).json({ success:false, error:e.message }); }
};

export const listarProntuarios = async (req: Request, res: Response) => {
  try {
    const [r]=await pool.query(`SELECT pr.*,up.nome AS paciente_nome FROM prontuarios pr JOIN pacientes p ON pr.paciente_id=p.id JOIN usuarios up ON p.usuario_id=up.id WHERE pr.estagiario_id=? ORDER BY pr.data_sessao DESC`,[req.user!.ref_id]);
    res.json({ success:true, data:r });
  } catch (e: any) { res.status(500).json({ success:false, error:e.message }); }
};

export const criarProntuario = async (req: Request, res: Response) => {
  try {
    const { agendamento_id,queixa_principal,descricao_sessao,intervencoes,evolucao,plano_proxima } = req.body;
    const [ag]: any = await pool.query('SELECT a.*,p.id AS pid FROM agendamentos a JOIN pacientes p ON a.paciente_id=p.id WHERE a.id=? AND a.estagiario_id=?',[agendamento_id,req.user!.ref_id]);
    if (!ag.length) return res.status(403).json({ success:false, error:'Agendamento não encontrado' });
    const [r]: any = await pool.query(`INSERT INTO prontuarios (agendamento_id,paciente_id,estagiario_id,sessao_numero,data_sessao,queixa_principal,descricao_sessao,intervencoes,evolucao,plano_proxima) VALUES (?,?,?,?,?,?,?,?,?,?)`,[agendamento_id,ag[0].pid,req.user!.ref_id,ag[0].sessao_numero,ag[0].data_hora_inicio,queixa_principal||null,descricao_sessao||null,intervencoes||null,evolucao||null,plano_proxima||null]);
    await pool.query("UPDATE agendamentos SET status='realizado',atualizado_em=NOW() WHERE id=?",[agendamento_id]);
    if (ag[0].sessao_numero===1) await pool.query("UPDATE pacientes SET status='em_atendimento',atualizado_em=NOW() WHERE id=?",[ag[0].pid]);
    res.status(201).json({ success:true, id:r.insertId });
  } catch (e: any) { res.status(500).json({ success:false, error:e.message }); }
};

// ── PORTAL DO PACIENTE ────────────────────────────────────
export const portalDados = async (req: Request, res: Response) => {
  try {
    const [p]: any = await pool.query(`SELECT p.*,ue.nome AS estagiario_nome,CASE WHEN p.status IN('aguardando','em_contato') THEN (SELECT COUNT(*)+1 FROM pacientes p2 WHERE p2.status IN('aguardando','em_contato') AND (FIELD(p2.urgencia,'muito_urgente','urgente','pouco_urgente','sem_urgencia')<FIELD(p.urgencia,'muito_urgente','urgente','pouco_urgente','sem_urgencia') OR (FIELD(p2.urgencia,'muito_urgente','urgente','pouco_urgente','sem_urgencia')=FIELD(p.urgencia,'muito_urgente','urgente','pouco_urgente','sem_urgencia') AND p2.timestamp_cadastro<p.timestamp_cadastro))) ELSE NULL END AS posicao_fila,TIMESTAMPDIFF(DAY,p.timestamp_cadastro,NOW()) AS dias_espera FROM pacientes p LEFT JOIN estagiarios e ON p.estagiario_id=e.id LEFT JOIN usuarios ue ON e.usuario_id=ue.id WHERE p.usuario_id=?`,[req.user!.id]);
    if (!p.length) return res.status(404).json({ success:false, error:'Não encontrado' });
    const [ags]: any = await pool.query(`SELECT a.id,a.data_hora_inicio,a.data_hora_fim,a.status,a.modalidade,a.sala,a.link_online,a.sessao_numero,ue.nome AS estagiario_nome FROM agendamentos a JOIN estagiarios e ON a.estagiario_id=e.id JOIN usuarios ue ON e.usuario_id=ue.id WHERE a.paciente_id=? ORDER BY a.data_hora_inicio DESC`,[p[0].id]);
    logger.info('Agenda do portal carregada', {
      paciente_id: p[0].id,
      total_agendamentos: ags.length,
      primeiro_agendamento: ags[0] ? {
        id: ags[0].id,
        inicio: ags[0].data_hora_inicio,
        fim: ags[0].data_hora_fim,
        status: ags[0].status,
      } : null,
    });
    const [docs]: any = await pool.query('SELECT id,tipo,nome_original,status,descricao,criado_em FROM documentos WHERE paciente_id=? AND status=\'ativo\' ORDER BY criado_em DESC',[p[0].id]);
    res.json({ success:true, data:{ ...p[0], agendamentos:ags, documentos:docs } });
  } catch (e: any) { res.status(500).json({ success:false, error:e.message }); }
};

export const uploadDocumento = async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ success:false, error:'Arquivo não enviado' });
    const { tipo } = req.body;
    const [p]: any = await pool.query('SELECT id FROM pacientes WHERE usuario_id=?',[req.user!.id]);
    if (!p.length) return res.status(404).json({ success:false, error:'Paciente não encontrado' });
    // Upload local (fallback sem S3 configurado)
    const s3Key = `uploads/${Date.now()}_${req.file.originalname}`
    const [r]: any = await pool.query(
      'INSERT INTO documentos (paciente_id,tipo,nome_original,s3_key,s3_bucket,mime_type,tamanho_bytes,enviado_por) VALUES (?,?,?,?,?,?,?,?)',
      [p[0].id, tipo||'outro', req.file.originalname, s3Key, 'local', req.file.mimetype, req.file.size, req.user!.id]
    );
    res.status(201).json({ success:true, id:r.insertId });
  } catch (e: any) { res.status(500).json({ success:false, error:e.message }); }
};

export const atualizarDisponibilidade = async (req: Request, res: Response) => {
  try {
    const [p]: any = await pool.query('SELECT id FROM pacientes WHERE usuario_id=?',[req.user!.id]);
    if (!p.length) return res.status(404).json({ success:false, error:'Não encontrado' });
    const body = req.body ?? {};
    const disponibilidade = Object.prototype.hasOwnProperty.call(body, 'disponibilidade')
      ? body.disponibilidade
      : body;
    if (!disponibilidade || typeof disponibilidade !== 'object' || Array.isArray(disponibilidade)) {
      return res.status(400).json({ success:false, error:'Disponibilidade invalida' });
    }
    await pool.query('UPDATE pacientes SET disponibilidade=?,atualizado_em=NOW() WHERE id=?',[JSON.stringify(disponibilidade),p[0].id]);
    res.json({ success:true, disponibilidade });
  } catch (e: any) { res.status(500).json({ success:false, error:e.message }); }
};

export const cancelarAgendamento = async (req: Request, res: Response) => {
  try {
    const [p]: any = await pool.query('SELECT id FROM pacientes WHERE usuario_id=?',[req.user!.id]);
    if (!p.length) return res.status(404).json({ success:false, error:'Não encontrado' });
    const [ag]: any = await pool.query("SELECT id FROM agendamentos WHERE id=? AND paciente_id=? AND status IN('confirmado','pendente')",[req.params.id,p[0].id]);
    if (!ag.length) return res.status(404).json({ success:false, error:'Agendamento não encontrado' });
    const motivo = req.body.motivo||'—';
    await pool.query("UPDATE agendamentos SET status='cancelado_paciente',notas_admin=CONCAT(IFNULL(notas_admin,''),' | Cancelado pelo paciente: ',?),atualizado_em=NOW() WHERE id=?",[motivo,req.params.id]);
    await pool.query("UPDATE pacientes SET status='aguardando',estagiario_id=NULL,atualizado_em=NOW() WHERE id=?",[p[0].id]);
    await pool.query('INSERT INTO historico_status (paciente_id,status_anterior,status_novo,usuario_id,canal,observacao) VALUES (?,?,?,?,?,?)',[p[0].id,'agendado','aguardando',req.user!.id,'paciente',motivo]);
    res.json({ success:true });
  } catch (e: any) { res.status(500).json({ success:false, error:e.message }); }
};

export const confirmarPresenca = async (req: Request, res: Response) => {
  try {
    const [p]: any = await pool.query('SELECT id FROM pacientes WHERE usuario_id=?',[req.user!.id]);
    if (!p.length) return res.status(404).json({ success:false, error:'Não encontrado' });
    await pool.query("UPDATE agendamentos SET status='confirmado',atualizado_em=NOW() WHERE id=? AND paciente_id=?",[req.params.id,p[0].id]);
    logger.info('Consulta confirmada pelo paciente', {
      agendamento_id: req.params.id,
      paciente_id: p[0].id,
      usuario_id: req.user?.id,
    });
    res.json({ success:true });
  } catch (e: any) { res.status(500).json({ success:false, error:e.message }); }
};

export const sairFila = async (req: Request, res: Response) => {
  try {
    const [p]: any = await pool.query('SELECT id,status FROM pacientes WHERE usuario_id=?',[req.user!.id]);
    if (!p.length) return res.status(404).json({ success:false, error:'Não encontrado' });
    await pool.query("UPDATE pacientes SET status='desistencia',atualizado_em=NOW() WHERE id=?",[p[0].id]);
    await pool.query('INSERT INTO historico_status (paciente_id,status_anterior,status_novo,usuario_id,canal) VALUES (?,?,?,?,?)',[p[0].id,p[0].status,'desistencia',req.user!.id,'paciente']);
    res.json({ success:true });
  } catch (e: any) { res.status(500).json({ success:false, error:e.message }); }
};

import { Request, Response } from 'express';
import type { PoolConnection } from 'mysql2/promise';
import pool from '../db/connection';
import logger from '../utils/logger';

const parseSalasDisponiveis = (valor?: string | null): string[] =>
    String(valor || '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

const supervisorPodeGerenciarAgendamento = async (
    conn: PoolConnection,
    req: Request,
    estagiarioId: number,
) => {
    if (req.user?.perfil !== 'supervisor') return true;
    const [permitido]: any = await conn.query(`
        SELECT 1 FROM vinculos_supervisor_estagiario
        WHERE supervisor_id=? AND estagiario_id=? AND ativo=1
        LIMIT 1`, [req.user.id, estagiarioId]);
    return Boolean(permitido.length);
};
// â”€â”€ Dashboard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const dashboard = async (req: Request, res: Response) => {
    try {
        // â”€â”€ Contagens por status â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        const isSupervisor = req.user!.perfil === 'supervisor';
        // Supervisor filtra pelos pacientes dos seus estagiÃ¡rios
        const supFiltro = isSupervisor
            ? `AND EXISTS (
          SELECT 1 FROM vinculos_estagiario_paciente v
          JOIN vinculos_supervisor_estagiario vs ON vs.estagiario_id=v.estagiario_id
          WHERE v.paciente_id=p.id AND vs.supervisor_id=${req.user!.id} AND vs.ativo=1
        )`
            : '';
        const [t]: any = await pool.query(`
      SELECT
        COUNT(*) AS totalPacientes,
        SUM(status='triagem_pendente')  AS triagemPendente,
        SUM(status='aguardando')        AS aguardando,
        SUM(status='em_contato')        AS emContato,
        SUM(status='agendado')          AS agendados,
        SUM(status='em_atendimento')    AS emAtendimento,
        SUM(status='alta')              AS totalAltas,
        SUM(status IN('desistencia','cancelado')) AS totalDesistencias,
        SUM(urgencia='muito_urgente'    AND status NOT IN('alta','cancelado','desistencia')) AS muitoUrgentes,
        SUM(risco_suicidio=1            AND status NOT IN('alta','cancelado','desistencia')) AS comRisco
      FROM pacientes p
      WHERE 1=1 ${supFiltro}`);
        // â”€â”€ Consultas de hoje â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        const [h]: any = await pool.query(`
      SELECT COUNT(*) AS hoje FROM agendamentos
      WHERE DATE(data_hora_inicio)=CURDATE()
        AND status NOT IN('cancelado_admin','cancelado_paciente')`);
        // â”€â”€ PendÃªncias â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        const [slots]: any = await pool.query(`SELECT COUNT(*) AS pendentes FROM estagiario_slots WHERE status='pendente'`);
        const [altas]: any = await pool.query(`SELECT COUNT(*) AS pendentes FROM altas_clinicas WHERE status_aprovacao='pendente'`);
        // â”€â”€ KPI 1: Tempo mÃ©dio de espera (cadastro â†’ 1Âª sessÃ£o realizada) â”€â”€
        // Calcula em dias para todos os pacientes que jÃ¡ tiveram ao menos 1 sessÃ£o
        const [espera]: any = await pool.query(`
      SELECT
        ROUND(AVG(dias), 1) AS media_dias_espera,
        MIN(dias)           AS min_dias_espera,
        MAX(dias)           AS max_dias_espera
      FROM (
        SELECT
          TIMESTAMPDIFF(DAY, p.timestamp_cadastro, MIN(a.data_hora_inicio)) AS dias
        FROM pacientes p
        JOIN agendamentos a ON a.paciente_id=p.id AND a.sessao_numero=1 AND a.status='realizado'
        WHERE 1=1 ${supFiltro}
        GROUP BY p.id
      ) sub`);
        // â”€â”€ KPI 2: Taxa de comparecimento (Ãºltimos 30 dias) â”€â”€
        // SessÃµes realizadas / (agendadas - canceladas) Ã— 100
        const [compar]: any = await pool.query(`
      SELECT
        COUNT(*)                                        AS total_agendados,
        SUM(status = 'realizado')                       AS realizados,
        SUM(status = 'faltou')                          AS faltou,
        SUM(status IN('cancelado_paciente','cancelado_admin')) AS cancelados,
        ROUND(
          100.0 * SUM(status = 'realizado') /
          NULLIF(SUM(status NOT IN('cancelado_paciente','cancelado_admin')), 0)
        , 1) AS taxa_comparecimento
      FROM agendamentos
      WHERE data_hora_inicio >= DATE_SUB(NOW(), INTERVAL 30 DAY)`);
        // â”€â”€ KPI 3: Taxa de desistÃªncia (total histÃ³rico) â”€â”€â”€â”€â”€â”€
        // Pacientes que saÃ­ram da fila ou cancelaram / total que entraram
        const [desist]: any = await pool.query(`
      SELECT
        COUNT(*)                                             AS total_cadastros,
        SUM(status IN('desistencia','cancelado'))            AS total_desistencias,
        ROUND(
          100.0 * SUM(status IN('desistencia','cancelado')) /
          NULLIF(COUNT(*), 0)
        , 1)                                                 AS taxa_desistencia
      FROM pacientes`);
        // â”€â”€ KPI 4: Altas no mÃªs corrente â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        const [altasMes]: any = await pool.query(`
      SELECT COUNT(*) AS altas_mes
      FROM altas_clinicas
      WHERE status_aprovacao = 'aprovada'
        AND YEAR(data_alta)  = YEAR(NOW())
        AND MONTH(data_alta) = MONTH(NOW())`);
        // â”€â”€ KPI 5: Carga mÃ©dia por estagiÃ¡rio â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        const [carga]: any = await pool.query(`
      SELECT
        COUNT(DISTINCT v.estagiario_id)                       AS estagiarios_ativos,
        COUNT(v.id)                                           AS vinculos_ativos,
        ROUND(COUNT(v.id) / NULLIF(COUNT(DISTINCT v.estagiario_id), 0), 1) AS media_pacientes_por_estagiario
      FROM vinculos_estagiario_paciente v
      WHERE v.ativo = 1`);
        // â”€â”€ KPI 6: EvoluÃ§Ã£o semanal (Ãºltimas 8 semanas) â”€â”€â”€â”€â”€â”€â”€
        const [evolucao]: any = await pool.query(`
      SELECT
        YEARWEEK(timestamp_cadastro, 1)   AS semana,
        MIN(DATE(timestamp_cadastro))     AS inicio_semana,
        COUNT(*)                           AS novos_cadastros,
        SUM(status IN('alta'))             AS altas
      FROM pacientes
      WHERE timestamp_cadastro >= DATE_SUB(NOW(), INTERVAL 8 WEEK)
      GROUP BY YEARWEEK(timestamp_cadastro, 1)
      ORDER BY semana ASC`);
        res.json({
            success: true,
            data: {
                // Contagens
                ...t[0],
                agendamentosHoje: h[0].hoje,
                slotsPendentes: slots[0].pendentes,
                altasPendentes: altas[0].pendentes,
                // KPIs
                kpi: {
                    tempoEspera: {
                        mediaDias: espera[0].media_dias_espera ?? null,
                        minDias: espera[0].min_dias_espera ?? null,
                        maxDias: espera[0].max_dias_espera ?? null,
                    },
                    comparecimento: {
                        taxa: compar[0].taxa_comparecimento ?? null,
                        realizados: compar[0].realizados,
                        faltou: compar[0].faltou,
                        cancelados: compar[0].cancelados,
                        totalPeriodo: compar[0].total_agendados,
                    },
                    desistencia: {
                        taxa: desist[0].taxa_desistencia ?? null,
                        total: desist[0].total_desistencias,
                        totalCadastros: desist[0].total_cadastros,
                    },
                    altasMes: altasMes[0].altas_mes,
                    cargaMedia: carga[0].media_pacientes_por_estagiario ?? null,
                    estagiarios: carga[0].estagiarios_ativos,
                    evolucaoSemanal: evolucao,
                },
            },
        });
    }
    catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
};
// â”€â”€ Triagem de pacientes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const listaPendentesTriagem = async (_req: Request, res: Response) => {
    try {
        const [rows]: any = await pool.query(`
      SELECT p.id,p.nome,p.cpf,p.telefone,p.email,p.urgencia,p.status,p.risco_suicidio,
             p.motivo_busca,p.tempo_sintomas,p.intensidade_sintomas,p.impacto_vida,
             p.ja_fez_terapia,p.uso_medicamento,p.medicamento_psiquiatra,
             p.historico_internacao,p.suporte_social,p.risco_desc,
             p.data_nascimento,p.genero,p.escolaridade,p.renda_familiar,
             p.timestamp_cadastro,
             TIMESTAMPDIFF(YEAR,p.data_nascimento,NOW()) AS idade,
             (SELECT COUNT(*) FROM documentos WHERE paciente_id=p.id AND status='ativo') AS total_docs,
             (SELECT COUNT(*) FROM documentos WHERE paciente_id=p.id AND status='ativo') AS docs_aprovados
      FROM pacientes p
      WHERE p.status='triagem_pendente'
      ORDER BY p.risco_suicidio DESC,
               FIELD(p.urgencia,'muito_urgente','urgente','pouco_urgente','sem_urgencia'),
               p.timestamp_cadastro ASC`);
        res.json({ success: true, data: rows });
    }
    catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
};
export const aprovarTriagem = async (req: Request, res: Response) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const { obs } = req.body;
        const [p]: any = await conn.query('SELECT status FROM pacientes WHERE id=?', [req.params.id]);
        if (!p.length)
            return res.status(404).json({ success: false, error: 'NÃ£o encontrado' });
        await conn.query('UPDATE pacientes SET status="aguardando",triagem_admin_id=?,triagem_obs=?,triagem_em=NOW(),atualizado_em=NOW() WHERE id=?', [req.user!.id, obs || 'Triagem aprovada', req.params.id]);
        await conn.query('INSERT INTO historico_status (paciente_id,status_anterior,status_novo,usuario_id,canal,observacao) VALUES (?,?,?,?,?,?)', [req.params.id, 'triagem_pendente', 'aguardando', req.user!.id, 'supervisor', obs || 'Triagem aprovada']);
        await conn.commit();
        res.json({ success: true });
    }
    catch (e: any) {
        await conn.rollback();
        res.status(500).json({ success: false, error: e.message });
    }
    finally {
        conn.release();
    }
};
export const rejeitarTriagem = async (req: Request, res: Response) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const { motivo } = req.body;
        if (!motivo)
            return res.status(400).json({ success: false, error: 'Informe o motivo da rejeiÃ§Ã£o' });
        await conn.query('UPDATE pacientes SET status="cancelado",triagem_admin_id=?,triagem_obs=?,triagem_em=NOW(),atualizado_em=NOW() WHERE id=?', [req.user!.id, motivo, req.params.id]);
        await conn.query('INSERT INTO historico_status (paciente_id,status_anterior,status_novo,usuario_id,canal,observacao) VALUES (?,?,?,?,?,?)', [req.params.id, 'triagem_pendente', 'cancelado', req.user!.id, 'supervisor', motivo]);
        await conn.commit();
        res.json({ success: true });
    }
    catch (e: any) {
        await conn.rollback();
        res.status(500).json({ success: false, error: e.message });
    }
    finally {
        conn.release();
    }
};
// â”€â”€ Documentos â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const listarDocumentos = async (req: Request, res: Response) => {
    try {
        const [rows]: any = await pool.query(`SELECT d.*,u.nome AS enviado_por_nome FROM documentos d LEFT JOIN usuarios u ON d.enviado_por=u.id WHERE d.paciente_id=? AND d.status='ativo' ORDER BY d.criado_em DESC`, [req.params.id]);
        res.json({ success: true, data: rows });
    }
    catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
};
export const revisarDocumento = async (req: Request, res: Response) => {
    try {
        const { status, obs_admin } = req.body;
        await pool.query('UPDATE documentos SET status=?,descricao=?,atualizado_em=NOW() WHERE id=?', [status, obs_admin || null, req.user!.id, req.params.id]);
        res.json({ success: true });
    }
    catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
};
// â”€â”€ Fila â€” mega query com estado completo â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const fila = async (_req: Request, res: Response) => {
    try {
        const [rows]: any = await pool.query(`
      SELECT
        p.id, p.nome, p.cpf, p.telefone, p.whatsapp, p.email,
        p.urgencia, p.status, p.risco_suicidio, p.motivo_busca,
        p.intensidade_sintomas, p.disponibilidade, p.timestamp_cadastro,

        TIMESTAMPDIFF(DAY, p.timestamp_cadastro, NOW()) AS dias_espera,

        ROW_NUMBER() OVER (
          ORDER BY p.risco_suicidio DESC,
            FIELD(p.urgencia,'muito_urgente','urgente','pouco_urgente','sem_urgencia'),
            p.timestamp_cadastro ASC
        ) AS posicao_fila,

        (SELECT COUNT(*) FROM notificacoes n WHERE n.paciente_id=p.id) AS total_contatos,
        (SELECT MAX(n.criado_em) FROM notificacoes n WHERE n.paciente_id=p.id) AS ultimo_contato,
        (SELECT n.assunto FROM notificacoes n WHERE n.paciente_id=p.id
         ORDER BY n.criado_em DESC LIMIT 1) AS ultimo_contato_assunto,

        (SELECT a.data_hora_inicio FROM agendamentos a
         WHERE a.paciente_id=p.id AND a.status IN('pendente','confirmado')
           AND a.data_hora_inicio > NOW()
         ORDER BY a.data_hora_inicio ASC LIMIT 1) AS proximo_agendamento,

        (SELECT COUNT(*) FROM agendamentos a
         WHERE a.paciente_id=p.id AND a.status='realizado') AS total_sessoes,

        ve.estagiario_id AS vinculo_estagiario_id,
        ue.nome AS estagiario_nome,

        EXISTS(
          SELECT 1 FROM agendamentos a
          WHERE a.paciente_id=p.id AND a.status IN('pendente','confirmado')
            AND a.data_hora_inicio > NOW()
        ) AS tem_agendamento_ativo

      FROM pacientes p
      LEFT JOIN vinculos_estagiario_paciente ve ON ve.paciente_id=p.id AND ve.ativo=1
      LEFT JOIN estagiarios est ON est.id=ve.estagiario_id
      LEFT JOIN usuarios ue ON ue.id=est.usuario_id

      WHERE p.status IN('aguardando','em_contato')

      ORDER BY p.risco_suicidio DESC,
        FIELD(p.urgencia,'muito_urgente','urgente','pouco_urgente','sem_urgencia'),
        p.timestamp_cadastro ASC`);
        res.json({ success: true, data: rows });
    }
    catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
};
// â”€â”€ Pacientes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const listarPacientes = async (req: Request, res: Response) => {
    try {
        const { status, urgencia, busca } = req.query;
        const isSupervisor = req.user!.perfil === 'supervisor';
        let sql = `
      SELECT p.id,p.nome,p.cpf,p.telefone,p.email,p.status,p.urgencia,
             p.timestamp_cadastro,p.risco_suicidio,p.estagiario_id,
             TIMESTAMPDIFF(DAY,p.timestamp_cadastro,NOW()) AS dias_espera,
             ue.nome AS estagiario_nome
      FROM pacientes p
      LEFT JOIN estagiarios e ON p.estagiario_id=e.id
      LEFT JOIN usuarios ue   ON e.usuario_id=ue.id
      WHERE 1=1`;
        const params: any[] = [];
        // Supervisor sÃ³ vÃª pacientes dos seus estagiÃ¡rios
        if (isSupervisor) {
            sql += ` AND EXISTS (
        SELECT 1 FROM vinculos_estagiario_paciente v
        JOIN vinculos_supervisor_estagiario vs ON vs.estagiario_id=v.estagiario_id
        WHERE v.paciente_id=p.id AND vs.supervisor_id=? AND vs.ativo=1)`;
            params.push(req.user!.id);
        }
        if (status) {
            sql += ' AND p.status=?';
            params.push(status);
        }
        if (urgencia) {
            sql += ' AND p.urgencia=?';
            params.push(urgencia);
        }
        if (busca) {
            sql += ' AND (p.nome LIKE ? OR p.cpf LIKE ? OR p.telefone LIKE ? OR p.email LIKE ?)';
            const b = `%${busca}%`;
            params.push(b, b, b, b);
        }
        sql += ' ORDER BY FIELD(p.urgencia,"muito_urgente","urgente","pouco_urgente","sem_urgencia"),p.timestamp_cadastro ASC';
        const [rows]: any = await pool.query(sql, params);
        res.json({ success: true, data: rows });
    }
    catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
};
export const detalharPaciente = async (req: Request, res: Response) => {
    try {
        const [p]: any = await pool.query(`
      SELECT p.*,ue.nome AS estagiario_nome
      FROM pacientes p
      LEFT JOIN estagiarios e ON p.estagiario_id=e.id
      LEFT JOIN usuarios ue   ON e.usuario_id=ue.id
      WHERE p.id=?`, [req.params.id]);
        if (!p.length)
            return res.status(404).json({ success: false, error: 'NÃ£o encontrado' });
        const [ags]: any = await pool.query(`SELECT a.*,ue.nome AS estagiario_nome FROM agendamentos a JOIN estagiarios e ON a.estagiario_id=e.id JOIN usuarios ue ON e.usuario_id=ue.id WHERE a.paciente_id=? ORDER BY a.data_hora_inicio DESC`, [req.params.id]);
        const [hist]: any = await pool.query(`SELECT h.*,u.nome AS usuario_nome FROM historico_status h LEFT JOIN usuarios u ON h.usuario_id=u.id WHERE h.paciente_id=? ORDER BY h.criado_em DESC`, [req.params.id]);
        const [docs]: any = await pool.query(`SELECT d.*,u.nome AS enviado_por_nome FROM documentos d LEFT JOIN usuarios u ON d.enviado_por=u.id WHERE d.paciente_id=? AND d.status='ativo' ORDER BY d.criado_em DESC`, [req.params.id]);
        const [nots]: any = await pool.query(`SELECT * FROM notificacoes WHERE paciente_id=? ORDER BY criado_em DESC LIMIT 20`, [req.params.id]);
        res.json({ success: true, data: { ...p[0], agendamentos: ags, historico: hist, documentos: docs, notificacoes: nots } });
    }
    catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
};
export const atualizarStatus = async (req: Request, res: Response) => {
    try {
        const { status, observacao } = req.body;
        const [atual]: any = await pool.query('SELECT status FROM pacientes WHERE id=?', [req.params.id]);
        if (!atual.length)
            return res.status(404).json({ success: false, error: 'NÃ£o encontrado' });
        await pool.query('INSERT INTO historico_status (paciente_id,status_anterior,status_novo,usuario_id,canal,observacao) VALUES (?,?,?,?,?,?)', [req.params.id, atual[0].status, status, req.user!.id, 'supervisor', observacao || null]);
        await pool.query('UPDATE pacientes SET status=?,atualizado_em=NOW() WHERE id=?', [status, req.params.id]);
        res.json({ success: true });
    }
    catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
};
export const retornarPacienteFila = async (req: Request, res: Response) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const { observacao } = req.body;
        const [pacientes]: any = await conn.query('SELECT id,status FROM pacientes WHERE id=? FOR UPDATE', [req.params.id]);
        if (!pacientes.length) {
            await conn.rollback();
            return res.status(404).json({ success: false, error: 'Nao encontrado' });
        }
        const paciente = pacientes[0];
        if (paciente.status !== 'desistencia') {
            await conn.rollback();
            return res.status(409).json({ success: false, error: 'Paciente nao esta em desistencia.' });
        }
        const [agendamentos]: any = await conn.query(`
      SELECT id FROM agendamentos
      WHERE paciente_id=?
        AND status IN('pendente','confirmado')
        AND data_hora_inicio > NOW()
      LIMIT 1`, [req.params.id]);
        if (agendamentos.length) {
            await conn.rollback();
            return res.status(409).json({ success: false, error: 'Paciente possui agendamento ativo.' });
        }
        await conn.query(`
      UPDATE pacientes
      SET status='aguardando',estagiario_id=NULL,timestamp_cadastro=NOW(),atualizado_em=NOW()
      WHERE id=?`, [req.params.id]);
        await conn.query(`
      UPDATE vinculos_estagiario_paciente
      SET ativo=0,data_fim=NOW(),motivo_transferencia=?,transferido_por=?
      WHERE paciente_id=? AND ativo=1`, [
            observacao || 'Retorno para fila apos desistencia',
            req.user!.id,
            req.params.id,
        ]);
        await conn.query(`
      INSERT INTO historico_status
        (paciente_id,status_anterior,status_novo,usuario_id,canal,observacao)
      VALUES (?,?,?,?,?,?)`, [
            req.params.id,
            'desistencia',
            'aguardando',
            req.user!.id,
            req.user!.perfil,
            observacao || 'Retorno para fila apos desistencia',
        ]);
        await conn.commit();
        res.json({ success: true });
    }
    catch (e: any) {
        await conn.rollback();
        res.status(500).json({ success: false, error: e.message });
    }
    finally {
        conn.release();
    }
};
export const atribuirEstagiario = async (req: Request, res: Response) => {
    try {
        await pool.query('UPDATE pacientes SET estagiario_id=?,atualizado_em=NOW() WHERE id=?', [req.body.estagiario_id, req.params.id]);
        res.json({ success: true });
    }
    catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
};
export const registrarNotificacao = async (req: Request, res: Response) => {
    try {
        const { tipo, assunto, mensagem } = req.body;
        const [r]: any = await pool.query('INSERT INTO notificacoes (paciente_id,tipo,assunto,mensagem,status,usuario_id) VALUES (?,?,?,?,?,?)', [req.params.id, tipo, assunto || null, mensagem || null, 'enviado', req.user!.id]);
        res.status(201).json({ success: true, id: r.insertId });
    }
    catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
};
// â”€â”€ EstagiÃ¡rios â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const listarEstagiarios = async (req: Request, res: Response) => {
    // Supervisor vÃª apenas seus estagiÃ¡rios (vinculados via vinculos_supervisor_estagiario)
    // Coordenador vÃª todos
    try {
        const isSupervisor = req.user!.perfil === 'supervisor';
        const sql = `
      SELECT e.id, e.matricula, e.semestre, e.supervisor, e.ativo,
             u.nome, u.email, u.id AS usuario_id,
             COUNT(DISTINCT s.id)                AS total_slots,
             SUM(s.status='aprovado')            AS slots_aprovados,
             SUM(s.status='pendente')            AS slots_pendentes,
             (SELECT COUNT(*) FROM vinculos_estagiario_paciente v
              WHERE v.estagiario_id=e.id AND v.ativo=1)    AS pacientes_ativos,
             (SELECT COUNT(*) FROM agendamentos a
              WHERE a.estagiario_id=e.id AND a.status='realizado') AS total_sessoes,
             (SELECT MAX(a.data_hora_inicio) FROM agendamentos a
              WHERE a.estagiario_id=e.id AND a.status='realizado') AS ultimo_atendimento
      FROM estagiarios e
      JOIN usuarios u ON e.usuario_id=u.id
      LEFT JOIN estagiario_slots s ON e.id=s.estagiario_id
      ${isSupervisor ? `JOIN vinculos_supervisor_estagiario vs
        ON vs.estagiario_id=e.id AND vs.supervisor_id=? AND vs.ativo=1` : ''}
      WHERE e.ativo=1 AND u.perfil='estagiario'
      GROUP BY e.id ORDER BY u.nome`;
        const params = isSupervisor ? [req.user!.id] : [];
        const [rows]: any = await pool.query(sql, params);
        res.json({ success: true, data: rows });
    }
    catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
};
// â”€â”€ Pacientes de um estagiÃ¡rio â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const pacientesDoEstagiario = async (req: Request, res: Response) => {
    try {
        if (req.user!.perfil === 'supervisor') {
            const [permitido]: any = await pool.query(`SELECT 1 FROM vinculos_supervisor_estagiario
         WHERE supervisor_id=? AND estagiario_id=? AND ativo=1
         LIMIT 1`, [req.user!.id, req.params.id]);
            if (!permitido.length) {
                return res.status(403).json({ success: false, error: 'Acesso negado: estagiÃ¡rio nÃ£o supervisionado por vocÃª.' });
            }
        }
        const [rows]: any = await pool.query(`
      SELECT p.id, p.nome, p.cpf, p.telefone, p.urgencia, p.status,
             p.timestamp_cadastro,
             (SELECT COUNT(*) FROM agendamentos a
              WHERE a.paciente_id=p.id AND a.estagiario_id=? AND a.status='realizado'
             ) AS sessoes_com_este,
             (SELECT MAX(a.data_hora_inicio) FROM agendamentos a
              WHERE a.paciente_id=p.id AND a.estagiario_id=? AND a.status='realizado'
             ) AS ultima_sessao
      FROM vinculos_estagiario_paciente v
      JOIN pacientes p ON v.paciente_id=p.id
      WHERE v.estagiario_id=? AND v.ativo=1
      ORDER BY p.nome`, [req.params.id, req.params.id, req.params.id]);
        res.json({ success: true, data: rows });
    }
    catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
};
// â”€â”€ Atualizar supervisor do estagiÃ¡rio â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const atualizarSupervisor = async (req: Request, res: Response) => {
    try {
        const { supervisor } = req.body;
        if (!supervisor)
            return res.status(400).json({ success: false, error: 'supervisor Ã© obrigatÃ³rio' });
        await pool.query('UPDATE estagiarios SET supervisor=? WHERE id=?', [supervisor, req.params.id]);
        res.json({ success: true, message: 'Supervisor atualizado.' });
    }
    catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
};
// â”€â”€ Ativar / Desativar estagiÃ¡rio â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const toggleEstagiario = async (req: Request, res: Response) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const { ativo } = req.body; // 0 ou 1
        const [e]: any = await conn.query('SELECT ativo FROM estagiarios WHERE id=?', [req.params.id]);
        if (!e.length)
            return res.status(404).json({ success: false, error: 'NÃ£o encontrado' });
        await conn.query('UPDATE estagiarios SET ativo=? WHERE id=?', [ativo ? 1 : 0, req.params.id]);
        // Se desativando: encerra vÃ­nculos ativos e rejeita slots pendentes
        if (!ativo) {
            await conn.query(`UPDATE vinculos_estagiario_paciente
         SET ativo=0, data_fim=NOW(), motivo_transferencia='EstagiÃ¡rio desativado'
         WHERE estagiario_id=? AND ativo=1`, [req.params.id]);
            await conn.query(`UPDATE estagiario_slots SET status='rejeitado', obs_admin='EstagiÃ¡rio desativado'
         WHERE estagiario_id=? AND status='pendente'`, [req.params.id]);
        }
        await conn.commit();
        res.json({ success: true, message: ativo ? 'EstagiÃ¡rio reativado.' : 'EstagiÃ¡rio desativado. VÃ­nculos encerrados.' });
    }
    catch (e: any) {
        await conn.rollback();
        res.status(500).json({ success: false, error: e.message });
    }
    finally {
        conn.release();
    }
};
export const slotsPendentes = async (req: Request, res: Response) => {
    try {
        const isSupervisor = req.user!.perfil === 'supervisor';
        const sql = `
      SELECT s.*, u.nome AS estagiario_nome, e.matricula, e.semestre
      FROM estagiario_slots s
      JOIN estagiarios e ON e.id=s.estagiario_id
      JOIN usuarios u ON u.id=e.usuario_id
      ${isSupervisor ? `JOIN vinculos_supervisor_estagiario vs
        ON vs.estagiario_id=e.id AND vs.supervisor_id=? AND vs.ativo=1` : ''}
      WHERE s.status='pendente'
      ORDER BY FIELD(s.dia_semana,'seg','ter','qua','qui','sex','sab'), s.hora_inicio, u.nome`;
        const params = isSupervisor ? [req.user!.id] : [];
        const [rows]: any = await pool.query(sql, params);
        res.json({ success: true, data: rows });
    }
    catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
};

export const aprovarSlot = async (req: Request, res: Response) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const { status, obs_admin } = req.body;
        if (!['aprovado', 'rejeitado'].includes(status)) {
            await conn.rollback();
            return res.status(400).json({ success: false, error: 'Status invalido.' });
        }
        const [slotRows]: any = await conn.query(`
      SELECT s.*, e.usuario_id
      FROM estagiario_slots s
      JOIN estagiarios e ON e.id=s.estagiario_id
      WHERE s.id=? FOR UPDATE`, [req.params.id]);
        if (!slotRows.length) {
            await conn.rollback();
            return res.status(404).json({ success: false, error: 'Horario nao encontrado.' });
        }
        const slot = slotRows[0];
        if (req.user!.perfil === 'supervisor') {
            const [permitido]: any = await conn.query(`
        SELECT 1 FROM vinculos_supervisor_estagiario
        WHERE supervisor_id=? AND estagiario_id=? AND ativo=1
        LIMIT 1`, [req.user!.id, slot.estagiario_id]);
            if (!permitido.length) {
                await conn.rollback();
                return res.status(403).json({ success: false, error: 'Acesso negado: estagiario nao supervisionado por voce.' });
            }
        }
        if (status === 'rejeitado') {
            await conn.query("UPDATE estagiario_slots SET status='rejeitado', obs_admin=?, atualizado_em=NOW() WHERE id=?", [obs_admin || 'Rejeitado pelo administrador', req.params.id]);
            await conn.commit();
            return res.json({ success: true, message: 'Horario rejeitado.' });
        }
        const [cfgRows]: any = await conn.query(`
      SELECT chave, valor FROM sep_config
      WHERE chave IN ('max_estagiarios_diurno','max_estagiarios_noturno','max_estagiarios_slot')`);
        const cfg = cfgRows.reduce((acc: Record<string, number>, row: any) => {
            acc[row.chave] = Number(row.valor);
            return acc;
        }, {});
        const turno = slot.turno || (Number(String(slot.hora_inicio).slice(0, 2)) < 18 ? 'diurno' : 'noturno');
        const maxTurno = cfg[`max_estagiarios_${turno}`] || 2;
        const maxSlot = cfg.max_estagiarios_slot || 1;
        const [totalTurno]: any = await conn.query(`
      SELECT COUNT(DISTINCT estagiario_id) AS total
      FROM estagiario_slots
      WHERE status='aprovado' AND dia_semana=? AND turno=?`, [slot.dia_semana, turno]);
        if (totalTurno[0].total >= maxTurno) {
            await conn.rollback();
            return res.status(409).json({ success: false, error: `Capacidade do turno ${turno} atingida para ${slot.dia_semana}: ${totalTurno[0].total}/${maxTurno}.` });
        }
        const [totalExato]: any = await conn.query(`
      SELECT COUNT(*) AS total
      FROM estagiario_slots
      WHERE status='aprovado' AND dia_semana=? AND hora_inicio=? AND hora_fim=?`, [slot.dia_semana, slot.hora_inicio, slot.hora_fim]);
        if (totalExato[0].total >= maxSlot) {
            await conn.rollback();
            return res.status(409).json({ success: false, error: `Capacidade do mesmo horario atingida: ${totalExato[0].total}/${maxSlot}.` });
        }
        await conn.query("UPDATE estagiario_slots SET status='aprovado', obs_admin=?, atualizado_em=NOW() WHERE id=?", [obs_admin || 'Aprovado pelo administrador', req.params.id]);
        await conn.commit();
        res.json({ success: true, message: `Horario aprovado. Turno ${turno} em ${slot.dia_semana}: ${totalTurno[0].total + 1}/${maxTurno} estagiarios.` });
    }
    catch (e: any) {
        await conn.rollback();
        res.status(500).json({ success: false, error: e.message });
    }
    finally {
        conn.release();
    }
};

export const slotsEstagiario = async (req: Request, res: Response) => {
    try {
        if (req.user!.perfil === 'supervisor') {
            const [permitido]: any = await pool.query(`SELECT 1 FROM vinculos_supervisor_estagiario
         WHERE supervisor_id=? AND estagiario_id=? AND ativo=1
         LIMIT 1`, [req.user!.id, req.params.id]);
            if (!permitido.length) {
                return res.status(403).json({ success: false, error: 'Acesso negado: estagiÃ¡rio nÃ£o supervisionado por vocÃª.' });
            }
        }
        const [rows]: any = await pool.query(`SELECT * FROM estagiario_slots WHERE estagiario_id=? ORDER BY FIELD(dia_semana,'seg','ter','qua','qui','sex','sab'),hora_inicio`, [req.params.id]);
        res.json({ success: true, data: rows });
    }
    catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
};
// â”€â”€ Agendamentos â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const listarAgendamentos = async (req: Request, res: Response) => {
    try {
        const { data, inicio, fim, estagiario_id, status } = req.query;
        const isSupervisor = req.user!.perfil === 'supervisor';
        let sql = `SELECT a.*,up.nome AS paciente_nome,ue.nome AS estagiario_nome,
                  (SELECT COUNT(*) FROM agendamentos af WHERE af.paciente_id=a.paciente_id AND af.status='faltou') AS total_faltas,
                  (SELECT valor FROM sep_config WHERE chave='max_faltas_desligamento' LIMIT 1) AS limite_faltas
               FROM agendamentos a
               JOIN pacientes p ON a.paciente_id=p.id
               JOIN usuarios up ON p.usuario_id=up.id
               JOIN estagiarios e ON a.estagiario_id=e.id
               JOIN usuarios ue ON e.usuario_id=ue.id WHERE 1=1`;
        const params: any[] = [];
        if (isSupervisor) {
            sql += ` AND EXISTS (
        SELECT 1 FROM vinculos_supervisor_estagiario vs
        WHERE vs.estagiario_id=a.estagiario_id AND vs.supervisor_id=? AND vs.ativo=1)`;
            params.push(req.user!.id);
        }
        if (data) {
            sql += ' AND DATE(a.data_hora_inicio)=?';
            params.push(data);
        }
        if (inicio) {
            sql += ' AND a.data_hora_inicio>=?';
            params.push(String(inicio).slice(0, 19).replace('T', ' '));
        }
        if (fim) {
            sql += ' AND a.data_hora_inicio<?';
            params.push(String(fim).slice(0, 19).replace('T', ' '));
        }
        if (estagiario_id) {
            sql += ' AND a.estagiario_id=?';
            params.push(estagiario_id);
        }
        if (status) {
            sql += ' AND a.status=?';
            params.push(status);
        }
        sql += ' ORDER BY a.data_hora_inicio ASC';
        const [rows]: any = await pool.query(sql, params);
        logger.info('Agenda administrativa listada', {
            perfil: req.user?.perfil,
            usuario_id: req.user?.id,
            filtros: { data, inicio, fim, estagiario_id, status },
            total: rows.length,
            primeiro_agendamento: rows[0] ? {
                id: rows[0].id,
                inicio: rows[0].data_hora_inicio,
                fim: rows[0].data_hora_fim,
                status: rows[0].status,
            } : null,
        });
        res.json({ success: true, data: rows });
    }
    catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
};
export const criarAgendamento = async (req: Request, res: Response) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const { paciente_id, estagiario_id, slot_id, data_hora_inicio, modalidade, sala, link_online, notas_admin } = req.body;
        const modalidadeNorm = modalidade === 'online' ? 'online' : 'presencial';
        // Duração FIXA de 60 minutos — regra de negócio imutável
        const DURACAO_MIN = 60;
        const [pacienteRows]: any = await conn.query(`
      SELECT p.status,
             (SELECT COUNT(*) FROM notificacoes n WHERE n.paciente_id=p.id) AS total_contatos,
             EXISTS(
               SELECT 1 FROM agendamentos a
               WHERE a.paciente_id=p.id AND a.status IN('pendente','confirmado')
                 AND a.data_hora_inicio > NOW()
             ) AS tem_agendamento_ativo
      FROM pacientes p
      WHERE p.id=?`, [paciente_id]);
        if (!pacienteRows.length) {
            await conn.rollback();
            return res.status(404).json({ success: false, error: 'Paciente nao encontrado.' });
        }
        const paciente = pacienteRows[0];
        if (paciente.status !== 'em_contato') {
            await conn.rollback();
            return res.status(409).json({ success: false, error: 'Paciente precisa ter contato efetivo registrado antes do agendamento.' });
        }
        if (Number(paciente.total_contatos) < 1) {
            await conn.rollback();
            return res.status(409).json({ success: false, error: 'Paciente precisa ter pelo menos um contato registrado antes do agendamento.' });
        }
        if (Number(paciente.tem_agendamento_ativo) === 1) {
            await conn.rollback();
            return res.status(409).json({ success: false, error: 'Paciente ja possui agendamento ativo.' });
        }
        // Calcula horário fim somando 60min diretamente na string para evitar offset UTC
        // "2026-04-27T11:00" ou "2026-04-27 11:00:00" → "2026-04-27 12:00:00"
        const normalizedt = (dt: string): string => {
          const s = String(dt).trim().slice(0, 16).replace('T', ' ');
          return s.length === 16 ? s + ':00' : s;
        };
        const inicioNorm = normalizedt(String(data_hora_inicio));
        const [dtParte, tParte] = inicioNorm.split(' ');
        const [hh, mm]          = tParte.split(':').map(Number);
        const totalMin          = hh * 60 + mm + DURACAO_MIN;
        const fimHH             = Math.floor(totalMin / 60) % 24;
        const fimMM             = totalMin % 60;
        const fim               = `${dtParte} ${String(fimHH).padStart(2,'0')}:${String(fimMM).padStart(2,'0')}:00`;
        const [salasRows]: any = await conn.query("SELECT valor FROM sep_config WHERE chave='salas_disponiveis' LIMIT 1");
        const salasDisponiveis = parseSalasDisponiveis(salasRows[0]?.valor);
        const salaNorm = String(sala || '').trim();
        if (modalidadeNorm === 'presencial') {
            if (!salaNorm) {
                await conn.rollback();
                return res.status(400).json({ success: false, error: 'Selecione uma sala para atendimento presencial.' });
            }
            if (!salasDisponiveis.includes(salaNorm)) {
                await conn.rollback();
                return res.status(400).json({
                    success: false,
                    error: `Sala inválida. Selecione uma sala cadastrada em sep_config: ${salasDisponiveis.join(', ') || 'nenhuma sala configurada'}.`,
                });
            }
        } else if (salaNorm && !salasDisponiveis.includes(salaNorm)) {
            await conn.rollback();
            return res.status(400).json({
                success: false,
                error: `Sala inválida. Selecione uma sala cadastrada em sep_config: ${salasDisponiveis.join(', ') || 'nenhuma sala configurada'}.`,
            });
        }
        const salaAgendamento = modalidadeNorm === 'presencial' ? salaNorm : (salaNorm || null);
        const statusInicial = 'pendente';
        logger.info('Agendamento recebido para gravacao', {
            paciente_id,
            estagiario_id,
            slot_id: slot_id || null,
            horario_recebido: data_hora_inicio,
            horario_normalizado: inicioNorm,
            horario_fim_calculado: fim,
            status_inicial: statusInicial,
            modalidade: modalidadeNorm,
            sala: salaAgendamento,
            salas_configuradas: salasDisponiveis,
            usuario_id: req.user?.id,
            perfil: req.user?.perfil,
        });
        const [conf]: any = await conn.query(`SELECT id FROM agendamentos WHERE estagiario_id=? AND status NOT IN('cancelado_admin','cancelado_paciente','faltou') AND NOT (data_hora_fim<=? OR data_hora_inicio>=?)`, [estagiario_id, inicioNorm, fim]);
        if (conf.length) {
            await conn.rollback();
            return res.status(409).json({ success: false, error: 'Conflito de horÃ¡rio.' });
        }
        const [sess]: any = await conn.query("SELECT COUNT(*)+1 AS prox FROM agendamentos WHERE paciente_id=? AND status NOT IN('cancelado_admin','cancelado_paciente')", [paciente_id]);
        const [r]: any = await conn.query(`INSERT INTO agendamentos (paciente_id,estagiario_id,slot_id,data_hora_inicio,data_hora_fim,status,modalidade,sala,link_online,notas_admin,sessao_numero,criado_por) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`, [paciente_id, estagiario_id, slot_id || null, inicioNorm, fim, statusInicial, modalidadeNorm, salaAgendamento, link_online || null, notas_admin || null, sess[0].prox, req.user!.id]);
        if (paciente.status !== 'em_atendimento') {
            await conn.query('UPDATE pacientes SET status="agendado",estagiario_id=?,atualizado_em=NOW() WHERE id=?', [estagiario_id, paciente_id]);
            await conn.query('INSERT INTO historico_status (paciente_id,status_anterior,status_novo,usuario_id,canal) VALUES (?,?,?,?,?)', [paciente_id, paciente.status, 'agendado', req.user!.id, 'supervisor']);
        }
        await conn.commit();
        logger.info('Agendamento gravado com sucesso', {
            agendamento_id: r.insertId,
            paciente_id,
            estagiario_id,
            inicio_gravado: inicioNorm,
            fim_gravado: fim,
            status_gravado: statusInicial,
            sessao_numero: sess[0].prox,
        });
        logger.audit(req, 'criou_agendamento', {
            agendamento_id: r.insertId,
            paciente_id,
            estagiario_id,
            inicio: inicioNorm,
            fim,
            status: statusInicial,
        });
        res.status(201).json({ success: true, id: r.insertId, status: statusInicial });
    }
    catch (e: any) {
        await conn.rollback();
        logger.error('Falha ao criar agendamento', e, {
            body: req.body,
            usuario_id: req.user?.id,
            perfil: req.user?.perfil,
        });
        res.status(500).json({ success: false, error: e.message });
    }
    finally {
        conn.release();
    }
};

export const confirmarAgendamentoAdmin = async (req: Request, res: Response) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const [agRows]: any = await conn.query(`
      SELECT a.id, a.paciente_id, a.estagiario_id, a.status, a.data_hora_inicio
      FROM agendamentos a
      WHERE a.id=?
      FOR UPDATE`, [req.params.id]);
        if (!agRows.length) {
            await conn.rollback();
            return res.status(404).json({ success: false, error: 'Agendamento nao encontrado.' });
        }
        const ag = agRows[0];
        if (!(await supervisorPodeGerenciarAgendamento(conn, req, ag.estagiario_id))) {
            await conn.rollback();
            return res.status(403).json({ success: false, error: 'Acesso negado: agendamento fora da sua supervisao.' });
        }
        if (ag.status === 'confirmado') {
            await conn.commit();
            return res.json({ success: true, status: 'confirmado', message: 'Consulta ja estava confirmada.' });
        }
        if (ag.status !== 'pendente') {
            await conn.rollback();
            return res.status(409).json({ success: false, error: 'Apenas consultas pendentes podem ser confirmadas.' });
        }

        await conn.query(
            "UPDATE agendamentos SET status='confirmado', atualizado_em=NOW() WHERE id=?",
            [ag.id],
        );
        await conn.query(
            'INSERT INTO notificacoes (paciente_id,tipo,assunto,mensagem,status,usuario_id) VALUES (?,?,?,?,?,?)',
            [ag.paciente_id, 'sistema', 'Consulta confirmada', 'Consulta confirmada pela equipe.', 'enviado', req.user!.id],
        );
        await conn.commit();
        logger.info('Consulta confirmada pela agenda administrativa', {
            agendamento_id: ag.id,
            paciente_id: ag.paciente_id,
            usuario_id: req.user?.id,
            perfil: req.user?.perfil,
        });
        logger.audit(req, 'confirmou_agendamento', {
            agendamento_id: ag.id,
            paciente_id: ag.paciente_id,
            status_anterior: ag.status,
            status_novo: 'confirmado',
        });
        res.json({ success: true, status: 'confirmado', message: 'Consulta confirmada.' });
    }
    catch (e: any) {
        await conn.rollback();
        logger.error('Falha ao confirmar consulta pela agenda administrativa', e, {
            agendamento_id: req.params.id,
            usuario_id: req.user?.id,
            perfil: req.user?.perfil,
        });
        res.status(500).json({ success: false, error: e.message });
    }
    finally {
        conn.release();
    }
};

export const cancelarAgendamentoAdmin = async (req: Request, res: Response) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const motivo = String(req.body?.motivo || '').trim();
        if (!motivo) {
            await conn.rollback();
            return res.status(400).json({ success: false, error: 'Informe o motivo do cancelamento.' });
        }

        const [agRows]: any = await conn.query(`
      SELECT a.id, a.paciente_id, a.estagiario_id, a.status, a.data_hora_inicio,
             p.status AS paciente_status
      FROM agendamentos a
      JOIN pacientes p ON p.id=a.paciente_id
      WHERE a.id=?
      FOR UPDATE`, [req.params.id]);
        if (!agRows.length) {
            await conn.rollback();
            return res.status(404).json({ success: false, error: 'Agendamento nao encontrado.' });
        }
        const ag = agRows[0];
        if (!(await supervisorPodeGerenciarAgendamento(conn, req, ag.estagiario_id))) {
            await conn.rollback();
            return res.status(403).json({ success: false, error: 'Acesso negado: agendamento fora da sua supervisao.' });
        }
        if (!['pendente', 'confirmado'].includes(ag.status)) {
            await conn.rollback();
            return res.status(409).json({ success: false, error: 'Apenas consultas pendentes ou confirmadas podem ser canceladas.' });
        }

        await conn.query(`
      UPDATE agendamentos
      SET status='cancelado_admin',
          notas_admin=TRIM(CONCAT(IFNULL(notas_admin,''), CASE WHEN IFNULL(notas_admin,'')='' THEN '' ELSE ' | ' END, ?)),
          atualizado_em=NOW()
      WHERE id=?`, [`Cancelamento: ${motivo}`, ag.id]);

        const [ativosRows]: any = await conn.query(`
      SELECT COUNT(*) AS total
      FROM agendamentos
      WHERE paciente_id=?
        AND id<>?
        AND status IN('pendente','confirmado')
        AND data_hora_inicio>NOW()`, [ag.paciente_id, ag.id]);
        const semOutroAgendamentoAtivo = Number(ativosRows[0]?.total || 0) === 0;
        const retornarFila = semOutroAgendamentoAtivo && ag.paciente_status === 'agendado';

        if (retornarFila) {
            await conn.query(
                "UPDATE pacientes SET status='aguardando', estagiario_id=NULL, atualizado_em=NOW() WHERE id=?",
                [ag.paciente_id],
            );
            await conn.query(
                'INSERT INTO historico_status (paciente_id,status_anterior,status_novo,usuario_id,canal,observacao) VALUES (?,?,?,?,?,?)',
                [ag.paciente_id, ag.paciente_status, 'aguardando', req.user!.id, req.user!.perfil || 'sistema', motivo],
            );
        }

        await conn.query(
            'INSERT INTO notificacoes (paciente_id,tipo,assunto,mensagem,status,usuario_id) VALUES (?,?,?,?,?,?)',
            [ag.paciente_id, 'sistema', 'Consulta cancelada', motivo, 'enviado', req.user!.id],
        );
        await conn.commit();
        logger.info('Consulta cancelada pela agenda administrativa', {
            agendamento_id: ag.id,
            paciente_id: ag.paciente_id,
            status_anterior: ag.status,
            retornou_fila: retornarFila,
            motivo,
            usuario_id: req.user?.id,
            perfil: req.user?.perfil,
        });
        logger.audit(req, 'cancelou_agendamento', {
            agendamento_id: ag.id,
            paciente_id: ag.paciente_id,
            status_anterior: ag.status,
            status_novo: 'cancelado_admin',
            retornou_fila: retornarFila,
        });
        res.json({
            success: true,
            status: 'cancelado_admin',
            paciente_status: retornarFila ? 'aguardando' : ag.paciente_status,
            message: retornarFila ? 'Consulta cancelada. Paciente retornou para a fila.' : 'Consulta cancelada.',
        });
    }
    catch (e: any) {
        await conn.rollback();
        logger.error('Falha ao cancelar consulta pela agenda administrativa', e, {
            agendamento_id: req.params.id,
            usuario_id: req.user?.id,
            perfil: req.user?.perfil,
        });
        res.status(500).json({ success: false, error: e.message });
    }
    finally {
        conn.release();
    }
};

export const registrarFaltaAgendamento = async (req: Request, res: Response) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const motivo = String(req.body?.motivo || 'Paciente ausente no horário agendado').trim();
        const [agRows]: any = await conn.query(`
      SELECT a.id, a.paciente_id, a.estagiario_id, a.status, a.data_hora_inicio,
             p.status AS paciente_status
      FROM agendamentos a
      JOIN pacientes p ON p.id=a.paciente_id
      WHERE a.id=?
      FOR UPDATE`, [req.params.id]);
        if (!agRows.length) {
            await conn.rollback();
            return res.status(404).json({ success: false, error: 'Agendamento não encontrado.' });
        }
        const ag = agRows[0];
        if (req.user?.perfil === 'supervisor') {
            const [permitido]: any = await conn.query(`
        SELECT 1 FROM vinculos_supervisor_estagiario
        WHERE supervisor_id=? AND estagiario_id=? AND ativo=1
        LIMIT 1`, [req.user.id, ag.estagiario_id]);
            if (!permitido.length) {
                await conn.rollback();
                return res.status(403).json({ success: false, error: 'Acesso negado: agendamento fora da sua supervisão.' });
            }
        }
        if (!['pendente', 'confirmado'].includes(ag.status)) {
            await conn.rollback();
            return res.status(409).json({ success: false, error: 'Apenas consultas pendentes ou confirmadas podem receber falta.' });
        }
        const [futuro]: any = await conn.query('SELECT ? > NOW() AS futuro', [ag.data_hora_inicio]);
        if (Number(futuro[0]?.futuro) === 1) {
            await conn.rollback();
            return res.status(409).json({ success: false, error: 'A ausência só pode ser registrada após o horário da consulta.' });
        }

        await conn.query(`
      UPDATE agendamentos
      SET status='faltou',
          notas_admin=TRIM(CONCAT(IFNULL(notas_admin,''), CASE WHEN IFNULL(notas_admin,'')='' THEN '' ELSE ' | ' END, ?)),
          atualizado_em=NOW()
      WHERE id=?`, [`Falta registrada: ${motivo}`, ag.id]);

        const [faltasRows]: any = await conn.query(
            "SELECT COUNT(*) AS total FROM agendamentos WHERE paciente_id=? AND status='faltou'",
            [ag.paciente_id],
        );
        const totalFaltas = Number(faltasRows[0]?.total || 0);
        const [cfgRows]: any = await conn.query("SELECT valor FROM sep_config WHERE chave='max_faltas_desligamento' LIMIT 1");
        const limiteFaltas = Number(cfgRows[0]?.valor || 3);
        const desligar = totalFaltas >= limiteFaltas && !['alta', 'cancelado', 'desistencia'].includes(ag.paciente_status);

        if (desligar) {
            const obs = `Desligamento automático por ${totalFaltas} falta(s). Última falta: ${motivo}`;
            await conn.query(
                "UPDATE pacientes SET status='desistencia', estagiario_id=NULL, atualizado_em=NOW() WHERE id=?",
                [ag.paciente_id],
            );
            await conn.query(`
        UPDATE vinculos_estagiario_paciente
        SET ativo=0, data_fim=NOW(), motivo_transferencia=?, transferido_por=?
        WHERE paciente_id=? AND ativo=1`,
                [obs, req.user!.id, ag.paciente_id],
            );
            await conn.query(`
        UPDATE agendamentos
        SET status='cancelado_admin',
            notas_admin=TRIM(CONCAT(IFNULL(notas_admin,''), CASE WHEN IFNULL(notas_admin,'')='' THEN '' ELSE ' | ' END, ?)),
            atualizado_em=NOW()
        WHERE paciente_id=?
          AND id<>?
          AND status IN('pendente','confirmado')
          AND data_hora_inicio>NOW()`,
                ['Cancelado automaticamente por desligamento por faltas.', ag.paciente_id, ag.id],
            );
            await conn.query(
                'INSERT INTO historico_status (paciente_id,status_anterior,status_novo,usuario_id,canal,observacao) VALUES (?,?,?,?,?,?)',
                [ag.paciente_id, ag.paciente_status, 'desistencia', req.user!.id, req.user!.perfil || 'sistema', obs],
            );
            await conn.query(
                'INSERT INTO notificacoes (paciente_id,tipo,assunto,mensagem,status,usuario_id) VALUES (?,?,?,?,?,?)',
                [ag.paciente_id, 'sistema', 'Desligamento por faltas', obs, 'enviado', req.user!.id],
            );
        }

        await conn.commit();
        logger.info('Falta registrada em consulta', {
            agendamento_id: ag.id,
            paciente_id: ag.paciente_id,
            total_faltas: totalFaltas,
            limite_faltas: limiteFaltas,
            desligado: desligar,
            motivo,
            usuario_id: req.user?.id,
            perfil: req.user?.perfil,
        });
        logger.audit(req, 'registrou_falta_agendamento', {
            agendamento_id: ag.id,
            paciente_id: ag.paciente_id,
            total_faltas: totalFaltas,
            limite_faltas: limiteFaltas,
            desligado: desligar,
        });
        res.json({
            success: true,
            status: 'faltou',
            total_faltas: totalFaltas,
            limite_faltas: limiteFaltas,
            desligado: desligar,
            message: desligar
                ? `Falta registrada. Paciente desligado após ${totalFaltas} falta(s).`
                : `Falta registrada. Total de faltas: ${totalFaltas}/${limiteFaltas}.`,
        });
    }
    catch (e: any) {
        await conn.rollback();
        logger.error('Falha ao registrar falta em consulta', e, {
            agendamento_id: req.params.id,
            usuario_id: req.user?.id,
            perfil: req.user?.perfil,
        });
        res.status(500).json({ success: false, error: e.message });
    }
    finally {
        conn.release();
    }
};

export const cruzarDisponibilidades = async (req: Request, res: Response) => {
    try {
        const [p]: any = await pool.query('SELECT disponibilidade FROM pacientes WHERE id=?', [req.params.paciente_id]);
        if (!p.length)
            return res.status(404).json({ success: false, error: 'NÃ£o encontrado' });
        const disp = p[0].disponibilidade;
        if (!disp)
            return res.json({ success: true, data: [], message: 'Sem disponibilidade cadastrada' });
        const disponibilidade = typeof disp === 'string' ? JSON.parse(disp) : disp;
        const dias = Object.keys(disponibilidade).filter(dia => Array.isArray(disponibilidade[dia]) && disponibilidade[dia].length);
        if (!dias.length) {
            return res.json({ success: true, data: [], disponibilidade_paciente: disponibilidade, message: 'Sem disponibilidade cadastrada' });
        }
        const [slots]: any = await pool.query(`
      SELECT s.id AS slot_id,s.dia_semana,s.hora_inicio,s.hora_fim,s.turno,
             e.id AS estagiario_id,u.nome AS estagiario_nome,e.matricula
      FROM estagiario_slots s JOIN estagiarios e ON s.estagiario_id=e.id JOIN usuarios u ON e.usuario_id=u.id
      WHERE s.status='aprovado' AND s.dia_semana IN (?) ORDER BY FIELD(s.dia_semana,'seg','ter','qua','qui','sex'),s.hora_inicio`, [dias]);
        res.json({ success: true, data: slots, disponibilidade_paciente: disponibilidade });
    }
    catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
};
// â”€â”€ ConfiguraÃ§Ãµes do SEP â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const getConfig = async (_req: Request, res: Response) => {
    try {
        const [rows]: any = await pool.query('SELECT chave, valor, descricao FROM sep_config ORDER BY chave');
        const cfg: Record<string, any> = {};
        rows.forEach((r: any) => { cfg[r.chave] = r.valor; });
        res.json({ success: true, data: cfg, detalhes: rows });
    }
    catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
};
export const setConfig = async (req: Request, res: Response) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const updates = req.body; // { chave: valor, ... }
        for (const [chave, valor] of Object.entries(updates)) {
            if (chave === 'salas_disponiveis') {
                const salas = parseSalasDisponiveis(String(valor || ''));
                if (!salas.length) {
                    await conn.rollback();
                    return res.status(400).json({ success: false, error: 'Informe pelo menos uma sala disponível.' });
                }
                const texto = salas.join(',');
                await conn.query(`
                    INSERT INTO sep_config (chave,valor,descricao)
                    VALUES (?,?,?)
                    ON DUPLICATE KEY UPDATE valor=VALUES(valor), atualizado_em=NOW()
                `, [chave, texto, 'Salas disponíveis para agendamento, separadas por vírgula.']);
            } else {
                const n = Number(valor);
                if (isNaN(n) || n < 1 || n > 20) {
                    await conn.rollback();
                    return res.status(400).json({ success: false, error: `Valor inválido para ${chave}: deve ser entre 1 e 20` });
                }
                await conn.query('UPDATE sep_config SET valor=?, atualizado_em=NOW() WHERE chave=?', [String(n), chave]);
            }
        }
        await conn.commit();
        res.json({ success: true, message: 'ConfiguraÃ§Ãµes salvas com sucesso.' });
    }
    catch (e: any) {
        await conn.rollback();
        res.status(500).json({ success: false, error: e.message });
    }
    finally {
        conn.release();
    }
};
// â”€â”€ VÃ­nculos Supervisor â†’ EstagiÃ¡rio â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const vincularSupervisorEstagiario = async (req: Request, res: Response) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const { supervisor_id, estagiario_id } = req.body;
        if (!supervisor_id || !estagiario_id)
            return res.status(400).json({ success: false, error: 'supervisor_id e estagiario_id sÃ£o obrigatÃ³rios' });
        // Valida que o supervisor tem perfil correto
        const [sup]: any = await conn.query("SELECT id FROM usuarios WHERE id=? AND perfil='supervisor' AND status_conta='ativo'", [supervisor_id]);
        if (!sup.length)
            return res.status(404).json({ success: false, error: 'Supervisor nÃ£o encontrado ou inativo' });
        // Encerra vÃ­nculo anterior se existir
        await conn.query('UPDATE vinculos_supervisor_estagiario SET ativo=0, data_fim=NOW() WHERE estagiario_id=? AND ativo=1', [estagiario_id]);
        // Cria novo vÃ­nculo
        await conn.query('INSERT INTO vinculos_supervisor_estagiario (supervisor_id,estagiario_id,criado_por) VALUES (?,?,?)', [supervisor_id, estagiario_id, req.user!.id]);
        // Atualiza referÃªncia rÃ¡pida no estagiario
        await conn.query('UPDATE estagiarios SET supervisor_id=? WHERE id=?', [supervisor_id, estagiario_id]);
        await conn.commit();
        res.json({ success: true, message: 'VÃ­nculo supervisor-estagiÃ¡rio criado.' });
    }
    catch (e: any) {
        await conn.rollback();
        res.status(500).json({ success: false, error: e.message });
    }
    finally {
        conn.release();
    }
};
export const listarSupervisores = async (_req: Request, res: Response) => {
    try {
        const [rows]: any = await pool.query(`
      SELECT u.id, u.nome, u.email, u.status_conta,
             COUNT(vs.id) AS total_estagiarios
      FROM usuarios u
      LEFT JOIN vinculos_supervisor_estagiario vs ON vs.supervisor_id=u.id AND vs.ativo=1
      WHERE u.perfil='supervisor'
      GROUP BY u.id ORDER BY u.nome`);
        res.json({ success: true, data: rows });
    }
    catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
};

import { Request, Response } from 'express'
import { readLogs } from '../utils/logger'
import logger from '../utils/logger'

/**
 * GET /admin/logs?tipo=app|error|audit&limite=200
 * Retorna os últimos N registros de log para o painel do coordenador
 */
export const getLogs = (req: Request, res: Response) => {
  try {
    const tipo   = (req.query.tipo as 'app' | 'error' | 'audit') || 'app'
    const limite = Math.min(Number(req.query.limite) || 200, 1000)

    logger.audit(req, 'visualizou_logs', { tipo, limite })

    const logs = readLogs(tipo, limite)
    res.json({ success: true, data: logs, total: logs.length })
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message })
  }
}

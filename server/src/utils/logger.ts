/**
 * SEP v3 — Logger central
 * Sem dependências externas. Logs estruturados com resumo textual legível.
 *
 * Uso:
 *   import logger from '../utils/logger'
 *   logger.info('Paciente criado', { paciente_id: 42 })
 *   logger.warn('Tentativa inválida', { ip, email })
 *   logger.error('Falha no S3', err)
 *   logger.http(req, res, ms)   // middleware HTTP
 *   logger.audit(req, acao, detalhes)  // ações sensíveis (LGPD)
 */

import fs   from 'fs'
import path from 'path'

// ── Configuração ──────────────────────────────────────────────
const IS_PROD    = process.env.NODE_ENV === 'production'
const LOG_LEVEL  = (process.env.LOG_LEVEL || 'info').toLowerCase()
const LOG_DIR    = process.env.LOG_DIR || path.join(process.cwd(), 'logs')
const LOG_FILE   = path.join(LOG_DIR, 'sep.log')
const ERR_FILE   = path.join(LOG_DIR, 'sep-error.log')
const AUDIT_FILE = path.join(LOG_DIR, 'sep-audit.log')
const MAX_BYTES  = 10 * 1024 * 1024  // rotaciona ao atingir 10 MB

// Cria a pasta de logs se não existir
try { fs.mkdirSync(LOG_DIR, { recursive: true }) } catch { /* já existe */ }

// ── Níveis ────────────────────────────────────────────────────
const LEVELS: Record<string, number> = { debug:0, http:1, info:2, warn:3, error:4 }
const COLORS: Record<string, string> = {
  debug: '\x1b[36m',  // cyan
  http:  '\x1b[35m',  // magenta
  info:  '\x1b[32m',  // verde
  warn:  '\x1b[33m',  // amarelo
  error: '\x1b[31m',  // vermelho
  reset: '\x1b[0m',
  dim:   '\x1b[2m',
  bold:  '\x1b[1m',
}

// ── Helpers ───────────────────────────────────────────────────
const ts = () => new Date().toISOString()

const brt = () => {
  const now = new Date()
  return now.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo',
    year:'numeric', month:'2-digit', day:'2-digit',
    hour:'2-digit', minute:'2-digit', second:'2-digit' })
}

const pad = (s: string, n: number) => s.padEnd(n).slice(0, n)
const SENSITIVE_KEY = /(senha|password|token|authorization|secret|cpf|totp|email_token)/i

const redact = (value: any, key = '', depth = 0): any => {
  if (SENSITIVE_KEY.test(key)) return '[redigido]'
  if (value === null || value === undefined) return value
  if (depth > 3) return '[objeto]'
  if (Array.isArray(value)) return value.slice(0, 5).map(v => redact(v, key, depth + 1))
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'object') {
    return Object.entries(value).reduce<Record<string, any>>((acc, [k, v]) => {
      acc[k] = redact(v, k, depth + 1)
      return acc
    }, {})
  }
  return value
}

const formatValue = (value: any): string => {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  try { return JSON.stringify(value) } catch { return String(value) }
}

const humanMeta = (meta?: Record<string, any>): string => {
  if (!meta || !Object.keys(meta).length) return ''
  return Object.entries(meta)
    .map(([k, v]) => `${k}=${formatValue(v)}`)
    .join(' | ')
}

const textEntry = (message: string, meta?: Record<string, any>, err?: any): string => {
  const metaText = humanMeta(meta)
  const errText = err ? `erro=${serializeError(err).message || 'erro desconhecido'}` : ''
  return [message, metaText, errText].filter(Boolean).join(' | ')
}

// Rotação simples: renomeia quando ultrapassa MAX_BYTES
const rotateIfNeeded = (file: string) => {
  try {
    const stat = fs.statSync(file)
    if (stat.size > MAX_BYTES) {
      const rotated = file.replace('.log', `-${Date.now()}.log`)
      fs.renameSync(file, rotated)
    }
  } catch { /* arquivo não existe ainda */ }
}

// Escreve no arquivo com rotação
const writeFile = (file: string, line: string) => {
  try {
    rotateIfNeeded(file)
    fs.appendFileSync(file, line + '\n', 'utf8')
  } catch (e) {
    process.stderr.write(`[logger] Falha ao escrever em ${file}: ${e}\n`)
  }
}

// Serializa erro para JSON
const serializeError = (err: any): Record<string, any> => {
  if (!err) return {}
  if (err instanceof Error) {
    return { message: err.message, stack: err.stack, name: err.name, ...(err as any).code ? { code: (err as any).code } : {} }
  }
  return { raw: String(err) }
}

// ── Core de log ───────────────────────────────────────────────
const shouldLog = (level: string) =>
  (LEVELS[level] ?? 0) >= (LEVELS[LOG_LEVEL] ?? 2)

const emit = (
  level: 'debug' | 'http' | 'info' | 'warn' | 'error',
  message: string,
  meta?: Record<string, any>,
  err?: any,
) => {
  if (!shouldLog(level)) return

  const safeMeta = meta ? redact(meta) : undefined
  const text = textEntry(message, safeMeta, err)

  const entry = {
    ts:      ts(),
    brt:     brt(),
    level:   level.toUpperCase(),
    message,
    text,
    ...(safeMeta ? { meta: safeMeta } : {}),
    ...(err  ? { error: serializeError(err) } : {}),
  }

  // ── Produção: JSON estruturado ────────────────────────────
  if (IS_PROD) {
    const line = JSON.stringify(entry)
    writeFile(LOG_FILE, line)
    if (level === 'error') writeFile(ERR_FILE, line)
    if (level === 'error' || level === 'warn') process.stderr.write(line + '\n')
    else process.stdout.write(line + '\n')
    return
  }

  // ── Desenvolvimento: colorido e legível ───────────────────
  const C   = COLORS
  const col = C[level] || C.reset
  const lvl = pad(level.toUpperCase(), 5)
  const time = `${C.dim}${entry.brt}${C.reset}`
  const msg  = `${C.bold}${col}${lvl}${C.reset} ${time} ${message}`

  const metaStr = safeMeta && Object.keys(safeMeta).length
    ? `\n       ${C.dim}${humanMeta(safeMeta)}${C.reset}`
    : ''
  const errStr = err
    ? `\n       ${C.error}${serializeError(err).message}${C.reset}` +
      (IS_PROD ? '' : `\n       ${C.dim}${serializeError(err).stack || ''}${C.reset}`)
    : ''

  const output = `${msg}${metaStr}${errStr}`

  if (level === 'error') process.stderr.write(output + '\n')
  else process.stdout.write(output + '\n')

  // Sempre persiste em arquivo mesmo em dev
  writeFile(LOG_FILE, JSON.stringify(entry))
  if (level === 'error') writeFile(ERR_FILE, JSON.stringify(entry))
}

// ── Auditoria LGPD ────────────────────────────────────────────
const audit = (
  req: { user?: any; clientIp?: string; method?: string; originalUrl?: string },
  acao: string,
  detalhes?: Record<string, any>,
) => {
  const entry = {
    ts:      ts(),
    brt:     brt(),
    level:   'AUDIT',
    acao,
    usuario_id:   req.user?.id   || null,
    usuario_nome: req.user?.nome || null,
    perfil:       req.user?.perfil || null,
    ip:           req.clientIp || null,
    metodo:       req.method    || null,
    rota:         req.originalUrl || null,
      ...redact(detalhes || {}),
  }
  const text = `${acao} | usuario=${entry.usuario_nome || '-'} | perfil=${entry.perfil || '-'} | rota=${entry.rota || '-'}${detalhes ? ` | ${humanMeta(redact(detalhes))}` : ''}`
  ;(entry as any).text = text
  writeFile(AUDIT_FILE, JSON.stringify(entry))
  if (!IS_PROD) {
    process.stdout.write(
      `${COLORS.bold}${COLORS.http}AUDIT${COLORS.reset} ` +
      `${COLORS.dim}${entry.brt}${COLORS.reset} ` +
      `${text}\n`
    )
  }
}

// ── Middleware HTTP ───────────────────────────────────────────
// Usar em: app.use(logger.middleware)
const middleware = (req: any, res: any, next: any) => {
  const started = Date.now()

  res.on('finish', () => {
    const ms     = Date.now() - started
    const status = res.statusCode
    const level  = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'http'

    emit(level as any, `${req.method} ${req.originalUrl} -> ${status} em ${ms}ms`, {
      status,
      ms,
      ip:      req.clientIp || req.ip,
      usuario: req.user?.id || null,
      perfil:  req.user?.perfil || null,
    })
  })

  next()
}

// ── Leitura de logs para a tela de admin ─────────────────────
export const readLogs = (arquivo: 'app' | 'error' | 'audit', limite = 200) => {
  const file = arquivo === 'error' ? ERR_FILE
             : arquivo === 'audit' ? AUDIT_FILE
             : LOG_FILE
  try {
    const lines = fs.readFileSync(file, 'utf8')
      .split('\n')
      .filter(Boolean)
      .slice(-limite)
      .reverse()
      .map(l => {
        try {
          const parsed = JSON.parse(l)
          return { ...parsed, text: parsed.text || textEntry(parsed.message || parsed.acao || 'Log', parsed.meta, parsed.error) }
        } catch {
          return { level: 'TEXT', message: l, text: l }
        }
      })
    return lines
  } catch {
    return []
  }
}

// ── Exportação ────────────────────────────────────────────────
const logger = {
  debug:      (msg: string, meta?: Record<string, any>) => emit('debug', msg, meta),
  http:       (msg: string, meta?: Record<string, any>) => emit('http',  msg, meta),
  info:       (msg: string, meta?: Record<string, any>) => emit('info',  msg, meta),
  warn:       (msg: string, meta?: Record<string, any>) => emit('warn',  msg, meta),
  error:      (msg: string, err?: any, meta?: Record<string, any>) => emit('error', msg, meta, err),
  audit,
  middleware,
  readLogs,
}

export default logger

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

// ── Config ────────────────────────────────────────────────
const REGION  = process.env.AWS_REGION      || 'us-east-1';
const BUCKET  = process.env.AWS_S3_BUCKET   || 'sep-prontuarios';
const URL_TTL = Number(process.env.S3_URL_TTL_SECONDS) || 900; // 15 min

const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId:     process.env.AWS_ACCESS_KEY_ID     || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

// ── Helpers ───────────────────────────────────────────────

/**
 * Monta a chave do objeto no S3.
 * Estrutura: pacientes/{paciente_id}/{ano}/{uuid}.{ext}
 * Garante isolamento por paciente e organização temporal.
 */
export const buildS3Key = (
  pacienteId: number,
  nomeOriginal: string,
  subfolder?: string
): string => {
  const ano  = new Date().getFullYear();
  const ext  = path.extname(nomeOriginal).toLowerCase().replace(/[^a-z0-9.]/g, '') || '.bin';
  const uuid = uuidv4();
  const base = subfolder ? `pacientes/${pacienteId}/${subfolder}/${ano}` : `pacientes/${pacienteId}/${ano}`;
  return `${base}/${uuid}${ext}`;
};

// ── Upload ────────────────────────────────────────────────

/**
 * Faz upload de um buffer para o S3.
 * O objeto é privado por padrão (sem ACL público).
 * Metadados de auditoria são gravados como tags S3.
 */
export const uploadToS3 = async (params: {
  buffer:       Buffer;
  mimeType:     string;
  pacienteId:   number;
  nomeOriginal: string;
  subfolder?:   string;
  uploadedBy:   number;   // usuario_id
}): Promise<{ key: string; bucket: string; tamanho: number }> => {
  const key = buildS3Key(params.pacienteId, params.nomeOriginal, params.subfolder);

  await s3.send(new PutObjectCommand({
    Bucket:      BUCKET,
    Key:         key,
    Body:        params.buffer,
    ContentType: params.mimeType,
    // Sem ACL — bucket é 100% privado (Block Public Access habilitado)
    Metadata: {
      'paciente-id':    String(params.pacienteId),
      'uploaded-by':    String(params.uploadedBy),
      'nome-original':  params.nomeOriginal,
      'upload-ts':      new Date().toISOString(),
    },
    ServerSideEncryption: 'AES256',   // criptografia em repouso
  }));

  return { key, bucket: BUCKET, tamanho: params.buffer.length };
};

// ── Presigned URL para download ───────────────────────────

/**
 * Gera URL temporária (presigned) para download seguro.
 * A URL expira em S3_URL_TTL_SECONDS (padrão: 15 min).
 * Nunca exponha a chave S3 diretamente ao frontend.
 */
export const getPresignedUrl = async (
  key:        string,
  filename?:  string,
  ttl:        number = URL_TTL
): Promise<string> => {
  const cmd = new GetObjectCommand({
    Bucket: BUCKET,
    Key:    key,
    ...(filename ? {
      ResponseContentDisposition: `attachment; filename="${encodeURIComponent(filename)}"`,
    } : {}),
  });
  return getSignedUrl(s3, cmd, { expiresIn: ttl });
};

// ── Verificar existência ──────────────────────────────────
export const existsOnS3 = async (key: string): Promise<boolean> => {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
};

// ── Soft-delete (marca como excluído, não apaga imediatamente) ──
// O objeto real permanece no S3 por política de retenção.
// A exclusão lógica ocorre no banco (status='excluido').
// Para exclusão física (LGPD direito ao esquecimento), use deleteFromS3.
export const deleteFromS3 = async (key: string): Promise<void> => {
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
};

// ── Validação de mime types permitidos ───────────────────
const ALLOWED_MIMES = new Set([
  'application/pdf',
  'image/jpeg', 'image/png', 'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

export const isMimeAllowed = (mime: string): boolean => ALLOWED_MIMES.has(mime);

export const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

export { BUCKET, REGION };

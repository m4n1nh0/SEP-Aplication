"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.REGION = exports.BUCKET = exports.MAX_FILE_SIZE = exports.isMimeAllowed = exports.deleteFromS3 = exports.existsOnS3 = exports.getPresignedUrl = exports.uploadToS3 = exports.buildS3Key = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const uuid_1 = require("uuid");
const path_1 = __importDefault(require("path"));
// ── Config ────────────────────────────────────────────────
const REGION = process.env.AWS_REGION || 'us-east-1';
exports.REGION = REGION;
const BUCKET = process.env.AWS_S3_BUCKET || 'sep-prontuarios';
exports.BUCKET = BUCKET;
const URL_TTL = Number(process.env.S3_URL_TTL_SECONDS) || 900; // 15 min
const s3 = new client_s3_1.S3Client({
    region: REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
});
// ── Helpers ───────────────────────────────────────────────
/**
 * Monta a chave do objeto no S3.
 * Estrutura: pacientes/{paciente_id}/{ano}/{uuid}.{ext}
 * Garante isolamento por paciente e organização temporal.
 */
const buildS3Key = (pacienteId, nomeOriginal, subfolder) => {
    const ano = new Date().getFullYear();
    const ext = path_1.default.extname(nomeOriginal).toLowerCase().replace(/[^a-z0-9.]/g, '') || '.bin';
    const uuid = (0, uuid_1.v4)();
    const base = subfolder ? `pacientes/${pacienteId}/${subfolder}/${ano}` : `pacientes/${pacienteId}/${ano}`;
    return `${base}/${uuid}${ext}`;
};
exports.buildS3Key = buildS3Key;
// ── Upload ────────────────────────────────────────────────
/**
 * Faz upload de um buffer para o S3.
 * O objeto é privado por padrão (sem ACL público).
 * Metadados de auditoria são gravados como tags S3.
 */
const uploadToS3 = async (params) => {
    const key = (0, exports.buildS3Key)(params.pacienteId, params.nomeOriginal, params.subfolder);
    await s3.send(new client_s3_1.PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: params.buffer,
        ContentType: params.mimeType,
        // Sem ACL — bucket é 100% privado (Block Public Access habilitado)
        Metadata: {
            'paciente-id': String(params.pacienteId),
            'uploaded-by': String(params.uploadedBy),
            'nome-original': params.nomeOriginal,
            'upload-ts': new Date().toISOString(),
        },
        ServerSideEncryption: 'AES256', // criptografia em repouso
    }));
    return { key, bucket: BUCKET, tamanho: params.buffer.length };
};
exports.uploadToS3 = uploadToS3;
// ── Presigned URL para download ───────────────────────────
/**
 * Gera URL temporária (presigned) para download seguro.
 * A URL expira em S3_URL_TTL_SECONDS (padrão: 15 min).
 * Nunca exponha a chave S3 diretamente ao frontend.
 */
const getPresignedUrl = async (key, filename, ttl = URL_TTL) => {
    const cmd = new client_s3_1.GetObjectCommand({
        Bucket: BUCKET,
        Key: key,
        ...(filename ? {
            ResponseContentDisposition: `attachment; filename="${encodeURIComponent(filename)}"`,
        } : {}),
    });
    return (0, s3_request_presigner_1.getSignedUrl)(s3, cmd, { expiresIn: ttl });
};
exports.getPresignedUrl = getPresignedUrl;
// ── Verificar existência ──────────────────────────────────
const existsOnS3 = async (key) => {
    try {
        await s3.send(new client_s3_1.HeadObjectCommand({ Bucket: BUCKET, Key: key }));
        return true;
    }
    catch {
        return false;
    }
};
exports.existsOnS3 = existsOnS3;
// ── Soft-delete (marca como excluído, não apaga imediatamente) ──
// O objeto real permanece no S3 por política de retenção.
// A exclusão lógica ocorre no banco (status='excluido').
// Para exclusão física (LGPD direito ao esquecimento), use deleteFromS3.
const deleteFromS3 = async (key) => {
    await s3.send(new client_s3_1.DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
};
exports.deleteFromS3 = deleteFromS3;
// ── Validação de mime types permitidos ───────────────────
const ALLOWED_MIMES = new Set([
    'application/pdf',
    'image/jpeg', 'image/png', 'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);
const isMimeAllowed = (mime) => ALLOWED_MIMES.has(mime);
exports.isMimeAllowed = isMimeAllowed;
exports.MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

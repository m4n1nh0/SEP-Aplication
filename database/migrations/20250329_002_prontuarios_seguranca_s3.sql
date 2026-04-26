-- Migration: 20250329_002_prontuarios_seguranca_s3.sql
-- Adiciona: vínculos estagiário-paciente, auditoria LGPD,
--           tabela documentos (S3), alta clínica.
-- Safe: tudo com IF NOT EXISTS.

SET NAMES utf8mb4;

-- ── Vínculos estagiário-paciente ──────────────────────────
-- Controla quem tem acesso a prontuários de cada paciente
CREATE TABLE IF NOT EXISTS vinculos_estagiario_paciente (
  id                   INT AUTO_INCREMENT PRIMARY KEY,
  paciente_id          INT NOT NULL,
  estagiario_id        INT NOT NULL,
  ativo                TINYINT(1) NOT NULL DEFAULT 1,
  data_inicio          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  data_fim             DATETIME,
  motivo_transferencia TEXT,
  transferido_por      INT,
  criado_em            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (paciente_id)    REFERENCES pacientes(id),
  FOREIGN KEY (estagiario_id)  REFERENCES estagiarios(id),
  FOREIGN KEY (transferido_por) REFERENCES usuarios(id),
  INDEX idx_paciente_ativo   (paciente_id, ativo),
  INDEX idx_estagiario_ativo (estagiario_id, ativo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Auditoria LGPD ────────────────────────────────────────
-- Rastreia todo acesso a prontuários (quem, quando, o quê)
CREATE TABLE IF NOT EXISTS audit_prontuarios (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  prontuario_id INT,
  paciente_id   INT NOT NULL,
  usuario_id    INT NOT NULL,
  acao          ENUM('visualizou','editou','criou','baixou_arquivo','excluiu') NOT NULL,
  ip            VARCHAR(60),
  user_agent    VARCHAR(500),
  detalhes      TEXT,
  criado_em     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (prontuario_id) REFERENCES prontuarios(id) ON DELETE SET NULL,
  FOREIGN KEY (paciente_id)   REFERENCES pacientes(id),
  FOREIGN KEY (usuario_id)    REFERENCES usuarios(id),
  INDEX idx_paciente (paciente_id),
  INDEX idx_usuario  (usuario_id),
  INDEX idx_data     (criado_em)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Documentos no S3 ──────────────────────────────────────
-- Metadados dos arquivos armazenados no AWS S3
-- O arquivo físico fica no bucket; aqui ficam ponteiro + metadados
CREATE TABLE IF NOT EXISTS documentos (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  paciente_id   INT NOT NULL,
  estagiario_id INT,
  prontuario_id INT,
  tipo          ENUM('prontuario','laudo','receita','exame','consentimento','outro') NOT NULL DEFAULT 'outro',
  nome_original VARCHAR(500) NOT NULL,
  s3_key        VARCHAR(1000) NOT NULL,
  s3_bucket     VARCHAR(255) NOT NULL,
  mime_type     VARCHAR(100),
  tamanho_bytes BIGINT,
  descricao     TEXT,
  status        ENUM('ativo','excluido') NOT NULL DEFAULT 'ativo',
  enviado_por   INT NOT NULL,
  criado_em     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  excluido_em   DATETIME,
  excluido_por  INT,
  FOREIGN KEY (paciente_id)   REFERENCES pacientes(id),
  FOREIGN KEY (estagiario_id) REFERENCES estagiarios(id),
  FOREIGN KEY (prontuario_id) REFERENCES prontuarios(id),
  FOREIGN KEY (enviado_por)   REFERENCES usuarios(id),
  INDEX idx_paciente   (paciente_id),
  INDEX idx_prontuario (prontuario_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Alta clínica ──────────────────────────────────────────
-- Encerramento formal do atendimento com aprovação do supervisor
CREATE TABLE IF NOT EXISTS altas_clinicas (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  paciente_id      INT NOT NULL UNIQUE,
  estagiario_id    INT NOT NULL,
  supervisor_id    INT,
  data_alta        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  total_sessoes    INT NOT NULL DEFAULT 0,
  motivo_alta      ENUM('objetivo_alcancado','abandono','encaminhamento','desistencia','outro') NOT NULL,
  resumo_caso      TEXT,
  recomendacoes    TEXT,
  status_aprovacao ENUM('pendente','aprovada','rejeitada') NOT NULL DEFAULT 'pendente',
  obs_supervisor   TEXT,
  documento_s3_key VARCHAR(1000),
  criado_em        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em    DATETIME ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (paciente_id)   REFERENCES pacientes(id),
  FOREIGN KEY (estagiario_id) REFERENCES estagiarios(id),
  FOREIGN KEY (supervisor_id) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

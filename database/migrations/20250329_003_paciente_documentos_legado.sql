-- Migration: 20250329_003_paciente_documentos_legado.sql
-- Mantém a tabela paciente_documentos para bancos que vieram do schema antigo.
-- Em bancos novos ela não existirá — tudo usa a tabela 'documentos'.
-- Safe: IF NOT EXISTS.

SET NAMES utf8mb4;

-- Tabela legada — mantida apenas para compatibilidade de upgrade
-- Novos uploads vão para 'documentos' (S3)
CREATE TABLE IF NOT EXISTS paciente_documentos (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  paciente_id  INT NOT NULL,
  tipo         VARCHAR(50) NOT NULL DEFAULT 'outros',
  nome_arquivo VARCHAR(255) NOT NULL,
  path_arquivo VARCHAR(500),
  mime_type    VARCHAR(100),
  tamanho_kb   INT,
  status       ENUM('pendente','aprovado','rejeitado') DEFAULT 'pendente',
  obs_admin    TEXT,
  revisado_por INT,
  revisado_em  DATETIME,
  criado_em    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (paciente_id) REFERENCES pacientes(id),
  FOREIGN KEY (revisado_por) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Migration: recuperação de senha
-- Cria a tabela para tokens de recuperação de senha

CREATE TABLE IF NOT EXISTS recuperacao_senha (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id   INT NOT NULL,
  token        VARCHAR(128) NOT NULL UNIQUE,
  expira_em    DATETIME NOT NULL,
  usado        TINYINT(1) NOT NULL DEFAULT 0,
  criado_em    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  INDEX idx_token (token),
  INDEX idx_usuario (usuario_id)
);

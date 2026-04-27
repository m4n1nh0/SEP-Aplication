-- Migration: 20250329_004_perfil_coordenador_supervisor.sql
-- Separa 'supervisor' (que era o admin) em dois perfis distintos:
--   coordenador = coordenador do curso de psicologia (antigo 'supervisor')
--   supervisor  = professor/docente responsável pelos estagiários (NOVO)
--
-- IMPORTANTE: Executa ANTES de alterar o código da aplicação.
-- Renomeia os usuários existentes com perfil='supervisor' para 'coordenador'.

SET NAMES utf8mb4;

-- 1. Renomeia os supervisores atuais para coordenador
--    (todos que eram 'supervisor' eram na verdade o coordenador/admin)
UPDATE usuarios SET perfil='coordenador' WHERE perfil='supervisor';

-- 2. Altera o ENUM adicionando coordenador e mantendo supervisor
ALTER TABLE usuarios
  MODIFY COLUMN perfil
    ENUM('coordenador','supervisor','recepcionista','estagiario','paciente')
    NOT NULL;

-- 3. Atualiza o canal do historico_status para refletir novo perfil
ALTER TABLE historico_status
  MODIFY COLUMN canal
    ENUM('coordenador','supervisor','recepcionista','estagiario','paciente','sistema')
    DEFAULT 'sistema';

-- 4. Cria tabela de vínculo supervisor-estagiário
--    (supervisor acompanha um grupo de estagiários)
CREATE TABLE IF NOT EXISTS vinculos_supervisor_estagiario (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  supervisor_id INT NOT NULL,   -- usuario_id do supervisor
  estagiario_id INT NOT NULL,   -- id da tabela estagiarios
  ativo         TINYINT(1) NOT NULL DEFAULT 1,
  data_inicio   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  data_fim      DATETIME,
  obs           TEXT,
  criado_por    INT,
  criado_em     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (supervisor_id) REFERENCES usuarios(id),
  FOREIGN KEY (estagiario_id) REFERENCES estagiarios(id),
  FOREIGN KEY (criado_por)    REFERENCES usuarios(id),
  UNIQUE KEY uq_sup_est_ativo (supervisor_id, estagiario_id, ativo),
  INDEX idx_supervisor (supervisor_id),
  INDEX idx_estagiario (estagiario_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Atualiza campo supervisor nos estagiarios
--    (vai passar a ser referência ao usuario_id do supervisor)
--    Execução direta — a tabela _migrations garante que este arquivo roda apenas uma vez
ALTER TABLE estagiarios ADD COLUMN supervisor_id INT NULL;
ALTER TABLE estagiarios ADD CONSTRAINT fk_est_supervisor FOREIGN KEY (supervisor_id) REFERENCES usuarios(id);
ALTER TABLE estagiarios ADD INDEX idx_supervisor_id (supervisor_id);

-- 6. Configurações de domínios institucionais

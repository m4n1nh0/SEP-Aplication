-- ================================================================
-- SEP Sistema v3 — Estácio Aracaju
-- schema.sql — APENAS ESTRUTURA (sem dados)
-- Para popular: npm run db:seed
-- ================================================================

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

CREATE DATABASE IF NOT EXISTS sep_db
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE sep_db;

CREATE TABLE IF NOT EXISTS usuarios (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  nome                VARCHAR(150)  NOT NULL,
  email               VARCHAR(150)  NOT NULL UNIQUE,
  senha_hash          VARCHAR(255)  NOT NULL,
  perfil              ENUM('coordenador','supervisor','recepcionista','estagiario','paciente') NOT NULL,
  status_conta        ENUM('pendente_email','ativo','bloqueado','suspenso') NOT NULL DEFAULT 'pendente_email',
  email_token         VARCHAR(128)  UNIQUE,
  email_verificado    TINYINT(1)    NOT NULL DEFAULT 0,
  email_verificado_em DATETIME,
  senha_alterada_em   DATETIME,
  force_reset_senha   TINYINT(1)    NOT NULL DEFAULT 0,
  tentativas_login    TINYINT       NOT NULL DEFAULT 0,
  bloqueado_ate       DATETIME,
  totp_secret         VARCHAR(64),
  totp_ativo          TINYINT(1)    NOT NULL DEFAULT 0,
  ultimo_login_em     DATETIME,
  ultimo_login_ip     VARCHAR(45),
  criado_em           DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em       DATETIME      ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email  (email),
  INDEX idx_perfil (perfil),
  INDEX idx_status (status_conta)
);

CREATE TABLE IF NOT EXISTS sessoes (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id   INT         NOT NULL,
  token_hash   VARCHAR(64) NOT NULL UNIQUE,
  ip           VARCHAR(45),
  user_agent   VARCHAR(500),
  dispositivo  VARCHAR(100),
  ativo        TINYINT(1)  NOT NULL DEFAULT 1,
  expira_em    DATETIME    NOT NULL,
  criado_em    DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  encerrado_em DATETIME,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  INDEX idx_usuario (usuario_id),
  INDEX idx_token   (token_hash),
  INDEX idx_ativo   (ativo)
);

CREATE TABLE IF NOT EXISTS logs_seguranca (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT,
  evento     ENUM('login_ok','login_falhou','logout','senha_alterada','email_verificado','conta_bloqueada','conta_desbloqueada','totp_ativado','totp_desativado','sessao_revogada','cadastro','tentativa_suspeita','reset_senha') NOT NULL,
  ip         VARCHAR(45),
  user_agent VARCHAR(500),
  detalhe    TEXT,
  criado_em  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  INDEX idx_usuario (usuario_id),
  INDEX idx_evento  (evento),
  INDEX idx_criado  (criado_em)
);

CREATE TABLE IF NOT EXISTS estagiarios (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id    INT         NOT NULL UNIQUE,
  matricula     VARCHAR(30) NOT NULL UNIQUE,
  telefone      VARCHAR(20),
  semestre      INT,
  supervisor    VARCHAR(150),
  supervisor_id INT,                           -- FK para usuario com perfil supervisor
  ativo         TINYINT(1)  NOT NULL DEFAULT 1,
  criado_em     DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME    ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

CREATE TABLE IF NOT EXISTS estagiario_slots (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  estagiario_id INT  NOT NULL,
  dia_semana    ENUM('seg','ter','qua','qui','sex','sab') NOT NULL,
  hora_inicio   TIME NOT NULL,
  hora_fim      TIME NOT NULL,
  turno         ENUM('diurno','noturno') GENERATED ALWAYS AS (IF(HOUR(hora_inicio) < 18, 'diurno', 'noturno')) STORED,
  status        ENUM('pendente','aprovado','rejeitado') NOT NULL DEFAULT 'pendente',
  obs_admin     VARCHAR(255),
  criado_em     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (estagiario_id) REFERENCES estagiarios(id),
  INDEX idx_est_dia (estagiario_id, dia_semana),
  INDEX idx_status  (status)
);

CREATE TABLE IF NOT EXISTS pacientes (
  id                     INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id             INT UNIQUE,
  nome                   VARCHAR(150) NOT NULL,
  cpf                    VARCHAR(11)  NOT NULL UNIQUE,
  email                  VARCHAR(150),
  telefone               VARCHAR(20)  NOT NULL,
  whatsapp               VARCHAR(20),
  contato_emergencia     VARCHAR(20),
  nome_emergencia        VARCHAR(150),
  data_nascimento        DATE,
  genero                 ENUM('masculino','feminino','nao_binario','outro','prefiro_nao_dizer'),
  escolaridade           ENUM('fundamental_incompleto','fundamental_completo','medio_incompleto','medio_completo','superior_incompleto','superior_completo','pos_graduacao'),
  ocupacao               VARCHAR(100),
  renda_familiar         ENUM('ate_1sm','1_a_2sm','2_a_3sm','3_a_5sm','acima_5sm'),
  endereco               VARCHAR(255),
  bairro                 VARCHAR(100),
  motivo_busca           TEXT         NOT NULL,
  tempo_sintomas         ENUM('menos_1mes','1_a_3meses','3_a_6meses','6_a_12meses','mais_1ano'),
  intensidade_sintomas   ENUM('leve','moderado','intenso','muito_intenso'),
  impacto_vida           TEXT,
  ja_fez_terapia         TINYINT(1)   DEFAULT 0,
  tempo_terapia_anterior VARCHAR(100),
  uso_medicamento        TINYINT(1)   DEFAULT 0,
  medicamento_desc       VARCHAR(255),
  medicamento_psiquiatra TINYINT(1)   DEFAULT 0,
  historico_internacao   TINYINT(1)   DEFAULT 0,
  suporte_social         ENUM('nenhum','pouco','moderado','bom'),
  risco_suicidio         TINYINT(1)   DEFAULT 0,
  risco_desc             TEXT,
  outras_informacoes     TEXT,
  disponibilidade        JSON,
  status                 ENUM('triagem_pendente','triagem_aprovada','aguardando','em_contato','agendado','em_atendimento','alta','cancelado','desistencia') NOT NULL DEFAULT 'triagem_pendente',
  urgencia               ENUM('muito_urgente','urgente','pouco_urgente','sem_urgencia') NOT NULL DEFAULT 'sem_urgencia',
  triagem_admin_id       INT,
  triagem_obs            TEXT,
  triagem_em             DATETIME,
  timestamp_cadastro     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  estagiario_id          INT,
  criado_em              DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em          DATETIME     ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id)       REFERENCES usuarios(id),
  FOREIGN KEY (estagiario_id)    REFERENCES estagiarios(id),
  FOREIGN KEY (triagem_admin_id) REFERENCES usuarios(id),
  INDEX idx_status    (status),
  INDEX idx_urgencia  (urgencia),
  INDEX idx_cpf       (cpf),
  INDEX idx_timestamp (timestamp_cadastro)
);

CREATE TABLE IF NOT EXISTS paciente_documentos (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  paciente_id  INT          NOT NULL,
  tipo         ENUM('rg','cpf_doc','comprovante_renda','comprovante_residencia','encaminhamento_medico','laudo','outros') NOT NULL,
  nome_arquivo VARCHAR(255) NOT NULL,
  path_arquivo VARCHAR(500) NOT NULL,
  mime_type    VARCHAR(100),
  tamanho_kb   INT,
  status       ENUM('pendente','aprovado','rejeitado') NOT NULL DEFAULT 'pendente',
  obs_admin    TEXT,
  revisado_por INT,
  revisado_em  DATETIME,
  criado_em    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (paciente_id)  REFERENCES pacientes(id) ON DELETE CASCADE,
  FOREIGN KEY (revisado_por) REFERENCES usuarios(id),
  INDEX idx_paciente (paciente_id),
  INDEX idx_status   (status)
);

CREATE TABLE IF NOT EXISTS agendamentos (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  paciente_id      INT NOT NULL,
  estagiario_id    INT NOT NULL,
  slot_id          INT,
  data_hora_inicio DATETIME NOT NULL,
  data_hora_fim    DATETIME NOT NULL,
  status           ENUM('pendente','confirmado','realizado','cancelado_paciente','cancelado_admin','faltou') NOT NULL DEFAULT 'pendente',
  modalidade       ENUM('presencial','online') NOT NULL DEFAULT 'presencial',
  sala             VARCHAR(50),
  link_online      VARCHAR(500),
  notas_admin      TEXT,
  notas_estagiario TEXT,
  sessao_numero    INT      DEFAULT 1,
  criado_por       INT,
  criado_em        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em    DATETIME ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (paciente_id)   REFERENCES pacientes(id),
  FOREIGN KEY (estagiario_id) REFERENCES estagiarios(id),
  FOREIGN KEY (slot_id)       REFERENCES estagiario_slots(id),
  FOREIGN KEY (criado_por)    REFERENCES usuarios(id),
  INDEX idx_data       (data_hora_inicio),
  INDEX idx_paciente   (paciente_id),
  INDEX idx_estagiario (estagiario_id)
);

CREATE TABLE IF NOT EXISTS prontuarios (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  agendamento_id   INT  NOT NULL UNIQUE,
  paciente_id      INT  NOT NULL,
  estagiario_id    INT  NOT NULL,
  sessao_numero    INT  NOT NULL,
  data_sessao      DATE NOT NULL,
  queixa_principal TEXT,
  descricao_sessao TEXT,
  intervencoes     TEXT,
  evolucao         TEXT,
  plano_proxima    TEXT,
  arquivo_path     VARCHAR(500),
  criado_em        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em    DATETIME ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (agendamento_id) REFERENCES agendamentos(id),
  FOREIGN KEY (paciente_id)    REFERENCES pacientes(id),
  FOREIGN KEY (estagiario_id)  REFERENCES estagiarios(id)
);

CREATE TABLE IF NOT EXISTS historico_status (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  paciente_id     INT NOT NULL,
  status_anterior VARCHAR(50),
  status_novo     VARCHAR(50) NOT NULL,
  usuario_id      INT,
  canal           ENUM('coordenador','supervisor','recepcionista','estagiario','paciente','sistema') DEFAULT 'sistema',
  observacao      TEXT,
  criado_em       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (paciente_id) REFERENCES pacientes(id),
  FOREIGN KEY (usuario_id)  REFERENCES usuarios(id)
);

CREATE TABLE IF NOT EXISTS notificacoes (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  paciente_id INT NOT NULL,
  tipo        ENUM('ligacao','whatsapp','email','sistema') NOT NULL,
  assunto     VARCHAR(255),
  mensagem    TEXT,
  status      ENUM('enviado','falhou','pendente') DEFAULT 'pendente',
  usuario_id  INT,
  criado_em   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (paciente_id) REFERENCES pacientes(id),
  FOREIGN KEY (usuario_id)  REFERENCES usuarios(id)
);

-- ----------------------------------------------------------------
-- CONFIGURAÇÕES DO SEP — capacidade por horário
-- Controla quantos estagiários podem atender no mesmo horário
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sep_config (
  chave    VARCHAR(100) PRIMARY KEY,
  valor    VARCHAR(255) NOT NULL,
  descricao VARCHAR(500),
  atualizado_em DATETIME ON UPDATE CURRENT_TIMESTAMP
);

-- Valor padrão: 2 estagiários por turno (diurno/noturno), por dia
INSERT IGNORE INTO sep_config (chave, valor, descricao) VALUES
  ('max_estagiarios_diurno',  '2', 'Máximo de estagiários aprovados no turno diurno (08h-18h) por dia'),
  ('max_estagiarios_noturno', '2', 'Máximo de estagiários aprovados no turno noturno (18h+) por dia'),
  ('max_estagiarios_slot',    '1', 'Máximo de estagiários no MESMO horário exato (mesmo dia+hora_inicio)'),
  ('max_faltas_desligamento', '3', 'Número de faltas para desligamento automático do paciente do programa de atendimentos'),
  ('salas_disponiveis',       'Sala 1,Sala 2,Sala 3,Sala 4,Sala 5,Sala Online', 'Salas disponíveis para agendamento, separadas por vírgula');

-- ----------------------------------------------------------------
-- VÍNCULOS ESTAGIÁRIO-PACIENTE (controle de acesso a prontuários)
-- Registra quem está autorizado agora e o histórico completo
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vinculos_estagiario_paciente (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  paciente_id     INT NOT NULL,
  estagiario_id   INT NOT NULL,
  ativo           TINYINT(1) NOT NULL DEFAULT 1,
  data_inicio     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  data_fim        DATETIME,
  motivo_transferencia TEXT,
  transferido_por INT,                         -- usuario_id de quem fez a transferência
  criado_em       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (paciente_id)   REFERENCES pacientes(id),
  FOREIGN KEY (estagiario_id) REFERENCES estagiarios(id),
  FOREIGN KEY (transferido_por) REFERENCES usuarios(id),
  INDEX idx_paciente_ativo (paciente_id, ativo),
  INDEX idx_estagiario_ativo (estagiario_id, ativo)
);

-- ----------------------------------------------------------------
-- AUDITORIA DE ACESSO A PRONTUÁRIOS (LGPD — rastreabilidade)
-- Registra toda visualização, edição ou download de prontuário
-- ----------------------------------------------------------------
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
);

-- ----------------------------------------------------------------
-- DOCUMENTOS S3 (metadados dos arquivos no bucket)
-- O arquivo real fica no S3; aqui ficam os metadados e controle
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS documentos (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  paciente_id   INT NOT NULL,
  estagiario_id INT,                           -- null = documento do paciente via portal
  prontuario_id INT,                           -- null = documento avulso
  tipo          ENUM('prontuario','laudo','receita','exame','consentimento','outro') NOT NULL DEFAULT 'outro',
  nome_original VARCHAR(500) NOT NULL,
  s3_key        VARCHAR(1000) NOT NULL,        -- caminho completo no bucket
  s3_bucket     VARCHAR(255) NOT NULL,
  mime_type     VARCHAR(100),
  tamanho_bytes BIGINT,
  descricao     TEXT,
  status        ENUM('ativo','excluido') NOT NULL DEFAULT 'ativo',
  enviado_por   INT NOT NULL,                  -- usuario_id
  criado_em     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  excluido_em   DATETIME,
  excluido_por  INT,
  FOREIGN KEY (paciente_id)   REFERENCES pacientes(id),
  FOREIGN KEY (estagiario_id) REFERENCES estagiarios(id),
  FOREIGN KEY (prontuario_id) REFERENCES prontuarios(id),
  FOREIGN KEY (enviado_por)   REFERENCES usuarios(id),
  INDEX idx_paciente     (paciente_id),
  INDEX idx_prontuario   (prontuario_id)
);

-- ----------------------------------------------------------------
-- ALTA CLÍNICA (encerramento formal do atendimento)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS altas_clinicas (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  paciente_id     INT NOT NULL UNIQUE,         -- um paciente tem no máx uma alta ativa
  estagiario_id   INT NOT NULL,                -- estagiário que deu a alta
  supervisor_id   INT,                         -- usuario_id do supervisor que autorizou
  data_alta       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  total_sessoes   INT NOT NULL DEFAULT 0,
  motivo_alta     ENUM('objetivo_alcancado','abandono','encaminhamento','desistencia','outro') NOT NULL,
  resumo_caso     TEXT,
  recomendacoes   TEXT,
  status_aprovacao ENUM('pendente','aprovada','rejeitada') NOT NULL DEFAULT 'pendente',
  obs_supervisor  TEXT,
  documento_s3_key VARCHAR(1000),             -- PDF da alta gerado
  criado_em       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em   DATETIME ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (paciente_id)   REFERENCES pacientes(id),
  FOREIGN KEY (estagiario_id) REFERENCES estagiarios(id),
  FOREIGN KEY (supervisor_id) REFERENCES usuarios(id)
);

-- ----------------------------------------------------------------
-- VÍNCULOS SUPERVISOR → ESTAGIÁRIO
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vinculos_supervisor_estagiario (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  supervisor_id INT NOT NULL,
  estagiario_id INT NOT NULL,
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

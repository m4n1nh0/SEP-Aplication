-- Migration: 20250329_001_schema_base.sql
-- Cria todas as tabelas base do SEP v3.
-- Safe: usa IF NOT EXISTS em tudo — não quebra se já existir.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS usuarios (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  nome            VARCHAR(200) NOT NULL,
  email           VARCHAR(200) NOT NULL UNIQUE,
  senha_hash      VARCHAR(255) NOT NULL,
  perfil          ENUM('supervisor','recepcionista','estagiario','paciente') NOT NULL,
  status_conta    ENUM('ativo','inativo','bloqueado') NOT NULL DEFAULT 'ativo',
  email_verificado TINYINT(1) NOT NULL DEFAULT 0,
  email_token     VARCHAR(100),
  totp_secret     VARCHAR(100),
  totp_ativo      TINYINT(1) NOT NULL DEFAULT 0,
  tentativas_login INT NOT NULL DEFAULT 0,
  bloqueado_ate   DATETIME,
  criado_em       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em   DATETIME ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sessoes (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id  INT NOT NULL,
  token_hash  VARCHAR(100) NOT NULL UNIQUE,
  ip          VARCHAR(60),
  user_agent  VARCHAR(500),
  criado_em   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expira_em   DATETIME NOT NULL,
  ativo       TINYINT(1) NOT NULL DEFAULT 1,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  INDEX idx_token (token_hash),
  INDEX idx_usuario (usuario_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS logs_seguranca (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id  INT,
  acao        VARCHAR(100) NOT NULL,
  ip          VARCHAR(60),
  user_agent  VARCHAR(500),
  detalhes    TEXT,
  criado_em   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  INDEX idx_usuario (usuario_id),
  INDEX idx_criado  (criado_em)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS estagiarios (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id  INT NOT NULL UNIQUE,
  matricula   VARCHAR(50) NOT NULL UNIQUE,
  semestre    VARCHAR(20),
  supervisor  VARCHAR(200),
  ativo       TINYINT(1) NOT NULL DEFAULT 1,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS estagiario_slots (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  estagiario_id   INT NOT NULL,
  dia_semana      ENUM('seg','ter','qua','qui','sex','sab') NOT NULL,
  hora_inicio     TIME NOT NULL,
  hora_fim        TIME NOT NULL,
  turno           ENUM('diurno','noturno') NOT NULL DEFAULT 'diurno',
  status          ENUM('pendente','aprovado','rejeitado') NOT NULL DEFAULT 'pendente',
  obs_admin       TEXT,
  criado_em       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em   DATETIME ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (estagiario_id) REFERENCES estagiarios(id),
  INDEX idx_estagiario (estagiario_id),
  INDEX idx_status     (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS pacientes (
  id                    INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id            INT UNIQUE,
  nome                  VARCHAR(200) NOT NULL,
  cpf                   VARCHAR(14) NOT NULL UNIQUE,
  email                 VARCHAR(200),
  telefone              VARCHAR(20) NOT NULL,
  whatsapp              VARCHAR(20),
  contato_emergencia    VARCHAR(20),
  nome_emergencia       VARCHAR(150),
  data_nascimento       DATE,
  genero                ENUM('masculino','feminino','nao_binario','outro','prefiro_nao_informar'),
  escolaridade          ENUM('fundamental','medio','tecnico','superior','pos_graduacao','nao_informado'),
  ocupacao              VARCHAR(200),
  renda_familiar        ENUM('ate_1sm','1_a_2sm','2_a_3sm','3_a_5sm','acima_5sm'),
  endereco              VARCHAR(300),
  bairro                VARCHAR(100),
  motivo_busca          TEXT NOT NULL,
  tempo_sintomas        ENUM('menos_1mes','1_a_3meses','3_a_6meses','6_a_12meses','mais_1ano'),
  intensidade_sintomas  ENUM('leve','moderado','intenso','muito_intenso'),
  impacto_vida          TEXT,
  ja_fez_terapia        TINYINT(1) DEFAULT 0,
  uso_medicamento       TINYINT(1) DEFAULT 0,
  medicamento_desc      TEXT,
  medicamento_psiquiatra TINYINT(1) DEFAULT 0,
  historico_internacao  TINYINT(1) DEFAULT 0,
  suporte_social        ENUM('nenhum','pouco','moderado','bom'),
  risco_suicidio        TINYINT(1) DEFAULT 0,
  risco_desc            TEXT,
  outras_informacoes    TEXT,
  urgencia              ENUM('muito_urgente','urgente','pouco_urgente','sem_urgencia') NOT NULL DEFAULT 'sem_urgencia',
  status                ENUM('triagem_pendente','aguardando','em_contato','agendado','em_atendimento','alta','cancelado','desistencia') NOT NULL DEFAULT 'triagem_pendente',
  disponibilidade       JSON,
  estagiario_id         INT,
  triagem_admin_id      INT,
  triagem_obs           TEXT,
  triagem_em            DATETIME,
  timestamp_cadastro    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em         DATETIME ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id)       REFERENCES usuarios(id),
  FOREIGN KEY (estagiario_id)    REFERENCES estagiarios(id),
  FOREIGN KEY (triagem_admin_id) REFERENCES usuarios(id),
  INDEX idx_status   (status),
  INDEX idx_urgencia (urgencia),
  INDEX idx_cpf      (cpf)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
  sessao_numero    INT NOT NULL DEFAULT 1,
  criado_por       INT,
  criado_em        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em    DATETIME ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (paciente_id)   REFERENCES pacientes(id),
  FOREIGN KEY (estagiario_id) REFERENCES estagiarios(id),
  FOREIGN KEY (slot_id)       REFERENCES estagiario_slots(id) ON DELETE SET NULL,
  FOREIGN KEY (criado_por)    REFERENCES usuarios(id),
  INDEX idx_paciente   (paciente_id),
  INDEX idx_estagiario (estagiario_id),
  INDEX idx_data       (data_hora_inicio)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS prontuarios (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  agendamento_id   INT NOT NULL UNIQUE,
  paciente_id      INT NOT NULL,
  estagiario_id    INT NOT NULL,
  sessao_numero    INT NOT NULL DEFAULT 1,
  data_sessao      DATE NOT NULL,
  queixa_principal TEXT,
  descricao_sessao TEXT,
  intervencoes     TEXT,
  evolucao         TEXT,
  plano_proxima    TEXT,
  criado_em        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em    DATETIME ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (agendamento_id) REFERENCES agendamentos(id),
  FOREIGN KEY (paciente_id)    REFERENCES pacientes(id),
  FOREIGN KEY (estagiario_id)  REFERENCES estagiarios(id),
  INDEX idx_paciente   (paciente_id),
  INDEX idx_estagiario (estagiario_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS historico_status (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  paciente_id     INT NOT NULL,
  status_anterior VARCHAR(50),
  status_novo     VARCHAR(50) NOT NULL,
  usuario_id      INT,
  canal           ENUM('supervisor','recepcionista','estagiario','paciente','sistema') DEFAULT 'sistema',
  observacao      TEXT,
  criado_em       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (paciente_id) REFERENCES pacientes(id),
  FOREIGN KEY (usuario_id)  REFERENCES usuarios(id),
  INDEX idx_paciente (paciente_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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
  FOREIGN KEY (usuario_id)  REFERENCES usuarios(id),
  INDEX idx_paciente (paciente_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sep_config (
  chave         VARCHAR(100) PRIMARY KEY,
  valor         VARCHAR(255) NOT NULL,
  descricao     VARCHAR(500),
  atualizado_em DATETIME ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO sep_config (chave, valor, descricao) VALUES
  ('max_estagiarios_diurno',  '2', 'Máx. de estagiários no turno diurno por dia'),
  ('max_estagiarios_noturno', '2', 'Máx. de estagiários no turno noturno por dia'),
  ('max_estagiarios_slot',    '1', 'Máx. de estagiários no mesmo horário exato'),
  ('max_faltas_desligamento', '3', 'Número de faltas para desligamento automático do paciente'),
  ('salas_disponiveis',       'Sala 1,Sala 2,Sala 3,Sala 4,Sala 5,Sala Online', 'Salas disponíveis para agendamento, separadas por vírgula');

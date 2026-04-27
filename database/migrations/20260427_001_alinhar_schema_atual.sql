-- Migration: 20260427_001_alinhar_schema_atual.sql
-- Alinha bancos criados pelas migrations antigas ao schema atual usado pelo codigo e pelos seeds.

SET NAMES utf8mb4;

-- usuarios
ALTER TABLE usuarios
  MODIFY COLUMN status_conta ENUM('pendente_email','ativo','bloqueado','suspenso') NOT NULL DEFAULT 'pendente_email';

ALTER TABLE usuarios
  MODIFY COLUMN email_token VARCHAR(128) UNIQUE;

ALTER TABLE usuarios
  ADD COLUMN email_verificado_em DATETIME NULL AFTER email_verificado,
  ADD COLUMN senha_alterada_em DATETIME NULL AFTER email_verificado_em,
  ADD COLUMN force_reset_senha TINYINT(1) NOT NULL DEFAULT 0 AFTER senha_alterada_em,
  ADD COLUMN ultimo_login_em DATETIME NULL AFTER totp_ativo,
  ADD COLUMN ultimo_login_ip VARCHAR(45) NULL AFTER ultimo_login_em;

-- sessoes
ALTER TABLE sessoes
  ADD COLUMN dispositivo VARCHAR(100) NULL AFTER user_agent,
  ADD COLUMN encerrado_em DATETIME NULL AFTER criado_em;

-- logs_seguranca
ALTER TABLE logs_seguranca
  CHANGE COLUMN acao evento ENUM(
    'login_ok','login_falhou','logout','senha_alterada','email_verificado',
    'conta_bloqueada','conta_desbloqueada','totp_ativado','totp_desativado',
    'sessao_revogada','cadastro','tentativa_suspeita','reset_senha'
  ) NOT NULL,
  CHANGE COLUMN detalhes detalhe TEXT;

ALTER TABLE logs_seguranca
  ADD INDEX idx_evento (evento);

-- estagiarios
ALTER TABLE estagiarios
  ADD COLUMN telefone VARCHAR(20) NULL AFTER matricula,
  MODIFY COLUMN semestre INT NULL,
  ADD COLUMN atualizado_em DATETIME ON UPDATE CURRENT_TIMESTAMP;

-- pacientes
ALTER TABLE pacientes
  MODIFY COLUMN cpf VARCHAR(11) NOT NULL UNIQUE,
  MODIFY COLUMN genero ENUM('masculino','feminino','nao_binario','outro','prefiro_nao_dizer'),
  MODIFY COLUMN escolaridade ENUM(
    'fundamental_incompleto','fundamental_completo',
    'medio_incompleto','medio_completo',
    'superior_incompleto','superior_completo','pos_graduacao'
  ),
  MODIFY COLUMN status ENUM(
    'triagem_pendente','triagem_aprovada','aguardando','em_contato',
    'agendado','em_atendimento','alta','cancelado','desistencia'
  ) NOT NULL DEFAULT 'triagem_pendente',
  ADD COLUMN tempo_terapia_anterior VARCHAR(100) NULL AFTER ja_fez_terapia,
  ADD COLUMN criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER estagiario_id;

-- agendamentos/prontuarios extras usados pela aplicacao atual
ALTER TABLE agendamentos
  ADD COLUMN notas_estagiario TEXT NULL AFTER notas_admin;

ALTER TABLE prontuarios
  ADD COLUMN arquivo_path VARCHAR(500) NULL AFTER plano_proxima;

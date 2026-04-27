SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- ================================================================
-- SEP Sistema v3 — Estácio Aracaju
-- seeds.sql — APENAS DADOS DE DEMONSTRAÇÃO
-- Rode APÓS o schema: npm run db:seed
-- ================================================================

-- ----------------------------------------------------------------
-- Senhas (bcrypt hash):
--   Admin@123  → admin@sep.estacio.br
--   Estag@123  → estagiários
--   Pac@123    → pacientes
-- ----------------------------------------------------------------


-- ── ADMIN ────────────────────────────────────────────────
INSERT INTO usuarios (nome, email, senha_hash, perfil, status_conta, email_verificado) VALUES
  ('Administrador SEP', 'admin@sep.estacio.br',
   '$2b$12$ozOcIbCtwqst8OyZukLe1uzHI34yOV587pvzSkdHsFbWyjkb2dEfe',
   'coordenador', 'ativo', 1);

-- ── SUPERVISOR ───────────────────────────────────────────
INSERT INTO usuarios (nome, email, senha_hash, perfil, status_conta, email_verificado) VALUES
  ('Prof. Supervisor SEP', 'supervisor@sep.estacio.br',
   '$2b$12$NojiDXz6nrFl.1q3LxkuBeCjRVdZ0L1rLXIiWJCSNbVWouryojGeu',
   'supervisor', 'ativo', 1);


INSERT INTO usuarios (nome, email, senha_hash, perfil, status_conta, email_verificado) VALUES
  ('Maria Recepção SEP', 'recepcao@sep.estacio.br',
   '$2b$12$DKnPN3hyn4A3JkFXezvc9eUsjYiRhbWd1Dv3tTOuNbOqi4iI.cNNq',
   'recepcionista', 'ativo', 1);

INSERT INTO usuarios (nome, email, senha_hash, perfil, status_conta, email_verificado) VALUES
  ('Ana Paula Silva', 'ana.paula@estacio.br', '$2b$12$HKuE5CR3luNu41ytK4w19evqEig2s9adylaYBDkE9.io.NQzNp3ke', 'estagiario', 'ativo', 1),
  ('Bruno Ferreira',  'bruno.f@estacio.br',   '$2b$12$HKuE5CR3luNu41ytK4w19evqEig2s9adylaYBDkE9.io.NQzNp3ke', 'estagiario', 'ativo', 1),
  ('Carla Mendes',    'carla.m@estacio.br',   '$2b$12$HKuE5CR3luNu41ytK4w19evqEig2s9adylaYBDkE9.io.NQzNp3ke', 'estagiario', 'ativo', 1),
  ('Daniel Costa',    'daniel.c@estacio.br',  '$2b$12$HKuE5CR3luNu41ytK4w19evqEig2s9adylaYBDkE9.io.NQzNp3ke', 'estagiario', 'ativo', 1);

INSERT INTO estagiarios (usuario_id, matricula, telefone, semestre, supervisor) VALUES
  ((SELECT id FROM usuarios WHERE email = 'ana.paula@estacio.br'), '2023001', '79991110001', 8, 'Prof. Mariano'),
  ((SELECT id FROM usuarios WHERE email = 'bruno.f@estacio.br'), '2023002', '79991110002', 7, 'Prof. Mariano'),
  ((SELECT id FROM usuarios WHERE email = 'carla.m@estacio.br'), '2023003', '79991110003', 8, 'Prof. Mariano'),
  ((SELECT id FROM usuarios WHERE email = 'daniel.c@estacio.br'), '2023004', '79991110004', 6, 'Prof. Mariano');

-- ── SLOTS DE DISPONIBILIDADE ──────────────────────────────
INSERT INTO estagiario_slots (estagiario_id, dia_semana, hora_inicio, hora_fim, status) VALUES
  -- Ana Paula: seg manhã e tarde, ter e qua manhã (aprovados)
  (1, 'seg', '08:00', '10:00', 'aprovado'),
  (1, 'seg', '14:00', '16:00', 'aprovado'),
  (1, 'ter', '08:00', '10:00', 'aprovado'),
  (1, 'qua', '08:00', '10:00', 'aprovado'),
  -- Bruno: qua/qui/sex noturno (aprovados)
  (2, 'qua', '18:00', '20:00', 'aprovado'),
  (2, 'qui', '18:00', '20:00', 'aprovado'),
  (2, 'sex', '18:00', '20:00', 'aprovado'),
  -- Carla: ter e qui manhã (aprovados)
  (3, 'ter', '09:00', '11:00', 'aprovado'),
  (3, 'qui', '09:00', '11:00', 'aprovado'),
  -- Daniel: seg/qua/sex (aprovados)
  (4, 'seg', '10:00', '12:00', 'aprovado'),
  (4, 'qua', '10:00', '12:00', 'aprovado'),
  (4, 'sex', '14:00', '16:00', 'aprovado'),
  -- Ana Paula: sex pendente (demonstra aprovação)
  (1, 'sex', '08:00', '10:00', 'pendente'),
  -- Carla: sab rejeitado (cobre estado rejeitado)
  (3, 'sab', '08:00', '10:00', 'rejeitado');

INSERT INTO usuarios (nome, email, senha_hash, perfil, status_conta, email_verificado) VALUES
  ('Pedro Henrique Melo', 'pedro@email.com',  '$2b$12$VRYzWpiJGim0GAVF6kNXtuCcDmGlJF0s.h.qx2cfJP8i0IU/hOE42', 'paciente', 'ativo', 1),
  ('Maria das Graças',    'maria@email.com',  '$2b$12$VRYzWpiJGim0GAVF6kNXtuCcDmGlJF0s.h.qx2cfJP8i0IU/hOE42', 'paciente', 'ativo', 1),
  ('Luciana Santos',      'lu@email.com',     '$2b$12$VRYzWpiJGim0GAVF6kNXtuCcDmGlJF0s.h.qx2cfJP8i0IU/hOE42', 'paciente', 'ativo', 1),
  ('Fernanda Lima',       'fer@email.com',    '$2b$12$VRYzWpiJGim0GAVF6kNXtuCcDmGlJF0s.h.qx2cfJP8i0IU/hOE42', 'paciente', 'ativo', 1),
  ('Carlos Eduardo Silva','carlos@email.com', '$2b$12$VRYzWpiJGim0GAVF6kNXtuCcDmGlJF0s.h.qx2cfJP8i0IU/hOE42', 'paciente', 'ativo', 1);

INSERT INTO usuarios
  (nome, email, senha_hash, perfil, status_conta, email_verificado, email_token, bloqueado_ate)
VALUES
  ('Paciente Pendente Email', 'pendente@email.com', '$2b$12$VRYzWpiJGim0GAVF6kNXtuCcDmGlJF0s.h.qx2cfJP8i0IU/hOE42', 'paciente', 'pendente_email', 0, 'token-demo-pendente-email', NULL),
  ('Paciente Bloqueado', 'bloqueado@email.com', '$2b$12$VRYzWpiJGim0GAVF6kNXtuCcDmGlJF0s.h.qx2cfJP8i0IU/hOE42', 'paciente', 'bloqueado', 1, NULL, DATE_ADD(NOW(), INTERVAL 30 MINUTE)),
  ('Paciente Suspenso', 'suspenso@email.com', '$2b$12$VRYzWpiJGim0GAVF6kNXtuCcDmGlJF0s.h.qx2cfJP8i0IU/hOE42', 'paciente', 'suspenso', 1, NULL, NULL),
  ('Roberta Nascimento', 'roberta@email.com', '$2b$12$VRYzWpiJGim0GAVF6kNXtuCcDmGlJF0s.h.qx2cfJP8i0IU/hOE42', 'paciente', 'ativo', 1, NULL, NULL);

INSERT INTO pacientes
  (usuario_id, nome, cpf, email, telefone, whatsapp,
   data_nascimento, genero, escolaridade,
   motivo_busca, tempo_sintomas, intensidade_sintomas, impacto_vida,
   risco_suicidio, urgencia, status, disponibilidade, timestamp_cadastro)
VALUES
  ((SELECT id FROM usuarios WHERE email = 'pedro@email.com'), 'Pedro Henrique Melo', '44444444444', 'pedro@email.com', '79999990004', '79999990004',
   '1998-03-15', 'masculino', 'superior_incompleto',
   'Crises de pânico recorrentes que me impedem de trabalhar e dormir.',
   '3_a_6meses', 'muito_intenso', 'Perdi dois empregos nos ultimos 4 meses.',
   0, 'muito_urgente', 'aguardando',
   '{"seg":["08:00","14:00"],"qua":["08:00"],"sex":["08:00"]}',
   DATE_SUB(NOW(), INTERVAL 12 DAY)),

  ((SELECT id FROM usuarios WHERE email = 'maria@email.com'), 'Maria das Graças', '11111111111', 'maria@email.com', '79999990001', '79999990001',
   '1985-07-22', 'feminino', 'medio_completo',
   'Ansiedade generalizada e dificuldade de dormir.',
   '6_a_12meses', 'intenso', 'Afetando relacionamentos e produtividade.',
   0, 'urgente', 'em_contato',
   '{"ter":["09:00"],"qui":["09:00"]}',
   DATE_SUB(NOW(), INTERVAL 9 DAY)),

  ((SELECT id FROM usuarios WHERE email = 'lu@email.com'), 'Luciana Santos', '55555555555', 'lu@email.com', '79999990005', '79999990005',
   '1990-11-08', 'feminino', 'superior_completo',
   'Processo de luto após perda do pai.',
   'mais_1ano', 'moderado', 'Afeta concentração e motivação.',
   0, 'urgente', 'em_atendimento',
   '{"seg":["10:00"],"qua":["10:00"]}',
   DATE_SUB(NOW(), INTERVAL 45 DAY)),

  ((SELECT id FROM usuarios WHERE email = 'fer@email.com'), 'Fernanda Lima', '33333333333', 'fer@email.com', '79999990003', '79999990003',
   '2001-09-14', 'feminino', 'superior_incompleto',
   'Conflitos familiares e dificuldade de estabelecer limites.',
   '1_a_3meses', 'moderado', 'Afeta qualidade do sono.',
   0, 'sem_urgencia', 'agendado',
   '{"ter":["09:00"],"qui":["09:00"]}',
   DATE_SUB(NOW(), INTERVAL 5 DAY)),

  ((SELECT id FROM usuarios WHERE email = 'carlos@email.com'), 'Carlos Eduardo Silva', '22222222222', 'carlos@email.com', '79999990006', NULL,
   '1995-06-20', 'masculino', 'medio_completo',
   'Episódios de tristeza profunda e isolamento social.',
   '1_a_3meses', 'intenso', 'Dificuldade de sair de casa.',
   0, 'urgente', 'triagem_pendente',
   NULL,
   DATE_SUB(NOW(), INTERVAL 1 DAY));

-- ── TRIAGEM aprovada pelo admin (exceto Carlos que fica pendente) ──
UPDATE pacientes SET
  triagem_admin_id = 1,
  triagem_em       = DATE_SUB(NOW(), INTERVAL 10 DAY),
  triagem_obs      = 'Triagem aprovada. Necessidade clínica confirmada.'
WHERE cpf IN ('44444444444','11111111111','55555555555','33333333333');

-- ── Atribui estagiários ───────────────────────────────────
UPDATE pacientes SET estagiario_id = 1 WHERE cpf = '33333333333'; -- Fernanda → Ana Paula
UPDATE pacientes SET estagiario_id = 4 WHERE cpf = '55555555555'; -- Luciana  → Daniel

-- ── AGENDAMENTOS ──────────────────────────────────────────

-- Fernanda: consulta daqui 2 dias (agendamento futuro)
INSERT INTO agendamentos
  (paciente_id, estagiario_id, slot_id, data_hora_inicio, data_hora_fim,
   status, modalidade, sala, sessao_numero, criado_por)
VALUES
  (4, 1, 3,
   DATE_ADD(NOW(), INTERVAL 2 DAY),
   DATE_ADD(DATE_ADD(NOW(), INTERVAL 2 DAY), INTERVAL 50 MINUTE),
   'pendente', 'presencial', 'Sala 3', 1, 1);

INSERT INTO agendamentos
  (paciente_id, estagiario_id, slot_id, data_hora_inicio, data_hora_fim,
   status, modalidade, sala, sessao_numero, criado_por, notas_admin)
VALUES
  (4, 1, 2,
   DATE_ADD(NOW(), INTERVAL 4 DAY),
   DATE_ADD(DATE_ADD(NOW(), INTERVAL 4 DAY), INTERVAL 50 MINUTE),
   'pendente', 'online', NULL, 2, 1, 'Aguardando confirmação do paciente');

INSERT INTO agendamentos
  (paciente_id, estagiario_id, slot_id, data_hora_inicio, data_hora_fim,
   status, modalidade, sala, sessao_numero, criado_por, notas_admin)
VALUES
  (2, 3, 8,
   DATE_SUB(NOW(), INTERVAL 2 DAY),
   DATE_ADD(DATE_SUB(NOW(), INTERVAL 2 DAY), INTERVAL 50 MINUTE),
   'cancelado_admin', 'presencial', 'Sala 4', 1, 1, 'Reagendado por indisponibilidade do SEP');

-- Luciana: consulta passada (sessao 3 ja realizada)
INSERT INTO agendamentos
  (paciente_id, estagiario_id, slot_id, data_hora_inicio, data_hora_fim,
   status, modalidade, sala, sessao_numero, criado_por)
VALUES
  (3, 4, 10,
   DATE_SUB(NOW(), INTERVAL 7 DAY),
   DATE_ADD(DATE_SUB(NOW(), INTERVAL 7 DAY), INTERVAL 50 MINUTE),
   'realizado', 'presencial', 'Sala 2', 3, 1);

-- ── PRONTUÁRIO (sessão 3 de Luciana) ─────────────────────
INSERT INTO prontuarios
  (agendamento_id, paciente_id, estagiario_id, sessao_numero, data_sessao,
   queixa_principal, descricao_sessao, evolucao, plano_proxima)
VALUES
  ((SELECT id FROM agendamentos WHERE paciente_id = 3 AND estagiario_id = 4 AND sessao_numero = 3 AND status = 'realizado' LIMIT 1), 3, 4, 3, DATE_SUB(NOW(), INTERVAL 7 DAY),
   'Tristeza e vazio após perda do pai. Isolamento social.',
   'Paciente relatou leve melhora no sono. Ainda com episodios de choro frequentes ao recordar memórias do pai.',
   'Evolucao pósitiva. Mais abertura para falar sobre o luto.',
   'Trabalhar técnicas de aceitação e ressignificação da perda.');

INSERT INTO documentos
  (paciente_id, estagiario_id, prontuario_id, tipo, nome_original, s3_key, s3_bucket,
   mime_type, tamanho_bytes, descricao, status, enviado_por, excluido_em, excluido_por)
VALUES
  (3, 4, (SELECT id FROM prontuarios WHERE paciente_id = 3 AND sessao_numero = 3 LIMIT 1), 'prontuario', 'sessao-03-luciana.pdf', 'demo/prontuarios/luciana-sessao-03.pdf', 'sep-demo-bucket',
   'application/pdf', 248320, 'Prontuário da terceira sessão.', 'ativo', 1, NULL, NULL),
  (4, 1, NULL, 'consentimento', 'consentimento-fernanda.pdf', 'demo/documentos/fernanda-consentimento.pdf', 'sep-demo-bucket',
   'application/pdf', 182044, 'Termo substituído por versão atualizada.', 'excluido', 1, DATE_SUB(NOW(), INTERVAL 1 DAY), 1);

-- ── NOTIFICAÇÕES ──────────────────────────────────────────
INSERT INTO notificacoes (paciente_id, tipo, assunto, status, usuario_id) VALUES
  (2, 'ligacao',  'Primeiro contato para agendamento', 'enviado', 1),
  (2, 'whatsapp', 'Confirmacao de horario disponivel',  'enviado', 1),
  (4, 'ligacao',  'Confirmacao da consulta',             'enviado', 1),
  (1, 'email',    'Documentacao pendente para triagem',  'falhou',  1),
  (4, 'sistema',  'Lembrete de consulta futura',         'pendente', 1);

-- ── HISTÓRICO DE STATUS ───────────────────────────────────
INSERT INTO historico_status (paciente_id, status_anterior, status_novo, usuario_id, canal, observacao) VALUES
  (1, 'triagem_pendente', 'aguardando',    1, 'coordenador', 'Triagem aprovada'),
  (2, 'triagem_pendente', 'aguardando',    1, 'coordenador', 'Triagem aprovada'),
  (2, 'aguardando',       'em_contato',    1, 'coordenador', 'Contato por ligacao realizado'),
  (3, 'triagem_pendente', 'aguardando',    1, 'coordenador', 'Triagem aprovada'),
  (3, 'aguardando',       'em_contato',    1, 'coordenador', 'Contato realizado'),
  (3, 'em_contato',       'agendado',      1, 'coordenador', 'Consulta agendada'),
  (3, 'agendado',         'em_atendimento',1, 'coordenador', 'Primeira sessao realizada'),
  (4, 'triagem_pendente', 'aguardando',    1, 'coordenador', 'Triagem aprovada'),
  (4, 'aguardando',       'agendado',      1, 'coordenador', 'Consulta agendada com Ana Paula');

-- ── CONFIGURAÇÕES ─────────────────────────────────────────
INSERT IGNORE INTO sep_config (chave, valor, descricao) VALUES
  ('max_estagiarios_diurno',  '8', 'Máximo de estagiários no turno diurno por dia'),
  ('max_estagiarios_noturno', '3', 'Máximo de estagiários no turno noturno por dia'),
  ('duracao_consulta_min', '60',   'Duração padrão de cada consulta em minutos (ex: 50 ou 60)'),
  ('max_faltas_desligamento', '3', 'Número de faltas para desligamento automático do paciente do programa de atendimentos'),
  ('salas_disponiveis', 'Sala 1,Sala 2,Sala 3,Sala 4,Sala 5,Sala Online',
   'Salas disponíveis para agendamento, separadas por vírgula. Use "Sala Online" para atendimentos remotos.'),
  ('max_estagiarios_slot',    '4', 'Máximo de estagiários no mesmo horário exato');


-- ── VÍNCULOS INICIAIS ─────────────────────────────────────
-- Luciana Santos (paciente 3) → Daniel Costa (estagiario 4)
-- Fernanda Lima (paciente 4)  → Ana Paula Silva (estagiario 1)
INSERT IGNORE INTO vinculos_estagiario_paciente (paciente_id, estagiario_id, ativo, data_inicio) VALUES
  (3, 4, 1, DATE_SUB(NOW(), INTERVAL 45 DAY)),
  (4, 1, 1, DATE_SUB(NOW(), INTERVAL 5 DAY));

INSERT IGNORE INTO vinculos_supervisor_estagiario
  (supervisor_id, estagiario_id, ativo, data_inicio, obs, criado_por)
VALUES
  (2, 1, 1, DATE_SUB(NOW(), INTERVAL 120 DAY), 'Supervisão ativa de Ana Paula.', 1),
  (2, 2, 1, DATE_SUB(NOW(), INTERVAL 120 DAY), 'Supervisão ativa de Bruno.', 1),
  (2, 3, 1, DATE_SUB(NOW(), INTERVAL 120 DAY), 'Supervisão ativa de Carla.', 1),
  (2, 4, 1, DATE_SUB(NOW(), INTERVAL 120 DAY), 'Supervisão ativa de Daniel.', 1);


-- ═══════════════════════════════════════════════════════════
-- DADOS HISTÓRICOS PARA KPIs (demo realista)
-- Pacientes, agendamentos realizados e altas para popular:
--   • Tempo médio de espera
--   • Taxa de comparecimento
--   • Taxa de desistência
--   • Evolução semanal
-- ═══════════════════════════════════════════════════════════

-- ── Pacientes históricos (já em atendimento ou com alta) ──
INSERT INTO usuarios (nome, email, senha_hash, perfil, status_conta, email_verificado) VALUES
  ('Carlos Eduardo Matos',   'carlos.matos@email.com',   '$2a$12$demo', 'paciente', 'ativo', 1),
  ('Beatriz Souza Lima',     'beatriz.lima@email.com',   '$2a$12$demo', 'paciente', 'ativo', 1),
  ('Rafael Torres Santos',   'rafael.santos@email.com',  '$2a$12$demo', 'paciente', 'ativo', 1),
  ('Camila Ferreira Dias',   'camila.dias@email.com',    '$2a$12$demo', 'paciente', 'ativo', 1),
  ('André Costa Nunes',      'andre.nunes@email.com',    '$2a$12$demo', 'paciente', 'ativo', 1),
  ('Priscila Alves Rocha',   'priscila.rocha@email.com', '$2a$12$demo', 'paciente', 'ativo', 1),
  ('Marcos Vieira Gomes',    'marcos.gomes@email.com',   '$2a$12$demo', 'paciente', 'ativo', 1),
  ('Tatiana Lopes Cunha',    'tatiana.cunha@email.com',  '$2a$12$demo', 'paciente', 'ativo', 1),
  ('Felipe Barbosa Reis',    'felipe.reis@email.com',    '$2a$12$demo', 'paciente', 'ativo', 1),
  ('Juliana Cardoso Pinto',  'juliana.pinto@email.com',  '$2a$12$demo', 'paciente', 'ativo', 1);

-- IDs sequenciais — assumindo que os 5 pacientes base já existem (IDs 1–5)
-- e os 2 usuários adicionais do seed base, mais estagiários/recepcionistas = ~12 usuários
-- Os novos usuários terão IDs a partir de (SELECT MAX(id)+1 FROM usuarios) — usamos subquery
INSERT INTO pacientes
  (usuario_id, nome, cpf, email, telefone, urgencia, status,
   motivo_busca, timestamp_cadastro, triagem_admin_id, triagem_em)
VALUES
  -- 6: Carlos — alta há 2 meses (cadastro 90 dias atrás, 1ª sessão em 18 dias)
  ((SELECT id FROM usuarios WHERE email='carlos.matos@email.com'),
   'Carlos Eduardo Matos','32165498700','carlos.matos@email.com','79988001001',
   'urgente','alta','Ansiedade generalizada e ataques de pânico',
   DATE_SUB(NOW(), INTERVAL 90 DAY), 1, DATE_SUB(NOW(), INTERVAL 88 DAY)),

  -- 7: Beatriz — alta há 1 mês (cadastro 75 dias, 1ª sessão em 12 dias)
  ((SELECT id FROM usuarios WHERE email='beatriz.lima@email.com'),
   'Beatriz Souza Lima','45678912300','beatriz.lima@email.com','79988001002',
   'pouco_urgente','alta','Depressão pós-parto e dificuldade de vínculo',
   DATE_SUB(NOW(), INTERVAL 75 DAY), 1, DATE_SUB(NOW(), INTERVAL 73 DAY)),

  -- 8: Rafael — alta há 3 semanas (cadastro 60 dias, 1ª sessão em 22 dias)
  ((SELECT id FROM usuarios WHERE email='rafael.santos@email.com'),
   'Rafael Torres Santos','56789123400','rafael.santos@email.com','79988001003',
   'urgente','alta','Luto e dificuldade de adaptação após divórcio',
   DATE_SUB(NOW(), INTERVAL 60 DAY), 1, DATE_SUB(NOW(), INTERVAL 58 DAY)),

  -- 9: Camila — em atendimento (cadastro 45 dias, 1ª sessão em 15 dias)
  ((SELECT id FROM usuarios WHERE email='camila.dias@email.com'),
   'Camila Ferreira Dias','67891234500','camila.dias@email.com','79988001004',
   'muito_urgente','em_atendimento','Transtorno alimentar e automutilação',
   DATE_SUB(NOW(), INTERVAL 45 DAY), 1, DATE_SUB(NOW(), INTERVAL 44 DAY)),

  -- 10: André — em atendimento (cadastro 30 dias, 1ª sessão em 10 dias)
  ((SELECT id FROM usuarios WHERE email='andre.nunes@email.com'),
   'André Costa Nunes','78912345600','andre.nunes@email.com','79988001005',
   'urgente','em_atendimento','Ansiedade social e fobia escolar',
   DATE_SUB(NOW(), INTERVAL 30 DAY), 1, DATE_SUB(NOW(), INTERVAL 29 DAY)),

  -- 11: Priscila — desistência (saiu da fila após 20 dias)
  ((SELECT id FROM usuarios WHERE email='priscila.rocha@email.com'),
   'Priscila Alves Rocha','89123456700','priscila.rocha@email.com','79988001006',
   'sem_urgencia','desistencia','Dificuldades no relacionamento conjugal',
   DATE_SUB(NOW(), INTERVAL 35 DAY), 1, DATE_SUB(NOW(), INTERVAL 34 DAY)),

  -- 12: Marcos — cancelado (triagem rejeitada)
  ((SELECT id FROM usuarios WHERE email='marcos.gomes@email.com'),
   'Marcos Vieira Gomes','91234567800','marcos.gomes@email.com','79988001007',
   'sem_urgencia','cancelado','Dificuldades no trabalho e estresse',
   DATE_SUB(NOW(), INTERVAL 50 DAY), 1, DATE_SUB(NOW(), INTERVAL 49 DAY)),

  -- 13: Tatiana — alta há 1 semana (cadastro 55 dias, 1ª sessão em 8 dias)
  ((SELECT id FROM usuarios WHERE email='tatiana.cunha@email.com'),
   'Tatiana Lopes Cunha','12345678900','tatiana.cunha@email.com','79988001008',
   'urgente','alta','Síndrome de burnout e exaustão emocional',
   DATE_SUB(NOW(), INTERVAL 55 DAY), 1, DATE_SUB(NOW(), INTERVAL 54 DAY)),

  -- 14: Felipe — em atendimento (cadastro 20 dias, 1ª sessão em 7 dias)
  ((SELECT id FROM usuarios WHERE email='felipe.reis@email.com'),
   'Felipe Barbosa Reis','23456789000','felipe.reis@email.com','79988001009',
   'pouco_urgente','em_atendimento','Timidez extrema e baixa autoestima',
   DATE_SUB(NOW(), INTERVAL 20 DAY), 1, DATE_SUB(NOW(), INTERVAL 19 DAY)),

  -- 15: Juliana — desistência
  ((SELECT id FROM usuarios WHERE email='juliana.pinto@email.com'),
   'Juliana Cardoso Pinto','34567890100','juliana.pinto@email.com','79988001010',
   'sem_urgencia','desistencia','Conflitos familiares e comunicação',
   DATE_SUB(NOW(), INTERVAL 40 DAY), 1, DATE_SUB(NOW(), INTERVAL 39 DAY));

-- ── Agendamentos históricos (realizados, com faltas e cancelamentos) ──
-- Usamos estagiario_id=1 (Ana Paula) e estagiario_id=4 (Daniel)

INSERT INTO agendamentos
  (paciente_id, estagiario_id, data_hora_inicio, data_hora_fim,
   status, modalidade, sala, sessao_numero, criado_por)
VALUES
  -- Carlos (paciente 6): 3 sessões realizadas + 1 falta
  (6, 1, DATE_SUB(NOW(), INTERVAL 72 DAY), DATE_ADD(DATE_SUB(NOW(), INTERVAL 72 DAY), INTERVAL 50 MINUTE), 'realizado', 'presencial', 'Sala 1', 1, 1),
  (6, 1, DATE_SUB(NOW(), INTERVAL 65 DAY), DATE_ADD(DATE_SUB(NOW(), INTERVAL 65 DAY), INTERVAL 50 MINUTE), 'realizado', 'presencial', 'Sala 1', 2, 1),
  (6, 1, DATE_SUB(NOW(), INTERVAL 58 DAY), DATE_ADD(DATE_SUB(NOW(), INTERVAL 58 DAY), INTERVAL 50 MINUTE), 'faltou',    'presencial', 'Sala 1', 3, 1),
  (6, 1, DATE_SUB(NOW(), INTERVAL 51 DAY), DATE_ADD(DATE_SUB(NOW(), INTERVAL 51 DAY), INTERVAL 50 MINUTE), 'realizado', 'presencial', 'Sala 1', 4, 1),

  -- Beatriz (paciente 7): 4 sessões realizadas
  (7, 4, DATE_SUB(NOW(), INTERVAL 63 DAY), DATE_ADD(DATE_SUB(NOW(), INTERVAL 63 DAY), INTERVAL 50 MINUTE), 'realizado', 'presencial', 'Sala 2', 1, 1),
  (7, 4, DATE_SUB(NOW(), INTERVAL 56 DAY), DATE_ADD(DATE_SUB(NOW(), INTERVAL 56 DAY), INTERVAL 50 MINUTE), 'realizado', 'presencial', 'Sala 2', 2, 1),
  (7, 4, DATE_SUB(NOW(), INTERVAL 49 DAY), DATE_ADD(DATE_SUB(NOW(), INTERVAL 49 DAY), INTERVAL 50 MINUTE), 'realizado', 'presencial', 'Sala 2', 3, 1),
  (7, 4, DATE_SUB(NOW(), INTERVAL 42 DAY), DATE_ADD(DATE_SUB(NOW(), INTERVAL 42 DAY), INTERVAL 50 MINUTE), 'realizado', 'presencial', 'Sala 2', 4, 1),

  -- Rafael (paciente 8): 3 sessões realizadas
  (8, 1, DATE_SUB(NOW(), INTERVAL 38 DAY), DATE_ADD(DATE_SUB(NOW(), INTERVAL 38 DAY), INTERVAL 50 MINUTE), 'realizado', 'presencial', 'Sala 3', 1, 1),
  (8, 1, DATE_SUB(NOW(), INTERVAL 31 DAY), DATE_ADD(DATE_SUB(NOW(), INTERVAL 31 DAY), INTERVAL 50 MINUTE), 'realizado', 'presencial', 'Sala 3', 2, 1),
  (8, 1, DATE_SUB(NOW(), INTERVAL 24 DAY), DATE_ADD(DATE_SUB(NOW(), INTERVAL 24 DAY), INTERVAL 50 MINUTE), 'realizado', 'presencial', 'Sala 3', 3, 1),

  -- Camila (paciente 9): 2 realizadas + 1 cancelada
  (9, 4, DATE_SUB(NOW(), INTERVAL 30 DAY), DATE_ADD(DATE_SUB(NOW(), INTERVAL 30 DAY), INTERVAL 50 MINUTE), 'realizado',           'presencial', 'Sala 1', 1, 1),
  (9, 4, DATE_SUB(NOW(), INTERVAL 23 DAY), DATE_ADD(DATE_SUB(NOW(), INTERVAL 23 DAY), INTERVAL 50 MINUTE), 'cancelado_paciente',   'presencial', 'Sala 1', 2, 1),
  (9, 4, DATE_SUB(NOW(), INTERVAL 16 DAY), DATE_ADD(DATE_SUB(NOW(), INTERVAL 16 DAY), INTERVAL 50 MINUTE), 'realizado',           'presencial', 'Sala 1', 3, 1),

  -- André (paciente 10): 2 realizadas
  (10, 1, DATE_SUB(NOW(), INTERVAL 20 DAY), DATE_ADD(DATE_SUB(NOW(), INTERVAL 20 DAY), INTERVAL 50 MINUTE), 'realizado', 'presencial', 'Sala 2', 1, 1),
  (10, 1, DATE_SUB(NOW(), INTERVAL 13 DAY), DATE_ADD(DATE_SUB(NOW(), INTERVAL 13 DAY), INTERVAL 50 MINUTE), 'faltou',    'presencial', 'Sala 2', 2, 1),

  -- Tatiana (paciente 13): 2 realizadas + 1 falta
  (13, 4, DATE_SUB(NOW(), INTERVAL 47 DAY), DATE_ADD(DATE_SUB(NOW(), INTERVAL 47 DAY), INTERVAL 50 MINUTE), 'realizado', 'presencial', 'Sala 3', 1, 1),
  (13, 4, DATE_SUB(NOW(), INTERVAL 40 DAY), DATE_ADD(DATE_SUB(NOW(), INTERVAL 40 DAY), INTERVAL 50 MINUTE), 'faltou',    'presencial', 'Sala 3', 2, 1),
  (13, 4, DATE_SUB(NOW(), INTERVAL 33 DAY), DATE_ADD(DATE_SUB(NOW(), INTERVAL 33 DAY), INTERVAL 50 MINUTE), 'realizado', 'presencial', 'Sala 3', 3, 1),

  -- Felipe (paciente 14): 1 realizada + 1 futura
  (14, 1, DATE_SUB(NOW(), INTERVAL 13 DAY), DATE_ADD(DATE_SUB(NOW(), INTERVAL 13 DAY), INTERVAL 50 MINUTE), 'realizado', 'presencial', 'Sala 1', 1, 1),
  (14, 1, DATE_ADD(NOW(), INTERVAL 1 DAY),  DATE_ADD(DATE_ADD(NOW(), INTERVAL 1 DAY),  INTERVAL 50 MINUTE), 'pendente','presencial', 'Sala 1', 2, 1);

-- ── Altas históricas ──────────────────────────────────────
INSERT INTO altas_clinicas
  (paciente_id, estagiario_id, supervisor_id, data_alta, total_sessoes,
   motivo_alta, resumo_caso, status_aprovacao)
VALUES
  (6,  1, 1, DATE_SUB(NOW(), INTERVAL 44 DAY), 4,
   'objetivo_alcancado',
   'Paciente apresentou redução significativa dos sintomas de ansiedade e pânico após 4 sessões.',
   'aprovada'),
  (7,  4, 1, DATE_SUB(NOW(), INTERVAL 35 DAY), 4,
   'objetivo_alcancado',
   'Melhora no vínculo materno e redução dos sintomas depressivos.',
   'aprovada'),
  (8,  1, 1, DATE_SUB(NOW(), INTERVAL 17 DAY), 3,
   'objetivo_alcancado',
   'Elaboração do luto e retomada de atividades sociais.',
   'aprovada'),
  (13, 4, 1, DATE_SUB(NOW(), INTERVAL 26 DAY), 3,
   'encaminhamento',
   'Paciente encaminhada para psiquiatria por suspeita de transtorno de humor.',
   'aprovada');

INSERT INTO altas_clinicas
  (paciente_id, estagiario_id, supervisor_id, data_alta, total_sessoes,
   motivo_alta, resumo_caso, recomendacoes, status_aprovacao, obs_supervisor)
VALUES
  (9, 4, NULL, DATE_SUB(NOW(), INTERVAL 1 DAY), 2,
   'outro',
   'Solicitação ainda aguardando parecer do supervisor.',
   'Manter observação clínica e aguardar decisão.',
   'pendente', NULL),
  (10, 1, 1, DATE_SUB(NOW(), INTERVAL 3 DAY), 2,
   'desistencia',
   'Paciente oscilou adesão, mas ainda possui indicação de continuidade.',
   'Reforçar vínculo terapêutico antes de nova solicitação.',
   'rejeitada', 'Alta rejeitada para continuidade do cuidado.');

-- ── Vínculos históricos para os novos pacientes ──────────
INSERT IGNORE INTO vinculos_estagiario_paciente
  (paciente_id, estagiario_id, ativo, data_inicio, data_fim)
VALUES
  (6,  1, 0, DATE_SUB(NOW(), INTERVAL 72 DAY), DATE_SUB(NOW(), INTERVAL 44 DAY)),
  (7,  4, 0, DATE_SUB(NOW(), INTERVAL 63 DAY), DATE_SUB(NOW(), INTERVAL 35 DAY)),
  (8,  1, 0, DATE_SUB(NOW(), INTERVAL 38 DAY), DATE_SUB(NOW(), INTERVAL 17 DAY)),
  (9,  4, 1, DATE_SUB(NOW(), INTERVAL 30 DAY), NULL),
  (10, 1, 1, DATE_SUB(NOW(), INTERVAL 20 DAY), NULL),
  (13, 4, 0, DATE_SUB(NOW(), INTERVAL 47 DAY), DATE_SUB(NOW(), INTERVAL 26 DAY)),
  (14, 1, 1, DATE_SUB(NOW(), INTERVAL 13 DAY), NULL);

-- ── Histórico de status para os novos pacientes ──────────
INSERT INTO historico_status (paciente_id, status_anterior, status_novo, usuario_id, canal) VALUES
  (6,  'triagem_pendente', 'aguardando',    1, 'coordenador'),
  (6,  'aguardando',       'em_atendimento',1, 'coordenador'),
  (6,  'em_atendimento',   'alta',          1, 'coordenador'),
  (7,  'triagem_pendente', 'aguardando',    1, 'coordenador'),
  (7,  'aguardando',       'em_atendimento',1, 'coordenador'),
  (7,  'em_atendimento',   'alta',          1, 'coordenador'),
  (8,  'triagem_pendente', 'aguardando',    1, 'coordenador'),
  (8,  'aguardando',       'em_atendimento',1, 'coordenador'),
  (8,  'em_atendimento',   'alta',          1, 'coordenador'),
  (9,  'triagem_pendente', 'aguardando',    1, 'coordenador'),
  (9,  'aguardando',       'em_atendimento',1, 'coordenador'),
  (10, 'triagem_pendente', 'aguardando',    1, 'coordenador'),
  (10, 'aguardando',       'em_atendimento',1, 'coordenador'),
  (11, 'triagem_pendente', 'aguardando',    1, 'coordenador'),
  (11, 'aguardando',       'desistencia',   1, 'coordenador'),
  (12, 'triagem_pendente', 'cancelado',     1, 'coordenador'),
  (13, 'triagem_pendente', 'aguardando',    1, 'coordenador'),
  (13, 'aguardando',       'em_atendimento',1, 'coordenador'),
  (13, 'em_atendimento',   'alta',          1, 'coordenador'),
  (14, 'triagem_pendente', 'aguardando',    1, 'coordenador'),
  (14, 'aguardando',       'em_atendimento',1, 'coordenador'),
  (15, 'triagem_pendente', 'aguardando',    1, 'coordenador'),
  (15, 'aguardando',       'desistencia',   1, 'coordenador');

INSERT INTO pacientes
  (usuario_id, nome, cpf, email, telefone, whatsapp,
   data_nascimento, genero, escolaridade,
   motivo_busca, tempo_sintomas, intensidade_sintomas, impacto_vida,
   risco_suicidio, urgencia, status, disponibilidade, timestamp_cadastro,
   triagem_admin_id, triagem_em, triagem_obs)
VALUES
  ((SELECT id FROM usuarios WHERE email = 'roberta@email.com'),
   'Roberta Nascimento', '66666666666', 'roberta@email.com', '79999990007', '79999990007',
   '1997-02-18', 'feminino', 'superior_completo',
   'Busca acolhimento breve enquanto conclui documentação do cadastro.',
   '1_a_3meses', 'leve', 'Impacto leve na rotina.',
   0, 'pouco_urgente', 'triagem_aprovada', '{"seg":["14:00"],"qui":["09:00"]}',
   DATE_SUB(NOW(), INTERVAL 2 DAY), 1, DATE_SUB(NOW(), INTERVAL 1 DAY),
   'Triagem aprovada, aguardando encaminhamento interno.');

INSERT INTO historico_status (paciente_id, status_anterior, status_novo, usuario_id, canal, observacao)
VALUES
  ((SELECT id FROM pacientes WHERE cpf = '66666666666'),
   'triagem_pendente', 'triagem_aprovada', 1, 'recepcionista',
   'Triagem presencial aprovada; aguardando encaminhamento para a fila.');

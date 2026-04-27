SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- ================================================================
-- SEP Sistema v3 - dados demo para tabelas de suporte e auditoria
-- Complementa o seed base com tabelas que sao preenchidas em uso real.
-- ================================================================

-- Sessoes de demonstracao
INSERT IGNORE INTO sessoes
  (usuario_id, token_hash, ip, user_agent, dispositivo, ativo, expira_em, criado_em, encerrado_em)
SELECT u.id, 'demo-admin-session-desktop', '127.0.0.1',
       'Mozilla/5.0 Seed Demo Coordenador', 'Desktop', 1,
       DATE_ADD(NOW(), INTERVAL 6 HOUR), DATE_SUB(NOW(), INTERVAL 2 HOUR), NULL
FROM usuarios u
WHERE u.email = 'admin@sep.estacio.br';

INSERT IGNORE INTO sessoes
  (usuario_id, token_hash, ip, user_agent, dispositivo, ativo, expira_em, criado_em, encerrado_em)
SELECT u.id, 'demo-supervisor-session-notebook', '127.0.0.1',
       'Mozilla/5.0 Seed Demo Supervisor', 'Desktop', 1,
       DATE_ADD(NOW(), INTERVAL 5 HOUR), DATE_SUB(NOW(), INTERVAL 90 MINUTE), NULL
FROM usuarios u
WHERE u.email = 'supervisor@sep.estacio.br';

INSERT IGNORE INTO sessoes
  (usuario_id, token_hash, ip, user_agent, dispositivo, ativo, expira_em, criado_em, encerrado_em)
SELECT u.id, 'demo-recepcao-session-mobile-revogada', '127.0.0.1',
       'Mozilla/5.0 Seed Demo Recepcao Mobile', 'Mobile', 0,
       DATE_ADD(NOW(), INTERVAL 3 HOUR), DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_SUB(NOW(), INTERVAL 20 HOUR)
FROM usuarios u
WHERE u.email = 'recepcao@sep.estacio.br';

-- Logs de seguranca
INSERT INTO logs_seguranca (usuario_id, evento, ip, user_agent, detalhe, criado_em)
SELECT u.id, 'login_ok', '127.0.0.1', 'Seed Demo Browser',
       'seed-demo-login-coordenador', DATE_SUB(NOW(), INTERVAL 2 HOUR)
FROM usuarios u
WHERE u.email = 'admin@sep.estacio.br'
  AND NOT EXISTS (
    SELECT 1 FROM logs_seguranca l
    WHERE l.usuario_id = u.id AND l.evento = 'login_ok' AND l.detalhe = 'seed-demo-login-coordenador'
  );

INSERT INTO logs_seguranca (usuario_id, evento, ip, user_agent, detalhe, criado_em)
SELECT u.id, 'login_falhou', '127.0.0.1', 'Seed Demo Browser',
       'seed-demo-senha-incorreta-supervisor', DATE_SUB(NOW(), INTERVAL 1 DAY)
FROM usuarios u
WHERE u.email = 'supervisor@sep.estacio.br'
  AND NOT EXISTS (
    SELECT 1 FROM logs_seguranca l
    WHERE l.usuario_id = u.id AND l.evento = 'login_falhou' AND l.detalhe = 'seed-demo-senha-incorreta-supervisor'
  );

INSERT INTO logs_seguranca (usuario_id, evento, ip, user_agent, detalhe, criado_em)
SELECT u.id, 'email_verificado', '127.0.0.1', 'Seed Demo Browser',
       'seed-demo-email-verificado-paciente', DATE_SUB(NOW(), INTERVAL 12 DAY)
FROM usuarios u
WHERE u.email = 'pedro@email.com'
  AND NOT EXISTS (
    SELECT 1 FROM logs_seguranca l
    WHERE l.usuario_id = u.id AND l.evento = 'email_verificado' AND l.detalhe = 'seed-demo-email-verificado-paciente'
  );

INSERT INTO logs_seguranca (usuario_id, evento, ip, user_agent, detalhe, criado_em)
SELECT u.id, 'reset_senha', '127.0.0.1', 'Seed Demo Browser',
       'seed-demo-reset-senha-expirado', DATE_SUB(NOW(), INTERVAL 3 DAY)
FROM usuarios u
WHERE u.email = 'recepcao@sep.estacio.br'
  AND NOT EXISTS (
    SELECT 1 FROM logs_seguranca l
    WHERE l.usuario_id = u.id AND l.evento = 'reset_senha' AND l.detalhe = 'seed-demo-reset-senha-expirado'
  );

INSERT INTO logs_seguranca (usuario_id, evento, ip, user_agent, detalhe, criado_em)
SELECT u.id, 'sessao_revogada', '127.0.0.1', 'Seed Demo Browser',
       'seed-demo-sessao-revogada-recepcao', DATE_SUB(NOW(), INTERVAL 20 HOUR)
FROM usuarios u
WHERE u.email = 'recepcao@sep.estacio.br'
  AND NOT EXISTS (
    SELECT 1 FROM logs_seguranca l
    WHERE l.usuario_id = u.id AND l.evento = 'sessao_revogada' AND l.detalhe = 'seed-demo-sessao-revogada-recepcao'
  );

-- Recuperacao de senha: apenas tokens expirados/usados para nao deixar acesso ativo conhecido.
INSERT IGNORE INTO recuperacao_senha
  (usuario_id, token, expira_em, usado, criado_em)
SELECT u.id, 'demo-reset-expirado-admin', DATE_SUB(NOW(), INTERVAL 1 DAY), 0, DATE_SUB(NOW(), INTERVAL 2 DAY)
FROM usuarios u
WHERE u.email = 'admin@sep.estacio.br';

INSERT IGNORE INTO recuperacao_senha
  (usuario_id, token, expira_em, usado, criado_em)
SELECT u.id, 'demo-reset-usado-recepcao', DATE_SUB(NOW(), INTERVAL 6 HOUR), 1, DATE_SUB(NOW(), INTERVAL 1 DAY)
FROM usuarios u
WHERE u.email = 'recepcao@sep.estacio.br';

-- Documentos legados de paciente para telas/bases migradas do fluxo antigo.
INSERT INTO paciente_documentos
  (paciente_id, tipo, nome_arquivo, path_arquivo, mime_type, tamanho_kb, status, obs_admin, revisado_por, revisado_em, criado_em)
SELECT p.id, 'rg', 'rg-pedro-demo.pdf', 'legacy/pacientes/pedro/rg-pedro-demo.pdf',
       'application/pdf', 412, 'aprovado', 'Documento conferido no atendimento inicial.',
       admin.id, DATE_SUB(NOW(), INTERVAL 11 DAY), DATE_SUB(NOW(), INTERVAL 12 DAY)
FROM pacientes p
JOIN usuarios admin ON admin.email = 'admin@sep.estacio.br'
WHERE p.email = 'pedro@email.com'
  AND NOT EXISTS (
    SELECT 1 FROM paciente_documentos d
    WHERE d.paciente_id = p.id AND d.nome_arquivo = 'rg-pedro-demo.pdf'
  );

INSERT INTO paciente_documentos
  (paciente_id, tipo, nome_arquivo, path_arquivo, mime_type, tamanho_kb, status, obs_admin, revisado_por, revisado_em, criado_em)
SELECT p.id, 'comprovante_residencia', 'comprovante-maria-demo.pdf', 'legacy/pacientes/maria/comprovante-maria-demo.pdf',
       'application/pdf', 286, 'pendente', 'Aguardando conferencia da recepcao.',
       NULL, NULL, DATE_SUB(NOW(), INTERVAL 8 DAY)
FROM pacientes p
WHERE p.email = 'maria@email.com'
  AND NOT EXISTS (
    SELECT 1 FROM paciente_documentos d
    WHERE d.paciente_id = p.id AND d.nome_arquivo = 'comprovante-maria-demo.pdf'
  );

INSERT INTO paciente_documentos
  (paciente_id, tipo, nome_arquivo, path_arquivo, mime_type, tamanho_kb, status, obs_admin, revisado_por, revisado_em, criado_em)
SELECT p.id, 'encaminhamento_medico', 'encaminhamento-carlos-demo.pdf', 'legacy/pacientes/carlos/encaminhamento-carlos-demo.pdf',
       'application/pdf', 198, 'rejeitado', 'Documento ilegivel. Solicitar novo envio.',
       admin.id, DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_SUB(NOW(), INTERVAL 2 DAY)
FROM pacientes p
JOIN usuarios admin ON admin.email = 'admin@sep.estacio.br'
WHERE p.email = 'carlos@email.com'
  AND NOT EXISTS (
    SELECT 1 FROM paciente_documentos d
    WHERE d.paciente_id = p.id AND d.nome_arquivo = 'encaminhamento-carlos-demo.pdf'
  );

-- Auditoria LGPD de acesso a prontuarios.
INSERT INTO audit_prontuarios
  (prontuario_id, paciente_id, usuario_id, acao, ip, user_agent, detalhes, criado_em)
SELECT pr.id, p.id, u.id, 'criou', '127.0.0.1', 'Seed Demo Browser',
       'seed-demo-prontuario-criado-luciana', DATE_SUB(NOW(), INTERVAL 7 DAY)
FROM prontuarios pr
JOIN pacientes p ON p.id = pr.paciente_id
JOIN usuarios u ON u.email = 'daniel.c@estacio.br'
WHERE p.email = 'lu@email.com' AND pr.sessao_numero = 3
  AND NOT EXISTS (
    SELECT 1 FROM audit_prontuarios a
    WHERE a.prontuario_id = pr.id AND a.acao = 'criou' AND a.detalhes = 'seed-demo-prontuario-criado-luciana'
  );

INSERT INTO audit_prontuarios
  (prontuario_id, paciente_id, usuario_id, acao, ip, user_agent, detalhes, criado_em)
SELECT pr.id, p.id, u.id, 'visualizou', '127.0.0.1', 'Seed Demo Browser',
       'seed-demo-supervisor-visualizou-prontuario', DATE_SUB(NOW(), INTERVAL 6 DAY)
FROM prontuarios pr
JOIN pacientes p ON p.id = pr.paciente_id
JOIN usuarios u ON u.email = 'supervisor@sep.estacio.br'
WHERE p.email = 'lu@email.com' AND pr.sessao_numero = 3
  AND NOT EXISTS (
    SELECT 1 FROM audit_prontuarios a
    WHERE a.prontuario_id = pr.id AND a.acao = 'visualizou' AND a.detalhes = 'seed-demo-supervisor-visualizou-prontuario'
  );

INSERT INTO audit_prontuarios
  (prontuario_id, paciente_id, usuario_id, acao, ip, user_agent, detalhes, criado_em)
SELECT pr.id, p.id, u.id, 'baixou_arquivo', '127.0.0.1', 'Seed Demo Browser',
       'seed-demo-coordenador-baixou-documento', DATE_SUB(NOW(), INTERVAL 5 DAY)
FROM prontuarios pr
JOIN pacientes p ON p.id = pr.paciente_id
JOIN usuarios u ON u.email = 'admin@sep.estacio.br'
WHERE p.email = 'lu@email.com' AND pr.sessao_numero = 3
  AND NOT EXISTS (
    SELECT 1 FROM audit_prontuarios a
    WHERE a.prontuario_id = pr.id AND a.acao = 'baixou_arquivo' AND a.detalhes = 'seed-demo-coordenador-baixou-documento'
  );

INSERT INTO audit_prontuarios
  (prontuario_id, paciente_id, usuario_id, acao, ip, user_agent, detalhes, criado_em)
SELECT NULL, p.id, u.id, 'editou', '127.0.0.1', 'Seed Demo Browser',
       'seed-demo-transferencia-vinculo-paciente', DATE_SUB(NOW(), INTERVAL 4 DAY)
FROM pacientes p
JOIN usuarios u ON u.email = 'admin@sep.estacio.br'
WHERE p.email = 'fer@email.com'
  AND NOT EXISTS (
    SELECT 1 FROM audit_prontuarios a
    WHERE a.paciente_id = p.id AND a.acao = 'editou' AND a.detalhes = 'seed-demo-transferencia-vinculo-paciente'
  );

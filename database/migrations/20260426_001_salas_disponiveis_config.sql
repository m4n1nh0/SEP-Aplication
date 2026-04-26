USE sep_db;

INSERT IGNORE INTO sep_config (chave, valor, descricao) VALUES
  ('salas_disponiveis', 'Sala 1,Sala 2,Sala 3,Sala 4,Sala 5,Sala Online',
   'Salas disponíveis para agendamento, separadas por vírgula.'),
  ('max_faltas_desligamento', '3',
   'Número de faltas para desligamento automático do paciente do programa de atendimentos.');

USE sep_db;

INSERT IGNORE INTO sep_config (chave, valor, descricao) VALUES
  ('max_faltas_desligamento', '3',
   'Número de faltas para desligamento automático do paciente do programa de atendimentos.');

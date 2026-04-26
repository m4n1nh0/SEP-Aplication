# Guia de uso - Coordenador

## Objetivo do perfil

O coordenador tem a visao administrativa mais ampla do SEP Sistema. Ele acompanha indicadores, gerencia usuarios, supervisiona fila e triagem, controla agenda, acompanha estagiarios, consulta prontuarios, avalia altas clinicas e administra configuracoes operacionais.

Mesmo usando a rota `/supervisor`, o perfil continua sendo `coordenador` e recebe itens extras de menu.

## Menu disponivel

- `Dashboard`
- `Triagem`
- `Pacientes`
- `Agenda`
- `Estagiarios`
- `Aprovar Horarios`
- `Prontuarios`
- `Altas Clinicas`
- `Fila de Espera`
- `Usuarios`
- `Seguranca`

## Dashboard

Use o dashboard para acompanhar a situacao geral do servico:

- Triagens pendentes.
- Pacientes aguardando ou em contato.
- Consultas do dia e movimentacoes recentes.
- Horarios de estagiarios aguardando aprovacao.
- Altas clinicas pendentes.
- Indicadores de espera, comparecimento, desistencias e altas.

Rotina recomendada:

1. Conferir o dashboard no inicio do expediente.
2. Priorizar triagens e pacientes com risco.
3. Verificar pendencias de horarios.
4. Acompanhar altas pendentes.
5. Usar os indicadores para orientar a operacao da equipe.

## Triagem

Fluxo:

1. Acesse `Triagem`.
2. Abra os detalhes do paciente.
3. Leia dados pessoais, motivo da busca, intensidade, tempo dos sintomas, suporte social e risco.
4. Clique em `Aprovar` para colocar o paciente na fila.
5. Clique em `Rejeitar` quando o atendimento nao deve seguir pelo SEP, informando motivo claro.

Efeito da aprovacao:

- O paciente passa para `aguardando`.
- Ele entra na fila priorizada.
- A decisao fica registrada no historico.

## Fila de Espera

Use para organizar o caminho ate o primeiro agendamento.

A fila mostra:

- Posicao do paciente.
- Urgencia e risco.
- Status operacional.
- Dias de espera.
- Total e data do ultimo contato.
- Pendencias para agendamento.

Regras para agendar:

- O paciente precisa ter pelo menos um contato registrado.
- O status precisa estar em `em_contato`.
- O paciente nao pode ter agendamento futuro ativo.

## Pacientes

Use `Pacientes` para consultar cadastros, status e historico.

Recursos principais:

- Buscar e filtrar pacientes.
- Abrir detalhes.
- Atualizar status quando aplicavel.
- Retornar paciente em `desistencia` para a fila.
- Atribuir ou transferir estagiario.
- Registrar notificacoes.
- Consultar documentos enviados.

### Retornar paciente desistente

Use quando um paciente em `desistencia` solicitar retorno ao atendimento.

Efeito:

- O status volta para `aguardando`.
- A data de entrada na fila passa a ser a data do retorno.
- O paciente perde a posicao anterior.
- Vinculos ativos sao encerrados.
- A acao fica registrada no historico.

## Agenda

Use `Agenda` para visualizar e gerenciar consultas.

Informacoes exibidas:

- Paciente.
- Estagiario.
- Data e horario.
- Modalidade.
- Sala.
- Numero da sessao.
- Status.
- Total de faltas do paciente.

### Status da consulta

- `pendente`: consulta criada e aguardando confirmacao.
- `confirmado`: consulta confirmada.
- `realizado`: atendimento registrado por prontuario.
- `faltou`: ausencia registrada.
- `cancelado_admin`: consulta cancelada pela equipe.
- `cancelado_paciente`: consulta cancelada pelo paciente.

### Acoes disponiveis

- Consultas `pendente`: confirmar, cancelar ou registrar falta depois do horario.
- Consultas `confirmado`: cancelar ou registrar falta depois do horario.
- Consultas `realizado`, `faltou` e `cancelado_*`: ficam encerradas na agenda.

O status `realizado` deve ser produzido pelo fluxo clinico do estagiario, ao registrar o prontuario. Nao altere manualmente uma consulta atendida para falta ou cancelamento.

### Faltas

Ao registrar falta:

- A consulta passa para `faltou`.
- O contador de faltas do paciente aumenta.
- O sistema compara o total com `max_faltas_desligamento`.

Quando o limite e atingido:

- O paciente passa para `desistencia`.
- Vinculos ativos sao encerrados.
- Agendamentos futuros ativos sao cancelados.

### Salas

Atendimentos presenciais exigem sala cadastrada em `sep_config.salas_disponiveis`.

Formato:

```text
Sala 1,Sala 2,Sala 3,Online
```

Atendimentos online nao exigem sala fisica.

## Estagiarios

Use para acompanhar estudantes, vinculos e horarios.

Recursos:

- Listar estagiarios.
- Ver pacientes vinculados.
- Ver horarios cadastrados.
- Ativar ou desativar estagiario.
- Vincular supervisor a estagiario.

Mantenha os vinculos supervisor-estagiario atualizados a cada semestre ou troca de turma.

## Aprovar Horarios e Configuracoes

Estagiarios cadastram horarios em `Meus Horarios`. Coordenador e supervisor aprovam ou rejeitam.

Fluxo:

1. Acesse `Aprovar Horarios`.
2. Revise dia, hora inicial, hora final, turno e estagiario.
3. Confira limites operacionais.
4. Aprove horarios validos.
5. Rejeite horarios inadequados com observacao clara.

Configuracoes importantes em `sep_config`:

- `duracao_consulta_min`: duracao padrao da consulta.
- `max_estagiarios_diurno`: limite de estagiarios no turno diurno.
- `max_estagiarios_noturno`: limite de estagiarios no turno noturno.
- `max_estagiarios_slot`: limite de estagiarios no mesmo horario.
- `salas_disponiveis`: lista de salas separadas por virgula.
- `max_faltas_desligamento`: numero de faltas para desligamento automatico.

## Prontuarios

Prontuarios sao dados sensiveis. Acesse somente quando houver finalidade academica, clinica ou administrativa legitima.

Use para:

- Consultar registros clinicos.
- Acompanhar evolucao.
- Ver historico de vinculos.
- Conferir auditoria de acesso.
- Apoiar transferencias e altas.

## Altas Clinicas

Fluxo:

1. Acesse `Altas Clinicas`.
2. Abra a solicitacao.
3. Leia justificativa, resumo clinico, evolucao e plano.
4. Aprove se a alta estiver adequada.
5. Rejeite se precisar de continuidade ou ajuste, informando observacao.

Ao aprovar, o vinculo ativo e encerrado e o paciente passa para `alta`.

## Usuarios

Area exclusiva do coordenador.

Use para:

- Criar contas internas.
- Listar supervisores, recepcionistas e estagiarios.
- Ativar ou desativar usuarios.
- Criar senha provisoria.
- Conferir perfil e dados institucionais.

## Seguranca e Logs

Use `Seguranca` para acompanhar:

- Sessoes.
- Logs de seguranca.
- Logs do sistema.
- Logs de erro.
- Auditoria LGPD.

Os logs do sistema sao textuais e tambem estruturados. Eles ajudam a investigar problemas de horario de agenda, falhas de API, confirmacoes, cancelamentos e faltas.

## Checklist diario

1. Conferir dashboard.
2. Resolver triagens pendentes.
3. Verificar fila e casos urgentes.
4. Conferir horarios pendentes.
5. Revisar agenda e faltas registradas.
6. Avaliar altas clinicas pendentes.
7. Tratar usuarios, vinculos e permissoes quando necessario.

## Problemas comuns

Paciente nao aparece para agendar:

- Confirme se o status e `em_contato`.
- Confirme se existe pelo menos um contato registrado.
- Confirme se nao ha agendamento futuro ativo.
- Confirme se ha disponibilidade cadastrada.

Sala nao aparece no agendamento:

- Verifique `sep_config.salas_disponiveis`.
- Separe salas por virgula.
- Atualize a pagina apos alterar a configuracao.

Paciente foi desligado por falta:

- Verifique o total de faltas na agenda.
- Confira `max_faltas_desligamento`.
- Se houver retorno solicitado, use `Pacientes > Retornar`.

Horario aparece diferente:

- Confira `data_hora_inicio` no banco.
- Veja os logs de agenda/API.
- Verifique se o navegador esta interpretando horario local de Brasilia.

# Guia rapido - Agenda, status e faltas

Este guia resume como a agenda deve ser usada pelos perfis do SEP Sistema.

## Onde a agenda aparece

- Coordenador: `Agenda`, com visao geral e acoes administrativas.
- Supervisor: `Agenda`, limitada aos estagiarios supervisionados.
- Recepcionista: `Agenda do Dia` e fluxos de agendamento.
- Estagiario: `Minha Agenda`, para atendimento e registro de prontuario.
- Paciente: `Consultas`, para acompanhar, confirmar ou cancelar consultas proprias.

## Status de consulta

| Status | Significado | Principais acoes |
|---|---|---|
| `pendente` | Consulta criada e aguardando confirmacao. | Confirmar, cancelar ou registrar falta depois do horario. |
| `confirmado` | Consulta confirmada pela equipe ou pelo paciente. | Cancelar ou registrar falta depois do horario. |
| `realizado` | Atendimento ocorreu e o prontuario da sessao foi registrado. | Consulta encerrada. |
| `faltou` | Paciente nao compareceu. | Conta para o controle de faltas. |
| `cancelado_admin` | Consulta cancelada pela equipe. | Consulta encerrada. |
| `cancelado_paciente` | Consulta cancelada pelo paciente no portal. | Consulta encerrada. |

## Criacao de agendamento

Todo novo agendamento nasce com status `pendente`.

Isso significa que uma consulta futura ainda precisa ser confirmada. A confirmacao pode acontecer pela recepcao, pela coordenacao, pela supervisao quando aplicavel, ou pelo proprio paciente no portal.

Para criar agendamento:

1. O paciente precisa ter contato registrado.
2. O status do paciente precisa estar em `em_contato`.
3. O paciente nao pode ter outro agendamento futuro ativo.
4. A data e o horario precisam ser informados.
5. Se a modalidade for presencial, a sala deve ser escolhida na lista cadastrada em `sep_config`.

## Salas

As salas disponiveis sao configuradas pelo coordenador em `sep_config`, na chave `salas_disponiveis`.

Formato esperado:

```text
Sala 1,Sala 2,Sala 3,Online
```

Atendimentos presenciais exigem sala fisica. Atendimentos online nao usam sala fisica, mas podem usar link online quando o fluxo estiver disponivel.

## Confirmar consulta

Use confirmacao quando houver certeza de que a consulta esta mantida.

Efeito:

- O status passa de `pendente` para `confirmado`.
- A agenda passa a mostrar a consulta como confirmada.
- O registro fica auditavel nos logs do sistema.

## Cancelar consulta

Use cancelamento quando a consulta nao deve ocorrer.

Regras:

- Apenas consultas `pendente` ou `confirmado` podem ser canceladas.
- Informe sempre um motivo objetivo.
- Se era o unico agendamento ativo de um paciente ainda em status `agendado`, o paciente retorna para a fila.

## Registrar falta

Use `Registrar falta` quando o paciente nao compareceu.

Regras:

- A falta so deve ser registrada depois do horario da consulta.
- Apenas consultas `pendente` ou `confirmado` podem receber falta.
- Informe uma observacao objetiva, por exemplo: `Paciente nao compareceu e nao justificou`.

Efeito:

- A consulta passa para `faltou`.
- O total de faltas do paciente aumenta.
- O sistema compara o total com a configuracao `max_faltas_desligamento`.

## Controle de faltas e desligamento

A chave `max_faltas_desligamento` define o numero de faltas que desliga automaticamente o paciente do programa de atendimentos.

Padrao atual:

```text
max_faltas_desligamento = 3
```

Quando o limite e atingido:

- O paciente passa para status `desistencia`.
- O vinculo ativo com estagiario e encerrado.
- Agendamentos futuros ativos do paciente sao cancelados.
- Uma notificacao interna e registrada.

Se o paciente desligado por faltas solicitar retorno, o retorno deve ser feito pela recepcao ou coordenacao na tela `Pacientes`, usando `Retornar`.

## Realizar atendimento

O status `realizado` deve ser produzido pelo fluxo clinico do estagiario, ao registrar o prontuario da sessao.

Nao use cancelamento ou falta para consultas que foram atendidas. Nesses casos, o estagiario deve registrar o prontuario correspondente.

## Boas praticas

- Confirme data, hora, sala e modalidade antes de orientar o paciente.
- Evite registrar falta antes de verificar se houve comparecimento tardio ou justificativa institucional.
- Use observacoes curtas e objetivas.
- Nao coloque detalhes clinicos em motivo de cancelamento ou falta.
- Para duvidas sobre horario exibido na agenda, confira o registro no banco e os logs de agenda/API antes de ajustar manualmente.

# Guia de uso - Supervisor

## Objetivo do perfil

O supervisor acompanha a pratica clinica dos estagiarios, revisa registros, aprova horarios de atendimento e avalia solicitacoes de alta. O acesso e orientado aos estagiarios e pacientes sob sua supervisao.

## Menu disponivel

- `Dashboard`
- `Triagem`
- `Pacientes`
- `Agenda`
- `Estagiarios`
- `Aprovar Horarios`
- `Prontuarios`
- `Altas Clinicas`

Recursos globais como `Fila de Espera`, `Usuarios` e `Seguranca` sao exclusivos do coordenador. Retorno de paciente em `desistencia` deve ser encaminhado para recepcao ou coordenacao.

## Dashboard

Use para acompanhar pendencias clinicas e operacionais:

- Triagens pendentes.
- Horarios aguardando aprovacao.
- Agendamentos proximos.
- Solicitacoes de alta.
- Indicadores dos pacientes supervisionados.

## Triagem

Fluxo:

1. Acesse `Triagem`.
2. Abra o paciente.
3. Leia informacoes clinicas e contexto social.
4. Aprove se o paciente deve seguir para fila.
5. Rejeite apenas com motivo adequado.

Casos de risco devem ser priorizados e registrados com cuidado.

## Pacientes

Use para consultar situacao e historico dos pacientes relacionados aos estagiarios supervisionados.

Voce pode:

- Buscar pacientes.
- Filtrar por status.
- Abrir detalhes.
- Consultar documentos.
- Acompanhar vinculo com estagiario.
- Registrar ou revisar dados conforme fluxo disponivel.

Evite alterar status sem necessidade clinica ou operacional.

## Agenda

Use `Agenda` para acompanhar consultas dos estagiarios supervisionados.

Informacoes exibidas:

- Paciente.
- Estagiario.
- Data e horario.
- Modalidade.
- Sala ou link online.
- Status.
- Total de faltas.

### Acoes por status

- `pendente`: confirmar, cancelar ou registrar falta depois do horario.
- `confirmado`: cancelar ou registrar falta depois do horario.
- `realizado`: atendimento ja registrado por prontuario.
- `faltou`: ausencia ja registrada.
- `cancelado_admin` ou `cancelado_paciente`: consulta encerrada.

O supervisor so consegue atuar em agendamentos dos seus estagiarios vinculados.

### Faltas

Registre falta apenas quando o paciente nao compareceu e o horario da consulta ja passou.

Ao atingir `max_faltas_desligamento`, o sistema desliga automaticamente o paciente do programa:

- Status do paciente passa para `desistencia`.
- Vinculo ativo e encerrado.
- Agendamentos futuros ativos sao cancelados.

## Estagiarios

Use para acompanhar estudantes e carga de atendimento.

Recursos:

- Ver lista de estagiarios supervisionados.
- Consultar pacientes vinculados.
- Conferir horarios cadastrados.
- Acompanhar quantidade de pacientes ativos.

Se um estagiario nao aparecer, solicite ao coordenador revisao do vinculo supervisor-estagiario.

## Aprovar Horarios

Fluxo:

1. Acesse `Aprovar Horarios`.
2. Analise dia, hora inicial, hora final e turno.
3. Confira se o horario faz sentido para a operacao.
4. Aprove horarios validos.
5. Rejeite horarios inadequados com observacao clara.

Somente horarios aprovados entram no cruzamento de disponibilidade usado pela recepcao e coordenacao.

## Prontuarios

Prontuarios sao registros clinicos sensiveis.

Use para:

- Ver registros feitos pelos estagiarios.
- Acompanhar evolucao do paciente.
- Ver historico de vinculo.
- Conferir auditoria de acesso quando disponivel.
- Apoiar supervisoes clinicas.

Nao copie dados clinicos para canais externos sem autorizacao institucional.

## Altas Clinicas

Fluxo:

1. Acesse `Altas Clinicas`.
2. Abra a solicitacao.
3. Leia justificativa, evolucao, numero de sessoes e plano de encerramento.
4. Aprove se a alta estiver adequada.
5. Rejeite se for necessario continuar atendimento ou ajustar justificativa.

Ao aprovar:

- O vinculo ativo entre paciente e estagiario e encerrado.
- O paciente passa para `alta`.
- A decisao fica registrada.

## Checklist de supervisao

1. Conferir horarios pendentes.
2. Revisar agenda dos estagiarios.
3. Verificar faltas e cancelamentos.
4. Ler prontuarios relevantes.
5. Avaliar altas pendentes.
6. Orientar estagiarios com conflitos de agenda ou documentacao.

## Problemas comuns

Nao vejo um estagiario:

- Peca ao coordenador para revisar o vinculo supervisor-estagiario.
- Confirme se o estagiario esta ativo.

Nao consigo registrar falta:

- Confirme se o agendamento e dos seus estagiarios.
- Confirme se o status e `pendente` ou `confirmado`.
- Confirme se o horario da consulta ja passou.

Nao consigo aprovar alta com seguranca:

- Revise prontuarios.
- Confira numero de sessoes e evolucao.
- Solicite complementacao ao estagiario antes de aprovar.

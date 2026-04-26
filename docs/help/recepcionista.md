# Guia de uso - Recepcionista

## Objetivo do perfil

A recepcao opera o dia a dia do atendimento: acompanha fila, registra contatos, atualiza disponibilidade, cadastra pacientes presencialmente, avalia triagens operacionais, agenda consultas, confirma consultas, registra ausencias e reativa pacientes desistentes quando solicitado.

## Menu disponivel

- `Inicio do dia`
- `Fila de Espera`
- `Agenda do Dia`
- `Pacientes`
- `Estagiarios`
- `Cadastrar Paciente`
- `Agendar Consulta`
- `Triagem`

## Inicio do dia

Use para ver o resumo operacional:

- Pacientes com risco na fila.
- Pacientes sem contato recente.
- Quantidade de pacientes aguardando.
- Consultas do periodo.
- Consultas pendentes de confirmacao.

Rotina recomendada:

1. Abrir `Inicio do dia`.
2. Verificar alertas.
3. Conferir pacientes aguardando contato.
4. Abrir agenda e revisar consultas pendentes.
5. Trabalhar a fila por prioridade.

## Fila de Espera

A fila mostra pacientes aguardando atendimento, ordenados por risco, urgencia e data de cadastro.

Cada linha exibe:

- Posicao.
- Nome.
- Urgencia.
- Status.
- Telefone.
- Dias em espera.
- Total de contatos.
- Ultimo contato.
- Pendencias para agendamento.

### Registrar contato

Fluxo:

1. Acesse `Fila de Espera`.
2. Clique em `Registrar Contato`.
3. Escolha canal: ligacao, WhatsApp ou e-mail.
4. Escolha resultado.
5. Preencha observacao quando necessario.
6. Clique em `Salvar contato`.

Se o resultado indicar contato efetivo, o paciente passa para `em_contato`.

### Atualizar disponibilidade

Use quando o paciente informa horarios em que pode comparecer.

1. Clique em `Disponibilidade`.
2. Marque dias e horarios.
3. Clique em `Salvar disponibilidade`.

Essa disponibilidade sera usada para cruzar com os horarios aprovados dos estagiarios.

### Agendar pela fila

O botao `Agendar` deve ser usado apenas quando o paciente estiver apto.

Regras:

- Ter pelo menos um contato registrado.
- Estar com status `em_contato`.
- Nao possuir agendamento futuro ativo.

## Agendar Consulta

Fluxo:

1. Acesse `Agendar Consulta` ou use `Agendar` pela fila.
2. Selecione o paciente.
3. O sistema busca a disponibilidade do paciente.
4. O sistema cruza com horarios aprovados dos estagiarios.
5. Escolha um horario sugerido ou defina manualmente.
6. Informe data e hora.
7. Escolha modalidade.
8. Se for presencial, selecione uma sala cadastrada.
9. Confirme o agendamento.

Todo novo agendamento fica com status `pendente`, aguardando confirmacao.

### Salas

As salas vem da configuracao `sep_config.salas_disponiveis`.

Se a sala correta nao aparecer:

- Avise a coordenacao para atualizar a configuracao.
- Nao digite nomes livres fora da lista.
- Para atendimento online, sala fisica nao e obrigatoria.

## Agenda do Dia

Use para acompanhar e operar consultas.

E possivel:

- Ver horario.
- Ver paciente e estagiario.
- Ver modalidade e sala.
- Confirmar consulta.
- Cancelar consulta.
- Registrar falta.

### Confirmar consulta

Use quando a consulta esta mantida.

1. Abra a consulta.
2. Clique em `Confirmar consulta`.

O status passa de `pendente` para `confirmado`.

### Cancelar consulta

Use quando a consulta nao deve ocorrer.

1. Abra a consulta.
2. Clique em `Cancelar consulta`.
3. Informe o motivo.
4. Confirme.

Efeito:

- A consulta passa para `cancelado_admin`.
- Se era o unico agendamento ativo de um paciente ainda em `agendado`, ele retorna para a fila.

### Registrar falta

Use quando o paciente nao compareceu.

Regras:

- Registre apenas depois do horario da consulta.
- A consulta precisa estar `pendente` ou `confirmado`.
- Informe uma observacao objetiva.

Efeito:

- A consulta passa para `faltou`.
- O contador de faltas do paciente aumenta.
- Ao atingir `max_faltas_desligamento`, o paciente e desligado automaticamente do programa.

## Pacientes

Use para localizar pacientes e consultar dados.

Recursos:

- Buscar por nome, CPF ou telefone.
- Filtrar por status.
- Abrir detalhes.
- Ver informacoes de cadastro e atendimento.
- Retornar pacientes em `desistencia` para a fila.

### Retornar paciente desistente

Use quando um paciente que saiu da fila solicita retorno.

Fluxo:

1. Acesse `Pacientes`.
2. Filtre ou busque o paciente.
3. Clique em `Retornar`.
4. Informe observacao quando houver.
5. Confirme.

O paciente volta para `aguardando` com nova data de entrada na fila.

## Estagiarios

Use para consultar estagiarios, horarios aprovados e carga de atendimento.

Isso ajuda a escolher estagiario e horario no agendamento.

## Cadastrar Paciente

Use quando o cadastro for assistido pela recepcao.

Etapas:

1. Dados pessoais.
2. Triagem clinica.
3. Disponibilidade.
4. Acesso ao portal.

Campos obrigatorios principais:

- Nome.
- CPF.
- Telefone.
- Motivo da busca.

## Triagem

Use para avaliar cadastros online pendentes.

1. Acesse `Triagem`.
2. Abra detalhes do paciente.
3. Leia motivo da busca e dados clinicos.
4. Aprove para colocar na fila.
5. Rejeite apenas com motivo claro.

Casos com risco devem ser priorizados e encaminhados conforme protocolo do SEP.

## Checklist diario

1. Conferir alertas em `Inicio do dia`.
2. Confirmar consultas pendentes.
3. Trabalhar pacientes sem contato.
4. Atualizar disponibilidade quando informado.
5. Agendar pacientes aptos.
6. Registrar faltas de consultas ja ocorridas.
7. Reativar desistentes quando solicitado.
8. Registrar todos os contatos realizados.

## Problemas comuns

Botao agendar nao permite seguir:

- Verifique se ha contato registrado.
- Verifique se o status e `em_contato`.
- Verifique se ja existe agendamento ativo.

Nao ha horarios cruzados:

- Atualize disponibilidade do paciente.
- Confira se existem horarios aprovados.
- Se necessario, defina manualmente um horario valido.

Nao consigo registrar falta:

- Confirme se a consulta ja passou.
- Confirme se o status e `pendente` ou `confirmado`.
- Confira se voce esta na agenda correta.

Paciente foi desligado por falta:

- Oriente que o retorno precisa ser avaliado pela equipe.
- Se autorizado, use `Pacientes > Retornar`.

## Cuidados com dados

- Confirme identidade antes de falar sobre informacoes sensiveis.
- Nao registre detalhes clinicos desnecessarios em contato, cancelamento ou falta.
- Use os campos clinicos apropriados quando a informacao for de triagem.
- Encerre a sessao ao sair do computador.

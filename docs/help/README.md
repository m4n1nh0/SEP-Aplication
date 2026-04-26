# Guias de uso do SEP Sistema

Este diretorio reune os documentos de ajuda por perfil de usuario do SEP Sistema v3.

Os guias foram escritos para uso operacional: explicam o que cada perfil consegue fazer, quais telas aparecem no menu, quais fluxos devem ser seguidos e quais cuidados sao importantes no dia a dia.

## Perfis disponiveis

- [Coordenador](./coordenador.md): administracao geral do sistema, usuarios, seguranca, regras de agenda, fila, triagem, retorno de desistentes e supervisao global.
- [Supervisor](./supervisor.md): acompanhamento clinico dos estagiarios, aprovacao de horarios, revisao de prontuarios e avaliacao de altas.
- [Recepcionista](./recepcionista.md): operacao da fila, contato com pacientes, cadastro presencial, atualizacao de disponibilidade, retorno de desistentes e agendamento.
- [Estagiario](./estagiario.md): cadastro de horarios, agenda, acompanhamento de pacientes, prontuarios e solicitacao de alta.
- [Paciente](./paciente.md): solicitacao de atendimento, acompanhamento da fila, disponibilidade, consultas, documentos e confirmacao/cancelamento.
- [Agenda, status e faltas](./agenda-status.md): referencia comum para status de consulta, confirmacao, cancelamento, falta, salas e desligamento por faltas.

## Acesso inicial

1. Acesse a pagina inicial do sistema.
2. Informe e-mail e senha.
3. Se o usuario tiver autenticacao em dois fatores ativa, informe o codigo do aplicativo autenticador.
4. Apos o login, o sistema redireciona automaticamente para a area correta conforme o perfil.

## Regras gerais de seguranca

- Cada pessoa deve usar somente a propria conta.
- Nao compartilhe senhas nem codigos de autenticacao em dois fatores.
- Registre informacoes clinicas apenas nos campos apropriados.
- Evite expor dados sensiveis em observacoes operacionais quando nao forem necessarios.
- Ao terminar o uso em computador compartilhado, clique em `Sair`.

## Ciclo geral de atendimento

1. O paciente solicita atendimento pelo portal ou e cadastrado presencialmente.
2. A triagem e avaliada e aprovada ou rejeitada.
3. Pacientes aprovados entram na fila de espera.
4. A recepcao registra contato e confirma disponibilidade.
5. O agendamento e criado quando o paciente esta apto.
6. A consulta nasce como `pendente` e pode ser confirmada pela equipe ou pelo paciente.
7. O estagiario atende, registra prontuario e acompanha evolucao.
8. Quando indicado, o estagiario solicita alta clinica.
9. O supervisor avalia a alta e encerra o vinculo quando aprovada.

Se o paciente solicitar saida da fila, o status passa para `desistencia`. Caso ele entre em contato posteriormente pedindo retorno, recepcao ou coordenador podem reativa-lo pela tela `Pacientes`. O retorno coloca o paciente novamente em `aguardando`, sem estagiario vinculado e com nova data de entrada na fila.

Faltas registradas em consulta contam para o controle de desligamento. Ao atingir o limite configurado em `max_faltas_desligamento`, o paciente passa automaticamente para `desistencia`, os vinculos ativos sao encerrados e agendamentos futuros ativos sao cancelados.

## Convencoes usadas nos guias

- `Menu > Item` indica o caminho no menu lateral ou abas da tela.
- "Status" se refere ao estado operacional do paciente ou consulta.
- "Disponibilidade" se refere aos dias e horarios em que o paciente pode comparecer.
- "Slot" se refere ao horario cadastrado pelo estagiario e aprovado para atendimento.

## Manutencao dos documentos

Atualize estes guias sempre que houver mudanca de tela, fluxo, regra de negocio ou permissao. Para mudancas pequenas de texto, atualize somente o arquivo do perfil afetado. Para mudancas de fluxo entre perfis, revise tambem este indice e o guia [Agenda, status e faltas](./agenda-status.md).

# SEP v3 — Sistema de Gestão do Serviço Escola de Psicologia

> **Estácio Aracaju** · Curso de Psicologia  
> Desenvolvido de março a abril de 2026

> 🎓 Projeto desenvolvido como atividade prática da disciplina **Modelagem de Processos**,
> em colaboração com alunos dos cursos de **Administração**, **Ciências Contábeis** e **Tecnologia**.

> 👨‍💻 Idealizado e desenvolvido pelo **Prof. Me. Mariano Mendonça**, dos cursos de Computação da Estácio Aracaju.
> O projeto está em fase de transição para ser mantido e evoluído por **alunos dos cursos de TI**,
> como oportunidade de aprendizado prático em um sistema real em produção.

---

## Origem e Motivação

O Serviço Escola de Psicologia (SEP) da Estácio Aracaju é um serviço clínico onde alunos do curso realizam atendimentos supervisionados à comunidade. A gestão do serviço envolve múltiplos atores — coordenação, supervisores, estagiários, recepção e pacientes — e demanda organização cuidadosa de filas, horários, prontuários e acompanhamento clínico.

A oportunidade de melhoria identificada pela coordenação do curso foi a **centralização e digitalização desse fluxo**: reunir em um único sistema o controle de atendimentos, a comunicação entre equipe e pacientes, o registro seguro de prontuários e os indicadores de desempenho — tudo com rastreabilidade e conformidade LGPD.

O projeto foi concebido para cobrir o ciclo completo — do cadastro do paciente até a alta clínica — com controles de acesso granulares por perfil e dados em tempo real para apoiar as decisões da coordenação e os relatórios de consultoria do curso.

---

## Visão Geral

```
Paciente se cadastra → Triagem clínica → Fila priorizada → Contato e agendamento
→ Atendimento com prontuário eletrônico → Alta com aprovação do supervisor
```

O sistema opera como **monolito**: servidor Express serve a API e os arquivos do React compilado em uma única URL. Em desenvolvimento, `npm run dev` sobe os dois processos em paralelo (API :3001 + Vite :5173).

Os guias operacionais por perfil ficam em [`docs/help`](./docs/help/README.md). Para regras de agenda, status, faltas e salas, consulte [`docs/help/agenda-status.md`](./docs/help/agenda-status.md).

---

## Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| Frontend | React 18 · TypeScript · Vite · React Router v6 |
| Backend | Node.js · Express · TypeScript · ts-node |
| Banco de dados | MySQL 8.0 · mysql2/promise · timezone `-03:00` |
| Autenticação | JWT com jti UUID · sessões persistidas no banco · revogação individual |
| 2FA | TOTP via `otplib` + QR Code |
| Armazenamento | AWS S3 · SSE-AES256 · URLs presigned 15 min |
| Agenda | FullCalendar v6 (daygrid · timegrid · interaction) |
| Segurança | Helmet · CORS restrito · Rate limiting por rota · Bloqueio por tentativas |
| Deploy | Railway (produção) · Render + PlanetScale (demo gratuita) |
| CI/CD | GitHub Actions (deploy automático no push para `main`) |

---

## Estrutura do Projeto

```
sep-v3/
├── client/                          # React + Vite
│   └── src/
│       ├── components/
│       │   ├── AgendaCalendar.tsx   # Calendário FullCalendar reutilizável
│       │   ├── Sidebar.tsx          # Sidebar com identidade por perfil
│       │   └── ui.tsx               # Design system: Btn, Modal, Toast, Card...
│       ├── context/AuthContext.tsx
│       ├── hooks/useResponsive.ts
│       ├── pages/
│       │   ├── admin/AdminApp.tsx   # Coordenador + Supervisor
│       │   ├── recepcao/RecepcionistaApp.tsx
│       │   ├── estagiario/EstagiarioApp.tsx
│       │   └── portal/PortalApp.tsx # Portal do Paciente
│       └── services/api.ts          # Todas as chamadas HTTP
│
├── server/                          # Express + TypeScript
│   └── src/
│       ├── controllers/
│       │   ├── admin.ts             # Dashboard, fila, pacientes, agendamentos
│       │   ├── auth.ts              # Login, JWT, 2FA, usuários internos
│       │   ├── outros.ts            # Estagiário + Portal paciente
│       │   ├── prontuarios.ts       # Prontuários, S3, auditoria LGPD
│       │   ├── recepcao.ts          # Operacional da recepção
│       │   ├── vinculos.ts          # Vínculos estagiário-paciente
│       │   ├── altas.ts             # Alta clínica com aprovação
│       │   └── logs.ts              # Leitura de logs para o painel admin
│       ├── db/connection.ts         # Pool MySQL com timezone BRT
│       ├── middleware/
│       │   ├── auth.ts              # JWT + ipMiddleware + permitir()
│       │   ├── rateLimiter.ts       # Limites por rota
│       │   ├── upload.ts            # Multer
│       │   └── vinculo.ts           # checkVinculo + auditAccess
│       ├── routes/index.ts          # Matriz de permissões completa
│       ├── types/index.ts
│       └── utils/
│           ├── logger.ts            # Logger estruturado (JSON prod / colorido dev)
│           └── s3.ts                # Upload, download, presigned URLs
│
├── database/
│   ├── schema.sql                   # Estrutura completa (17 tabelas)
│   ├── schema_planetscale.sql       # Versão sem CREATE DATABASE (demo)
│   ├── seeds.sql                    # Dados de demonstração realistas
│   └── migrations/                  # Migrations versionadas
│       ├── 20250329_001_schema_base.sql
│       ├── 20250329_002_prontuarios_seguranca_s3.sql
│       ├── 20250329_003_paciente_documentos_legado.sql
│       └── 20250329_004_perfil_coordenador_supervisor.sql
│
├── .github/workflows/
│   ├── deploy.yml                   # Push main → Railway
│   ├── deploy-demo.yml              # Push demo → Render (gratuito)
│   └── seed-demo.yml                # Manual → carrega seeds no PlanetScale
│
├── railway.json                     # startCommand: npm run dev
├── render.yaml                      # Configuração Render.com
├── Procfile                         # Fallback: web: npm run dev
└── package.json                     # Scripts: dev, build, start, migrate
```

---

## Perfis de Usuário

O sistema tem **5 perfis** com identidade visual e permissões distintas:

| Perfil | Sidebar | Rota | Acesso |
|---|---|---|---|
| **Coordenador** | Âmbar escuro `#1c1a14` | `/supervisor` | Tudo: usuários, KPIs, segurança, config, fila, todos os pacientes |
| **Supervisor** | Âmbar escuro `#1c1a14` | `/supervisor` | Apenas seus estagiários: pacientes, agenda, prontuários, altas |
| **Recepcionista** | Teal escuro `#0a1e24` | `/recepcao` | Fila, triagem, pacientes, estagiários, agenda, cadastro, agendar |
| **Estagiário** | Lavanda `#130e24` | `/estagiario` | Horários, agenda, meus pacientes + prontuários + documentos, alta |
| **Paciente** | Verde `#0a1f12` | `/portal` | Portal: status, consultas, fila, disponibilidade, documentos |

### Regras de Acesso (Servidor)

- **Coordenador** vê todos os dados globais
- **Supervisor** só vê dados dos seus estagiários via `vinculos_supervisor_estagiario` — filtro aplicado no controller, não no front
- **Recepcionista** não acessa prontuários, logs, config ou altas
- **Estagiário** só acessa pacientes com vínculo ativo via `checkVinculo` middleware
- **Paciente** só acessa seus próprios dados via `/portal/*`

Validação de e-mail institucional configurável via `.env`:
```
EMAIL_DOMINIO_COORDENADOR=estacio.br
EMAIL_DOMINIO_SUPERVISOR=estacio.br
EMAIL_DOMINIO_ESTAGIARIO=alunos.estacio.br
```

---

## Banco de Dados — 17 Tabelas

| Tabela | Descrição |
|---|---|
| `usuarios` | Perfil ENUM: coordenador, supervisor, recepcionista, estagiario, paciente |
| `sessoes` | JWT com jti UUID, revogação individual, bloqueio por IP |
| `logs_seguranca` | Ações de auth: login, logout, 2FA, criação de usuário |
| `estagiarios` | Matrícula, semestre, supervisor vinculado |
| `estagiario_slots` | Horários: pendente / aprovado / rejeitado. Turno calculado |
| `pacientes` | Urgência ENUM, risco suicídio, disponibilidade JSON |
| `agendamentos` | Sessão número, modalidade, sala, link online — duração fixa 60 min |
| `prontuarios` | Queixa, descrição, intervenções, evolução, plano. 1:1 com agendamento |
| `vinculos_estagiario_paciente` | Ativo + histórico. Controla acesso a prontuários |
| `vinculos_supervisor_estagiario` | Supervisor supervisiona grupo de estagiários |
| `audit_prontuarios` | Log LGPD: quem, quando, ação (visualizou/editou/baixou) |
| `documentos` | Metadados S3: s3_key, bucket, mime_type, tamanho, status |
| `altas_clinicas` | Fluxo: pendente → aprovada/rejeitada. Encerra vínculo automaticamente |
| `notificacoes` | Histórico de contatos: ligação, WhatsApp, e-mail |
| `sep_config` | Parâmetros: duração consulta, capacidade, salas e limite de faltas |
| `recuperacao_senha` | Token com expiração de 30 minutos |
| `_migrations` | Controle de migrations: arquivo, data. Nunca re-executa |

### Sistema de Migrations

```bash
npm run migrate              # Aplica pendentes (produção)
npm run migrate:status       # Lista o que já foi aplicado
npm run migrate:create nome  # Cria novo arquivo de migration
```

**Nunca use `db:reset` em produção.** Só para desenvolvimento local.

---

## Fluxo de Atendimento

```
1. CADASTRO
   Paciente se registra com dados pessoais, motivo da busca,
   disponibilidade de horários e nível de urgência.

2. TRIAGEM CLÍNICA
   Coordenador, supervisor ou recepcionista avalia o cadastro.
   Aprova (vai para fila) ou rejeita com justificativa.

3. FILA DE ESPERA
   Pacientes aprovados entram na fila priorizada:
   risco suicídio → urgência → data de cadastro.
   Query com posição em tempo real (ROW_NUMBER), dias de espera,
   contatos realizados e próximo agendamento.

4. CONTATO E AGENDAMENTO
   Recepcionista registra contatos (ligação/WhatsApp/e-mail) e
   cruza disponibilidade do paciente com horários aprovados do
   estagiário para agendar. Duração fixa: 60 minutos.
   Todo novo agendamento nasce como pendente e aguarda confirmação.

5. ATENDIMENTO CLÍNICO
   Estagiário acessa prontuário direto pela agenda (clique no evento).
   Supervisor acompanha evolução dos seus alunos.
   Documentos enviados ao S3 com criptografia AES-256.

6. ALTA CLÍNICA
   Estagiário solicita alta com resumo do caso →
   Supervisor/coordenador aprova ou rejeita →
   Vínculo encerrado automaticamente → Status: Alta.
```

---

## Indicadores de Desempenho (KPIs)

Dashboard do coordenador executa 6 queries paralelas:

| Indicador | Cálculo | Limiar saudável |
|---|---|---|
| Tempo médio de espera | `AVG(TIMESTAMPDIFF(DAY, cadastro, 1ª sessão))` | ≤ 14 dias |
| Taxa de comparecimento | Realizados ÷ (Agendados − Cancelados) × 100 · 30d | ≥ 80% |
| Taxa de desistência | (Desistências + Cancelados) ÷ Total × 100 | ≤ 10% |
| Altas no mês | COUNT altas aprovadas no mês corrente | — |
| Carga média por estagiário | Vínculos ativos ÷ Estagiários com vínculos | — |
| Evolução semanal | Novos cadastros e altas por semana · 8 semanas | — |

Dados de demonstração populam os KPIs com valores realistas: ~13 dias de espera, 83% de comparecimento, 20% de desistência e 4 altas no período.

---

## Segurança

- **JWT** com `jti` UUID registrado em `sessoes` — revogação individual (`/auth/logout`) ou total (`/auth/logout-todos`)
- **2FA TOTP** opcional via `otplib` — QR Code gerado no primeiro acesso
- **Rate limiting** por rota: auth (5 tentativas), cadastro, upload
- **Bloqueio de conta** após 5 tentativas falhas por 30 minutos
- **Helmet** + CORS restrito ao `CLIENT_URL` do `.env`
- **AWS S3** com SSE-AES256 — URLs de download expiram em 15 minutos
- **Auditoria LGPD** — todo acesso a prontuário grava em `audit_prontuarios`: usuário, ação, IP, user-agent. Visível só para coordenador e supervisor
- **checkVinculo** middleware — estagiário sem vínculo ativo recebe 403
- **Logs estruturados** em `./logs/sep.log` com rotação automática a 10 MB

---

## Calendário de Agenda (FullCalendar v6)

Componente `AgendaCalendar` reutilizável em todos os perfis:

- Visões: **Mês**, **Semana**, **Dia** nos perfis com calendário completo
- Eventos coloridos por status: verde (confirmado), laranja (pendente), teal (realizado), vermelho (cancelado), roxo (faltou)
- Clique no evento abre modal com ações conforme perfil: confirmar consulta, cancelar com motivo, registrar falta ou registrar prontuário (estagiário)
- `onRangeChange` busca automaticamente os agendamentos do período visível
- Timezone: strings do banco (horário de Brasília) passadas sem sufixo Z para o FullCalendar sem plugin de timezone
- Duração garantida: `toISOEnd` calcula fim = início + 60 min quando `data_hora_fim` é nulo (evita evento invisível na grade horária)

Status principais da agenda:

| Status | Uso |
|---|---|
| `pendente` | Consulta criada e aguardando confirmação |
| `confirmado` | Consulta confirmada pela equipe ou paciente |
| `realizado` | Atendimento registrado via prontuário |
| `faltou` | Ausência do paciente registrada pela equipe |
| `cancelado_admin` | Consulta cancelada pela equipe |
| `cancelado_paciente` | Consulta cancelada pelo paciente |

Faltas incrementam o contador do paciente. Ao atingir `max_faltas_desligamento`, o sistema muda o paciente para `desistencia`, encerra vínculos ativos e cancela agendamentos futuros ativos.

---

## Configurações Parametrizáveis

Tabela `sep_config` gerenciada pelo coordenador na tela Aprovar Horários:

| Chave | Padrão | Descrição |
|---|---|---|
| `duracao_consulta_min` | `60` | Duração de cada consulta em minutos |
| `max_estagiarios_diurno` | `2` | Máx. estagiários aprovados no turno 08h–18h por dia |
| `max_estagiarios_noturno` | `2` | Máx. estagiários no turno 18h+ por dia |
| `max_estagiarios_slot` | `1` | Máx. estagiários no mesmo horário exato |
| `salas_disponiveis` | `Sala 1,Sala 2,...` | Lista de salas separada por vírgula |
| `max_faltas_desligamento` | `3` | Total de faltas que desliga automaticamente o paciente |

---

## Instalação e Execução Local

### Pré-requisitos
- Node.js 18+
- MySQL 8.0 rodando localmente (ou Docker)
- Git

### Passos

```bash
# 1. Clone o repositório
git clone https://github.com/SEU_USUARIO/sep-sistema-v3.git
cd sep-sistema-v3

# 2. Instala dependências
npm install
npm install --prefix server
npm install --prefix client

# 3. Configura o banco (MySQL local)
# Crie o banco:
mysql -u root -p -e "CREATE DATABASE sep_db CHARACTER SET utf8mb4;"

# 4. Cria o server/.env
cp server/.env.example server/.env
# Edite com suas credenciais MySQL e JWT_SECRET

# 5. Sobe o schema e dados de demo
npm run db:reset

# 6. Inicia em modo desenvolvimento
npm run dev
# API:  http://localhost:3001
# App:  http://localhost:5173
```

### Scripts disponíveis

```bash
npm run dev              # Dev: API (ts-node) + Vite em paralelo
npm run build            # Build: client/dist + server/dist
npm run start            # Produção: NODE_ENV=production node server/dist/index.js
npm run migrate          # Aplica migrations pendentes
npm run migrate:status   # Lista migrations aplicadas
npm run migrate:create   # Cria novo arquivo de migration
npm run db:reset         # ⚠ Dev only: recria schema + seeds
```

---

## Variáveis de Ambiente

Crie `server/.env` baseado em `server/.env.example`:

```env
# Servidor
NODE_ENV=development
PORT=3001

# Banco MySQL
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=sua_senha
DB_NAME=sep_db

# JWT
JWT_SECRET=gere_64_chars_com_node_crypto_randomBytes
JWT_EXPIRES_IN=8h

# Segurança
MAX_LOGIN_ATTEMPTS=5
LOCK_TIME_MINUTES=30

# Upload local (sem S3 em dev)
UPLOAD_DIR=./uploads
MAX_FILE_SIZE_MB=20

# URLs (ajustar em produção)
CLIENT_URL=http://localhost:5173
APP_URL=http://localhost:3001

# Domínios institucionais (deixar vazio = aceita qualquer e-mail)
EMAIL_DOMINIO_COORDENADOR=estacio.br
EMAIL_DOMINIO_SUPERVISOR=estacio.br
EMAIL_DOMINIO_ESTAGIARIO=alunos.estacio.br

# AWS S3 (opcional em desenvolvimento)
AWS_REGION=sa-east-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=
S3_URL_TTL_SECONDS=900

# Logs
LOG_LEVEL=info
LOG_DIR=./logs
```

---

## Deploy em Produção — Railway

O projeto inclui `railway.json` configurado para deploy com `npm run dev`:

```json
{
  "build": {
    "buildCommand": "npm install && npm install --prefix server && npm install --prefix client"
  },
  "deploy": {
    "startCommand": "npm run dev"
  }
}
```

### Variáveis obrigatórias no Railway

```
NODE_ENV=development
PORT=3001
DB_HOST=${{MySQL.MYSQLHOST}}
DB_PORT=${{MySQL.MYSQLPORT}}
DB_USER=${{MySQL.MYSQLUSER}}
DB_PASSWORD=${{MySQL.MYSQLPASSWORD}}
DB_NAME=${{MySQL.MYSQLDATABASE}}
JWT_SECRET=<64 chars gerados com node crypto>
CLIENT_URL=https://seu-app.up.railway.app
APP_URL=https://seu-app.up.railway.app
# + variáveis AWS S3 e e-mail institucional
```

Após o primeiro deploy, execute no terminal do Railway:
```bash
npm run migrate
```

### Deploy via GitHub Actions

Push na branch `main` dispara o workflow `.github/workflows/deploy.yml` automaticamente.

**Secrets necessários no GitHub:**
- `RAILWAY_TOKEN` — Railway → Account Settings → Tokens
- `RAILWAY_SERVICE_ID` — Railway → seu serviço → Settings → Service ID

---

## Demo Gratuita — Render + PlanetScale

Para apresentações sem custo:

| Serviço | Limite |
|---|---|
| Render.com | 750h/mês · dorme após 15 min inativo |
| PlanetScale | 5 GB · 1 bilhão leituras/mês |

Branch `demo` → workflow `deploy-demo.yml` → Render.

Para resetar os dados demo:
```
GitHub → Actions → "Carregar dados demo" → Run workflow → Digite: RESETAR
```

---

## Credenciais de Demonstração

| Perfil | E-mail | Senha |
|---|---|---|
| Coordenador | admin@sep.estacio.br | Admin@123 |
| Supervisor | supervisor@sep.estacio.br | Admin@123 |
| Recepcionista | recepcao@sep.estacio.br | Admin@123 |
| Estagiário | ana.paula@estacio.br | Estag@123 |
| Paciente | pedro@email.com | Pac@123 |

---

## Dados de Demonstração

Os seeds carregam um cenário realista com:

- 5 perfis de acesso prontos para uso
- 4 estagiários com horários aprovados e pacientes vinculados
- 15 pacientes com histórico completo: triagem → fila → atendimento → alta e desistência
- 20+ agendamentos em datas relativas ao dia de instalação (últimos 90 dias)
- 4 altas clínicas aprovadas com resumo de caso
- Prontuários de sessões realizadas com queixa, intervenção e evolução
- KPIs populados: ~13 dias de espera · 83% comparecimento · 20% desistência · 4 altas

---

## Logs do Sistema

O logger (`server/src/utils/logger.ts`) opera sem dependências externas:

- **Desenvolvimento**: saída colorida no terminal com nível, timestamp BRT e metadados
- **Produção**: JSON estruturado em `./logs/sep.log`
- **Erros**: duplicados em `./logs/sep-error.log`
- **Auditoria LGPD**: `./logs/sep-audit.log` — quem acessou qual prontuário e quando
- **Rotação automática** ao atingir 10 MB

Tela de logs disponível para o coordenador em **Segurança & Logs** → aba Logs do sistema, com filtro por tipo (Aplicação / Erros / Auditoria) e atualização manual.

---

## O que está implementado

- [x] Cadastro digital completo do paciente (4 etapas)
- [x] Fila de espera priorizada (risco → urgência → data)
- [x] Triagem clínica com aprovação/rejeição
- [x] Registro de contatos (ligação, WhatsApp, e-mail)
- [x] Cruzamento de disponibilidades para agendamento
- [x] Confirmação de consulta, cancelamento e registro de falta
- [x] Prontuário eletrônico por sessão (PEP) com registro pela agenda
- [x] Upload de documentos → AWS S3 com AES-256
- [x] Auditoria LGPD de todo acesso a prontuário
- [x] Alta clínica com fluxo de aprovação supervisor/coordenador
- [x] Transferência de estagiário com migração de acesso
- [x] 5 perfis com permissões granulares e escopo por supervisor
- [x] Validação de e-mail institucional via `.env`
- [x] JWT com revogação individual/total + 2FA TOTP
- [x] Migrations versionadas para produção
- [x] KPIs: tempo espera, comparecimento, desistência, altas, evolução semanal
- [x] Calendário interativo FullCalendar em todos os perfis
- [x] Configurações parametrizáveis: duração, capacidade, salas e limite de faltas
- [x] Gestão de documentos pelo paciente e pela recepção
- [x] Portal do paciente com autoatendimento
- [x] Logger estruturado com tela de logs no painel admin
- [x] CI/CD via GitHub Actions para Railway e Render
- [ ] Consentimento LGPD explícito no cadastro (checkbox + política)
- [ ] Relatório mensal exportável (PDF/CSV)
- [ ] Criptografia de campos sensíveis em repouso (AES-256 application level)

---

## Licença

Uso interno — Estácio Aracaju · Curso de Psicologia e Cursos de Tecnologia.  
Todos os dados de pacientes são ficcionais nos seeds de demonstração.

# Deploy e containers

Este projeto pode ser executado de duas formas:

- **Monolito**: API Express e React compilado no mesmo container.
- **Separado**: API e Web em containers/servicos independentes.

O modo e escolhido no deploy, sem alterar o codigo da aplicacao.

## Arquivos principais

| Arquivo | Uso |
|---|---|
| `Dockerfile` | Build monolitico: compila client + server e serve tudo pelo Express. |
| `server/Dockerfile` | Build da API isolada. |
| `client/Dockerfile` | Build do frontend estatico servido por Caddy. |
| `docker-compose.yml` | Execucao local com perfis `monolith` e `split`. |
| `railway.json` | Config Railway do monolito. |
| `railway.api.json` | Config Railway da API separada. |
| `railway.web.json` | Config Railway do frontend separado. |
| `.github/workflows/railway-monolith.yml` | Deploy manual do monolito no Railway. |
| `.github/workflows/railway-split.yml` | Deploy manual de API/Web separados no Railway. |

## Execucao local com Docker Compose

### Monolito

```bash
docker compose --profile monolith up --build
```

Acesse:

```text
http://localhost:3001
```

### API e Web separados

```bash
docker compose --profile split up --build
```

Acesse:

```text
Web: http://localhost:5173
API: http://localhost:3001/api/health
```

### Popular dados de demonstracao

Depois que o MySQL estiver de pe:

```bash
docker compose exec -T mysql mysql -uroot -proot123 sep_db < database/seeds.sql
```

As migrations rodam automaticamente nos containers da aplicacao quando `RUN_MIGRATIONS=true`.

## Variaveis importantes

### API ou monolito

```env
NODE_ENV=production
PORT=3001
DB_HOST=
DB_PORT=3306
DB_USER=
DB_PASSWORD=
DB_NAME=sep_db
JWT_SECRET=
CLIENT_URL=
APP_URL=
RUN_MIGRATIONS=true
LOG_LEVEL=info
LOG_DIR=/app/logs
UPLOAD_DIR=/app/uploads
```

No monolito:

```env
SERVE_CLIENT=true
CLIENT_URL=https://seu-monolito.up.railway.app
APP_URL=https://seu-monolito.up.railway.app
```

Na API separada:

```env
SERVE_CLIENT=false
CLIENT_URL=https://seu-front.up.railway.app
APP_URL=https://sua-api.up.railway.app
```

### Web separada

```env
VITE_API_URL=https://sua-api.up.railway.app/api
```

`VITE_API_URL` e usado no build do frontend. Se nao for definido, o frontend usa `/api`, que e correto para monolito, mas nao para servicos separados.

## Deploy monolitico no Railway

1. Crie um projeto no Railway.
2. Adicione um servico MySQL ou configure um MySQL externo.
3. Crie um servico para a aplicacao, por exemplo `sep-monolith`.
4. Configure as variaveis de banco, `JWT_SECRET`, `CLIENT_URL`, `APP_URL` e `RUN_MIGRATIONS`.
5. No GitHub, cadastre o secret `RAILWAY_TOKEN`.
6. Execute o workflow `Deploy Railway - Monolith`.

O workflow usa:

- `railway.json`
- `Dockerfile`
- `railway up --ci --service <servico>`

## Deploy separado no Railway

Crie dois servicos no mesmo projeto:

- `sep-api`
- `sep-web`

### API

Variaveis principais:

```env
SERVE_CLIENT=false
RUN_MIGRATIONS=true
CLIENT_URL=https://seu-front.up.railway.app
APP_URL=https://sua-api.up.railway.app
```

### Web

Variavel principal:

```env
VITE_API_URL=https://sua-api.up.railway.app/api
```

Execute o workflow `Deploy Railway - Split API and Web`.

Opcoes:

- `target=both`: deploy da API e Web.
- `target=api`: somente API.
- `target=web`: somente frontend.
- `web_api_url`: define/atualiza `VITE_API_URL` antes do build do frontend.

O workflow copia `railway.api.json` ou `railway.web.json` para `railway.json` antes de chamar `railway up`, entao cada servico sobe com o Dockerfile correto.

## Deploy automatico pelo Railway

Se voce preferir usar o auto-deploy do Railway direto pelo GitHub:

- Monolito: use o `railway.json` da raiz.
- API separada: configure o servico para usar `/railway.api.json` como config file.
- Web separada: configure o servico para usar `/railway.web.json` como config file.

Como o Railway procura `railway.json` por padrao, os servicos separados precisam apontar explicitamente para o config correto.

## Observacoes

- O Railway injeta a variavel `PORT`; os containers respeitam essa porta.
- O monolito faz healthcheck em `/api/health`.
- A Web separada faz healthcheck em `/`.
- O frontend separado usa Caddy para servir SPA com fallback para `index.html`.
- O container da API nao serve arquivos do React quando `SERVE_CLIENT=false`.
- Migrations sao seguras para producao: cada arquivo `.sql` roda apenas uma vez.

## Referencias oficiais

- Railway CLI deploy: https://docs.railway.com/cli/deploying
- `railway up`: https://docs.railway.com/cli/up
- Dockerfiles no Railway: https://docs.railway.com/builds/dockerfiles
- Config as Code: https://docs.railway.com/config-as-code/reference

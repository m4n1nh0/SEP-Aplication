# SEP — Migrations

Sistema de controle de versão do banco de dados.
Cada arquivo `.sql` é executado **uma única vez** e nunca re-executado.

## Comandos

```powershell
# Ver o que está pendente
npm run migrate:status

# Aplicar migrations pendentes (seguro em produção)
npm run migrate

# Criar nova migration
npm run migrate:create nome_da_mudanca
```

## Como funciona

O runner cria automaticamente a tabela `_migrations` no banco.
Cada migration aplicada é registrada lá com nome e data.
Na próxima execução, só roda o que ainda não está na tabela.

## Convenção de nomes

```
YYYYMMDD_NNN_descricao_curta.sql
20250329_001_schema_base.sql
20250329_002_vinculos_s3.sql
20250401_001_adicionar_campo_prontuario.sql
```

## Regras de ouro

1. **NUNCA** use `DROP TABLE` ou `TRUNCATE` — perde dados em produção
2. Sempre use `IF NOT EXISTS` / `IF EXISTS` nas DDLs
3. Migrations são **imutáveis** após aplicadas em produção — crie uma nova para corrigir
4. Teste localmente com `npm run migrate:status` antes de aplicar

## Fluxo de desenvolvimento

```
Desenvolvimento local    →    Teste/Homologação    →    Produção
npm run db:reset              npm run migrate           npm run migrate
(recria tudo do zero)         (aplica só o novo)        (aplica só o novo)
```

O `db:reset` (schema + seeds) **só** deve ser usado em desenvolvimento local.
Em qualquer outro ambiente, sempre use `migrate`.

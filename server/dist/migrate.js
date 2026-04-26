"use strict";
/**
 * SEP — Migration Runner
 * Executa apenas migrations que ainda não foram aplicadas.
 * Nunca re-executa, nunca destrói dados existentes.
 *
 * Uso:
 *   npm run migrate          → aplica migrations pendentes
 *   npm run migrate:status   → lista o que foi e o que falta aplicar
 *   npm run migrate:create nome_da_migration  → cria arquivo novo
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const promise_1 = __importDefault(require("mysql2/promise"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const MIGRATIONS_DIR = path_1.default.join(__dirname, '../database/migrations');
async function getConnection() {
    return promise_1.default.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'sep_db',
        charset: 'utf8mb4',
        multipleStatements: true, // necessário para executar múltiplos statements por arquivo
    });
}
// Garante que a tabela de controle existe
async function ensureMigrationsTable(conn) {
    await conn.execute(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      arquivo     VARCHAR(255) NOT NULL UNIQUE,
      aplicado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      checksum    VARCHAR(64)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
}
// Lista migrations já aplicadas
async function getAplicadas(conn) {
    const [rows] = await conn.execute('SELECT arquivo FROM _migrations ORDER BY arquivo');
    return new Set(rows.map((r) => r.arquivo));
}
// Lista arquivos .sql na pasta de migrations, ordenados
function getMigrationFiles() {
    if (!fs_1.default.existsSync(MIGRATIONS_DIR)) {
        fs_1.default.mkdirSync(MIGRATIONS_DIR, { recursive: true });
        return [];
    }
    return fs_1.default.readdirSync(MIGRATIONS_DIR)
        .filter(f => f.endsWith('.sql'))
        .sort(); // ordem alfabética = ordem cronológica (pelo prefixo de data)
}
// Aplica uma migration
async function aplicar(conn, arquivo) {
    const filePath = path_1.default.join(MIGRATIONS_DIR, arquivo);
    const sql = fs_1.default.readFileSync(filePath, 'utf8');
    console.log(`  → Aplicando: ${arquivo}`);
    try {
        await conn.execute('SET NAMES utf8mb4');
        await conn.query(sql); // query (não execute) suporta múltiplos statements
        await conn.execute('INSERT INTO _migrations (arquivo) VALUES (?)', [arquivo]);
        console.log(`  ✅ OK: ${arquivo}`);
    }
    catch (err) {
        console.error(`  ❌ ERRO em ${arquivo}: ${err.message}`);
        throw err; // interrompe — não continua se uma migration falhar
    }
}
// Comando: migrate
async function migrate() {
    const conn = await getConnection();
    try {
        await ensureMigrationsTable(conn);
        const aplicadas = await getAplicadas(conn);
        const arquivos = getMigrationFiles();
        const pendentes = arquivos.filter(f => !aplicadas.has(f));
        if (pendentes.length === 0) {
            console.log('✅ Banco atualizado — nenhuma migration pendente.');
            return;
        }
        console.log(`\n🔄 ${pendentes.length} migration(s) para aplicar:\n`);
        for (const arquivo of pendentes) {
            await aplicar(conn, arquivo);
        }
        console.log(`\n✅ ${pendentes.length} migration(s) aplicada(s) com sucesso.`);
    }
    finally {
        await conn.end();
    }
}
// Comando: status
async function status() {
    const conn = await getConnection();
    try {
        await ensureMigrationsTable(conn);
        const aplicadas = await getAplicadas(conn);
        const arquivos = getMigrationFiles();
        console.log('\n📋 Status das migrations:\n');
        if (arquivos.length === 0) {
            console.log('  Nenhum arquivo de migration encontrado em database/migrations/');
            return;
        }
        for (const arquivo of arquivos) {
            const ok = aplicadas.has(arquivo);
            console.log(`  ${ok ? '✅' : '⏳'} ${arquivo}${ok ? '' : ' (pendente)'}`);
        }
        const pendentes = arquivos.filter(f => !aplicadas.has(f));
        console.log(`\n  Total: ${arquivos.length} | Aplicadas: ${aplicadas.size} | Pendentes: ${pendentes.length}\n`);
    }
    finally {
        await conn.end();
    }
}
// Comando: create <nome>
function create(nome) {
    if (!nome) {
        console.error('❌ Informe o nome: npm run migrate:create adicionar_coluna_x');
        process.exit(1);
    }
    const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
    const nomeLimpo = nome.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const arquivo = `${timestamp}_${nomeLimpo}.sql`;
    const filePath = path_1.default.join(MIGRATIONS_DIR, arquivo);
    const template = `-- Migration: ${arquivo}
-- Criado em: ${new Date().toLocaleString('pt-BR')}
-- Descrição: ${nome.replace(/_/g, ' ')}
--
-- REGRAS:
--   1. Nunca use DROP TABLE ou TRUNCATE (perde dados em produção)
--   2. Sempre use IF NOT EXISTS / IF EXISTS nas DDLs
--   3. Para remover coluna: ALTER TABLE x DROP COLUMN IF EXISTS y
--   4. Para renomear: ALTER TABLE x RENAME COLUMN antigo TO novo (MySQL 8+)
--   5. Teste localmente antes de aplicar em produção
--
-- Escreva o SQL abaixo:

`;
    fs_1.default.writeFileSync(filePath, template, 'utf8');
    console.log(`✅ Migration criada: database/migrations/${arquivo}`);
}
// Roteamento de comandos
const cmd = process.argv[2];
const arg = process.argv[3];
if (cmd === 'status') {
    status().catch(e => { console.error(e.message); process.exit(1); });
}
else if (cmd === 'create') {
    create(arg);
}
else {
    // padrão = migrate
    migrate().catch(e => { console.error(e.message); process.exit(1); });
}

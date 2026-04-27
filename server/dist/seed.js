"use strict";

/**
 * SEP — Seed Runner
 * Executa apenas seeds que ainda não foram aplicadas.
 * Nunca re-executa automaticamente o mesmo arquivo de seed.
 *
 * Uso:
 *   npm run db:seed          → aplica seeds pendentes
 *   npm run db:seed:status   → lista o que foi e o que falta aplicar
 *   npm run db:seed:create nome_do_seed  → cria arquivo novo
 */

import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

/**
 * Resolve a pasta de seeds de forma compatível com:
 * - ambiente local: server/dist -> ../database/seeds
 * - Docker atual: /app/database/seeds
 */
function resolveSeedsDir(): string {
  const candidates = [
    path.join(__dirname, "../database/seeds"),
    path.join(process.cwd(), "database/seeds"),
    path.join(process.cwd(), "server/database/seeds"),
  ];

  for (const dir of candidates) {
    if (fs.existsSync(dir)) {
      return dir;
    }
  }

  return candidates[0];
}

const SEEDS_DIR = resolveSeedsDir();

async function getConnection() {
  return mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "sep_db",
    charset: "utf8mb4",
    multipleStatements: true,
  });
}

/**
 * Garante que a tabela de controle dos seeds existe.
 */
async function ensureSeedsTable(conn: mysql.Connection): Promise<void> {
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS _seeds (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      arquivo     VARCHAR(255) NOT NULL UNIQUE,
      aplicado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      checksum    VARCHAR(64)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
}

/**
 * Lista seeds já aplicados.
 */
async function getAplicados(conn: mysql.Connection): Promise<Set<string>> {
  const [rows] = await conn.execute("SELECT arquivo FROM _seeds ORDER BY arquivo");

  return new Set(
    (rows as Array<{ arquivo: string }>).map((row) => row.arquivo)
  );
}

/**
 * Lista arquivos .sql na pasta de seeds, ordenados.
 */
function getSeedFiles(): string[] {
  if (!fs.existsSync(SEEDS_DIR)) {
    fs.mkdirSync(SEEDS_DIR, { recursive: true });
    return [];
  }

  return fs
    .readdirSync(SEEDS_DIR)
    .filter((file) => file.endsWith(".sql"))
    .sort();
}

/**
 * Aplica um arquivo de seed.
 */
async function aplicar(conn: mysql.Connection, arquivo: string): Promise<void> {
  const filePath = path.join(SEEDS_DIR, arquivo);
  const sql = fs.readFileSync(filePath, "utf8");

  console.log(`  → Aplicando seed: ${arquivo}`);

  try {
    await conn.execute("SET NAMES utf8mb4");
    await conn.query(sql);
    await conn.execute("INSERT INTO _seeds (arquivo) VALUES (?)", [arquivo]);

    console.log(`  ✅ OK: ${arquivo}`);
  } catch (err: any) {
    console.error(`  ❌ ERRO em ${arquivo}: ${err.message}`);
    throw err;
  }
}

/**
 * Comando principal: aplica seeds pendentes.
 */
async function seed(): Promise<void> {
  const conn = await getConnection();

  try {
    await ensureSeedsTable(conn);

    const aplicados = await getAplicados(conn);
    const arquivos = getSeedFiles();
    const pendentes = arquivos.filter((file) => !aplicados.has(file));

    console.log(`\n📁 Pasta de seeds: ${SEEDS_DIR}\n`);

    if (pendentes.length === 0) {
      console.log("✅ Banco atualizado — nenhum seed pendente.");
      return;
    }

    console.log(`🔄 ${pendentes.length} seed(s) para aplicar:\n`);

    for (const arquivo of pendentes) {
      await aplicar(conn, arquivo);
    }

    console.log(`\n✅ ${pendentes.length} seed(s) aplicado(s) com sucesso.`);
  } finally {
    await conn.end();
  }
}

/**
 * Lista status dos seeds.
 */
async function status(): Promise<void> {
  const conn = await getConnection();

  try {
    await ensureSeedsTable(conn);

    const aplicados = await getAplicados(conn);
    const arquivos = getSeedFiles();

    console.log(`\n📁 Pasta de seeds: ${SEEDS_DIR}`);
    console.log("\n📋 Status dos seeds:\n");

    if (arquivos.length === 0) {
      console.log("  Nenhum arquivo de seed encontrado em database/seeds/");
      return;
    }

    for (const arquivo of arquivos) {
      const ok = aplicados.has(arquivo);
      console.log(`  ${ok ? "✅" : "⏳"} ${arquivo}${ok ? "" : " (pendente)"}`);
    }

    const pendentes = arquivos.filter((file) => !aplicados.has(file));

    console.log(
      `\n  Total: ${arquivos.length} | Aplicados: ${aplicados.size} | Pendentes: ${pendentes.length}\n`
    );
  } finally {
    await conn.end();
  }
}

/**
 * Cria um novo arquivo de seed.
 */
function create(nome?: string): void {
  if (!nome) {
    console.error("❌ Informe o nome: npm run db:seed:create usuario_admin");
    process.exit(1);
  }

  if (!fs.existsSync(SEEDS_DIR)) {
    fs.mkdirSync(SEEDS_DIR, { recursive: true });
  }

  const timestamp = new Date()
    .toISOString()
    .replace(/[-:T]/g, "")
    .slice(0, 14);

  const nomeLimpo = nome.toLowerCase().replace(/[^a-z0-9_]/g, "_");
  const arquivo = `${timestamp}_${nomeLimpo}.sql`;
  const filePath = path.join(SEEDS_DIR, arquivo);

  const template = `-- Seed: ${arquivo}
-- Criado em: ${new Date().toLocaleString("pt-BR")}
-- Descrição: ${nome.replace(/_/g, " ")}
--
-- REGRAS:
--   1. Evite INSERT simples que possa duplicar dados em produção
--   2. Prefira INSERT IGNORE ou ON DUPLICATE KEY UPDATE
--   3. Seeds devem ser idempotentes sempre que possível
--   4. Teste localmente antes de aplicar em produção
--
-- Escreva o SQL abaixo:

`;

  fs.writeFileSync(filePath, template, "utf8");

  console.log(`✅ Seed criado: ${filePath}`);
}

const cmd = process.argv[2];
const arg = process.argv[3];

if (cmd === "status") {
  status().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
} else if (cmd === "create") {
  create(arg);
} else {
  seed().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
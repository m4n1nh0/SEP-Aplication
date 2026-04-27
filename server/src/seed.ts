"use strict";

/**
 * SEP — Seed Runner
 * Executa apenas seeds que ainda não foram aplicadas.
 * Nunca re-executa automaticamente o mesmo arquivo de seed.
 *
 * Uso:
 *   npm run db:seed              -> executa local via ts-node
 *   npm run db:seed:prod         -> executa produção via node dist/seed.js
 *   npm run db:seed:status       -> lista status local
 *   npm run db:seed:status:prod  -> lista status produção
 */

import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

function resolveSeedsDir(): string {
  const candidates = [
    path.join(process.cwd(), "database/seeds"),
    path.join(process.cwd(), "database"),
    path.join(process.cwd(), "server/database/seeds"),
    path.join(__dirname, "../database/seeds"),
    path.join(__dirname, "../database"),
  ];

  for (const dir of candidates) {
    if (!fs.existsSync(dir)) {
      continue;
    }

    const files = fs.readdirSync(dir).filter((file) => file.endsWith(".sql"));

    if (files.length > 0) {
      return dir;
    }
  }

  return path.join(process.cwd(), "database");
}

const SEEDS_DIR = resolveSeedsDir();

async function getConnection(): Promise<mysql.Connection> {
  const host = process.env.DB_HOST || process.env.MYSQLHOST || "localhost";
  const port = Number(process.env.DB_PORT || process.env.MYSQLPORT || 3306);
  const user = process.env.DB_USER || process.env.MYSQLUSER || "root";
  const password = process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || "";
  const database = process.env.DB_NAME || process.env.MYSQLDATABASE || "railway";

  console.log("Conectando no MySQL:", {
    source: process.env.DB_HOST ? "db_vars" : "mysql_vars",
    host,
    port,
    database,
    user,
    ssl: false,
  });

  return mysql.createConnection({
    host,
    port,
    user,
    password,
    database,
    charset: "utf8mb4",
    multipleStatements: true,
  });
}

async function ensureSeedsTable(conn: mysql.Connection): Promise<void> {
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS _seeds (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      arquivo     VARCHAR(255) NOT NULL UNIQUE,
      aplicado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
}

async function getAplicados(conn: mysql.Connection): Promise<Set<string>> {
  const [rows] = await conn.execute("SELECT arquivo FROM _seeds ORDER BY arquivo");

  return new Set(
    (rows as Array<{ arquivo: string }>).map((row) => row.arquivo)
  );
}

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

async function aplicar(conn: mysql.Connection, arquivo: string): Promise<void> {
  const filePath = path.join(SEEDS_DIR, arquivo);
  const sql = fs.readFileSync(filePath, "utf8").trim();

  if (!sql) {
    console.log(`  ⚠️ Ignorando seed vazio: ${arquivo}`);
    return;
  }

  console.log(`  → Aplicando seed: ${arquivo}`);

  try {
    await conn.execute("SET NAMES utf8mb4");
    await conn.query(sql);
    await conn.execute("INSERT INTO _seeds (arquivo) VALUES (?)", [arquivo]);

    console.log(`  ✅ OK: ${arquivo}`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`  ❌ ERRO em ${arquivo}: ${message}`);
    throw err;
  }
}

async function seed(): Promise<void> {
  const conn = await getConnection();

  try {
    await ensureSeedsTable(conn);

    const aplicados = await getAplicados(conn);
    const arquivos = getSeedFiles();
    const pendentes = arquivos.filter((file) => !aplicados.has(file));

    console.log(`📁 Pasta de seeds: ${SEEDS_DIR}`);

    if (pendentes.length === 0) {
      console.log("✅ Banco atualizado — nenhum seed pendente.");
      return;
    }

    console.log(`🔄 ${pendentes.length} seed(s) para aplicar:`);

    for (const arquivo of pendentes) {
      await aplicar(conn, arquivo);
    }

    console.log(`✅ ${pendentes.length} seed(s) aplicado(s) com sucesso.`);
  } finally {
    await conn.end();
  }
}

async function status(): Promise<void> {
  const conn = await getConnection();

  try {
    await ensureSeedsTable(conn);

    const aplicados = await getAplicados(conn);
    const arquivos = getSeedFiles();

    console.log(`📁 Pasta de seeds: ${SEEDS_DIR}`);
    console.log("📋 Status dos seeds:");

    if (arquivos.length === 0) {
      console.log("  Nenhum arquivo de seed encontrado.");
      return;
    }

    for (const arquivo of arquivos) {
      const ok = aplicados.has(arquivo);
      console.log(`  ${ok ? "✅" : "⏳"} ${arquivo}${ok ? "" : " (pendente)"}`);
    }

    const pendentes = arquivos.filter((file) => !aplicados.has(file));

    console.log(
      `Total: ${arquivos.length} | Aplicados: ${aplicados.size} | Pendentes: ${pendentes.length}`
    );
  } finally {
    await conn.end();
  }
}

const cmd = process.argv[2];

if (cmd === "status") {
  status().catch((err) => {
    const message = err instanceof Error ? err.message : String(err);
    console.error(message);
    process.exit(1);
  });
} else {
  seed().catch((err) => {
    const message = err instanceof Error ? err.message : String(err);
    console.error(message);
    process.exit(1);
  });
}
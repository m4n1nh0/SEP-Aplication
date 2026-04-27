/**
 * SEP - Seed Runner
 * Runs only pending seed files and records each applied file in `_seeds`.
 */

import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { mysqlConfigSummary, mysqlConnectionConfig } from "./db/mysqlConfig";

dotenv.config();

type SeedFile = {
  arquivo: string;
  filePath: string;
};

function listSqlFiles(dir: string): SeedFile[] {
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return [];

  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".sql"))
    .sort()
    .map((file) => ({ arquivo: file, filePath: path.join(dir, file) }));
}

function singleSeedFile(filePath?: string): SeedFile[] {
  if (!filePath) return [];
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return [];

  return [{ arquivo: path.basename(filePath), filePath }];
}

function resolveSeedFiles(): SeedFile[] {
  const explicitFile = singleSeedFile(process.env.SEEDS_FILE);
  if (explicitFile.length > 0) return explicitFile;

  const explicitDir = process.env.SEEDS_DIR ? listSqlFiles(process.env.SEEDS_DIR) : [];
  if (explicitDir.length > 0) return explicitDir;

  const seedDirs = [
    path.resolve(process.cwd(), "database/seeds"),
    path.resolve(process.cwd(), "server/database/seeds"),
    path.resolve(__dirname, "../../database/seeds"),
    path.resolve(__dirname, "../database/seeds"),
  ];

  for (const dir of seedDirs) {
    const files = listSqlFiles(dir);
    if (files.length > 0) return files;
  }

  const seedFiles = [
    path.resolve(process.cwd(), "database/seeds.sql"),
    path.resolve(process.cwd(), "server/database/seeds.sql"),
    path.resolve(__dirname, "../../database/seeds.sql"),
    path.resolve(__dirname, "../database/seeds.sql"),
  ];

  for (const file of seedFiles) {
    const files = singleSeedFile(file);
    if (files.length > 0) return files;
  }

  return [];
}

const SEED_FILES = resolveSeedFiles();

function seedLocation(): string {
  const dirs = Array.from(new Set(SEED_FILES.map((file) => path.dirname(file.filePath))));
  if (dirs.length === 0) return "nenhum seed encontrado";

  return dirs.join(", ");
}

async function getConnection(): Promise<mysql.Connection> {
  console.log("Conectando no MySQL:", mysqlConfigSummary());

  return mysql.createConnection({
    ...mysqlConnectionConfig(),
    charset: "utf8mb4",
    multipleStatements: true,
  });
}

async function ensureSeedsTable(conn: mysql.Connection): Promise<void> {
  await conn.query("SET NAMES utf8mb4");
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS \`_seeds\` (
      id INT AUTO_INCREMENT PRIMARY KEY,
      arquivo VARCHAR(255) NOT NULL UNIQUE,
      aplicado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
}

function missingSeedsTable(err: unknown): boolean {
  return (
    (err as any)?.code === "ER_NO_SUCH_TABLE" &&
    String((err as any)?.message || "").includes("_seeds")
  );
}

async function selectAplicados(conn: mysql.Connection): Promise<Set<string>> {
  const [rows] = await conn.execute("SELECT arquivo FROM `_seeds` ORDER BY arquivo");

  return new Set((rows as Array<{ arquivo: string }>).map((row) => row.arquivo));
}

async function getAplicados(conn: mysql.Connection): Promise<Set<string>> {
  try {
    return await selectAplicados(conn);
  } catch (err) {
    if (!missingSeedsTable(err)) throw err;

    await ensureSeedsTable(conn);
    return selectAplicados(conn);
  }
}

async function aplicar(conn: mysql.Connection, seedFile: SeedFile): Promise<void> {
  const sql = fs.readFileSync(seedFile.filePath, "utf8").trim();

  if (!sql) {
    console.log(`  Ignorando seed vazio: ${seedFile.arquivo}`);
    return;
  }

  console.log(`  Aplicando seed: ${seedFile.arquivo}`);

  try {
    await conn.query("SET NAMES utf8mb4");
    await conn.query(sql);
    await conn.execute("INSERT INTO `_seeds` (arquivo) VALUES (?)", [seedFile.arquivo]);
    console.log(`  OK: ${seedFile.arquivo}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`  ERRO em ${seedFile.arquivo}: ${message}`);
    throw err;
  }
}

async function seed(): Promise<void> {
  const conn = await getConnection();

  try {
    await ensureSeedsTable(conn);
    const aplicados = await getAplicados(conn);
    const pendentes = SEED_FILES.filter((file) => !aplicados.has(file.arquivo));

    console.log(`Seeds: ${seedLocation()}`);

    if (SEED_FILES.length === 0) {
      console.log("Nenhum arquivo de seed encontrado.");
      return;
    }

    if (pendentes.length === 0) {
      console.log("Banco atualizado - nenhum seed pendente.");
      return;
    }

    console.log(`${pendentes.length} seed(s) para aplicar:`);

    for (const file of pendentes) {
      await aplicar(conn, file);
    }

    console.log(`${pendentes.length} seed(s) aplicado(s) com sucesso.`);
  } finally {
    await conn.end();
  }
}

async function status(): Promise<void> {
  const conn = await getConnection();

  try {
    await ensureSeedsTable(conn);
    const aplicados = await getAplicados(conn);

    console.log(`Seeds: ${seedLocation()}`);
    console.log("Status dos seeds:");

    if (SEED_FILES.length === 0) {
      console.log("  Nenhum arquivo de seed encontrado.");
      return;
    }

    for (const file of SEED_FILES) {
      const ok = aplicados.has(file.arquivo);
      console.log(`  ${ok ? "OK" : "PENDENTE"} ${file.arquivo}`);
    }

    const aplicadosVisiveis = SEED_FILES.filter((file) => aplicados.has(file.arquivo)).length;
    const pendentes = SEED_FILES.length - aplicadosVisiveis;

    console.log(
      `Total: ${SEED_FILES.length} | Aplicados: ${aplicadosVisiveis} | Pendentes: ${pendentes}`
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

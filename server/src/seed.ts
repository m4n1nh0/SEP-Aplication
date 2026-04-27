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

type ApplyResult = "applied" | "skipped";

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

function firstExistingSeedFile(files: string[]): SeedFile[] {
  for (const file of files) {
    const seed = singleSeedFile(file);
    if (seed.length > 0) return seed;
  }

  return [];
}

function firstSeedDirFiles(dirs: string[]): SeedFile[] {
  for (const dir of dirs) {
    const files = listSqlFiles(dir);
    if (files.length > 0) return files;
  }

  return [];
}

function uniqueSeedFiles(files: SeedFile[]): SeedFile[] {
  const seen = new Set<string>();

  return files.filter((file) => {
    if (seen.has(file.arquivo)) return false;
    seen.add(file.arquivo);
    return true;
  });
}

function resolveSeedFiles(): SeedFile[] {
  const explicitFile = singleSeedFile(process.env.SEEDS_FILE);
  if (explicitFile.length > 0) return explicitFile;

  const explicitDir = process.env.SEEDS_DIR ? listSqlFiles(process.env.SEEDS_DIR) : [];
  if (explicitDir.length > 0) return explicitDir;

  const seedFiles = [
    path.resolve(process.cwd(), "database/seeds.sql"),
    path.resolve(process.cwd(), "server/database/seeds.sql"),
    path.resolve(__dirname, "../../database/seeds.sql"),
    path.resolve(__dirname, "../database/seeds.sql"),
  ];

  const seedDirs = [
    path.resolve(process.cwd(), "database/seeds"),
    path.resolve(process.cwd(), "server/database/seeds"),
    path.resolve(__dirname, "../../database/seeds"),
    path.resolve(__dirname, "../database/seeds"),
  ];

  return uniqueSeedFiles([
    ...firstExistingSeedFile(seedFiles),
    ...firstSeedDirFiles(seedDirs),
  ]);
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

function duplicateSeedData(err: unknown): boolean {
  return (err as any)?.code === "ER_DUP_ENTRY" || (err as any)?.errno === 1062;
}

function failOnDuplicate(): boolean {
  return String(process.env.SEEDS_DUPLICATE_POLICY || "").toLowerCase() === "fail";
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

async function markApplied(conn: mysql.Connection, seedFile: SeedFile): Promise<void> {
  await conn.execute("INSERT IGNORE INTO `_seeds` (arquivo) VALUES (?)", [seedFile.arquivo]);
}

async function aplicar(conn: mysql.Connection, seedFile: SeedFile): Promise<ApplyResult> {
  const sql = fs.readFileSync(seedFile.filePath, "utf8").trim();

  if (!sql) {
    console.log(`  Ignorando seed vazio: ${seedFile.arquivo}`);
    await markApplied(conn, seedFile);
    return "skipped";
  }

  console.log(`  Aplicando seed: ${seedFile.arquivo}`);

  try {
    await conn.beginTransaction();
    await conn.query("SET NAMES utf8mb4");
    await conn.query(sql);
    await markApplied(conn, seedFile);
    await conn.commit();
    console.log(`  OK: ${seedFile.arquivo}`);
    return "applied";
  } catch (err) {
    try {
      await conn.rollback();
    } catch (rollbackErr) {
      const rollbackMessage = rollbackErr instanceof Error ? rollbackErr.message : String(rollbackErr);
      console.warn(`  Aviso: rollback do seed falhou: ${rollbackMessage}`);
    }

    const message = err instanceof Error ? err.message : String(err);

    if (duplicateSeedData(err) && !failOnDuplicate()) {
      console.warn(
        `  Seed ${seedFile.arquivo} encontrou dado duplicado e sera tratado como ja aplicado: ${message}`
      );
      await markApplied(conn, seedFile);
      return "skipped";
    }

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

    let applied = 0;
    let skipped = 0;

    for (const file of pendentes) {
      const result = await aplicar(conn, file);
      if (result === "applied") applied += 1;
      if (result === "skipped") skipped += 1;
    }

    console.log(`${applied} seed(s) aplicado(s). ${skipped} seed(s) ignorado(s).`);
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

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const promise_1 = __importDefault(require("mysql2/promise"));
const dotenv_1 = __importDefault(require("dotenv"));
const logger_1 = __importDefault(require("../utils/logger"));
const mysqlConfig_1 = require("./mysqlConfig");
dotenv_1.default.config();
const pool = promise_1.default.createPool({
    ...(0, mysqlConfig_1.mysqlConnectionConfig)(),
    waitForConnections: true,
    connectionLimit: 15,
    timezone: '-03:00',
    dateStrings: true,
    decimalNumbers: true,
    charset: 'utf8mb4',
});
pool.getConnection()
    .then(async (c) => {
    try {
        const [tzRows] = await c.query(`
        SELECT @@session.time_zone AS session_time_zone,
               @@global.time_zone AS global_time_zone,
               NOW() AS mysql_now
      `);
        logger_1.default.info('Banco conectado; datas serao lidas como texto local', {
            ...(0, mysqlConfig_1.mysqlConfigSummary)(),
            timezone_configurada: '-03:00',
            date_strings: true,
            mysql: tzRows?.[0] || null,
        });
    }
    finally {
        c.release();
    }
})
    .catch(e => logger_1.default.error('Falha ao conectar no MySQL', e));
exports.default = pool;

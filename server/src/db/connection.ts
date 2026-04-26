import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import logger from '../utils/logger';
import { mysqlConfigSummary, mysqlConnectionConfig } from './mysqlConfig';
dotenv.config();

const pool = mysql.createPool({
  ...mysqlConnectionConfig(),
  waitForConnections: true,
  connectionLimit:    15,
  timezone:           '-03:00',
  dateStrings:        true,
  decimalNumbers:     true,
  charset:            'utf8mb4',
});

pool.getConnection()
  .then(async c => {
    try {
      const [tzRows]: any = await c.query(`
        SELECT @@session.time_zone AS session_time_zone,
               @@global.time_zone AS global_time_zone,
               NOW() AS mysql_now
      `);
      logger.info('Banco conectado; datas serao lidas como texto local', {
        ...mysqlConfigSummary(),
        timezone_configurada: '-03:00',
        date_strings: true,
        mysql: tzRows?.[0] || null,
      });
    } finally {
      c.release();
    }
  })
  .catch(e => logger.error('Falha ao conectar no MySQL', e));

export default pool;

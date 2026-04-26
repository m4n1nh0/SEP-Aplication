const fromUrl = (rawUrl: string) => {
  const url = new URL(rawUrl);
  const sslParam = url.searchParams.get('ssl') || url.searchParams.get('ssl-mode');
  const useSsl = ['1', 'true', 'require', 'required'].includes(String(sslParam || '').toLowerCase());

  return {
    host: decodeURIComponent(url.hostname),
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username || 'root'),
    password: decodeURIComponent(url.password || ''),
    database: decodeURIComponent(url.pathname.replace(/^\//, '') || process.env.DB_NAME || process.env.MYSQLDATABASE || 'sep_db'),
    ...(useSsl || process.env.DB_SSL === 'true' ? { ssl: { rejectUnauthorized: false } } : {}),
  };
};

const connectionUrl = () => {
  const dbHost = process.env.DB_HOST || '';
  return process.env.MYSQL_URL
    || process.env.DATABASE_URL
    || process.env.DB_URL
    || process.env.MYSQL_PUBLIC_URL
    || (/^mysql:\/\//i.test(dbHost) ? dbHost : '');
};

export const mysqlConnectionConfig = () => {
  const url = connectionUrl();
  if (url) return fromUrl(url);

  return {
    host: process.env.DB_HOST || process.env.MYSQLHOST || 'localhost',
    port: Number(process.env.DB_PORT || process.env.MYSQLPORT || 3306),
    user: process.env.DB_USER || process.env.MYSQLUSER || 'root',
    password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || '',
    database: process.env.DB_NAME || process.env.MYSQLDATABASE || 'sep_db',
    ...(process.env.DB_SSL === 'true' ? { ssl: { rejectUnauthorized: false } } : {}),
  };
};

export const mysqlConfigSource = () => {
  if (connectionUrl()) return 'url';
  if (process.env.MYSQLHOST || process.env.MYSQLUSER || process.env.MYSQLDATABASE) return 'railway_mysql_vars';
  if (process.env.DB_HOST || process.env.DB_USER || process.env.DB_NAME) return 'db_vars';
  return 'defaults';
};

export const mysqlConfigSummary = () => {
  const cfg = mysqlConnectionConfig();
  return {
    source: mysqlConfigSource(),
    host: cfg.host,
    port: cfg.port,
    database: cfg.database,
    user: cfg.user,
    ssl: Boolean((cfg as any).ssl),
  };
};

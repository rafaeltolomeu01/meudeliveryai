module.paths.push(require('path').join(__dirname, '../backend/node_modules'));
const mysql = require('mysql2/promise');
require('dotenv').config({ path: require('path').join(__dirname, '../backend/.env') });

async function check() {
  const sslConfig = process.env.DB_SSL === 'true' || process.env.DATABASE_SSL === 'true' || process.env.MYSQL_PUBLIC_URL || process.env.DATABASE_URL
    ? { rejectUnauthorized: false }
    : undefined;

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    timezone: '-03:00',
    ssl: sslConfig,
  });

  try {
    const [timeRows] = await connection.query('SELECT NOW() as now, UTC_TIMESTAMP() as utc, @@global.time_zone as global_tz, @@session.time_zone as session_tz');
    console.log('Database time info:', timeRows[0]);

    const [orderRows] = await connection.query('SELECT id, created_at FROM orders ORDER BY id DESC LIMIT 1');
    if (orderRows.length > 0) {
      const order = orderRows[0];
      console.log('Sample Order:', {
        id: order.id,
        raw_created_at: order.created_at,
        iso_created_at: order.created_at instanceof Date ? order.created_at.toISOString() : order.created_at,
        local_string: order.created_at instanceof Date ? order.created_at.toLocaleString('pt-BR') : order.created_at,
      });
    } else {
      console.log('No orders found.');
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await connection.end();
  }
}
check();

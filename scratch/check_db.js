module.paths.push(require('path').join(__dirname, '../backend/node_modules'));
const mysql = require('mysql2/promise');
require('dotenv').config({ path: require('path').join(__dirname, '../backend/.env') });

async function check() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'meudeliveryai',
  });

  try {
    const [rows] = await connection.query('DESCRIBE payment_settings');
    console.log('Columns in payment_settings:', rows.map(r => `${r.Field}: ${r.Type}`));
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await connection.end();
  }
}
check();

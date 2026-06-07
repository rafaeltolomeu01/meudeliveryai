module.paths.push(require('path').join(__dirname, '../backend/node_modules'));
const mysql = require('mysql2/promise');
require('dotenv').config({ path: require('path').join(__dirname, '../backend/.env') });

async function alter() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'meudeliveryai',
  });

  try {
    const [columnsCheck] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'payment_settings'
    `, [process.env.DB_NAME || 'meudeliveryai']);
    const columns = columnsCheck.map(c => c.COLUMN_NAME);

    if (!columns.includes('pix_receiver_name')) {
      await connection.query('ALTER TABLE payment_settings ADD COLUMN pix_receiver_name VARCHAR(255) DEFAULT NULL AFTER pix_key_type');
      console.log('+ Added pix_receiver_name column.');
    } else {
      console.log('pix_receiver_name already exists.');
    }

    if (!columns.includes('pix_receiver_city')) {
      await connection.query('ALTER TABLE payment_settings ADD COLUMN pix_receiver_city VARCHAR(100) DEFAULT NULL AFTER pix_receiver_name');
      console.log('+ Added pix_receiver_city column.');
    } else {
      console.log('pix_receiver_city already exists.');
    }

    if (!columns.includes('pix_instructions')) {
      await connection.query('ALTER TABLE payment_settings ADD COLUMN pix_instructions TEXT DEFAULT NULL AFTER pix_receiver_city');
      console.log('+ Added pix_instructions column.');
    } else {
      console.log('pix_instructions already exists.');
    }

    console.log('Alteration complete.');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await connection.end();
  }
}
alter();

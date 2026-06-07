const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function run() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '',
    database: 'meudeliveryai',
  });

  try {
    const [users] = await connection.execute('SELECT id, name, email, password_hash, role, status FROM users');
    console.log('--- USERS IN DB ---');
    for (const u of users) {
      console.log(`ID: ${u.id}, Name: ${u.name}, Email: ${u.email}, Role: ${u.role}, Status: ${u.status}`);
      console.log(`Hash: ${u.password_hash}`);
      const matches = await bcrypt.compare('Admin@123', u.password_hash);
      console.log(`Matches 'Admin@123': ${matches}`);
      const matchesLower = await bcrypt.compare('admin@123', u.password_hash);
      console.log(`Matches 'admin@123': ${matchesLower}`);
      console.log('-------------------');
    }
  } catch (err) {
    console.error(err);
  } finally {
    await connection.end();
  }
}

run();

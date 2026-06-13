const mysql = require('c:/Users/rafae/Desktop/aplicativos/MeuDeliveryAI/backend/node_modules/mysql2/promise');

const passwords = ['', '123456', 'root', 'admin', 'mysql'];

async function test() {
  for (const pw of passwords) {
    try {
      const conn = await mysql.createConnection({
        host: '127.0.0.1',
        port: 3306,
        user: 'root',
        password: pw
      });
      console.log(`✅ Success with password: "${pw}"`);
      await conn.end();
      return;
    } catch (err) {
      console.log(`❌ Failed with password: "${pw}" - Error: ${err.message}`);
    }
  }
}

test();

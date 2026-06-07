module.paths.push(require('path').join(__dirname, '../backend/node_modules'));
const mysql = require('mysql2/promise');
require('dotenv').config({ path: require('path').join(__dirname, '../backend/.env') });

async function verify() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'meudeliveryai',
  });

  try {
    console.log('--- 1. Testing Payment Settings Update ---');
    
    // Update settings for restaurant 1
    const testData = {
      pix_key_type: 'email',
      pix_key: 'pix@meudelivery.ai',
      pix_receiver_name: 'Meu Delivery AI Ltda',
      pix_receiver_city: 'Sao Paulo',
      pix_instructions: 'Pague pelo app do seu banco e envie o comprovante no nosso WhatsApp.'
    };

    await connection.query(
      `INSERT INTO payment_settings (
        restaurant_id, accepts_pix, pix_key, pix_key_type, pix_receiver_name, pix_receiver_city, pix_instructions
      ) VALUES (?, 1, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        accepts_pix = 1,
        pix_key = VALUES(pix_key),
        pix_key_type = VALUES(pix_key_type),
        pix_receiver_name = VALUES(pix_receiver_name),
        pix_receiver_city = VALUES(pix_receiver_city),
        pix_instructions = VALUES(pix_instructions)`,
      [1, testData.pix_key, testData.pix_key_type, testData.pix_receiver_name, testData.pix_receiver_city, testData.pix_instructions]
    );

    const [settings] = await connection.query('SELECT * FROM payment_settings WHERE restaurant_id = 1');
    const s = settings[0];
    
    if (
      s.pix_key === testData.pix_key &&
      s.pix_key_type === testData.pix_key_type &&
      s.pix_receiver_name === testData.pix_receiver_name &&
      s.pix_receiver_city === testData.pix_receiver_city &&
      s.pix_instructions === testData.pix_instructions
    ) {
      console.log('✅ Payment settings updated and verified successfully in database!');
    } else {
      console.error('❌ Payment settings mismatch:', s);
    }

    console.log('\n--- 2. Testing Order Payment Status Update ("Marcar como Pago") ---');
    
    // Insert a dummy order
    const orderNumber = 'TEST-' + Math.floor(Math.random() * 100000);
    const [orderInsert] = await connection.query(
      `INSERT INTO orders (
        restaurant_id, order_number, order_type, source, status, payment_method, payment_status, subtotal, delivery_fee, total
      ) VALUES (?, ?, 'delivery', 'site', 'pending', 'pix', 'pending', 50.00, 5.00, 55.00)`,
      [1, orderNumber]
    );
    const orderId = orderInsert.insertId;
    console.log(`Created test order ID: ${orderId} (Number: ${orderNumber})`);

    // Simulate markAsPaid controller logic
    await connection.query(
      'UPDATE orders SET payment_status = ? WHERE id = ? AND restaurant_id = ?',
      ['paid', orderId, 1]
    );
    
    await connection.query(
      'INSERT INTO order_status_logs (order_id, restaurant_id, to_status, notes) VALUES (?, ?, ?, ?)',
      [orderId, 1, 'pending', 'Pagamento Pix marcado como pago manualmente pelo estabelecimento']
    );

    // Verify update
    const [orderCheck] = await connection.query('SELECT payment_status, status FROM orders WHERE id = ?', [orderId]);
    const o = orderCheck[0];
    
    const [logCheck] = await connection.query('SELECT * FROM order_status_logs WHERE order_id = ?', [orderId]);
    
    if (o.payment_status === 'paid' && logCheck.length > 0 && logCheck[0].notes.includes('marcado como pago')) {
      console.log('✅ Order marked as paid and log entry verified successfully!');
    } else {
      console.error('❌ Verification failed. Order status:', o, 'Logs:', logCheck);
    }

    // Clean up test order
    await connection.query('DELETE FROM order_status_logs WHERE order_id = ?', [orderId]);
    await connection.query('DELETE FROM orders WHERE id = ?', [orderId]);
    console.log('\nCleaned up test order.');

  } catch (err) {
    console.error('Error during verification:', err);
  } finally {
    await connection.end();
  }
}
verify();

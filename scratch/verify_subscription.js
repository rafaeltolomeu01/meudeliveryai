require('dotenv').config({ path: 'c:/Users/rafae/Desktop/aplicativos/MeuDeliveryAI/backend/.env' });
const mysql = require('mysql2/promise');
const axios = require('axios');

const API_URL = 'http://localhost:3001/api/v1';

async function run() {
  console.log('--- STARTING SUBSCRIPTION E2E VERIFICATION ---');
  
  // 1. Establish database connection
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  // Get current user auth token by logging in
  console.log('Logging in as restaurant owner...');
  let token = '';
  try {
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@burgerhouse.com',
      password: 'Admin@123'
    });
    token = loginRes.data.token;
    console.log('✅ Logged in successfully.');
  } catch (err) {
    console.error('❌ Login failed:', err.response?.data || err.message);
    process.exit(1);
  }

  const client = axios.create({
    headers: { Authorization: `Bearer ${token}` }
  });

  // Store original subscription state to restore it later
  const [originalRows] = await conn.query('SELECT * FROM subscriptions WHERE restaurant_id = 1 ORDER BY id DESC LIMIT 1');
  const originalSub = originalRows[0];
  console.log(`Original Subscription: Plan ${originalSub.plan_id}, Status ${originalSub.status}, Due Date ${originalSub.due_date}`);

  try {
    // ----------------------------------------------------
    // Scenario 1: Subscription expiring in 3 days (Warning Warning Alert)
    // ----------------------------------------------------
    console.log('\n--- Scenario 1: Expiring in 3 Days ---');
    await conn.query(
      `UPDATE subscriptions 
       SET due_date = DATE_ADD(NOW(), INTERVAL 3 DAY), status = 'trial' 
       WHERE restaurant_id = 1`
    );
    console.log('Updated DB: Set due date to NOW + 3 days.');

    const subRes = await client.get(`${API_URL}/subscription`);
    console.log('API Response /subscription:', subRes.data.data);
    if (subRes.data.data.days_remaining === 3 && subRes.data.data.status === 'trial') {
      console.log('✅ Success: Expiration warning calculated correctly (days_remaining = 3).');
    } else {
      console.log('❌ Failure: Expiration warning calculation mismatch.');
    }

    // Operational routes should still work (warning state, not blocked yet)
    try {
      const prodRes = await client.get(`${API_URL}/products`);
      console.log('✅ Success: Operational routes accessible (not blocked) during warning period.');
    } catch (err) {
      console.log('❌ Failure: Operational routes blocked during warning period:', err.response?.status);
    }

    // ----------------------------------------------------
    // Scenario 2: Subscription Expired (Locked Panel)
    // ----------------------------------------------------
    console.log('\n--- Scenario 2: Subscription Expired ---');
    await conn.query(
      `UPDATE subscriptions 
       SET due_date = DATE_SUB(NOW(), INTERVAL 1 DAY), status = 'overdue' 
       WHERE restaurant_id = 1`
    );
    console.log('Updated DB: Set due date to NOW - 1 day, status: overdue.');

    // Fetch subscription details
    const subRes2 = await client.get(`${API_URL}/subscription`);
    console.log('API Response /subscription (expired):', subRes2.data.data);
    if (subRes2.data.data.days_remaining === 0 && subRes2.data.data.status === 'overdue') {
      console.log('✅ Success: Expiry state detected correctly (status = overdue, days_remaining = 0).');
    } else {
      console.log('❌ Failure: Expiry state mismatch.');
    }

    // Try accessing products list - should block with 402 Payment Required
    try {
      await client.post(`${API_URL}/products`, { name: 'Teste Block', price: 10, category_id: 1 });
      console.log('❌ Failure: Modifying products was NOT blocked!');
    } catch (err) {
      if (err.response?.status === 402) {
        console.log('✅ Success: Product modification blocked with 402 Payment Required.');
        console.log('Block Message:', err.response.data.message);
      } else {
        console.log('❌ Failure: Product modification returned incorrect status code:', err.response?.status);
      }
    }

    // Try checkout on public menu - should block with 402
    try {
      await axios.post(`${API_URL}/public/restaurant/burger-house/orders`, {
        customer_name: 'Teste Cliente',
        customer_phone: '11999998888',
        order_type: 'delivery',
        delivery_address: 'Rua Teste',
        items: [{ product_id: 1, quantity: 1 }]
      });
      console.log('❌ Failure: Public checkout was NOT blocked!');
    } catch (err) {
      if (err.response?.status === 402) {
        console.log('✅ Success: Public checkout blocked with 402 Payment Required.');
        console.log('Block Message:', err.response.data.message);
      } else {
        console.log('❌ Failure: Public checkout returned incorrect status code:', err.response?.status);
      }
    }

    // ----------------------------------------------------
    // Scenario 3: Renewal Simulation
    // ----------------------------------------------------
    console.log('\n--- Scenario 3: Renewal Simulation ---');
    const renewRes = await client.post(`${API_URL}/subscription/renew`);
    console.log('API Response /subscription/renew:', renewRes.data);
    
    // Check updated state
    const subRes3 = await client.get(`${API_URL}/subscription`);
    console.log('API Response /subscription (after renew):', subRes3.data.data);
    if (subRes3.data.data.status === 'active' && subRes3.data.data.days_remaining > 28) {
      console.log('✅ Success: Renewal simulation successfully set status to active and extended due date.');
    } else {
      console.log('❌ Failure: Renewal simulation did not update state correctly.');
    }

    // Verify products modification works again (unblocked)
    try {
      const testProduct = await client.get(`${API_URL}/products`);
      console.log('✅ Success: Operational routes successfully unblocked after renewal.');
    } catch (err) {
      console.log('❌ Failure: Operational routes still blocked after renewal:', err.response?.data);
    }

    // ----------------------------------------------------
    // Scenario 4: Upgrade Simulation
    // ----------------------------------------------------
    console.log('\n--- Scenario 4: Upgrade Simulation ---');
    const upgradeRes = await client.post(`${API_URL}/subscription/upgrade`, { plan_id: 3 }); // Enterprise plan
    console.log('API Response /subscription/upgrade:', upgradeRes.data);

    const subRes4 = await client.get(`${API_URL}/subscription`);
    console.log('API Response /subscription (after upgrade):', subRes4.data.data);
    if (subRes4.data.data.plan_id === 3 && subRes4.data.data.monthly_price === 349.00 && subRes4.data.data.status === 'active') {
      console.log('✅ Success: Upgrade simulation successfully changed plan, price, status, and extended date.');
    } else {
      console.log('❌ Failure: Upgrade simulation did not update state correctly.');
    }

  } finally {
    // Restore original subscription data
    console.log('\nRestoring original subscription data...');
    await conn.query(
      `UPDATE subscriptions 
       SET plan_id = ?, status = ?, start_date = ?, due_date = ?, trial_days = ?, monthly_price = ? 
       WHERE id = ?`,
      [
        originalSub.plan_id, 
        originalSub.status, 
        originalSub.start_date, 
        originalSub.due_date, 
        originalSub.trial_days, 
        originalSub.monthly_price,
        originalSub.id
      ]
    );
    console.log('Original state restored.');
    await conn.end();
    console.log('Database connection closed.');
  }
}

run().catch(console.error);

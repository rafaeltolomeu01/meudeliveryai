require('dotenv').config({ path: 'c:/Users/rafae/Desktop/aplicativos/MeuDeliveryAI/backend/.env' });
const mysql = require('mysql2/promise');
const axios = require('axios');

const API_URL = 'http://localhost:3001/api/v1';

async function run() {
  console.log('--- STARTING SUPER ADMIN E2E VERIFICATION ---');
  
  // 1. Establish database connection
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  // Login as super admin
  console.log('Logging in as general admin (admin_geral)...');
  let token = '';
  try {
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@meudeliveryai.com',
      password: 'Admin@123'
    });
    token = loginRes.data.data.token;
    console.log('✅ Super admin logged in successfully.');
  } catch (err) {
    console.error('❌ Login failed:', err.response?.data || err.message);
    process.exit(1);
  }

  const client = axios.create({
    headers: { Authorization: `Bearer ${token}` }
  });

  // Backup original status of restaurant 1 and its subscription
  const [origRest] = await conn.query('SELECT status FROM restaurants WHERE id = 1');
  const [origSub] = await conn.query('SELECT * FROM subscriptions WHERE restaurant_id = 1 ORDER BY id DESC LIMIT 1');
  const originalStatus = origRest[0].status;
  const originalSub = origSub[0];

  try {
    // ----------------------------------------------------
    // Scenario 1: List all restaurants
    // ----------------------------------------------------
    console.log('\n--- Scenario 1: Listing Restaurants ---');
    const listRes = await client.get(`${API_URL}/admin/restaurants`);
    console.log(`API returned ${listRes.data.data.length} restaurants.`);
    if (listRes.data.success && listRes.data.data.length > 0) {
      console.log('✅ Success: List retrieved successfully.');
    } else {
      console.log('❌ Failure: List could not be retrieved.');
    }

    // ----------------------------------------------------
    // Scenario 2: Search and filter restaurants
    // ----------------------------------------------------
    console.log('\n--- Scenario 2: Search and Filter ---');
    const searchRes = await client.get(`${API_URL}/admin/restaurants`, {
      params: { search: 'Burger' }
    });
    console.log(`Search for "Burger" returned ${searchRes.data.data.length} restaurants.`);
    if (searchRes.data.data.some(r => r.name.includes('Burger House'))) {
      console.log('✅ Success: Search filter matched Burger House correctly.');
    } else {
      console.log('❌ Failure: Search filter did not find Burger House.');
    }

    const filterRes = await client.get(`${API_URL}/admin/restaurants`, {
      params: { status: 'active' }
    });
    console.log(`Filter status "active" returned ${filterRes.data.data.length} restaurants.`);
    if (filterRes.data.data.every(r => r.status === 'active')) {
      console.log('✅ Success: Status filter filtered active restaurants only.');
    } else {
      console.log('❌ Failure: Status filter returned non-active restaurants.');
    }

    // ----------------------------------------------------
    // Scenario 3: Get single restaurant details + stats
    // ----------------------------------------------------
    console.log('\n--- Scenario 3: Restaurant Details & Usage Summary ---');
    const detailsRes = await client.get(`${API_URL}/admin/restaurants/1`);
    console.log('API Response /admin/restaurants/1 data:', detailsRes.data.data.restaurant.name);
    console.log('Usage Stats:', detailsRes.data.data.stats);
    
    if (detailsRes.data.success && detailsRes.data.data.stats.orders_count !== undefined) {
      console.log('✅ Success: Usage summary counts retrieved correctly.');
    } else {
      console.log('❌ Failure: Usage summary missing counts.');
    }

    // ----------------------------------------------------
    // Scenario 4: Get Plans List
    // ----------------------------------------------------
    console.log('\n--- Scenario 4: Retrieve Plans list ---');
    const plansRes = await client.get(`${API_URL}/admin/plans`);
    console.log('Available plans count:', plansRes.data.data.length);
    if (plansRes.data.success && plansRes.data.data.length > 0) {
      console.log('✅ Success: Plans list retrieved successfully.');
    } else {
      console.log('❌ Failure: Plans list could not be retrieved.');
    }

    // ----------------------------------------------------
    // Scenario 5: Update restaurant status (block / activate)
    // ----------------------------------------------------
    console.log('\n--- Scenario 5: Toggle Restaurant Status ---');
    const blockRes = await client.patch(`${API_URL}/admin/restaurants/1/status`, { status: 'blocked' });
    console.log('API Block Response:', blockRes.data);

    const [blockedRest] = await conn.query('SELECT status FROM restaurants WHERE id = 1');
    if (blockedRest[0].status === 'blocked') {
      console.log('✅ Success: Restaurant status updated to blocked in DB.');
    } else {
      console.log('❌ Failure: Restaurant status was not updated.');
    }

    const activateRes = await client.patch(`${API_URL}/admin/restaurants/1/status`, { status: 'active' });
    console.log('API Activate Response:', activateRes.data);

    const [activeRest] = await conn.query('SELECT status FROM restaurants WHERE id = 1');
    if (activeRest[0].status === 'active') {
      console.log('✅ Success: Restaurant status restored to active in DB.');
    } else {
      console.log('❌ Failure: Restaurant status was not updated.');
    }

    // ----------------------------------------------------
    // Scenario 6: Update Subscription Plan and Due Date
    // ----------------------------------------------------
    console.log('\n--- Scenario 6: Update Plan and Expiry Date ---');
    const newDueDate = '2027-12-31';
    const subUpdateRes = await client.put(`${API_URL}/admin/restaurants/1/subscription`, {
      plan_id: 3, // Enterprise
      due_date: `${newDueDate} 23:59:59`,
      status: 'active'
    });
    console.log('API Subscription Update Response:', subUpdateRes.data);

    const [updatedSub] = await conn.query('SELECT * FROM subscriptions WHERE restaurant_id = 1 ORDER BY id DESC LIMIT 1');
    const dbSub = updatedSub[0];
    
    // Convert dates to simple string values to bypass local machine timezone differences
    const dbSubDateStr = new Date(dbSub.due_date).toISOString().split('T')[0];
    const expectedDateStr = new Date(newDueDate).toISOString().split('T')[0];

    if (dbSub.plan_id === 3 && dbSub.monthly_price === 349.00 && dbSubDateStr === expectedDateStr) {
      console.log('✅ Success: Subscription plan, price and expiry date updated correctly in DB.');
    } else {
      console.log('❌ Failure: Subscription details mismatch in DB.');
    }

  } finally {
    console.log('\nRestoring original database states...');
    // Restore original status
    await conn.query('UPDATE restaurants SET status = ? WHERE id = 1', [originalStatus]);
    
    // Restore original subscription
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
    console.log('Original states restored.');
    await conn.end();
    console.log('Database connection closed.');
  }
}

run().catch(console.error);

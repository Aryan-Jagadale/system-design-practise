const mysql = require('mysql2-promise')();

mysql.configure({
  host: '',
  user: '',
  password: '',
  database: 'defaultdb',
  port: 11101,
});

// ------------------- Setup Database -------------------
async function setupDB() {
  const conn = await db.getConnection();
  try {
    // Create accounts table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS accounts (
        id INT PRIMARY KEY,
        name VARCHAR(100),
        balance DECIMAL(10, 2)
      )
    `);

    // Clean old data
    await conn.query('DELETE FROM accounts');

    // Insert initial rows
    await conn.query('INSERT INTO accounts (id, name, balance) VALUES (?, ?, ?)', [1, 'Alice', 1000.00]);
    await conn.query('INSERT INTO accounts (id, name, balance) VALUES (?, ?, ?)', [2, 'Bob', 2000.00]);

    console.log('Database setup complete.');
  } catch (err) {
    console.error('Setup error:', err.message);
  } finally {
    conn.release();
  }
}

// ------------------- Transaction Functions -------------------
async function transactionA() {
  const conn = await db.getConnection();
  try {
    await conn.query('SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ');
    await conn.startTransaction();

    console.log('A: Locking account 1');
    await conn.query('SELECT * FROM accounts WHERE id = 1 FOR UPDATE');

    await new Promise(r => setTimeout(r, 2000)); // simulate delay

    console.log('A: Locking account 2');
    await conn.query('SELECT * FROM accounts WHERE id = 2 FOR UPDATE');

    await conn.commit();
    console.log('A: Commit successful');
  } catch (err) {
    await conn.rollback();
    console.error('A: Transaction rolled back:', err.message);
    if (err.errno === 1213) throw err; // deadlock detected
  } finally {
    conn.release();
  }
}

async function transactionB() {
  const conn = await db.getConnection();
  try {
    await conn.query('SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ');
    await conn.startTransaction();

    console.log('B: Locking account 2');
    await conn.query('SELECT * FROM accounts WHERE id = 2 FOR UPDATE');

    await new Promise(r => setTimeout(r, 2000)); // simulate delay

    console.log('B: Locking account 1');
    await conn.query('SELECT * FROM accounts WHERE id = 1 FOR UPDATE');

    await conn.commit();
    console.log('B: Commit successful');
  } catch (err) {
    await conn.rollback();
    console.error('B: Transaction rolled back:', err.message);
    if (err.errno === 1213) throw err; // deadlock detected
  } finally {
    conn.release();
  }
}

// ------------------- Retry Logic -------------------
async function safeTransaction(txnFn, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      await txnFn();
      return;
    } catch (err) {
      if (err.errno === 1213) { // deadlock error
        console.log(`Deadlock detected, retrying attempt ${i + 1}...`);
        await new Promise(r => setTimeout(r, 100 * (i + 1))); // exponential backoff
      } else {
        throw err;
      }
    }
  }
  throw new Error('Transaction failed after retries due to deadlock.');
}

// ------------------- Run Demo -------------------
(async () => {
  await setupDB();

  // Run transactions concurrently
  await Promise.all([
    safeTransaction(transactionA),
    safeTransaction(transactionB)
  ]);

  // Show final account balances
  const conn = await db.getConnection();
  const [rows] = await conn.query('SELECT * FROM accounts');
  console.log('Final balances:', rows);
  conn.release();
})();

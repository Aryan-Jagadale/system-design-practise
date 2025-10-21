const mysql = require('mysql2-promise')();

mysql.configure({
  host: '',
  user: '',
  password: '',
  database: 'defaultdb',
  port: 11101,
});
// TRANSCATION LOCK

const transferMoney = async (fromId, toId, amount) => {
  const connection = await mysql.getConnection();

  try {
    // 1. Set isolation level for this session
    await connection.query(
      'SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ'
    );

    // 2. Start transaction
    await connection.startTransaction();

    // 3. Perform queries
    const [fromRows] = await connection.query(
      'SELECT balance FROM accounts WHERE id = ? FOR UPDATE',
      [fromId]
    );

    if (fromRows[0].balance < amount) {
      throw new Error('Insufficient funds');
    }

    await connection.query(
      'UPDATE accounts SET balance = balance - ? WHERE id = ?',
      [amount, fromId]
    );
    await connection.query(
      'UPDATE accounts SET balance = balance + ? WHERE id = ?',
      [amount, toId]
    );

    // 4. Commit
    await connection.commit();
    console.log('Transaction committed!');
  } catch (err) {
    // Rollback on error
    await connection.rollback();
    console.error('Transaction rolled back:', err.message);
  } finally {
    connection.release();
  }
};

// Example call
transferMoney(1, 2, 100);




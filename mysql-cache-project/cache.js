const mysql = require('mysql2/promise');

class MySQLCache {
  constructor() {
    this.pool = mysql.createPool({
      host: 'localhost',
      user: 'root',
      password: 'rootpass',
      database: 'cache_db',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
  }

  async set(key, value, ttlSeconds = null) {
    const expiresAt = ttlSeconds ? new Date(Date.now() + ttlSeconds * 1000) : null;
    const sql = `
      INSERT INTO cache_table (cache_key, cache_value, expires_at)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE
        cache_value = VALUES(cache_value),
        expires_at = VALUES(expires_at),
        created_at = NOW()
    `;
    await this.pool.execute(sql, [key, JSON.stringify(value), expiresAt]);
  }

  async get(key) {
    const [rows] = await this.pool.execute(
      `SELECT cache_value FROM cache_table WHERE cache_key = ? AND (expires_at IS NULL OR expires_at > NOW())`,
      [key]
    );
    return rows[0]?.cache_value ? JSON.parse(rows[0].cache_value) : null;
  }

  async delete(key) {
    await this.pool.execute(`DELETE FROM cache_table WHERE cache_key = ?`, [key]);
  }
}

module.exports = MySQLCache;
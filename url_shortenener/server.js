require('dotenv').config();

const { Pool } = require('pg');
const express = require('express');
const { toBase62 } = require('./utils');
const redis = require('./cache/redis.js');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = 4242;

const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: { error: 'Too many requests, try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

app.use('/shorten', limiter);
app.use(express.json());

app.get('/', async (_, res) => {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
    });
    const client = await pool.connect();
    const result = await client.query('SELECT version()');
    client.release();
    const { version } = result.rows[0];
    res.json({ version });
});

// CREATE TABLE urls (
//   id SERIAL PRIMARY KEY,
//   long_url TEXT NOT NULL,
//   short_code VARCHAR(10) UNIQUE NOT NULL,
//   created_at TIMESTAMP DEFAULT NOW(),
//   clicks INT DEFAULT 0
// );

// CREATE INDEX idx_short_code ON urls(short_code);

app.post('/shorten', async (req, res) => {
    console.log("req", req);
    const { long_url,custom_alias } = req?.body;
    if (!long_url) return res.status(400).json({ error: 'long_url required' });

    if (custom_alias) {
        if (!/^[a-zA-Z0-9_-]{3,20}$/.test(custom_alias)) {
            return res.status(400).json({
                error: 'custom_alias must be 3–20 chars, alphanumeric + _ -'
            });
        }
    }

    try {
        const pool = new Pool({
            connectionString: process.env.DATABASE_URL,
        });
        const client = await pool.connect();

        await client.query('BEGIN');

        const insertRes = await client.query(
            'INSERT INTO urls(long_url) VALUES($1) RETURNING id',
            [long_url]
        );

        console.log("insertRes", insertRes);
        const id = insertRes.rows[0].id;

        let short_code;
        if (custom_alias) {
            const conflict = await client.query(
                'SELECT 1 FROM urls WHERE short_code = $1',
                [custom_alias]
            );
            if (conflict.rowCount > 0) {
                await client.query('ROLLBACK');
                return res.status(409).json({
                    error: 'Custom alias already taken'
                });
            }
            short_code = custom_alias;

        } else {
            short_code = toBase62(id);
        }

        await client.query(
            `UPDATE urls 
       SET short_code = $1, 
           expires_at = created_at + INTERVAL '7 days',
           is_custom = $2
       WHERE id = $3`,
            [short_code, !!custom_alias, id]
        );
        await client.query('COMMIT');
        await client.release();
        res.json({ message: 'URL shortened successfully', short_url: `https://short.en/${short_code}` });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/:shortCode', async (req, res) => {
    const { shortCode } = req.params;
    const cacheKey = `url:${shortCode}`;

    try {
        const cached = await redis.get(cacheKey);
        if (cached) {
            await redis.incr(`clicks:${shortCode}`);
            console.log("From here redis");

            return res.redirect(302, cached);
        }

        const pool = new Pool({
            connectionString: process.env.DATABASE_URL,
        });
        const client = await pool.connect();
        const result = await client.query(
            `UPDATE urls 
            SET clicks = clicks + 1 
            WHERE short_code = $1 AND (expires_at IS NULL OR expires_at > NOW())
            RETURNING long_url`,
            [shortCode]
        );

        if (result.rowCount === 0) {
            const check = await pool.query(
                'SELECT 1 FROM urls WHERE short_code = $1 AND expires_at <= NOW()',
                [shortCode]
            );
            if (check.rowCount > 0) {
                return res.status(410).json({ error: 'URL expired' });
            }
            return res.status(404).json({ error: 'Not found' });
        }

        const { long_url } = result.rows[0];
        await redis.setEx(cacheKey, 3600, long_url);
        console.log("From db");

        res.redirect(302, long_url);
    } catch (err) {
        console.error('Redirect error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.listen(PORT, () => {
    console.log(`Listening to http://localhost:${PORT}`);
});
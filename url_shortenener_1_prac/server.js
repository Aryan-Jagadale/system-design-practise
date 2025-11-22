require('dotenv').config();
const express = require('express');
const rateLimit = require('express-rate-limit');
const {
  docClient,
  TableName
} = require('./db/dynamodb');
const {
  GetCommand,
  PutCommand,
  UpdateCommand,
  QueryCommand
} = require("@aws-sdk/lib-dynamodb");
const { generateSnowflake } = require('./utils');
const { toBase62 } = require('./utils');
const redis = require('./cache/redis');

const app = express();
app.use(express.json());


const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Too many requests, try again later.' },
});
app.use('/shorten', limiter);


app.post('/shorten', async (req, res) => {
  const { long_url, custom_alias } = req.body;

  if (!long_url || typeof long_url !== 'string') {
    return res.status(400).json({ error: 'long_url is required' });
  }

  let short_code = custom_alias?.trim();

  if (short_code) {
    if (!/^[a-zA-Z0-9_-]{3,20}$/.test(short_code)) {
      return res.status(400).json({
        error: 'custom_alias must be 3–20 chars, only letters, numbers, _, -'
      });
    }
  } else {
    const snowflakeId = generateSnowflake();
    const timestampPart = BigInt(snowflakeId) >> 22n;
    short_code = toBase62(Number(timestampPart & 0xFFFFFFFFFn));
  }

  const now = new Date().toISOString();
  const expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  try {
    await docClient.send(new PutCommand({
      TableName,
      Item: {
        short_code: short_code,
        long_url: long_url,
        snowflake_id: generateSnowflake(),
        created_at: now,
        expires_at: expires_at,
        clicks: 0,
        is_custom: !!custom_alias
      },
      ConditionExpression: 'attribute_not_exists(short_code)' // ← This prevents duplicates!
    }));

    return res.json({
      message: 'URL shortened successfully',
      short_url: `https://short.en/${short_code}`
    });

  } catch (err) {
    if (err.name === 'ConditionalCheckFailedException') {
      return res.status(409).json({
        error: custom_alias ? 'Custom alias already taken' : 'Short code collision (retry)'
      });
    }
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET /{shortCode} → redirect
app.get('/:shortCode', async (req, res) => {
  const { shortCode } = req.params;

  if (!shortCode || shortCode.length < 3) {
    return res.status(400).json({ error: 'Invalid short code' });
  }

  try {
    const cachedUrl = await redis.get(shortCode);
    if (cachedUrl) {
      redis.incr(`clicks:${shortCode}`).catch(() => {});
      return res.redirect(302, cachedUrl);
    }

    const result = await docClient.send(new GetCommand({
      TableName,
      Key: { short_code: shortCode }
    }));

    if (!result.Item) {
      return res.status(404).json({ error: 'Not found' });
    }

    const { long_url, expires_at } = result.Item;

    if (expires_at && new Date(expires_at) < new Date()) {
      return res.status(410).json({ error: 'URL expired' });
    }


    await docClient.send(new UpdateCommand({
      TableName,
      Key: { short_code: shortCode },
      UpdateExpression: 'SET clicks = clicks + :one',
      ExpressionAttributeValues: { ':one': 1 }
    }));

    await redis.set(shortCode, long_url, 'EX', 3600);

    return res.redirect(302, long_url);

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'URL Shortener is running!', time: new Date().toISOString() });
});

// app.listen(process.env.PORT || 4242, () => {
//   console.log(`Server running on port ${process.env.PORT || 4242}`);
// });


module.exports = app;
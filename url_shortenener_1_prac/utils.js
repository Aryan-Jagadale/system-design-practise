const BASE62_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

function toBase62(num) {
  if (num === 0) return '0';
  let str = '';
  while (num > 0) {
    str = BASE62_CHARS[num % 62] + str;
    num = Math.floor(num / 62);
  }
  return str;
}

function padToLength(str, len = 7) {
  return str.padStart(len, '0');
}


const EPOCH = 1731849600000;
let sequence = 0;
let lastTimestamp = 0;

function generateSnowflake() {
  let now = Date.now();

  if (now === lastTimestamp) {
    sequence++;
    if (sequence > 4095) {
      while (Date.now() <= lastTimestamp) {}
      sequence = 0;
    }
  } else {
    sequence = 0;
  }

  lastTimestamp = now;

  const timestamp = BigInt(now - EPOCH);
  const id = (timestamp << 22n) + (0n << 12n) + BigInt(sequence);

  return id.toString(); 
}


module.exports = { toBase62, padToLength, generateSnowflake };
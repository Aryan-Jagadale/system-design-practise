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

module.exports = { toBase62, padToLength };
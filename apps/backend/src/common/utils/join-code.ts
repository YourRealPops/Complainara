/**
 * Generate a short, URL-safe, human-readable join code.
 * Avoids ambiguous characters: 0/O, 1/l/I.
 */
const CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';

export function generateJoinCode(length = 8): string {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += CHARSET[Math.floor(Math.random() * CHARSET.length)];
  }
  return code;
}

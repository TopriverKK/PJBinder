import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

export function isBcryptHash(value: string) {
  return value.startsWith('$2a$') || value.startsWith('$2b$') || value.startsWith('$2y$');
}

export function hashPassword(value: string) {
  return bcrypt.hashSync(value, SALT_ROUNDS);
}

export function verifyPassword(stored: string, input: string) {
  if (!stored) return { ok: false, needsRehash: false };
  if (isBcryptHash(stored)) {
    return { ok: bcrypt.compareSync(input, stored), needsRehash: false };
  }
  const ok = stored === input;
  return { ok, needsRehash: ok };
}

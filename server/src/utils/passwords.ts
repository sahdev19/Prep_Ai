import bcrypt from 'bcryptjs';
import { env } from '../config/env';

const COST = env.NODE_ENV === 'test' ? 4 : 12;

export const hashPassword = (plain: string) => bcrypt.hash(plain, COST);
export const verifyPassword = (plain: string, hash: string) => bcrypt.compare(plain, hash);

// Compared against when the email is unknown, so response time does not reveal which emails exist.
export const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', COST);

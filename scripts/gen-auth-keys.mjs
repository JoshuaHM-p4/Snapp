// Prints the two server-side auth secrets for render.yaml / apps/server/.env. Run once, paste into Render, never commit.
import {randomBytes} from 'node:crypto';
import {Keypair} from '@stellar/stellar-sdk';
console.log(`AUTH_SERVER_SECRET=${Keypair.random().secret()}   # signs SEP-10 challenges only; holds no funds`);
console.log(`SESSION_SECRET=${randomBytes(32).toString('base64url')}`);

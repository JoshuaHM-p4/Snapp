import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Keypair, Networks, TransactionBuilder} from '@stellar/stellar-sdk';
import {authConfigFromEnv, buildChallenge, issueSession, parseCookies, readSession, verifyChallenge, COOKIE} from './auth.js';

const server=Keypair.fromRawEd25519Seed(Buffer.alloc(32,41));
const wallet=Keypair.fromRawEd25519Seed(Buffer.alloc(32,42));
const stranger=Keypair.fromRawEd25519Seed(Buffer.alloc(32,43));
const cfg=authConfigFromEnv({AUTH_SERVER_SECRET:server.secret(),SESSION_SECRET:'x'.repeat(40),AUTH_HOME_DOMAIN:'snapp.test'})!;
const signWith=(xdr:string,kp:Keypair)=>{const tx=TransactionBuilder.fromXDR(xdr,Networks.TESTNET);tx.sign(kp);return tx.toXDR();};

test('config: missing vars disable auth, malformed vars fail loudly',()=>{
  assert.equal(authConfigFromEnv({}),null);
  assert.throws(()=>authConfigFromEnv({AUTH_SERVER_SECRET:'nope',SESSION_SECRET:'x'.repeat(40),AUTH_HOME_DOMAIN:'a'}),/Stellar secret/);
  assert.throws(()=>authConfigFromEnv({AUTH_SERVER_SECRET:server.secret(),SESSION_SECRET:'short',AUTH_HOME_DOMAIN:'a'}),/32/);
});
test('challenge signed by the wallet proves that address; other signers and tampering are rejected',()=>{
  const xdr=buildChallenge(cfg,wallet.publicKey());
  assert.equal(verifyChallenge(cfg,signWith(xdr,wallet)),wallet.publicKey());
  assert.throws(()=>verifyChallenge(cfg,xdr),/sign/i);                                  // unsigned by client
  assert.throws(()=>verifyChallenge(cfg,signWith(xdr,stranger)));                        // wrong wallet signed
  const otherServer=authConfigFromEnv({AUTH_SERVER_SECRET:stranger.secret(),SESSION_SECRET:'x'.repeat(40),AUTH_HOME_DOMAIN:'snapp.test'})!;
  assert.throws(()=>verifyChallenge(cfg,signWith(buildChallenge(otherServer,wallet.publicKey()),wallet)));  // challenge not from us
  const otherDomain=authConfigFromEnv({AUTH_SERVER_SECRET:server.secret(),SESSION_SECRET:'x'.repeat(40),AUTH_HOME_DOMAIN:'evil.test'})!;
  assert.throws(()=>verifyChallenge(cfg,signWith(buildChallenge(otherDomain,wallet.publicKey()),wallet)));  // wrong home domain
  assert.throws(()=>buildChallenge(cfg,'GNOTAKEY'),/INVALID_ACCOUNT/);
});
test('sessions round-trip, expire, and reject forged or re-keyed cookies',()=>{
  const t0=Date.parse('2026-11-08T00:00:00Z');
  const {cookie,session}=issueSession(cfg,wallet.publicKey(),'owner',t0);
  assert.deepEqual(readSession(cfg,cookie,t0+1000),session);
  assert.equal(readSession(cfg,cookie,t0+cfg.sessionTtlMs+1),null,'expired');
  assert.equal(readSession(cfg,cookie.slice(0,-2)+'zz',t0),null,'bad signature');
  const forged=Buffer.from(JSON.stringify({...session,role:'owner',address:stranger.publicKey()})).toString('base64url')+'.'+cookie.split('.')[1];
  assert.equal(readSession(cfg,forged,t0),null,'payload swap');
  const other=authConfigFromEnv({AUTH_SERVER_SECRET:server.secret(),SESSION_SECRET:'y'.repeat(40),AUTH_HOME_DOMAIN:'snapp.test'})!;
  assert.equal(readSession(other,cookie,t0),null,'different session secret');
  assert.equal(parseCookies(`a=1; ${COOKIE}=${encodeURIComponent(cookie)}; b=2`)[COOKIE],cookie);
});

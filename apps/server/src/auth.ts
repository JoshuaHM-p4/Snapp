import {createHmac, randomBytes, timingSafeEqual} from 'node:crypto';
import type express from 'express';
import {Keypair, Networks, StrKey, WebAuth} from '@stellar/stellar-sdk';
import type {Session, SessionRole} from '@agentpay/shared';

/**
 * Wallet sign-in, SEP-10 style. The server signs a challenge transaction (never submitted); the wallet
 * signs it back; the server verifies the client signature and issues an HMAC-signed, httpOnly cookie.
 * No password, no secret for the user on the server. AUTH_SERVER_SECRET is a Stellar keypair that holds
 * no funds and exists only to sign challenges.
 */
export interface AuthConfig {serverKeypair:Keypair;sessionSecret:Buffer;homeDomain:string;webAuthDomain:string;sessionTtlMs:number;challengeTtlSec:number}
export const COOKIE='snapp_session';

export function authConfigFromEnv(env:NodeJS.ProcessEnv=process.env):AuthConfig|null {
  const secret=env.AUTH_SERVER_SECRET?.trim(), session=env.SESSION_SECRET?.trim(), home=env.AUTH_HOME_DOMAIN?.trim();
  if(!secret||!session||!home)return null;
  if(!StrKey.isValidEd25519SecretSeed(secret))throw new Error('AUTH_SERVER_SECRET is not a Stellar secret seed');
  if(session.length<32)throw new Error('SESSION_SECRET must be at least 32 characters');
  return {serverKeypair:Keypair.fromSecret(secret),sessionSecret:Buffer.from(session,'utf8'),homeDomain:home,webAuthDomain:env.AUTH_WEB_DOMAIN?.trim()||home,sessionTtlMs:12*3600e3,challengeTtlSec:300};
}

export function buildChallenge(cfg:AuthConfig,account:string):string {
  if(!StrKey.isValidEd25519PublicKey(account))throw new Error('INVALID_ACCOUNT');
  return WebAuth.buildChallengeTx(cfg.serverKeypair,account,cfg.homeDomain,cfg.challengeTtlSec,Networks.TESTNET,cfg.webAuthDomain);
}

/** Verifies the wallet-signed challenge and returns the proven address. Throws on any mismatch. */
export function verifyChallenge(cfg:AuthConfig,signedXdr:string):string {
  const {clientAccountID}=WebAuth.readChallengeTx(signedXdr,cfg.serverKeypair.publicKey(),Networks.TESTNET,cfg.homeDomain,cfg.webAuthDomain);
  // The client account is unfunded in most demos, so there is no on-chain signer set to check thresholds
  // against. Require exactly the client's own master key signature instead.
  WebAuth.verifyChallengeTxSigners(signedXdr,cfg.serverKeypair.publicKey(),Networks.TESTNET,[clientAccountID],cfg.homeDomain,cfg.webAuthDomain);
  return clientAccountID;
}

// ── sessions: value.signature, both base64url ─────────────────────────────────────────────────────
const sign=(secret:Buffer,value:string)=>createHmac('sha256',secret).update(value).digest('base64url');
export function issueSession(cfg:AuthConfig,address:string,role:SessionRole,now=Date.now()):{cookie:string;session:Session} {
  const session:Session={address,role,expiresAt:new Date(now+cfg.sessionTtlMs).toISOString()};
  const value=Buffer.from(JSON.stringify({...session,nonce:randomBytes(8).toString('base64url')})).toString('base64url');
  return {cookie:`${value}.${sign(cfg.sessionSecret,value)}`,session};
}
export function readSession(cfg:AuthConfig,cookie:string|undefined,now=Date.now()):Session|null {
  if(!cookie)return null;
  const dot=cookie.lastIndexOf('.');if(dot<1)return null;
  const value=cookie.slice(0,dot),given=cookie.slice(dot+1),expected=sign(cfg.sessionSecret,value);
  if(given.length!==expected.length||!timingSafeEqual(Buffer.from(given),Buffer.from(expected)))return null;
  try{
    const s=JSON.parse(Buffer.from(value,'base64url').toString('utf8')) as Session;
    if(typeof s.address!=='string'||!StrKey.isValidEd25519PublicKey(s.address)||Date.parse(s.expiresAt)<=now)return null;
    return {address:s.address,role:s.role,expiresAt:s.expiresAt};
  }catch{return null;}
}
export function parseCookies(header:string|undefined):Record<string,string> {
  const out:Record<string,string>={};
  for(const part of (header??'').split(';')){const i=part.indexOf('=');if(i>0)out[part.slice(0,i).trim()]=decodeURIComponent(part.slice(i+1).trim());}
  return out;
}
export function cookieHeader(cookie:string,maxAgeSec:number,secure:boolean):string {
  // SameSite=None is required because the web (Vercel) and API (Render) are on different sites.
  return `${COOKIE}=${encodeURIComponent(cookie)}; Path=/; HttpOnly; Max-Age=${maxAgeSec}; SameSite=${secure?'None; Secure':'Lax'}`;
}
export function clearCookieHeader(secure:boolean):string {return `${COOKIE}=; Path=/; HttpOnly; Max-Age=0; SameSite=${secure?'None; Secure':'Lax'}`;}

declare global {namespace Express {interface Request {session?:Session}}}
/** Attach the session (if any) to req; never rejects. Role checks are done per route with requireRole. */
export function sessionMiddleware(cfg:AuthConfig|null):express.RequestHandler {
  return (req,_res,next)=>{if(cfg){const s=readSession(cfg,parseCookies(req.header('cookie'))[COOKIE]);if(s)req.session=s;}next();};
}
export function requireRole(...roles:SessionRole[]):express.RequestHandler {
  return (req,res,next)=>{
    if(!req.session)return res.status(401).json({error:'Sign in with your wallet'});
    if(roles.length&&!roles.includes(req.session.role))return res.status(403).json({error:'Not available to your role',role:req.session.role});
    next();
  };
}

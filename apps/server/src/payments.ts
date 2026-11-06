import {createHmac, timingSafeEqual} from 'node:crypto';
import {Velo, VeloWebhookSignatureVerificationError} from '@carts1024/velo-sdk';
export function veloClient(){if(!process.env.VELO_API_KEY)throw Error('VELO_API_KEY not configured');return new Velo({apiKey:process.env.VELO_API_KEY,environment:'testnet'});}
export async function createCheckout(input:{description:string;amountXlm:string;successUrl:string;cancelUrl:string}) {
 return veloClient().checkout.sessions.create({amount:input.amountXlm,asset:'native',description:input.description,successUrl:input.successUrl,cancelUrl:input.cancelUrl});
}
/** Velo's API is the source of truth for intent status; webhook bodies and redirects only prompt a lookup. */
export async function retrievePaymentIntent(id:string){return veloClient().paymentIntents.retrieve(id);}

/** The fields this server acts on. The SDK's typed event satisfies it; so does the lenient parse below. */
export interface VerifiedVeloEvent {id:string;type:string;paymentIntent?:{id:string;txHash?:string};lenient?:true}

/**
 * Same scheme as the SDK (`t=<unix>,v1=<hex hmac-sha256 of "<t>.<payload>">`, 300 s tolerance) with a
 * constant-time compare. Used only to double-check a delivery the SDK already signature-verified but
 * refused on shape, never as the sole check.
 */
function hmacMatches(payload:string,header:string,secret:string,now=Date.now()):boolean {
 const parts=Object.fromEntries(header.split(',').map(p=>p.trim().split('=',2) as [string,string]));
 const t=Number.parseInt(parts.t??'',10);const given=parts.v1??'';
 if(!Number.isFinite(t)||Math.abs(Math.floor(now/1000)-t)>300||!/^[0-9a-f]{64}$/.test(given))return false;
 const expected=createHmac('sha256',secret).update(`${t}.${payload}`).digest('hex');
 return timingSafeEqual(Buffer.from(expected,'hex'),Buffer.from(given,'hex'));
}
/**
 * `rawBody` must be the unparsed request body: the HMAC covers the exact bytes Velo sent.
 * SDK 0.1.0-alpha.4 (and 1.0.0) parse the body only after the signature check and require every
 * `project` field to be a string; Velo's live deliveries do not satisfy that, so a genuine event fails
 * with "Invalid webhook event: …". For that case only, the HMAC is verified again here and a minimal
 * event is accepted. Signature failures are rethrown untouched.
 */
export async function verifyVeloWebhook(rawBody:Buffer,signature:string):Promise<VerifiedVeloEvent>{
 const secret=process.env.VELO_WEBHOOK_SECRET;if(!secret)throw Error('VELO_WEBHOOK_SECRET not configured');
 const payload=rawBody.toString('utf8');
 try{return await Velo.webhooks.verify({payload,signature,secret});}
 catch(e){
  const shapeOnly=e instanceof VeloWebhookSignatureVerificationError&&e.message.startsWith('Invalid webhook event:');
  if(!shapeOnly||!hmacMatches(payload,signature,secret))throw e;
  const parsed:unknown=JSON.parse(payload);
  if(parsed===null||typeof parsed!=='object'||Array.isArray(parsed))throw e;
  const p=parsed as Record<string,unknown>;
  if(typeof p.id!=='string'||typeof p.type!=='string')throw e;
  const pi=p.paymentIntent as Record<string,unknown>|undefined;
  const paymentIntent=pi&&typeof pi==='object'&&typeof pi.id==='string'?{id:pi.id,...(typeof pi.txHash==='string'?{txHash:pi.txHash}:{})}:undefined;
  return {id:p.id,type:p.type,...(paymentIntent?{paymentIntent}:{}),lenient:true};
 }
}

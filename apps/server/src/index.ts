import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import {fileURLToPath} from 'node:url';
import {evaluateMilestone} from '@agentpay/agent';
import {createCheckout,retrievePaymentIntent,verifyVeloWebhook} from './payments.js';
import {getProjects} from './store.js';
import {CollectionStore} from './collections.js';
import {RunStore} from './runs.js';
import {authConfigFromEnv,buildChallenge,clearCookieHeader,cookieHeader,issueSession,requireRole,sessionMiddleware,verifyChallenge} from './auth.js';
const collections=new CollectionStore();
const runs=new RunStore();
// Committed evidence seeds the run list on boot, so roles survive redeploys on the free (diskless) plan.
{const seedDir=process.env.RUNS_SEED_DIR??fileURLToPath(new URL('../../../data/runs',import.meta.url));const seeded=runs.seedFromDir(seedDir);console.info(seeded.length?`runs seeded from ${seedDir}: ${seeded.join(', ')}`:`no run seeds found at ${seedDir}`);}
const authCfg=authConfigFromEnv();
if(!authCfg)console.warn('Wallet sign-in disabled: set AUTH_SERVER_SECRET, SESSION_SECRET and AUTH_HOME_DOMAIN');
const secureCookies=process.env.NODE_ENV==='production'||(process.env.PUBLIC_WEB_URL??'').startsWith('https://');
const app=express();
app.disable('x-powered-by');
// credentials:true lets the browser send the session cookie cross-site (Vercel web → Render API).
app.use(cors({origin:process.env.WEB_ORIGIN??'http://localhost:5173',credentials:true}));
// Raw webhook route MUST precede express.json(); never trust an unsigned webhook. The HMAC covers the exact
// bytes, so the body is captured raw whatever content type the sender declares.
let lastWebhookRejection:Record<string,unknown>|null=null;
app.post('/api/webhooks/velo',express.raw({type:()=>true,limit:'128kb'}),async(req,res)=>{
 let event;
 const reject=(reason:string)=>{lastWebhookRejection={at:new Date().toISOString(),reason,contentType:req.header('content-type')??null,bodyIsBuffer:Buffer.isBuffer(req.body),bodyBytes:Buffer.isBuffer(req.body)?req.body.length:null,signatureHeaderPresent:Boolean(req.header('x-velo-signature'))};return res.status(400).json({error:'Invalid webhook signature or payload'});};
 try{const signature=req.header('x-velo-signature');if(!signature)return reject('missing_signature_header');if(!Buffer.isBuffer(req.body))return reject('body_not_raw');event=await verifyVeloWebhook(req.body,signature);}
 catch(e){console.error('Rejected Velo webhook',e);return reject(`verify: ${e instanceof Error?e.message:'unknown'}`);}
 // Dedupe on event.id before any side effect; Velo retries deliveries.
 if(!collections.recordEvent(event))return res.status(200).json({received:true,duplicate:true});
 if(!event.paymentIntent)return res.status(200).json({received:true,ignored:event.type});
 // The signed body only tells us which intent changed. Status comes from Velo's API, never from the body or a redirect.
 try{const intent=await retrievePaymentIntent(event.paymentIntent.id);const collection=collections.reconcile(intent,event.paymentIntent.txHash);
  if(!collection)console.warn('Velo event for an intent this server did not create',event.paymentIntent.id);
  return res.status(200).json({received:true,status:collection?.status??'unknown_intent',...(event.lenient?{parsed:'lenient'}:{})});
 }catch(e){console.error('Velo intent retrieval failed; event recorded, status unchanged',e);return res.status(200).json({received:true,status:'retrieval_failed'});}
});
app.use(express.json({limit:'64kb'}));
const auth=(req:express.Request,res:express.Response,next:express.NextFunction)=>{const expected=process.env.ADMIN_API_TOKEN;if(!expected||req.header('authorization')!==`Bearer ${expected}`)return res.status(401).json({error:'Unauthorized'});next();};
// Why the last Velo delivery was rejected (reason, content type, body size); never the body or signature. Admin only.
app.get('/api/webhooks/velo/diagnostics',auth,(_req,res)=>res.json({lastRejection:lastWebhookRejection}));
app.get('/api/health',(_req,res)=>res.json({ok:true,network:'testnet',demoMode:process.env.DEMO_MODE!=='false'}));
// ── Wallet sign-in (SEP-10 style) ───────────────────────────────────────────────────────────────────
app.use(sessionMiddleware(authCfg));
const authEnabled:express.RequestHandler=(_req,res,next)=>authCfg?next():res.status(503).json({error:'Wallet sign-in is not configured on this server'});
app.get('/api/auth/challenge',authEnabled,(req,res)=>{
 const account=String(req.query.account??'');
 try{return res.json({transaction:buildChallenge(authCfg!,account),networkPassphrase:'Test SDF Network ; September 2015'});}
 catch{return res.status(400).json({error:'Invalid Stellar account'});}
});
app.post('/api/auth/verify',authEnabled,(req,res)=>{
 const signed=req.body?.transaction;
 if(typeof signed!=='string')return res.status(400).json({error:'transaction (signed XDR) required'});
 let address:string;
 try{address=verifyChallenge(authCfg!,signed);}catch(e){console.warn('Challenge rejected',e instanceof Error?e.message:e);return res.status(401).json({error:'Challenge signature rejected'});}
 // Role: owner or developer from uploaded runs; client if the address paid a recorded collection; else visitor.
 const role=runs.roleFor(address)??(collections.list().some(c=>c.payerAddress===address)?'client':'visitor');
 const {cookie,session}=issueSession(authCfg!,address,role);
 res.setHeader('Set-Cookie',cookieHeader(cookie,authCfg!.sessionTtlMs/1000,secureCookies));
 return res.json({session});
});
app.post('/api/auth/logout',(_req,res)=>{res.setHeader('Set-Cookie',clearCookieHeader(secureCookies));return res.json({ok:true});});
app.get('/api/me',(req,res)=>res.json({session:req.session??null,authEnabled:Boolean(authCfg)}));
// Runs the signed-in address may see: owners see runs they approved, developers see runs that pay them.
app.get('/api/runs',requireRole('owner','developer'),(req,res)=>res.json({runs:runs.visibleTo(req.session!.address,req.session!.role)}));
// Operator pushes `npm run noir -- evidence` output here so roles and views can be derived. Admin token; never signs anything.
app.put('/api/runs',auth,(req,res)=>{try{return res.json({run:runs.upsert(req.body)});}catch{return res.status(400).json({error:'Expected the JSON printed by `npm run noir -- evidence`'});}});
app.get('/api/projects',(_req,res)=>res.json({projects:getProjects()}));
app.get('/api/agent/preview/:projectId',(req,res)=>{const project=getProjects().find(p=>p.id===req.params.projectId);if(!project)return res.status(404).json({error:'Not found'});return res.json({mode:'dry-run',decisions:project.milestones.map(evaluateMilestone)});});
// Client collections recorded by this server. Status is whatever Velo last reported; never employee pay or invoice settlement.
app.get('/api/collections',(_req,res)=>res.json({collections:collections.list()}));
// Protected operational endpoints. No keys / payment actions in the browser.
app.post('/api/payments/checkout',auth,async(req,res)=>{if(process.env.DEMO_MODE!=='false')return res.status(409).json({error:'DEMO_MODE is enabled'});
 const {projectId,amountXlm}=req.body??{};const project=getProjects().find(p=>p.id===projectId);
 if(!project||typeof amountXlm!=='string'||!/^\d+(\.\d{1,7})?$/.test(amountXlm)||Number(amountXlm)<=0)return res.status(400).json({error:'Invalid project or XLM amount'});
 try{const base=process.env.PUBLIC_WEB_URL??'http://localhost:5173';const intent=await createCheckout({description:`Snapp Testnet project ${project.id}`,amountXlm,successUrl:base+'/checkout/success',cancelUrl:base+'/checkout/cancel'});const collection=collections.recordCheckout(project.id,intent);return res.json({checkoutUrl:intent.checkoutUrl,paymentIntentId:collection.paymentIntentId,status:collection.status});}catch(e){console.error(e);return res.status(502).json({error:'Velo checkout creation failed'});}
});
// Operator re-check for a missed or unreachable webhook. Same retrieve-based path as the webhook; only intents this server created.
app.post('/api/collections/:id/reconcile',auth,async(req,res)=>{
 if(!collections.get(req.params.id))return res.status(404).json({error:'Not found'});
 try{const collection=collections.reconcile(await retrievePaymentIntent(req.params.id));return res.json({collection});}
 catch(e){console.error('Velo intent retrieval failed',e);return res.status(502).json({error:'Velo retrieval failed; status unchanged'});}
});
const port=Number(process.env.PORT??4000);app.listen(port,()=>console.log(`Snapp server: http://localhost:${port} (Testnet only)`));

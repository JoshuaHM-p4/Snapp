import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {verifyVeloWebhook} from './payments.js';

const secret='test-secret';
const sign=(body:string,s=secret,t=Math.floor(Date.now()/1000))=>`t=${t},v1=${createHmac('sha256',s).update(`${t}.${body}`).digest('hex')}`;
const base={version:'1',id:'evt_1',type:'payment.succeeded',test:true,sentAt:'2026-11-06T00:00:00Z',paymentIntent:{id:'pi_1',amount:'0.5',asset:'native',merchantName:'DemoPay',description:null,status:'paid',txHash:'abc',createdAt:'x',updatedAt:'x'}};

test('a live-shaped Velo delivery (non-string project field) is accepted only when the HMAC verifies',async()=>{
  process.env.VELO_WEBHOOK_SECRET=secret;
  const live=JSON.stringify({...base,project:{id:'kh7c5ms',registryProjectId:null,name:'DemoPay',slug:'demopay'}});
  const event=await verifyVeloWebhook(Buffer.from(live),sign(live));
  assert.deepEqual(event,{id:'evt_1',type:'payment.succeeded',paymentIntent:{id:'pi_1',txHash:'abc'},lenient:true});
  await assert.rejects(verifyVeloWebhook(Buffer.from(live),sign(live,'wrong-secret')),/Signature mismatch/);
  await assert.rejects(verifyVeloWebhook(Buffer.from(live),sign(live,secret,Math.floor(Date.now()/1000)-3600)),/expired/);
  const tampered=live.replace('"pi_1"','"pi_2"');
  await assert.rejects(verifyVeloWebhook(Buffer.from(tampered),sign(live)),/Signature mismatch/);
  await assert.rejects(verifyVeloWebhook(Buffer.from(live),'nonsense'),/Invalid signature header/);
});
test('an SDK-shaped delivery still comes back as the SDK typed event, not the lenient form',async()=>{
  process.env.VELO_WEBHOOK_SECRET=secret;
  const sdkShaped=JSON.stringify({...base,project:{id:'p',registryProjectId:'r',name:'n',slug:'s'}});
  const event=await verifyVeloWebhook(Buffer.from(sdkShaped),sign(sdkShaped));
  assert.equal(event.lenient,undefined);assert.equal(event.type,'payment.succeeded');assert.equal(event.paymentIntent?.id,'pi_1');
  assert.ok('project' in event,'typed SDK event retains the full payload');
});

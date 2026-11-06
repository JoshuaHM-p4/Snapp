import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import type {PaymentIntent} from '@carts1024/velo-sdk';
import type {VerifiedVeloEvent} from './payments.js';
import {CollectionStore} from './collections.js';

const intent=(status:PaymentIntent['status']):PaymentIntent=>({id:'pi_1',object:'payment_intent',paymentIntentId:'pi_1',status,amount:'2.5',asset:'native',description:null,checkoutUrl:'https://velo.test/c/pi_1',successUrl:null,cancelUrl:null,expiresAt:'2026-11-07T00:00:00Z',createdAt:'2026-11-06T00:00:00Z',updatedAt:'2026-11-06T00:00:00Z'});
const event=(id:string,txHash?:string):VerifiedVeloEvent=>({id,type:'payment.succeeded',paymentIntent:{id:'pi_1',txHash}});

test('events dedupe by id, status follows retrieved intent, terminal states never regress, unknown intents are ignored',()=>{
  const dir=mkdtempSync(join(tmpdir(),'collections-'));const store=new CollectionStore(join(dir,'c.sqlite'));
  try{
    assert.equal(store.reconcile(intent('paid')),null,'an intent this server never created is not recorded');
    const created=store.recordCheckout('web-001',intent('created'));
    assert.equal(created.status,'created');assert.equal(created.txHash,null);
    assert.equal(store.recordEvent(event('evt_1','abc')),true);
    assert.equal(store.recordEvent(event('evt_1','abc')),false,'a redelivered event is a no-op');
    assert.equal(store.reconcile(intent('pending'))?.status,'pending');
    const paid=store.reconcile(intent('paid'),'abc');
    assert.equal(paid?.status,'paid');assert.equal(paid?.txHash,'abc');
    const afterStale=store.reconcile(intent('pending'));
    assert.equal(afterStale?.status,'paid','a late pending lookup cannot un-pay');
    assert.equal(store.reconcile(intent('paid'))?.txHash,'abc','a later lookup without a hash keeps the recorded one');
    assert.deepEqual(store.list().map(c=>[c.projectId,c.status]),[['web-001','paid']]);
  }finally{store.close();rmSync(dir,{recursive:true,force:true});}
});

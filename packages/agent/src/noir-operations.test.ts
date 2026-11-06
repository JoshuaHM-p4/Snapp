import {test, type TestContext} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Account, Address, Contract, Keypair, Networks, SorobanDataBuilder, TransactionBuilder, nativeToScVal, xdr, type Transaction, type rpc} from '@stellar/stellar-sdk';
import {keypairSigner, type NoirAgentPolicy, type NoirSigner, type PaymentCheck} from '@noirx402/agent-sdk';
import {ASSET, CONTRACTS, createClient, NoirFailure} from './noir.js';
import {approval, signApproval, type Approval} from './noir-experiment.js';
import {executeOperation, reconcile, type CommandKind} from './noir-operations.js';
import {Journal} from './noir-store.js';

const owner=Keypair.fromRawEd25519Seed(Buffer.alloc(32,11));
const agent=Keypair.fromRawEd25519Seed(Buffer.alloc(32,12));
const merchant=Keypair.fromRawEd25519Seed(Buffer.alloc(32,13));
const outsider=Keypair.fromRawEd25519Seed(Buffer.alloc(32,14));
const manifest={id:'operations',purpose:'controlled-testnet-experiment',owner:owner.publicKey(),agent:agent.publicKey(),merchant:merchant.publicKey(),deviceHash:'ab'.repeat(32),amountXlm:'1',maxPaymentXlm:'2',totalBudgetXlm:'3',fundingXlm:'4',expiresAt:'2099-01-01T00:00:00Z'};
const ledger=73;
const cursor=(n:number)=>(BigInt(n)<<32n).toString();

function fixture(t:TestContext,a:Approval=approval(manifest)) {
  const dir=mkdtempSync(join(tmpdir(),'noir-operations-'));
  const path=join(dir,'journal.sqlite');
  const client=createClient();
  const state={
    owner:a.manifest.owner as string|null,agent:a.manifest.agent,
    policy:{agent:a.manifest.agent,asset:ASSET,maxAmount:a.amounts.maxPayment,expiresAt:new Date(a.manifest.expiresAt)} as NoirAgentPolicy|null,
    token:ASSET as string|null,balance:a.amounts.funding,pending:25000000n,
    check:{ok:true} as PaymentCheck,simulationError:false,submitError:false,rpcError:false,eventError:false,
    status:'SUCCESS' as 'SUCCESS'|'FAILED'|'NOT_FOUND',
    simulations:0,signatures:0,sent:[] as Transaction[],
    eventQueries:[] as unknown[],eventPages:[] as {events:rpc.Api.EventResponse[];cursor:string;latestLedger:number}[],
    pendingReads:0,pendingRead:undefined as undefined|((read:number)=>bigint),
  };
  const h={client,a,state,journal:new Journal(path),path,
    consent:{live:true,confirm:a.digest,attested:true,allowlist:a.manifest.merchant},
    signer(key:Keypair):NoirSigner {
      const real=keypairSigner(key.secret());
      return {publicKey:real.publicKey,async signTransaction(value,options){state.signatures++;return real.signTransaction(value,options);}};
    },
    row(kind:CommandKind){const row=h.journal.existing(a.manifest.id,kind);assert.ok(row);return row;},
    async run(kind:CommandKind,extra:Partial<{pendingStroops:string}>= {}) {
      return executeOperation(client,h.journal,a,kind,h.signer(kind==='authorize'?agent:kind==='claim'?merchant:owner),{...h.consent,...extra});
    },
  };
  h.journal.saveApproval(a,signApproval(a,owner.secret()));
  t.after(()=>{h.journal.close();rmSync(dir,{recursive:true,force:true});});
  // Keep the SDK's prepare/submit and the RPC server's prepareTransaction intact.
  // Only transport methods and independent on-chain read predicates are replaced.
  Object.assign(client.server,{
    async getNetwork(){return {passphrase:Networks.TESTNET};},
    async getAccount(source:string){return new Account(source,'123');},
    async simulateTransaction(){
      state.simulations++;
      if(state.simulationError)return {error:'simulation refused',latestLedger:ledger};
      return {_parsed:true,id:'simulation',latestLedger:ledger,events:[],minResourceFee:'1000',
        transactionData:new SorobanDataBuilder().setResources(100000,100,100).setResourceFee('1000'),
        result:{auth:[],retval:xdr.ScVal.scvVoid()}};
    },
    async sendTransaction(tx:Transaction){
      // A second connection must observe the committed identity before broadcast.
      const observer=new Journal(path);
      try {
        const persisted=observer.operations(a.manifest.id).find(row=>row.tx_hash===tx.hash().toString('hex'));
        assert.ok(persisted,'identity is durable before transport receives a transaction');
        assert.equal(persisted.state,'prepared');
      }finally{observer.close();}
      const decoded=TransactionBuilder.fromXDR(tx.toXDR(),Networks.TESTNET);
      assert.ok('source' in decoded);
      assert.equal(decoded.signatures.length,1);
      assert.ok(Keypair.fromPublicKey(decoded.source).verify(decoded.hash(),decoded.signatures[0]!.signature()));
      state.sent.push(tx);
      if(state.submitError)throw new Error('transport timeout after send');
      return {status:'PENDING',hash:tx.hash().toString('hex')};
    },
    async getTransaction(){
      if(state.rpcError)throw new Error('RPC unavailable');
      return {status:state.status,ledger,createdAt:1700000000,applicationOrder:1};
    },
    async getEvents(query:unknown){
      state.eventQueries.push(query);
      if(state.eventError)throw new Error('event retention gap');
      return state.eventPages.shift()??{events:[],cursor:cursor(ledger),latestLedger:ledger};
    },
  });
  Object.assign(client,{
    async getDeviceOwner(){return state.owner;},async getDeviceAgent(){return state.agent;},
    async getPolicy(){return state.policy;},async getEscrowToken(){return state.token;},
    async getEscrowBalance(){return state.balance;},async checkPayment(){return state.check;},
    async getPendingBalance(){state.pendingReads++;return state.pendingRead?.(state.pendingReads)??state.pending;},
  });
  return h;
}

function authorizationEvent(a:Approval,hash:string,id='matching'):rpc.Api.EventResponse {
  return {id,type:'contract',ledger,ledgerClosedAt:'2026-11-06T00:00:00Z',txHash:hash,
    contractId:new Contract(CONTRACTS.paymentEscrow), // current RPC omits inSuccessfulContractCall; SUCCESS comes from getTransaction
    topic:[xdr.ScVal.scvSymbol('authorize'),xdr.ScVal.scvBytes(Buffer.from(a.manifest.deviceHash,'hex')),new Address(a.manifest.merchant).toScVal()],
    value:nativeToScVal(a.amounts.amount,{type:'i128'})} as rpc.Api.EventResponse;
}

const code=(expected:string)=>(error:unknown)=>error instanceof NoirFailure&&error.code===expected;

test('official prepare/sign/submit persists the actual signed hash and suppresses duplicate authorization',async t=>{
  const h=fixture(t);
  const result=await h.run('authorize');
  const row=h.row('authorize');
  assert.deepEqual(result,{hash:row.tx_hash,state:'unknown',next:'reconcile'});
  assert.equal(row.tx_hash,h.state.sent[0]!.hash().toString('hex'));
  assert.equal(row.source,agent.publicKey());
  const operation=JSON.parse(row.operation_json);
  assert.equal(operation.kind,'authorize');assert.equal(operation.amount,'10000000');
  assert.equal(operation.merchant,merchant.publicKey());assert.equal(operation.nonce,row.nonce);
  const sent=h.state.sent[0]!;
  assert.equal(sent.operations[0]!.type,'invokeHostFunction');
  assert.ok(sent.toEnvelope().v1().tx().ext().value(),'simulation adds Soroban transaction data');
  assert.equal(sent.fee,'1100');
  await h.run('authorize');
  assert.equal(h.state.sent.length,1);assert.equal(h.state.signatures,1);assert.equal(h.state.simulations,1);
});

test('wrong role and a signer falsely advertising the correct role cannot submit',async t=>{
  const h=fixture(t);
  await assert.rejects(executeOperation(h.client,h.journal,h.a,'authorize',h.signer(owner),h.consent),code('WRONG_SIGNER'));
  const wrong=keypairSigner(outsider.secret());
  const impersonator:NoirSigner={publicKey:agent.publicKey(),signTransaction:(value,options)=>wrong.signTransaction(value,options)};
  await assert.rejects(executeOperation(h.client,h.journal,h.a,'authorize',impersonator,h.consent));
  assert.equal(h.state.sent.length,0);assert.equal(h.journal.operations(h.a.manifest.id).length,0);
});

test('policy refusal is preserved and simulation failure rolls back without signing or broadcasting',async t=>{
  const h=fixture(t);
  h.state.check={ok:false,reason:'over_limit'};
  await assert.rejects(h.run('authorize'),code('over_limit'));
  assert.equal(h.state.simulations,0);
  h.state.check={ok:true};h.state.simulationError=true;
  await assert.rejects(h.run('authorize'),/simulation refused/);
  assert.equal(h.state.signatures,0);assert.equal(h.state.sent.length,0);
  assert.equal(h.journal.operations(h.a.manifest.id).length,0);
});

test('uncertain submission survives reopen with unchanged nonce/hash and cannot replay',async t=>{
  const h=fixture(t);h.state.submitError=true;
  await assert.rejects(h.run('authorize'),code('SUBMISSION_UNCERTAIN'));
  const before=h.row('authorize');assert.equal(before.state,'unknown');
  h.journal.close();h.journal=new Journal(h.path);
  h.state.submitError=false;
  await h.run('authorize');
  assert.equal(h.row('authorize').tx_hash,before.tx_hash);assert.equal(h.row('authorize').nonce,before.nonce);
  assert.equal(h.state.sent.length,1);assert.equal(h.state.signatures,1);
  h.state.status='NOT_FOUND';await reconcile(h.client,h.journal,h.a);
  assert.equal(h.row('authorize').state,'unknown');assert.equal(h.row('authorize').tx_hash,before.tx_hash);
  h.state.rpcError=true;await reconcile(h.client,h.journal,h.a);
  assert.equal(h.row('authorize').state,'unknown');
  h.state.rpcError=false;h.state.status='SUCCESS';await reconcile(h.client,h.journal,h.a);
  assert.equal(h.row('authorize').state,'succeeded');assert.equal(h.row('authorize').ledger,ledger);
  assert.equal(h.state.sent.length,1);
});

test('FAILED reconciliation is durable, never replayed, and does not regress on NOT_FOUND',async t=>{
  const h=fixture(t);await h.run('authorize');h.state.status='FAILED';
  await reconcile(h.client,h.journal,h.a);
  assert.equal(h.row('authorize').state,'failed');assert.equal(h.row('authorize').ledger,ledger);
  const hash=h.row('authorize').tx_hash;
  await h.run('authorize');h.state.status='NOT_FOUND';await reconcile(h.client,h.journal,h.a);
  assert.equal(h.row('authorize').state,'failed');assert.equal(h.row('authorize').tx_hash,hash);
  assert.equal(h.state.sent.length,1);assert.equal(h.state.signatures,1);
});

test('SUCCESS filters decoded event pages by hash, contract, type, ledger, device, merchant and amount',async t=>{
  const h=fixture(t);await h.run('authorize');const hash=h.row('authorize').tx_hash;
  const event=authorizationEvent(h.a,hash);
  const unrelated=[
    {...event,id:'hash',txHash:'f'.repeat(64)},
    {...event,id:'contract',contractId:new Contract(CONTRACTS.agentRegistry)},
    {...event,id:'ledger',ledger:ledger+1},
    {...event,id:'device',topic:[event.topic[0]!,xdr.ScVal.scvBytes(Buffer.alloc(32,0)),event.topic[2]!]},
    {...event,id:'merchant',topic:[...event.topic.slice(0,2),new Address(outsider.publicKey()).toScVal()]},
    {...event,id:'amount',value:nativeToScVal(1n,{type:'i128'})},
    {...event,id:'type',topic:[xdr.ScVal.scvSymbol('fund'),event.topic[1]!] },
  ];
  const pages=()=>[
    {events:unrelated,cursor:cursor(ledger-1),latestLedger:ledger},
    {events:[event,event],cursor:cursor(ledger),latestLedger:ledger},
  ];
  h.state.eventPages=pages();await reconcile(h.client,h.journal,h.a);
  const row=h.row('authorize');const evidence=JSON.parse(row.evidence_json);
  assert.equal(row.state,'succeeded');assert.equal(evidence.eventEvidence,'matched');
  assert.equal(evidence.events.length,1);assert.equal(evidence.events[0].id,'matching');assert.equal(evidence.events[0].amount,'10000000');
  assert.equal(h.state.eventQueries.length,2);
  assert.deepEqual(h.state.eventQueries[1],{filters:[{type:'contract',contractIds:Object.values(CONTRACTS)}],cursor:cursor(ledger-1),limit:100});
  const before=h.journal.evidence(h.a);
  h.state.eventPages=pages();await reconcile(h.client,h.journal,h.a);
  assert.deepEqual(h.journal.evidence(h.a),before,'identical reconciliation adds no audit transitions');
  h.state.status='NOT_FOUND';await reconcile(h.client,h.journal,h.a);
  assert.deepEqual(h.journal.evidence(h.a),before,'retention gaps cannot erase confirmed proof');
});

test('missing or unavailable event evidence is not fabricated from transaction SUCCESS',async t=>{
  const h=fixture(t);await h.run('authorize');
  h.state.eventError=true;await reconcile(h.client,h.journal,h.a);
  assert.equal(h.row('authorize').state,'succeeded');
  assert.equal(JSON.parse(h.row('authorize').evidence_json).eventEvidence,'incomplete');
  h.state.eventError=false;await reconcile(h.client,h.journal,h.a);
  const evidence=JSON.parse(h.row('authorize').evidence_json);
  assert.equal(evidence.eventEvidence,'missing');assert.deepEqual(evidence.events,[]);
});

test('setup reuses exact registrations, refuses conflicts, and journals funding only once',async t=>{
  const h=fixture(t);
  assert.deepEqual(await h.run('device'),{alreadyPresent:true,kind:'device'});
  assert.deepEqual(await h.run('policy'),{alreadyPresent:true,kind:'policy'});
  assert.equal(h.state.signatures,0);
  h.state.owner=outsider.publicKey();await assert.rejects(h.run('device'),code('DEVICE_OWNER_MISMATCH'));
  h.state.owner=owner.publicKey();h.state.agent=outsider.publicKey();
  await assert.rejects(h.run('device'),code('DEVICE_AGENT_MISMATCH'));
  h.state.agent=agent.publicKey();h.state.policy={...h.state.policy!,maxAmount:1n};
  await assert.rejects(h.run('policy'),code('POLICY_CAP_MISMATCH'));
  h.state.policy={...h.state.policy!,maxAmount:h.a.amounts.maxPayment,asset:CONTRACTS.deviceRegistry};
  await assert.rejects(h.run('fund'),code('wrong_asset'));
  h.state.policy={...h.state.policy!,asset:ASSET};
  await h.run('fund');await h.run('fund');
  assert.equal(h.state.sent.length,1);assert.equal(h.state.signatures,1);
  assert.equal(JSON.parse(h.row('fund').operation_json).amount,'40000000');
  assert.equal(JSON.parse(h.row('fund').evidence_json).externalBalanceStroops,'40000000');
  assert.equal(h.journal.operations(h.a.manifest.id).length,1);
});

test('absent device and policy use owner-signed SDK registration operations',async t=>{
  const h=fixture(t);h.state.owner=null;
  await h.run('device');assert.equal(JSON.parse(h.row('device').operation_json).kind,'registerDevice');
  h.state.owner=owner.publicKey();h.state.policy=null;
  await h.run('policy');assert.equal(JSON.parse(h.row('policy').operation_json).kind,'registerAgent');
  assert.equal(h.state.sent.length,2);assert.ok(h.state.sent.every(tx=>tx.source===owner.publicKey()));
});

test('authorization rejects escrow and setup mismatches before preparation',async t=>{
  const h=fixture(t);
  h.state.balance=0n;await assert.rejects(h.run('authorize'),code('insufficient_escrow'));
  h.state.balance=h.a.amounts.funding;h.state.token=null;
  await assert.rejects(h.run('authorize'),code('wrong_asset'));
  h.state.token=ASSET;h.state.policy={...h.state.policy!,expiresAt:new Date('2000-01-01T00:00:00Z')};
  await assert.rejects(h.run('authorize'),code('POLICY_EXPIRY_MISMATCH'));
  assert.equal(h.state.simulations,0);assert.equal(h.state.signatures,0);assert.equal(h.state.sent.length,0);
});

test('claim requires confirmed authorization and exact positive aggregate pending, rechecked before signing',async t=>{
  const h=fixture(t);
  await assert.rejects(h.run('claim',{pendingStroops:'25000000'}),code('AUTHORIZATION_NOT_CONFIRMED'));
  await h.run('authorize');
  await assert.rejects(h.run('claim',{pendingStroops:'25000000'}),code('AUTHORIZATION_NOT_CONFIRMED'));
  await reconcile(h.client,h.journal,h.a);
  for(const pendingStroops of [undefined,'0','-1','1.0',' 25000000']){
    await assert.rejects(h.run('claim',pendingStroops===undefined?{}:{pendingStroops}),code('PENDING_CONFIRMATION_REQUIRED'));
  }
  h.state.pending=0n;await assert.rejects(h.run('claim',{pendingStroops:'25000000'}),code('PENDING_CHANGED'));
  h.state.pending=25000001n;await assert.rejects(h.run('claim',{pendingStroops:'25000000'}),code('PENDING_CHANGED'));
  h.state.pendingReads=0;h.state.pendingRead=read=>read===1?25000000n:25000001n;
  await assert.rejects(h.run('claim',{pendingStroops:'25000000'}),code('PENDING_CHANGED'));
  assert.equal(h.journal.existing(h.a.manifest.id,'claim'),undefined);assert.equal(h.state.sent.length,1);assert.equal(h.state.signatures,1);
  h.state.pendingRead=undefined;h.state.pending=25000000n;
  await h.run('claim',{pendingStroops:'25000000'});await h.run('claim',{pendingStroops:'25000000'});
  const row=h.row('claim');assert.equal(row.source,merchant.publicKey());
  assert.deepEqual(JSON.parse(row.operation_json),{kind:'claim',token:ASSET});
  assert.equal(JSON.parse(row.evidence_json).aggregateClaimStroops,'25000000');
  assert.equal(h.state.sent.length,2);assert.equal(h.state.signatures,2);
  const authorizationHash=h.row('authorize').tx_hash;assert.notEqual(row.tx_hash,authorizationHash);
  const event=authorizationEvent(h.a,row.tx_hash,'claim-proof');
  h.state.eventPages=[{events:[{...event,topic:[xdr.ScVal.scvSymbol('claim'),new Address(merchant.publicKey()).toScVal()],value:nativeToScVal(25000000n,{type:'i128'})}],cursor:cursor(ledger),latestLedger:ledger}];
  // Reconcile each recorded hash; the first page belongs to authorization, so
  // supply it again for the separate claim lookup.
  h.state.eventPages.unshift({events:[],cursor:cursor(ledger),latestLedger:ledger});
  await reconcile(h.client,h.journal,h.a);
  const evidence=JSON.parse(h.row('claim').evidence_json);
  assert.equal(evidence.eventEvidence,'matched');assert.equal(evidence.events[0].type,'payment.claimed');
  assert.equal(evidence.events[0].amount,'25000000');assert.equal(h.row('authorize').tx_hash,authorizationHash);
});

test('expired approval does not strand a previously confirmed merchant authorization',async t=>{
  const a=approval({...manifest,expiresAt:'2000-01-01T00:00:00Z'});
  const h=fixture(t,a);
  // Historical confirmation is persisted fixture data, not a new expired authorization.
  await h.journal.transaction(async()=>{
    const row=h.journal.insert(a,'authorize',agent.publicKey(),{kind:'authorize',amount:a.amounts.amount},1n,'a'.repeat(64),{});
    assert.equal(row.state,'prepared');
  });
  h.journal.transition(h.row('authorize'),'succeeded',ledger,{transaction:{status:'SUCCESS'}});
  await assert.rejects(h.run('fund'),code('EXPIRED_APPROVAL'));
  await h.run('claim',{pendingStroops:'25000000'});
  assert.equal(h.row('claim').state,'unknown');assert.equal(h.state.sent.length,1);
  assert.equal(h.state.sent[0]!.source,merchant.publicKey());
});

test('wallet object signatures work but a signed replacement transaction body is rejected',async t=>{
  const h=fixture(t);
  const real=keypairSigner(agent.secret());
  const replacement:NoirSigner={publicKey:agent.publicKey(),async signTransaction(value,options){
    const decoded=TransactionBuilder.fromXDR(value,options.networkPassphrase);
    assert.ok('source' in decoded);
    const changed=TransactionBuilder.cloneFrom(decoded,{fee:'2000'}).build();
    changed.sign(agent);
    return {signedTxXdr:changed.toXDR()};
  }};
  await assert.rejects(executeOperation(h.client,h.journal,h.a,'authorize',replacement,h.consent),code('SIGNER_CHANGED_BODY'));
  assert.equal(h.state.sent.length,0);assert.equal(h.journal.operations(h.a.manifest.id).length,0);
  const wallet:NoirSigner={publicKey:agent.publicKey(),async signTransaction(value,options){
    const signed=await real.signTransaction(value,options);
    return {signedTxXdr:typeof signed==='string'?signed:signed.signedTxXdr};
  }};
  await executeOperation(h.client,h.journal,h.a,'authorize',wallet,h.consent);
  assert.equal(h.state.sent.length,1);assert.equal(h.row('authorize').tx_hash,h.state.sent[0]!.hash().toString('hex'));
});

test('full event page at latest ledger is continued rather than losing matching evidence',async t=>{
  const h=fixture(t);await h.run('authorize');
  const event=authorizationEvent(h.a,h.row('authorize').tx_hash);
  h.state.eventPages=[
    {events:Array.from({length:100},(_,index)=>({...event,id:`other-${index}`,txHash:'f'.repeat(64)})),cursor:cursor(ledger),latestLedger:ledger},
    {events:[event],cursor:((BigInt(ledger)<<32n)+1n).toString(),latestLedger:ledger},
  ];
  await reconcile(h.client,h.journal,h.a);
  assert.equal(h.state.eventQueries.length,2);
  assert.equal(JSON.parse(h.row('authorize').evidence_json).events[0].id,'matching');
});

test('live consent, attestation and allowlist gates stop writes before SDK preparation',async t=>{
  const h=fixture(t);
  for(const [change,expected] of [
    [{live:false},'LIVE_REQUIRED'],
    [{confirm:'0'.repeat(64)},'DIGEST_MISMATCH'],
    [{attested:false},'CONTRACT_ATTESTATION_REQUIRED'],
    [{allowlist:outsider.publicKey()},'MERCHANT_NOT_ALLOWED'],
  ] as const){
    await assert.rejects(executeOperation(h.client,h.journal,h.a,'authorize',h.signer(agent),{...h.consent,...change}),code(expected));
  }
  assert.equal(h.state.signatures,0);assert.equal(h.state.simulations,0);assert.equal(h.state.sent.length,0);
});

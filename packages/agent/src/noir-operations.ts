import {type NoirAgentClient,type NoirSigner,type NoirOperation,type NoirAgentPolicy, type NoirEvent,cursorLedger,decodeEvent} from '@noirx402/agent-sdk';
import {ASSET,CONTRACTS,NoirFailure,prepareSigned,requireCondition,verifyNetwork} from './noir.js';
import {type Approval,requireFresh,requireMerchant,json} from './noir-experiment.js';
import {Journal,type OperationRow} from './noir-store.js';

export type CommandKind='device'|'policy'|'fund'|'authorize'|'claim';
export interface LiveConsent {live:boolean;confirm:string|undefined;attested:boolean;allowlist:string|undefined;pendingStroops?:string;}
function matchingPolicy(a:Approval,p:NoirAgentPolicy|null):void {
  requireCondition(p,'NO_POLICY');
  requireCondition(p.agent===a.manifest.agent,'wrong_agent');
  requireCondition(p.asset===ASSET,'wrong_asset');
  requireCondition(p.maxAmount===a.amounts.maxPayment,'POLICY_CAP_MISMATCH');
  requireCondition(p.expiresAt?.getTime()===Date.parse(a.manifest.expiresAt),'POLICY_EXPIRY_MISMATCH');
}
async function matchingDevice(client:NoirAgentClient,a:Approval):Promise<void> {
  requireCondition(await client.getDeviceOwner(a.manifest.deviceHash)===a.manifest.owner,'DEVICE_OWNER_MISMATCH');
  requireCondition(await client.getDeviceAgent(a.manifest.deviceHash)===a.manifest.agent,'DEVICE_AGENT_MISMATCH');
}
export async function executeOperation(client:NoirAgentClient,journal:Journal,a:Approval,kind:CommandKind,signer:NoirSigner,consent:LiveConsent):Promise<unknown> {
  requireCondition(consent.live,'LIVE_REQUIRED');
  requireCondition(consent.confirm===a.digest,'DIGEST_MISMATCH');
  requireCondition(consent.attested,'CONTRACT_ATTESTATION_REQUIRED');
  a=journal.verify(a);
  requireMerchant(a,consent.allowlist);
  if(kind!=='claim') requireFresh(a);
  const source=kind==='authorize'?a.manifest.agent:kind==='claim'?a.manifest.merchant:a.manifest.owner;
  requireCondition(signer.publicKey===source,'WRONG_SIGNER');
  await verifyNetwork(client);
  let signed:string|undefined,operation:NoirOperation|undefined;
  const result=await journal.transaction(async()=>{
    journal.verify(a);
    const existing=journal.existing(a.manifest.id,kind);
    if(existing)return {existing}; // Never sign or submit an already recorded operation, even FAILED.
    const m=a.manifest;
    let nonce:bigint|null=null,details:Record<string,unknown>={};
    if(kind==='device'){
      const owner=await client.getDeviceOwner(m.deviceHash);
      if(owner!==null){await matchingDevice(client,a);return {alreadyPresent:true,kind};}
      operation={kind:'registerDevice',deviceHash:m.deviceHash,agent:m.agent};
    } else if(kind==='policy'){
      await matchingDevice(client,a);
      const policy=await client.getPolicy(m.deviceHash);
      if(policy){matchingPolicy(a,policy);return {alreadyPresent:true,kind};}
      operation={kind:'registerAgent',deviceHash:m.deviceHash,agent:m.agent,asset:ASSET,maxAmount:a.amounts.maxPayment,expiresAt:new Date(m.expiresAt)};
    } else if(kind==='fund'||kind==='authorize'){
      await matchingDevice(client,a);matchingPolicy(a,await client.getPolicy(m.deviceHash));
      const token=await client.getEscrowToken(m.deviceHash);
      requireCondition(token===ASSET || (kind==='fund'&&token===null),'wrong_asset');
      if(kind==='fund'){
        // External funding is visible balance, not evidence of a local funding transaction.
        details={externalBalanceStroops:(await client.getEscrowBalance(m.deviceHash)).toString()};
        operation={kind:'fundEscrow',deviceHash:m.deviceHash,token:ASSET,amount:a.amounts.funding};
      }else{
        requireCondition(await client.getEscrowBalance(m.deviceHash)>=a.amounts.amount,'insufficient_escrow');
        const check=await client.checkPayment({deviceHash:m.deviceHash,agent:m.agent,asset:ASSET,amount:a.amounts.amount});
        if(!check.ok)throw new NoirFailure(check.reason);
        nonce=journal.reserveBudget(a);
        operation={kind:'authorize',deviceHash:m.deviceHash,merchant:m.merchant,asset:ASSET,amount:a.amounts.amount,nonce};
      }
    }else{
      requireCondition(journal.existing(m.id,'authorize')?.state==='succeeded','AUTHORIZATION_NOT_CONFIRMED');
      requireCondition(typeof consent.pendingStroops==='string'&&/^[1-9]\d*$/.test(consent.pendingStroops),'PENDING_CONFIRMATION_REQUIRED');
      const pending=await client.getPendingBalance(m.merchant);
      requireCondition(pending>0n&&pending===BigInt(consent.pendingStroops),'PENDING_CHANGED');
      operation={kind:'claim',token:ASSET};details={aggregateClaimStroops:pending.toString(),scope:'ALL merchant/token pending funds; not an item receipt'};
    }
    const prepared=await prepareSigned(client,signer,source,operation!,async()=>{
      journal.verify(a);
      if(kind!=='claim') requireFresh(a);
      else requireCondition((await client.getPendingBalance(m.merchant)).toString()===consent.pendingStroops,'PENDING_CHANGED');
    });
    signed=prepared.signed;
    const row=journal.insert(a,kind,source,operation,nonce,prepared.hash,details);
    return {row};
  });
  if(!('row' in result)||!result.row)return result;
  const row=result.row;
  try{
    const returned=await client.submit(signed!,operation);
    requireCondition(returned===row.tx_hash,'SUBMITTED_HASH_MISMATCH');
    // submit success is not retained as independent RPC/event proof. Reconciliation supplies it.
    journal.transition(row,'unknown',null,{...JSON.parse(row.evidence_json),submission:'sdk-confirmed; reconcile for durable ledger/event evidence'});
    return {hash:row.tx_hash,state:'unknown',next:'reconcile'};
  }catch{
    journal.transition(row,'unknown',null,{...JSON.parse(row.evidence_json),failureCode:'SUBMISSION_UNCERTAIN'});
    throw new NoirFailure('SUBMISSION_UNCERTAIN',row.tx_hash);
  }
}

export async function checkExperiment(client:NoirAgentClient,journal:Journal,a:Approval,allowlist:string|undefined):Promise<unknown> {
  await verifyNetwork(client);
  const checks:Record<string,unknown>={};
  const inspect=async(name:string,fn:()=>Promise<unknown>|unknown)=>{
    try{checks[name]={ok:true,value:await fn()};}catch(e){checks[name]={ok:false,code:e instanceof NoirFailure?e.code:'READ_UNAVAILABLE'};}
  };
  // Independent reads keep pending claimability visible even after policy/approval expiry.
  await inspect('pendingMerchantStroops',async()=>(await client.getPendingBalance(a.manifest.merchant)).toString());
  await inspect('approval',()=>{journal.verify(a);return a.digest;});
  await inspect('expiry',()=>{requireFresh(a);return a.manifest.expiresAt;});
  await inspect('allowlist',()=>{requireMerchant(a,allowlist);return true;});
  await inspect('device',()=>matchingDevice(client,a));
  await inspect('policy',async()=>{const p=await client.getPolicy(a.manifest.deviceHash);matchingPolicy(a,p);return p;});
  await inspect('token',()=>client.getEscrowToken(a.manifest.deviceHash));
  await inspect('escrowStroops',async()=>(await client.getEscrowBalance(a.manifest.deviceHash)).toString());
  await inspect('authorization',()=>client.checkPayment({deviceHash:a.manifest.deviceHash,agent:a.manifest.agent,asset:ASSET,amount:a.amounts.amount}));
  return {digest:a.digest,checks};
}
function matchesEvent(e:NoirEvent,row:OperationRow,a:Approval):boolean {
  if(e.txHash!==row.tx_hash||e.ledger!==row.ledger)return false;
  const m=a.manifest;
  switch(row.kind){
    case 'device':return e.contractId===CONTRACTS.deviceRegistry&&e.type==='device.registered'&&e.deviceHash===m.deviceHash&&e.agent===m.agent;
    case 'policy':return e.contractId===CONTRACTS.agentRegistry&&e.type==='agent.registered'&&e.deviceHash===m.deviceHash&&e.agent===m.agent;
    case 'fund':return e.contractId===CONTRACTS.paymentEscrow&&e.type==='escrow.funded'&&e.deviceHash===m.deviceHash&&e.amount===a.amounts.funding;
    case 'authorize':return e.contractId===CONTRACTS.paymentEscrow&&e.type==='payment.authorized'&&e.deviceHash===m.deviceHash&&e.merchant===m.merchant&&e.amount===a.amounts.amount;
    case 'claim':return e.contractId===CONTRACTS.paymentEscrow&&e.type==='payment.claimed'&&e.merchant===m.merchant&&e.amount.toString()===JSON.parse(row.evidence_json).aggregateClaimStroops;
    default:return false;
  }
}
export async function reconcile(client:NoirAgentClient,journal:Journal,a:Approval):Promise<unknown> {
  journal.verify(a);await verifyNetwork(client);
  for(const row of journal.operations(a.manifest.id)){
    let tx;
    try{tx=await client.server.getTransaction(row.tx_hash);}catch{journal.transition(row,'unknown',null,{...JSON.parse(row.evidence_json),reconciliation:'RPC_UNAVAILABLE'});continue;}
    if(tx.status==='NOT_FOUND'){journal.transition(row,'unknown',null,{...JSON.parse(row.evidence_json),reconciliation:'NOT_FOUND_OR_RETENTION_GAP'});continue;}
    if(tx.status==='FAILED'){journal.transition(row,'failed',tx.ledger,{...JSON.parse(row.evidence_json),transaction:{hash:row.tx_hash,ledger:tx.ledger,status:tx.status},eventEvidence:'incomplete'});continue;}
    const confirmed={...row,ledger:tx.ledger};
    const found=new Map<string,NoirEvent>();let eventComplete=false;
    // SDK 0.3.0's decodeEvent requires `inSuccessfulContractCall`, a field current RPC responses omit, so
    // client.getEvents() decodes nothing. We only decode events whose txHash is this row's, and RPC has just
    // reported that transaction SUCCESS, which is exactly what the flag asserts. Still the official decoder.
    const filters=[{type:'contract' as const,contractIds:Object.values(client.contracts)}];
    try{
      let page=await client.server.getEvents({startLedger:tx.ledger,filters,limit:100});
      for(;;){
        for(const raw of page.events){
          if(raw.txHash!==row.tx_hash)continue;
          const event=decodeEvent({...raw,inSuccessfulContractCall:true} as typeof raw,client.contracts);
          if(event&&matchesEvent(event,confirmed,a))found.set(event.id,event);
        }
        if(page.events.length<100 && cursorLedger(page.cursor)>=page.latestLedger){eventComplete=true;break;}
        const previous=page.cursor;page=await client.server.getEvents({cursor:previous,filters,limit:100});
        requireCondition(page.cursor!==previous,'EVENT_PAGINATION_STALLED');
      }
    }catch{ /* Retention/network gaps do not erase transaction confirmation. */ }
    const prior=JSON.parse(row.evidence_json);
    const events=found.size ? [...found.values()] : (prior.events??[]);
    journal.transition(row,'succeeded',tx.ledger,JSON.parse(json({...prior,transaction:{hash:row.tx_hash,ledger:tx.ledger,status:tx.status,createdAt:tx.createdAt,applicationOrder:tx.applicationOrder},events,eventEvidence:events.length?'matched':eventComplete?'missing':'incomplete'})));
  }
  return journal.evidence(a);
}

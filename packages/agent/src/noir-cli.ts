import {parseArgs} from 'node:util';
import {setTimeout as sleep} from 'node:timers/promises';
import {readFileSync,existsSync} from 'node:fs';
import {createRequire} from 'node:module';
import {dirname,join,resolve} from 'node:path';
import {Networks} from '@stellar/stellar-sdk';
import {keypairSigner,NoirContractError} from '@noirx402/agent-sdk';
import {ASSET,CONTRACTS,createClient,NoirFailure,requireCondition,verifyNetwork} from './noir.js';
import {approval,json,requireFresh,requireMerchant,signApproval} from './noir-experiment.js';
import {DEFAULT_DB,Journal} from './noir-store.js';
import {executeOperation,checkExperiment,reconcile,type CommandKind} from './noir-operations.js';
import {parsePayoutRecord,runAutopilot} from './payout-decision.js';
import {jevRiskModel,JEV_MODEL} from './payout-risk.js';
const help=`Controlled Noir Testnet experiment (not payroll). No automatic wallet creation/funding.
Usage: npm run noir -- <command> [options]
  plan       --manifest path
  doctor
  approve    --manifest path --confirm digest [--db path]
  setup      --manifest path --step device|policy|fund --live --confirm digest [--db path]
  check      --manifest path [--db path]
  authorize  --manifest path --live --confirm digest [--db path]
  claim      --manifest path --live --confirm digest --pending-stroops integer [--db path]
  reconcile  --manifest path [--db path]
  evidence   --manifest path [--db path]
  assess     --manifest path --payout path [--db path]          read-only agent verdict, no signer
  autopilot  --manifest path --payout path --live --confirm digest [--every seconds] [--db path]
Autopilot = Payment Eligibility Engine (deterministic rules) + Payout Risk & Review Agent (Jev ${JEV_MODEL},
needs TYPESAFE_AI_API_KEY or AI_GATEWAY_API_KEY; unavailable => DEFER) + the same journaled Noir authorize. Jev can only defer or
escalate, never approve. SNAPP_AUTOPILOT_DISABLED=true stops new executions. Every verdict is logged.
--help: offline help. Secrets only in private role-specific inherited environments; never arguments.
Claim collects ALL merchant/token pending funds, not just this experiment's amount.
One canonical journal per experiment; no reset/replay/replacement nonce. Reconcile unknown hashes.
Default journal: ${DEFAULT_DB}
`;
function installedVersion(name:string):string {
  let dir=dirname(createRequire(import.meta.url).resolve(name));
  for(;;){
    const path=join(dir,'package.json');
    if(existsSync(path)){
      const metadata=JSON.parse(readFileSync(path,'utf8'));
      if(metadata.name===name && typeof metadata.version==='string')return metadata.version;
    }
    const parent=dirname(dir);requireCondition(parent!==dir,'PACKAGE_VERSION_UNAVAILABLE');dir=parent;
  }
}
function signerFor(secret:string){
  try{return keypairSigner(secret.trim());}catch{throw new NoirFailure("INVALID_SECRET");}
}
async function main():Promise<void>{
  let args;
  try{args=parseArgs({allowPositionals:true,strict:true,options:{help:{type:'boolean'},manifest:{type:'string'},db:{type:'string'},confirm:{type:'string'},step:{type:'string'},live:{type:'boolean'},'pending-stroops':{type:'string'},payout:{type:'string'},every:{type:'string'}}});}
  catch{throw new NoirFailure('INVALID_ARGUMENTS');}
  const {values:v,positionals}=args;
  if(v.help){requireCondition(positionals.length<=1,'INVALID_ARGUMENTS');console.log(help);return;}
  requireCondition(positionals.length===1,'COMMAND_REQUIRED');
  const command=positionals[0];
  const allowed:Record<string,string[]>={plan:['manifest'],doctor:[],approve:['manifest','db','confirm'],setup:['manifest','db','step','live','confirm'],check:['manifest','db'],authorize:['manifest','db','live','confirm'],claim:['manifest','db','live','confirm','pending-stroops'],reconcile:['manifest','db'],evidence:['manifest','db'],assess:['manifest','db','payout'],autopilot:['manifest','db','payout','live','confirm','every']};
  requireCondition(Object.hasOwn(allowed,command) && Object.keys(v).every(k=>allowed[command].includes(k)),'INVALID_ARGUMENTS');
  if(command==='doctor'){
    const client=createClient();
    const report={sdkVersion:installedVersion('@noirx402/agent-sdk'),stellarVersion:installedVersion('@stellar/stellar-sdk'),networkPassphrase:client.config.networkPassphrase,contracts:client.contracts,expectedContracts:CONTRACTS,asset:ASSET,contractsAttested:process.env.NOIR_TESTNET_CONTRACTS_CONFIRMED==='true',warning:'SDK/repository agreement is not organizer verification; earlier-form discrepancy remains unresolved absent independent attestation'};
    try{await verifyNetwork(client);}catch(error){console.log(json({...report,rpcNetworkVerified:false}));throw error;}
    console.log(json({...report,rpcNetworkVerified:true}));return;
  }
  requireCondition(v.manifest,'MANIFEST_REQUIRED');
  const invocationCwd=process.env.INIT_CWD??process.cwd();
  let input:unknown;try{input=JSON.parse(readFileSync(resolve(invocationCwd,v.manifest),'utf8'));}catch{throw new NoirFailure('MANIFEST_UNREADABLE');}
  const a=approval(input);
  if(command==='plan'){console.log(json({manifest:a.manifest,asset:ASSET,networkPassphrase:Networks.TESTNET,contracts:CONTRACTS,digest:a.digest,itemBudgetStroops:a.amounts.amount}));return;}
  const write=['setup','authorize','claim','autopilot'].includes(command);
  // Check live/digest gates before reading any role secret or contacting RPC.
  if(write)requireCondition(v.live,'LIVE_REQUIRED');
  if(write||command==='approve')requireCondition(v.confirm===a.digest,'DIGEST_MISMATCH');
  if(write)requireCondition(process.env.NOIR_TESTNET_CONTRACTS_CONFIRMED==='true','CONTRACT_ATTESTATION_REQUIRED');
  if(write||command==='approve')requireMerchant(a,process.env.ALLOWED_MERCHANT_ADDRESSES);
  if(command==='approve'||command==='setup'||command==='authorize')requireFresh(a);
  if(command==='setup')requireCondition(['device','policy','fund'].includes(v.step??''),'SETUP_STEP_REQUIRED');
  let payout;
  if(command==='assess'||command==='autopilot'){
    requireCondition(v.payout,'PAYOUT_RECORD_REQUIRED');
    let raw:unknown;try{raw=JSON.parse(readFileSync(resolve(invocationCwd,v.payout),'utf8'));}catch{throw new NoirFailure('PAYOUT_RECORD_UNREADABLE');}
    payout=parsePayoutRecord(raw);
  }
  const every=v.every===undefined?undefined:Number(v.every);
  requireCondition(every===undefined||(Number.isInteger(every)&&every>=5&&every<=3600),'INVALID_INTERVAL');
  requireCondition(v.db!==':memory:'&&!v.db?.startsWith('file:'),'PERSISTENT_JOURNAL_REQUIRED');
  const path=v.db?resolve(invocationCwd,v.db):DEFAULT_DB;
  if(['check','evidence','reconcile','assess'].includes(command))requireCondition(existsSync(path),'MISSING_JOURNAL');
  const journal=new Journal(path);
  try{
    if(command==='approve'){
      const secret=process.env.NOIR_OWNER_SECRET;requireCondition(secret,'OWNER_SECRET_REQUIRED');
      const signature=signApproval(a,secret);
      await journal.transaction(async()=>journal.saveApproval(a,signature));
      console.log(json({digest:a.digest,approved:true,chainWrite:false}));return;
    }
    if(command==='evidence'){console.log(json(journal.evidence(a)));return;}
    if(command==='reconcile'){
      // One line per operation. `evidence` prints the full record.
      const result=await reconcile(createClient(),journal,a) as {operations:{kind:string;state:string;ledger:number|null;tx_hash:string;explorer:string;evidence:{eventEvidence?:string;events?:{type:string;amount?:string}[]}}[]};
      for(const op of result.operations){
        const ev=op.evidence.events?.map(e=>e.type+(e.amount?` ${e.amount} stroops`:'')).join(', ')||`events ${op.evidence.eventEvidence??'none'}`;
        console.log(`${op.kind.padEnd(9)} ${op.state.padEnd(9)} ledger ${op.ledger??'-'}  ${ev}\n          ${op.explorer}`);
      }
      if(result.operations.length===0)console.log('no operations recorded yet');
      return;
    }
    if(command==='check'){console.log(json(await checkExperiment(createClient(),journal,a,process.env.ALLOWED_MERCHANT_ADDRESSES)));return;}
    const deps=()=>({client:createClient(),journal,risk:jevRiskModel(),env:{disabled:process.env.SNAPP_AUTOPILOT_DISABLED==='true'},allowlist:process.env.ALLOWED_MERCHANT_ADDRESSES});
    if(command==='assess'){console.log(json(await runAutopilot(deps(),a,payout!)));return;}
    journal.verify(a);
    if(command==='autopilot'){
      const secret=process.env.NOIR_AGENT_SECRET;requireCondition(secret,'AGENT_SECRET_REQUIRED');
      const execute={signer:signerFor(secret),consent:{live:true,confirm:v.confirm,attested:true,allowlist:process.env.ALLOWED_MERCHANT_ADDRESSES}};
      for(;;){
        const result=await runAutopilot(deps(),a,payout!,execute) as {decision:string};
        console.log(json({at:new Date().toISOString(),...result}));
        if(every===undefined||result.decision!=='DEFER')return;
        await sleep(every*1000);
      }
    }
    const role=command==='authorize'?'AGENT':command==='claim'?'MERCHANT':'OWNER';
    const secret=process.env[`NOIR_${role}_SECRET`];requireCondition(secret,`${role}_SECRET_REQUIRED`);
    const signer=signerFor(secret);
    const kind=(command==='setup'?v.step:command) as CommandKind;
    console.log(json(await executeOperation(createClient(),journal,a,kind,signer,{live:v.live===true,confirm:v.confirm,attested:process.env.NOIR_TESTNET_CONTRACTS_CONFIRMED==='true',allowlist:process.env.ALLOWED_MERCHANT_ADDRESSES,pendingStroops:v['pending-stroops']})));
  }finally{journal.close();}
}
try{await main();}catch(error){
  const code=error instanceof NoirFailure?error.code:error instanceof NoirContractError?`CONTRACT_REFUSAL_${error.errorName}`:'OPERATION_FAILED';
  console.error(json({error:code,...(error instanceof NoirFailure&&error.hash?{hash:error.hash}:{}),guidance:'Never replay a recorded operation. Reconcile existing hashes; inspect public configuration and local approval.'}));
  process.exitCode=1;
}

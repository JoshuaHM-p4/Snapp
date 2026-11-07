import {DatabaseSync} from 'node:sqlite';
import {mkdirSync, chmodSync, statSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {type Approval, approval, json, verifyApproval} from './noir-experiment.js';
import {requireCondition} from './noir.js';

export const DEFAULT_DB = fileURLToPath(new URL('../../../.data/noir-testnet.sqlite', import.meta.url));
export type State = 'prepared'|'unknown'|'succeeded'|'failed';
export interface OperationRow {id:string;experiment_id:string;kind:string;source:string;operation_json:string;nonce:string|null;tx_hash:string;state:State;ledger:number|null;evidence_json:string;created_at:string;updated_at:string;}
export type Decision = 'EXECUTE'|'DEFER'|'ESCALATE';
export interface DecisionRow {id:number;experiment_id:string;decision:Decision;stage:string;reason:string;input_hash:string;details_json:string;created_at:string;}
export class Journal {
  readonly db:DatabaseSync;
  readonly path:string;
  constructor(path=DEFAULT_DB) {
    requireCondition(path !== ':memory:' && !path.startsWith('file:'), 'PERSISTENT_JOURNAL_REQUIRED');
    this.path=resolve(path);
    mkdirSync(dirname(this.path),{recursive:true,mode:0o700});
    if(this.path===DEFAULT_DB)chmodSync(dirname(this.path),0o700);
    // Never chmod an arbitrary shared parent selected with --db.
    requireCondition((statSync(dirname(this.path)).mode&0o777)===0o700,'PRIVATE_JOURNAL_DIRECTORY_REQUIRED');
    this.db=new DatabaseSync(this.path);
    chmodSync(this.path,0o600);
    this.db.exec(`PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;
      CREATE TABLE IF NOT EXISTS experiments(id TEXT PRIMARY KEY,approval_json TEXT NOT NULL,digest TEXT UNIQUE NOT NULL,signature TEXT NOT NULL,created_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS operations(id TEXT PRIMARY KEY,experiment_id TEXT NOT NULL REFERENCES experiments(id),kind TEXT NOT NULL,source TEXT NOT NULL,operation_json TEXT NOT NULL,nonce TEXT,tx_hash TEXT UNIQUE NOT NULL,state TEXT NOT NULL CHECK(state IN ('prepared','unknown','succeeded','failed')),ledger INTEGER,evidence_json TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,UNIQUE(experiment_id,kind));
      CREATE TABLE IF NOT EXISTS events(id INTEGER PRIMARY KEY,operation_id TEXT NOT NULL REFERENCES operations(id),state TEXT NOT NULL,details_json TEXT NOT NULL,created_at TEXT NOT NULL);
      CREATE TRIGGER IF NOT EXISTS events_no_update BEFORE UPDATE ON events BEGIN SELECT RAISE(ABORT,'append only'); END;
      CREATE TRIGGER IF NOT EXISTS events_no_delete BEFORE DELETE ON events BEGIN SELECT RAISE(ABORT,'append only'); END;
      CREATE TABLE IF NOT EXISTS decisions(id INTEGER PRIMARY KEY,experiment_id TEXT NOT NULL REFERENCES experiments(id),decision TEXT NOT NULL CHECK(decision IN ('EXECUTE','DEFER','ESCALATE')),stage TEXT NOT NULL,reason TEXT NOT NULL,input_hash TEXT NOT NULL,details_json TEXT NOT NULL,created_at TEXT NOT NULL);
      CREATE TRIGGER IF NOT EXISTS decisions_no_update BEFORE UPDATE ON decisions BEGIN SELECT RAISE(ABORT,'append only'); END;
      CREATE TRIGGER IF NOT EXISTS decisions_no_delete BEFORE DELETE ON decisions BEGIN SELECT RAISE(ABORT,'append only'); END;`);
  }
  close():void {this.db.close();}
  async transaction<T>(fn:()=>Promise<T>):Promise<T> {
    this.db.exec('BEGIN IMMEDIATE');
    try {const result=await fn();this.db.exec('COMMIT');return result;}
    catch(error){this.db.exec('ROLLBACK');throw error;}
  }
  saveApproval(a:Approval,signature:string):void {
    verifyApproval(a,signature);
    const old=this.db.prepare('SELECT approval_json FROM experiments WHERE id=?').get(a.manifest.id);
    requireCondition(!old || old.approval_json === a.bytes,'APPROVAL_CHANGED');
    if (!old) this.db.prepare('INSERT INTO experiments VALUES(?,?,?,?,?)').run(a.manifest.id,a.bytes,a.digest,signature,new Date().toISOString());
    this.verify(a);
  }
  verify(a:Approval):Approval {
    const row=this.db.prepare('SELECT * FROM experiments WHERE id=?').get(a.manifest.id);
    requireCondition(row,'MISSING_APPROVAL');
    requireCondition(row.approval_json === a.bytes && row.digest === a.digest,'APPROVAL_CHANGED');
    const canonical=approval(a.manifest);
    requireCondition(canonical.bytes===a.bytes && canonical.digest===a.digest &&
      Object.keys(canonical.amounts).every(k=>canonical.amounts[k as keyof Approval['amounts']]===a.amounts[k as keyof Approval['amounts']]),'APPROVAL_CHANGED');
    verifyApproval(canonical,String(row.signature));return canonical;
  }
  operations(id:string):OperationRow[] {return this.db.prepare('SELECT * FROM operations WHERE experiment_id=? ORDER BY created_at,id').all(id) as unknown as OperationRow[];}
  existing(id:string,kind:string):OperationRow|undefined {return this.db.prepare('SELECT * FROM operations WHERE experiment_id=? AND kind=?').get(id,kind) as unknown as OperationRow|undefined;}
  reserveBudget(a:Approval):bigint {
    let total=0n,largest=0n,cap=a.amounts.totalBudget;
    const rows=this.db.prepare(`SELECT o.*,e.approval_json FROM operations o JOIN experiments e ON e.id=o.experiment_id WHERE o.kind='authorize'`).all();
    for(const row of rows){
      const signed=approval(JSON.parse(String(row.approval_json)).manifest);
      if(signed.manifest.deviceHash !== a.manifest.deviceHash) continue;
      // A later approval cannot raise an earlier signed device cap.
      if(signed.amounts.totalBudget < cap) cap=signed.amounts.totalBudget;
      if(row.state !== 'failed') total+=signed.amounts.amount;
      if(signed.manifest.agent === a.manifest.agent && row.nonce !== null && BigInt(String(row.nonce))>largest) largest=BigInt(String(row.nonce));
    }
    requireCondition(total+a.amounts.amount<=cap,'CUMULATIVE_BUDGET_EXCEEDED');
    const now=BigInt(Date.now());const nonce=now>largest?now:largest+1n;
    requireCondition(nonce <= (1n<<64n)-1n,'NONCE_EXHAUSTED');return nonce;
  }
  insert(a:Approval,kind:string,source:string,operation:unknown,nonce:bigint|null,hash:string,details:unknown):OperationRow {
    const id=`${a.manifest.id}:${kind}`,now=new Date().toISOString();
    this.db.prepare('INSERT INTO operations VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').run(id,a.manifest.id,kind,source,json(operation),nonce?.toString()??null,hash,'prepared',null,json(details),now,now);
    this.db.prepare('INSERT INTO events(operation_id,state,details_json,created_at) VALUES(?,?,?,?)').run(id,'prepared',json(details),now);
    return this.existing(a.manifest.id,kind)!;
  }
  transition(row:OperationRow,state:State,ledger:number|null,details:unknown):void {
    let evidence=json(details);
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const current=this.existing(row.experiment_id,row.kind)!;
      // Confirmed results never regress on a later RPC retention gap.
      if((current.state==='succeeded'||current.state==='failed') && state!==current.state){this.db.exec('COMMIT');return;}
      const retained=JSON.parse(current.evidence_json);
      const incoming=JSON.parse(evidence);
      if(retained.events?.length){
        const events=new Map<string,unknown>();
        for(const event of [...retained.events,...(incoming.events??[])])events.set(event.id,event);
        evidence=json({...retained,...incoming,events:[...events.values()],eventEvidence:'matched'});
      }
      if(current.state!==state || current.ledger!==ledger || current.evidence_json!==evidence){
        const now=new Date().toISOString();
        this.db.prepare('UPDATE operations SET state=?,ledger=?,evidence_json=?,updated_at=? WHERE id=?').run(state,ledger,evidence,now,row.id);
        this.db.prepare('INSERT INTO events(operation_id,state,details_json,created_at) VALUES(?,?,?,?)').run(row.id,state,evidence,now);
      }
      this.db.exec('COMMIT');
    } catch(error){this.db.exec('ROLLBACK');throw error;}
  }
  logDecision(experimentId:string,entry:{decision:Decision;stage:string;reason:string;inputHash:string;details:unknown}):void {
    this.db.prepare('INSERT INTO decisions(experiment_id,decision,stage,reason,input_hash,details_json,created_at) VALUES(?,?,?,?,?,?,?)').run(experimentId,entry.decision,entry.stage,entry.reason,entry.inputHash,json(entry.details),new Date().toISOString());
  }
  lastDecision(experimentId:string):DecisionRow|undefined {
    return this.db.prepare('SELECT * FROM decisions WHERE experiment_id=? ORDER BY id DESC LIMIT 1').get(experimentId) as unknown as DecisionRow|undefined;
  }
  decisions(experimentId:string):DecisionRow[] {
    return this.db.prepare('SELECT * FROM decisions WHERE experiment_id=? ORDER BY id').all(experimentId) as unknown as DecisionRow[];
  }
  evidence(a:Approval):unknown {
    this.verify(a);
    // Parsed fields only; the raw *_json columns would duplicate every value in the output.
    const decisions=this.decisions(a.manifest.id).map(({details_json,...row})=>({...row,details:JSON.parse(details_json)}));
    const operations=this.operations(a.manifest.id).map(({operation_json,evidence_json,...row})=>({...row,operation:JSON.parse(operation_json),evidence:JSON.parse(evidence_json),explorer:`https://stellar.expert/explorer/testnet/tx/${row.tx_hash}`,transactionConfirmed:row.state==='succeeded',
      transitions:(this.db.prepare('SELECT state,created_at FROM events WHERE operation_id=? ORDER BY id').all(row.id) as {state:string;created_at:string}[]).map(t=>`${t.created_at} ${t.state}`)}));
    return {digest:a.digest,scope:'controlled-testnet-experiment; not payroll settlement',decisions,operations};
  }
}

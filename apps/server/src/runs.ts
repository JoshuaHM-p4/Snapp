import {DatabaseSync} from 'node:sqlite';
import {mkdirSync, readdirSync, readFileSync, existsSync} from 'node:fs';
import path from 'node:path';
import {Keypair} from '@stellar/stellar-sdk';
import type {NoirEvidence} from '@agentpay/shared';
import {dataDir} from './data-dir.js';

/**
 * Read model of the operator's Noir journal. The operator pushes `npm run noir -- evidence` output here
 * (admin token); the server never signs anything with it. Roles are derived from the manifest addresses
 * inside each approval, which is what the owner signed.
 */
export interface RunManifest {id:string;owner:string;agent:string;merchant:string;amountXlm:string;expiresAt:string;deviceHash:string}
export interface RunSummary {id:string;manifest:RunManifest;digest:string;operations:NoirEvidence['operations'];decisions:NoirEvidence['decisions'];uploadedAt:string}
export type Role='owner'|'developer'|'client'|'visitor';

export class RunStore {
  readonly db:DatabaseSync;
  constructor(file=path.join(dataDir(),'runs.sqlite')) {
    mkdirSync(path.dirname(file),{recursive:true,mode:0o700});
    this.db=new DatabaseSync(file);
    this.db.exec(`PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;
      CREATE TABLE IF NOT EXISTS runs(id TEXT PRIMARY KEY,digest TEXT NOT NULL,manifest_json TEXT NOT NULL,evidence_json TEXT NOT NULL,uploaded_at TEXT NOT NULL);`);
  }
  close():void {this.db.close();}
  /** Accept an `evidence` export. The manifest is recovered from the approval bytes the owner signed. */
  upsert(evidence:unknown,seed=false):RunSummary {
    const e=evidence as {digest?:unknown;approval?:{manifest?:unknown}|string;operations?:unknown;decisions?:unknown;manifest?:unknown};
    if(!e||typeof e.digest!=='string'||!/^[a-f0-9]{64}$/.test(e.digest))throw new Error('INVALID_EVIDENCE');
    const m=(e.manifest??(typeof e.approval==='object'?e.approval?.manifest:undefined)) as Partial<RunManifest>|undefined;
    if(!m||typeof m.id!=='string'||![m.owner,m.agent,m.merchant].every(k=>typeof k==='string'&&Keypair.fromPublicKey(k as string)))throw new Error('INVALID_EVIDENCE');
    const manifest:RunManifest={id:m.id,owner:m.owner!,agent:m.agent!,merchant:m.merchant!,amountXlm:String(m.amountXlm??''),expiresAt:String(m.expiresAt??''),deviceHash:String(m.deviceHash??'')};
    const now=new Date().toISOString();
    // A seed never overwrites an operator upload made since boot; an upload always wins.
    if(seed&&this.get(manifest.id))return this.get(manifest.id)!;
    this.db.prepare('INSERT INTO runs VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET digest=excluded.digest,manifest_json=excluded.manifest_json,evidence_json=excluded.evidence_json,uploaded_at=excluded.uploaded_at')
      .run(manifest.id,e.digest,JSON.stringify(manifest),JSON.stringify({operations:e.operations??[],decisions:e.decisions??[]}),now);
    return this.get(manifest.id)!;
  }
  get(id:string):RunSummary|undefined {
    const row=this.db.prepare('SELECT * FROM runs WHERE id=?').get(id) as Record<string,string>|undefined;
    return row?toSummary(row):undefined;
  }
  /**
   * Load committed evidence files (data/runs/*.json) so roles survive redeploys on hosts without a disk.
   * Files are public data exported by `npm run noir -- evidence`; a newer upload with the same id wins.
   */
  seedFromDir(dir:string):string[] {
    if(!existsSync(dir))return [];
    const loaded:string[]=[];
    for(const f of readdirSync(dir).filter(f=>f.endsWith('.json')).sort()){
      try{const run=this.upsert(JSON.parse(readFileSync(path.join(dir,f),'utf8')),true);loaded.push(run.id);}
      catch(e){console.warn(`runs seed: skipped ${f}:`,e instanceof Error?e.message:e);}
    }
    return loaded;
  }
  list():RunSummary[] {return (this.db.prepare('SELECT * FROM runs ORDER BY uploaded_at DESC').all() as Record<string,string>[]).map(toSummary);}
  /** Role of a signed-in address: owner or merchant of any uploaded run. Clients are resolved from collections by the caller. */
  roleFor(address:string):Exclude<Role,'client'|'visitor'>|null {
    for(const run of this.list()){
      if(run.manifest.owner===address)return 'owner';
      if(run.manifest.merchant===address)return 'developer';
    }
    return null;
  }
  /** Runs the address may see: owners see their runs, developers see runs that pay them. */
  visibleTo(address:string,role:Role):RunSummary[] {
    return this.list().filter(r=>role==='owner'?r.manifest.owner===address:role==='developer'?r.manifest.merchant===address:false);
  }
}
function toSummary(row:Record<string,string>):RunSummary {
  const ev=JSON.parse(row.evidence_json) as {operations:NoirEvidence['operations'];decisions:NoirEvidence['decisions']};
  return {id:row.id,digest:row.digest,manifest:JSON.parse(row.manifest_json),operations:ev.operations,decisions:ev.decisions,uploadedAt:row.uploaded_at};
}

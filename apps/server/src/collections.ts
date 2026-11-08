import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import path from 'node:path';
import {dataDir} from './data-dir.js';
import type {PaymentIntent, PaymentIntentStatus} from '@carts1024/velo-sdk';
import type {Collection} from '@agentpay/shared';
import type {VerifiedVeloEvent} from './payments.js';

const TERMINAL:PaymentIntentStatus[]=['paid','failed','expired','cancelled'];
export class CollectionStore {
  readonly db:DatabaseSync;
  constructor(file=path.join(dataDir(),'collections.sqlite')) {
    mkdirSync(path.dirname(file),{recursive:true,mode:0o700});
    this.db=new DatabaseSync(file);
    this.db.exec(`PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;
      CREATE TABLE IF NOT EXISTS collections(payment_intent_id TEXT PRIMARY KEY,project_id TEXT NOT NULL,amount_xlm TEXT NOT NULL,asset TEXT NOT NULL,status TEXT NOT NULL,checkout_url TEXT,tx_hash TEXT,payer_address TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS velo_events(id TEXT PRIMARY KEY,type TEXT NOT NULL,payment_intent_id TEXT,received_at TEXT NOT NULL);`);
    this.ensurePayerColumn();
  }
  close():void {this.db.close();}
  private ensurePayerColumn():void {
    const cols=(this.db.prepare('PRAGMA table_info(collections)').all() as {name:string}[]).map(x=>x.name);
    if(!cols.includes('payer_address'))this.db.exec('ALTER TABLE collections ADD COLUMN payer_address TEXT');
  }
  recordCheckout(projectId:string,intent:PaymentIntent):Collection {
    const now=new Date().toISOString();
    this.db.prepare('INSERT INTO collections VALUES(?,?,?,?,?,?,?,?,?,?)').run(intent.paymentIntentId??intent.id,projectId,intent.amount,intent.asset,intent.status,intent.checkoutUrl,null,intent.payerAddress??null,now,now);
    return this.get(intent.paymentIntentId??intent.id)!;
  }
  /** True the first time an event id is seen. Velo retries deliveries; a replay must not re-run reconciliation. */
  recordEvent(event:VerifiedVeloEvent):boolean {
    const intentId=event.paymentIntent?.id??null;
    const result=this.db.prepare('INSERT OR IGNORE INTO velo_events VALUES(?,?,?,?)').run(event.id,event.type,intentId,new Date().toISOString());
    return result.changes===1;
  }
  /**
   * Apply the status Velo's API reports for an intent we created. Only retrieved intents count: webhook
   * bodies and success-URL redirects are never the source of truth for status. The retrieved intent has
   * no transaction hash, so that comes from the signature-verified event. A terminal status never regresses.
   */
  reconcile(intent:PaymentIntent,txHash?:string):Collection|null {
    const id=intent.paymentIntentId??intent.id;
    const current=this.get(id);
    if(!current)return null;
    if(TERMINAL.includes(current.status)&&current.status!==intent.status)return current;
    this.db.prepare('UPDATE collections SET status=?,tx_hash=?,payer_address=?,updated_at=? WHERE payment_intent_id=?').run(intent.status,txHash??current.txHash,intent.payerAddress??current.payerAddress,new Date().toISOString(),id);
    return this.get(id)!;
  }
  get(id:string):Collection|undefined {
    const row=this.db.prepare('SELECT * FROM collections WHERE payment_intent_id=?').get(id);
    return row?toCollection(row):undefined;
  }
  list():Collection[] {return this.db.prepare('SELECT * FROM collections ORDER BY created_at DESC').all().map(toCollection);}
}
function toCollection(row:Record<string,unknown>):Collection {
  return {paymentIntentId:String(row.payment_intent_id),projectId:String(row.project_id),amountXlm:String(row.amount_xlm),asset:String(row.asset),status:row.status as PaymentIntentStatus,checkoutUrl:row.checkout_url as string|null,txHash:row.tx_hash as string|null,payerAddress:(row.payer_address as string|null)??null,createdAt:String(row.created_at),updatedAt:String(row.updated_at)};
}

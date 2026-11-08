export type MilestoneStatus = 'planned' | 'submitted' | 'approved' | 'disputed' | 'paid';
export interface Milestone {id:string;title:string;assignee:string;merchantAddress:string|null;dueDate:string;status:MilestoneStatus;acceptanceCriteria:string[];evidence:{type:'pr'|'deployment'|'test'|'manual';url:string;passed:boolean}[];testnetAmountXlm:string;paymentHash?:string;}
export interface Project {id:string;title:string;clientName:string;status:'draft'|'active'|'complete';clientAmountPhp:number;developerBudgetPhp:number;milestones:Milestone[];}
export interface AgentDecision { milestoneId:string;action:'pay'|'hold'|'human_review';reason:string;merchantAddress:string|null;amountXlm:string;}
export interface InvoiceCheckoutRequest {projectId:string; amountXlm:string;}
/** A client collection recorded by the server through Velo (GET /api/collections). Status is whatever Velo last reported; never employee pay or invoice settlement. */
export type CollectionStatus = 'awaiting_route'|'created'|'pending'|'paid'|'failed'|'expired'|'cancelled';
export interface Collection {paymentIntentId:string;projectId:string;amountXlm:string;asset:string;status:CollectionStatus;checkoutUrl:string|null;txHash:string|null;payerAddress:string|null;createdAt:string;updatedAt:string;}
/** Autopilot verdict row from the Noir journal (CLI `evidence`; snapshot at apps/web/public/evidence). */
export type AutopilotDecision = 'EXECUTE'|'DEFER'|'ESCALATE';
export interface AutopilotDecisionRecord {id:number;experiment_id:string;decision:AutopilotDecision;stage:string;reason:string;input_hash:string;created_at:string;details:{model?:string;route?:string;probabilities?:Record<string,number>;concernProbability?:number;thresholds?:Record<string,number>;payoutDate?:string}}
export interface NoirOperationRecord {id:string;experiment_id:string;kind:'device'|'policy'|'fund'|'authorize'|'claim';source:string;state:'prepared'|'unknown'|'succeeded'|'failed';ledger:number|null;tx_hash:string;explorer:string;transactionConfirmed:boolean;created_at:string;updated_at:string;evidence:{eventEvidence?:string;events?:{type:string;ledger:number;txHash:string;amount?:string;merchant?:string;deviceHash?:string}[];transaction?:{hash:string;ledger:number;status:string}}}
export interface NoirManifest {id:string;purpose:string;owner:string;agent:string;merchant:string;deviceHash:string;amountXlm:string;maxPaymentXlm:string;totalBudgetXlm:string;fundingXlm:string;expiresAt:string}
export interface NoirEvidence {digest:string;scope:string;manifest:NoirManifest;decisions:AutopilotDecisionRecord[];operations:NoirOperationRecord[]}
/** Wallet session as returned by GET /api/me. `visitor` means signed in but not part of any uploaded run. */
export type SessionRole = 'owner'|'developer'|'client'|'visitor';
export interface Session {address:string;role:SessionRole;expiresAt:string}
/** A run the signed-in address may see (owner of it, or paid by it). Derived from the uploaded evidence. */
export interface RunView {id:string;digest:string;manifest:Pick<NoirManifest,'id'|'owner'|'agent'|'merchant'|'amountXlm'|'expiresAt'|'deviceHash'>;operations:NoirOperationRecord[];decisions:AutopilotDecisionRecord[];uploadedAt:string}

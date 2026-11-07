// Writes a fresh Noir manifest and three payout records (accepted / revisions / dispute) into .data/.
// Usage: node scripts/demo-files.mjs <id> <ownerPub> <agentPub> <merchantPub>
// Public keys only. Secrets stay in the role shells. Prints the files written and nothing else.
import {createHash} from 'node:crypto';
import {mkdirSync, writeFileSync, chmodSync, existsSync} from 'node:fs';
const [id, owner, agent, merchant] = process.argv.slice(2);
if (!id || !owner || !agent || !merchant) { console.error('usage: node scripts/demo-files.mjs <id> <ownerPub> <agentPub> <merchantPub>'); process.exit(1); }
for (const k of [owner, agent, merchant]) if (!/^G[A-Z2-7]{55}$/.test(k)) { console.error('not a Stellar public key:', k.slice(0, 6)); process.exit(1); }
mkdirSync('.data', {recursive: true, mode: 0o700}); chmodSync('.data', 0o700);
const expiresAt = new Date(Date.now() + 14 * 86400e3).toISOString().replace(/\.\d{3}Z$/, 'Z');
const manifest = {id, purpose: 'controlled-testnet-experiment', owner, agent, merchant,
  deviceHash: createHash('sha256').update(`snapp-demo-device-${id}`).digest('hex'),
  amountXlm: '1.5', maxPaymentXlm: '2', totalBudgetXlm: '2', fundingXlm: '5', expiresAt};
const milestone = {id: 'm-01', title: 'UI implementation', assignee: 'Demo developer A', merchantAddress: merchant, dueDate: '2026-11-06',
  status: 'approved', acceptanceCriteria: ['Responsive layouts', 'Reviewed pull request'],
  evidence: [{type: 'pr', url: 'https://example.org/pull/1', passed: true}], testnetAmountXlm: '1.5'};
const reviews = {
  accepted: {clientFeedback: 'Looks great, everything works on mobile too. Accepted, thank you!', evidenceSummary: 'PR #1 merged after review; staging preview deployed.', revisionSummary: 'No revisions requested.'},
  revisions: {clientFeedback: 'Mostly good, but the header still overlaps the menu on tablets. Can you fix that before we sign off?', evidenceSummary: 'PR #1 merged; tablet layout issue reported after deployment.', revisionSummary: 'One open revision: tablet header overlap.'},
  dispute: {clientFeedback: 'This is not what we agreed. Two pages are missing and I was told the work was done. I am not approving this.', evidenceSummary: 'PR #1 marked passed by developer; client says pages missing.', revisionSummary: 'Client contests completion; contradiction with evidence.'},
};
// Never overwrite: the manifest carries a time-based expiry, so rewriting it would change the digest
// the owner already signed. Delete the files by hand if you really want a new manifest.
const write = (name, data) => { const p = `.data/${name}`; if (existsSync(p)) { console.log(`${p} (kept, already exists)`); return; } writeFileSync(p, JSON.stringify(data, null, 2) + '\n'); chmodSync(p, 0o600); console.log(p); };
write(`${id}.manifest.json`, manifest);
for (const [name, review] of Object.entries(reviews)) write(`${id}.payout-${name}.json`, {milestone, payoutDate: '2026-11-06T00:00:00Z', review});

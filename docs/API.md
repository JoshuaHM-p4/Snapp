# API specification — current starter

Base local: `http://localhost:4000`. Routes tagged **implemented** are present in code; features listed as future should not be assumed functional.

| Method | Path | Behavior | Auth |
|---|---|---|---|
| GET | `/api/health` | `{ok,network,demoMode}` | No |
| GET | `/api/projects` | Fictional project samples; **public demo only** | No |
| GET | `/api/agent/preview/:projectId` | Pure deterministic hold/review/pay decision; **no payment** | No |
| POST | `/api/payments/checkout` | Creates Velo Testnet checkout when `DEMO_MODE=false`; `{projectId, amountXlm}` | `Bearer ADMIN_API_TOKEN` |
| GET | `/api/me` | Current wallet session `{session, authEnabled}`; `session` is null when signed out | cookie |
| GET | `/api/auth/challenge?account=G…` | SEP-10 challenge transaction signed by the server's funds-less auth key (5 min) | none |
| POST | `/api/auth/verify` | `{transaction}`: wallet-signed challenge → session cookie; role derived from uploaded runs and collections | none |
| POST | `/api/auth/logout` | Clears the session cookie | cookie |
| GET | `/api/runs` | Runs visible to the signed-in address (owner: runs it approved; developer: runs paying it) | session: owner or developer |
| PUT | `/api/runs` | Operator uploads `npm run noir -- evidence` JSON (public data) so roles and views can be derived; never signs | `Bearer ADMIN_API_TOKEN` |
| GET | `/api/collections` | Client collections this server created through Velo (`Collection[]` type in `packages/shared`), with the status Velo last reported and the transaction hash from the verified event | none (fictional demo data) |
| POST | `/api/collections/:id/reconcile` | Operator re-check for a missed or unreachable webhook: same `paymentIntents.retrieve` path, only for intents this server created; idempotent | `Bearer ADMIN_API_TOKEN` |
| POST | `/api/webhooks/velo` | Raw-body HMAC verification, dedupe on `event.id` (SQLite), then `paymentIntents.retrieve` to set the collection status; a redelivery is a no-op, an unknown or unverifiable event never changes state | Velo signature |

## Current limitations (important)
- HTTP routes remain a **fictional milestone preview and separate Velo collection demonstration**, not a cutoff/run API. A preview's `pay` decision is not boss approval of a payroll run or compensation advice; shared eligibility and already-submitted `paymentHash` checks remain unchanged.
- `POST /api/milestones/:projectId/:milestoneId/approve` has been **removed and returns 404**. There is no replacement HTTP Noir payout, setup or claim route. An admin bearer token is not employee-scoped access or durable owner consent.
- Noir execution is isolated in the local CLI, not JSON fixture mutation or HTTP requests. Exact owner-signed single-item consent and SQLite cumulative-device reservations do not provide authenticated cutoff approval, recipient onboarding or multiuser payroll safety.
- The local merchant signer must separately collect pending funds with `claim`; authorization is not a confirmed claim, bank transfer or PHP wage payment.
- Velo collections: checkout creation records the intent in `.data/collections.sqlite`; webhooks are verified on the raw body, deduped on `event.id`, and status is taken only from `paymentIntents.retrieve`, never from the webhook body or the success redirect. Terminal statuses never regress. A collection becoming `paid` is a client collection record only; it does not mark a Proyekto invoice, fund Noir escrow or release employee pay. Exercised locally with self-signed events (valid/replay/tampered/missing) and against a real Velo Testnet project: checkout created, paid on-chain ([tx](https://stellar.expert/explorer/testnet/tx/fe05762287ed2aaf7b87cc42f2bbbe749a0e09d52ba28463f4d04bba82d44045)), `paid` confirmed via retrieve. Live webhook delivery still needs the public server URL.
- Client PHP invoice values are independent from selected XLM Testnet checkout amount. Velo collection does not fund Noir escrow or employee bank payouts.
- No Proyekto import/link, bank export/API, cutoff hours review, employee statements/discrepancy access, immutable run approval or recipient-level run reconciliation contract is implemented.

## Required future contracts — capabilities, not finalized routes
Design these separately from the existing routes; no new endpoint names or payloads are promised here:
- Organization/role-scoped source references or imports from Proyekto, with provenance and captured versions; retain Proyekto as the project/task/docs/progress/roadmap/Gantt/invoice system.
- Cutoffs for **1–15** and **16–end-of-month**, hours per employee/project, explicit boss hour review and auditable agreement/rate/adjustment inputs.
- Versioned deliverable evidence and client evaluations: comments, revision requests, acceptance identity/time/version. Milestones group evidence, not default payroll payment units; no invented objective ratings.
- Employee-specific statements explaining reviewed hours, rates, adjustments and totals, plus a discrepancy channel. Enforce employee access to their own compensation only.
- Owner approval/release of an immutable run revision binding each exact recipient, amount, currency/asset and item identity. Any change invalidates that approval and requires reapproval.
- Approved-item-only execution with transactional deduplication and cumulative run reservations, recipient verification/allowlisting, durable submission identity and per-item reconciliation (including partial failure and unknown outcomes). Never blindly retry an uncertain transfer.
- Bank-file export only for a chosen corporate bank's verified supported format and approval workflow; API capability must be verified before design commits. No bank UI/OTP automation or promise of one OTP.
- Any future authenticated web Noir flow must retain separate owner setup/consent, constrained agent authorization and merchant claim. The existing local single-item experiment is not such an API. Noir policy supplies neither a merchant allowlist nor a cumulative cutoff cap.

Client acceptance or client invoice payment must not automatically gate hours-based employee pay. Compensation follows applicable agreements/legal obligations; fixed-fee milestone contracting is a distinct basis. See [software target](SOFTWARE.md) and [integration limits and sources](INTEGRATIONS.md). The removed milestone approval route must not be restored as a shortcut to these contracts.

## Controlled local Noir tooling — not HTTP
Run `npm run noir -- <command>` from the repository. Supported commands: `plan`, `doctor`, `approve`, `setup --step device|policy|fund`, `check`, `authorize`, `claim`, `reconcile`, `evidence`; exact flags and separate role-shell instructions are in [SETUP](../SETUP.md).

- Fixed native-XLM Testnet configuration and official Noir SDK 0.3.0 calls only; no custom contracts or Mainnet. Installed Stellar SDK 16.0.1 handles signing/transaction inspection.
- `approve` signs the exact normalized manifest/configuration digest locally. Live setup/authorize/claim require `--live`, exact digest confirmation, valid local consent, independent contract attestation, verified merchant allowlist and the appropriate privately inherited role secret. No secrets in arguments, chat, browser or server `.env`.
- Repository-root `.data/noir-testnet.sqlite` serializes validation/reservations and persists transaction hash/nonce before broadcast. `--db` explicitly selects a journal; no deduplication across copies/deletion. Prepared/unknown/succeeded authorization reservations count against the cumulative-device budget. Recorded operations have no retry/reset, including failed ones.
- `check` reads pending merchant stroops even after expiry. `claim --pending-stroops` confirms the positive aggregate to collect **all** merchant/token pending funds; it is not one claim per item. Collection of already-authorized funds and reconciliation remain available after approval expiry.
- `reconcile` looks up recorded hashes without signing/sending; `evidence` emits local JSON distinguishing recorded identities, confirmed transactions and matching authorization/claim events, with genuine Testnet explorer URLs. Missing event evidence remains incomplete.
- Exercised checks cover installed SDK/source agreement, 20 focused tests, real-SDK synthetic-transport persistence/timeout-restart behavior, actual CLI consent/evidence/gates and read-only Testnet `doctor` (`contractsAttested:false`). **Live authorization/claim remains unverified.** SDK/repository agreement does not resolve the earlier form-ID discrepancy; independent organizer/deployment verification is still required.

## Example local commands
```bash
curl -s http://localhost:4000/api/health
curl -s http://localhost:4000/api/projects
curl -s http://localhost:4000/api/agent/preview/web-001
```

### Optional Testnet checkout — operational example only, not payroll
After credential/network/SDK setup, the existing checkout contract accepts JSON `{ "projectId": "web-001", "amountXlm": "2.5" }` with `Authorization: Bearer ADMIN_API_TOKEN` at `POST /api/payments/checkout`. No payment-execution command is provided here.

Before treating any optional collection as confirmed, persist `paymentIntentId`, verify the raw signed webhook, retrieve final state and deduplicate durable events. Those reconciliation steps are requirements, not currently completed server behavior. Current upstream Velo remains [Testnet only without settlement or an external provider](https://github.com/Velo-Ecosystem-Collection/Velo/blob/main/packages/velo-sdk/README.md#release-scope).

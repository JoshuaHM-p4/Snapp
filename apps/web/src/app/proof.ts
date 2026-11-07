/**
 * Recorded Stellar Testnet evidence, copied verbatim from README.md "Testnet proof"
 * (Nov 6, 2026). These are real, RPC-confirmed transactions; nothing here is
 * fictional. Do not add placeholder hashes to this file: a proof slot holds only
 * real transaction links (SNAPP_BRAND.md §11).
 */
export type ProofStep = {
  step: string;
  detail: string;
  signer: "owner" | "agent" | "merchant" | "client";
  ledger: number;
  hash: string;
  stage: "Prepare" | "Snap" | "Settle" | "Collect";
};

export const explorerTx = (hash: string) =>
  `https://stellar.expert/explorer/testnet/tx/${hash}`;

export const noirProof: ProofStep[] = [
  {
    step: "registerDevice",
    detail: "Owner registers the signing device",
    signer: "owner",
    ledger: 5589778,
    hash: "94ca07a78a952786bee142cdac68fdb26f409a1422e04a6108e03f17e2539a72",
    stage: "Prepare",
  },
  {
    step: "registerAgent",
    detail: "Policy: cap 2 XLM, native asset, expires 2026-11-20",
    signer: "owner",
    ledger: 5589783,
    hash: "5b0f759a9b61cd96791df95821900f22c93fec4ed3e796ab3bf314c52c0a6eb1",
    stage: "Prepare",
  },
  {
    step: "fundEscrow",
    detail: "Owner funds escrow with 5 XLM",
    signer: "owner",
    ledger: 5589790,
    hash: "eceed372739dc3c81e7bd395374bff33c1d2f3a12b9d5ec90a138ba504da033f",
    stage: "Prepare",
  },
  {
    step: "authorize",
    detail: "1.5 XLM to merchant. Eligibility passed; Jev routine P=1.00, concern 0.03 → EXECUTE",
    signer: "agent",
    ledger: 5589865,
    hash: "9271346277a3a9b69763ba00af1405fe6f5a72f9965847aa7b40c6735b275c5d",
    stage: "Snap",
  },
  {
    step: "claim",
    detail: "Merchant claims aggregate 15,000,000 stroops",
    signer: "merchant",
    ledger: 5589949,
    hash: "e2bdbb00816474d5174cea16ea7993422318fd69a534828f7587f479c5ba2bb4",
    stage: "Settle",
  },
];

export const veloProof: ProofStep = {
  step: "Velo checkout",
  detail: "Client pays 0.5 XLM through a checkout this server created; Velo reported paid. Separate from payroll.",
  signer: "client",
  ledger: 0,
  hash: "fe05762287ed2aaf7b87cc42f2bbbe749a0e09d52ba28463f4d04bba82d44045",
  stage: "Collect",
};

export const proofRoles = {
  owner: "GCGBYAA7…UKCBX",
  agent: "GAOBNDIG…5X6T",
  merchant: "GBXQJACH…VKE6",
  device: "b616f1cc…7185",
} as const;

export const repoUrl = "https://github.com/JoshuaHM-p4/Snapp";

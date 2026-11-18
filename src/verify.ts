import { createPublicClient, http, isAddressEqual, recoverMessageAddress, type Address, type Hex } from "viem";
import { OSTRAK, RECEIPTS_ABI } from "./constants.ts";
import { verifyProof } from "./merkle.ts";
import { hashDocument, leafOf, type ReceiptV1 } from "./receipt.ts";

/** What GET https://ostrak.one/v1/receipts/:id returns. */
export type ReceiptBundle = {
  object: "receipt";
  receipt: ReceiptV1;
  receipt_hash: Hex;
  signature: Hex | null;
  signer: Address | null;
  seal: null | {
    status: "sealed" | "pending";
    root: Hex;
    window: { from: number; to: number };
    leaf_index: number | null;
    proof: Hex[] | null;
    chain_id: number;
    contract: Address;
    tx_hash: Hex | null;
    tx_url: string | null;
  };
};

export type Check = { name: string; ok: boolean; detail: string };

export async function fetchReceipt(id: string, api: string = OSTRAK.api): Promise<ReceiptBundle> {
  const res = await fetch(`${api}/v1/receipts/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(`receipt ${id}: HTTP ${res.status}`);
  return (await res.json()) as ReceiptBundle;
}

/**
 * Checks a receipt without trusting Ostrak's server:
 * 1. the hash is recomputed from the published fields,
 * 2. the signature recovers to Ostrak's known signer (not the one the bundle claims),
 * 3. the Merkle proof leads from the receipt to the root,
 * 4. the root is stored in the receipts contract on chain.
 * Pass `onChain: false` to skip step 4 (offline).
 */
export async function verifyReceipt(
  bundle: ReceiptBundle,
  opts: { signer?: Address; rpcUrl?: string; contract?: Address; onChain?: boolean } = {},
): Promise<Check[]> {
  const checks: Check[] = [];
  const expectedSigner = opts.signer ?? OSTRAK.signer;

  const hash = hashDocument(bundle.receipt);
  checks.push({ name: "hash", ok: hash === bundle.receipt_hash, detail: hash });

  if (bundle.signature) {
    const recovered = await recoverMessageAddress({ message: { raw: hash }, signature: bundle.signature });
    checks.push({ name: "signature", ok: isAddressEqual(recovered, expectedSigner), detail: `signed by ${recovered}` });
  } else {
    checks.push({ name: "signature", ok: false, detail: "no signature in the bundle" });
  }

  const seal = bundle.seal;
  if (!seal || !seal.proof) {
    checks.push({ name: "merkle proof", ok: false, detail: "not sealed yet: receipts are sealed once a day" });
    return checks;
  }
  const inTree = verifyProof(leafOf(hash), seal.proof, seal.root);
  checks.push({ name: "merkle proof", ok: inTree, detail: `root ${seal.root}` });

  if (opts.onChain === false) return checks;
  const chain = OSTRAK.chains[seal.chain_id as keyof typeof OSTRAK.chains];
  const contract = opts.contract ?? chain?.receipts;
  const rpcUrl = opts.rpcUrl ?? chain?.rpc;
  if (!contract || !rpcUrl) {
    checks.push({ name: "on chain", ok: false, detail: `unknown chain ${seal.chain_id}` });
    return checks;
  }
  if (!isAddressEqual(contract, seal.contract)) {
    checks.push({ name: "on chain", ok: false, detail: `bundle names contract ${seal.contract}, expected ${contract}` });
    return checks;
  }
  const client = createPublicClient({ transport: http(rpcUrl) });
  let sealed: readonly [bigint, bigint, number, bigint];
  try {
    sealed = await client.readContract({ address: contract, abi: RECEIPTS_ABI, functionName: "seals", args: [seal.root] });
  } catch (e) {
    const reason = e instanceof Error ? (e as { shortMessage?: string }).shortMessage ?? e.message : String(e);
    checks.push({ name: "on chain", ok: false, detail: `could not read ${rpcUrl}: ${reason} Try another RPC with --rpc <url>.` });
    return checks;
  }
  const [fromTs, toTs, count, sealedAt] = sealed;
  const ok = sealedAt > 0n;
  const at = ok ? new Date(Number(sealedAt) * 1000).toISOString() : "";
  checks.push({
    name: "on chain",
    ok,
    detail: ok ? `sealed ${at}, ${count} leaves, window ${fromTs}–${toTs}` : `root not found in ${contract}`,
  });
  return checks;
}

#!/usr/bin/env node
// Usage: node bin/verify.ts <receipt id> [--rpc <url>] [--offline]
import { fetchReceipt, verifyReceipt } from "../src/index.ts";

const args = process.argv.slice(2);
const id = args.find((a) => !a.startsWith("--") && args[args.indexOf(a) - 1] !== "--rpc");
if (!id) {
  console.error("Usage: node bin/verify.ts <receipt id> [--rpc <url>] [--offline]");
  process.exit(2);
}
const rpcIndex = args.indexOf("--rpc");
const rpcUrl = rpcIndex >= 0 ? args[rpcIndex + 1] : undefined;

const bundle = await fetchReceipt(id);
const r = bundle.receipt;
console.log(`Receipt ${r.receipt_id}`);
console.log(`  ${r.model} · ${r.input_tokens} in / ${r.output_tokens} out · cost ${r.cost_micro} µUSD + fee ${r.fee_micro} µUSD · ${new Date(r.timestamp).toISOString()}`);

const checks = await verifyReceipt(bundle, { rpcUrl, onChain: !args.includes("--offline") });
for (const c of checks) console.log(`  ${c.ok ? "✓" : "✗"} ${c.name.padEnd(13)} ${c.detail}`);
if (bundle.seal?.tx_url) console.log(`  tx ${bundle.seal.tx_url}`);
process.exit(checks.every((c) => c.ok) ? 0 : 1);

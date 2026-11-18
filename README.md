# ostrak-proofs

Check what an AI agent spent through [Ostrak](https://ostrak.one) without trusting Ostrak.

Ostrak is a wallet for AI agents: one prepaid balance for every AI model an agent uses, spending limits the agent can't change, and a signed receipt for every call. Once a day, the receipts are sealed on Robinhood Chain as a Merkle root.

This repo has everything you need to verify those receipts yourself:

- `src/` is the receipt format, the Merkle tree and a verifier (TypeScript, one dependency: [viem](https://viem.sh)).
- `bin/verify.ts` is a command-line verifier.
- `contracts/` is `OstrakReceipts`, the contract that stores the daily roots.
- `examples/` shows how to call the Ostrak API with curl and the OpenAI SDKs.

## Verify a receipt

Requires Node.js 23.6 or later (it runs TypeScript directly).

```sh
git clone --recurse-submodules https://github.com/dev-ostrak/Ostrak && cd Ostrak
npm install
node bin/verify.ts <receipt id>
```

```
Receipt 1965ae58-d5cc-4e74-8017-cfc35617094c
  openai/gpt-6-luna · 16 in / 45 out · cost 25 µUSD + fee 139 µUSD · 2026-11-17T16:29:28.781Z
  ✓ hash          0x957cabde5f2d8112c2d5ddd9286797dfea358a596ac497a69032e279b1914acf
  ✓ signature     signed by 0x6fFAFDa12da2832C29Db551170B046D39927e7bd
  ✓ merkle proof  root 0xb4c6c291d043c8e04bb8b5a9b865ef81d34fe62addf294eddba3a66ea1ebd360
  ✓ on chain      sealed 2026-11-18T00:10:48.000Z, 2 leaves, window 1794873600–1794960000
```

Options: `--rpc <url>` uses your own Robinhood Chain RPC (the public one is rate-limited), and `--offline` skips the on-chain step.

You can also paste a receipt id at [ostrak.one/verify](https://ostrak.one/verify), which runs the same checks in your browser.

## How a receipt is proven

A receipt holds totals only, never prompts or replies:

```json
{
  "type": "ostrak.receipt.v1",
  "receipt_id": "1965ae58-d5cc-4e74-8017-cfc35617094c",
  "agent_id": "c8615a77-b4ca-4e3b-aaaa-dafca94a80a8",
  "timestamp": 1794932968781,
  "model": "openai/gpt-6-luna",
  "input_tokens": 16,
  "output_tokens": 45,
  "cost_micro": 25,
  "fee_micro": 139,
  "status": "ok"
}
```

Money is in micro-USD (1 USD = 1,000,000). `cost_micro` is what the model provider charged and `fee_micro` is Ostrak's fee.

The verifier makes four checks. Each one depends only on public data:

1. **Hash.** `hash = keccak256(canonical JSON)`. Canonical JSON means keys sorted, no whitespace, integers only. Change any field and the hash changes.
2. **Signature.** Ostrak signs `hash` with EIP-191 (`personal_sign` over the 32 raw bytes). The verifier recovers the signer and compares it with Ostrak's published signer address, not with the address the server sends.
3. **Merkle proof.** `leaf = keccak256(hash)`. The tree uses sorted pairs (`keccak256(min ‖ max)`, compatible with OpenZeppelin `MerkleProof`), and a lone node at the end of a level moves up unchanged. Daily statements (one per agent per day) are leaves in the same tree.
4. **On chain.** The root must be stored in `OstrakReceipts.seals(root)` on Robinhood Chain, with the time it was sealed.

Get a receipt's bundle (receipt, signature, proof, root, transaction) from `GET https://ostrak.one/v1/receipts/:id`.

## Addresses

| What | Network | Address |
| --- | --- | --- |
| Receipt signer (also contract owner) | Robinhood Chain (4663) | `0x6fFAFDa12da2832C29Db551170B046D39927e7bd` |
| `OstrakReceipts` ([source verified](https://repo.sourcify.dev/4663/0x54A4904f45E7665FB53BD062d0479C773Afc0C1A)) | Robinhood Chain (4663) | [`0x54A4904f45E7665FB53BD062d0479C773Afc0C1A`](https://robinhoodchain.blockscout.com/address/0x54A4904f45E7665FB53BD062d0479C773Afc0C1A) |
| ERC-8004 identity registry (agent identities) | Robinhood Chain (4663) | `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` |

## Use it as a library

```ts
import { fetchReceipt, verifyReceipt } from "./src/index.ts";

const bundle = await fetchReceipt("1965ae58-d5cc-4e74-8017-cfc35617094c");
const checks = await verifyReceipt(bundle, { rpcUrl: process.env.RPC_URL });
console.log(checks.every((c) => c.ok) ? "verified" : checks);
```

`canonicalJson`, `hashDocument`, `leafOf`, `buildLevels`, `proofFor` and `verifyProof` are exported too.

## Contracts

`OstrakReceipts` stores one root per sealing window. Only the owner can write, there is no upgrade path, and it holds no funds.

```sh
cd contracts
forge install   # pulls forge-std
forge test
```

## Tests

```sh
npm test          # receipt format, Merkle tree, and a real mainnet receipt checked offline
npm run typecheck
```

## Security

Found a problem with the receipt format, the verifier or the contract? Please don't open a public issue. Send a direct message to [@ostrakone](https://x.com/ostrakone) on X first.

## License

MIT

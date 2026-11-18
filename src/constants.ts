import type { Address } from "viem";

/** Public facts about Ostrak's deployment. Check them against ostrak.one/verify and the explorer. */
export const OSTRAK = {
  api: "https://ostrak.one",
  /** Signs every receipt (EIP-191 over the receipt hash) and owns the receipts contract. */
  signer: "0x6fFAFDa12da2832C29Db551170B046D39927e7bd" as Address,
  chains: {
    4663: {
      name: "Robinhood Chain",
      rpc: "https://rpc.mainnet.chain.robinhood.com",
      explorer: "https://robinhoodchain.blockscout.com",
      receipts: "0x54A4904f45E7665FB53BD062d0479C773Afc0C1A" as Address,
      erc8004IdentityRegistry: "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432" as Address,
    },
  },
} as const;

export const RECEIPTS_ABI = [
  {
    type: "function",
    name: "seals",
    stateMutability: "view",
    inputs: [{ name: "root", type: "bytes32" }],
    outputs: [
      { name: "fromTs", type: "uint64" },
      { name: "toTs", type: "uint64" },
      { name: "count", type: "uint32" },
      { name: "sealedAt", type: "uint64" },
    ],
  },
  { type: "function", name: "isSealed", stateMutability: "view", inputs: [{ name: "root", type: "bytes32" }], outputs: [{ type: "bool" }] },
  { type: "function", name: "owner", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
] as const;

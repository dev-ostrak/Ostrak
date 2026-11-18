import { keccak256, toBytes, type Hex } from "viem";

/*
 * Canonical Ostrak documents. A receipt holds totals only: never prompts, replies or payees.
 *
 * Encoding: JSON with keys sorted by UTF-16 code unit, no whitespace, integers as numbers, text as strings.
 * hash = keccak256(utf8(json)). Merkle leaf = keccak256(hash). Ostrak signs `hash` with EIP-191.
 */

/** One model call. Money is in micro-USD (1 USD = 1,000,000). */
export type ReceiptV1 = {
  type: "ostrak.receipt.v1";
  receipt_id: string;
  agent_id: string;
  /** Unix milliseconds. */
  timestamp: number;
  model: string;
  input_tokens: number;
  output_tokens: number;
  /** What the model provider charged, micro-USD. */
  cost_micro: number;
  /** Ostrak's fee (markup + routing fee), micro-USD. */
  fee_micro: number;
  status: "ok" | "error" | "cancelled";
};

/** One agent's totals for one UTC day. Sealed in the same tree as receipts. */
export type StatementV1 = {
  type: "ostrak.statement.v1";
  agent_id: string;
  /** UTC day, YYYY-MM-DD. */
  day: string;
  spent_micro: number;
  requests: number;
  refused: number;
  days_active: number;
};

export type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

export function canonicalJson(value: Json): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    const keys = Object.keys(value).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(value[k])}`).join(",")}}`;
  }
  if (typeof value === "number" && !Number.isSafeInteger(value)) throw new Error("canonical JSON allows integers only");
  return JSON.stringify(value);
}

/** keccak256 of the canonical JSON. */
export const hashDocument = (doc: ReceiptV1 | StatementV1): Hex => keccak256(toBytes(canonicalJson(doc as unknown as Json)));

/** Merkle leaf for a document hash. Hashing twice keeps leaves distinct from inner nodes. */
export const leafOf = (hash: Hex): Hex => keccak256(hash);

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { keccak256, toHex, type Hex } from "viem";
import { buildLevels, canonicalJson, hashDocument, leafOf, proofFor, rootOf, verifyProof, verifyReceipt, type ReceiptBundle } from "../src/index.ts";

const fixture = JSON.parse(readFileSync(new URL("./fixtures/receipt.json", import.meta.url), "utf8")) as ReceiptBundle;

test("canonical JSON sorts keys and drops whitespace", () => {
  assert.equal(canonicalJson({ b: 1, a: [2, { d: "x", c: null }] }), '{"a":[2,{"c":null,"d":"x"}],"b":1}');
});

test("canonical JSON refuses non-integers", () => {
  assert.throws(() => canonicalJson({ a: 1.5 }));
});

test("every leaf proves into the root, for any tree size", () => {
  for (const size of [1, 2, 3, 5, 8, 13]) {
    const leaves = Array.from({ length: size }, (_, i) => keccak256(toHex(i)));
    const levels = buildLevels(leaves);
    const root = rootOf(levels);
    leaves.forEach((leaf, i) => assert.ok(verifyProof(leaf, proofFor(levels, i), root), `size ${size}, leaf ${i}`));
    assert.equal(verifyProof(keccak256(toHex("not in the tree")), proofFor(levels, 0), root), false);
  }
});

test("a real mainnet receipt verifies offline", async () => {
  const checks = await verifyReceipt(fixture, { onChain: false });
  assert.deepEqual(
    checks.map((c) => [c.name, c.ok]),
    [
      ["hash", true],
      ["signature", true],
      ["merkle proof", true],
    ],
  );
});

test("changing any field breaks the hash", async () => {
  const tampered: ReceiptBundle = { ...fixture, receipt: { ...fixture.receipt, fee_micro: fixture.receipt.fee_micro - 1 } };
  const [hash, signature, proof] = await verifyReceipt(tampered, { onChain: false });
  assert.equal(hash.ok, false);
  assert.equal(signature.ok, false);
  assert.equal(proof.ok, false);
});

test("a signature from any other key is rejected", async () => {
  const checks = await verifyReceipt(fixture, { onChain: false, signer: "0x000000000000000000000000000000000000dEaD" });
  assert.equal(checks.find((c) => c.name === "signature")?.ok, false);
});

test("the leaf is the hash hashed again", () => {
  const hash = hashDocument(fixture.receipt);
  assert.equal(leafOf(hash), keccak256(hash as Hex));
});

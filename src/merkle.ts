import { concat, keccak256, type Hex } from "viem";

/*
 * Binary Merkle tree with sorted pairs (compatible with OpenZeppelin MerkleProof):
 * parent = keccak256(min(a, b) ‖ max(a, b)). A lone node at the end of a level moves up unchanged.
 */

const hashPair = (a: Hex, b: Hex): Hex => (a.toLowerCase() < b.toLowerCase() ? keccak256(concat([a, b])) : keccak256(concat([b, a])));

/** Every level, leaves first, root last. */
export function buildLevels(leaves: Hex[]): Hex[][] {
  if (leaves.length === 0) throw new Error("no leaves");
  const levels: Hex[][] = [leaves];
  while (levels.at(-1)!.length > 1) {
    const prev = levels.at(-1)!;
    const next: Hex[] = [];
    for (let i = 0; i < prev.length; i += 2) next.push(i + 1 < prev.length ? hashPair(prev[i], prev[i + 1]) : prev[i]);
    levels.push(next);
  }
  return levels;
}

export const rootOf = (levels: Hex[][]): Hex => levels.at(-1)![0];

export function proofFor(levels: Hex[][], index: number): Hex[] {
  if (index < 0 || index >= levels[0].length) throw new Error("leaf index out of range");
  const proof: Hex[] = [];
  let i = index;
  for (let l = 0; l < levels.length - 1; l++) {
    const sibling = i % 2 === 0 ? i + 1 : i - 1;
    if (sibling < levels[l].length) proof.push(levels[l][sibling]);
    i = Math.floor(i / 2);
  }
  return proof;
}

export function verifyProof(leaf: Hex, proof: Hex[], root: Hex): boolean {
  let node = leaf;
  for (const sibling of proof) node = hashPair(node, sibling);
  return node.toLowerCase() === root.toLowerCase();
}

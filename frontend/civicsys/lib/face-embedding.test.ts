import { describe, it, expect } from "vitest";
import { embedFace, faceCommitment } from "./face-embedding";

describe("face-embedding", () => {
  it("genera 384 floats deterministas", async () => {
    const a = await embedFace(new Uint8Array([1, 2, 3]));
    const b = await embedFace(new Uint8Array([1, 2, 3]));
    expect(a).toHaveLength(384);
    expect(a).toEqual(b);
  });

  it("imágenes distintas -> embeddings distintos", async () => {
    const a = await embedFace(new Uint8Array([1, 2, 3]));
    const b = await embedFace(new Uint8Array([9, 9, 9]));
    expect(a).not.toEqual(b);
  });

  it("faceCommitment es un bytes32 hex", async () => {
    const e = await embedFace(new Uint8Array([1, 2, 3]));
    const c = faceCommitment(e, "salt-demo");
    expect(c).toMatch(/^0x[0-9a-f]{64}$/);
  });
});

import elliptic from "elliptic";
import crypto from "crypto";
import fs from "fs";
import dotenv from "dotenv";
import BN from "bn.js"; // Import BN for BigNumber arithmetic

dotenv.config();

const ec = new elliptic.ec("secp256k1");
const keyPair = ec.genKeyPair();
const publicKey = keyPair.getPublic();
const privateKey = keyPair.getPrivate();
const generator = ec.g; // Base generator point

// Encrypt Vote Function using ElGamal
export function encryptVote(vote) {
  const r = ec.genKeyPair().getPrivate(); // Generate random value
  const C1 = publicKey.mul(r); // C1 = g^r
  const C2 = generator.mul(new BN(vote)).add(C1.mul(privateKey)); // C2 = g^vote * pk^r

  return {
    C1: C1.encode("hex"),
    C2: C2.encode("hex"),
  };
}

// Homomorphic Addition (Summing Encrypted Votes)
export function homomorphicAdd(encryptedVotes) {
  let sumC1 = ec.curve.point(null, null);
  let sumC2 = ec.curve.point(null, null);

  for (const vote of encryptedVotes) {
    const C1 = ec.curve.decodePoint(vote.C1, "hex");
    const C2 = ec.curve.decodePoint(vote.C2, "hex");

    if (sumC1.isInfinity()) {
      sumC1 = C1;
      sumC2 = C2;
    } else {
      sumC1 = sumC1.add(C1);
      sumC2 = sumC2.add(C2);
    }
  }

  if (sumC1.isInfinity() || sumC2.isInfinity()) {
    console.log("No valid votes found in homomorphic addition.");
    return { C1: "0", C2: "0" }; // Prevent decryption errors
  }

  console.log("Homomorphic Sum Debug:");
  console.log("Final C1:", sumC1.encode("hex"));
  console.log("Final C2:", sumC2.encode("hex"));

  return { C1: sumC1.encode("hex"), C2: sumC2.encode("hex") };
}

// Decrypt Function (Only for Final Count)
export function decryptTotal(encryptedSum) {
  const C1 = ec.curve.decodePoint(encryptedSum.C1, "hex");
  const C2 = ec.curve.decodePoint(encryptedSum.C2, "hex");
  const decryptedPoint = C2.add(C1.mul(privateKey.neg()));

  console.log("Decryption Debugging: Comparing Points...");
  console.log("Generator:", generator.encode("hex"));
  console.log("Raw Decrypted Point:", decryptedPoint.encode("hex"));

  // Attempt scaling the decrypted point to recover vote count
  const adjustedDecryptedPoint = decryptedPoint.mul(generator.invm(ec.n));
  console.log("Adjusted Decryption Point:", adjustedDecryptedPoint.encode("hex"));

  let sumVotes = new BN(0);
  let testPoint = generator;

  for (let i = 0; i < 1000; i++) {
    if (testPoint.eq(adjustedDecryptedPoint)) {
      console.log("Decryption successful! Total Votes:", sumVotes.toString());
      return sumVotes.toNumber();
    }
    testPoint = testPoint.add(generator);
    sumVotes = sumVotes.add(new BN(1));
  }

  console.log("Error: Decryption failed, exceeded max iterations.");
  return 0;
}

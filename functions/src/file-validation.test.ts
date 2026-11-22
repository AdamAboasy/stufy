import assert from "node:assert/strict";
import test from "node:test";
import { hasExpectedSignature } from "./file-validation.js";

function emptyZip(names: string[]): Buffer {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let localOffset = 0;
  for (const filename of names) {
    const name = Buffer.from(filename, "utf8");
    const local = Buffer.alloc(30 + name.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(name.length, 26);
    name.copy(local, 30);
    localParts.push(local);

    const central = Buffer.alloc(46 + name.length);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(localOffset, 42);
    name.copy(central, 46);
    centralParts.push(central);
    localOffset += local.length;
  }
  const localData = Buffer.concat(localParts);
  const centralData = Buffer.concat(centralParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(names.length, 8);
  eocd.writeUInt16LE(names.length, 10);
  eocd.writeUInt32LE(centralData.length, 12);
  eocd.writeUInt32LE(localData.length, 16);
  return Buffer.concat([localData, centralData, eocd]);
}

test("accepts supported basic content signatures", () => {
  assert.equal(hasExpectedSignature(Buffer.from("%PDF-1.7"), "application/pdf"), true);
  assert.equal(hasExpectedSignature(Buffer.from([0xff, 0xd8, 0xff, 0x00]), "image/jpeg"), true);
  assert.equal(hasExpectedSignature(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), "image/png"), true);
  assert.equal(hasExpectedSignature(Buffer.from("RIFF0000WEBP"), "image/webp"), true);
});

test("accepts legacy DOC only with the Compound File Binary signature", () => {
  const ole = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0x00]);
  assert.equal(hasExpectedSignature(ole, "application/msword"), true);
  assert.equal(hasExpectedSignature(Buffer.from("PK\u0003\u0004"), "application/msword"), false);
});

test("accepts DOCX only when its ZIP contains the required Word package entries", () => {
  const mime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  assert.equal(hasExpectedSignature(emptyZip(["[Content_Types].xml", "word/document.xml"]), mime), true);
  assert.equal(hasExpectedSignature(emptyZip(["[Content_Types].xml", "word/styles.xml"]), mime), false);
  assert.equal(hasExpectedSignature(Buffer.from("PK\u0003\u0004 spoofed"), mime), false);
});

test("rejects mismatched MIME and content", () => {
  assert.equal(hasExpectedSignature(Buffer.from("%PDF-1.7"), "image/jpeg"), false);
  assert.equal(hasExpectedSignature(Buffer.alloc(0), "application/unknown"), false);
});

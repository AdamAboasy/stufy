export function zipHasEntry(bytes: Buffer, expected: string): boolean {
  const minimum = Math.max(0, bytes.length - 65_557);
  let endOffset = -1;
  for (let offset = bytes.length - 22; offset >= minimum; offset -= 1) {
    if (bytes.readUInt32LE(offset) === 0x06054b50) { endOffset = offset; break; }
  }
  if (endOffset < 0) return false;
  const entryCount = bytes.readUInt16LE(endOffset + 10);
  let offset = bytes.readUInt32LE(endOffset + 16);
  for (let index = 0; index < entryCount; index += 1) {
    if (offset + 46 > bytes.length || bytes.readUInt32LE(offset) !== 0x02014b50) return false;
    const nameLength = bytes.readUInt16LE(offset + 28);
    const extraLength = bytes.readUInt16LE(offset + 30);
    const commentLength = bytes.readUInt16LE(offset + 32);
    if (offset + 46 + nameLength + extraLength + commentLength > bytes.length) return false;
    const name = bytes.subarray(offset + 46, offset + 46 + nameLength).toString("utf8");
    if (name === expected) return true;
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return false;
}

export function hasExpectedSignature(bytes: Buffer, contentType: string): boolean {
  if (contentType === "application/pdf") return bytes.subarray(0, 5).toString("ascii") === "%PDF-";
  if (contentType === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (contentType === "image/png") return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (contentType === "image/webp") return bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP";
  if (contentType === "application/msword") return bytes.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]));
  if (contentType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    return bytes.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]))
      && zipHasEntry(bytes, "[Content_Types].xml")
      && zipHasEntry(bytes, "word/document.xml");
  }
  return false;
}

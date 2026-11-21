"use strict";

const signatures = [
  {
    type: "pdf",
    mime: "application/pdf",
    match: (buf) => buf.subarray(0, 5).toString("ascii") === "%PDF-",
  },
  {
    type: "png",
    mime: "image/png",
    match: (buf) =>
      buf.length >= 8 &&
      buf[0] === 0x89 &&
      buf[1] === 0x50 &&
      buf[2] === 0x4e &&
      buf[3] === 0x47,
  },
  {
    type: "jpg",
    mime: "image/jpeg",
    match: (buf) => buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff,
  },
  {
    type: "webp",
    mime: "image/webp",
    match: (buf) =>
      buf.subarray(0, 4).toString("ascii") === "RIFF" &&
      buf.subarray(8, 12).toString("ascii") === "WEBP",
  },
  {
    type: "doc",
    mime: "application/msword",
    match: (buf) =>
      buf.length >= 8 &&
      buf[0] === 0xd0 &&
      buf[1] === 0xcf &&
      buf[2] === 0x11 &&
      buf[3] === 0xe0,
  },
];

function detectFile(buffer, filename) {
  for (const sig of signatures) {
    if (sig.match(buffer)) {
      return { type: sig.type, mime: sig.mime };
    }
  }

  if (buffer.subarray(0, 2).toString("ascii") === "PK") {
    const asText = buffer.toString("utf8", 0, Math.min(buffer.length, 8000));
    if (asText.includes("word/") || asText.includes("[Content_Types].xml")) {
      return {
        type: "docx",
        mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      };
    }
  }

  const ext = filename.split(".").pop()?.toLowerCase();
  const err = new Error(`Unsupported or spoofed file type${ext ? ` (.${ext})` : ""}.`);
  err.code = "UNSUPPORTED_FILE";
  throw err;
}

module.exports = { detectFile };

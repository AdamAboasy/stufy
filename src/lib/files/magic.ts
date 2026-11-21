import type { SupportedFileType } from "@/types";

const signatures: Array<{
  type: SupportedFileType;
  mime: string;
  match: (buf: Buffer) => boolean;
}> = [
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

export function detectFile(buffer: Buffer, filename: string) {
  for (const sig of signatures) {
    if (sig.match(buffer)) {
      return { type: sig.type, mime: sig.mime };
    }
  }

  if (buffer.subarray(0, 2).toString("ascii") === "PK") {
    const asText = buffer.toString("utf8", 0, Math.min(buffer.length, 8000));
    if (asText.includes("word/") || asText.includes("[Content_Types].xml")) {
      return {
        type: "docx" as const,
        mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      };
    }
  }

  const ext = filename.split(".").pop()?.toLowerCase();
  throw Object.assign(
    new Error(`Unsupported or spoofed file type${ext ? ` (.${ext})` : ""}.`),
    { code: "UNSUPPORTED_FILE" },
  );
}

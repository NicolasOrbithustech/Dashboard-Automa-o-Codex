const CRLF = Buffer.from("\r\n");
const HEADER_END = Buffer.from("\r\n\r\n");

function boundaryFrom(contentType) {
  const match = String(contentType || "").match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  return match?.[1] || match?.[2] || "";
}

async function rawBody(req, limitBytes) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    const piece = Buffer.from(chunk);
    total += piece.length;
    if (total > limitBytes) throw new Error("Arquivo grande demais.");
    chunks.push(piece);
  }
  return Buffer.concat(chunks);
}

function headerValue(headers, name) {
  return headers
    .split(/\r\n/)
    .find((line) => line.toLowerCase().startsWith(`${name.toLowerCase()}:`))
    ?.split(":")
    .slice(1)
    .join(":")
    .trim() || "";
}

function dispositionParam(disposition, name) {
  const match = disposition.match(new RegExp(`${name}="([^"]*)"`, "i"));
  return match?.[1] || "";
}

export async function parseMultipartFile(req, { limitBytes = 8 * 1024 * 1024 } = {}) {
  const boundary = boundaryFrom(req.headers["content-type"]);
  if (!boundary) throw new Error("Requisicao sem multipart boundary.");

  const body = await rawBody(req, limitBytes + 1024 * 1024);
  const marker = Buffer.from(`--${boundary}`);
  let offset = body.indexOf(marker);

  while (offset !== -1) {
    let start = offset + marker.length;
    if (body.slice(start, start + 2).toString() === "--") break;
    if (body.slice(start, start + 2).equals(CRLF)) start += 2;

    const headerEnd = body.indexOf(HEADER_END, start);
    if (headerEnd === -1) break;

    const headers = body.slice(start, headerEnd).toString("utf8");
    const next = body.indexOf(marker, headerEnd + HEADER_END.length);
    if (next === -1) break;

    let bodyEnd = next;
    if (body.slice(bodyEnd - 2, bodyEnd).equals(CRLF)) bodyEnd -= 2;
    const partBody = body.slice(headerEnd + HEADER_END.length, bodyEnd);

    const disposition = headerValue(headers, "content-disposition");
    const filename = dispositionParam(disposition, "filename");
    if (filename) {
      return {
        filename,
        fieldName: dispositionParam(disposition, "name"),
        contentType: headerValue(headers, "content-type") || "application/octet-stream",
        buffer: partBody
      };
    }

    offset = next;
  }

  throw new Error("Nenhum arquivo JPG/PNG encontrado no formulario.");
}

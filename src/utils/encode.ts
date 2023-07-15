export const decodeBase64Url = (str: string): Uint8Array => {
  return decodeBase64(str.replace(/_|-/g, (m) => ({ _: '/', '-': '+' }[m] ?? m)))
}

export const encodeBase64Url = (buf: ArrayBufferLike): string =>
  encodeBase64(buf).replace(/\/|\+/g, (m) => ({ '/': '_', '+': '-' }[m] ?? m))

export const encodeBase64 = (buf: ArrayBufferLike): string => {
  const buffer = Buffer.from(buf);
  return buffer.toString('base64');
}

export const decodeBase64 = (str: string): Uint8Array => {
  const buffer = Buffer.from(str, 'base64');
  return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
}

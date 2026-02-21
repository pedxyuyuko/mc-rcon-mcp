export const PACKET_TYPE = {
  AUTH: 3,
  AUTH_RESPONSE: 2,
  EXEC_COMMAND: 2,
  RESPONSE_VALUE: 0,
} as const;

export interface Packet {
  id: number;
  type: number;
  payload: string;
}

export function encodePacket(id: number, type: number, payload: string): Buffer {
  const payloadBuffer = Buffer.from(payload, "utf8");
  const packetLength = 4 + 4 + payloadBuffer.length + 2;
  const buffer = Buffer.alloc(4 + packetLength);

  buffer.writeInt32LE(packetLength, 0);
  buffer.writeInt32LE(id, 4);
  buffer.writeInt32LE(type, 8);
  payloadBuffer.copy(buffer, 12);
  buffer.writeUInt16LE(0, 12 + payloadBuffer.length);

  return buffer;
}

export function decodePacket(buffer: Buffer): Packet | null {
  if (buffer.length < 12) return null;

  const packetLength = buffer.readInt32LE(0);
  if (buffer.length < 4 + packetLength) return null;

  const id = buffer.readInt32LE(4);
  const type = buffer.readInt32LE(8);
  const payloadEnd = 12 + packetLength - 2;
  const payload = buffer.toString("utf8", 12, payloadEnd);

  return { id, type, payload };
}

export function isAuthResponse(packet: Packet): boolean {
  return packet.type === PACKET_TYPE.AUTH_RESPONSE;
}

export function isResponseValue(packet: Packet): boolean {
  return packet.type === PACKET_TYPE.RESPONSE_VALUE;
}

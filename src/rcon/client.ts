import net from "node:net";
import {
  encodePacket,
  decodePacket,
  PACKET_TYPE,
  isAuthResponse,
  isResponseValue,
} from "./protocol.js";

export class RconClient {
  private socket: net.Socket | null = null;
  private requestId = 0;
  private authenticated = false;
  private responseBuffer = Buffer.alloc(0);
  private responseCallbacks = new Map<
    number,
    { resolve: (value: string) => void; reject: (reason: Error) => void }
  >();

  private host: string;
  private port: number;
  private password: string;
  private timeout: number;

  constructor(
    host: string,
    port: number,
    password: string,
    timeout: number = 5000
  ) {
    this.host = host;
    this.port = port;
    this.password = password;
    this.timeout = timeout;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = net.createConnection({
        host: this.host,
        port: this.port,
      });

      this.socket.setTimeout(this.timeout);

      this.socket.on("connect", () => {
        this.authenticate()
          .then(() => {
            this.authenticated = true;
            resolve();
          })
          .catch(reject);
      });

      this.socket.on("data", (data) => {
        this.handleData(data);
      });

      this.socket.on("error", (err) => {
        reject(err);
      });

      this.socket.on("close", () => {
        this.authenticated = false;
      });

      this.socket.on("timeout", () => {
        this.disconnect();
        reject(new Error("Connection timeout"));
      });
    });
  }

  private async authenticate(): Promise<void> {
    const id = ++this.requestId;
    const packet = encodePacket(id, PACKET_TYPE.AUTH, this.password);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Authentication timeout"));
      }, this.timeout);

      this.responseCallbacks.set(id, {
        resolve: (response: string) => {
          clearTimeout(timeout);
          resolve();
        },
        reject,
      });

      this.socket!.write(packet);
    });
  }

  private handleData(data: Buffer): void {
    this.responseBuffer = Buffer.concat([this.responseBuffer, data]);

    while (true) {
      if (this.responseBuffer.length < 4) break;
      
      const packetLength = this.responseBuffer.readInt32LE(0);
      const totalLength = 4 + packetLength;
      
      if (this.responseBuffer.length < totalLength) break;

      const packet = decodePacket(this.responseBuffer);
      if (!packet) break;

      this.responseBuffer = this.responseBuffer.slice(totalLength);

      const callback = this.responseCallbacks.get(packet.id);
      if (callback) {
        if (isAuthResponse(packet)) {
          callback.resolve(packet.payload);
        } else if (isResponseValue(packet)) {
          callback.resolve(packet.payload);
        }
        this.responseCallbacks.delete(packet.id);
      }
    }
  }

  async send(command: string): Promise<string> {
    if (!this.socket || !this.authenticated) {
      throw new Error("Not connected to RCON server");
    }

    const id = ++this.requestId;
    const packet = encodePacket(id, PACKET_TYPE.EXEC_COMMAND, command);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.responseCallbacks.delete(id);
        reject(new Error("Command timeout"));
      }, this.timeout);

      this.responseCallbacks.set(id, {
        resolve: (response: string) => {
          clearTimeout(timeout);
          resolve(response);
        },
        reject,
      });

      this.socket!.write(packet);
    });
  }

  async disconnect(): Promise<void> {
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
      this.authenticated = false;
    }
  }

  isConnected(): boolean {
    return this.authenticated && this.socket !== null;
  }
}

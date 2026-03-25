import { Client, LocalAuth } from "whatsapp-web.js";
import { executablePath } from "puppeteer";

export type WAStatus = "disconnected" | "connecting" | "ready";

// Module-level singletons — persist across API requests in the same process
let _client: Client | null = null;
let _qr: string | null = null;
let _status: WAStatus = "disconnected";
let _lastError: string | null = null;

export function getWAStatus(): WAStatus { return _status; }
export function getWAQR(): string | null { return _qr; }
export function getWAClient(): Client | null { return _client; }
export function getWAError(): string | null { return _lastError; }

export function initWA(): void {
  if (_client) return; // already initializing / ready

  _status = "connecting";
  _qr = null;
  _lastError = null;

  _client = new Client({
    authStrategy: new LocalAuth({
      dataPath:
        process.env.NODE_ENV === "production" ? "/data/.wwebjs_auth" : ".wwebjs_auth",
    }),
    puppeteer: {
      headless: true,
      executablePath: executablePath(),
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    },
  });

  _client.on("qr", (qr: string) => {
    console.log("[WA] QR received");
    _qr = qr;
  });

  _client.on("ready", () => {
    console.log("[WA] Ready");
    _status = "ready";
    _qr = null;
  });

  _client.on("auth_failure", (msg: string) => {
    console.error("[WA] Auth failure:", msg);
    _lastError = msg;
    _status = "disconnected";
    _client = null;
    _qr = null;
  });

  _client.on("disconnected", (reason: string) => {
    console.log("[WA] Disconnected:", reason);
    _status = "disconnected";
    _client = null;
    _qr = null;
  });

  _client.initialize().catch((err: Error) => {
    console.error("[WA] Initialize error:", err.message);
    _lastError = err.message;
    _status = "disconnected";
    _client = null;
  });
}

export async function destroyWA(): Promise<void> {
  if (_client) {
    try { await _client.destroy(); } catch {}
    _client = null;
  }
  _status = "disconnected";
  _qr = null;
  _lastError = null;
}

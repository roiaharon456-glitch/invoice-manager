import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getWAStatus, getWAQR, getWAError, initWA, destroyWA } from "@/lib/whatsapp";
import QRCode from "qrcode";

// GET — returns current status and QR code (as base64 PNG)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const status = getWAStatus();
  const qrString = getWAQR();

  let qrImage: string | null = null;
  if (qrString) {
    qrImage = await QRCode.toDataURL(qrString, { width: 256, margin: 2 });
  }

  return NextResponse.json({ status, qrImage, error: getWAError() });
}

// POST — initiate connection or disconnect
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { action } = await request.json().catch(() => ({ action: "connect" }));

  if (action === "disconnect") {
    await destroyWA();
    return NextResponse.json({ status: "disconnected" });
  }

  // action === "connect"
  initWA();
  return NextResponse.json({ status: getWAStatus() });
}

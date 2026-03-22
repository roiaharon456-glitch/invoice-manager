import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getWAClient, getWAStatus } from "@/lib/whatsapp";
import { getDriveClient } from "@/lib/gmail";
import { isInvoiceOrSalary } from "@/lib/gmail";
import { prisma } from "@/lib/prisma";

async function getOrCreateFolder(drive: any, folderName: string): Promise<string> {
  const res = await drive.files.list({
    q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id, name)",
  });
  if (res.data.files?.length > 0) return res.data.files[0].id;
  const folder = await drive.files.create({
    requestBody: { name: folderName, mimeType: "application/vnd.google-apps.folder" },
    fields: "id",
  });
  return folder.data.id;
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const waClient = getWAClient();
  if (!waClient || getWAStatus() !== "ready") {
    return NextResponse.json({ error: "WhatsApp not connected" }, { status: 400 });
  }

  // We still need Google Drive to store files
  const account = await prisma.account.findFirst({
    where: { userId: session.user.id, provider: "google" },
  });
  if (!account?.access_token) {
    return NextResponse.json({ error: "No Google access token" }, { status: 401 });
  }

  const drive = await getDriveClient(account.access_token, account.refresh_token ?? undefined);
  const folderId = await getOrCreateFolder(drive, "Invoice Manager");

  const chats = await waClient.getChats();
  let synced = 0;

  for (const chat of chats) {
    // Fetch last 50 messages per chat
    const messages = await chat.fetchMessages({ limit: 50 });

    for (const msg of messages) {
      // Only messages with media that could be PDFs
      if (!msg.hasMedia) continue;

      const media = await msg.downloadMedia().catch(() => null);
      if (!media) continue;

      const isPDF = media.mimetype === "application/pdf";
      if (!isPDF) continue;

      const filename = media.filename || `whatsapp_${msg.id._serialized}.pdf`;
      const subject = msg.body || "";
      const senderContact = await msg.getContact().catch(() => null);
      const sender = senderContact?.pushname || senderContact?.number || chat.name || "";

      // Determine type
      const docType = isInvoiceOrSalary(filename, subject);
      if (!docType) continue;

      // Check if already synced
      const existing = await prisma.document.findFirst({
        where: { gmailMsgId: msg.id._serialized, userId: session.user.id },
      });
      if (existing) continue;

      // Upload to Drive
      const { Readable } = require("stream");
      const buffer = Buffer.from(media.data, "base64");
      const stream = Readable.from(buffer);

      const driveFile = await drive.files.create({
        requestBody: { name: filename, parents: [folderId] },
        media: { mimeType: "application/pdf", body: stream },
        fields: "id, webViewLink",
      });

      const date = new Date(msg.timestamp * 1000);

      await prisma.document.create({
        data: {
          userId: session.user.id,
          filename,
          type: docType,
          source: "whatsapp",
          date,
          driveFileId: driveFile.data.id!,
          driveUrl: driveFile.data.webViewLink!,
          gmailMsgId: msg.id._serialized,
          emailSubject: subject,
          emailSender: sender,
        },
      });

      synced++;
    }
  }

  return NextResponse.json({ synced });
}

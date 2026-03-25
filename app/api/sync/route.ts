import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getGmailClient, getDriveClient, isInvoiceOrSalary } from "@/lib/gmail";
import { prisma } from "@/lib/prisma";

async function getOrCreateFolder(drive: any, folderName: string): Promise<string> {
  const res = await drive.files.list({
    q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id, name)",
  });
  if (res.data.files && res.data.files.length > 0) {
    return res.data.files[0].id;
  }
  const folder = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
    },
    fields: "id",
  });
  return folder.data.id;
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const account = await prisma.account.findFirst({
    where: { userId: session.user.id, provider: "google" },
  });

  if (!account?.access_token) {
    return NextResponse.json({ error: "No access token" }, { status: 401 });
  }

  const gmail = await getGmailClient(account.access_token, account.refresh_token ?? undefined);
  const drive = await getDriveClient(account.access_token, account.refresh_token ?? undefined);

  const folderId = await getOrCreateFolder(drive, "Invoice Manager");

  // Collect ALL matching messages via pagination (Gmail max 500 per page)
  const allMessages: { id: string }[] = [];
  let pageToken: string | undefined = undefined;

  do {
    const searchRes: any = await gmail.users.messages.list({
      userId: "me",
      q: "has:attachment filename:pdf after:2025/01/01",
      maxResults: 500,
      ...(pageToken ? { pageToken } : {}),
    });
    const batch = searchRes.data.messages || [];
    allMessages.push(...batch);
    pageToken = searchRes.data.nextPageToken ?? undefined;
  } while (pageToken);

  let synced = 0;
  const messages = allMessages;

  for (const msg of messages) {
    // Check if already synced
    const existing = await prisma.document.findFirst({
      where: { gmailMsgId: msg.id!, userId: session.user.id },
    });
    if (existing) continue;

    const fullMsg = await gmail.users.messages.get({
      userId: "me",
      id: msg.id!,
      format: "full",
    });

    const subject =
      fullMsg.data.payload?.headers?.find(h => h.name === "Subject")?.value || "";
    const sender =
      fullMsg.data.payload?.headers?.find(h => h.name === "From")?.value || "";
    const dateHeader = fullMsg.data.payload?.headers?.find(h => h.name === "Date")?.value;
    const date = dateHeader ? new Date(dateHeader) : new Date();

    const parts = fullMsg.data.payload?.parts || [];

    for (const part of parts) {
      if (part.filename && part.filename.endsWith(".pdf") && part.body?.attachmentId) {
        const docType = isInvoiceOrSalary(part.filename, subject, sender);
        if (!docType) continue;

        // Download attachment
        const attachment = await gmail.users.messages.attachments.get({
          userId: "me",
          messageId: msg.id!,
          id: part.body.attachmentId,
        });

        const data = attachment.data.data;
        if (!data) continue;

        const buffer = Buffer.from(data, "base64");

        // Upload to Drive
        const { Readable } = require("stream");
        const stream = Readable.from(buffer);

        const driveFile = await drive.files.create({
          requestBody: {
            name: part.filename,
            parents: [folderId],
          },
          media: {
            mimeType: "application/pdf",
            body: stream,
          },
          fields: "id, webViewLink",
        });

        await prisma.document.create({
          data: {
            userId: session.user.id,
            filename: part.filename,
            type: docType,
            date: date,
            driveFileId: driveFile.data.id!,
            driveUrl: driveFile.data.webViewLink!,
            gmailMsgId: msg.id!,
            emailSubject: subject,
            emailSender: sender,
          },
        });

        synced++;
      }
    }
  }

  return NextResponse.json({ synced, total: allMessages.length });
}

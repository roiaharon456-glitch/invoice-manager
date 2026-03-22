import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { getDriveClient } from "@/lib/gmail";
import archiver from "archiver";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { documentIds } = await request.json();

  const account = await prisma.account.findFirst({
    where: { userId: session.user.id, provider: "google" },
  });

  if (!account?.access_token) {
    return NextResponse.json({ error: "No access token" }, { status: 401 });
  }

  const documents = await prisma.document.findMany({
    where: { id: { in: documentIds }, userId: session.user.id },
  });

  const drive = await getDriveClient(account.access_token, account.refresh_token ?? undefined);

  const chunks: Buffer[] = [];
  const archive = archiver("zip", { zlib: { level: 9 } });

  archive.on("data", (chunk: Buffer) => chunks.push(chunk));

  for (const doc of documents) {
    const res = await drive.files.get(
      { fileId: doc.driveFileId, alt: "media" },
      { responseType: "arraybuffer" }
    );
    const buffer = Buffer.from(res.data as ArrayBuffer);
    archive.append(buffer, { name: doc.filename });
  }

  await archive.finalize();

  const zipBuffer = Buffer.concat(chunks);

  return new NextResponse(zipBuffer, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": "attachment; filename=documents.zip",
    },
  });
}

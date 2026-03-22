import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { getDriveClient } from "@/lib/gmail";

const TARGET_FOLDER_ID = "160r2PnhncUc2TLCjxljQ0hASgpxA21Tl";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const documentIds: string[] | undefined = body.documentIds;

  const account = await prisma.account.findFirst({
    where: { userId: session.user.id, provider: "google" },
  });

  if (!account?.access_token) {
    return NextResponse.json({ error: "No access token" }, { status: 401 });
  }

  const documents = await prisma.document.findMany({
    where: {
      userId: session.user.id,
      ...(documentIds?.length ? { id: { in: documentIds } } : {}),
    },
  });

  const drive = await getDriveClient(account.access_token, account.refresh_token ?? undefined);

  let copied = 0;
  const failed: string[] = [];

  for (const doc of documents) {
    try {
      await drive.files.copy({
        fileId: doc.driveFileId,
        requestBody: {
          name: doc.filename,
          parents: [TARGET_FOLDER_ID],
        },
      });
      copied++;
    } catch {
      failed.push(doc.filename);
    }
  }

  return NextResponse.json({ copied, failed, total: documents.length });
}

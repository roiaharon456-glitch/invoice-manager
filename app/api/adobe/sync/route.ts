import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getDriveClient } from "@/lib/gmail";
import { prisma } from "@/lib/prisma";

import { Readable } from "stream";
import fs from "fs";

export const maxDuration = 90; // Next.js route timeout

const DEBUG_DIR = "/tmp/adobe-debug";

async function getOrCreateFolder(drive: any, folderName: string): Promise<string> {
  const res = await drive.files.list({
    q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id, name)",
  });
  if (res.data.files && res.data.files.length > 0) return res.data.files[0].id;
  const folder = await drive.files.create({
    requestBody: { name: folderName, mimeType: "application/vnd.google-apps.folder" },
    fields: "id",
  });
  return folder.data.id;
}

export async function POST(_request: Request) {
  try {
    return await handlePost();
  } catch (err: any) {
    console.error("[Adobe] Unhandled error:", err);
    return NextResponse.json({ synced: 0, error: String(err?.message ?? err) }, { status: 500 });
  }
}

async function handlePost() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adobeEmail = process.env.ADOBE_EMAIL;
  const adobePassword = process.env.ADOBE_PASSWORD;
  if (!adobeEmail || !adobePassword) {
    return NextResponse.json({ error: "Missing ADOBE_EMAIL or ADOBE_PASSWORD" }, { status: 500 });
  }

  const account = await prisma.account.findFirst({
    where: { userId: session.user.id, provider: "google" },
  });
  if (!account?.access_token) {
    return NextResponse.json({ error: "No Google access token" }, { status: 401 });
  }

  fs.mkdirSync(DEBUG_DIR, { recursive: true });
  console.log("[Adobe] Starting sync...");

  const drive = await getDriveClient(account.access_token, account.refresh_token ?? undefined);
  const folderId = await getOrCreateFolder(drive, "Invoice Manager");

  // Race entire operation (including browser.launch) against 80s timeout
  const timeoutPromise = new Promise<{ synced: number; error: string }>((resolve) =>
    setTimeout(() => resolve({ synced: 0, error: "Timed out after 80s" }), 80_000)
  );

  const syncPromise = (async (): Promise<{ synced: number; error?: string }> => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const puppeteer = require("puppeteer");
    let browser: any = null;
    let synced = 0;

    try {
      console.log("[Adobe] Launching browser...");
      browser = await puppeteer.launch({
        headless: true,
        executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
        timeout: 30000,
      });
      console.log("[Adobe] Browser launched.");

      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 800 });

      // Go to orders — Adobe will redirect to login
      console.log("[Adobe] Navigating to orders...");
      await page.goto("https://account.adobe.com/orders", {
        waitUntil: "networkidle2",
        timeout: 30000,
      });
      console.log("[Adobe] URL:", page.url());
      await page.screenshot({ path: `${DEBUG_DIR}/01-goto.png` });

      // Wait extra for SPA to render
      await new Promise(r => setTimeout(r, 4000));
      await page.screenshot({ path: `${DEBUG_DIR}/01b-after-wait.png` });

      // Helper: find input in main frame OR inside iframes
      const typeInField = async (selectors: string[], value: string): Promise<boolean> => {
        // Try main frame
        for (const sel of selectors) {
          try {
            await page.waitForSelector(sel, { timeout: 3000 });
            await page.type(sel, value, { delay: 40 });
            console.log("[Adobe] Typed in main frame:", sel);
            return true;
          } catch {}
        }
        // Try iframes
        for (const frame of page.frames()) {
          for (const sel of selectors) {
            try {
              await frame.waitForSelector(sel, { timeout: 2000 });
              await frame.type(sel, value, { delay: 40 });
              console.log("[Adobe] Typed in iframe:", sel, frame.url());
              return true;
            } catch {}
          }
        }
        return false;
      };

      const clickInFrame = async (selectors: string[]): Promise<void> => {
        for (const sel of selectors) {
          const el = await page.$(sel);
          if (el) { await el.click(); return; }
        }
        for (const frame of page.frames()) {
          for (const sel of selectors) {
            try {
              const el = await frame.$(sel);
              if (el) { await el.click(); return; }
            } catch {}
          }
        }
      };

      // Fill email
      const emailSelectors = ["#EmailPage-EmailField", "input[name='username']", "input[type='email']", "input[name='email']"];
      const emailOk = await typeInField(emailSelectors, adobeEmail);
      if (!emailOk) {
        await page.screenshot({ path: `${DEBUG_DIR}/02-no-email.png` });
        // Log all frames
        for (const f of page.frames()) console.log("[Adobe] Frame URL:", f.url());
        const html = await page.evaluate(() => document.body.innerText.slice(0, 500));
        console.log("[Adobe] Email field not found. Page text:", html);
        return { synced: 0, error: "Email field not found — check /tmp/adobe-debug/02-no-email.png" };
      }
      await page.screenshot({ path: `${DEBUG_DIR}/03-email-typed.png` });

      await clickInFrame(['[data-id="EmailPage-EmailField-continue-button"]', "button[type=submit]", "input[type=submit]", "#submit"]);
      console.log("[Adobe] Clicked continue.");
      await new Promise(r => setTimeout(r, 3000));

      // Fill password
      const passSelectors = ["#PasswordPage-PasswordField", "input[name='password']", "input[type='password']"];
      const passOk = await typeInField(passSelectors, adobePassword);
      if (!passOk) {
        await page.screenshot({ path: `${DEBUG_DIR}/04-no-pass.png` });
        return { synced: 0, error: "Password field not found — check /tmp/adobe-debug/04-no-pass.png" };
      }
      await page.screenshot({ path: `${DEBUG_DIR}/05-pass-typed.png` });

      await Promise.all([
        clickInFrame(['[data-id="PasswordPage-PasswordField-sign-in-button"]', "button[type=submit]", "input[type=submit]", "#submit"]),
        page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 20000 }).catch(() => {}),
      ]);
      console.log("[Adobe] Signed in. URL:", page.url());
      await page.screenshot({ path: `${DEBUG_DIR}/06-after-login.png` });

      // Navigate to orders (post-login)
      await page.goto("https://account.adobe.com/orders", {
        waitUntil: "networkidle2",
        timeout: 30000,
      });
      console.log("[Adobe] Orders URL:", page.url());
      await page.screenshot({ path: `${DEBUG_DIR}/07-orders.png` });

      // Scrape invoice links
      const links: { href: string; text: string }[] = await page.evaluate(() => {
        const results: { href: string; text: string }[] = [];
        document.querySelectorAll("a, button").forEach((el: any) => {
          const href = el.href || "";
          const text = (el.textContent || "").trim().toLowerCase();
          if (
            href.includes("invoice") || href.includes("receipt") || href.endsWith(".pdf") ||
            text.includes("invoice") || text.includes("receipt") || text.includes("download") || text.includes("pdf")
          ) {
            results.push({ href, text });
          }
        });
        return results;
      });
      console.log("[Adobe] Invoice links found:", JSON.stringify(links));

      if (links.length === 0) {
        const pageText = await page.evaluate(() => document.body.innerText.slice(0, 2000));
        console.log("[Adobe] No links. Page text:\n", pageText);
        return { synced: 0, error: "No invoice links found — check /tmp/adobe-debug/07-orders.png" };
      }

      for (const link of links) {
        if (!link.href) continue;
        const invoiceId = `adobe_${Buffer.from(link.href).toString("base64").replace(/[^a-zA-Z0-9]/g, "").slice(0, 64)}`;
        const existing = await prisma.document.findFirst({ where: { gmailMsgId: invoiceId, userId: session.user.id } });
        if (existing) { console.log("[Adobe] Skip (exists):", link.href); continue; }

        const pdfPage = await browser.newPage();
        let capturedBuffer: Buffer | null = null;
        pdfPage.on("response", async (res: any) => {
          if ((res.headers()["content-type"] || "").includes("application/pdf")) {
            try { capturedBuffer = await res.buffer(); console.log("[Adobe] PDF captured, bytes:", capturedBuffer?.length); }
            catch {}
          }
        });
        try { await pdfPage.goto(link.href, { waitUntil: "networkidle2", timeout: 20000 }); } catch {}
        await pdfPage.close();

        if (!capturedBuffer) { console.log("[Adobe] No PDF buffer for:", link.href); continue; }

        const rawName = link.href.split("/").pop()?.split("?")[0] || `adobe_invoice_${Date.now()}`;
        const filename = rawName.endsWith(".pdf") ? rawName : `${rawName}.pdf`;

        const driveFile = await drive.files.create({
          requestBody: { name: filename, parents: [folderId] },
          media: { mimeType: "application/pdf", body: Readable.from(capturedBuffer) },
          fields: "id, webViewLink",
        });

        await prisma.document.create({
          data: {
            userId: session.user.id, filename, type: "invoice", source: "adobe",
            date: new Date(), driveFileId: driveFile.data.id!, driveUrl: driveFile.data.webViewLink!,
            gmailMsgId: invoiceId, emailSubject: "Adobe Invoice", emailSender: "Adobe",
          },
        });
        console.log("[Adobe] Synced:", filename);
        synced++;
      }

      return { synced };
    } finally {
      if (browser) await browser.close().catch(() => {});
    }
  })();

  const result = await Promise.race([syncPromise, timeoutPromise]);
  console.log("[Adobe] Result:", result);
  return NextResponse.json(result);
}

async function findSelector(page: any, selectors: string[], timeout: number): Promise<string | null> {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    for (const sel of selectors) {
      try {
        await page.waitForSelector(sel, { timeout: 1500 });
        return sel;
      } catch {}
    }
  }
  return null;
}

async function clickFirst(page: any, selectors: string[]): Promise<void> {
  for (const sel of selectors) {
    const el = await page.$(sel);
    if (el) { await el.click(); return; }
  }
}

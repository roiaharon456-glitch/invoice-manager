import { google } from "googleapis";

export async function getGmailClient(accessToken: string, refreshToken?: string) {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  auth.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  return google.gmail({ version: "v1", auth });
}

export async function getDriveClient(accessToken: string, refreshToken?: string) {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  auth.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  return google.drive({ version: "v3", auth });
}

export function isInvoiceOrSalary(filename: string, subject: string, sender = ""): string | null {
  const lower = (filename + " " + subject + " " + sender).toLowerCase();

  const salaryKeywords = ["תלוש", "משכורת", "salary", "payslip", "pay slip", "payroll"];
  const invoiceKeywords = [
    "חשבונית", "invoice", "receipt", "קבלה", "חשבון",
    // תרומות
    "תרומה", "donation", "תורת החיים", "torat",
    // כרטיסי חיוב
    "כרטיס חיוב", "לשם", "leshem", "חיוב חודשי", "credit card", "debit",
    "הוראת קבע", "חיוב כרטיס",
    // ביטוח רכב
    "ביטוח רכב", "פוליסה", "insurance", "car insurance", "ביטוח חובה", "ביטוח מקיף",
  ];

  if (salaryKeywords.some(k => lower.includes(k))) return "salary";
  if (invoiceKeywords.some(k => lower.includes(k))) return "invoice";
  return null;
}

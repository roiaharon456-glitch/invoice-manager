"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useState, useEffect } from "react";

interface Document {
  id: string;
  filename: string;
  type: string;
  source?: string;
  date: string;
  driveUrl: string;
  emailSubject?: string;
  emailSender?: string;
}

type WAStatus = "disconnected" | "connecting" | "ready";

/* ─── Inline SVG icons ──────────────────────────────────────────── */
const IconDoc = ({ className = "" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
  </svg>
);
const IconSync = ({ className = "" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
  </svg>
);
const IconDownload = ({ className = "" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
  </svg>
);
const IconMail = ({ className = "" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
  </svg>
);
const IconExternal = ({ className = "" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0021 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
  </svg>
);
const IconLogout = ({ className = "" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
  </svg>
);
const IconCalendar = ({ className = "" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
  </svg>
);
const IconCheck = ({ className = "" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);
const IconDrive = ({ className = "" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M6.28 3h11.44l5.28 9.14-2.88 4.99H3.88L1 12.14 6.28 3z" fill="#4285F4" opacity=".8"/>
    <path d="M3.88 17.13h16.24l-2.88 4.87H6.76l-2.88-4.87z" fill="#34A853" opacity=".9"/>
    <path d="M1 12.14l2.88 5h2.88L4 12.14H1z" fill="#FBBC05"/>
    <path d="M17.72 3l2.88 5h-2.88L15 3h2.72z" fill="#EA4335" opacity=".7"/>
  </svg>
);
const IconWhatsApp = ({ className = "" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.117 1.523 5.845L.057 23.486a.5.5 0 00.608.61l5.801-1.52A11.943 11.943 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.885 0-3.651-.518-5.163-1.42l-.37-.22-3.835 1.005 1.024-3.74-.242-.386A9.944 9.944 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
  </svg>
);
const GoogleLogo = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

/* ─── Custom checkbox ───────────────────────────────────────────── */
function Checkbox({ checked, onChange, onClick }: { checked: boolean; onChange: () => void; onClick?: (e: React.MouseEvent) => void }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={(e) => { onClick?.(e); onChange(); }}
      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all flex-shrink-0 ${
        checked
          ? "bg-indigo-600 border-indigo-600"
          : "bg-white border-gray-300 hover:border-indigo-400"
      }`}
    >
      {checked && <IconCheck className="w-3 h-3 text-white" />}
    </button>
  );
}

/* ─── Login page ────────────────────────────────────────────────── */
function LoginScreen() {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #a855f7 100%)" }}
    >
      {/* Decorative blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-20" style={{ background: "radial-gradient(circle, #818cf8, transparent)" }} />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full opacity-20" style={{ background: "radial-gradient(circle, #c084fc, transparent)" }} />
      </div>

      <div className="relative bg-white rounded-3xl shadow-2xl p-10 text-center w-full max-w-sm" dir="rtl">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
          style={{ background: "linear-gradient(135deg, #eef2ff, #f5f3ff)" }}>
          <IconDoc className="w-8 h-8 text-indigo-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">מנהל מסמכים</h1>
        <p className="text-gray-400 text-sm mb-8">חשבוניות ותלושי משכורת — הכל במקום אחד</p>

        <button
          onClick={() => signIn("google")}
          className="w-full flex items-center justify-center gap-3 bg-white border border-gray-200 text-gray-700 px-5 py-3.5 rounded-xl hover:bg-gray-50 hover:border-indigo-300 transition-all font-medium text-sm shadow-sm"
        >
          <GoogleLogo />
          המשך עם Google
        </button>

        <p className="text-xs text-gray-400 mt-5">
          גישה רק לקבצים שנוצרו על ידי האפליקציה
        </p>
      </div>
    </div>
  );
}

/* ─── Stat pill ─────────────────────────────────────────────────── */
function StatPill({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium ${color}`}>
      <span className="text-lg font-bold">{count}</span>
      <span className="opacity-80">{label}</span>
    </div>
  );
}

/* ─── Document card ─────────────────────────────────────────────── */
function DocCard({ doc, selected, onToggle }: { doc: Document; selected: boolean; onToggle: () => void }) {
  const isSalary = doc.type === "salary";
  const accentColor = isSalary ? "#7c3aed" : "#4f46e5";
  const badgeBg = isSalary ? "bg-violet-50 text-violet-700 ring-1 ring-violet-200" : "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200";
  const iconBg = isSalary ? "bg-violet-50 text-violet-500" : "bg-indigo-50 text-indigo-500";

  return (
    <div
      onClick={onToggle}
      className={`group relative bg-white rounded-2xl cursor-pointer transition-all duration-200 overflow-hidden ${
        selected
          ? "shadow-lg ring-2 ring-indigo-400 ring-offset-2"
          : "shadow-sm hover:shadow-md ring-1 ring-gray-100 hover:ring-gray-200"
      }`}
    >
      {/* Top accent bar */}
      <div className="h-1 w-full" style={{ background: accentColor }} />

      <div className="p-5">
        {/* Row 1: type badge + checkbox */}
        <div className="flex items-center justify-between mb-4">
          <span className={`text-xs px-2.5 py-1 rounded-lg font-semibold ${badgeBg}`}>
            {isSalary ? "תלוש משכורת" : "חשבונית"}
          </span>
          <Checkbox
            checked={selected}
            onChange={onToggle}
            onClick={(e) => e.stopPropagation()}
          />
        </div>

        {/* Row 2: icon + filename */}
        <div className="flex items-start gap-3 mb-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
            <IconDoc className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p
              className="text-sm font-semibold text-gray-800 leading-snug truncate"
              title={doc.filename}
            >
              {doc.filename}
            </p>
            <div className="flex items-center gap-1.5 mt-1">
              <IconCalendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <p className="text-xs text-gray-400">
                {new Date(doc.date).toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>
          </div>
        </div>

        {/* Row 3: sender (vendor name + email) */}
        {doc.emailSender && (() => {
          const { name, email } = parseSender(doc.emailSender);
          return (
            <div className="mt-3 pt-3 border-t border-gray-50">
              {name && (
                <p className="text-sm font-semibold text-gray-700 truncate mb-0.5" title={name}>
                  {name}
                </p>
              )}
              <div className="flex items-center gap-1.5">
                <IconMail className="w-3 h-3 text-gray-300 flex-shrink-0" />
                <p className="text-xs text-gray-400 truncate" title={email || doc.emailSender}>
                  {email || doc.emailSender}
                </p>
              </div>
              {doc.emailSubject && (
                <p className="text-xs text-gray-400 truncate mt-1 leading-relaxed" title={doc.emailSubject}>
                  {doc.emailSubject}
                </p>
              )}
            </div>
          );
        })()}

        {/* Row 4: Drive link + source badge */}
        <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between">
          {doc.source === "whatsapp" ? (
            <span className="inline-flex items-center gap-1 text-xs text-[#25D366] font-medium">
              <IconWhatsApp className="w-3.5 h-3.5" />
              WhatsApp
            </span>
          ) : doc.source === "adobe" ? (
            <span className="inline-flex items-center gap-1 text-xs text-[#FF0000] font-medium">
              Adobe
            </span>
          ) : (
            <span className="text-xs text-gray-300">Gmail</span>
          )}
          <a
            href={doc.driveUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            <IconExternal className="w-3.5 h-3.5" />
            פתח ב-Drive
          </a>
        </div>
      </div>
    </div>
  );
}

/* ─── Sender parser ──────────────────────────────────────────────
   Parses "Display Name <email@domain.com>" → { name, email }
   Falls back gracefully when one part is missing.
──────────────────────────────────────────────────────────────── */
function parseSender(raw: string): { name: string; email: string } {
  if (!raw) return { name: "", email: "" };
  const m = raw.match(/^"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  if (m) {
    return { name: m[1].trim(), email: m[2].trim() };
  }
  // Just an email address with no display name
  if (raw.includes("@")) return { name: "", email: raw.trim() };
  return { name: raw.trim(), email: "" };
}

/* ─── Date helpers ───────────────────────────────────────────────
   Accepts DD/MM/YYYY or DD-MM-YYYY and converts to YYYY-MM-DD.
   Returns "" if the input is empty or not parseable.
──────────────────────────────────────────────────────────────── */
function parseDateInput(raw: string): string {
  if (!raw.trim()) return "";
  const m = raw.trim().match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (!m) return "";
  const [, d, mo, y] = m;
  return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

/* ─── List-view row ──────────────────────────────────────────────── */
function DocRow({ doc, selected, onToggle }: { doc: Document; selected: boolean; onToggle: () => void }) {
  const isSalary = doc.type === "salary";
  const badgeBg = isSalary
    ? "bg-violet-50 text-violet-700 ring-1 ring-violet-200"
    : "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200";
  return (
    <tr
      onClick={onToggle}
      className={`cursor-pointer transition-colors border-b border-gray-50 last:border-0 ${
        selected ? "bg-indigo-50/60" : "hover:bg-gray-50/80"
      }`}
    >
      <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
        <Checkbox checked={selected} onChange={onToggle} />
      </td>
      <td className="px-4 py-3.5">
        <span className={`text-xs px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap ${badgeBg}`}>
          {isSalary ? "תלוש" : "חשבונית"}
        </span>
      </td>
      <td className="px-4 py-3.5 max-w-xs">
        <p className="text-sm font-medium text-gray-800 truncate" title={doc.filename}>{doc.filename}</p>
      </td>
      <td className="px-4 py-3.5 whitespace-nowrap">
        <p className="text-sm text-gray-500">{new Date(doc.date).toLocaleDateString("he-IL")}</p>
      </td>
      <td className="px-4 py-3.5 max-w-xs">
        {doc.emailSender && (() => {
          const { name, email } = parseSender(doc.emailSender);
          return (
            <>
              {name && (
                <p className="text-sm font-semibold text-gray-700 truncate" title={name}>{name}</p>
              )}
              <p className="text-xs text-gray-400 truncate" title={email || doc.emailSender}>
                {email || doc.emailSender}
              </p>
              {doc.emailSubject && (
                <p className="text-xs text-gray-300 truncate mt-0.5" title={doc.emailSubject}>{doc.emailSubject}</p>
              )}
            </>
          );
        })()}
      </td>
      <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
        <a
          href={doc.driveUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 whitespace-nowrap"
        >
          <IconExternal className="w-3.5 h-3.5" />
          Drive
        </a>
      </td>
    </tr>
  );
}

/* ─── Main app ──────────────────────────────────────────────────── */
export default function Home() {
  const { data: session, status } = useSession();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [type, setType] = useState("all");
  const [sender, setSender] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<"date" | "name" | "type">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [syncResult, setSyncResult] = useState<{ count: number; isNew: boolean; source?: string } | null>(null);
  const [waStatus, setWAStatus] = useState<WAStatus>("disconnected");
  const [waQR, setWAQR] = useState<string | null>(null);
  const [waError, setWAError] = useState<string | null>(null);
  const [waSyncing, setWASyncing] = useState(false);
  const [adobeSyncing, setAdobeSyncing] = useState(false);
  const [waOpen, setWAOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportResult, setExportResult] = useState<{ copied: number; failed: string[]; total: number } | null>(null);

  const fetchDocuments = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    const fromISO = parseDateInput(from);
    const toISO = parseDateInput(to);
    if (fromISO) params.set("from", fromISO);
    if (toISO) params.set("to", toISO);
    if (type !== "all") params.set("type", type);
    if (sender.trim()) params.set("sender", sender.trim());
    const res = await fetch(`/api/documents?${params}`);
    const data = await res.json();
    setDocuments(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  // Poll WA status every 3s while connecting
  useEffect(() => {
    if (!session) return;
    if (waStatus !== "connecting") return;
    const interval = setInterval(async () => {
      const res = await fetch("/api/whatsapp");
      const data = await res.json();
      setWAStatus(data.status);
      setWAQR(data.qrImage ?? null);
      setWAError(data.error ?? null);
    }, 3000);
    return () => clearInterval(interval);
  }, [session, waStatus]);

  useEffect(() => {
    if (session) fetchDocuments();
  }, [session]);

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    const res = await fetch("/api/sync", { method: "POST" });
    const data = await res.json();
    setSyncResult({ count: data.synced, isNew: data.synced > 0 });
    setSyncing(false);
    fetchDocuments();
  };

  const handleDownload = async () => {
    const ids = selected.size > 0 ? Array.from(selected) : documents.map((d) => d.id);
    const res = await fetch("/api/download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentIds: ids }),
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "documents.zip";
    a.click();
  };

  const handleExportToDrive = async () => {
    setExporting(true);
    setExportResult(null);
    const ids = selected.size > 0 ? Array.from(selected) : undefined;
    const res = await fetch("/api/export-to-drive", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ids ? { documentIds: ids } : {}),
    });
    const data = await res.json();
    setExportResult(data);
    setExporting(false);
  };

  const handleWAConnect = async () => {
    const res = await fetch("/api/whatsapp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "connect" }),
    });
    const data = await res.json();
    setWAStatus(data.status);
    setWAOpen(true);
    // Kick off immediate poll
    setTimeout(async () => {
      const r = await fetch("/api/whatsapp");
      const d = await r.json();
      setWAStatus(d.status);
      setWAQR(d.qrImage ?? null);
    }, 1500);
  };

  const handleWADisconnect = async () => {
    await fetch("/api/whatsapp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "disconnect" }),
    });
    setWAStatus("disconnected");
    setWAQR(null);
  };

  const handleWASync = async () => {
    setWASyncing(true);
    setSyncResult(null);
    const res = await fetch("/api/whatsapp/sync", { method: "POST" });
    const data = await res.json();
    setSyncResult({ count: data.synced ?? 0, isNew: (data.synced ?? 0) > 0, source: "whatsapp" });
    setWASyncing(false);
    fetchDocuments();
  };

  const handleAdobeSync = async () => {
    setAdobeSyncing(true);
    setSyncResult(null);
    const res = await fetch("/api/adobe/sync", { method: "POST" });
    const data = await res.json();
    setSyncResult({ count: data.synced ?? 0, isNew: (data.synced ?? 0) > 0, source: "adobe" });
    setAdobeSyncing(false);
    fetchDocuments();
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const allSelected = documents.length > 0 && selected.size === documents.length;
  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(documents.map((d) => d.id)));

  const invoiceCount = documents.filter((d) => d.type === "invoice").length;
  const salaryCount = documents.filter((d) => d.type === "salary").length;

  /* ── Loading / unauthenticated states ── */
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex items-center gap-3 text-gray-400">
          <Spinner />
          <span className="text-sm">טוען...</span>
        </div>
      </div>
    );
  }
  if (!session) return <LoginScreen />;

  /* ── Avatar initials ── */
  const initials = session.user?.name
    ?.split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() ?? "?";

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">

      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-10 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}>
              <IconDoc className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-gray-900 text-sm tracking-tight">מנהל מסמכים</span>
          </div>

          {/* User */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5">
              {session.user?.image ? (
                <img src={session.user.image} alt="" className="w-7 h-7 rounded-full ring-2 ring-white shadow-sm" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">
                  {initials}
                </div>
              )}
              <span className="text-sm text-gray-700 font-medium hidden sm:block">
                {session.user?.name}
              </span>
            </div>
            <button
              onClick={() => signOut()}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors px-2 py-1 rounded-lg hover:bg-gray-50"
            >
              <IconLogout className="w-4 h-4" />
              <span className="hidden sm:block">יציאה</span>
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero header ── */}
      <div style={{ background: "linear-gradient(135deg, #4f46e5 0%, #6d28d9 100%)" }} className="px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-white mb-1">
            שלום, {session.user?.name?.split(" ")[0]} 👋
          </h1>
          <p className="text-indigo-200 text-sm mb-6">כל המסמכים הפיננסיים שלך במקום אחד</p>

          {/* Stat pills */}
          <div className="flex flex-wrap gap-3">
            <StatPill label="מסמכים" count={documents.length} color="bg-white/20 text-white" />
            <StatPill label="חשבוניות" count={invoiceCount} color="bg-indigo-800/40 text-indigo-100" />
            <StatPill label="תלושי משכורת" count={salaryCount} color="bg-purple-800/40 text-purple-100" />
            {selected.size > 0 && (
              <StatPill label="נבחרו" count={selected.size} color="bg-amber-400/90 text-amber-900" />
            )}
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <main className="max-w-7xl mx-auto px-6 py-6">

        {/* ── Toolbar ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex flex-wrap gap-3 items-end justify-between">

            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500 px-1">שנה</label>
                <select
                  value={selectedYear}
                  onChange={(e) => {
                    const y = e.target.value;
                    setSelectedYear(y);
                    if (y) {
                      setFrom(`01/01/${y}`);
                      setTo(`31/12/${y}`);
                    } else {
                      setFrom("");
                      setTo("");
                    }
                  }}
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all"
                >
                  <option value="">כל השנים</option>
                  {[2026, 2025, 2024, 2023].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500 px-1">מתאריך</label>
                <input
                  type="text"
                  value={from}
                  onChange={(e) => { setFrom(e.target.value); setSelectedYear(""); }}
                  placeholder="DD/MM/YYYY"
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 bg-gray-50 w-32 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all placeholder-gray-300"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500 px-1">עד תאריך</label>
                <input
                  type="text"
                  value={to}
                  onChange={(e) => { setTo(e.target.value); setSelectedYear(""); }}
                  placeholder="DD/MM/YYYY"
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 bg-gray-50 w-32 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all placeholder-gray-300"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500 px-1">סוג מסמך</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all"
                >
                  <option value="all">הכל</option>
                  <option value="invoice">חשבוניות</option>
                  <option value="salary">תלושי משכורת</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500 px-1">ספק / שולח</label>
                <input
                  type="text"
                  value={sender}
                  onChange={(e) => setSender(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && fetchDocuments()}
                  placeholder="חיפוש לפי ספק..."
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 bg-gray-50 w-44 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all placeholder-gray-300"
                />
              </div>
              <button
                onClick={fetchDocuments}
                className="px-4 py-2 rounded-xl text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors border border-indigo-100"
              >
                סנן
              </button>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {/* View toggle */}
              <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-0.5 ml-1">
                <button
                  onClick={() => setViewMode("grid")}
                  title="תצוגת גלריה"
                  className={`p-1.5 rounded-lg transition-all ${viewMode === "grid" ? "bg-white shadow-sm text-indigo-600" : "text-gray-400 hover:text-gray-600"}`}
                >
                  {/* Grid icon */}
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="3" y="3" width="7" height="7" rx="1.5" />
                    <rect x="14" y="3" width="7" height="7" rx="1.5" />
                    <rect x="3" y="14" width="7" height="7" rx="1.5" />
                    <rect x="14" y="14" width="7" height="7" rx="1.5" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  title="תצוגת רשימה"
                  className={`p-1.5 rounded-lg transition-all ${viewMode === "list" ? "bg-white shadow-sm text-indigo-600" : "text-gray-400 hover:text-gray-600"}`}
                >
                  {/* List icon */}
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="8" y1="6" x2="21" y2="6" />
                    <line x1="8" y1="12" x2="21" y2="12" />
                    <line x1="8" y1="18" x2="21" y2="18" />
                    <circle cx="3.5" cy="6" r="1" fill="currentColor" />
                    <circle cx="3.5" cy="12" r="1" fill="currentColor" />
                    <circle cx="3.5" cy="18" r="1" fill="currentColor" />
                  </svg>
                </button>
              </div>

              <button
                onClick={handleSync}
                disabled={syncing}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-sm hover:shadow-md active:scale-95"
                style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}
              >
                {syncing ? <Spinner /> : <IconSync className="w-4 h-4" />}
                {syncing ? "מסנכרן..." : "סנכרן Gmail"}
              </button>
              <button
                onClick={handleAdobeSync}
                disabled={adobeSyncing}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-sm hover:shadow-md active:scale-95"
                style={{ background: "linear-gradient(135deg, #FF0000, #CC0000)" }}
              >
                {adobeSyncing ? <Spinner /> : <IconSync className="w-4 h-4" />}
                {adobeSyncing ? "מסנכרן..." : "סנכרן Adobe"}
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all shadow-sm hover:shadow-md active:scale-95"
                style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
              >
                <IconDownload className="w-4 h-4" />
                הורד {selected.size > 0 ? `(${selected.size})` : "הכל"}
              </button>
              <button
                onClick={handleExportToDrive}
                disabled={exporting}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-sm hover:shadow-md active:scale-95"
                style={{ background: "linear-gradient(135deg, #1a73e8, #0d47a1)" }}
              >
                {exporting ? <Spinner /> : <IconDrive className="w-4 h-4" />}
                {exporting ? "מעביר..." : `העבר ל-Drive${selected.size > 0 ? ` (${selected.size})` : ""}`}
              </button>
            </div>
          </div>

          {/* Sync result banner */}
          {syncResult && (
            <div
              className={`mt-3 px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 ${
                syncResult.isNew
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-gray-50 text-gray-500 border border-gray-200"
              }`}
            >
              {syncResult.isNew ? (
                <>
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse flex-shrink-0" />
                  {syncResult.count} מסמכים חדשים נוספו בהצלחה
                </>
              ) : (
                <>
                  <span className="w-2 h-2 bg-gray-400 rounded-full flex-shrink-0" />
                  לא נמצאו מסמכים חדשים
                </>
              )}
            </div>
          )}

          {/* Export to Drive result banner */}
          {exportResult && (
            <div
              className={`mt-3 px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 ${
                exportResult.failed.length === 0
                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                  : "bg-amber-50 text-amber-700 border border-amber-200"
              }`}
            >
              <IconDrive className="w-4 h-4 flex-shrink-0" />
              {exportResult.failed.length === 0
                ? `${exportResult.copied} קבצים הועברו בהצלחה ל-Drive`
                : `הועברו ${exportResult.copied} מתוך ${exportResult.total} קבצים — נכשלו: ${exportResult.failed.join(", ")}`}
            </div>
          )}
        </div>

        {/* ── WhatsApp panel ── */}
        <div className="mb-6">
          <button
            onClick={() => setWAOpen((o) => !o)}
            className={`w-full flex items-center justify-between px-5 py-3.5 rounded-2xl border transition-all ${
              waStatus === "ready"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : waStatus === "connecting"
                ? "bg-amber-50 border-amber-200 text-amber-800"
                : "bg-white border-gray-200 text-gray-700 hover:border-gray-300"
            }`}
          >
            <div className="flex items-center gap-3">
              <IconWhatsApp className="w-5 h-5 text-[#25D366]" />
              <span className="font-semibold text-sm">חיבור WhatsApp</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                waStatus === "ready"    ? "bg-emerald-100 text-emerald-700" :
                waStatus === "connecting" ? "bg-amber-100 text-amber-700" :
                "bg-gray-100 text-gray-500"
              }`}>
                {waStatus === "ready" ? "מחובר" : waStatus === "connecting" ? "מתחבר..." : "מנותק"}
              </span>
            </div>
            <svg className={`w-4 h-4 transition-transform ${waOpen ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {waOpen && (
            <div className="mt-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                      {waStatus === "disconnected" && (
                <div className="flex flex-col items-center text-center py-4 gap-4">
                  <IconWhatsApp className="w-12 h-12 text-[#25D366]" />
                  <div>
                    <p className="font-semibold text-gray-800 mb-1">סרוק חשבוניות מ-WhatsApp</p>
                    <p className="text-sm text-gray-400 max-w-xs">
                      התחבר לחשבון WhatsApp שלך כדי למשוך קבצי PDF שנשלחו בצ&#39;אטים
                    </p>
                  </div>
                  {waError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl px-4 py-2.5 max-w-sm text-right">
                      <strong>שגיאה:</strong> {waError}
                    </div>
                  )}
                  <button
                    onClick={handleWAConnect}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md active:scale-95"
                    style={{ background: "linear-gradient(135deg, #25D366, #128C7E)" }}
                  >
                    <IconWhatsApp className="w-4 h-4" />
                    התחבר לWhatsApp
                  </button>
                </div>
              )}

              {waStatus === "connecting" && (
                <div className="flex flex-col items-center gap-4 py-2">
                  {waQR ? (
                    <>
                      <p className="text-sm font-medium text-gray-700">סרוק את הקוד עם WhatsApp בטלפון</p>
                      <img src={waQR} alt="QR Code" className="w-52 h-52 rounded-xl shadow-md" />
                      <ol className="text-xs text-gray-400 space-y-1 text-right max-w-xs">
                        <li>1. פתח WhatsApp בטלפון</li>
                        <li>2. עבור לתפריט ← מכשירים מקושרים</li>
                        <li>3. לחץ על &quot;קשר מכשיר&quot;</li>
                        <li>4. סרוק את הקוד</li>
                      </ol>
                    </>
                  ) : (
                    <div className="flex items-center gap-3 text-gray-400 py-4">
                      <Spinner />
                      <span className="text-sm">מפעיל WhatsApp Web...</span>
                    </div>
                  )}
                  <button onClick={handleWADisconnect} className="text-xs text-gray-400 hover:text-gray-600 underline">ביטול</button>
                </div>
              )}

              {waStatus === "ready" && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <p className="text-sm font-medium text-gray-700">WhatsApp מחובר ופעיל</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleWASync}
                      disabled={waSyncing}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-60 shadow-sm hover:shadow-md active:scale-95"
                      style={{ background: "linear-gradient(135deg, #25D366, #128C7E)" }}
                    >
                      {waSyncing ? <Spinner /> : <IconSync className="w-4 h-4" />}
                      {waSyncing ? "מסנכרן..." : "סנכרן WhatsApp"}
                    </button>
                    <button
                      onClick={handleWADisconnect}
                      className="px-3 py-2 rounded-xl text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors border border-gray-200"
                    >
                      נתק
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Content area ── */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-gray-400">
            <Spinner />
            <span className="text-sm">טוען מסמכים...</span>
          </div>
        ) : documents.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-3xl bg-indigo-50 flex items-center justify-center mb-6">
              <IconDoc className="w-10 h-10 text-indigo-300" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">אין מסמכים עדיין</h3>
            <p className="text-sm text-gray-400 max-w-xs leading-relaxed mb-6">
              לחץ על <strong className="text-gray-600">סנכרן Gmail</strong> כדי לסרוק את תיבת המייל ולמצוא חשבוניות ותלושי משכורת
            </p>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm hover:shadow-md transition-all active:scale-95"
              style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
            >
              {syncing ? <Spinner /> : <IconSync className="w-4 h-4" />}
              {syncing ? "מסנכרן..." : "סנכרן Gmail עכשיו"}
            </button>
          </div>
        ) : (
          <>
            {/* Select-all bar */}
            <div className="flex items-center justify-between mb-4 px-1">
              <div
                onClick={toggleAll}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
              >
                <Checkbox checked={allSelected} onChange={toggleAll} />
                <span>{allSelected ? "בטל בחירה" : "בחר הכל"}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">
                  {documents.length} מסמכים{selected.size > 0 && ` · ${selected.size} נבחרו`}
                </span>
                <span className="text-gray-200">|</span>
                <span className="text-xs text-gray-400">מיון:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as "date" | "name" | "type")}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1 text-gray-600 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                >
                  <option value="date">תאריך</option>
                  <option value="name">שם</option>
                  <option value="type">סוג</option>
                </select>
                <button
                  onClick={() => setSortDir(d => d === "asc" ? "desc" : "asc")}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1 text-gray-600 bg-gray-50 hover:bg-gray-100 transition-colors"
                  title={sortDir === "asc" ? "עולה" : "יורד"}
                >
                  {sortDir === "asc" ? "↑" : "↓"}
                </button>
              </div>
            </div>

            {(() => {
              const sorted = [...documents].sort((a, b) => {
                let cmp = 0;
                if (sortBy === "date") cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
                else if (sortBy === "name") cmp = a.filename.localeCompare(b.filename, "he");
                else if (sortBy === "type") cmp = a.type.localeCompare(b.type, "he");
                return sortDir === "asc" ? cmp : -cmp;
              });
              return viewMode === "grid" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {sorted.map((doc) => (
                  <DocCard
                    key={doc.id}
                    doc={doc}
                    selected={selected.has(doc.id)}
                    onToggle={() => toggleSelect(doc.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/70">
                      <th className="px-4 py-3 w-10">
                        <Checkbox checked={allSelected} onChange={toggleAll} />
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">סוג</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">שם קובץ</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">תאריך</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">ספק / מייל</th>
                      <th className="px-4 py-3 w-20" />
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((doc) => (
                      <DocRow
                        key={doc.id}
                        doc={doc}
                        selected={selected.has(doc.id)}
                        onToggle={() => toggleSelect(doc.id)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            );
            })()}
          </>
        )}
      </main>
    </div>
  );
}

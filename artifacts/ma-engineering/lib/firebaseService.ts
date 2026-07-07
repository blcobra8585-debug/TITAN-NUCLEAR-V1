import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
  updateDoc,
  doc,
  onSnapshot,
  QuerySnapshot,
  DocumentData,
  setDoc,
  getDoc,
  where,
  limit,
  deleteDoc,
} from "firebase/firestore";
import { db, firebaseReady } from "./firebase";

export interface FirebaseLead {
  id: string;
  source: string;
  name: string;
  phone: string;
  email?: string;
  message: string;
  product?: string;
  location?: string;
  timestamp: number;
  replied: boolean;
  replyText?: string;
}

export async function saveQuote(data: {
  clientName: string;
  clientPhone?: string;
  projectType: string;
  tonnage: number;
  quotedAmount: number;
  quoteText: string;
  leadSource?: string;
  referredBy?: string;
  notes?: string;
}) {
  if (!firebaseReady || !db) {
    console.warn("[firebaseService] saveQuote skipped — Firebase not ready");
    return;
  }
  await addDoc(collection(db, "quotes"), {
    ...data,
    status: "pending",
    paymentStatus: "unpaid",
    invoiced: false,
    notes: data.notes ?? "",
    referredBy: data.referredBy ?? "",
    leadSource: data.leadSource ?? "Direct",
    timestamp: serverTimestamp(),
    createdAt: serverTimestamp(),
  });
}

export async function updateQuoteNotes(docId: string, notes: string) {
  if (!firebaseReady || !db) return;
  await updateDoc(doc(db, "quotes", docId), { notes });
}

export async function updateQuoteReferral(docId: string, referredBy: string) {
  if (!firebaseReady || !db) return;
  await updateDoc(doc(db, "quotes", docId), { referredBy });
}

export async function setQuoteAmcDate(docId: string, amcDate: string) {
  if (!firebaseReady || !db) return;
  await updateDoc(doc(db, "quotes", docId), { amcDate });
}

export async function setQuoteFollowUpDate(docId: string, followUpDate: string) {
  if (!firebaseReady || !db) return;
  await updateDoc(doc(db, "quotes", docId), { followUpDate });
}

export async function markQuoteInvoiced(docId: string, invoiceNumber: string) {
  if (!firebaseReady || !db) return;
  await updateDoc(doc(db, "quotes", docId), { invoiced: true, invoiceNumber, invoicedAt: serverTimestamp() });
}

export async function getQuotes() {
  if (!firebaseReady || !db) return [];
  const snap = await getDocs(
    query(collection(db, "quotes"), orderBy("timestamp", "desc"))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export function listenToQuotes(
  cb: (docs: { id: string; [key: string]: any }[]) => void
) {
  if (!firebaseReady || !db) {
    cb([]);
    return () => {};
  }
  const q = query(collection(db, "quotes"), orderBy("timestamp", "desc"));
  return onSnapshot(q, (snap: QuerySnapshot<DocumentData>) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export async function updateQuoteStatus(docId: string, status: string) {
  if (!firebaseReady || !db) return;
  await updateDoc(doc(db, "quotes", docId), { status });
}

export async function saveChatMessage(message: string, isLily: boolean) {
  if (!firebaseReady || !db) return;
  await addDoc(collection(db, "chat_history"), {
    message,
    isLily,
    timestamp: serverTimestamp(),
  });
}

export async function getTotalRevenue(): Promise<number> {
  if (!firebaseReady || !db) return 0;
  const snap = await getDocs(collection(db, "quotes"));
  let total = 0;
  snap.docs.forEach((d) => {
    total += (d.data().quotedAmount as number) ?? 0;
  });
  return total;
}

export async function saveLeadToFirebase(lead: FirebaseLead): Promise<void> {
  if (!firebaseReady || !db) return;
  await setDoc(doc(db, "leads", lead.id), lead);
}

export async function getLeadsFromFirebase(): Promise<FirebaseLead[]> {
  if (!firebaseReady || !db) return [];
  try {
    const snap = await getDocs(
      query(collection(db, "leads"), orderBy("timestamp", "desc"), limit(100))
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as FirebaseLead));
  } catch {
    return [];
  }
}

export async function updateLeadInFirebase(
  id: string,
  update: Partial<FirebaseLead>
): Promise<void> {
  if (!firebaseReady || !db) return;
  await updateDoc(doc(db, "leads", id), update);
}

export async function getLeadStatsFromFirebase(): Promise<{
  total: number;
  replied: number;
  unreplied: number;
  today: number;
  bySource: Record<string, number>;
}> {
  if (!firebaseReady || !db) {
    return { total: 0, replied: 0, unreplied: 0, today: 0, bySource: {} };
  }
  try {
    const leads = await getLeadsFromFirebase();
    const total = leads.length;
    const replied = leads.filter((l) => l.replied).length;
    const today = leads.filter(
      (l) => l.timestamp > Date.now() - 86400000
    ).length;
    const bySource = leads.reduce(
      (acc, l) => {
        acc[l.source] = (acc[l.source] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
    return { total, replied, unreplied: total - replied, today, bySource };
  } catch {
    return { total: 0, replied: 0, unreplied: 0, today: 0, bySource: {} };
  }
}

export function listenToLeads(cb: (leads: FirebaseLead[]) => void): () => void {
  if (!firebaseReady || !db) {
    cb([]);
    return () => {};
  }
  const q = query(
    collection(db, "leads"),
    orderBy("timestamp", "desc"),
    limit(100)
  );
  return onSnapshot(
    q,
    (snap) => {
      cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as FirebaseLead)));
    },
    () => cb([])
  );
}

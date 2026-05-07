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
} from "firebase/firestore";
import { db } from "./firebase";

export async function saveQuote(data: {
  clientName: string;
  projectType: string;
  tonnage: number;
  quotedAmount: number;
  quoteText: string;
}) {
  await addDoc(collection(db, "quotes"), {
    ...data,
    status: "pending",
    timestamp: serverTimestamp(),
  });
}

export async function getQuotes() {
  const snap = await getDocs(
    query(collection(db, "quotes"), orderBy("timestamp", "desc"))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export function listenToQuotes(
  cb: (docs: { id: string; [key: string]: any }[]) => void
) {
  const q = query(collection(db, "quotes"), orderBy("timestamp", "desc"));
  return onSnapshot(q, (snap: QuerySnapshot<DocumentData>) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export async function updateQuoteStatus(docId: string, status: string) {
  await updateDoc(doc(db, "quotes", docId), { status });
}

export async function saveChatMessage(message: string, isLily: boolean) {
  await addDoc(collection(db, "chat_history"), {
    message,
    isLily,
    timestamp: serverTimestamp(),
  });
}

export async function getTotalRevenue(): Promise<number> {
  const snap = await getDocs(collection(db, "quotes"));
  let total = 0;
  snap.docs.forEach((d) => {
    total += (d.data().quotedAmount as number) ?? 0;
  });
  return total;
}

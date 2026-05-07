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
import { signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { auth, db } from "./firebase";

let uid = "unknown";

export async function ensureAuth(): Promise<string> {
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      unsub();
      if (user) {
        uid = user.uid;
        resolve(user.uid);
      } else {
        const cred = await signInAnonymously(auth);
        uid = cred.user.uid;
        resolve(uid);
      }
    });
  });
}

export async function saveQuote(data: {
  clientName: string;
  projectType: string;
  tonnage: number;
  quotedAmount: number;
  quoteText: string;
}) {
  await ensureAuth();
  await addDoc(collection(db, "quotes"), {
    ...data,
    adminId: uid,
    status: "pending",
    timestamp: serverTimestamp(),
  });
}

export async function getQuotes() {
  await ensureAuth();
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
  await ensureAuth();
  await addDoc(collection(db, "chat_history"), {
    message,
    isLily,
    uid,
    timestamp: serverTimestamp(),
  });
}

export async function getTotalRevenue(): Promise<number> {
  await ensureAuth();
  const snap = await getDocs(collection(db, "quotes"));
  let total = 0;
  snap.docs.forEach((d) => {
    total += (d.data().quotedAmount as number) ?? 0;
  });
  return total;
}

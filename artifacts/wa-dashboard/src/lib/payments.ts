import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, query, where, onSnapshot, orderBy } from "firebase/firestore";

export interface Payment {
  id: string;
  quoteId: string;
  clientName: string;
  amount: number;
  method: "cash" | "bank_transfer" | "upi" | "cheque" | "other";
  note?: string;
  createdAt: any;
}

export async function recordPayment(input: {
  quoteId: string;
  clientName: string;
  amount: number;
  method: Payment["method"];
  note?: string;
}) {
  if (!input.quoteId || !input.clientName) throw new Error("quoteId and clientName are required");
  if (!Number.isFinite(input.amount) || input.amount <= 0) throw new Error("amount must be a positive number");
  await addDoc(collection(db, "payments"), {
    quoteId: input.quoteId,
    clientName: input.clientName,
    amount: input.amount,
    method: input.method,
    note: input.note ?? "",
    createdAt: serverTimestamp(),
  });
}

export function subscribeToPayments(onChange: (payments: Payment[]) => void) {
  const q = query(collection(db, "payments"), orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snap) => onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Payment))),
    () => onChange([])
  );
}

export function subscribeToPaymentsForQuote(quoteId: string, onChange: (payments: Payment[]) => void) {
  const q = query(collection(db, "payments"), where("quoteId", "==", quoteId));
  return onSnapshot(
    q,
    (snap) => onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Payment))),
    () => onChange([])
  );
}

export function totalPaid(payments: Payment[], quoteId: string) {
  return payments.filter((p) => p.quoteId === quoteId).reduce((sum, p) => sum + p.amount, 0);
}

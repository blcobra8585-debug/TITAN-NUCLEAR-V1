import jsPDF from "jspdf";

export interface InvoiceQuote {
  id: string;
  clientName: string;
  clientPhone?: string;
  projectType: string;
  tonnage: number;
  quotedAmount: number;
}

const GST_RATE = 0.18;
const COMPANY = {
  name: "MA Engineering",
  admin: "Suhan Siddiqui",
  phone: "+91 78956 43069",
  tagline: "EOT Cranes | Industrial Chimneys | Steel Structures | Boilers",
};

export function makeInvoiceNumber(quoteId: string) {
  const date = new Date();
  const stamp = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
  const shortId = quoteId.slice(-5).toUpperCase();
  return `MAE-${stamp}-${shortId}`;
}

export function generateInvoicePDF(quote: InvoiceQuote, invoiceNumber: string, amountPaid: number) {
  const doc = new jsPDF();
  const subtotal = quote.quotedAmount;
  // Fix(M6/M7): round to nearest rupee before any display or further arithmetic.
  // Floating-point ops on large amounts (e.g. 550000 * 0.18) produce values like
  // 99000.00000000001 which print inconsistently across toLocaleString calls.
  const gst = Math.round(subtotal * GST_RATE);
  const grandTotal = subtotal + gst;                      // subtotal is already an integer from Firestore
  const balance = Math.max(Math.round(grandTotal - amountPaid), 0);

  doc.setFontSize(18);
  doc.setTextColor(0, 120, 180);
  doc.text(COMPANY.name, 14, 20);
  doc.setFontSize(9);
  doc.setTextColor(90, 90, 90);
  doc.text(COMPANY.tagline, 14, 26);
  doc.text(`${COMPANY.admin} | ${COMPANY.phone}`, 14, 31);

  doc.setDrawColor(200, 200, 200);
  doc.line(14, 36, 196, 36);

  doc.setFontSize(14);
  doc.setTextColor(20, 20, 20);
  doc.text("TAX INVOICE", 14, 46);

  doc.setFontSize(10);
  doc.text(`Invoice No: ${invoiceNumber}`, 14, 54);
  doc.text(`Date: ${new Date().toLocaleDateString("en-IN")}`, 14, 60);

  doc.text(`Bill To: ${quote.clientName}`, 130, 54);
  if (quote.clientPhone) doc.text(`Phone: ${quote.clientPhone}`, 130, 60);

  doc.line(14, 66, 196, 66);

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Description", 14, 74);
  doc.text("Tonnage", 110, 74);
  doc.text("Amount (Rs.)", 155, 74);
  doc.setFont("helvetica", "normal");

  doc.text(quote.projectType, 14, 82);
  doc.text(`${quote.tonnage} T`, 110, 82);
  doc.text(subtotal.toLocaleString("en-IN"), 155, 82);

  doc.line(14, 90, 196, 90);

  let y = 98;
  doc.text("Subtotal", 130, y);
  doc.text(`Rs. ${subtotal.toLocaleString("en-IN")}`, 165, y);
  y += 7;
  doc.text("GST (18%)", 130, y);
  doc.text(`Rs. ${gst.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`, 165, y);
  y += 7;
  doc.setFont("helvetica", "bold");
  doc.text("Grand Total", 130, y);
  doc.text(`Rs. ${grandTotal.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`, 165, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  doc.text("Amount Paid", 130, y);
  doc.text(`Rs. ${amountPaid.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`, 165, y);
  y += 7;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(balance > 0 ? 200 : 20, balance > 0 ? 40 : 120, 40);
  doc.text("Balance Due", 130, y);
  doc.text(`Rs. ${balance.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`, 165, y);

  doc.setTextColor(90, 90, 90);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Payment Terms: 40% advance, 30% on dispatch, 30% on commissioning.", 14, y + 15);
  doc.text("This is a system-generated invoice from MA Engineering.", 14, y + 21);

  return { doc, grandTotal, balance };
}

export function downloadInvoicePDF(quote: InvoiceQuote, invoiceNumber: string, amountPaid: number) {
  const { doc } = generateInvoicePDF(quote, invoiceNumber, amountPaid);
  doc.save(`Invoice-${invoiceNumber}.pdf`);
}

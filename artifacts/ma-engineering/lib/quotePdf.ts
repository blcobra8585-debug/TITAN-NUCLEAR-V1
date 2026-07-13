/**
 * quotePdf.ts — MA Engineering PDF Quote Generator
 * Generates a professional quote PDF matching the company's physical letterhead.
 * Uses expo-print to render HTML → PDF.
 */

import { amountToWords, formatIndianNumber } from "@/lib/amountToWords";
import { getSecureItem } from "@/lib/security";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface QuoteLineItem {
  desc: string;
  qty: number;
  rate: number;
}

export interface QuoteTermItem {
  text: string;
  scope: "MAE" | "CLIENT"; // MAE SCOPE or [client name] SCOPE
}

export interface QuotePdfInput {
  // Client + project info
  clientName: string;
  projectType: string;
  site: string;

  // Line items
  lineItems: QuoteLineItem[];

  // Optional T&C overrides (defaults auto-loaded from admin if not passed)
  termItems?: QuoteTermItem[];
}

export interface BusinessProfile {
  gstin: string;
  ownerName: string;
  phone1: string;
  phone2: string;
  address: string;
  email: string;
  signatureUri: string; // base64 data URI or file URI
  paymentTerm1: string; // e.g. "10% After team reach on site"
  paymentTerm2: string; // e.g. "40% after erection of crane"
  paymentTerm3: string; // e.g. "50% after completing of job work"
}

export async function loadBusinessProfile(): Promise<BusinessProfile> {
  const keys = [
    "biz_gstin", "biz_owner_name", "biz_phone1", "biz_phone2",
    "biz_address", "biz_email", "biz_signature_uri",
    "biz_payment_term1", "biz_payment_term2", "biz_payment_term3",
  ];
  const pairs = await AsyncStorage.multiGet(keys).catch(() => [] as [string, string | null][]);
  const m: Record<string, string> = {};
  for (const [k, v] of pairs) if (v) m[k] = v;

  return {
    gstin:        m["biz_gstin"]         ?? "",
    ownerName:    m["biz_owner_name"]    ?? "Suhan Siddiqui",
    phone1:       m["biz_phone1"]        ?? "+917895643069",
    phone2:       m["biz_phone2"]        ?? "",
    address:      m["biz_address"]       ?? "MA Engineering, India",
    email:        m["biz_email"]         ?? "",
    signatureUri: m["biz_signature_uri"] ?? "",
    paymentTerm1: m["biz_payment_term1"] ?? "10% After team reach on site",
    paymentTerm2: m["biz_payment_term2"] ?? "40% after erection of crane",
    paymentTerm3: m["biz_payment_term3"] ?? "50% after completing of job work",
  };
}

function buildHtml(input: QuotePdfInput, biz: BusinessProfile): string {
  const total = input.lineItems.reduce((s, r) => s + r.qty * r.rate, 0);
  const clientUpper = input.clientName.toUpperCase();

  const defaultTerms: QuoteTermItem[] = [
    { text: "All tools and Tackles are", scope: "MAE" },
    { text: "Mobile crane for Erection & Dismantling are", scope: "MAE" },
    { text: "Arrangement of load are", scope: "CLIENT" },
    { text: "Boom lifter, Scaffolding are", scope: "CLIENT" },
    { text: "Electrical Engineer are", scope: "MAE" },
  ];
  const terms = input.termItems ?? defaultTerms;

  const rows = input.lineItems.map((item, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${item.desc}</td>
      <td>${item.qty}</td>
      <td>₹${formatIndianNumber(item.rate)}/-</td>
      <td>₹${formatIndianNumber(item.qty * item.rate)}/-</td>
    </tr>`).join("");

  const termRows = terms.map(t => {
    const scopeLabel = t.scope === "MAE" ? "<span class='mae-scope'>MAE SCOPE</span>" : `<span class='client-scope'>${clientUpper} SCOPE</span>`;
    return `<li>${t.text} ${scopeLabel}</li>`;
  }).join("");

  const sigBlock = biz.signatureUri
    ? `<img src="${biz.signatureUri}" style="width:120px;height:60px;object-fit:contain;margin-bottom:4px" /><br/>`
    : `<div style="height:60px;margin-bottom:4px"></div>`;

  const phone2Line = biz.phone2 ? `<div class="phone">${biz.phone2}</div>` : "";
  const emailLine = biz.email ? ` | Email: ${biz.email}` : "";
  const gstinLine = biz.gstin ? `<div class="gstin">GSTIN NO. : ${biz.gstin}</div>` : "";

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #000; padding: 28px 32px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px; }
  .company-name { font-size: 22px; font-weight: 900; letter-spacing: 2px; color: #0d2b6e; }
  .gstin { font-size: 10px; margin-top: 3px; }
  .contact { text-align: right; font-size: 11px; }
  .phone { font-weight: bold; }
  .address-bar { text-align: center; font-size: 10.5px; margin: 8px 0 6px; border-top: 1.5px solid #0d2b6e; border-bottom: 1.5px solid #0d2b6e; padding: 5px 0; }
  .to-block { margin: 10px 0 8px; }
  .to-block p { margin: 2px 0; font-size: 11px; }
  .dear { margin: 8px 0; font-weight: bold; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0; }
  th { background-color: #0d2b6e; color: #fff; padding: 6px 8px; font-size: 10px; text-transform: uppercase; }
  td { border: 1px solid #aaa; padding: 6px 8px; vertical-align: top; }
  th { border: 1px solid #0d2b6e; }
  tr:nth-child(even) td { background-color: #f5f8ff; }
  .total-row td { font-weight: 900; background-color: #e8eeff !important; font-size: 12px; }
  .amount-words { margin: 8px 0; font-style: italic; font-size: 11px; }
  .amount-words span { font-weight: bold; }
  .section-title { font-weight: 900; font-size: 11px; margin: 12px 0 4px; text-decoration: underline; }
  ul { margin-left: 16px; }
  li { margin: 3px 0; font-size: 11px; }
  .mae-scope { font-weight: bold; color: #0d2b6e; }
  .client-scope { font-weight: bold; color: #8B0000; }
  .sig-block { text-align: right; margin-top: 20px; }
  .sig-block .company { font-weight: 900; font-size: 11px; }
  .sig-block .proprietor { font-size: 10px; margin-top: 2px; }
</style>
</head>
<body>

<!-- HEADER -->
<div class="header">
  <div>
    <div class="company-name">MA ENGINEERING</div>
    ${gstinLine}
    <div style="font-size:10px;margin-top:2px">Crane & Steel Structure Specialists | 15+ Years</div>
  </div>
  <div class="contact">
    <div style="font-weight:900">${biz.ownerName}</div>
    <div class="phone">${biz.phone1}</div>
    ${phone2Line}
  </div>
</div>

<div class="address-bar">
  ${biz.address}${emailLine}
</div>

<!-- TO / SUB / SITE -->
<div class="to-block">
  <p><strong>TO–</strong> M/S ${input.clientName}</p>
  <p><strong>SUB–</strong> QUOTATION FOR ${input.projectType.toUpperCase()}</p>
  <p><strong>SITE–</strong> ${input.site || "As Discussed"}</p>
</div>

<p class="dear">DEAR SIR,</p>
<p style="margin-bottom:8px;font-size:11px">We are pleased to submit our quotation for the above-mentioned work as under:</p>

<!-- LINE ITEMS TABLE -->
<table>
  <thead>
    <tr>
      <th style="width:6%">S.NO</th>
      <th style="width:44%">DESCRIPTION OF WORK</th>
      <th style="width:8%">QTY</th>
      <th style="width:18%">RATE</th>
      <th style="width:18%">AMOUNT</th>
    </tr>
  </thead>
  <tbody>
    ${rows}
    <tr class="total-row">
      <td colspan="4" style="text-align:right">TOTAL</td>
      <td>₹${formatIndianNumber(total)}/-</td>
    </tr>
  </tbody>
</table>

<p class="amount-words">Amount in word — <span>${amountToWords(total)}</span></p>

<!-- TERMS & CONDITIONS -->
<p class="section-title">TERMS &amp; CONDITIONS :-</p>
<ul>${termRows}</ul>

<!-- PAYMENT TERMS -->
<p class="section-title">PAYMENT TERMS –</p>
<ul>
  <li>${biz.paymentTerm1}</li>
  <li>${biz.paymentTerm2}</li>
  <li>${biz.paymentTerm3}</li>
</ul>

<!-- SIGNATURE -->
<div class="sig-block">
  <div class="company">For M.A ENGINEERING</div>
  ${sigBlock}
  <div class="proprietor">Proprietor</div>
</div>

</body>
</html>`;
}

export async function generateQuotePdf(input: QuotePdfInput): Promise<string> {
  const biz = await loadBusinessProfile();
  const html = buildHtml(input, biz);

  // expo-print is dynamically imported so this lib stays testable without native modules
  const Print = await import("expo-print");
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  return uri; // local file:// URI to the generated PDF
}

export async function shareQuotePdf(input: QuotePdfInput): Promise<void> {
  const uri = await generateQuotePdf(input);
  // Use React Native's built-in Share (no extra package needed)
  const { Share } = await import("react-native");
  const result = await Share.share(
    {
      url: uri,
      title: `MA Engineering Quote — ${input.clientName}`,
      message: `MA Engineering Quote — ${input.clientName}`,
    },
    { dialogTitle: `MA Engineering Quote — ${input.clientName}` },
  );
  if (result.action === Share.dismissedAction) {
    // User cancelled — not an error
  }
}

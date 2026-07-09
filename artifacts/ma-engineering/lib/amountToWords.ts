/**
 * amountToWords — Indian numbering (Lakh / Crore)
 * Converts a numeric amount to its word form, e.g.
 *   836350  → "Eight Lakh Thirty Six Thousand Three Hundred Fifty Rupees Only"
 *   1500000 → "Fifteen Lakh Rupees Only"
 */

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];

const TENS = [
  "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety",
];

function wordify(n: number): string {
  if (n === 0) return "";
  if (n < 20) return ONES[n]!;
  if (n < 100) {
    const t = TENS[Math.floor(n / 10)]!;
    const o = ONES[n % 10]!;
    return o ? `${t} ${o}` : t;
  }
  if (n < 1000) {
    const h = ONES[Math.floor(n / 100)]!;
    const rest = wordify(n % 100);
    return rest ? `${h} Hundred ${rest}` : `${h} Hundred`;
  }
  if (n < 100000) {
    const th = wordify(Math.floor(n / 1000));
    const rest = wordify(n % 1000);
    return rest ? `${th} Thousand ${rest}` : `${th} Thousand`;
  }
  if (n < 10000000) {
    const lakh = wordify(Math.floor(n / 100000));
    const rest = wordify(n % 100000);
    return rest ? `${lakh} Lakh ${rest}` : `${lakh} Lakh`;
  }
  const crore = wordify(Math.floor(n / 10000000));
  const rest = wordify(n % 10000000);
  return rest ? `${crore} Crore ${rest}` : `${crore} Crore`;
}

export function amountToWords(amount: number): string {
  const whole = Math.floor(amount);
  const paise = Math.round((amount - whole) * 100);

  if (whole === 0 && paise === 0) return "Zero Rupees Only";

  const rupeesPart = wordify(whole);
  const paisePart = paise > 0 ? ` And ${wordify(paise)} Paise` : "";

  return `${rupeesPart} Rupees${paisePart} Only`;
}

/** Format number in Indian comma style: 8,36,350 */
export function formatIndianNumber(n: number): string {
  const s = Math.floor(n).toString();
  if (s.length <= 3) return s;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3);
  const formatted = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return `${formatted},${last3}`;
}

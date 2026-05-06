// Indian/Nepali numbering: ones, tens, hundred, thousand, lakh, crore, arab, kharab

const ones = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen',
];
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

const onesNe = ['', 'एक', 'दुई', 'तीन', 'चार', 'पाँच', 'छ', 'सात', 'आठ', 'नौ'];

const twoDigit = (n: number): string => {
  if (n < 20) return ones[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return tens[t] + (o ? ' ' + ones[o] : '');
};

const threeDigit = (n: number): string => {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  let s = '';
  if (h) s += ones[h] + ' Hundred';
  if (rest) s += (s ? ' ' : '') + twoDigit(rest);
  return s;
};

/** Convert number to Indian/Nepali system English text (Lakh, Crore, Arab, Kharab). */
export const numberToNepaliEnglishWords = (num: number): string => {
  if (!isFinite(num)) return '';
  if (num === 0) return 'Zero';
  const negative = num < 0;
  let n = Math.abs(Math.floor(num));
  const decimals = Math.round((Math.abs(num) - n) * 100);

  const parts: string[] = [];
  const units = [
    { value: 1_00_00_00_00_00_000, name: 'Kharab' }, // not realistic, but supports it
    { value: 1_00_00_00_000, name: 'Arab' },
    { value: 1_00_00_000, name: 'Crore' },
    { value: 1_00_000, name: 'Lakh' },
    { value: 1_000, name: 'Thousand' },
  ];
  for (const u of units) {
    if (n >= u.value) {
      const count = Math.floor(n / u.value);
      n = n % u.value;
      parts.push(`${threeDigit(count)} ${u.name}`);
    }
  }
  if (n > 0) parts.push(threeDigit(n));
  let result = parts.join(' ').replace(/\s+/g, ' ').trim();
  if (decimals > 0) result += ` and ${twoDigit(decimals)} Paisa`;
  if (negative) result = 'Minus ' + result;
  return result;
};

/** Convert digits 0-9 to Devanagari ०-९. */
export const toDevanagari = (input: number | string): string => {
  const map: Record<string, string> = { '0': '०', '1': '१', '2': '२', '3': '३', '4': '४', '5': '५', '6': '६', '7': '७', '8': '८', '9': '९' };
  return String(input).split('').map(c => map[c] ?? c).join('');
};

/* ---------------- Land Measurement ----------------
 * Hill (Pahadi) system: 1 Ropani = 16 Aana = 64 Paisa = 256 Daam
 * 1 Ropani = 5476 sq.ft = 508.737 sq.m
 * Terai system: 1 Bigha = 20 Kattha = 400 Dhur
 * 1 Bigha = 72900 sq.ft = 6772.63 sq.m
 */

export const ROPANI_SQFT = 5476;
export const AANA_SQFT = 5476 / 16; // 342.25
export const PAISA_SQFT = 5476 / 64; // 85.5625
export const DAAM_SQFT = 5476 / 256; // 21.390625

export const BIGHA_SQFT = 72900;
export const KATTHA_SQFT = 72900 / 20; // 3645
export const DHUR_SQFT = 72900 / 400; // 182.25

export const SQFT_TO_SQM = 0.092903;

/** Convert Hill (Ropani/Aana/Paisa/Daam) to total sqft. */
export const hillToSqft = (ropani: number, aana: number, paisa: number, daam: number): number =>
  ropani * ROPANI_SQFT + aana * AANA_SQFT + paisa * PAISA_SQFT + daam * DAAM_SQFT;

/** Convert sqft to Hill components. */
export const sqftToHill = (sqft: number) => {
  let remaining = sqft;
  const ropani = Math.floor(remaining / ROPANI_SQFT); remaining -= ropani * ROPANI_SQFT;
  const aana = Math.floor(remaining / AANA_SQFT); remaining -= aana * AANA_SQFT;
  const paisa = Math.floor(remaining / PAISA_SQFT); remaining -= paisa * PAISA_SQFT;
  const daam = +(remaining / DAAM_SQFT).toFixed(2);
  return { ropani, aana, paisa, daam };
};

/** Convert Terai (Bigha/Kattha/Dhur) to total sqft. */
export const teraiToSqft = (bigha: number, kattha: number, dhur: number): number =>
  bigha * BIGHA_SQFT + kattha * KATTHA_SQFT + dhur * DHUR_SQFT;

/** Convert sqft to Terai components. */
export const sqftToTerai = (sqft: number) => {
  let remaining = sqft;
  const bigha = Math.floor(remaining / BIGHA_SQFT); remaining -= bigha * BIGHA_SQFT;
  const kattha = Math.floor(remaining / KATTHA_SQFT); remaining -= kattha * KATTHA_SQFT;
  const dhur = +(remaining / DHUR_SQFT).toFixed(2);
  return { bigha, kattha, dhur };
};
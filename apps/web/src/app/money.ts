/**
 * Display-side money and hours helpers. Integer minor units only, never floats
 * (PRD US-04). PHP is held in centavos, hours in tenths, XLM in stroops (BigInt).
 * These format fictional preview values; they are not a payroll engine.
 */

export type Centavos = number; // integer PHP minor units
export type HourTenths = number; // integer tenths of an hour (38.5 h = 385)

function assertInt(n: number, what: string) {
  if (!Number.isSafeInteger(n)) throw new Error(`${what} must be a safe integer`);
}

/** Group an integer string with commas, e.g. 1234567 → "1,234,567". */
function group(digits: string) {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** `PHP 12,450.00`: always two decimals, never rounded or abbreviated. */
export function formatPhp(centavos: Centavos, { symbol = false } = {}) {
  assertInt(centavos, "centavos");
  const sign = centavos < 0 ? "−" : "";
  const abs = Math.abs(centavos);
  const whole = group(String(Math.floor(abs / 100)));
  const frac = String(abs % 100).padStart(2, "0");
  return `${sign}${symbol ? "₱" : "PHP "}${whole}.${frac}`;
}

/** Number part only (for amount components that render the code separately). */
export function phpNumber(centavos: Centavos) {
  return formatPhp(centavos).replace("PHP ", "");
}

/** Screen-reader text: "12,450 Philippine pesos and 50 centavos". */
export function phpSpoken(centavos: Centavos) {
  assertInt(centavos, "centavos");
  const abs = Math.abs(centavos);
  const pesos = group(String(Math.floor(abs / 100)));
  const cents = abs % 100;
  return `${centavos < 0 ? "minus " : ""}${pesos} Philippine pesos${cents ? ` and ${cents} centavos` : ""}`;
}

export function formatHours(tenths: HourTenths) {
  assertInt(tenths, "hour tenths");
  const sign = tenths < 0 ? "−" : "";
  const abs = Math.abs(tenths);
  return `${sign}${Math.floor(abs / 10)}.${abs % 10} h`;
}

/**
 * hours × hourly rate, exact. hourTenths × rateCentavos / 10, rounded half-up to
 * the centavo. Rounding is explicit and only occurs when the rate is not a whole
 * multiple of 10 centavos.
 */
export function hourlyPay(hours: HourTenths, rate: Centavos): Centavos {
  assertInt(hours, "hour tenths");
  assertInt(rate, "rate centavos");
  const product = hours * rate;
  assertInt(product, "pay product");
  const q = Math.trunc(product / 10);
  const r = product - q * 10;
  return r >= 5 ? q + 1 : r <= -5 ? q - 1 : q;
}

export function sum(values: number[]) {
  return values.reduce((a, b) => {
    const s = a + b;
    assertInt(s, "sum");
    return s;
  }, 0);
}

const STROOPS = 10_000_000n;
/** `1.5000000 XLM · Testnet`: seven decimals, asset code and network label every time. */
export function formatXlm(stroops: bigint, { network = true } = {}) {
  const neg = stroops < 0n;
  const abs = neg ? -stroops : stroops;
  const whole = group((abs / STROOPS).toString());
  const frac = (abs % STROOPS).toString().padStart(7, "0");
  return `${neg ? "−" : ""}${whole}.${frac} XLM${network ? " · Testnet" : ""}`;
}

/** Parse a decimal XLM string ("1.5") to stroops without floats. */
export function xlmToStroops(value: string): bigint {
  const m = /^(\d+)(?:\.(\d{1,7}))?$/.exec(value.trim());
  if (!m) throw new Error(`Invalid XLM amount: ${value}`);
  return BigInt(m[1]) * STROOPS + BigInt((m[2] ?? "").padEnd(7, "0"));
}

/** Middle-truncate hashes and addresses: `GABC…X7Q2`. */
export function middle(value: string, head = 6, tail = 4) {
  return value.length <= head + tail + 1
    ? value
    : `${value.slice(0, head)}…${value.slice(-tail)}`;
}

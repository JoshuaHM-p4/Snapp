import { describe, expect, it } from "vitest";
import {
  formatHours,
  formatPhp,
  formatXlm,
  hourlyPay,
  middle,
  phpSpoken,
  sum,
  xlmToStroops,
} from "./money";

describe("money helpers", () => {
  it("formats PHP with two decimals and grouping, never rounding", () => {
    expect(formatPhp(1_245_000)).toBe("PHP 12,450.00");
    expect(formatPhp(5)).toBe("PHP 0.05");
    expect(formatPhp(-20_000)).toBe("−PHP 200.00");
    expect(formatPhp(18_432_000, { symbol: true })).toBe("₱184,320.00");
  });
  it("refuses fractional minor units", () => {
    expect(() => formatPhp(10.5)).toThrow();
    expect(() => hourlyPay(380.2, 30000)).toThrow();
  });
  it("multiplies hours and rates exactly in integers", () => {
    expect(hourlyPay(800, 45_000)).toBe(3_600_000); // 80.0 h × PHP 450.00
    expect(hourlyPay(380, 30_000)).toBe(1_140_000); // 38.0 h × PHP 300.00
    expect(hourlyPay(1, 12_345)).toBe(1_235); // 0.1 h × PHP 123.45 = 12.345 → half-up
    expect(hourlyPay(1, 12_344)).toBe(1_234);
  });
  it("sums integers", () => {
    expect(sum([1_140_000, 960_000])).toBe(2_100_000);
  });
  it("formats hours from tenths", () => {
    expect(formatHours(385)).toBe("38.5 h");
    expect(formatHours(-20)).toBe("−2.0 h");
  });
  it("speaks amounts in full", () => {
    expect(phpSpoken(1_245_050)).toBe("12,450 Philippine pesos and 50 centavos");
  });
  it("formats XLM in stroops with the Testnet label", () => {
    expect(formatXlm(15_000_000n)).toBe("1.5000000 XLM · Testnet");
    expect(formatXlm(xlmToStroops("0.0000100"), { network: false })).toBe("0.0000100 XLM");
    expect(() => xlmToStroops("1.12345678")).toThrow();
    expect(() => xlmToStroops("1e3")).toThrow();
  });
  it("middle-truncates hashes", () => {
    expect(middle("GCGBYAA7T3JPLZ2JLJUY5F7G352Q47UPVUN3DUUQZRJGF37LJEMUKCBX", 4, 4)).toBe("GCGB…KCBX");
  });
});

/** Example simulation amounts, not market prices. */
export const MONEY_SCALE = 10;
export const INITIAL_BILL = 10_000;
export const INITIAL_BUDGET = 2_500;
export const ROUND_REWARD_RATE = 0.25;
export const FINAL_SALES_INCOME = 7_500;
export const ROUND_REWARD_CAP = 500;
export const LARGE_PURCHASE_SHARE = 0.3;
/** Charged once per item whose first sorting answer is wrong. */
export const SORT_MISTAKE_PENALTY = 50;
const money = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 });
export const fmtMoney = (value: number) =>
  `${value < 0 ? "-" : ""}₺${money.format(Math.abs(value))}`;
export const signedMoney = (value: number) =>
  `${value > 0 ? "+" : ""}${fmtMoney(value)}`;
export const SIMULATION_NOTE =
  "Ürün bedelleri piyasa referanslarına dayanır. Gider ve tasarruf tutarları örnek senaryodur; gerçek kullanımda değişir.";

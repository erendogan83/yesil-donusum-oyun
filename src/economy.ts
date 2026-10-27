/** Example simulation amounts, not market prices. */
export const MONEY_SCALE = 10;
export const INITIAL_BILL = 10_000;
export const INITIAL_BUDGET = 10_000;
/** Legacy games only: new games pay for savings the moment a good item is installed. */
export const ROUND_REWARD_RATE = 0.25;
/** Money paid for every lira of monthly bill an installed item saves (1 = lira for lira). */
export const SAVING_PAYOUT_RATE = 1;
export const FINAL_SALES_INCOME = 7_500;
export const ROUND_REWARD_CAP = 500;
export const LARGE_PURCHASE_SHARE = 0.3;
/** Timed play (official and room games): seconds allowed per room and period. */
export const TIME_LIMIT_S = 60;
/** Earned for every second left on the clock when a room is finished early. */
export const EARLY_BONUS = 5;
/** Charged for every second beyond the limit while the room is still unfinished. */
export const OVERTIME_COST = 5;
/** Room play: seconds the host has to start the game, and what one "add time" press gives. */
export const ROOM_START_S = 120;
export const ROOM_EXTEND_S = 60;
/** Charged once per item whose first sorting answer is wrong. */
export const SORT_MISTAKE_PENALTY = 50;
const money = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 });
export const fmtMoney = (value: number) =>
  `${value < 0 ? "-" : ""}₺${money.format(Math.abs(value))}`;
export const signedMoney = (value: number) =>
  `${value > 0 ? "+" : ""}${fmtMoney(value)}`;
export const SIMULATION_NOTE =
  "Ürün bedelleri piyasa referanslarına dayanır. Gider ve tasarruf tutarları örnek senaryodur; gerçek kullanımda değişir.";

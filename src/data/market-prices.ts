import data from "./market-prices.json";
import { fmtMoney } from "../economy";
export interface MarketPrice {
  id: string;
  displayName: string;
  priceTL: number | null;
  referencePriceTL: number | null;
  referenceDate: string;
  referenceProduct: string;
  referenceSpecification: string;
  referenceSource: string;
  priceStatus: string;
  note: string;
  provenance?: string;
  previousPriceTL?: number;
}
export const marketPrices = data.catalog as Record<string, MarketPrice>;
export const priceAliases = data.aliases as Record<string, string>;
export const marketPrice = (id: string) => marketPrices[priceAliases[id] ?? id];
export const existingFixture = (id: string) =>
  priceAliases[id] === "existing_incandescent";
export const priceAvailable = (id: string) => marketPrice(id)?.priceTL != null;
export const priceLabel = (id: string, historicalPrice: number) => {
  const p = marketPrice(id);
  return p
    ? p.priceTL === null
      ? "Fiyat inceleniyor"
      : fmtMoney(p.priceTL)
    : fmtMoney(historicalPrice);
};

export const historicalLegacyPrices: Record<string, number> =
  data.historicalLegacyPrices;

/**
 * DealMachine API helper
 * Used by the AI agent to look up property estimated values in real time.
 * API docs: https://docs.dealmachine.com/
 *
 * The AI calls lookupPropertyValue(address) during the price_ask stage.
 * Returns the EstimatedValue from DealMachine's AVM, or null if unavailable.
 */

const DEALMACHINE_API_KEY = process.env.DEALMACHINE_API_KEY ?? "";
const DEALMACHINE_BASE = "https://api.dealmachine.com/public/v1";

export interface DealMachineProperty {
  leadId: number;
  estimatedValue: number | null;
  buyPrice: number | null; // estimatedValue * 0.65, rounded to whole number
  address: string;
}

/**
 * Look up a property by address and return the estimated value + calculated buy price.
 * Buy price = EstimatedValue × 65% (max we pay), rounded to nearest whole dollar.
 *
 * Returns null if the API key is not configured or the property is not found.
 */
export async function lookupPropertyValue(
  address: string,
  city: string,
  state: string,
  zip: string
): Promise<DealMachineProperty | null> {
  if (!DEALMACHINE_API_KEY) {
    console.warn("[DealMachine] API key not configured — skipping property lookup");
    return null;
  }

  try {
    const formData = new FormData();
    formData.append("address", address);
    formData.append("city", city);
    formData.append("state", state);
    formData.append("zip", zip);

    const response = await fetch(`${DEALMACHINE_BASE}/leads/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${DEALMACHINE_API_KEY}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`[DealMachine] API error ${response.status}: ${text}`);
      return null;
    }

    const json = (await response.json()) as {
      error: boolean;
      data: {
        id: number;
        EstimatedValue?: number | null;
        property_address_full?: string;
      };
    };

    if (json.error || !json.data) {
      console.error("[DealMachine] API returned error:", json);
      return null;
    }

    const estimatedValue = json.data.EstimatedValue ?? null;
    const buyPrice =
      estimatedValue !== null
        ? Math.round(estimatedValue * 0.65)
        : null;

    return {
      leadId: json.data.id,
      estimatedValue,
      buyPrice,
      address: json.data.property_address_full ?? `${address}, ${city}, ${state} ${zip}`,
    };
  } catch (err) {
    console.error("[DealMachine] Unexpected error during property lookup:", err);
    return null;
  }
}

/**
 * Format a dollar amount as a whole-number string with commas.
 * e.g. 125000 → "$125,000"
 */
export function formatDollars(amount: number): string {
  return `$${amount.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

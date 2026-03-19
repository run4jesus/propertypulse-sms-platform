/**
 * DealMachine API helper
 * Used by the AI agent to look up property estimated values in real time.
 * API docs: https://docs.dealmachine.com/
 *
 * The AI calls lookupPropertyValue(address) during the price_ask stage.
 * Returns the EstimatedValue from DealMachine's AVM, or null if unavailable.
 *
 * DealMachine deduplication: if a property is already in your account,
 * the POST /leads/ endpoint returns { error: false, data: [], message: "already added" }.
 * In that case we fall back to GET /leads/?search=<address> to retrieve the existing lead.
 */

const DEALMACHINE_API_KEY = process.env.DEALMACHINE_API_KEY ?? "";
const DEALMACHINE_BASE = "https://api.dealmachine.com/public/v1";

export interface DealMachineProperty {
  leadId: number;
  estimatedValue: number | null;
  buyPrice: number | null; // estimatedValue * 0.65, rounded to whole number
  address: string;
}

interface DealMachineLead {
  id: number;
  EstimatedValue?: number | null;
  property_address_full?: string;
}

interface DealMachineAddResponse {
  error: boolean;
  message?: string;
  data: DealMachineLead | DealMachineLead[] | null;
}

interface DealMachineListResponse {
  error: boolean;
  data: DealMachineLead[];
  count?: number;
}

/**
 * Build a DealMachineProperty result from a raw lead object.
 */
function buildResult(
  lead: DealMachineLead,
  address: string,
  city: string,
  state: string,
  zip: string
): DealMachineProperty {
  const estimatedValue = lead.EstimatedValue ?? null;
  const buyPrice =
    estimatedValue !== null ? Math.round(estimatedValue * 0.65) : null;
  return {
    leadId: lead.id,
    estimatedValue,
    buyPrice,
    address: lead.property_address_full ?? `${address}, ${city}, ${state} ${zip}`,
  };
}

/**
 * Look up a property by address and return the estimated value + calculated buy price.
 * Buy price = EstimatedValue × 65% (max we pay), rounded to nearest whole dollar.
 *
 * Returns null if the API key is not configured or the property cannot be found.
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
    // ── Step 1: Try to add the property (also returns data if new) ────────────
    const formData = new FormData();
    formData.append("address", address);
    formData.append("city", city);
    formData.append("state", state);
    formData.append("zip", zip);

    const addResp = await fetch(`${DEALMACHINE_BASE}/leads/`, {
      method: "POST",
      headers: { Authorization: `Bearer ${DEALMACHINE_API_KEY}` },
      body: formData,
    });

    if (!addResp.ok) {
      const text = await addResp.text();
      console.error(`[DealMachine] Add lead error ${addResp.status}: ${text}`);
      return null;
    }

    const addJson = (await addResp.json()) as DealMachineAddResponse;

    // Happy path: new property added, data is a single lead object
    if (!addJson.error && addJson.data && !Array.isArray(addJson.data)) {
      const lead = addJson.data as DealMachineLead;
      if (lead.id) {
        console.log(`[DealMachine] New lead created: id=${lead.id}`);
        return buildResult(lead, address, city, state, zip);
      }
    }

    // ── Step 2: Property already exists — search for the existing lead ────────
    const isDuplicate =
      !addJson.error &&
      (Array.isArray(addJson.data)
        ? addJson.data.length === 0
        : !addJson.data);

    if (isDuplicate) {
      console.log(`[DealMachine] Property already in account — searching for existing lead`);
      const searchQuery = encodeURIComponent(`${address} ${city} ${state} ${zip}`);
      const searchResp = await fetch(
        `${DEALMACHINE_BASE}/leads/?search=${searchQuery}&limit=5`,
        {
          method: "GET",
          headers: { Authorization: `Bearer ${DEALMACHINE_API_KEY}` },
        }
      );

      if (!searchResp.ok) {
        const text = await searchResp.text();
        console.error(`[DealMachine] Search error ${searchResp.status}: ${text}`);
        return null;
      }

      const searchJson = (await searchResp.json()) as DealMachineListResponse;
      const leads = searchJson.data ?? [];

      if (leads.length > 0) {
        const lead = leads[0];
        console.log(`[DealMachine] Found existing lead: id=${lead.id}, estimatedValue=${lead.EstimatedValue}`);
        return buildResult(lead, address, city, state, zip);
      }

      console.warn("[DealMachine] Property already in account but search returned no results");
      return null;
    }

    console.error("[DealMachine] Unexpected response from add lead:", addJson);
    return null;
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

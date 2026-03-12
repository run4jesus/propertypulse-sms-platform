/**
 * Podio External Leads Integration
 * Posts lead data directly to the Podio webform for the MHS CRM External Leads app.
 * Webform URL: https://podio.com/webforms/26979599/2064774
 *
 * Field mapping:
 *   fields[title]                                                    → First Name
 *   fields[last-name]                                                → Last Name
 *   fields[phone-number][][type]                                     → "Mobile"
 *   fields[phone-number][][value]                                    → Phone
 *   fields[property-address-map]                                     → Property Address
 *   fields[lead-source]                                              → "SMS Callbacks"
 *   fields[temperature]                                              → "HOT" | "Warm"
 *   fields[details-condition-reason-for-selling-how-soon-they-want]  → Conversation thread
 */

export interface PodioLeadPayload {
  firstName: string;
  lastName: string;
  phone: string;
  propertyAddress: string;
  temperature: "HOT" | "Warm";
  conversationThread: string;
  webformUrl?: string;
}

export async function pushLeadToPodio(payload: PodioLeadPayload): Promise<{ success: boolean; error?: string }> {
  const webformUrl = payload.webformUrl || "https://podio.com/webforms/26979599/2064774";

  // First fetch the form to get the authenticity_token (CSRF token)
  let authenticityToken = "";
  try {
    const formPage = await fetch(webformUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; LotPulseSMS/1.0)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    const html = await formPage.text();
    const tokenMatch = html.match(/name="authenticity_token"\s+value="([^"]+)"/);
    if (tokenMatch) {
      authenticityToken = tokenMatch[1];
    }
  } catch (err) {
    console.error("[Podio] Failed to fetch form page for CSRF token:", err);
    // Proceed without token — some webforms don't require it
  }

  const body = new URLSearchParams();
  body.set("utf8", "✓");
  if (authenticityToken) body.set("authenticity_token", authenticityToken);

  // Name fields
  body.set("fields[title]", payload.firstName || "");
  body.set("fields[last-name]", payload.lastName || "");

  // Phone
  body.set("fields[phone-number][][type]", "Mobile");
  body.set("fields[phone-number][][value]", payload.phone || "");

  // Property address
  body.set("fields[property-address-map]", payload.propertyAddress || "");

  // Lead source — "SMS Callbacks" is the closest option in the dropdown
  body.set("fields[lead-source]", "SMS Callbacks");

  // Temperature — HOT or Warm
  body.set("fields[temperature]", payload.temperature);

  // Conversation thread in the Details / Notes field
  body.set(
    "fields[details-condition-reason-for-selling-how-soon-they-want]",
    payload.conversationThread || ""
  );

  try {
    const resp = await fetch(webformUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 (compatible; LotPulseSMS/1.0)",
        Referer: webformUrl,
        Origin: "https://podio.com",
      },
      body: body.toString(),
      redirect: "follow",
    });

    // Podio webforms return a redirect or a success page on success
    if (resp.ok || resp.status === 302 || resp.redirected) {
      const responseText = await resp.text();
      // Check for error indicators in the response
      if (responseText.includes("error") && responseText.includes("required")) {
        console.error("[Podio] Form submission returned validation error");
        return { success: false, error: "Podio form validation error — check required fields" };
      }
      console.log(`[Podio] Lead pushed successfully: ${payload.firstName} ${payload.lastName} (${payload.phone})`);
      return { success: true };
    } else {
      const errText = await resp.text();
      console.error(`[Podio] Form submission failed: ${resp.status}`, errText.slice(0, 200));
      return { success: false, error: `HTTP ${resp.status}` };
    }
  } catch (err: any) {
    console.error("[Podio] Push error:", err);
    return { success: false, error: err?.message || "Unknown error" };
  }
}

/**
 * Build a readable conversation thread string from messages array.
 */
export function buildConversationThread(
  msgs: Array<{ direction: string; body: string; createdAt: Date | string }>
): string {
  return msgs
    .map((m) => {
      const ts = new Date(m.createdAt).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      const speaker = m.direction === "outbound" ? "Agent" : "Seller";
      return `[${ts}] ${speaker}: ${m.body}`;
    })
    .join("\n");
}

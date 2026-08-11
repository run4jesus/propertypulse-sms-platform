/** TextGrid's Twilio-compatible outbound SMS transport. */
export async function sendTextGridSms(opts: {
  accountSid: string;
  authToken: string;
  from: string;
  to: string;
  body: string;
}): Promise<{ sid: string; status: string } | null> {
  try {
    const baseUrl = `https://api.textgrid.com/2010-04-01/Accounts/${opts.accountSid}/Messages.json`;
    const params = new URLSearchParams({
      From: opts.from,
      To: opts.to,
      Body: opts.body,
    });
    const credentials = Buffer.from(`${opts.accountSid}:${opts.authToken}`).toString("base64");
    const response = await fetch(baseUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });
    if (!response.ok) {
      const detail = await response.text();
      console.error("[TextGrid] Send failed:", detail.slice(0, 500));
      return null;
    }
    return (await response.json()) as { sid: string; status: string };
  } catch (error) {
    console.error("[TextGrid] Send error:", error);
    return null;
  }
}

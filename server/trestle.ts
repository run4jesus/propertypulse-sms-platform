export type TrestleLineType = "mobile" | "landline" | "voip" | "unknown";

export type TrestlePhoneResult = {
  phone: string;
  lineType: TrestleLineType;
  activityScore: number | null;
  carrier: string | null;
  isValid: boolean | null;
};

function normalizeUsPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1);
  return digits.length === 10 ? digits : "";
}

function mapLineType(lineType: unknown): TrestleLineType {
  const normalized = String(lineType ?? "").toLowerCase();
  if (normalized === "mobile") return "mobile";
  if (normalized.includes("voip")) return "voip";
  if (normalized === "landline" || normalized === "tollfree" || normalized === "premium" || normalized === "voicemail") return "landline";
  return "unknown";
}

export async function classifyPhoneWithTrestle(phone: string): Promise<TrestlePhoneResult> {
  const normalizedPhone = normalizeUsPhone(phone);
  if (!normalizedPhone || !process.env.TRESTLE_API_KEY) {
    return { phone, lineType: "unknown", activityScore: null, carrier: null, isValid: null };
  }

  const response = await fetch(`https://api.trestleiq.com/3.0/phone_intel?phone=${normalizedPhone}`, {
    headers: { "x-api-key": process.env.TRESTLE_API_KEY, Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`Trestle lookup failed with HTTP ${response.status}`);

  const payload = await response.json() as {
    phone_number?: string;
    line_type?: string;
    activity_score?: number;
    carrier?: string;
    is_valid?: boolean;
  };
  return {
    phone: payload.phone_number ?? phone,
    lineType: mapLineType(payload.line_type),
    activityScore: typeof payload.activity_score === "number" ? payload.activity_score : null,
    carrier: payload.carrier ?? null,
    isValid: typeof payload.is_valid === "boolean" ? payload.is_valid : null,
  };
}

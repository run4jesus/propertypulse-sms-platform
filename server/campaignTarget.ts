export type CampaignPhoneField = "phone" | "phone2" | "phone3" | "first_eligible_mobile";
export type PhoneLineType = "mobile" | "landline" | "voip" | "unknown" | null | undefined;

type PhoneCandidate = {
  field: "phone" | "phone2" | "phone3";
  phone: string | null | undefined;
  lineType: PhoneLineType;
};

export function selectCampaignTargetPhone(
  contact: {
    phone: string | null;
    phone2?: string | null;
    phone3?: string | null;
    phone1LineType?: PhoneLineType;
    phone2LineType?: PhoneLineType;
    phone3LineType?: PhoneLineType;
  },
  phoneField: CampaignPhoneField = "first_eligible_mobile",
): PhoneCandidate | null {
  const candidates: PhoneCandidate[] = [
    { field: "phone", phone: contact.phone, lineType: contact.phone1LineType ?? "unknown" },
    { field: "phone2", phone: contact.phone2, lineType: contact.phone2LineType ?? "unknown" },
    { field: "phone3", phone: contact.phone3, lineType: contact.phone3LineType ?? "unknown" },
  ];

  if (phoneField !== "first_eligible_mobile") {
    const selected = candidates.find((candidate) => candidate.field === phoneField);
    return selected?.phone && !["landline", "voip"].includes(selected.lineType ?? "unknown") ? selected : null;
  }

  // Prefer a confirmed mobile number. If lookup is still pending, use the first
  // unclassified number so a campaign is not blocked; confirmed landline/VoIP
  // numbers are never eligible.
  const available = candidates.filter((candidate) => Boolean(candidate.phone) && !["landline", "voip"].includes(candidate.lineType ?? "unknown"));
  return available.find((candidate) => candidate.lineType === "mobile")
    ?? available.find((candidate) => candidate.lineType === "unknown")
    ?? null;
}

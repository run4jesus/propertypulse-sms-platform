import { describe, expect, it } from "vitest";
import { selectCampaignTargetPhone } from "./campaignTarget";

describe("selectCampaignTargetPhone", () => {
  it("uses Phone 1 when it is a mobile", () => {
    expect(selectCampaignTargetPhone({ phone: "111", phone2: "222", phone1LineType: "mobile", phone2LineType: "mobile" }))
      .toMatchObject({ field: "phone", phone: "111" });
  });

  it("skips a landline Phone 1 and uses a mobile Phone 2", () => {
    expect(selectCampaignTargetPhone({ phone: "111", phone2: "222", phone1LineType: "landline", phone2LineType: "mobile" }))
      .toMatchObject({ field: "phone2", phone: "222" });
  });

  it("skips landline and VoIP candidates before choosing Phone 3", () => {
    expect(selectCampaignTargetPhone({ phone: "111", phone2: "222", phone3: "333", phone1LineType: "landline", phone2LineType: "voip", phone3LineType: "mobile" }))
      .toMatchObject({ field: "phone3", phone: "333" });
  });

  it("uses an unclassified number only when no confirmed mobile is available", () => {
    expect(selectCampaignTargetPhone({ phone: "111", phone2: "222", phone1LineType: "unknown", phone2LineType: "mobile" }))
      .toMatchObject({ field: "phone2", phone: "222" });
  });
});

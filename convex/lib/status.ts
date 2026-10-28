// Campaign status from the dates (D-6) and the notification rule for «Главная» (D-5). Computed, never stored.
import { SOON_END_DAYS } from "./config";
import { diffDays, type DateStr } from "./time";

export type CampaignStatus = "planned" | "active" | "finished";
export type Notification = { kind: "screen_offline" | "campaign_ending"; refId: string; name: string };

export function campaignStatus(c: { startDate: DateStr; endDate: DateStr }, today: DateStr): CampaignStatus {
  if (today < c.startDate) return "planned";
  return today > c.endDate ? "finished" : "active";
}

export function notifications(
  screens: { _id: string; name: string; status: "online" | "offline" }[],
  campaigns: { _id: string; name: string; endDate: DateStr }[],
  today: DateStr,
): Notification[] {
  const offline = screens
    .filter((s) => s.status === "offline")
    .map((s): Notification => ({ kind: "screen_offline", refId: s._id, name: s.name }));
  const ending = campaigns
    .filter((c) => {
      const left = diffDays(today, c.endDate);
      return left >= 0 && left <= SOON_END_DAYS;
    })
    .sort((a, b) => a.endDate.localeCompare(b.endDate))
    .map((c): Notification => ({ kind: "campaign_ending", refId: c._id, name: c.name }));
  return [...offline, ...ending];
}

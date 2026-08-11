# LotPulse SMS Production Hardening Review

## Scope and current posture

This review focused on the highest-risk paths in LotPulse SMS: delayed AI replies, campaign dispatching, inbound and delivery-status callbacks, identity boundaries, and integration-secret exposure. The completed work improves the application's ability to recover from restarts, prevents common duplicate-SMS paths, and limits access to customer data and integration credentials.

## Implemented safeguards

| Area | Safeguard | Result |
|---|---|---|
| Delayed AI replies | Database-backed `ai_reply_queue` with atomic claiming, queue status, scheduled time, lease metadata, provider response ID, and failure reason | AI replies survive process restarts and deploys instead of waiting inside server memory. |
| Business hours | Queue rows received outside configured business hours wait silently until the next open window, then receive the configured random delay | The AI does not send outside the owner's saved hours, and after-hours messages are not lost. |
| Campaign scheduling | Removed the in-process `setInterval` tick and added an authenticated `/api/scheduled/sms-dispatch` handler | Campaign batches, follow-ups, and queued AI replies are ready for platform-managed scheduled processing. |
| Webhook authentication | Added `TEXTGRID_WEBHOOK_SECRET` validation for inbound and delivery-status callbacks | Production callbacks reject requests without the private query token or request header. |
| Webhook idempotency | Added `webhook_events` receipts plus unique provider SIDs on messages | Repeated provider callbacks cannot create duplicate inbound messages, AI replies, or delivery counters. |
| Manual replies | Messenger manual-send now checks conversation ownership, opt-out state, credentials, assigned sender number, and TextGrid send confirmation | A manual reply is sent through TextGrid before it is recorded as sent. |
| Authorization | Added ownership checks for message reads/sends, labels, lists, contacts, conversations, and sender numbers | A user cannot use arbitrary record IDs to access or mutate another user's data in the covered paths. |
| Secret exposure | Sanitized `auth.me` so the browser receives identity fields only | TextGrid, Podio, TCPA, and private AI configuration remain server-side. |

## Required activation steps

The durable dispatcher must be activated only after the current checkpoint is published. Once deployed, create one project-level platform heartbeat job using the following values:

| Setting | Value |
|---|---|
| Name | `sms-dispatch` |
| Cron | `0 * * * * *` |
| Path | `/api/scheduled/sms-dispatch` |
| Method | `POST` |
| Purpose | Process campaign batches, existing follow-ups, and due AI replies once per minute. |

The active production dispatcher task ID is **`7s3HSoaCJgADQYbfRRhZc7`**. Retain this ID for pause, resume, log review, or deletion.

Existing TextGrid numbers must point to the production callback URLs below. Keep the token private; do not paste it in message text, CSV files, or public documentation.

```text
https://lotpulsesms-zmwera2y.manus.space/api/sms/inbound?token=<TEXTGRID_WEBHOOK_SECRET>
https://lotpulsesms-zmwera2y.manus.space/api/sms/status?token=<TEXTGRID_WEBHOOK_SECRET>
```

New numbers purchased inside LotPulse are configured with these authenticated callback URLs automatically.

## Controlled pilot checklist

Run this pilot before increasing volume. Use only internal, consented test numbers; never send an unsolicited production test.

1. Confirm each existing TextGrid number uses the authenticated inbound and status callback URLs.
2. Publish the current checkpoint and activate the one-minute dispatcher heartbeat.
3. Send one manual message from Messenger. Confirm the recipient receives it and the provider SID, message status, and conversation timeline update once.
4. Reply from the test number. Confirm a single inbound message is created and one delayed AI reply queue item appears.
5. Send the identical callback again through TextGrid's retry or test tooling. Confirm no duplicate message, AI reply, or campaign count appears.
6. Pause AI in the conversation before the queued reply becomes due. Confirm the queue item is cancelled and no reply is sent.
7. Test an inbound message outside business hours. Confirm no immediate reply, then confirm a single reply is sent after the next business window opens.
8. Test STOP and ensure the contact is suppressed. Confirm neither manual nor AI/campaign sends can reach that number.
9. Run a 10–25-contact pilot campaign with conservative batch settings. Monitor sent, delivered, failed, reply, opt-out, queue-pending, and queue-failed counts.
10. Increase volume only after the pilot results match the campaign and provider records.

## Remaining operational recommendations

The application now retains failed queue records for review rather than automatically resending an ambiguously delivered SMS. Before fully unattended scale, add a restricted operations view that surfaces pending, failed, and cancelled AI queue items; then define an approved manual resend workflow. Maintain a runbook for provider outages, campaign pause procedures, opt-out investigations, and credential rotation.

# LotPulse SMS — Project TODO

## Phase 1: Schema & Data Models
- [x] Design and push full database schema (contacts, conversations, messages, campaigns, labels, phone numbers, call recordings, ai suggestions, drip sequences)
- [x] Add all tRPC routers for each feature domain (contacts, conversations, messages, campaigns, labels, phoneNumbers, callRecordings, ai, reporting, settings, twilio)

## Phase 2: Layout & Auth & Dashboard
- [x] Global DashboardLayout with sidebar nav (Messenger, Campaigns, Contacts, Reporting, Call Logs, Settings)
- [x] Login / register pages with protected routes (Manus OAuth)
- [x] Dashboard overview with stats cards (SMS sent, reply rate, leads, delivery rate)
- [x] Campaign performance chart on dashboard
- [x] Recent conversations widget on dashboard

## Phase 3: Messenger (Inbox)
- [x] Inbox list with contact name, last message preview, timestamp
- [x] Inbox filters: All, Unread, Awaiting Reply, Unreplied, Opted Out
- [x] Label filter sidebar (Hot Lead, Qualified, Under Contract, Closed, etc.)
- [x] Search conversations by contact name or message content
- [x] Threaded conversation view with sent/received bubbles
- [x] Send message from conversation view
- [x] Assign/change label on conversation
- [x] Per-conversation AI toggle (on/off)
- [x] AI suggested reply shown in conversation
- [x] Mark as read / star / opt-out actions

## Phase 4: Campaigns
- [x] Campaign list page with status badges (Active, Scheduled, Completed, Draft)
- [x] Create campaign: name, contact list, message template, schedule date/time
- [x] Campaign delivery stats (sent, delivered, replied, opted out)
- [x] Drip sequence builder (multi-step follow-up with delay between steps)
- [x] Campaign templates library
- [x] Pause / resume / delete campaigns

## Phase 5: Contacts
- [x] Contact list with search, filter by label/tag
- [x] CSV import with field mapping
- [x] Add/edit/delete individual contacts
- [x] Contact detail view: info, conversation history, labels, notes
- [x] List/group management (create lists, assign contacts)
- [x] Bulk label assignment

## Phase 6: AI Agent
- [x] Global AI mode toggle (Settings > AI Agent tab)
- [x] Per-conversation AI toggle
- [x] AI lead scoring (1-10) on each conversation
- [x] AI key info extraction (property address, motivation, timeline, asking price)
- [x] AI suggested follow-up message
- [x] AI auto-response when AI mode is ON
- [x] AI analysis panel in conversation sidebar

## Phase 7: Reporting
- [x] Messaging stats: total sent, delivered, replied, opted out
- [x] Response rate over time chart
- [x] Campaign performance comparison table
- [x] Label/lead stage funnel chart
- [x] Date range filter

## Phase 8: TextGrid SMS Integration
- [ ] TextGrid credentials setup (Account SID, Auth Token)
- [ ] Phone number provisioning (buy/manage numbers via TextGrid)
- [ ] Outbound SMS via TextGrid (Twilio-compatible API)
- [ ] Inbound SMS webhook handler
- [ ] Delivery status webhook handler
- [ ] Real-time message sync

## Phase 9: Voice & Transcription
- [x] Log a call on a contact/conversation
- [x] Upload call recording audio file
- [x] Auto-transcription via Whisper API
- [x] Transcription displayed in call log detail view
- [ ] Transcription displayed inline in conversation timeline

## Phase 10: Polish & Tests
- [x] Consistent design tokens and color system
- [x] Empty states for all pages
- [x] Toast notifications for all actions
- [ ] Loading skeletons on all pages
- [ ] Vitest tests for core routers
- [ ] TextGrid integration complete
- [ ] Final checkpoint and delivery

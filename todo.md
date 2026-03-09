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

## AI Toggle — Three-Level Control
- [x] Add aiEnabled column to campaigns table in schema
- [x] Add aiEnabled column to conversations table in schema (per-conversation)
- [x] Push schema migrations
- [x] Add campaign-level AI toggle in Campaigns list and campaign detail
- [x] Add per-conversation AI toggle in Messenger (wired to DB via conversations.update)
- [x] AI auto-response logic respects: global OFF = no AI anywhere; campaign ON + global ON = AI responds for that campaign's conversations; per-conversation toggle overrides campaign setting
- [x] Visual indicator in campaign list showing AI on/off status per campaign (Bot icon + Switch)
- [x] Visual indicator in messenger inbox showing AI on/off per conversation (Bot icon in list row)

## Campaign Batch Throttling
- [x] Add batchSize, batchIntervalMinutes columns to campaigns schema
- [x] Push schema migration
- [x] Update campaigns.create and campaigns.update routers to accept batchSize and batchIntervalMinutes
- [x] Add batch throttling controls to campaign creation dialog (batch size input + interval input)
- [x] Show batch settings in campaign detail panel
- [x] Add edit batch settings in campaign detail panel for draft/paused campaigns

## Campaign List Send Rate Column + Daily Send Window
- [x] Add send rate column to campaign list (batch size / interval visible in each row)
- [x] Add sendWindowStart and sendWindowEnd columns to campaigns schema
- [x] Push schema migration
- [x] Add daily send window inputs to campaign creation dialog
- [x] Show and edit daily send window in campaign detail panel

## Message Templates + Merge Fields
- [x] Add Templates page with create/edit/delete message templates
- [x] Templates support merge fields: {FirstName}, {LastName}, {PropertyAddress}, {PropertyCity}, {PropertyState}, {PropertyZip}
- [x] Insert-merge-field buttons in template editor (clickable chips)
- [x] Add contact schema columns: propertyCity, propertyState, propertyZip
- [x] Push schema migration for new contact columns
- [x] Update CSV import to map these 6 fields
- [x] Update contact add form to include all property fields
- [x] Campaign message composer uses same merge field chips
- [x] Templates nav item added to sidebar

## SmarterContact Gap — High Priority
- [ ] Inbox filters: Unreplied, Awaiting reply, Opted out, Missed calls, Deleted (in sidebar)
- [ ] Campaigns + Labels + Groups collapsible sections in Messenger sidebar
- [ ] Contact Groups (named lists, separate from tags)
- [ ] Contact management page: Opted out, DNC, Carrier blocked, Undeliverable, Response removal
- [ ] Deleted contacts section
- [ ] Keyword campaigns (trigger auto-reply when someone texts a keyword)
- [ ] Keyword templates
- [ ] Completed + Deleted campaign sections
- [ ] Workflows section: standalone multi-step drip with per-step day delays
- [ ] Workflow reply-based actions: auto-add to group, auto-add label when no reply in X hours
- [ ] Workflow active/inactive toggle
- [ ] Reporting: AI filtering rate, carrier block rate, SMS segments sent, median response time
- [ ] Reporting: SMS-to-lead conversion rate, contact-to-lead conversion rate
- [ ] Reporting: Export to CSV button
- [ ] Reporting: Filter by message template

## SmarterContact Gap — Medium Priority
- [ ] Macros: quick-reply saved shortcuts in Messenger conversation view
- [ ] Owned numbers table in Settings with block rate per number, status, SMS sent
- [ ] Incoming calls toggle, voicemail toggle, call auto-reply toggle in phone settings
- [ ] Calendar page with appointment scheduling (month/week/day views)
- [ ] Custom fields editor in Settings
- [ ] Notifications settings page

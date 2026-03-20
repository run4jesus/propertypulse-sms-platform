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

## Production-Ready Features (Phase 16-17)

### Opt-Out Auto-Detection
- [x] Detect STOP/UNSUBSCRIBE/QUIT/CANCEL/END/OPTOUT in inbound messages
- [x] Auto-move contact to Opted Out list in Contact Management
- [x] Auto-update conversation status to opted_out
- [x] Block future outbound messages to opted-out contacts (batch engine skips optedOut=true)
- [x] Re-opt-in detection (START/YES/UNSTOP)

### Template Picker in Campaign Composer
- [x] Add "Use Template" button in campaign creation message body
- [x] Popover with template list and preview
- [x] Selecting a template populates the message body with merge fields intact

### TextGrid Webhook Handler
- [x] POST /api/sms/inbound endpoint for inbound SMS
- [x] POST /api/sms/status endpoint for delivery receipts
- [x] Parse From/To/Body from TextGrid webhook payload
- [x] Match inbound number to existing contact or create new contact
- [x] Create or update conversation record
- [x] Store inbound message in messages table
- [x] Trigger opt-out detection on inbound message
- [x] Trigger AI auto-reply if AI mode is enabled globally + per conversation
- [x] Return TwiML 200 response to TextGrid

### Batch Send Engine
- [x] Background job that runs every 60 seconds to process pending campaign batches
- [x] Respects batchSize and batchIntervalMinutes per campaign
- [x] Respects sendWindowStart and sendWindowEnd
- [x] Resolves merge fields per contact before sending
- [x] Marks messages as sent/failed in DB
- [x] Updates campaign sentCount per batch
- [x] Skips opted-out contacts automatically
- [x] Marks campaign as completed when all contacts are processed

### Contact Deduplication on CSV Import
- [ ] Check for duplicate phone numbers before inserting — skip duplicates, report count

### Reply Keyword Auto-Labeling
- [ ] Detect "interested", "yes", "call me" → Hot Lead label
- [ ] Detect "not interested", "no" → Not Interested label

### Opt-Out Footer Toggle
- [x] Toggle in campaign creation: auto-append "Reply STOP to opt out"
- [x] Batch engine appends footer when optOutFooter=true

### Campaign Pause on Opt-Out
- [x] Batch engine skips opted-out contacts in the send queue

## Lead Disposition / Status Tagging in Messenger
- [ ] Add `disposition` column to conversations table (enum: interested, not_interested, wrong_number, callback_requested, under_contract, closed, dnc, no_answer)
- [ ] Push schema migration
- [ ] Add conversations.setDisposition tRPC procedure
- [ ] Quick-tap disposition bar in Messenger conversation header (colored pill buttons)
- [ ] Disposition dropdown for full list of statuses
- [ ] Disposition badge visible on each conversation row in the inbox list
- [ ] Filter inbox by disposition (add to filter bar)
- [ ] Disposition color coding: interested=green, not_interested=gray, wrong_number=orange, callback_requested=blue, under_contract=purple, closed=teal, dnc=red

## Lead Disposition / Status Tagging in Messenger
- [ ] Add disposition column to conversations schema
- [ ] Push schema migration
- [ ] Add conversations.setDisposition tRPC procedure
- [ ] Quick-tap disposition pill buttons in Messenger conversation header
- [ ] Disposition badge on each inbox conversation row
- [ ] Filter inbox by disposition
- [ ] Color coding per disposition status

## Dashboard Date Range Filtering
- [ ] Date range picker on dashboard header (Today, Yesterday, Last 7 Days, Last 14 Days, Last 30 Days, Custom)
- [ ] All KPI stat cards filter by selected date range (Total Sent, Reply Rate, Delivery Rate, Total Contacts, Active Campaigns, Messages Received)
- [ ] Messages This Week chart updates to show data for selected range
- [ ] Reply Rate Trend chart updates to selected range
- [ ] Recent Campaigns and Recent Conversations widgets respect date range
- [ ] Update dashboard tRPC procedure to accept startDate and endDate params
- [ ] Persist selected date range in component state

## Dashboard + Reporting Rebuild (SmarterContact-style)
- [ ] Dashboard: today-only KPIs (SMS sent today, replies today, opt-outs today, reply rate, active campaigns, leads today)
- [ ] Dashboard: clean stat card grid, no date picker needed (always today)
- [ ] Reporting: date range picker (start date + end date inputs)
- [ ] Reporting: Campaign filter dropdown (All or specific campaign)
- [ ] Reporting: Message template filter dropdown (All or specific template)
- [ ] Reporting: Standard campaigns count + Keyword campaigns count summary badges
- [ ] Reporting: 13 stat cards — SMS sent, SMS segments sent, carrier block rate, replies received, delivery rate, opt-out rate, AI filtering rate, reply rate, median response time, leads, contacts, SMS-to-lead conversion rate, contact-to-lead conversion rate
- [ ] Reporting: Export to CSV button
- [ ] Reporting: Messaging tab (active) + Calling tab (placeholder)
- [ ] Backend: getDashboardStats always returns today's data (no date params)
- [ ] Backend: getReportingStats accepts startDate, endDate, campaignId, templateId

## DNC Scrubbing
- [ ] Add TCPA_LITIGATOR_API_KEY and TCPA_LITIGATOR_API_PASSWORD secrets in Settings
- [ ] Add dncStatus and litigatorFlag columns to contacts schema
- [ ] Push schema migration for DNC columns
- [ ] Add scrubContacts tRPC procedure (internal DNC + TCPA Litigator API check)
- [ ] Auto-scrub contacts on CSV import (show scrub summary: X flagged as DNC, X flagged as litigator)
- [ ] Block campaign sends to contacts flagged as DNC or litigator
- [ ] Add DNC Scrub section in Contact Management page with manual re-scrub button
- [ ] Show DNC/litigator badge on contact rows and conversation header

## Internal DNC Scrub (Campaign Safety)
- [x] Mark contacts as DNC from conversation view (quick action button)
- [x] Mark contacts as DNC from contacts list (bulk action)
- [x] Block campaign batch sends to contacts where contactManagement.listType = 'dnc' for that user
- [x] Show DNC badge on contact rows in Contacts page
- [x] Show DNC warning banner in conversation view when contact is on internal DNC

## Unified Conversation Thread (Cross-Number History)
- [x] Normalize contact phone numbers to E.164 format on import and lookup
- [x] When opening a conversation, query ALL messages linked to that contact's phone number (across all sender phone numbers)
- [x] Show a subtle divider/label in thread when sender number changed
- [x] Conversation list groups by contact phone number (not by sender number) to avoid duplicate threads
- [x] Merge duplicate conversations for same contact phone into one unified thread

## Campaign-Level Scrub Filters
- [x] Add scrubInternalDnc, scrubLitigators, scrubExistingContacts boolean columns to campaigns schema
- [x] Update batch send engine to respect per-campaign scrub flags
- [x] Add scrub filter checkboxes to campaign creation wizard
- [x] Add scrub filter checkboxes to campaign edit page
- [x] Default: scrubInternalDnc=true, scrubLitigators=true, scrubExistingContacts=false

## Split Litigator / Federal DNC Scrub Checkboxes
- [x] Add scrubFederalDnc boolean column to campaigns schema (default false)
- [x] Rename scrubLitigators to be litigators-only (not combined), keep default true
- [x] Update batch engine to check scrubFederalDnc separately from scrubLitigators
- [x] Split UI checkbox into two: "TCPA Litigators" and "Federal DNC (National Registry)"

## Scrub Preview Count & Bulk DNC Import
- [x] Backend: campaigns.scrubPreview procedure — counts total contacts, removed per filter, and sendable count for a given contactListId + scrub flags
- [x] Frontend: show scrub preview summary in campaign creation wizard when a contact list is selected
- [x] Backend: contactManagement.bulkImportDnc procedure — accepts array of phone numbers, adds each to internal DNC list
- [x] Frontend: bulk DNC CSV upload UI in Contact Management page (upload CSV, parse phones, preview count, confirm import)

## Phone Number Management (In-App)
- [x] Backend: phoneNumbers.search procedure — search available numbers by area code via TextGrid API
- [x] Backend: phoneNumbers.purchase procedure — buy a number via TextGrid API
- [x] Backend: phoneNumbers.list procedure — list owned numbers from TextGrid API
- [x] Backend: phoneNumbers.release procedure — release/delete a number via TextGrid API
- [x] Frontend: Phone Numbers page with search by area code, available results list, purchase button
- [x] Frontend: Owned numbers list with release button and number details
- [x] Add Phone Numbers to sidebar navigation

## Phone Number Rotation in Campaigns
- [x] Add phoneNumberIds JSON column to campaigns schema (array of up to 3 phone number IDs)
- [x] Update campaigns.create and campaigns.update router to accept phoneNumberIds
- [x] Update batch engine to rotate sends across selected phone numbers (round-robin)
- [x] Add multi-number selector UI to campaign creation (up to 3 numbers, shows area code + number)
- [x] Show selected numbers in campaign detail view

## Not-Interested Follow-Up Automation
- [x] Add followUpEnabled, followUpDelayHours, followUpMessage columns to campaigns schema
- [x] Update campaigns router to accept follow-up settings
- [x] Add follow-up queue logic: when AI labels lead as Not Interested, schedule a follow-up message after delay
- [x] Add follow-up scheduler to batch engine tick (check for queued follow-ups and send)
- [x] Add follow-up settings UI to campaign creation (toggle, delay picker, message textarea)

## Labels — Seeding, Rename, and Messenger Assignment
- [x] Seed default labels for new users on first login (Hot Lead, Interested, Not Interested, Wrong Number, Callback Requested, Under Contract, Closed, DNC)
- [x] Add updateLabel backend procedure (rename + color change)
- [x] Add rename/edit button to each label row in Settings Labels tab
- [x] Verify label assignment works in Messenger conversation view

## Messenger Label Filters
- [x] Backend: update conversations.list procedure to accept optional labelId filter
- [x] Frontend: load user labels in Messenger sidebar and render a filter tab for each label
- [x] Frontend: clicking a label filter tab filters the conversation list to only conversations with that label

## Unread Message Indicators in Messenger
- [x] Backend: markConversationRead() resets unreadCount to 0 when conversation is opened
- [x] Backend: conversations.get procedure auto-calls markConversationRead on open
- [x] Frontend: unread rows show blue left border + blue background highlight
- [x] Frontend: unread avatar shows blue dot indicator in top-right corner
- [x] Frontend: unread contact name is bold
- [x] Frontend: blue badge shows unread count number
- [x] Frontend: conversation list invalidates 1.5s after opening to clear unread state

## Unread Filter Pill in Messenger
- [x] Backend: support status="unread" filter in getConversations (where unreadCount > 0)
- [x] Frontend: add "Unread" pill to STATUS_FILTERS array in Messenger

## Auto-configure Webhooks on Number Purchase
- [x] After purchasing a number via TextGrid API, immediately call TextGrid UpdateNumber API to set smsUrl (POST) and statuscallBackUrl (POST)
- [x] No manual webhook setup needed for any future numbers purchased through LotPulse

## Hot Lead In-App Notification
- [ ] When AI assigns Hot Lead or Warm Lead label to a conversation, trigger notifyOwner alert
- [ ] Notification includes: contact name, phone number, property address (if known), AI lead score, last message snippet, and a direct link to the conversation
- [ ] Show a persistent notification badge/banner in the UI for unacknowledged hot lead alerts

## Zapier Webhook Integration (Podio Seller Leads)
- [ ] Add zapierWebhookUrl column to users table in schema
- [ ] Push schema migration
- [ ] Add Settings > Integrations tab with Zapier webhook URL input field
- [ ] Backend: when a conversation is labeled Hot Lead or Warm Lead (or disposition set to interested/callback_requested), POST lead payload to user's Zapier webhook URL
- [ ] Payload includes: contact name, phone, property address, city, state, zip, label/disposition, AI lead score, conversation URL, timestamp
- [ ] Show success/failure toast when webhook fires
- [ ] Add test webhook button in Settings > Integrations tab

## AI Conversation Framework (Playbook Stages)
- [ ] Define 6-stage conversation playbook in AI system prompt: Acknowledge → Qualify → Motivation → Condition → Soft Offer → Hot Lead Flag
- [ ] Each stage has a goal and guardrails, not a script — AI uses its own words
- [ ] AI tracks which stage the conversation is in and advances naturally
- [ ] Stage 6 triggers Hot Lead label + notifyOwner + Zapier webhook
- [ ] Add persona definition to AI prompt (name, tone, market knowledge)
- [ ] Add "are you a bot?" detection — deflect naturally or flag for human takeover

## Podio External Leads Direct Integration (No Zapier)
- [x] Backend: pushLeadToPodio() helper — POST to https://podio.com/webforms/26979599/2064774 with mapped fields
- [x] Fields: firstName→fields[title], lastName→fields[last-name], phone→fields[phone-number][][value], propertyAddress→fields[property-address-map], temperature (HOT/Warm), lead source="SMS Callbacks", conversation thread→fields[details...]
- [x] Trigger pushLeadToPodio when AI auto-assigns Hot Lead label in smsEngine
- [x] Add podioEnabled + podioWebformUrl to users table (migrated via SQL)
- [x] Settings > Integrations tab with Podio enable toggle and webform URL override
- [x] Show success/failure toast when Podio push fires
- [x] Add "Send Test Lead to Podio" button in Settings > Integrations
- [x] Owner notification (in-app push) fires when Hot Lead is auto-labeled

## Manual Send Queue with Template Rotation
- [ ] Schema: add templateIds JSON column (up to 8 template IDs) to campaigns table
- [ ] Backend: campaigns.getSendQueue — returns unsent contacts with pre-populated rotated message body (merge fields resolved)
- [ ] Backend: campaigns.sendQueueItem — sends one message to one contact, marks as sent, returns next contact
- [ ] Campaign setup UI: multi-template selector (up to 8 templates, shows name + preview snippet)
- [ ] Send Queue page: full-screen lead card showing contact info + property address + personalized message preview
- [ ] Send Queue: spacebar / Enter key sends current lead and advances to next
- [ ] Send Queue: editable message textarea so user can tweak before sending
- [ ] Send Queue: Skip button to skip current lead without sending
- [ ] Send Queue: progress bar showing X of Y sent
- [ ] Send Queue: template rotation indicator (e.g. "Template 3 of 8")
- [ ] Send Queue: accessible from campaign detail page via "Start Sending" button

## Send Mode Toggle (Automated vs Manual Queue)
- [ ] Schema: add sendMode column to campaigns table (enum: 'automated' | 'manual', default 'automated')
- [ ] Campaign create/update UI: Send Mode radio toggle — Automated shows batch settings, Manual hides them
- [ ] Automated batch engine: rotate through templateIds when sending instead of single messageBody
- [ ] Campaign detail: show "Start Send Queue" button only when sendMode = 'manual'; show Start/Resume for automated

## Production-Readiness Fixes

### Fix 1: Send Queue Edge Cases
- [ ] Phone number normalization: validate E.164 format before queue loads, skip malformed numbers with a warning count
- [ ] Unique conversation constraint: database-level unique index on (userId, contactPhone) to prevent duplicate conversations
- [ ] Server-side queue progress: persist queueIndex per campaign in DB so Send Queue can resume after tab close

### Fix 2: LLM-Based AI Classification
- [ ] Replace keyword list with LLM classification call on each inbound message
- [ ] LLM returns intent (interested/not_interested/neutral/asking_price) and suggestedLabel (Hot Lead/Warm Lead/Not Interested/null)
- [ ] Use suggestedLabel to auto-assign conversation label instead of keyword matching

### Fix 3: Failed Send Retry Logic
- [ ] Add failedSends table: campaignId, contactId, phone, error, attempts, lastAttemptAt, resolved
- [ ] On send failure: log to failedSends instead of silently skipping
- [ ] Retry sweep in batch engine: retry failed sends up to 3 times with exponential backoff
- [ ] Show Failed count in campaign stats panel

### Fix 4: Delivery Rate Monitoring
- [ ] Wire /api/sms/status callback to update message.deliveryStatus in DB (delivered/undelivered/failed)
- [ ] Add deliveryRate % calculation to campaign stats query
- [ ] Flag numbers with <80% delivery rate in Phone Numbers page

## Warm Lead Podio Push
- [x] Trigger pushLeadToPodio with temperature="Warm" when AI auto-labels Warm Lead in smsEngine (was already wired)
- [x] Trigger pushLeadToPodio with temperature="Warm" when user manually assigns Warm Lead label in conversations.assignLabel

## AI Conversation Framework (Houses Only)
- [ ] Rewrite AI system prompt with exact playbook: intro → yes/no → price extraction → warm lead handoff
- [ ] No company name, no AI name, no partner name ever used in responses
- [ ] Not Interested label auto-assigned when lead says no / not interested
- [ ] Warm Lead auto-assigned when lead gives a price OR refuses to give price but is open to an offer
- [ ] Hot Lead disabled — all qualified leads go to Warm Lead only
- [ ] AI says "my partner handles pricing, I'll have him reach out" when price is given or asked for offer
- [ ] LLM classification updated to match new framework stages
- [ ] Focus on houses only (no land logic)

## VA Podio Push Button + Leads Tracker
- [x] Add podioLeadPushed boolean field to conversations schema
- [x] Push schema migration
- [x] Add leadsPushed count to getDashboardStats
- [x] Add conversations.pushToPodio tRPC procedure (manual VA trigger, calls pushLeadToPodio)
- [x] Add "Push to Podio" button in Messenger conversation header
- [x] Add Leads Pushed stat tile to Dashboard (clickable, navigates to Messenger)

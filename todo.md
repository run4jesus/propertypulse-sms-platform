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
- [x] Add protected operation to update secure callback URLs on all existing TextGrid numbers
- [x] Apply and verify protected callback URLs on existing TextGrid numbers

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

## OpenAI GPT-4o Mini Integration
- [x] Create server/openai.ts helper (direct OpenAI API calls)
- [x] Swap invokeLLM in AI auto-response logic to use OpenAI GPT-4o mini
- [x] Swap invokeLLM in AI analyze/generateReply procedures
- [x] Add vitest to validate OpenAI key

## Daily Send Cap (Option 3 Lead Flow Control)
- [x] Add dailySendCap column to campaigns schema (nullable int, null = unlimited)
- [x] Add dailySentCount and dailySentDate tracking columns to campaigns schema
- [x] Push schema migration
- [x] Update batch engine to check/enforce daily send cap
- [x] Add Daily Send Cap field to campaign creation UI
- [x] Add Daily Send Cap field to campaign edit/settings UI

## BOS Business Operations Layer
- [x] Schema: deals, contracts, tasks, pullCadences, dispositions, goals tables
- [ ] DB helpers: getDeals, createDeal, updateDeal, getContracts, createContract, updateContract, getTasks, createTask, updateTask, getPullCadences, getDispositions, getGoals, getDailyZero
- [ ] tRPC: deals router (list, create, update, delete, updateStage)
- [ ] tRPC: contracts router (list, create, update, delete)
- [ ] tRPC: tasks router (list, create, update, complete, delete)
- [ ] tRPC: cadence router (list, create, update, markPulled)
- [ ] tRPC: dispositions router (list, create, update)
- [ ] tRPC: goals router (get, upsert)
- [ ] Page: Deal Pipeline (11-stage kanban, new deal form, stage drag/click)
- [ ] Page: Contract Manager (table, new contract form, status tracking)
- [ ] Page: Task Manager (list, create, complete, priority/due date)
- [ ] Page: Daily Zero (auto-populated from Needs Offer + pending tasks)
- [ ] Page: Pull Cadence (schedule list, create/edit schedule, mark pulled)
- [ ] Page: Disposition Dashboard (active deals in dispo, buyer tracking)
- [ ] Page: KPIs Dashboard (monthly goals, conversion rates, revenue tracking)
- [ ] Update Dashboard with full stats (active deals, pipeline value, tasks due)
- [ ] Update DashboardLayout sidebar with all new nav sections
- [ ] Update App.tsx routes for all new pages
- [ ] Messenger: "Add to Pipeline" button to create a deal from a conversation

## BOS Integration (Full Platform Rebuild)
- [ ] Reorganize DashboardLayout sidebar to match BOS section structure exactly
- [ ] Build Command Center: BOS-style main Dashboard (greeting, 4 stat cards, tasks, goals, pipeline funnel, activity feed)
- [ ] Build Activity Feed page (tabs: All, Campaigns; item cards with type badges)
- [ ] Build Daily Zero page (3 metrics: Open Tasks, Unworked Leads, Unread Messages; streak tracker; Log Today's Zero)
- [ ] Build Task Manager page (task list, add/complete/delete tasks, due dates, priority)
- [ ] Build Data Dashboard page (stats: total contacts, lists, imports, skip traced)
- [ ] Build Lists page (view/manage contact lists linked to existing contacts system)
- [ ] Build Cadence page (pull schedule reminders by market and type)
- [ ] Build Import/Skip Trace page (upload CSV, link to existing import flow)
- [ ] Build Marketing Dashboard page (4 stat cards, House/Land channel cards, Lead Pipeline, Lead Tiers, Upcoming Pulls, Quick Actions)
- [ ] Build Leads page (lead list with status, tier, source filters)
- [ ] Wire Campaigns nav item to existing LotPulse campaigns page
- [ ] Build KPIs page (monthly goals, conversion metrics, date range selector)
- [ ] Build Deal Pipeline page (11-stage tabs, New Deal button, 4 stat cards, search)
- [ ] Build Deal Tracker page (table view of all deals with stage, value, dates)
- [ ] Wire Contacts nav item to existing LotPulse contacts page
- [ ] Build Disposition Dashboard page (buyer activity, dispo status tracking)
- [ ] Build Contract Manager page (6-status tabs, New Contract, 4 stat cards, search)

## AI Empathy & Needs Offer Tuning
- [x] Add empathy handling to intro stage prompt (death, divorce, hardship, illness)
- [x] Add empathy handling to price_ask stage prompt
- [x] Improve Needs Offer detection — add more trigger phrases
- [x] Add emotional situation as fast-track to needs_offer for VA to handle

## Lists Upgrade — Full Field Mapping + Phone Status Tracking
- [x] Schema: add owner2FirstName, owner2LastName to contacts table
- [x] Schema: add mailingAddress, mailingCity, mailingState, mailingZip to contacts table
- [x] Schema: add phone2, phone3 to contacts table
- [x] Schema: add phone1Status, phone2Status, phone3Status (enum: untouched/messaged/replied/opted_out/dnc/needs_reskip) to contacts table
- [x] Push schema migration (pnpm db:push)
- [x] Backend: update bulkImport to accept all new fields
- [x] Backend: add contactLists.getMembers procedure (returns contacts in list with phone statuses)
- [x] Backend: add contacts.updatePhoneStatus mutation
- [ ] Backend: auto-update phone1Status to 'messaged' when outbound SMS sent to that number
- [ ] Backend: auto-update phone1Status to 'replied' when inbound SMS received from that number
- [x] Frontend: build dedicated /lists page with list cards and upload modal
- [x] Frontend: CSV field mapper with all 14 columns (owner1 first/last, owner2 first/last, property addr/city/state/zip, mailing addr/city/state/zip, phone1/2/3)
- [x] Frontend: list detail drill-down with per-contact rows and color-coded phone status badges
- [x] Frontend: "Needs Re-Skip" filter to surface contacts where all phones are dead/opted-out/dnc
- [x] Update App.tsx to route /lists to new Lists page

## KPIs — Cost Tracking & New Metrics
- [x] Schema: add costEntries table (id, userId, month, year, category: va/software/data/other, label, amount, createdAt)
- [x] Push schema migration via SQL
- [x] Backend: add getCostEntries, upsertCostEntry, deleteCostEntry db helpers
- [x] Backend: add kpis.getCosts, kpis.upsertCost, kpis.deleteCost tRPC procedures
- [x] Backend: add kpis.getMetrics procedure (cost per lead, cost per deal, leads-to-deal ratio, total spend)
- [x] Frontend: add Cost Tracking panel to KPIs page (categorized entries: VA, Software, Data, Other)
- [x] Frontend: add new KPI metric cards (Cost Per Lead, Cost Per Deal, Leads-to-Deal %, Total Monthly Spend, ROI)
- [x] Frontend: wire month/year selector to cost entries so costs are tracked per period

## Messenger — Linked Conversations (Same Property Address)
- [x] Backend: add conversations.getLinked procedure (find all conversations sharing same propertyAddress, excluding current)
- [x] Frontend: Prior Contact amber badge in Messenger conversation header when linked convos exist
- [x] Frontend: Linked Conversations collapsible panel in Messenger right sidebar showing all prior threads on same address

## Messenger — Unified Property Timeline
- [x] Backend: add conversations.getPropertyTimeline procedure (all messages across all linked convos for same address, sorted chronologically, grouped by conversation with metadata)
- [x] Frontend: replace linked conversations panel with unified scrollable timeline in message thread — dated dividers between each conversation attempt showing contact name, phone, and date range
- [x] Frontend: remove old linked conversations collapsible panel (replaced by inline timeline)

## TCP Litigator List API Integration

- [x] Backend: add TCP_LITIGATOR_LIST_API_URL and TCP_LITIGATOR_LIST_API_CREDENTIALS to env secrets
- [x] Backend: create litigatorCheck procedure (call TCP API to verify phone number)
- [x] Backend: integrate litigator check into bulkImport (check each contact during import)
- [x] Backend: integrate litigator check into campaign send (check before sending SMS)
- [x] Backend: add system.updateLitigatorCredentials procedure to store/update API credentials
- [ ] Frontend: add TCP Litigator List settings panel in Settings → Compliance section
- [ ] Frontend: allow user to enter TCP Litigator List API username and password
- [ ] Frontend: show litigator check status (enabled/disabled, last checked date)
- [ ] Frontend: add manual "Check All Contacts" button to re-scan all existing contacts
- [x] Test: verify litigator check works on contact import
- [ ] Test: verify litigator check works on campaign send
- [x] Test: verify red warning banner appears in Messenger for flagged contacts


## Lists — Pre-Import Compliance Check

- [x] Backend: add contactLists.preImportCheck procedure (scan CSV for DNC, litigators, duplicates, return counts)
- [x] Backend: add filtering logic to exclude DNC contacts, litigators, existing contacts based on user checkboxes
- [x] Frontend: build compliance check modal showing filtered counts (total, DNC excluded, litigators excluded, duplicates excluded, clean to import) — UI pending, backend ready
- [x] Frontend: add checkboxes for "Exclude DNC", "Exclude Litigators", "Exclude Existing Contacts"
- [x] Frontend: show summary table with before/after counts and exclusion breakdown
- [x] Frontend: wire "Confirm Import" button to apply filters and import only clean contacts


## Test AI Sandbox

- [x] Backend: add system.testAI procedure (simulate conversation without saving to database)
- [x] Frontend: build TestAI.tsx page with chat interface
- [x] Frontend: show current AI stage (intro/price_ask/needs_offer/not_interested) in sidebar
- [x] Frontend: show active prompt (intro/price_ask/needs_offer) being used
- [x] Frontend: allow user to type seller message and see AI response in real-time
- [x] Frontend: reset conversation button to start over
- [x] Frontend: add to main navigation (Settings or Tools section)
- [x] Test: verify AI responds correctly to various seller inputs
- [x] Test: verify stage transitions work as expected

## Campaign CSV Column Mapping

- [x] Add column mapping step to campaign creation wizard (after list selection)
- [x] Allow user to map CSV columns to: First Name, Last Name, Property Address, Property City, Property State, Property Zip, Phone 1, Phone 2, Phone 3
- [x] Allow user to select which phone column to use for sending (Phone 1, 2, or 3)
- [x] Store column mapping on campaign (JSON field in campaigns table)
- [x] Store phone field selection on campaign
- [x] Update batch send engine to use campaign column mapping when resolving merge fields
- [x] Update batch send engine to use selected phone field per contact
- [x] Add merge field live preview in campaign message composer (shows resolved example with first row of data)
- [ ] Apply column mapping step when editing existing campaigns too
- [x] Support both CSV-uploaded lists and existing contact lists

## Mobile-Only Phone Filtering

- [x] Add phone1LineType, phone2LineType, phone3LineType columns to contacts schema (enum: mobile, landline, voip, unknown)
- [x] Push schema migration for line type columns
- [x] Add TextGrid Lookup API helper to detect line type per phone number
- [x] Auto-detect line type on CSV import for all phone columns (phone1/2/3)
- [x] Add removedNonMobile count to scrubPreview procedure
- [x] Show non-mobile count in Scrub Preview section of campaign wizard
- [x] Batch engine skips contacts where selected phoneField is not mobile
- [ ] Show line type badge on contact rows in Contacts page

## AI Business Hours

- [x] Add aiHoursStart, aiHoursEnd, aiTimezone columns to users schema
- [x] Push schema migration for business hours columns
- [x] Add updateUserBusinessHours helper in db.ts
- [x] Add settings.updateBusinessHours tRPC procedure
- [x] Add Business Hours card to Settings > AI Agent tab with start/end time dropdowns and timezone selector
- [x] AI agent reads user's saved hours before responding (respects timezone)
- [x] Apply legacy SDK cron auth patches (sdk.ts + manusTypes.ts)
- [x] Create after-hours follow-up scheduled handler at /api/scheduled/after-hours-followup
- [x] Register handler in index.ts
- [ ] Deploy site and create heartbeat job (fires at business hours start time daily)

## Dashboard Date Range Filtering

- [ ] Update backend dashboard.stats procedure to accept dateFrom/dateTo parameters
- [ ] Add date range preset selector to Dashboard header (Today, Last 7 Days, Last 30 Days, This Month, Custom)
- [ ] Add custom date range picker (calendar) for custom range selection
- [ ] Wire all KPI cards to use selected date range
- [ ] Update "Today's Numbers" label to reflect selected range

- [x] Update backend dashboard.stats procedure to accept dateFrom/dateTo parameters
- [x] Add date range preset selector to Dashboard header (Today, Last 7 Days, Last 30 Days, This Month, Custom)
- [x] Add custom date range picker (calendar) for custom range selection
- [x] Wire all KPI cards to use selected date range
- [x] Update "Today's Numbers" label to reflect selected range

## AI Reply Delay (Human-Like)

- [ ] Add aiReplyDelayFirstMin, aiReplyDelayFirstMax, aiReplyDelayFollowMin, aiReplyDelayFollowMax columns to users schema
- [ ] Push schema migration
- [ ] Add delay logic to smsEngine.ts: schedule reply after random delay (first reply: 2-8 min, follow-up: 1-5 min)
- [ ] Add Reply Delay settings card to Settings > AI Agent tab
- [ ] Test AI section stays instant (no delay applied)

- [x] Add aiReplyDelayFirstMin, aiReplyDelayFirstMax, aiReplyDelayFollowMin, aiReplyDelayFollowMax columns to users schema
- [x] Push schema migration
- [x] Add delay logic to smsEngine.ts: random delay before sending (first reply: 1-2 min default, follow-up: 1-2 min default, configurable)
- [x] Add Reply Delay settings card to Settings > AI Agent tab (min/max dropdowns for first and follow-up)
- [x] Test AI section stays instant (no delay applied)

## AI Agent Training Hub

- [ ] Add aiPersona, aiTone, aiBusinessContext, aiExamples, aiObjectionHandling, aiStageInstructions, aiForbiddenPhrases JSON columns to users schema
- [ ] Push schema migration for AI training columns
- [ ] Add settings.updateAiTraining tRPC procedure to save all training config
- [ ] Build dedicated AI Agent Training page (separate from Settings or as a new tab)
- [ ] Persona & Tone section: persona name, communication style, tone descriptors
- [ ] Business Context section: market area, close timeline, payment method, custom facts
- [ ] Conversation Examples section: add/remove example seller-agent exchanges
- [ ] Objection Handling section: pre-define responses to common objections
- [ ] Stage-Specific Instructions section: custom instructions per stage (intro/price_ask/needs_offer)
- [ ] Forbidden Phrases section: list of words/phrases AI must never use
- [ ] Reply Timing section: configurable min/max delay range (replaces hardcoded defaults)
- [ ] Wire all training config into GPT system prompt at send time in smsEngine.ts
- [ ] Add link to AI Training page from Settings > AI Agent tab

- [x] Add aiPersona, aiTone, aiBusinessContext, aiExamples, aiObjectionHandling, aiStageInstructions, aiForbiddenPhrases JSON columns to users schema
- [x] Push schema migration for AI training columns
- [x] Add settings.updateAiTraining tRPC procedure to save all training config
- [x] Build dedicated AI Agent Training page at /ai-training
- [x] Persona & Tone section: persona description + tone presets + custom tone textarea
- [x] Business Context section: free-text facts about the business
- [x] Conversation Examples section: add/remove example seller-agent exchanges
- [x] Objection Handling section: pre-define responses to common objections
- [x] Stage-Specific Instructions section: custom instructions per stage
- [x] Forbidden Phrases section: tag-based list of phrases AI must never use
- [x] Reply Timing section: configurable min/max delay for first and follow-up replies
- [x] Wire all training config into GPT system prompt dynamically at send time
- [x] Add AI Training link to sidebar navigation (Brain icon)

## Per-Conversation AI Pause / Resume

- [ ] Add aiPaused boolean column to conversations schema
- [ ] Push schema migration
- [ ] Add conversations.pauseAi and conversations.resumeAi tRPC procedures
- [ ] Add Pause AI / Resume AI button to Messenger conversation header
- [ ] Show clear visual state (paused = orange badge, active = green badge)
- [ ] Update smsEngine inbound handler to skip AI reply when conversation.aiPaused = true
- [ ] Button label: "Pause AI" when active, "Resume AI Agent" when paused

- [x] Add aiPaused boolean column to conversations schema
- [x] Push schema migration
- [x] Add conversations.pauseAi and conversations.resumeAi tRPC procedures
- [x] Add Pause AI / Resume AI button to Messenger conversation header
- [x] Show clear visual state (orange = paused, green = resume)
- [x] Update smsEngine inbound handler to skip AI reply when conversation.aiPaused = true — only affects that conversation, not others
- [x] Button label: "Pause AI" when active, "Resume AI Agent" when paused

## Production Reliability & Security Hardening

- [x] Activate and verify the project-level sms-dispatch heartbeat after publication
- [x] Audit all inbound SMS and delivery-status webhook authentication, payload validation, and duplicate-event handling
- [x] Replace in-process AI reply delays with durable database-backed scheduled replies
- [x] Add exactly-once guardrails for queued AI replies and outbound send attempts
- [x] Verify user ownership/authorization checks for conversations, contacts, lists, campaigns, and messages
- [x] Review secrets exposure, log redaction, and server-only access for TextGrid, OpenAI, Podio, and TCPA credentials
- [x] Add tests for delayed-reply persistence, duplicate webhooks, and cross-user access denial
- [ ] Add operational failure visibility for pending AI replies, failed sends, and webhook errors
- [x] Produce a controlled-pilot launch checklist and hardening findings report

## Team Member Invitations and VA Access

- [x] Audit current role-based access controls and user ownership model
- [x] Add a Messenger-only VA role with no access to admin settings, costs, campaigns, or secrets
- [x] Add secure email invitation and acceptance flow for team members
- [x] Add Settings UI to invite, review, revoke, and change team-member access
- [x] Add workspace membership and invitation schema with an owner-scoped VA role
- [x] Scope VA-visible conversations and contacts to the owner's workspace and assigned records
- [x] Add VA-only sidebar/navigation and guard restricted routes server-side
- [x] Add tests preventing a VA from accessing owner-only data and settings
- [x] Extend team invitations and memberships with selectable Workspace Admin and Messenger Only roles
- [x] Permit Workspace Admin members to operate the owner's full workspace without sharing credentials
- [x] Add role selection, role display, and role-change controls in Team Access
- [x] Verify Workspace Admin and Messenger Only permission behavior

## AI Training Persistence and Team Access Fix

- [x] Diagnose why AI Training configuration does not reload after Save
- [x] Persist AI Training configuration to the owner's workspace reliably
- [x] Ensure Workspace Admin members load and update the owner's shared AI Training configuration
- [x] Add regression tests for save/reload and owner/admin access behavior

## Campaign List Upload Error

- [x] Capture and diagnose the list-upload error that blocks campaign setup
- [x] Fix the import/upload path and improve actionable error feedback
- [x] Test list upload through campaign setup after the fix

## Import Count Transparency

- [x] Determine the exact duplicate and missing-primary-phone causes for the latest list import
- [x] Show a clear source-row, imported, duplicate, and missing-phone breakdown after every list import

## Fallback Phone Import

- [x] Preserve leads with a blank Phone 1 by promoting Phone 2 or Phone 3 to the primary sendable phone
- [x] Retain remaining phone values in their appropriate secondary slots after promotion
- [x] Report promoted fallback-phone leads and truly phoneless rows after import
- [x] Add regression tests for Phone 2 / Phone 3 fallback imports

## Full Multi-Number Lead Import and Sending

- [ ] Retain all distinct Phone 1, Phone 2, and Phone 3 values for every imported lead
- [ ] Prevent an existing or duplicate primary phone from discarding new secondary or tertiary numbers
- [ ] Add an All Available Numbers campaign send mode with per-number compliance and duplicate-send safeguards
- [ ] Test multi-number import and campaign delivery selection end to end

## First Eligible Mobile Campaign Targeting

- [x] Select one campaign target per lead in Phone 1 → Phone 2 → Phone 3 order
- [x] Skip confirmed landline and VoIP numbers while using mobile/unknown candidates safely
- [x] Show first-eligible-mobile behavior in campaign setup and scrub preview
- [x] Add regression tests for mobile, landline, VoIP, and unknown-number selection
- [x] Show confirmed-mobile, unknown/pending, landline/VoIP-excluded, and total eligible target counts in campaign setup

## Confirmed Phone Classification After Import

- [x] Show a per-list unique-phone lookup estimate and cost before paid classification
- [x] Require the user to confirm the displayed estimate before any paid lookup begins
- [x] Persist Mobile, Landline, VoIP, and Unknown labels for each Phone 1/2/3 value
- [x] Show classification progress and final line-type counts after the scan
- [x] Offer classification after every successful list import and for existing lists

## Trestle Phone Intelligence Integration

- [x] Securely store and validate the Trestle Phone Intelligence API key
- [x] Save Trestle mobile/landline/VoIP, activity score, carrier, and validity data per phone slot
- [x] Add user-confirmed estimate, progress, and classification results for uploaded and existing lists
- [x] Use classified mobile targets for first-eligible-mobile campaign sends

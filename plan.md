I’d split the n8n build into 4 workflows. CSV is fine for v1, but only one workflow should write to the CSV files to avoid corrupted state.

Recommended Structure

cask-anniversary/
config/
brokers.csv
talking_points.html
state/
runs.csv
anniversary_items.csv
email_log.csv
raw/
<run_id>-hubspot-search.json
CSV Files

brokers.csv

owner_id,name,email,enabled
78019389,Ross Davis,ross@londoncasktraders.com,true
669879360,Omar Ismail,omar@londoncasktraders.com,true
495523060,Andrew Parker,andrew@londoncasktraders.com,true
2098380599,Joshua Lelan,joshual@londoncasktraders.com,true
270811372,Alice Allen,alice@londoncasktraders.com,true
runs.csv: one row per weekly execution.

run_id,run_date,window_start,window_end,status,total_unique_casks,emails_sent,error,created_at,completed_at
anniversary_items.csv: one row per deduped cask.

run_id,cask_ref,deal_id,dealname,closedate,anniversary_date,anniversary_years,cohort,amount,owner_id,broker_name,contact_id,contact_name,phone,contact_url,status,flags
email_log.csv: one row per attempted email.

run_id,recipient_type,owner_id,email,subject,item_count,status,message_id,error,sent_at
Workflow 1: Weekly Orchestrator

Name it Cask Anniversary Bot - Weekly Orchestrator.

Trigger every Monday at 08:00, timezone Europe/London.
Create run_id, for example 2026-04-27-weekly.
Set window_start = today and window_end = today + 7 days, using Europe/London date logic.
Append a started row to runs.csv.
Execute Workflow 2: fetch and normalize HubSpot data.
Execute Workflow 3: build email payloads.
Execute Workflow 4: send pending emails.
Update runs.csv to complete or failed.
Add a manual test mode where you can override run_date, especially with 2026-04-26, because the brief gives that as the known baseline.

Workflow 2: Fetch And Normalize HubSpot Data

Use Approach A: HubSpot CRM Search API.

HubSpot docs confirm BETWEEN search filters use value and highValue, search results must be paginated with paging.next.after, and search requests have limits around filter groups and page size. (developers.hubspot.com)

Steps:

Build prior-year date ranges from window_start to window_end.
Do not hard-code only 5 years unless Oliver confirms that is enough. Because the email has a 5-year+ cohort, use a configurable lookback_start_year.
Chunk the HubSpot search calls because HubSpot allows a maximum of 5 filterGroups per search request.
Search /crm/v3/objects/deals/search with:
dealstage = closedwon
closedate BETWEEN start/end for that prior-year window
properties: dealname, amount, closedate, hubspot_owner_id
limit = 200
Follow paging.next.after until exhausted.
Save raw search output to raw/<run_id>-hubspot-search.json.
Parse cask reference from dealname using the trailing 6-digit reference.
Deduplicate by cask_ref.
If duplicates exist, keep the record with the highest amount.
If duplicate records have conflicting owners, keep the chosen deal but add a manager flag.
Map owner IDs to the five brokers.
Deals with missing or unknown owners should not disappear; mark them as data-quality flags for Oliver.
For associations, use the batch associations API where practical, but still paginate per deal/object because HubSpot association reads can include a per-object after cursor. (developers.hubspot.com) HubSpot’s deals guide also confirms deal batch reads do not retrieve associations directly, so associations need a separate API path. (developers.hubspot.com)

Then:

Fetch associated contact IDs for each deduped deal.
If there is a primary contact label, use that.
If no primary exists, use the first contact.
If no contact exists, set status = contact_lookup_needed.
Batch-read contacts for firstname, lastname, phone, and ideally mobilephone as a fallback.
Build contact URL:
https://app.hubspot.com/contacts/25187088/record/0-1/{contactId}
Append final normalized rows to anniversary_items.csv.
Workflow 3: Build Email Payloads

This workflow should not send anything. It should only create email bodies and pending email-log rows.

Read anniversary_items.csv for the current run_id.
Read brokers.csv.
Read talking_points.html, so the talking-point guide is editable without changing the workflow.
Group valid items by broker.
Inside each broker, group by anniversary date and anniversary cohort.
Consolidate multi-cask clients by contact_id, not contact name.
If a client has multiple casks in the same week, produce one bullet and include:
single check-in covers all
Brokers with zero anniversaries get no pending email row.
Oliver always gets a pending manager summary.
If total anniversaries is zero, Oliver’s body should simply say No anniversaries this week.
Important implementation detail: the brief has a slight tension between “group by anniversary day/year” and “one bullet per client across the week.” I would follow the acceptance criteria: one bullet per contact across the week. If their casks span multiple dates, put the bullet under the earliest anniversary date and include each cask’s date inline.

Workflow 4: Send Pending Emails

This is the retry-safe sender.

Read email_log.csv.
Find rows for current run_id where status = pending.
Before sending each email, check whether that same run_id + email already has status = sent.
Send via Gmail.
On success, update that row to sent with timestamp/message ID.
On failure, update that row to failed with the error.
Continue sending remaining emails even if one fails.
Trigger the error workflow if any email fails.
This prevents duplicate sends if you need to rerun only the sender.

Workflow 5: Error / Retry Handler

Use this for Gmail failures, stale tokens, API issues, and manual retries.

Error Trigger catches workflow failures.
Append the error to runs.csv or a separate errors.csv.
Alert Oliver, preferably through a backup channel that is not the same Gmail credential.
Keep failed emails in email_log.csv so Workflow 4 can retry only failed/pending sends.
Testing Order

Run with dry_run = true and override recipients to your own email.
Test date override 2026-04-26; expected result is about 30 unique casks.
Confirm every returned deal has a month/day inside the 7-day window and year before the run year.
Confirm no duplicate cask_ref exists in anniversary_items.csv.
Confirm contact URLs open the correct HubSpot contact.
Confirm phone numbers display as-is.
Confirm 878988 appears in Oliver’s data-quality flags if it still has no owner.
Confirm multi-cask clients appear once, grouped by contact_id.
Confirm brokers with zero items receive no email.
Confirm Oliver always receives a summary.
Turn off test recipient override.
Enable the Monday schedule.
For the proposal questions in the brief, your answer should be: Approach A, chunked by prior-year ranges; Gmail failures are logged per-recipient and retried idempotently; talking points live in an external editable HTML config file; delivery includes Loom plus a short README.

# Cask Anniversary Bot README

This workflow sends weekly cask anniversary reminder emails to the broker team and one summary email to Oliver.

It finds closed-won HubSpot deals with cask anniversaries in the coming week, removes duplicate cask records, looks up the associated contact, builds broker emails, and sends Oliver a manager summary with any data-quality flags.

## n8n location

Main folder: [Cask Anniversary Bot](https://londoncasktraders.app.n8n.cloud/projects/whUv9Mwz7WJ7hkC5/folders/DhaPigd5Vkklo4Ns/workflows)

Loom walkthrough: [Cask Anniversary Bot overview](https://www.loom.com/share/3ed931ad5340456aa6fefb401c2c080d?from_recorder=1&focus_title=1)

The system is split into two workflows:

- [Flow 1: Find and filter anniversary results](https://londoncasktraders.app.n8n.cloud/workflow/kRRHIgJESWRKknP1)
- [Flow 2: Build and send emails](https://londoncasktraders.app.n8n.cloud/workflow/hZuqmHVUUK4a1BH4)

Flow 1 gathers the HubSpot data, deduplicates casks, looks up contacts, and stores the final anniversary rows.

Flow 2 reads those final rows, builds the broker and manager email payloads, then sends the emails.

## How to change the schedule

Open the `Schedule Trigger` node at the start of Flow 1.

The normal live schedule should be:

- Monday
- 08:00
- Timezone: Europe/London

Recommended live cron:

```cron
0 8 * * 1
```

This means 08:00 every Monday.

If using a temporary cron expression for testing, change it back before going live.

For one-off tests, use n8n's manual `Execute Workflow` button instead of changing the live schedule.

Flow 2 should normally be run from the saved anniversary rows created by Flow 1.

## How to add or remove brokers

Brokers are loaded automatically from the HubSpot team:

```text
Loaders (Repeat Business Reps)
Team ID: 167787456
```

To add or remove a broker, update that person's team membership in HubSpot. Do not edit a broker ID list in the workflow.

Both workflows that need broker details must include a node named:

```text
Get Sales Reps
```

That node should return one item per current Loaders rep, with these fields:

```text
broker_id
email
first_name
last_name
team_id
```

The `Dedupe Deals and Calculate Anniversary Dates` node uses `broker_id` values from `Get Sales Reps` to decide which deal owners are known broker owners.

The `Build Email Payloads` node uses `broker_id`, name, and email values from `Get Sales Reps` to decide who receives broker emails and what email address to use.

Each broker needs:

- HubSpot owner ID
- Full name
- First name
- Email address

If a broker is added to Loaders, they are picked up automatically on the next run.

If a broker is removed from Loaders, they stop receiving broker emails on the next run.

If a deal has no owner, it is not sent to a broker. It is listed in Oliver's manager summary under data-quality flags.

If a deal has an owner ID that is not in the current Loaders team, it is not sent to a broker. It is listed in Oliver's manager summary under data-quality flags.

## How to update the talking points

Open the `Build Email Payloads` node.

Find the function called:

```js
talkingPointsHtml()
```

Edit the text inside that function.

The talking points appear at the bottom of every broker email.

Keep the wording relationship-focused. Do not add sales, exit, portfolio review, cross-sell, valuation, or similar sales language unless Oliver approves it.

## Manager summary

Oliver always receives a manager summary email, even if no broker emails are sent.

The summary includes:

- Total unique casks
- Cohort breakdown by anniversary year
- Per-broker check-in counts
- Data-quality flags

The data-quality section lists casks with:

- Missing owner
- Owner outside current Loaders team
- Conflicting duplicate owners
- Multiple associated contacts
- Contact lookup needed

## Testing notes

For a manual test, use n8n's manual `Execute Workflow` button.

Do not change the live schedule just to run a one-off test.

The known historical test baseline is Sunday 26 April 2026. A 3-year-only test for that date produces about 30 unique casks. The full production workflow can produce more because it includes multiple anniversary cohorts, not only the 3-year cohort.

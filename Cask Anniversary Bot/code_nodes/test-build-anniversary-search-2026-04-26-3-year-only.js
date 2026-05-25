// Nodename: TEST Build HubSpot Anniversary Deal Search Windows 2026-04-26 3-Year Only
const YEAR_OFFSETS = [3];

// Fixed baseline run date from the brief: Sunday 26 April 2026.
// This test searches only the 3-year anniversary cohort.
const todayStart = new Date("2026-04-26T00:00:00.000+01:00");
const windowEnd = new Date("2026-05-03T23:59:59.999+01:00");

const toTs = (d) => d.getTime().toString();

const items = [];

for (const yearOffset of YEAR_OFFSETS) {
  const start = new Date(todayStart);
  const endDate = new Date(windowEnd);

  start.setFullYear(todayStart.getFullYear() - yearOffset);
  endDate.setFullYear(windowEnd.getFullYear() - yearOffset);

  items.push({
    json: {
      start: toTs(start),
      end: toTs(endDate),
      year: todayStart.getFullYear() - yearOffset,
      filterGroups: [
        {
          filters: [
            {
              propertyName: "dealstage",
              operator: "EQ",
              value: "closedwon",
            },
            {
              propertyName: "closedate",
              operator: "BETWEEN",
              value: toTs(start),
              highValue: toTs(endDate),
            },
          ],
        },
      ],
      properties: ["dealname", "amount", "closedate", "hubspot_owner_id"],
      limit: 200,
    },
  });
}

return items;

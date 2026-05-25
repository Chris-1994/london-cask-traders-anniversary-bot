// Nodename: TEST Build HubSpot Anniversary Deal Search Windows 2026-04-26
const YEARS_BACK = 5;

// Fixed baseline run date from the brief: Sunday 26 April 2026.
// The search window is 26 April 2026 to 3 May 2026 in Europe/London time.
const todayStart = new Date("2026-04-26T00:00:00.000+01:00");
const windowEnd = new Date("2026-05-03T23:59:59.999+01:00");

const toTs = (d) => d.getTime().toString();

const items = [];

for (let i = 1; i <= YEARS_BACK; i++) {
  const start = new Date(todayStart);
  const endDate = new Date(windowEnd);

  start.setFullYear(todayStart.getFullYear() - i);
  endDate.setFullYear(windowEnd.getFullYear() - i);

  items.push({
    json: {
      start: toTs(start),
      end: toTs(endDate),
      year: todayStart.getFullYear() - i,
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

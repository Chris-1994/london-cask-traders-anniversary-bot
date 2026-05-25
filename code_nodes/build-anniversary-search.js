const YEARS_BACK = 5;

const now = new Date();

// Local UK calendar start/end because server timezone is UK.
const todayStart = new Date(
  now.getFullYear(),
  now.getMonth(),
  now.getDate(),
  0,
  0,
  0,
  0,
);

const windowEnd = new Date(
  now.getFullYear(),
  now.getMonth(),
  now.getDate() + 7,
  23,
  59,
  59,
  999,
);

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

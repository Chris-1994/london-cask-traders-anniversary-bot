const BROKERS = {
  78019389: {
    name: "Ross Davis",
    firstName: "Ross",
    email: "ross@londoncasktraders.com",
  },
  669879360: {
    name: "Omar Ismail",
    firstName: "Omar",
    email: "omar@londoncasktraders.com",
  },
  495523060: {
    name: "Andrew Parker",
    firstName: "Andrew",
    email: "andrew@londoncasktraders.com",
  },
  2098380599: {
    name: "Joshua Lelan",
    firstName: "Joshua",
    email: "joshual@londoncasktraders.com",
  },
  270811372: {
    name: "Alice Allen",
    firstName: "Alice",
    email: "alice@londoncasktraders.com",
  },
};

const MANAGER_EMAIL = "oliver@londoncasktraders.com";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function cleanCaskName(dealname) {
  return String(dealname || "")
    .replace(/\s*—\s*\d{6}\s*$/, "")
    .replace(/\s*Cask\s*/i, " ")
    .replace(/[()]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cohortName(years) {
  return years >= 5 ? "5-year+" : `${years}-year`;
}

function brokerSubject(items) {
  return `Anniversary check-ins — week of ${items[0]?.anniversaryDate || ""}`;
}

function managerSubject(items) {
  return `Weekly anniversary roundup — week of ${items[0]?.anniversaryDate || ""}`;
}

function talkingPointsHtml() {
  return `
<p><strong>Talking-point guide:</strong></p>
<ul>
  <li><strong>1yr:</strong> First anniversary — quick check-in call. Confirm contact details and storage info still correct. Ask if they have any questions about their cask.</li>
  <li><strong>2yr:</strong> Two years in. Light-touch hello, ask how they're doing, send a maturation update if available.</li>
  <li><strong>3yr:</strong> Three years in. Send a maturation update if available. Ask how they're doing, whether they'd like to visit the warehouse or distillery, and confirm contact details are still current.</li>
  <li><strong>4yr:</strong> Four-year check-in. Ask if they have any questions about how their cask is maturing. Offer a sample/regauge if they'd like one.</li>
  <li><strong>5yr+:</strong> Major milestone. Send a maturation update. Ask how they're doing and whether they'd like a visit.</li>
</ul>`;
}

function buildClientBullet(clientItems) {
  const first = clientItems[0];
  const contactName = escapeHtml(first.contactName || "Contact lookup needed");
  const contact = first.contactUrl
    ? `<a href="${escapeHtml(first.contactUrl)}">${contactName}</a>`
    : contactName;

  const phone = first.phone ? ` — 📞 ${escapeHtml(first.phone)}` : "";

  if (clientItems.length === 1) {
    return `<li><strong>${contact}</strong> — ${escapeHtml(cleanCaskName(first.dealname))} (ref ${escapeHtml(first.caskRef)})${phone}</li>`;
  }

  const casks = clientItems
    .map(
      (item) =>
        `${cleanCaskName(item.dealname)} ref ${item.caskRef} closing ${item.anniversaryDate}`,
    )
    .map(escapeHtml)
    .join(", ");

  return `<li><strong>${contact}</strong> — ${clientItems.length} casks (${casks})${phone} — single check-in covers all</li>`;
}

function groupBy(items, keyFn) {
  const map = new Map();

  for (const item of items) {
    const key = keyFn(item);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  }

  return map;
}

function buildBrokerHtml(broker, items) {
  let html = `<p>Hi ${escapeHtml(broker.firstName)},</p>`;
  html += `<p>You have a number of clients hitting cask anniversaries this week.</p>`;

  const byDateAndYears = groupBy(
    items,
    (item) => `${item.anniversaryDate}|${item.anniversaryYears}`,
  );

  for (const [key, groupItems] of byDateAndYears.entries()) {
    const [anniversaryDate, years] = key.split("|");

    html += `<p><strong>${escapeHtml(anniversaryDate)} — ${escapeHtml(cohortName(Number(years)))} anniversaries</strong></p>`;
    html += "<ul>";

    const byContact = groupBy(
      groupItems,
      (item) => item.contactId || `missing-${item.caskRef}`,
    );

    for (const clientItems of byContact.values()) {
      html += buildClientBullet(clientItems);
    }

    html += "</ul>";
  }

  html += talkingPointsHtml();

  return html;
}

function buildManagerHtml(items) {
  if (items.length === 0) {
    return "<p>No anniversaries this week</p>";
  }

  const cohortCounts = {
    "1-year": 0,
    "2-year": 0,
    "3-year": 0,
    "4-year": 0,
    "5-year+": 0,
  };

  for (const item of items) {
    const key =
      item.anniversaryYears >= 5 ? "5-year+" : `${item.anniversaryYears}-year`;
    if (cohortCounts[key] !== undefined) cohortCounts[key] += 1;
  }

  const brokerCounts = Object.fromEntries(
    Object.entries(BROKERS).map(([ownerId, broker]) => [
      broker.name,
      items.filter((item) => item.ownerId === ownerId).length,
    ]),
  );

  const missingOwner = items.filter((item) =>
    (item.flags || []).includes("missing_owner"),
  );
  const contactLookupNeeded = items.filter((item) =>
    (item.flags || []).includes("contact_lookup_needed"),
  );
  const conflictingOwners = items.filter((item) =>
    (item.flags || []).includes("conflicting_duplicate_owners"),
  );

  let html = "<p>Hi Oliver,</p>";
  html += `<p><strong>Total anniversaries this week:</strong> ${items.length} unique casks across 5 brokers</p>`;

  html += "<p><strong>Cohort breakdown:</strong></p><ul>";
  for (const [label, count] of Object.entries(cohortCounts)) {
    html += `<li>${escapeHtml(label)}: ${count} casks</li>`;
  }
  html += "</ul>";

  html += "<p><strong>Per-broker capacity:</strong></p><ul>";
  for (const [brokerName, count] of Object.entries(brokerCounts)) {
    html += `<li>${escapeHtml(brokerName)} — ${count} check-ins</li>`;
  }
  html += "</ul>";

  html += "<p><strong>Data quality flags:</strong></p><ul>";
  html += `<li>${missingOwner.length} deals with no owner assigned — ${missingOwner.map((item) => item.caskRef).join(", ") || "none"}</li>`;
  html += `<li>${conflictingOwners.length} casks where contact mapping was ambiguous (multiple deal duplicates with conflicting owners) — ${conflictingOwners.map((item) => item.caskRef).join(", ") || "none"}</li>`;
  html += `<li>${contactLookupNeeded.length} casks with contact lookup needed — ${contactLookupNeeded.map((item) => item.caskRef).join(", ") || "none"}</li>`;
  html += "</ul>";

  return html;
}

const items = $input.all().map((item) => item.json);
const outputs = [];

for (const [ownerId, broker] of Object.entries(BROKERS)) {
  const brokerItems = items.filter((item) => item.ownerId === ownerId);

  if (brokerItems.length === 0) {
    continue;
  }

  outputs.push({
    json: {
      emailType: "broker",
      ownerId,
      to: broker.email,
      subject: brokerSubject(brokerItems),
      html: buildBrokerHtml(broker, brokerItems),
      itemCount: brokerItems.length,
    },
  });
}

outputs.push({
  json: {
    emailType: "manager",
    to: MANAGER_EMAIL,
    subject: managerSubject(items),
    html: buildManagerHtml(items),
    itemCount: items.length,
  },
});

return outputs;

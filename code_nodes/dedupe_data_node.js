const BROKER_IDS = new Set([
  "78019389",
  "669879360",
  "495523060",
  "2098380599",
  "270811372",
]);

const outputByRef = new Map();

function parseAmount(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

function extractCaskRef(dealname) {
  const match = String(dealname || "").match(/—\s*(\d{6})\s*$/);
  return match ? match[1] : null;
}

function getLondonDateParts(isoDate) {
  const date = new Date(isoDate);

  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(date);

  const get = (type) => parts.find((part) => part.type === type)?.value;

  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
  };
}

function getAnniversaryDisplayDate(month, day, anniversaryYear) {
  const date = new Date(Date.UTC(anniversaryYear, month - 1, day, 12, 0, 0));

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(date);
}

function getAnniversarySortDate(month, day, anniversaryYear) {
  const monthText = String(month).padStart(2, "0");
  const dayText = String(day).padStart(2, "0");

  return `${anniversaryYear}-${monthText}-${dayText}`;
}

function getLondonCurrentYear() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
  }).formatToParts(new Date());

  return Number(parts.find((part) => part.type === "year")?.value);
}

function shouldReplaceExisting(existing, candidate) {
  if (candidate.amount > existing.amount) {
    return true;
  }

  if (candidate.amount < existing.amount) {
    return false;
  }

  if (!existing.ownerId && candidate.ownerId) {
    return true;
  }

  if (existing.ownerId && !candidate.ownerId) {
    return false;
  }

  const existingModified = new Date(existing.lastModifiedDate || 0).getTime();
  const candidateModified = new Date(candidate.lastModifiedDate || 0).getTime();

  return candidateModified > existingModified;
}

const currentLondonYear = getLondonCurrentYear();

for (const item of $input.all()) {
  const deals = item.json.results || [];

  for (const deal of deals) {
    const props = deal.properties || {};
    const caskRef = extractCaskRef(props.dealname);
    const amount = parseAmount(props.amount);

    if (!caskRef) {
      continue;
    }

    const dateParts = getLondonDateParts(props.closedate);

    const normalized = {
      dealId: deal.id,
      caskRef,
      dealname: props.dealname,
      amount,
      closedate: props.closedate,
      closeYear: dateParts.year,
      anniversaryDate: getAnniversaryDisplayDate(
        dateParts.month,
        dateParts.day,
        currentLondonYear,
      ),
      anniversarySortDate: getAnniversarySortDate(
        dateParts.month,
        dateParts.day,
        currentLondonYear,
      ),
      anniversaryYears: currentLondonYear - dateParts.year,
      ownerId: props.hubspot_owner_id || null,
      lastModifiedDate: props.hs_lastmodifieddate || null,
      duplicateDealIds: [deal.id],
      conflictingOwnerIds: [],
      flags: [],
    };

    const existing = outputByRef.get(caskRef);

    if (!existing) {
      outputByRef.set(caskRef, normalized);
      continue;
    }

    const duplicateDealIds = [...existing.duplicateDealIds, deal.id];
    const conflictingOwnerIds = [...existing.conflictingOwnerIds];

    if (
      normalized.ownerId &&
      existing.ownerId &&
      normalized.ownerId !== existing.ownerId &&
      !conflictingOwnerIds.includes(normalized.ownerId)
    ) {
      conflictingOwnerIds.push(normalized.ownerId);
    }

    if (shouldReplaceExisting(existing, normalized)) {
      normalized.duplicateDealIds = duplicateDealIds;
      normalized.conflictingOwnerIds = conflictingOwnerIds;
      outputByRef.set(caskRef, normalized);
    } else {
      existing.duplicateDealIds = duplicateDealIds;
      existing.conflictingOwnerIds = conflictingOwnerIds;
    }
  }
}

const output = [];

for (const deal of outputByRef.values()) {
  const flags = new Set(deal.flags || []);

  if (!deal.ownerId) {
    flags.add("missing_owner");
  } else if (!BROKER_IDS.has(String(deal.ownerId))) {
    flags.add("unknown_owner");
  }

  if (deal.conflictingOwnerIds.length > 0) {
    flags.add("conflicting_duplicate_owners");
  }

  output.push({
    json: {
      ...deal,
      flags: [...flags],
    },
  });
}

return output;

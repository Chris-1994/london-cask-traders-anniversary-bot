// Nodename: Build Final Anniversary Outreach Record

return $input.all().map((item) => {
  const data = item.json;
  const flags = [...new Set(data.flags || [])];

  return {
    json: {
      dealId: data.dealId,
      caskRef: data.caskRef,
      dealname: data.dealname,
      amount: data.amount,
      closedate: data.closedate,
      closeYear: data.closeYear,
      anniversaryDate: data.anniversaryDate,
      anniversarySortDate: data.anniversarySortDate,
      anniversaryYears: data.anniversaryYears,
      ownerId: data.ownerId,
      lastModifiedDate: data.lastModifiedDate,

      contactId: data.contactId,
      contactName: data.contactName || "Contact lookup needed",
      phone: data.phone || "",
      contactUrl: data.contactUrl || "",
      contactLookupStatus: data.contactLookupStatus,

      duplicateDealIds: data.duplicateDealIds || [],
      conflictingOwnerIds: data.conflictingOwnerIds || [],
      allAssociatedContactIds: data.allAssociatedContactIds || [],

      flags,
    },
  };
});

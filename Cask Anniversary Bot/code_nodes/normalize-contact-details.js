// Nodename: Normalize HubSpot Contact Details
const PORTAL_ID = "25187088";

return $input.all().map((item) => {
  const props = item.json.properties || {};

  const firstName = props.firstname || "";
  const lastName = props.lastname || "";
  const contactName =
    `${firstName} ${lastName}`.trim() || "Contact name missing";

  const phone = props.phone || props.mobilephone || "";
  const flags = new Set(item.json.flags || []);

  if (!phone) {
    flags.add("missing_phone");
  }

  return {
    json: {
      ...item.json,
      contactName,
      phone,
      contactUrl: `https://app.hubspot.com/contacts/${PORTAL_ID}/record/0-1/${item.json.contactId}`,
      flags: [...flags],
    },
  };
});

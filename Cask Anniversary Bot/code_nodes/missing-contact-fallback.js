// Nodename: Set Placeholder Contact Details for Missing Lookup
return $input.all().map((item) => ({
  json: {
    ...item.json,
    contactName: "Contact lookup needed",
    phone: "",
    contactUrl: "",
    flags: [...new Set(item.json.flags || [])],
  },
}));

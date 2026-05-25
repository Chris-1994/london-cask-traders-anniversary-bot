const output = [];

for (const item of $input.all()) {
  const contacts = item.json.results || [];
  const chosenContact = contacts[0] || null;

  const flags = new Set(item.json.flags || []);

  if (!chosenContact) {
    flags.add('contact_lookup_needed');
  }

  if (contacts.length > 1) {
    flags.add('multiple_contacts');
  }

  output.push({
    json: {
      ...item.json,
      contactId: chosenContact ? chosenContact.id : null,
      contactLookupStatus: !chosenContact
        ? 'missing_contact'
        : contacts.length > 1
          ? 'multiple_contacts'
          : 'ok',
      allAssociatedContactIds: contacts.map((contact) => contact.id),
      flags: [...flags],
    },
  });
}

return output;
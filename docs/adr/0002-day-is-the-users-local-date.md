# A Day is the user's local calendar date, and old UTC-dated entries are not migrated

Every per-day concept (the food diary, daily allowances, the Coach's "today") uses the user's own time zone. The app reports it with each request, and the server keeps it on the Account and accepts a change at most once every 24 hours, so a client cannot reset its daily allowance by claiming a different zone. The Expo app used to file Entries under the UTC date, which put Taiwan users' meals logged before 8 a.m. on the previous Day. We switch the app to the local date going forward and do not migrate existing Entries: they were almost all pre-launch test data, the demo Account is re-seeded before launch, and old records carry no time zone to convert from.

## Consequences

- Entries logged in the Expo app before this change may appear one Day early. This is expected, not a bug.
- A user who crosses time zones more than once within 24 hours keeps the earlier zone until the 24 hours pass.

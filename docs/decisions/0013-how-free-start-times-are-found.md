# How free start times are found

Slots are calculated on request, not stored. The engine has no database, and a calculated answer is never out of date. A platform can cache the answer if it needs to.

The platform passes the busy times as facts: one time range per booking, hold or calendar block, for a resource. A busy time already includes the gaps of the booking that made it. A new booking blocks its own time plus its own gaps, and that blocked time may not overlap a busy time. So the gap between two bookings is the gap after the first plus the gap before the second. Most businesses set only one of the two.

One function, `findBlockers`, decides if a start time is free. Listing a day and checking one time both call it, so they cannot disagree. Start times step by real elapsed minutes from the opening time. So on the night the clocks go forward, the hour that does not exist is never offered, and on the night they go back, the repeated hour is offered twice.

Opening hours are a list of windows per weekday for each resource. A lunch break is the space between two windows; there is no separate "break" setting. Whole closed days are closures in the settings. A part-day block is a busy time. Busy times are sorted and merged once per request, and each check uses a binary search, so a day lists fast with 10,000 busy times.

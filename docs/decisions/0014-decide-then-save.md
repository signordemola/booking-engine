# The engine decides a booking, and a store saves it

`decideBooking` is pure. It checks the time, prices the booking and returns the record to save, its quote and the events that happened. It saves nothing. A store saves the record. So the same decision works in a test, in a scenario file and behind any database.

A booking with money due today starts as `pending`: the time is held for the number of minutes the owner sets, and it is confirmed only when the deposit is paid. A booking with nothing due today is confirmed at once. A hold that runs out becomes `expired` and frees the time. A late payment on an expired booking is refused, because someone else may have taken the time; the platform must refund it or book again. Each status change is one action checked against a table of allowed moves.

A store must keep three promises: two bookings that keep their time never overlap for the same resource of the same business; a repeated request with the same booking id returns the first booking; a change is saved only if the status is still the one that was read. The in-memory store keeps them, and tests prove it with 20 requests at the same moment. A code check alone is not enough: all 20 requests read "free" before any of them saves, so the rule must sit where the save happens. A Postgres store will keep the same promises with a database rule.

The booking record is small: ids, status, times and amounts. The quote is returned beside it, and the platform keeps it as the copy of the rules the booking used.

A hold that runs out is released without a clean-up job. Before the store reads the busy times for a new booking or a slot list, it marks every pending booking whose hold is over as `expired`. So a time is free again the moment its hold ends, even if no job ran. A client who goes back to the calendar passes their own booking id, and the store leaves that booking out of the busy times, so they still see the time they hold.

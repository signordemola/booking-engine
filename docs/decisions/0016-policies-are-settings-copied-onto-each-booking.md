# Policies are settings, and each booking keeps a copy

Competitors let an owner choose a notice period and what is kept on a late cancel or a no-show: Fresha takes a percentage or a fixed amount of the appointment value, Booksy a notice in days or hours, Acuity a notice for cancel and reschedule. We found no help page that limits the number of moves; "moves once" is a promise on demolastudio.com that the tools we checked leave out. So the policy is one part of the settings: a cancellation kind (`non-refundable`, or `notice` with hours and what a late cancel keeps), what a no-show keeps, and a reschedule notice with a limit on moves. What is kept is one of three kinds: what was paid, a percentage of the total, or a fixed amount, capped at the total.

Each booking keeps a copy of the policy it was made with, and a count of its moves. An owner who changes the policy later does not change what an existing client agreed to. A move keeps the price, the services and the staff member; it shifts the times and runs the same slot check as a new booking, so a patch test rule still applies.

The engine does not know what the client paid, so the platform passes `paidMinor`. The answer gives what is kept, what is refunded and what is still to charge. When the business cancels, everything is refunded. A held booking that was never paid keeps nothing.

The Canada Revenue Agency treats a kept deposit as if it includes the tax ([GST/HST memo 300-6-8](https://www.canada.ca/en/revenue-agency/services/forms-publications/publications/g300-6-8/deposits-gst-300-6-8.html)), so the answer shows the tax inside the kept amount for each rate. It uses the tax in the current settings, not a copy; a booking does not keep its tax rates yet.

Not built: a policy for each service, a fee for a move, and a move to another staff member.

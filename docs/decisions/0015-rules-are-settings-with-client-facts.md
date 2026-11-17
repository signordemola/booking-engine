# Booking rules are settings, checked against facts about the client

An owner adds rules to the settings. Each rule is one of five kinds: `prerequisite` (something that must come first, such as a patch test or a consultation, with a waiting time in hours and a validity in days), `consent` (a form the client must sign, by version), `book-alone`, `fill-window` and `new-client-deposit`. One `prerequisite` kind covers both patch tests and consultations, because they differ only in their numbers.

The engine cannot know a client's history, so the platform passes it as facts: past visits, prerequisites done or booked, and consents signed. A rule acts at the moment that fits it. A prerequisite and a fill window act on time: the slot list only offers times that satisfy them, and says why a day is empty. Consent acts as a gate on the booking decision, so a client can look at times before signing, but cannot book, and so cannot pay, before signing. A new-client deposit and a staff level act on the price.

When the platform passes no client facts, the engine takes the safe side of each rule. A safety rule treats the client as having no history, so a full set is refused without a patch test. A price rule is not applied, so an unknown client is never charged the new-client deposit by mistake.

A fill past its window is refused with a message that names the full set to book. The engine does not swap the service in silence: that would change the price and the length of what the client asked for. The platform reads the code `rule.fill-window-passed` and offers the full set.

We did not find a standard for how long a patch test stays valid; sources range from "before every tint" to one year. So the validity is a setting.

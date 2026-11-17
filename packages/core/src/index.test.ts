import { expect, test } from "vitest";
import * as publicApi from "./index.js";

test("the public API is exactly this list", () => {
  expect(Object.keys(publicApi).sort()).toEqual([
    "applyBookingAction",
    "checkSlot",
    "createQuote",
    "decideBooking",
    "listSlots",
    "occupiesSlot",
    "operations",
    "parseSettings",
    "runOperation",
  ]);
});

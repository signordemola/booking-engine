import type { BusinessSettings } from "../settings/settings-schema.js";

export const lashStudio: BusinessSettings = {
  version: 1,
  businessId: "lash-by-nadia",
  currency: "USD",
  timeZone: "America/New_York",
  tax: {
    kind: "none",
  },
  defaultDeposit: {
    kind: "none",
  },
  services: [
    {
      id: "hybrid-full-set",
      name: "Hybrid full set",
      price: {
        kind: "fixed",
        amountMinor: 12000,
        durationMinutes: 150,
      },
      deposit: {
        kind: "percentage",
        percent: 25,
      },
      addOnIds: ["lash-bath", "aftercare-kit"],
    },
    {
      id: "lash-removal",
      name: "Lash removal",
      price: {
        kind: "fixed",
        amountMinor: 2500,
        durationMinutes: 30,
      },
      addOnIds: [],
    },
    {
      id: "hybrid-fill",
      name: "Hybrid fill",
      price: {
        kind: "fixed",
        amountMinor: 6500,
        durationMinutes: 75,
      },
      deposit: {
        kind: "percentage",
        percent: 25,
      },
      addOnIds: ["lash-bath"],
    },
    {
      id: "patch-test",
      name: "Patch test",
      price: {
        kind: "fixed",
        amountMinor: 0,
        durationMinutes: 15,
      },
      addOnIds: [],
    },
    {
      id: "brow-consultation",
      name: "Brow consultation",
      price: {
        kind: "fixed",
        amountMinor: 0,
        durationMinutes: 30,
      },
      addOnIds: [],
    },
    {
      id: "ombre-brows",
      name: "Ombre brows",
      price: {
        kind: "fixed",
        amountMinor: 35000,
        durationMinutes: 180,
      },
      deposit: {
        kind: "fixed",
        amountMinor: 10000,
      },
      addOnIds: [],
    },
  ],
  addOns: [
    {
      id: "lash-bath",
      name: "Lash bath",
      priceMinor: 1000,
      extraMinutes: 15,
      maxQuantity: 1,
    },
    {
      id: "aftercare-kit",
      name: "Aftercare kit",
      priceMinor: 1800,
      extraMinutes: 0,
      maxQuantity: 3,
    },
  ],
  fees: [
    {
      id: "home-visit",
      name: "Home visit",
      amountMinor: 2000,
      due: "today",
    },
    {
      id: "after-hours",
      name: "After-hours appointment",
      amountMinor: 1500,
      due: "later",
    },
  ],
  schedule: {
    slotStepMinutes: 30,
    minNoticeMinutes: 120,
    maxAdvanceDays: 60,
    holdMinutes: 15,
    gaps: {
      beforeMinutes: 0,
      afterMinutes: 15,
    },
  },
  levels: [],
  resources: [
    {
      id: "nadia",
      name: "Nadia",
      serviceIds: [
        "hybrid-full-set",
        "lash-removal",
        "hybrid-fill",
        "patch-test",
        "brow-consultation",
        "ombre-brows",
      ],
      hours: {
        monday: [],
        tuesday: [
          {
            start: "10:00",
            end: "18:00",
          },
        ],
        wednesday: [
          {
            start: "10:00",
            end: "18:00",
          },
        ],
        thursday: [
          {
            start: "10:00",
            end: "18:00",
          },
        ],
        friday: [
          {
            start: "10:00",
            end: "18:00",
          },
        ],
        saturday: [
          {
            start: "10:00",
            end: "18:00",
          },
        ],
        sunday: [],
      },
    },
  ],
  closures: [],
  rules: [
    {
      kind: "prerequisite",
      id: "patch-test-for-lashes",
      name: "Patch test",
      serviceIds: ["hybrid-full-set"],
      minHoursBefore: 48,
      validDays: 365,
    },
    {
      kind: "fill-window",
      id: "hybrid-fill-window",
      fillServiceId: "hybrid-fill",
      fullSetServiceId: "hybrid-full-set",
      maxDays: 21,
    },
    {
      kind: "prerequisite",
      id: "consultation-for-brows",
      name: "Brow consultation",
      serviceIds: ["ombre-brows"],
      minHoursBefore: 0,
      validDays: 90,
    },
    {
      kind: "consent",
      id: "pmu-consent",
      name: "PMU consent form",
      serviceIds: ["ombre-brows"],
      formVersion: "2026-01",
    },
    {
      kind: "book-alone",
      id: "tests-and-consultations-alone",
      serviceIds: ["patch-test", "brow-consultation"],
    },
  ],
};

export const salon: BusinessSettings = {
  version: 1,
  businessId: "atelier-rosa",
  currency: "CAD",
  timeZone: "America/Toronto",
  tax: {
    kind: "added",
    rates: [
      {
        id: "gst",
        name: "GST",
        percent: 5,
      },
      {
        id: "qst",
        name: "QST",
        percent: 9.975,
      },
    ],
    timing: "with-each-payment",
  },
  defaultDeposit: {
    kind: "percentage",
    percent: 25,
  },
  services: [
    {
      id: "balayage",
      name: "Balayage",
      price: {
        kind: "fixed",
        amountMinor: 24000,
        durationMinutes: 180,
        levelPrices: [
          {
            levelId: "senior",
            amountMinor: 28000,
          },
        ],
      },
      addOnIds: ["bond-treatment"],
    },
    {
      id: "fringe-trim",
      name: "Fringe trim",
      price: {
        kind: "fixed",
        amountMinor: 1500,
        durationMinutes: 15,
      },
      deposit: {
        kind: "none",
      },
      addOnIds: [],
    },
  ],
  addOns: [
    {
      id: "bond-treatment",
      name: "Bond treatment",
      priceMinor: 3500,
      extraMinutes: 30,
      maxQuantity: 1,
    },
  ],
  fees: [],
  schedule: {
    slotStepMinutes: 15,
    minNoticeMinutes: 60,
    maxAdvanceDays: 90,
    holdMinutes: 10,
    gaps: {
      beforeMinutes: 0,
      afterMinutes: 10,
    },
  },
  levels: [
    {
      id: "senior",
      name: "Senior stylist",
    },
  ],
  resources: [
    {
      id: "camille",
      name: "Camille",
      levelId: "senior",
      serviceIds: ["balayage", "fringe-trim"],
      hours: {
        monday: [],
        tuesday: [
          {
            start: "09:00",
            end: "12:00",
          },
          {
            start: "13:00",
            end: "17:00",
          },
        ],
        wednesday: [
          {
            start: "09:00",
            end: "12:00",
          },
          {
            start: "13:00",
            end: "17:00",
          },
        ],
        thursday: [
          {
            start: "09:00",
            end: "12:00",
          },
          {
            start: "13:00",
            end: "17:00",
          },
        ],
        friday: [
          {
            start: "09:00",
            end: "12:00",
          },
          {
            start: "13:00",
            end: "17:00",
          },
        ],
        saturday: [
          {
            start: "09:00",
            end: "12:00",
          },
          {
            start: "13:00",
            end: "17:00",
          },
        ],
        sunday: [],
      },
    },
    {
      id: "noah",
      name: "Noah",
      serviceIds: ["fringe-trim"],
      hours: {
        monday: [],
        tuesday: [],
        wednesday: [
          {
            start: "11:00",
            end: "19:00",
          },
        ],
        thursday: [
          {
            start: "11:00",
            end: "19:00",
          },
        ],
        friday: [
          {
            start: "11:00",
            end: "19:00",
          },
        ],
        saturday: [
          {
            start: "11:00",
            end: "19:00",
          },
        ],
        sunday: [
          {
            start: "11:00",
            end: "19:00",
          },
        ],
      },
    },
  ],
  closures: [],
  rules: [
    {
      kind: "new-client-deposit",
      id: "new-client-deposit",
      deposit: {
        kind: "percentage",
        percent: 50,
      },
    },
  ],
};

export const hireStudio: BusinessSettings = {
  version: 1,
  businessId: "northlight-studio",
  currency: "CAD",
  timeZone: "America/Toronto",
  tax: {
    kind: "added",
    rates: [
      {
        id: "hst",
        name: "HST",
        percent: 13,
      },
    ],
    timing: "with-balance",
  },
  defaultDeposit: {
    kind: "percentage",
    percent: 50,
  },
  services: [
    {
      id: "daylight-studio",
      name: "Daylight studio",
      price: {
        kind: "hourly",
        hourlyMinor: 8500,
        minHours: 2,
        maxHours: 8,
      },
      addOnIds: ["backdrop", "lighting-kit"],
    },
  ],
  addOns: [
    {
      id: "backdrop",
      name: "Paper backdrop",
      priceMinor: 2500,
      extraMinutes: 0,
      maxQuantity: 2,
    },
    {
      id: "lighting-kit",
      name: "Lighting kit",
      priceMinor: 4000,
      extraMinutes: 0,
      maxQuantity: 1,
    },
  ],
  fees: [],
  schedule: {
    slotStepMinutes: 60,
    minNoticeMinutes: 1440,
    maxAdvanceDays: 180,
    holdMinutes: 30,
    gaps: {
      beforeMinutes: 0,
      afterMinutes: 30,
    },
  },
  levels: [],
  resources: [
    {
      id: "daylight-room",
      name: "Daylight room",
      serviceIds: ["daylight-studio"],
      hours: {
        monday: [
          {
            start: "08:00",
            end: "22:00",
          },
        ],
        tuesday: [
          {
            start: "08:00",
            end: "22:00",
          },
        ],
        wednesday: [
          {
            start: "08:00",
            end: "22:00",
          },
        ],
        thursday: [
          {
            start: "08:00",
            end: "22:00",
          },
        ],
        friday: [
          {
            start: "08:00",
            end: "22:00",
          },
        ],
        saturday: [
          {
            start: "08:00",
            end: "22:00",
          },
        ],
        sunday: [
          {
            start: "08:00",
            end: "22:00",
          },
        ],
      },
    },
  ],
  closures: [
    {
      from: "2026-12-25",
      to: "2026-12-26",
      reason: "Christmas",
    },
  ],
  rules: [
    {
      kind: "consent",
      id: "hire-rules",
      name: "Studio hire rules",
      serviceIds: ["daylight-studio"],
      formVersion: "2026-03",
    },
  ],
};

export const photographer: BusinessSettings = {
  version: 1,
  businessId: "clara-monet-photography",
  currency: "GBP",
  timeZone: "Europe/London",
  tax: {
    kind: "included",
    rates: [
      {
        id: "vat",
        name: "VAT",
        percent: 20,
      },
    ],
    timing: "with-each-payment",
  },
  defaultDeposit: {
    kind: "none",
  },
  services: [
    {
      id: "portrait-session",
      name: "Portrait session",
      price: {
        kind: "fixed",
        amountMinor: 25000,
        durationMinutes: 90,
      },
      deposit: {
        kind: "fixed",
        amountMinor: 7500,
      },
      addOnIds: [],
    },
  ],
  addOns: [],
  fees: [
    {
      id: "travel",
      name: "Travel",
      amountMinor: 2000,
      due: "today",
    },
  ],
  schedule: {
    slotStepMinutes: 30,
    minNoticeMinutes: 2880,
    maxAdvanceDays: 365,
    holdMinutes: 30,
    gaps: {
      beforeMinutes: 30,
      afterMinutes: 30,
    },
  },
  levels: [],
  resources: [
    {
      id: "clara",
      name: "Clara",
      serviceIds: ["portrait-session"],
      hours: {
        monday: [
          {
            start: "09:30",
            end: "17:30",
          },
        ],
        tuesday: [
          {
            start: "09:30",
            end: "17:30",
          },
        ],
        wednesday: [
          {
            start: "09:30",
            end: "17:30",
          },
        ],
        thursday: [
          {
            start: "09:30",
            end: "17:30",
          },
        ],
        friday: [
          {
            start: "09:30",
            end: "17:30",
          },
        ],
        saturday: [
          {
            start: "10:00",
            end: "14:00",
          },
        ],
        sunday: [],
      },
    },
  ],
  closures: [],
  rules: [],
};

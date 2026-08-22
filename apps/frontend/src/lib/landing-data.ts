export const LIFECYCLE = [
  { label: "Submitted", detail: "Filed by the complainant" },
  { label: "Acknowledged", detail: "Routed to the right unit" },
  { label: "In progress", detail: "Being worked on" },
  { label: "Resolved", detail: "Fix reported" },
  { label: "Closed", detail: "Confirmed by complainant" },
] as const;

export const AUDIENCES = [
  {
    title: "Schools & hostels",
    body: "Electrical faults, plumbing, security — routed to facilities the moment they're filed, not whenever someone finds the warden.",
  },
  {
    title: "Workplaces & HR",
    body: "Employee grievances handled with a visible timeline and a proper record, instead of a hallway conversation that goes nowhere.",
  },
  {
    title: "Any institution",
    body: "If people report problems and someone else is meant to fix them, Complainara gives both sides a paper trail.",
  },
] as const;

export const FEATURES = [
  {
    title: "Automatic routing",
    body: "Every complaint category maps to a responsible unit. No manual triage, no complaint sitting in someone's inbox.",
  },
  {
    title: "A visible deadline",
    body: "Each complaint carries an SLA the moment it's filed — the complainant sees exactly when to expect a fix.",
  },
  {
    title: "Auto-escalation",
    body: "If a deadline passes with no action, it moves up the chain on its own. Nothing quietly stalls.",
  },
  {
    title: "A full audit trail",
    body: "Every status change is logged — who changed it, when, and why. Nothing disappears.",
  },
] as const;

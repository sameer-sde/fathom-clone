export const HANDWRITTEN_SUMMARIES: Record<string, { summary: any; actionItems: { text: string; timestamp_seconds: number }[] }> = {
  "Quick sync: onboarding flow": {
    summary: {
      sections: [
        {
          heading: "Key Topics Discussed",
          bullets: [
            { text: "Reordered onboarding to put calendar connection at step one instead of step three, since early signups were dropping off before ever connecting a calendar.", timestamp_seconds: 14 },
            { text: "Outlook calendar connection currently fails with a redirect error on the callback URL, likely a mismatched redirect URI in the app registration.", timestamp_seconds: 35 },
          ],
        },
        {
          heading: "Decisions Made",
          bullets: [
            { text: "Ship target set for Thursday, contingent on the Outlook fix landing first.", timestamp_seconds: 61 },
            { text: "Add a loading state to the calendar sync step so it doesn't appear frozen during the multi-second sync.", timestamp_seconds: 70 },
          ],
        },
        {
          heading: "Next Steps",
          bullets: [
            { text: "Sameer fixes the Outlook redirect URI mismatch.", timestamp_seconds: 52 },
            { text: "Priya runs a full QA pass once the fix is live, targeting tomorrow afternoon.", timestamp_seconds: 61 },
          ],
        },
      ],
    },
    actionItems: [
      { text: "Fix Outlook OAuth redirect URI mismatch blocking calendar connection.", timestamp_seconds: 35 },
      { text: "Add loading state to the calendar sync step in onboarding.", timestamp_seconds: 70 },
      { text: "Full QA pass on new onboarding flow before Thursday ship.", timestamp_seconds: 61 },
    ],
  },
  "Discovery call — Northwind Logistics": {
    summary: {
      sections: [
        {
          heading: "Prospect Needs",
          bullets: [
            { text: "~40 ops and dispatch staff in back-to-back calls with no consistent record-keeping, causing commitments to fall through the cracks.", timestamp_seconds: 10 },
          ],
        },
        {
          heading: "Pain Points / Cost of Inaction",
          bullets: [
            { text: "Three billing disputes last quarter from unrecorded verbal rate commitments, totaling roughly $20,000 in eaten costs.", timestamp_seconds: 38 },
            { text: "Previously tried Otter, but a plain transcript with no surfaced commitments went unread by the team.", timestamp_seconds: 63 },
          ],
        },
        {
          heading: "Decision Process",
          bullets: [
            { text: "Ops director Linda must sign off; IT approval also required due to call-recording policy implications.", timestamp_seconds: 92 },
          ],
        },
        {
          heading: "Next Steps",
          bullets: [
            { text: "Sameer to send a proposal for 40 seats today.", timestamp_seconds: 124 },
            { text: "Schedule a 15-minute call with Linda early next week for sign-off.", timestamp_seconds: 138 },
          ],
        },
      ],
    },
    actionItems: [
      { text: "Send proposal and rough pricing for 40 seats to Daniel.", timestamp_seconds: 124 },
      { text: "Schedule 15-minute call with Linda (ops director) for sign-off.", timestamp_seconds: 138 },
    ],
  },
  "Q3 roadmap review — All hands eng": {
    summary: {
      sections: [
        {
          heading: "Key Topics Discussed",
          bullets: [
            { text: "Payments squad will be down one engineer (Jared, on leave) starting next week — a real capacity constraint on Q3 commitments.", timestamp_seconds: 15 },
            { text: "Auth migration is 70% complete; remaining SSO work for enterprise customers is more involved than scoped, needing ~3 more weeks.", timestamp_seconds: 40 },
            { text: "Two unsigned enterprise deals in Linda's pipeline are both blocked specifically on SSO availability.", timestamp_seconds: 70 },
            { text: "Payments squad is rebuilding the invoicing engine for multi-currency support, required for two European deals.", timestamp_seconds: 108 },
            { text: "New invoicing engine will run in shadow mode for two weeks before cutover to de-risk the revenue-critical rebuild.", timestamp_seconds: 135 },
          ],
        },
        {
          heading: "Decisions Made",
          bullets: [
            { text: "SSO prioritized over general auth cleanup; token refresh improvements pushed to Q4.", timestamp_seconds: 82 },
            { text: "Data team gets read access to shadow-mode invoicing outputs to validate currency conversion accuracy.", timestamp_seconds: 178 },
            { text: "Both the SSO and invoicing workstreams add a one-week buffer for a required security review.", timestamp_seconds: 250 },
          ],
        },
        {
          heading: "Next Steps",
          bullets: [
            { text: "Priya owns SSO delivery as the platform priority.", timestamp_seconds: 268 },
            { text: "Marcus owns the invoicing rebuild and will grant Yuki read access before shadow mode starts.", timestamp_seconds: 268 },
            { text: "Aisha owns onboarding conversion work and will sync with Priya to avoid duplicated effort on calendar-connection redesign.", timestamp_seconds: 225 },
            { text: "Sameer compiles all of the above into the Friday leadership deck.", timestamp_seconds: 268 },
          ],
        },
      ],
    },
    actionItems: [
      { text: "Priya: deliver SSO as top platform priority; push token refresh work to Q4.", timestamp_seconds: 82 },
      { text: "Marcus: grant Yuki read access to shadow-mode invoicing outputs before the two-week validation window starts.", timestamp_seconds: 178 },
      { text: "Priya & Marcus: add one week each for security review before ship dates.", timestamp_seconds: 262 },
      { text: "Aisha & Priya: sync on overlapping onboarding/calendar-connection redesign work.", timestamp_seconds: 225 },
      { text: "Sameer: compile Q3 priorities into Friday's leadership deck.", timestamp_seconds: 268 },
      { text: "Sameer: confirm a firm SSO delivery date with Linda once Priya's estimate is locked in.", timestamp_seconds: 305 },
    ],
  },
};

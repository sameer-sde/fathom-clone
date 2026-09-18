import { createAdminClient } from "../src/lib/supabase/admin";
import { config } from "dotenv";
import { HANDWRITTEN_SUMMARIES } from "./summaries-data";
config({ path: ".env.local" });

const admin = createAdminClient();

const SEED_USER_EMAIL = process.argv[2];
if (!SEED_USER_EMAIL) {
  console.error("Usage: npx tsx scripts/seed.ts <your-signup-email>");
  process.exit(1);
}

type TranscriptLine = { speaker: string; start: number; text: string };

const MEETINGS: {
  title: string;
  meeting_type: string;
  duration_seconds: number;
  participants: string[];
  transcript: TranscriptLine[];
  template: "general" | "sales_call";
}[] = [
  {
    title: "Quick sync: onboarding flow",
    meeting_type: "one_on_one",
    duration_seconds: 130,
    participants: ["Sameer", "Priya"],
    template: "general",
    transcript: [
      { speaker: "Sameer", start: 0, text: "Hey, thanks for jumping on quickly. I wanted to walk through the new onboarding flow before we ship it." },
      { speaker: "Priya", start: 6, text: "Sure, go ahead. I saw the Figma but haven't tested it live yet." },
      { speaker: "Sameer", start: 14, text: "So the main change is we moved calendar connection to step one instead of step three. Early signups were dropping off before ever connecting a calendar." },
      { speaker: "Priya", start: 28, text: "That makes sense. Did we check if Google and Outlook both work in the new order?" },
      { speaker: "Sameer", start: 35, text: "Google's tested and working. Outlook still throws a redirect error on the callback URL, I need to fix that before we can ship." },
      { speaker: "Priya", start: 47, text: "Okay, that's a blocker then. Can you have that done by tomorrow?" },
      { speaker: "Sameer", start: 52, text: "Yeah, should be a quick fix, I think it's just a mismatched redirect URI in the Outlook app registration." },
      { speaker: "Priya", start: 61, text: "Great. Once that's fixed, I'll do a full pass tomorrow afternoon and we can ship Thursday." },
      { speaker: "Sameer", start: 70, text: "Sounds good. I'll also add a loading state on the calendar sync step, right now it just looks frozen for a few seconds." },
      { speaker: "Priya", start: 82, text: "Yes please, I noticed that too and thought it was broken the first time I saw it." },
      { speaker: "Sameer", start: 90, text: "Cool, I'll ping you once the Outlook fix is up." },
      { speaker: "Priya", start: 95, text: "Sounds good, talk soon." },
    ],
  },
  {
    title: "Discovery call — Northwind Logistics",
    meeting_type: "sales",
    duration_seconds: 720,
    participants: ["Sameer", "Daniel Cho"],
    template: "sales_call",
    transcript: [
      { speaker: "Sameer", start: 0, text: "Thanks for making time, Daniel. Before we dive in, can you tell me a bit about what's prompting you to look at a tool like this now?" },
      { speaker: "Daniel Cho", start: 10, text: "Sure. We've got about forty people across ops and dispatch who are in back to back calls all day, and basically nobody writes anything down consistently. Stuff falls through the cracks." },
      { speaker: "Sameer", start: 25, text: "Got it. When something falls through the cracks, what does that actually cost you? Is it a missed delivery commitment, a billing dispute, something else?" },
      { speaker: "Daniel Cho", start: 38, text: "Mostly billing disputes. A customer says we promised a rate on a call, we have no record, and we end up eating the difference. It happened three times last quarter, probably twenty thousand dollars total." },
      { speaker: "Sameer", start: 55, text: "That's a real number. Are you currently using any other notetaker or recording tool at all?" },
      { speaker: "Daniel Cho", start: 63, text: "We tried Otter about a year ago but it was just a transcript, nobody read it. We need something that actually surfaces the commitment or the number, not just a wall of text." },
      { speaker: "Sameer", start: 78, text: "That's exactly the gap we're built for, the summary pulls out commitments and numbers specifically, not just a chronological transcript. Who else would be involved in a decision like this?" },
      { speaker: "Daniel Cho", start: 92, text: "Our ops director, Linda, she'd need to sign off, and IT would need to approve since it touches call recording policy." },
      { speaker: "Sameer", start: 103, text: "Understood. What's your timeline like, is this a this-quarter priority or more exploratory right now?" },
      { speaker: "Daniel Cho", start: 112, text: "Honestly, if the billing dispute thing is solvable, I'd want to move this quarter. We close the books at the end of next month." },
      { speaker: "Sameer", start: 124, text: "Okay, that's helpful. I'll put together a short proposal and a rough number for forty seats, and I'd love to get fifteen minutes with Linda if that's possible." },
      { speaker: "Daniel Cho", start: 138, text: "I can set that up for early next week." },
      { speaker: "Sameer", start: 143, text: "Perfect, I'll send the proposal today and follow up to schedule with Linda." },
    ],
  },
  {
    title: "Q3 roadmap review — All hands eng",
    meeting_type: "general",
    duration_seconds: 3600,
    participants: ["Sameer", "Priya", "Daniel Cho", "Linda Park", "Marcus Webb", "Aisha Khan", "Tom Reilly", "Yuki Tanaka"],
    template: "general",
    transcript: [
      { speaker: "Sameer", start: 0, text: "Okay, let's get started. Today's about locking Q3 priorities across the three squads before we present to leadership Friday." },
      { speaker: "Marcus Webb", start: 15, text: "Before we start, quick flag: the payments squad is down a person starting next week, Jared's on leave, so whatever we commit to needs to account for that." },
      { speaker: "Sameer", start: 30, text: "Noted, thanks Marcus. Let's start with platform. Priya, where are we on the auth migration?" },
      { speaker: "Priya", start: 40, text: "About seventy percent done. The remaining piece is SSO for enterprise customers, which is more involved than we scoped, probably three more weeks." },
      { speaker: "Aisha Khan", start: 58, text: "Does that block the enterprise deals in the pipeline? I know Linda's team has two enterprise prospects waiting on SSO." },
      { speaker: "Linda Park", start: 70, text: "Yes, both are asking for SSO specifically. Neither is signed yet, but it's the top blocker on both." },
      { speaker: "Priya", start: 82, text: "Okay, given that, I'd say we prioritize SSO over the other auth cleanup work, and push token refresh improvements to Q4." },
      { speaker: "Sameer", start: 95, text: "Agreed, that's the right tradeoff. Marcus, payments squad, what's the headline for Q3?" },
      { speaker: "Marcus Webb", start: 108, text: "Main thing is the new invoicing engine. We're rebuilding it to support multi currency, which is needed for the two European deals in Linda's pipeline." },
      { speaker: "Tom Reilly", start: 125, text: "How risky is that rebuild? Invoicing touching revenue makes me nervous about timeline slips." },
      { speaker: "Marcus Webb", start: 135, text: "Fair concern. We're planning to run the new engine in shadow mode for two weeks before cutting over, so we can compare outputs before anyone's real invoice depends on it." },
      { speaker: "Sameer", start: 150, text: "That's a good safety net, let's keep that in the plan even if it adds a couple weeks." },
      { speaker: "Yuki Tanaka", start: 162, text: "From the data side, we'll need access to the shadow mode outputs to validate currency conversion accuracy, can we get read access to that during the two week window?" },
      { speaker: "Marcus Webb", start: 178, text: "Yes, I'll set that up before shadow mode starts." },
      { speaker: "Sameer", start: 188, text: "Great. Last squad, growth. Aisha, what's the Q3 focus?" },
      { speaker: "Aisha Khan", start: 198, text: "Onboarding conversion. We're seeing forty percent drop off before calendar connection, so we're redesigning that flow, moving calendar connect earlier." },
      { speaker: "Sameer", start: 212, text: "I actually just walked through a version of that yesterday with Priya on the consumer side, might be worth comparing notes so we're not solving the same problem twice." },
      { speaker: "Aisha Khan", start: 225, text: "Yes, let's sync after this." },
      { speaker: "Tom Reilly", start: 232, text: "One more thing before we wrap, security wants a review of anything touching auth or payments before it ships this quarter given the SSO and invoicing work. Can we build a buffer for that into both timelines?" },
      { speaker: "Sameer", start: 250, text: "Good catch, yes. Priya and Marcus, add a week each for security review before your target ship dates." },
      { speaker: "Priya", start: 262, text: "Will do." },
      { speaker: "Marcus Webb", start: 265, text: "Same." },
      { speaker: "Sameer", start: 268, text: "Okay, to summarize: Priya owns SSO as the platform priority, pushing token refresh to Q4. Marcus owns the invoicing rebuild with shadow mode validation, giving Yuki read access before it starts. Aisha owns onboarding conversion and will sync with Priya on overlap. Both auth and payments add a week buffer for security review. I'll compile this into the Friday deck." },
      { speaker: "Linda Park", start: 295, text: "This is great, this unblocks the conversation with both enterprise prospects once I can give them a real SSO date." },
      { speaker: "Sameer", start: 305, text: "I'll get you a firm date once Priya's estimate is locked in after this week." },
    ],
  },
];

async function main() {
  const { data: users, error: userErr } = await admin.auth.admin.listUsers();
  if (userErr) throw userErr;

  const user = users.users.find((u) => u.email === SEED_USER_EMAIL);
  if (!user) {
    console.error(`No user found with email ${SEED_USER_EMAIL}. Sign up in the app first.`);
    process.exit(1);
  }

  console.log(`Seeding meetings for user ${user.id} (${user.email})`);

  for (const m of MEETINGS) {
    console.log(`\nCreating meeting: ${m.title}`);

    const startedAt = new Date(Date.now() - Math.random() * 5 * 24 * 60 * 60 * 1000);

    const { data: meeting, error: meetingErr } = await admin
      .from("meetings")
      .insert({
        user_id: user.id,
        title: m.title,
        meeting_type: m.meeting_type,
        started_at: startedAt.toISOString(),
        ended_at: new Date(startedAt.getTime() + m.duration_seconds * 1000).toISOString(),
        duration_seconds: m.duration_seconds,
        participant_count: m.participants.length,
        status: "ready",
      })
      .select()
      .single();

    if (meetingErr) throw meetingErr;

    const participantIds: Record<string, string> = {};
    const colors = ["#f87171", "#60a5fa", "#4ade80", "#facc15", "#a78bfa", "#f472b6", "#22d3ee", "#fb923c"];
    for (let i = 0; i < m.participants.length; i++) {
      const { data: p, error: pErr } = await admin
        .from("meeting_participants")
        .insert({
          meeting_id: meeting.id,
          name: m.participants[i],
          is_host: i === 0,
          speaker_color: colors[i % colors.length],
        })
        .select()
        .single();
      if (pErr) throw pErr;
      participantIds[m.participants[i]] = p.id;
    }

    const transcriptRows = m.transcript.map((line, i) => ({
      meeting_id: meeting.id,
      participant_id: participantIds[line.speaker] ?? null,
      start_seconds: line.start,
      text: line.text,
      sequence: i,
    }));
    const { error: tErr } = await admin.from("transcript_lines").insert(transcriptRows);
    if (tErr) throw tErr;
    console.log(`  Inserted ${transcriptRows.length} transcript lines`);

    const data = HANDWRITTEN_SUMMARIES[m.title];
    if (!data) throw new Error(`No summary data for ${m.title}`);

    const { error: sErr } = await admin.from("summaries").insert({
      meeting_id: meeting.id,
      template: m.template,
      content: data.summary,
    });
    if (sErr) throw sErr;
    console.log(`  Inserted summary (${m.template})`);

    if (data.actionItems.length > 0) {
      const { error: aErr } = await admin.from("action_items").insert(
        data.actionItems.map((it, i) => ({
          meeting_id: meeting.id,
          text: it.text,
          timestamp_seconds: it.timestamp_seconds,
          sequence: i,
        }))
      );
      if (aErr) throw aErr;
    }
    console.log(`  Inserted ${data.actionItems.length} action items`);

    if (m.title.includes("Northwind")) {
      const { error: hErr } = await admin.from("highlights").insert([
        { meeting_id: meeting.id, label: "Cost of missed commitments quantified", timestamp_seconds: 38 },
        { meeting_id: meeting.id, label: "Decision timeline confirmed", timestamp_seconds: 112 },
      ]);
      if (hErr) throw hErr;
      console.log(`  Inserted 2 highlights`);
    }

    console.log(`  Done: ${meeting.id}`);
  }

  console.log("\nSeeding complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

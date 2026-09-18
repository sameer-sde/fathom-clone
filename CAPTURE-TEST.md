# Capture Test

**Tool:** Claude Code v2.1.276
**Model:** claude-sonnet-5 (Claude Pro subscription)

## Mechanism

Automatic capture via a Claude Code `Stop` hook, registered in `.claude/settings.json`:

```json
{
  "hooks": {
    "Stop": [
      { "hooks": [ { "type": "command", "command": "python3 $CLAUDE_PROJECT_DIR/.claude/hooks/capture_log.py" } ] }
    ]
  }
}
```

The hook fires automatically at the end of every turn — no manual step required. `.claude/hooks/capture_log.py` reads the hook's JSON payload from stdin, pulls the final assistant response directly from the `last_assistant_message` field, and reads the prompt text and model name from the session's transcript JSONL (`transcript_path`). It appends a `[LOG_ENTRY type=PROMPT]` / `[LOG_ENTRY type=RESPONSE]` pair to a per-session Markdown file in `.agent-logs/`, creating the file with front matter on first use and updating `total_exchanges`/`last_prompt_time` on each append. A SHA-256 dedup marker per entry prevents duplicate writes on the (observed) occasional double-fire of the `Stop` hook.

We use only the `Stop` hook, not `UserPromptSubmit` — the `Stop` payload already contains both the response and (via the transcript) the matching prompt for that turn, so a second hook would just double-log the same exchange.

**Config file changed:** `.claude/settings.json` (project-local, created fresh — no pre-existing hooks in this repo)

## Log file path

`.agent-logs/2026-09-18_02-22-41_ea240eb0-e838-4716-9292-44248be1f39c.md`

## Canary entries (raw, from the passing session)

[LOG_ENTRY type=PROMPT num=1 session=ea240eb0-e838-4716-9292-44248be1f39c]
timestamp: 2026-09-18T02:22:22.629Z
model: claude-sonnet-5

CAPTURE TEST 2 — 8x assignment, Sameer

[LOG_ENTRY type=RESPONSE num=1 session=ea240eb0-e838-4716-9292-44248be1f39c]
timestamp: 2026-09-18T02:22:29.012Z
model: claude-sonnet-5

(see .agent-logs/2026-09-18_02-22-41_ea240eb0-e838-4716-9292-44248be1f39c.md for the verified full entry — both this session and the earlier 65ed3f7a canary session logged correctly to separate files, confirming the hook is not tied to the session that created it)

## What did not work first

- **First hook script version** assumed the wrong transcript JSONL schema (guessed at `message.content` blocks the way older Claude Code versions expose them) and only ever wrote debug dumps (`_debug_transcript_sample.jsonl`, `_debug_last_hook_input.json`) instead of real log entries.
- Discovered via manual inspection of a real transcript file that Claude Code v2.1.276's `Stop` hook payload includes the final response directly as `last_assistant_message`, and the prompt is available via a `last-prompt` entry in the transcript — simpler than originally assumed. Rewrote the script around the actual payload shape instead of the guessed one.
- Also discovered and cleaned up unrelated leaked configuration on this machine: a stale Kiro (a different AI tool) steering doc had been copied into `~/CLAUDE.md`, and `~/.claude/settings.json` had hooks shelling out to a `code-review-graph` binary that didn't exist on this machine, causing silent failures on every tool call in every project. Backed up (`~/CLAUDE.md.bak`, `~/.claude/settings.json.bak`) and disabled rather than deleted.
- Also hit an early false start where the trust prompt defaulted to "No, exit" and the session closed instantly, and a paste of terminal escape codes landed in plain zsh instead of inside Claude Code, producing a `bad pattern` error — both were user-side terminal/input mistakes, not capture-mechanism failures.

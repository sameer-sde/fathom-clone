#!/usr/bin/env python3
import json, sys, os, re, datetime, glob, hashlib

def main():
    raw = sys.stdin.read()
    try:
        data = json.loads(raw)
    except Exception:
        data = {}

    project_dir = os.environ.get("CLAUDE_PROJECT_DIR", os.getcwd())
    logs_dir = os.path.join(project_dir, ".agent-logs")
    os.makedirs(logs_dir, exist_ok=True)

    session_id = data.get("session_id", "unknown")
    transcript_path = data.get("transcript_path")
    response_text = data.get("last_assistant_message")

    if not transcript_path or not os.path.exists(transcript_path) or not response_text:
        with open(os.path.join(logs_dir, "_debug_last_hook_input.json"), "w") as f:
            f.write(raw)
        return

    entries = []
    with open(transcript_path) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                entries.append(json.loads(line))
            except json.JSONDecodeError:
                continue

    prompt_text, prompt_ts, model_name, response_ts = None, None, None, None
    for e in reversed(entries):
        etype = e.get("type")
        if etype == "last-prompt" and prompt_text is None:
            prompt_text = e.get("lastPrompt")
        elif etype == "user" and prompt_ts is None:
            msg = e.get("message", {}) or {}
            content = msg.get("content")
            if isinstance(content, str):
                prompt_ts = e.get("timestamp")
                if prompt_text is None:
                    prompt_text = content
        elif etype == "assistant" and model_name is None:
            msg = e.get("message", {}) or {}
            model_name = msg.get("model")
            if response_ts is None:
                response_ts = e.get("timestamp")
        if prompt_text and prompt_ts and model_name:
            break

    now_iso = datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S.000Z")
    prompt_ts = prompt_ts or now_iso
    response_ts = response_ts or now_iso
    model_name = model_name or "unknown"

    if not prompt_text:
        with open(os.path.join(logs_dir, "_debug_no_prompt.json"), "w") as f:
            f.write(raw)
        return

    now = datetime.datetime.utcnow()
    dedup_key = hashlib.sha256((prompt_text + "|" + response_text).encode()).hexdigest()

    existing = glob.glob(os.path.join(logs_dir, f"*_{session_id}.md"))
    if existing:
        log_path = existing[0]
        with open(log_path) as f:
            content = f.read()
        if dedup_key in content:
            return
        exchange_num = content.count("[LOG_ENTRY type=PROMPT") + 1
    else:
        date_str = now.strftime("%Y-%m-%d_%H-%M-%S")
        log_path = os.path.join(logs_dir, f"{date_str}_{session_id}.md")
        author = os.environ.get("AGENT_LOG_AUTHOR", "unknown")
        project = os.environ.get("AGENT_LOG_PROJECT", os.path.basename(project_dir))
        header = f"""---
session_id: {session_id}
date: {now.strftime("%Y-%m-%d")}
author: {author}
model: {model_name}
tool: claude-code
project: {project}
total_exchanges: 0
first_prompt_time: {prompt_ts}
last_prompt_time: {prompt_ts}
---

# Session Log - {now.strftime("%Y-%m-%d")}

Session: `{session_id}` | Project: `{project}` | Author: `{author}`

---
"""
        with open(log_path, "w") as f:
            f.write(header)
        exchange_num = 1

    entry = f"""
<!-- dedup:{dedup_key} -->
[LOG_ENTRY type=PROMPT num={exchange_num} session={session_id}]
timestamp: {prompt_ts}
model: {model_name}

{prompt_text}


[LOG_ENTRY type=RESPONSE num={exchange_num} session={session_id}]
timestamp: {response_ts}
model: {model_name}

{response_text}

---
"""
    with open(log_path, "a") as f:
        f.write(entry)

    with open(log_path) as f:
        full = f.read()
    full = re.sub(r"total_exchanges: \d+", f"total_exchanges: {exchange_num}", full, count=1)
    full = re.sub(r"last_prompt_time: .*", f"last_prompt_time: {prompt_ts}", full, count=1)
    with open(log_path, "w") as f:
        f.write(full)

if __name__ == "__main__":
    main()

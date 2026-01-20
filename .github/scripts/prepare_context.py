#!/usr/bin/env python3
"""
Prepare issue context for zen-code execution.

This script:
1. Sets up zen-code configuration
2. Fetches issue context
3. Outputs PROMPT to GitHub Actions environment
"""

import os
import sys
import json
from pathlib import Path


def run_command(cmd):
    """Run a shell command and return stdout."""
    import subprocess
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    return result.stdout.strip()


def setup_zen_code_config():
    """Create zen-code config directory and settings.json."""
    print("=== Setting up zen-code config ===")

    zen_config_dir = Path.home() / ".zen-code"
    zen_config_dir.mkdir(parents=True, exist_ok=True)

    config = {
        "main_model": os.environ.get("ZEN_CODE_MODEL", "glm-4.7"),
        "model_provider": os.environ.get("MODEL_PROVIDER", "anthropic"),
        "anthropic_api_key": os.environ.get("ANTHROPIC_API_KEY", ""),
        "anthropic_base_url": os.environ.get("ANTHROPIC_BASE_URL", ""),
        "enable_thinking": True
    }

    config_path = zen_config_dir / "settings.json"
    with open(config_path, "w") as f:
        json.dump(config, f, indent=2)

    print(f"✓ Config created: {config_path}")


def get_issue_context(issue_number):
    """Fetch issue details and build prompt."""
    print(f"\n=== Fetching issue #{issue_number} ===")

    # Get issue title and body
    issue_info = run_command(f"gh issue view {issue_number} --json title,body --jq '\"\\(.title),\\(.body)\"'")
    parts = issue_info.split(',', 1)

    title = parts[0] if parts else ""
    body = parts[1] if len(parts) > 1 else ""

    # Build prompt
    prompt = f"""Fix or Answer the issue described below:

Issue #{issue_number}:
Title: {title}

{body}

## Instructions:

1. If you can answer in readonly mode (no code changes needed), just provide your answer.

2. If you need to make code changes to fix the issue:
   - Make the necessary code changes
   - Create the file /tmp/create-pr (this signals the workflow to create a PR)
   - Example: run `touch /tmp/create-pr` or use `write_file` to create it

3. Don't output separate .md files for answers - respond directly.

Analyze the problem and execute the fix."""

    print(f"✓ Issue title: {title}")
    print(f"✓ Prompt prepared ({len(prompt)} chars)")

    return prompt, title, body


def set_output(name, value):
    """Set GitHub Actions output."""
    output_file = os.environ.get("GITHUB_OUTPUT")
    if output_file:
        with open(output_file, "a") as f:
            # Use heredoc for multiline values
            f.write(f"{name}<<EOF\n{value}\nEOF\n")
    print(f"✓ Output set: {name}")


def main():
    """Main execution."""
    issue_number = os.environ.get("ISSUE_NUMBER", "")

    if not issue_number:
        print("Error: ISSUE_NUMBER required")
        sys.exit(1)

    try:
        # Setup config
        setup_zen_code_config()

        # Get context
        prompt, title, body = get_issue_context(issue_number)

        # Set outputs
        set_output("number", issue_number)
        set_output("prompt", prompt)
        set_output("title", title)
        set_output("body", body)

        print("\n✓ Context prepared successfully")

    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()

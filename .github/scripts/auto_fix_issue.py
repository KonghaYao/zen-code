#!/usr/bin/env python3
"""
Auto Fix Issues GitHub Action Script - Post-processing

This script handles the post-processing steps after zen-code execution:
1. Cleans up runtime artifacts
2. Creates PR if changes are detected
3. Comments on the issue
4. Removes auto-fix label

Note: Issue context and zen-code execution are handled in run_zen_code.py
"""

import os
import json
import subprocess
import sys
from pathlib import Path


def run_command(cmd, check=True, capture_output=True, text=True):
    """Run a shell command and return the result."""
    result = subprocess.run(
        cmd, shell=True, check=check, capture_output=capture_output, text=text
    )
    return result


def cleanup_artifacts():
    """Clean up zen-code runtime artifacts before checking git changes."""
    artifacts = [
        ".langgraph_api",
        ".claude",
        "node_modules/.cache",
    ]

    print("\n=== Cleaning up runtime artifacts ===")
    for artifact in artifacts:
        artifact_path = Path(artifact)
        if artifact_path.exists():
            print(f"Removing: {artifact}")
            run_command(f"rm -rf {artifact}", check=False)
    print("✓ Cleanup completed\n")


def check_changes():
    """Check if there are any git changes."""
    result = run_command("git status --porcelain")
    has_changes = bool(result.stdout.strip())
    return has_changes, result.stdout


def create_pr(issue_number, issue_body, zen_output):
    """Create a pull request using gh CLI."""
    pr_body = f"""## 自动修复 PR

此 PR 由 Zen Code 自动生成，用于修复 Issue #{issue_number}

### Issue 内容
{issue_body}

### 执行输出
<details>
<summary>查看 Zen Code 执行日志</summary>

```
{zen_output[:2000]}
{'...' if len(zen_output) > 2000 else ''}
```

</details>

---
🤖 由 Auto Fix Issues 工作流自动生成"""

    branch_name = f"auto-fix/issue-{issue_number}"

    cmd = f"""gh pr create \\
        --base main \\
        --head {branch_name} \\
        --title "Auto-fix: Issue #{issue_number}" \\
        --body '{pr_body}' \\
        --label "auto-generated,automated fix" || true"""

    result = run_command(cmd, check=False)

    # Try to get PR URL
    url_result = run_command(
        f"gh pr view {branch_name} --json url -q '.url' 2>/dev/null || true",
        check=False,
    )
    pr_url = url_result.stdout.strip() if url_result.returncode == 0 else ""

    return pr_url


def comment_on_issue(issue_number, zen_output, pr_url=None):
    """Add a comment to the issue with execution details."""
    if pr_url:
        body = f"""## ✅ 自动修复完成

我已创建 PR 来解决此问题：{pr_url}

### 执行输出
<details>
<summary>查看 Zen Code 执行日志</summary>

```
{zen_output[:2000]}
{'...' if len(zen_output) > 2000 else ''}
```

</details>

---
🤖 由 Zen Code 自动生成"""
    else:
        body = f"""{zen_output}

---
🤖 由 Zen Code 自动生成"""

    # Create comment using gh API
    import shlex

    escaped_body = shlex.quote(json.dumps({"body": body}))
    run_command(
        f"gh api repos/:owner/:repo/issues/{issue_number}/comments --method POST --input - <<< {escaped_body}"
    )


def remove_label(issue_number, label="auto-fix"):
    """Remove a label from the issue."""
    run_command(f'gh issue edit {issue_number} --remove-label "{label}"', check=False)


def set_output(name, value):
    """Set GitHub Actions output."""
    output_file = os.environ.get("GITHUB_OUTPUT")
    if output_file:
        with open(output_file, "a") as f:
            if "\n" in value:
                f.write(f"{name}<<EOF\n{value}\nEOF\n")
            else:
                f.write(f"{name}={value}\n")
    else:
        print(f"{name}={value}")


def main():
    """Main workflow execution - post-processing only."""
    # Get inputs from environment
    issue_number = os.environ.get("ISSUE_NUMBER", "")

    if not issue_number or not issue_number.isdigit():
        print("Error: No valid issue number provided")
        sys.exit(1)

    issue_number = int(issue_number)
    print(f"Post-processing Issue #{issue_number}")

    try:
        # Get zen-code outputs from previous step
        zen_output = os.environ.get("ZEN_OUTPUT", "")
        issue_body = os.environ.get("ISSUE_BODY", zen_output)  # Fallback to zen_output

        if not zen_output:
            print("Warning: No zen-code output found in environment")
            # Continue anyway - might be a read-only answer

        # Step 1: Clean up runtime artifacts
        print("\n=== Cleaning up runtime artifacts ===")
        cleanup_artifacts()

        # Step 2: Check if PR should be created (via /tmp/create-pr file)
        should_create_pr = Path("/tmp/create-pr").exists()

        if not should_create_pr:
            print("ℹ️  No /tmp/create-pr file found - skipping PR creation")
            print("ℹ️  Adding comment with zen-code output")
            comment_on_issue(issue_number, zen_output, None)

            # Step 3: Remove auto-fix label
            print("\n=== Removing auto-fix label ===")
            remove_label(issue_number)

            print("\n✓ Post-processing completed (no PR)")
            return

        # Step 3: Check for changes
        print("\n=== Checking for changes ===")
        has_changes, git_status = check_changes()
        set_output("has_changes", "true" if has_changes else "false")

        if has_changes:
            print("Changes detected:")
            print(git_status)

            # Configure git
            run_command("git config user.name 'github-actions[bot]'")
            run_command(
                "git config user.email 'github-actions[bot]@users.noreply.github.com'"
            )

            # Commit changes
            run_command("git add .")
            run_command(f"git commit -m 'fix: auto-fix issue #{issue_number}'")

            # Create branch and push
            branch_name = f"auto-fix/issue-{issue_number}"
            run_command(f"git checkout -b {branch_name}", check=False)
            run_command(f"git push -u origin {branch_name}", check=False)

            # Step 4: Create PR
            print("\n=== Creating Pull Request ===")
            pr_url = create_pr(issue_number, issue_body, zen_output)
            set_output("pr_url", pr_url)

            # Step 5: Comment on issue
            print("\n=== Commenting on issue ===")
            comment_on_issue(issue_number, zen_output, pr_url)
        else:
            print("No changes detected")

            # Comment with zen output
            print("\n=== Commenting on issue (no changes) ===")
            comment_on_issue(issue_number, zen_output, None)

        # Step 6: Remove auto-fix label
        print("\n=== Removing auto-fix label ===")
        remove_label(issue_number)

        print("\n✓ Post-processing completed successfully")

    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        import traceback

        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()

---
name: commit
description: Create a commit and push to remote
disable-model-invocation: true
---

# Commit & Push instructions

1. Run `git branch --show-current` to get the branch name
2. Run `git diff --staged` to see staged changes. If nothing is staged, run `git add -A` first
3. Write a commit message in this format: `<branch-name>: <short description of changes>`
   - Description should be lowercase, max 10 words, summarize what changed
4. Create the commit with that message
5. Push to remote with `git push`
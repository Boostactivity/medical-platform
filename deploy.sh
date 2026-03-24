#!/bin/bash
set -e
cd /c/Users/adelm/AppData/Local/Temp/medical2

# Setup gh auth for git
"/c/Program Files/GitHub CLI/gh.exe" auth setup-git

# Add and commit vercel.json
git add vercel.json
git commit -m "Add vercel.json for Vercel deployment" || echo "Nothing to commit"

# Push to GitHub
git push -u origin main 2>&1 || echo "PUSH_FAILED"

#!/bin/bash
set -ex
"/c/Program Files/GitHub CLI/gh.exe" auth setup-git
cd /c/Users/adelm/AppData/Local/Temp/medical2
git add vercel.json .npmrc deploy.sh
git commit -m "Add vercel.json and .npmrc for deployment" || true
git push -u origin main

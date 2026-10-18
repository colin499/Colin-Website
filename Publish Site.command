#!/bin/bash
# Double-click this file to rebuild the website and put it online.
# It builds the site, saves the changes in git and pushes them to GitHub;
# colinlysik.com updates a minute or two later.
cd "$(dirname "$0")"

finish() {
    echo
    read -n 1 -s -r -p "Press any key to close this window."
    exit "$1"
}

# Find node (it may be installed through nvm, which Finder doesn't know about).
if ! command -v node >/dev/null 2>&1; then
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
fi
if ! command -v node >/dev/null 2>&1; then
    echo "Could not find node. Install it from https://nodejs.org and try again."
    finish 1
fi

# Git keeps a list of the site's files. If that list is missing or stuck
# (iCloud syncing the Documents folder can interrupt git), stop rather than
# publish from a broken state.
if [ -f .git/index.lock ] || [ ! -f .git/index ]; then
    echo "Git's file list is stuck or missing, so nothing was published."
    echo "Nothing is lost. Ask Claude to fix git, then publish again."
    finish 1
fi

echo
echo "Building the site..."
echo
if ! node build.js; then
    echo
    echo "The build failed, so nothing was published."
    finish 1
fi

# Only the website's own files are published. Anything else lying around in
# this folder (screen recordings, downloads) is left alone.
git add -- content assets posts.js index.html main.js style.css game.js build.js \
    HOW-TO-EDIT.md tools .gitignore .nojekyll CNAME "Build Site.command" "Publish Site.command" 2>/dev/null

if git diff --cached --quiet; then
    echo
    echo "Nothing new to publish. The site is already up to date."
    finish 0
fi

# GitHub refuses files over 100 MB, so stop before trying.
too_big=$(git diff --cached --name-only --diff-filter=AM -z | xargs -0 -I{} find {} -size +95M 2>/dev/null)
if [ -n "$too_big" ]; then
    git reset -q
    echo
    echo "These files are too big to put online (GitHub's limit is 100 MB):"
    echo "$too_big"
    echo "Make them smaller or move them out of the website folder, then try again."
    echo "Nothing was published."
    finish 1
fi

echo
echo "Changes to publish:"
git diff --cached --name-status | awk -F'\t' '{ w = $1 ~ /^A/ ? "added" : $1 ~ /^D/ ? "removed" : $1 ~ /^R/ ? "renamed" : "changed"; printf "  %-8s %s\n", w, $NF }'
echo
read -r -p "Describe the change in a few words (or just press Return): " message
[ -z "$message" ] && message="Update site"

git commit -q -m "$message" || { echo "Couldn't save the changes. Nothing was published."; finish 1; }

echo
echo "Uploading..."
if git push -q; then
    echo
    echo "Published. colinlysik.com will show the changes in a minute or two."
    echo "(If it still looks old, press Cmd+Shift+R in the browser.)"
    finish 0
else
    echo
    echo "The upload didn't go through. Your changes are saved on this Mac,"
    echo "so nothing is lost. Ask Claude to push them."
    finish 1
fi

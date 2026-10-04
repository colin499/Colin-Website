#!/bin/bash
# Double-click this file to rebuild the website from the content/ folder.
cd "$(dirname "$0")"

# Find node (it may be installed through nvm, which Finder doesn't know about).
if ! command -v node >/dev/null 2>&1; then
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
fi
if ! command -v node >/dev/null 2>&1; then
    echo "Could not find node. Install it from https://nodejs.org and try again."
    echo
    read -n 1 -s -r -p "Press any key to close."
    exit 1
fi

echo
node build.js
echo
echo "Done. Opening the site in your browser..."
open index.html
echo
read -n 1 -s -r -p "Press any key to close this window."

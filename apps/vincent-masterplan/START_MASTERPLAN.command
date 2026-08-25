#!/bin/zsh

set -eu

cd "$(dirname "$0")"

exec python3 serve_masterplan.py

# Complete V4-13 monorepo baseline

Created: 2026-08-05 21:09:59 +07:00

The web folder previously contained an independent Git repository with only the initial Create Next App commit. The root repository therefore stored web as a gitlink without a .gitmodules mapping.

This repair preserves the original nested Git history privately, removes the accidental gitlink, and tracks the current web application source directly in the root repository.

Raw baseline tag: v4.13-pre-v4.14
Complete baseline tag: v4.13-pre-v4.14-complete
Development branch: v4-14-central-workspace

Generated Electron packages, manual backup copies, node_modules, .next output, secrets, databases, uploaded files and OCR model artifacts remain excluded from Git.

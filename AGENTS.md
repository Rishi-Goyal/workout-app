<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Branching Policy

| Branch | Purpose | Push rules |
|--------|---------|------------|
| `main` | Production-ready code only | **Protected** — no direct pushes. Merges via PR only, requires CI pass + 1 review. Tagged releases (`v*`) trigger the production APK build. |
| `feature/*` | All development work | Push freely, open PR into `main` when ready |
| `hotfix/*` | Urgent production fixes | Branch off `main`, PR back into `main` |

**Never push directly to `main`.** All work — features, fixes, experiments — goes on a branch first.

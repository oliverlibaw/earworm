# Earworm Implementation Progress & Architectural Decisions

## Spec Review & V2 Wordle UX / QA Upgrades
1. **Wordle / NYT Games UI & 4-Stage Flow ([`app/page.tsx`](file:///Users/oliverlibaw/Desktop/Earworm%20V1%2010-2026/app/page.tsx))**:
   - **Password Gate:** Blocks public visitors on GitHub Pages until they enter the access password (default `earworm2026`, configurable via `NEXT_PUBLIC_ACCESS_PASSWORD` / GitHub secret `EARWORM_PASSWORD`).
   - **Splash Screen:** Displays the Earworm logo, title, subtitle (*"Improve your Spanish! Listen, answer questions, compare your score with friends."*), Mexican Spanish (`🇲🇽`) badge, Level Selector (`Intro` / `Conversational` / `Advanced`), and `Play` button.
   - **Round 1 -> Round 2 -> Final Submission:** First `Submit` reveals only the individual question score badges (`Terrible` / `OK` / `Great` / `Amazing`), unlocks the second audio listen, and allows answer edits before `Final Submission`.
   - **Final Scoring Page:** Displays `Today's Earworm Rating` on the 4-tier scale (`Terrible` • `OK` • `Great` • `Amazing`), `Next Daily Earworm in HH:MM:SS` countdown, `Today's Vocab` modal, `Share Score`, and `Leaderboard` + `Join Group` modal.
2. **Mexican Spanish QA Bank & Standalone GitHub Pages Bundle ([`lib/staticLessons.ts`](file:///Users/oliverlibaw/Desktop/Earworm%20V1%2010-2026/lib/staticLessons.ts) & [`public/audio/`](file:///Users/oliverlibaw/Desktop/Earworm%20V1%2010-2026/public/audio))**:
   - Bundled all 6 spoken Mexican Spanish MP3 clips (`Spanish-A2-1.mp3`, `Spanish-A2-2.mp3`, `Spanish-B1-1.mp3`, `Spanish-B1-2.mp3`, `Spanish-B2-1.mp3`, `Spanish-B2-2.mp3`) into `/public/audio/` with a static client-side fallback so the app works 100% standalone on GitHub Pages (`output: "export"` in [`next.config.ts`](file:///Users/oliverlibaw/Desktop/Earworm%20V1%2010-2026/next.config.ts) and [`.github/workflows/deploy.yml`](file:///Users/oliverlibaw/Desktop/Earworm%20V1%2010-2026/.github/workflows/deploy.yml)).

## Milestones
- [x] **Milestone 1:** Scaffolding & Convex Initialization ([`convex/schema.ts`](file:///Users/oliverlibaw/Desktop/Earworm%20V1%2010-2026/convex/schema.ts))
- [x] **Milestone 2:** The Content Factory Action ([`convex/generateLesson.ts`](file:///Users/oliverlibaw/Desktop/Earworm%20V1%2010-2026/convex/generateLesson.ts)) & Mexican Spanish QA Bank
- [x] **Milestone 3:** The LLM Grader & 4-Tier Rubric Engine ([`convex/grading.ts`](file:///Users/oliverlibaw/Desktop/Earworm%20V1%2010-2026/convex/grading.ts))
- [x] **Milestone 4:** Wordle-Inspired Mobile-First Game UI ([`app/page.tsx`](file:///Users/oliverlibaw/Desktop/Earworm%20V1%2010-2026/app/page.tsx))
- [x] **Milestone 5:** GitHub Pages Static Export, Bundled Audio & Password Gate ([`next.config.ts`](file:///Users/oliverlibaw/Desktop/Earworm%20V1%2010-2026/next.config.ts), [`.github/workflows/deploy.yml`](file:///Users/oliverlibaw/Desktop/Earworm%20V1%2010-2026/.github/workflows/deploy.yml))

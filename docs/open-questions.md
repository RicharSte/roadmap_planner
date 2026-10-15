# Open questions

Resolve before the related backlog task. Record the answer as an ADR in `docs/decisions/`.

| #   | Question               | Answer                                                    | ADR  |
| --- | ---------------------- | --------------------------------------------------------- | ---- |
| Q1  | Main UI mode           | Tree sidebar + details panel                              | 0004 |
| Q2  | Frontend framework     | React + TypeScript                                        | 0003 |
| Q3  | Where `.md` files live | `descriptions/<id>.md`, readable name in `title`          | 0005 |
| Q4  | JSON schema v1 links   | Only ordered `childrenIds`; `parentId` derived in memory  | 0005 |
| Q5  | Markdown editor        | CodeMirror 6 + react-markdown preview                     | 0006 |
| Q6  | Tooling                | ESLint + Prettier, Vitest + RTL, cargo checks             | 0007 |
| Q7  | Domain API style       | Pure functions, `DomainError` codes, parent index outside | 0008 |
| Q8  | File access model      | Rust owns root, relative paths, two-phase open            | 0009 |

## Still open

None block current MVP tasks. Column "Before" = latest task that needs the answer.

| #   | Question                                                                                       | Default if unanswered                      | Before |
| --- | ---------------------------------------------------------------------------------------------- | ------------------------------------------ | ------ |
| Q9  | Keep all user-facing UI strings in one module (`src/ui/strings.ts`)? Cheap hook for B2C i18n   | Yes, done inside T-013, no i18n library    | T-013  |
| Q10 | Final product name and bundle `identifier` (now `tauri-app` / `dev.roadmap.app`)?              | Rename `productName` only, keep identifier | T-014  |
| Q11 | B2C: target audience and monetization (free / one-time / subscription)?                        | Undecided, blocks 2.0 planning             | T-301  |
| Q12 | B2C: are accounts or cloud sync acceptable, or stay strictly local-first?                      | Strictly local-first                       | T-301  |
| Q13 | B2C: additional platforms (web version?) — languages moved to T-209 (1.2), see `docs/later.md` | Desktop only                               | T-301  |
| Q14 | 1.1: forbid a dependency on an ancestor/descendant? (ADR 0010)                                 | Forbid                                     | T-104  |
| Q15 | 1.2: deliver agent brief as file `briefs/<id>.md` or copy to clipboard?                        | File (no clipboard plugin/permission)      | T-204  |

New questions go here.

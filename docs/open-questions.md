# Open questions

Resolve before the related backlog task. Record the answer as an ADR in `docs/decisions/`.

| #   | Question                          | Answer                                                      | ADR  |
| --- | --------------------------------- | ----------------------------------------------------------- | ---- |
| Q1  | Main UI mode                      | Tree sidebar + details panel                                | 0004 |
| Q2  | Frontend framework                | React + TypeScript                                          | 0003 |
| Q3  | Where `.md` files live            | `descriptions/<id>.md`, readable name in `title`            | 0005 |
| Q4  | JSON schema v1 links              | Only ordered `childrenIds`; `parentId` derived in memory    | 0005 |
| Q5  | Markdown editor                   | CodeMirror 6 + react-markdown preview                       | 0006 |
| Q6  | Tooling                           | ESLint + Prettier, Vitest + RTL, cargo checks               | 0007 |
| Q7  | Domain API style                  | Pure functions, `DomainError` codes, parent index outside   | 0008 |
| Q8  | File access model                 | Rust owns root, relative paths, two-phase open              | 0009 |
| Q9  | UI strings in one module          | Yes, `src/ui/strings.ts`, no i18n library (EN UI — T-312)   | 0016 |
| Q10 | Product name (MVP)                | `productName` Roadmap; final name/identifier → Q16          | —    |
| Q11 | Monetization                      | Desktop free; money only in the Web phase (`docs/later.md`) | —    |
| Q12 | Accounts / cloud sync             | Not in MSP; desktop stays local-first                       | —    |
| Q13 | Platforms                         | Desktop for MSP; Web is the next big step after MSP         | —    |
| Q14 | Dependency on ancestor/descendant | Forbidden                                                   | 0010 |
| Q15 | Agent brief delivery              | Obsolete: agents get the brief via MCP `next_task`          | 0019 |

## Still open

Column "Before" = latest task that needs the answer.

| #   | Question                                                                                                                                                         | Default if unanswered                                                                                                                                     | Before |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Q16 | Final `productName` and bundle `identifier` (now `Roadmap` / `dev.roadmap.app`)? Identifier must be a domain the author controls and never changes after release | Keep `Roadmap`; identifier chosen by the user                                                                                                             | T-315  |
| Q17 | Licence of the public repo                                                                                                                                       | PolyForm Small Business 1.0.0 (free for individuals and companies < 100 people and < $1M revenue; larger ones buy a commercial licence). Not legal advice | T-315  |
| Q18 | Catalog repository name and host (ADR 0021)                                                                                                                      | Public GitHub repo `<owner>/roadmap-catalog`, files via `raw.githubusercontent.com`                                                                       | T-308  |
| Q19 | Sidecar targets: is macOS x64 (Intel) needed?                                                                                                                    | Yes: arm64 + x64 + Windows x64                                                                                                                            | T-215  |

New questions go here.

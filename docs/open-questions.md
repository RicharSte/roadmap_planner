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

- None blocking. New questions go here.

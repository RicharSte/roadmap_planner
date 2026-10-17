# 0021. Network access: official roadmap catalog only

Status: accepted (host and schema refined in T-308 plan)
Date: 2026-10-17

## Context

Users want to find a ready roadmap by title and start using it. The official roadmaps are made by the author.
Until now the app had no network access (ADR 0001, AGENTS.md).

## Decision

- The only network feature: catalog. Index `index.json` + project zips in one public GitHub repository,
  served over HTTPS from **one fixed host**.
- Requests are made only after a user action (opening the catalog, clicking «Загрузить»). No background checks,
  no telemetry, no update checks.
- Requests go through Rust (HTTP GET only, host allowlisted in code, limits: index ≤ 1 MB, zip ≤ 50 MB, timeout).
  The webview gets no network permission; CSP stays without remote `connect-src`.
- Index item: `{ id, title, summary, tags, version, zipUrl, sha256, sizeBytes }`. `sha256` is verified.
- Download → import flow of ADR 0022 (empty folder, validation, migration).
- Publishing = pull request to the catalog repo (documented); no upload from the app in MSP.
- Offline / error → user-readable message; the rest of the app is unaffected.

## Consequences

- Amends ADR 0001 ("offline"): the core workflow stays offline; only the catalog uses the network.
- New Rust dependency for HTTPS (chosen in T-308 plan, ask first).

# Product Brief — roadmap_proj (MVP)

## Product

A local-first desktop application for macOS and Windows for creating and editing roadmap projects.

A roadmap project is a user-owned folder on disk containing:
- a main JSON file that stores the roadmap structure;
- Markdown (`.md`) files used as node descriptions.

The app is a visual editor and viewer for that JSON + Markdown project structure.

## Target user

Personal use by a single user. No teams, no collaboration.

## MVP goals

The first version allows the user to:
- create a new roadmap project;
- open an existing roadmap project by selecting its folder;
- work with one roadmap project at a time;
- create, edit, and delete nodes;
- define parent/child relationships between nodes;
- save changes automatically;
- create Markdown description files for nodes from inside the app;
- edit node descriptions inside the app with a built-in Markdown editor;
- manually reload the project to pick up external file changes.

## Data model

### Roadmap shape

In the MVP the roadmap is a tree:
- each node has at most one parent;
- nodes have parent/child relationships;
- the visual layout is generated automatically.

The architecture must allow the internal model to evolve into a directed graph later without a major rewrite.

### Node fields (minimum)

- `id`
- `title`
- `parentId`
- `childrenIds`
- `descriptionPath`
- `status`
- `createdAt`
- `updatedAt`

> Storage note (ADR 0005): `parentId` is derived in memory and is **not** written to
> `roadmap.json`; links are stored only in the parent's `childrenIds` (plus top-level `rootIds`).

### Node statuses (fixed in MVP)

- `unstarted`
- `in progress`
- `paused`
- `done`

## Storage model

- A roadmap project is a normal folder on the user's computer.
- One roadmap JSON file is the structured source of truth.
- One folder holds node description Markdown files.
- Data stays transparent, portable, file-based.
- No dependency on cloud services, accounts, or internet for the core workflow.

## Description files

- The app creates description files automatically.
- Descriptions are edited inside the app.
- External editing while the app is open is not a primary workflow.
- If files change outside the app, the user explicitly reloads the project.

## UX principles

- One open roadmap project at a time.
- Autosave by default.
- Automatic node layout; no manual canvas positioning.
- Optimize for structure and content editing.
- Opening a project is folder-based, not single-file based.

## Safety and error handling

In scope:
- confirmation before destructive deletion where appropriate;
- safe (atomic) writes to avoid corrupting JSON or Markdown files;
- clear, user-readable error messages.

Out of scope for MVP:
- collaboration / multi-user;
- multiple open projects;
- manual node positioning;
- custom statuses;
- live sync of external file edits;
- full undo/redo history;
- backup/versioning as a feature;
- advanced import/export.

## Future-facing constraints

Do not block:
- tree → directed graph;
- import/export of project folders (important for v2);
- richer interoperability around the JSON + Markdown format.

## One-sentence summary

A local-first desktop app that visually edits roadmap projects stored as a JSON file plus linked Markdown notes inside a user-owned folder.

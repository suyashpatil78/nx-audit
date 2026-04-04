# nx-audit

CLI that reads an Nx project graph and reports **circular dependencies**, **orphan projects** (nothing depends on them), and **layer violations** against a simple apps → features → shared → core model.

## Prerequisites

- **Node.js** (current LTS is fine)
- An **Nx workspace** where you can export the dependency graph

## Install

From this repository:

```bash
npm install
npm run build
```

Compiled output is written to `dist/`.

## Quick start

Run everything from the **root of your Nx workspace** (the same folder where `nx.json` lives).

### 1. Export the graph

```bash
npx nx graph --file=graph.json
```

This creates `graph.json` in the current directory. The analyzer expects that exact filename in the working directory.

### 2. Analyze

Run the built CLI directly:

```bash
npx nx-audit analyze
```

## What you get

| Check | Meaning |
|--------|--------|
| **Circular dependencies** | Projects involved in dependency cycles (first node hit when a cycle is detected). |
| **Orphan libraries** | Projects that never appear as a dependency target—often unused entry points or mis-wired libs. |
| **Layer violations** | Edges that go “up” the stack (e.g. a lower layer depending on a higher one). |

### Default layers

Layers are inferred from project names/paths using these prefixes:

| Layer | Path hints |
|--------|------------|
| `apps` | `apps/` |
| `features` | `libs/features/` |
| `shared` | `libs/shared/` |
| `core` | `libs/core/` |

Anything else is treated as `unknown` for layer rules.

Allowed direction is **apps → features → shared → core** (higher index must not depend on lower index in that list). Violations are listed as `source → target`.

## Customizing layers

The prefix map lives in `src/cli.ts` as `DEFAULT_LAYERS`. Adjust it to match your repo’s folder layout, then rebuild (`npm run build`).

## Troubleshooting

- **`graph.json not found`** — Run `nx graph --file=graph.json` from the Nx workspace root, or run the analyzer with that file present in the current working directory.
- **Empty or surprising results** — Confirm `graph.json` is fresh and that you are analyzing the same workspace you exported.

## License

ISC

#!/usr/bin/env node
import { Command } from "commander";
import fs from "fs";
import chalk from "chalk";

const program = new Command();

program
  .name("nx-visualizer")
  .description("Nx visualizer")
  .version("1.0.0");

type Graph = {
  nodes: Record<string, any>;
  dependencies: Record<string, { target: string }[]>;
};

const DEFAULT_LAYERS = {
  apps: ["apps/"],
  features: ["libs/features/"],
  shared: ["libs/shared/"],
  core: ["libs/core/"],
};

function detectLayer(projectName: string) {
  for (const [layer, prefixes] of Object.entries(DEFAULT_LAYERS)) {
    for (const prefix of prefixes) {
      if (projectName.includes(prefix)) {
        return layer;
      }
    }
  }
  return "unknown";
}

function loadGraph(): Graph {
  const file = "graph.json";

  if (!fs.existsSync(file)) {
    console.log(chalk.red("graph.json not found"));
    console.log("Run: nx graph --file=graph.json");
    process.exit(1);
  }

  const rawGraph = JSON.parse(fs.readFileSync(file, "utf-8"));
  const graph = rawGraph.graph ?? rawGraph;
  return graph;
}

function detectCircularDeps(graph: Graph) {
  const visited = new Set<string>();
  const stack = new Set<string>();
  const cycles: string[] = [];

  function dfs(node: string) {
    if (stack.has(node)) {
      cycles.push(node);
      return;
    }

    if (visited.has(node)) return;

    visited.add(node);
    stack.add(node);

    const deps = graph.dependencies[node] || [];

    for (const dep of deps) {
      dfs(dep.target);
    }

    stack.delete(node);
  }

  Object.keys(graph.nodes).forEach(dfs);

  return cycles;
}

function detectOrphans(graph: Graph) {
  const inbound = new Set<string>();

  Object.values(graph.dependencies).forEach((deps) => {
    deps.forEach((dep) => inbound.add(dep.target));
  });

  return Object.keys(graph.nodes).filter(
    (node) => !inbound.has(node)
  );
}

function detectLayerViolations(graph: Graph) {
  const violations: string[] = [];

  const layerOrder = ["apps", "features", "shared", "core"];

  Object.entries(graph.dependencies).forEach(
    ([source, deps]) => {
      const sourceLayer = detectLayer(source);

      deps.forEach(({ target }) => {
        const targetLayer = detectLayer(target);

        if (
          layerOrder.indexOf(sourceLayer) <
          layerOrder.indexOf(targetLayer)
        ) {
          violations.push(
            `${source} → ${target}`
          );
        }
      });
    }
  );

  return violations;
}

program.command("analyze").action(() => {
  const graph = loadGraph();

  console.log(
    chalk.blue("\nAnalyzing Nx workspace architecture...\n")
  );

  const circular = detectCircularDeps(graph);
  const orphans = detectOrphans(graph);
  const violations = detectLayerViolations(graph);

  console.log(
    chalk.yellow(
      `Circular dependencies: ${circular.length}`
    )
  );

  circular.forEach((c) =>
    console.log(chalk.gray(` - ${c}`))
  );

  console.log(
    chalk.yellow(`\nOrphan libraries: ${orphans.length}`)
  );

  orphans.forEach((o) =>
    console.log(chalk.gray(` - ${o}`))
  );

  console.log(
    chalk.red(
      `\nLayer violations: ${violations.length}`
    )
  );

  violations.forEach((v) =>
    console.log(chalk.gray(` - ${v}`))
  );

  console.log(
    chalk.green("\nAnalysis complete.\n")
  );
});

program.parse(process.argv);
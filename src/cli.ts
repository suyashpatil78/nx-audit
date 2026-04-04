#!/usr/bin/env node
import { Command } from "commander";
import fs from "fs";
import chalk from "chalk";

const program = new Command();

program
  .name("nx-audit")
  .description("Nx visualizer for auditing your workspace")
  .version("1.0.0");

type Graph = {
  nodes: Record<string, any>;
  dependencies: Record<string, { target: string }[]>;
};

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
  const stack: string[] = [];
  const cycles: string[][] = [];

  function dfs(node: string) {
    if (stack.includes(node)) {
      const cycleStartIndex = stack.indexOf(node);

      const cycle = [
        ...stack.slice(cycleStartIndex),
        node
      ];

      cycles.push(cycle);
      return;
    }

    if (visited.has(node)) return;

    visited.add(node);
    stack.push(node);

    const deps = graph.dependencies[node] || [];

    for (const dep of deps) {
      dfs(dep.target);
    }

    stack.pop();
  }

  Object.keys(graph.nodes).forEach(dfs);

  return cycles;
}

function detectOrphans(graph: Graph) {
  const inbound = new Set<string>();

  /*
  * graph.dependencies has list of projects and target represents the dependencies of the project
  * Check and add the projects which are dependencies of other projects
  */
  Object.values(graph.dependencies).forEach((deps) => {
    deps.forEach((dep) => inbound.add(dep.target));
  });

  // List the projects which are not dependencies of other projects
  return Object.keys(graph.nodes).filter(
    (node) => !inbound.has(node)
  );
}

program.command("analyze").action(() => {
  const graph = loadGraph();

  console.log(
    chalk.blue("\nAnalyzing Nx workspace architecture...\n")
  );

  const circular = detectCircularDeps(graph);
  const orphans = detectOrphans(graph);

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
    chalk.green("\nAnalysis complete.\n")
  );
});

program.parse(process.argv);
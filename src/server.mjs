#!/usr/bin/env node

import { dataDir } from "./state.mjs";
import { startAppServer } from "./app-server.mjs";

const started = await startAppServer();

console.log(`Claude Cowork Switch listening on ${started.url}`);
console.log(`Data dir: ${dataDir()}`);
console.log(`Providers found: ${started.snapshot.providers.length}`);
if (started.snapshot.active) {
  console.log(`Active provider: ${started.snapshot.active.name} (${started.snapshot.active.kind})`);
} else {
  console.log("No compatible provider found in cc-switch configs.");
}

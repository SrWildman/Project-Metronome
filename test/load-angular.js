'use strict';

// Loads the browser-side AngularJS files in Node with a minimal `angular`
// stub so the factories can be unit tested without a browser.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const jsDir = path.join(__dirname, '..', 'public', 'js');

function loadFactories(files) {
  const factories = {};
  const app = {
    factory(name, def) { factories[name] = def; return app; },
    filter(name, def) { factories[name] = def; return app; },
    controller() { return app; }
  };
  const sandbox = { angular: { module: () => app }, console: { log() {} } };
  vm.createContext(sandbox);
  for (const file of ['metronome.module.js', ...files]) {
    vm.runInContext(fs.readFileSync(path.join(jsDir, file), 'utf8'), sandbox, { filename: file });
  }
  return factories;
}

// Instantiate an injectable ([deps..., fn]) with the given dependency map.
function instantiate(def, deps = {}) {
  const fn = def[def.length - 1];
  return fn.apply({}, def.slice(0, -1).map((n) => deps[n]));
}

module.exports = { loadFactories, instantiate };

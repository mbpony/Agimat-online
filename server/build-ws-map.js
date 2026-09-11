#!/usr/bin/env node
// build-ws-map.js — one-click: convert a WorldForge "World-Spec" JSON into a playable Agimat map.
//   Usage:  node server/build-ws-map.js <worldspec.json> [name]
//   Output: data/maps/ws-<name>.json   → play in-game at  ?ws=<name>
'use strict';
const fs = require('fs'), path = require('path');
const { worldSpecToAgimat } = require('./worldspec-loader');

const inp = process.argv[2];
if(!inp){ console.error('Usage: node server/build-ws-map.js <worldspec.json> [name]'); process.exit(1); }
const name = process.argv[3] || path.basename(inp).replace(/\.worldspec\.json$|\.json$/,'').replace(/^agimat-/,'');

const spec = JSON.parse(fs.readFileSync(inp, 'utf8'));
const map = worldSpecToAgimat(spec);
const out = path.join(__dirname, '..', 'data', 'maps', 'ws-' + name + '.json');
fs.writeFileSync(out, JSON.stringify(map));
console.log('✓ ' + out);
console.log('  ' + map.gridW + 'x' + map.gridH + ' | ' + map.props.length + ' props | ' + map.wsPortals.length + ' portals | spawn ' + map.playerSpawn.tx + ',' + map.playerSpawn.ty);
console.log('  play it:  ?ws=' + name);

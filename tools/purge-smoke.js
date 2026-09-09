#!/usr/bin/env node
/* Removes throwaway smoke-test accounts from data/users.json.
 *   npm run smoke:purge
 * Safe no-op if the server is stopped (edits the file directly).
 * If the server IS running it will re-persist from memory on the next save,
 * so stop it first, purge, then start again.
 */
const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, '..', 'data', 'users.json');

if (!fs.existsSync(FILE)) { console.log('no users.json — nothing to purge'); process.exit(0); }

const users = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const before = Object.keys(users).length;
const doomed = Object.keys(users).filter((k) => /^smoke\d{9}$/.test(k));

for (const k of doomed) delete users[k];
fs.writeFileSync(FILE, JSON.stringify(users));

console.log('accounts before: ' + before);
console.log('purged:          ' + (doomed.length ? doomed.join(', ') : '(none)'));
console.log('accounts after:  ' + Object.keys(users).length);

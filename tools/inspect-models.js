#!/usr/bin/env node
/* AGIMAT — measure the custom hero GLB parts and compare against the metrics
 * baked into data/models/custom-heroes.json.
 *
 * The runtime compositor scales and seats body/outfit/hair from those numbers.
 * If a part was re-exported after the metrics were baked, everything drifts.
 *
 *   node tools/inspect-models.js
 */
const fs = require('fs');
const path = require('path');
const { NodeIO } = require('@gltf-transform/core');
const { ALL_EXTENSIONS } = require('@gltf-transform/extensions');

const ROOT = path.join(__dirname, '..');
const DIR = path.join(ROOT, 'assets/characters/base');
const METRICS_PATH = path.join(ROOT, 'data/models/custom-heroes.json');

const PARTS = [
  'base_male', 'base_female',
  'outfit_male', 'outfit_female',
  'outfit_male_rig', 'outfit_female_rig',
  'base_male_rig', 'base_female_rig',
  'hair_m1', 'hair_m2', 'hair_f1', 'hair_f2',
];

function boundsFromMesh(doc, mesh) {
  let min = [Infinity, Infinity, Infinity];
  let max = [-Infinity, -Infinity, -Infinity];
  let verts = 0, tris = 0;
  for (const prim of mesh.listPrimitives()) {
    const pos = prim.getAttribute('POSITION');
    if (!pos) continue;
    const arr = pos.getArray();
    const n = pos.getCount();
    verts += n;
    const idx = prim.getIndices();
    tris += idx ? idx.getCount() / 3 : n / 3;
    for (let i = 0; i < n; i++) {
      for (let a = 0; a < 3; a++) {
        const v = arr[i * 3 + a];
        if (v < min[a]) min[a] = v;
        if (v > max[a]) max[a] = v;
      }
    }
  }
  return { min, max, verts, tris };
}

(async () => {
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
  const metrics = JSON.parse(fs.readFileSync(METRICS_PATH, 'utf8'));

  console.log('AGIMAT custom-hero part inspection');
  console.log('metrics file: data/models/custom-heroes.json\n');

  const measured = {};

  for (const name of PARTS) {
    const file = path.join(DIR, name + '.glb');
    if (!fs.existsSync(file)) { console.log('  ' + name + ': MISSING'); continue; }
    const doc = await io.read(file);
    const root = doc.getRoot();
    const meshes = root.listMeshes();
    const nodes = root.listNodes();
    const skins = root.listSkins();

    let min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    let verts = 0, tris = 0;
    for (const m of meshes) {
      const b = boundsFromMesh(doc, m);
      verts += b.verts; tris += b.tris;
      for (let a = 0; a < 3; a++) {
        if (b.min[a] < min[a]) min[a] = b.min[a];
        if (b.max[a] > max[a]) max[a] = b.max[a];
      }
    }
    const size = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];

    // node-level transforms matter: a translated node shifts the whole part
    const nodeInfo = nodes.slice(0, 4).map((n) => {
      const t = n.getTranslation(), s = n.getScale();
      const nonId = t.some(Math.abs) || s.some((v) => Math.abs(v - 1) > 1e-6);
      return n.getName() + (nonId ? ' [t=' + t.map((x) => +x.toFixed(3)) + ' s=' + s.map((x) => +x.toFixed(3)) + ']' : '');
    });

    measured[name] = { size, min, max, verts, tris, skins: skins.length, nodes: nodes.length, nodeInfo };

    console.log('  ' + name);
    console.log('    size  w=' + size[0].toFixed(4) + '  h=' + size[1].toFixed(4) + '  d=' + size[2].toFixed(4));
    console.log('    minY=' + min[1].toFixed(4) + '  maxY=' + max[1].toFixed(4) +
      '   minX=' + min[0].toFixed(4) + '  maxX=' + max[0].toFixed(4));
    console.log('    tris=' + Math.round(tris) + '  verts=' + verts + '  skins=' + skins.length +
      '  nodes=' + nodes.length);
    if (nodeInfo.length) console.log('    root nodes: ' + nodeInfo.join(' | '));

    const M = metrics[name];
    if (M) {
      const chk = (label, got, want) => {
        if (want === undefined) return '  ' + label + ': (not in metrics)';
        const d = Math.abs(got - want);
        const ok = d < 0.005;
        return '  ' + label + ': file=' + got.toFixed(4) + ' metrics=' + (+want).toFixed(4) +
          ' delta=' + d.toFixed(4) + (ok ? ' OK' : '  <-- STALE');
      };
      console.log('  ' + chk('w', size[0], M.w));
      console.log('  ' + chk('h', size[1], M.h));
      console.log('  ' + chk('d', size[2], M.d));
    } else {
      console.log('    (no metrics entry — compositor will skip alignment for this part)');
    }
    console.log('');
  }

  /* ---- the alignment questions the compositor actually depends on ---- */
  console.log('=== alignment analysis ===');
  for (const g of ['male', 'female']) {
    const body = measured['base_' + g], outfit = measured['outfit_' + g];
    if (!body || !outfit) continue;
    console.log('  ' + g + ':');
    console.log('    body   minY=' + body.min[1].toFixed(4) + ' maxY=' + body.max[1].toFixed(4) +
      '  centerX=' + ((body.min[0] + body.max[0]) / 2).toFixed(4));
    console.log('    outfit minY=' + outfit.min[1].toFixed(4) + ' maxY=' + outfit.max[1].toFixed(4) +
      '  centerX=' + ((outfit.min[0] + outfit.max[0]) / 2).toFixed(4));
    console.log('    vertical gap at feet : ' + (outfit.min[1] - body.min[1]).toFixed(4));
    console.log('    vertical gap at head : ' + (outfit.max[1] - body.max[1]).toFixed(4));
    console.log('    outfit is ' + (outfit.size[0] < body.size[0] ? 'NARROWER' : 'WIDER') +
      ' than body: ' + outfit.size[0].toFixed(4) + ' vs ' + body.size[0].toFixed(4));
    const M = metrics['base_' + g];
    if (M) {
      console.log('    metrics headW=' + M.headW + '  but body w=' + body.size[0].toFixed(4) +
        (Math.abs(M.headW - body.size[0]) < 0.001 ? '  <-- headW is just the full body width' : ''));
      console.log('    metrics hairBaseY=' + M.hairBaseY + '  (body spans ' +
        body.min[1].toFixed(3) + '..' + body.max[1].toFixed(3) + ')');
    }
    console.log('');
  }
})().catch((e) => { console.error('inspect failed:', e); process.exit(1); });

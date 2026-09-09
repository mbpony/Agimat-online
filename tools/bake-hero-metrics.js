#!/usr/bin/env node
/* AGIMAT — bake data/models/custom-heroes.json from the ACTUAL GLB geometry.
 *
 * Why this exists: the previous metrics recorded `headW` as the widest point of
 * the whole rig (the arm-span, 0.8864) rather than the skull (0.4451). The
 * compositor scales hair from headW, so hair rendered 2.1-2.5x too wide. The
 * widths were also baked from the `_rig` files while the static compositor uses
 * the non-rig files, and the two poses have very different bounding boxes.
 *
 * This tool measures each part from its own file and slices the body at head
 * height to get a true head box, so body/outfit/hair can be fitted to each
 * other instead of guessed at.
 *
 *   node tools/bake-hero-metrics.js          # write the file
 *   node tools/bake-hero-metrics.js --dry    # print, don't write
 */
const fs = require('fs');
const path = require('path');
const { NodeIO } = require('@gltf-transform/core');
const { ALL_EXTENSIONS } = require('@gltf-transform/extensions');

const ROOT = path.join(__dirname, '..');
const DIR = path.join(ROOT, 'assets/characters/base');
const OUT = path.join(ROOT, 'data/models/custom-heroes.json');

const BODIES = ['base_male', 'base_female'];
const OUTFITS = ['outfit_male', 'outfit_female'];
const HAIRS = ['hair_m1', 'hair_m2', 'hair_f1', 'hair_f2'];

/* Hair is scaled to cover the skull, so we need the head box in the same
 * coordinate space as the body. Scan the top region of the body and take the
 * widest slice — on a chibi the head is the widest thing up there. */
const HEAD_TOP_FRAC = 0.75;   // start scanning at 75% of body height

function readPart(io, name) {
  const file = path.join(DIR, name + '.glb');
  if (!fs.existsSync(file)) throw new Error('missing asset: ' + file);
  return io.read(file).then((doc) => {
    const meshes = doc.getRoot().listMeshes();
    const pts = [];
    let tris = 0;
    for (const m of meshes) {
      for (const prim of m.listPrimitives()) {
        const pos = prim.getAttribute('POSITION');
        if (!pos) continue;
        const arr = pos.getArray(), n = pos.getCount();
        for (let i = 0; i < n; i++) pts.push([arr[i * 3], arr[i * 3 + 1], arr[i * 3 + 2]]);
        const idx = prim.getIndices();
        tris += idx ? idx.getCount() / 3 : n / 3;
      }
    }
    return { name, pts, tris: Math.round(tris) };
  });
}

function box(pts) {
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (const p of pts) for (let a = 0; a < 3; a++) {
    if (p[a] < min[a]) min[a] = p[a];
    if (p[a] > max[a]) max[a] = p[a];
  }
  return { min, max, size: [max[0] - min[0], max[1] - min[1], max[2] - min[2]] };
}

/* Widest x/z slice within a y-range — used to isolate the head from shoulders. */
function sliceBox(pts, yLo, yHi) {
  const sub = pts.filter((p) => p[1] >= yLo && p[1] <= yHi);
  if (!sub.length) return null;
  return { ...box(sub), n: sub.length };
}

/* Find the head bone's rest Y by walking the node tree. */
function headBoneY(doc) {
  let found = null;
  const walk = (node, y) => {
    const t = node.getTranslation();
    const wy = y + t[1];
    if (/^head$/i.test(node.getName() || '') && found === null) found = wy;
    for (const c of node.listChildren()) walk(c, wy);
  };
  for (const s of doc.getRoot().listScenes()) for (const c of s.listChildren()) walk(c, 0);
  return found;
}

const r4 = (v) => Math.round(v * 1e4) / 1e4;

(async () => {
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
  const dry = process.argv.includes('--dry');
  const out = {
    _meta: {
      generated: new Date().toISOString().slice(0, 10),
      tool: 'tools/bake-hero-metrics.js',
      note: 'Measured from the GLB files themselves. headW/headH/headD are a ' +
        'slice of the body at head height, NOT the bounding box. Do not edit by hand.',
    },
  };

  console.log('baking custom-heroes.json from assets/characters/base/\n');

  /* ---- bodies ---- */
  for (const name of BODIES) {
    const doc = await io.read(path.join(DIR, name + '.glb'));
    const part = await readPart(io, name);
    const b = box(part.pts);
    const h = b.size[1];
    /* width/depth come from the clean top slice; the slice deliberately starts
     * high because base_female has geometry spanning the full body width down
     * at y 0.70-0.85, which would otherwise be measured as "head". */
    const head = sliceBox(part.pts, h * HEAD_TOP_FRAC, b.max[1]);
    const rigName = name + '_rig';
    let boneY = null;
    if (fs.existsSync(path.join(DIR, rigName + '.glb'))) {
      const rigDoc = await io.read(path.join(DIR, rigName + '.glb'));
      boneY = headBoneY(rigDoc);
    }
    /* full skull height runs from the head bone to the crown — the slice alone
     * would only give the upper skull and under-fit a wig. */
    const headBottom = boneY !== null ? boneY : head.min[1];
    const headTop = b.max[1];
    out[name] = {
      w: r4(b.size[0]), h: r4(h), d: r4(b.size[2]),
      minY: r4(b.min[1]), maxY: r4(b.max[1]),
      centerX: r4((b.min[0] + b.max[0]) / 2),
      centerZ: r4((b.min[2] + b.max[2]) / 2),
      headW: r4(head.size[0]),
      headH: r4(headTop - headBottom),
      headD: r4(head.size[2]),
      headCY: r4((headBottom + headTop) / 2),
      headMinY: r4(headBottom),
      headMaxY: r4(headTop),
      hairBaseY: r4(headBottom),
      headBoneY: boneY === null ? null : r4(boneY),
      tris: part.tris,
    };
    const m = out[name];
    console.log('  ' + name);
    console.log('    body box   ' + m.w + ' x ' + m.h + ' x ' + m.d +
      '   centerX=' + m.centerX);
    console.log('    HEAD box   ' + m.headW + ' x ' + m.headH + ' x ' + m.headD +
      '   (sliced y ' + (h * HEAD_TOP_FRAC).toFixed(3) + '..' + m.maxY + ')');
    console.log('    hairBaseY  ' + m.hairBaseY + (boneY !== null ? ' (from head bone)' : ' (fallback: head bottom)'));
    console.log('');
  }

  /* ---- outfits ---- */
  for (const name of OUTFITS) {
    const part = await readPart(io, name);
    const b = box(part.pts);
    const gender = name.split('_')[1];
    const body = out['base_' + gender];
    out[name] = {
      w: r4(b.size[0]), h: r4(b.size[1]), d: r4(b.size[2]),
      minY: r4(b.min[1]), maxY: r4(b.max[1]),
      centerX: r4((b.min[0] + b.max[0]) / 2),
      centerZ: r4((b.min[2] + b.max[2]) / 2),
      /* offset the compositor must apply so the outfit lines up with the body */
      alignX: r4(body.centerX - (b.min[0] + b.max[0]) / 2),
      alignZ: r4(body.centerZ - (b.min[2] + b.max[2]) / 2),
      alignY: r4(body.minY - b.min[1]),
      tris: part.tris,
    };
    const m = out[name];
    console.log('  ' + name);
    console.log('    box        ' + m.w + ' x ' + m.h + ' x ' + m.d);
    console.log('    align      X' + (m.alignX >= 0 ? '+' : '') + m.alignX +
      '  Y' + (m.alignY >= 0 ? '+' : '') + m.alignY +
      '  Z' + (m.alignZ >= 0 ? '+' : '') + m.alignZ +
      '   (body centerX=' + body.centerX + ' outfit centerX=' + m.centerX + ')');
    console.log('');
  }

  /* ---- hair ---- */
  for (const name of HAIRS) {
    const part = await readPart(io, name);
    const b = box(part.pts);
    out[name] = {
      w: r4(b.size[0]), h: r4(b.size[1]), d: r4(b.size[2]),
      minY: r4(b.min[1]), maxY: r4(b.max[1]),
      centerX: r4((b.min[0] + b.max[0]) / 2),
      centerZ: r4((b.min[2] + b.max[2]) / 2),
      tris: part.tris,
    };
    console.log('  ' + name.padEnd(8) + ' ' + out[name].w + ' x ' + out[name].h + ' x ' + out[name].d);
  }
  console.log('');

  /* ---- the correction this whole tool exists for ---- */
  const prev = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
  console.log('=== headW correction (the bug) ===');
  for (const name of BODIES) {
    const oldW = prev[name] ? prev[name].headW : null;
    const newW = out[name].headW;
    if (oldW === null) { console.log('  ' + name + ': no previous value'); continue; }
    console.log('  ' + name.padEnd(13) + 'old headW=' + oldW + '  new headW=' + newW +
      '  -> hair was ' + (oldW / newW).toFixed(2) + 'x too wide');
  }
  console.log('');

  if (dry) { console.log('--dry: not written'); return; }
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
  console.log('wrote ' + path.relative(ROOT, OUT));
})().catch((e) => { console.error('bake failed:', e); process.exit(1); });

// Rigs the Gir mascot.
//
// The source model (assets-src/zap-character.glb) is four static meshes with no
// skeleton. This script bakes the node transforms into the vertices, normalises
// the character (feet on y=0, 1 unit tall, facing +Z), builds a 13-joint
// skeleton, paints skin weights, bakes a small set of animation clips and
// writes a self-contained skinned GLB to src/assets/zap.glb.
//
//   npm run rig:build
//
// No dependencies – the GLB container is read and written by hand so the
// output is fully deterministic.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SRC = fileURLToPath(new URL('../assets-src/zap-character.glb', import.meta.url));
const OUT = fileURLToPath(new URL('../src/assets/zap.glb', import.meta.url));

// ---------------------------------------------------------------- read source
const file = readFileSync(SRC);
const jsonLen = file.readUInt32LE(12);
const src = JSON.parse(file.subarray(20, 20 + jsonLen).toString('utf8'));
const srcBin = file.subarray(20 + jsonLen + 8);

function readAccessor(i) {
  const a = src.accessors[i];
  const bv = src.bufferViews[a.bufferView];
  const n = { SCALAR: 1, VEC2: 2, VEC3: 3 }[a.type];
  const base = (bv.byteOffset ?? 0) + (a.byteOffset ?? 0);
  const size = a.componentType === 5126 || a.componentType === 5125 ? 4 : a.componentType === 5123 ? 2 : 1;
  const stride = bv.byteStride ?? n * size;
  const out = new Array(a.count * n);
  for (let k = 0; k < a.count; k++)
    for (let c = 0; c < n; c++) {
      const o = base + k * stride + c * size;
      out[k * n + c] =
        a.componentType === 5126 ? srcBin.readFloatLE(o) : a.componentType === 5125 ? srcBin.readUInt32LE(o) : a.componentType === 5123 ? srcBin.readUInt16LE(o) : srcBin.readUInt8(o);
    }
  return out;
}

const IDENT = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
function mul(a, b) {
  const o = new Array(16).fill(0);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
  return o;
}
const world = {};
(function walk(i, parent) {
  const n = src.nodes[i];
  if (n.rotation || n.translation || n.scale) {
    if (n.mesh !== undefined || n.children) throw new Error('TRS on a non-leaf source node is not handled');
  }
  world[i] = mul(parent, n.matrix ?? IDENT);
  (n.children ?? []).forEach((c) => walk(c, world[i]));
})(src.scenes[src.scene ?? 0].nodes[0], IDENT);

// Source faces +X and is ~0.87 units tall, standing off-centre. Normalise to
// facing +Z, centred, 1 unit tall. (x,y,z) -> (-(z-cz), y, x-cx) is a proper
// rotation, so winding is preserved.
const CX = -0.74;
const CZ = 0.7405;
const SCALE = 1 / 0.8732;
const norm = ([x, y, z]) => [-(z - CZ) * SCALE, y * SCALE, (x - CX) * SCALE];
const normDir = ([x, y, z]) => [-z, y, x];

function bakeMesh(nodeIndex) {
  const node = src.nodes[nodeIndex];
  const prim = src.meshes[node.mesh].primitives[0];
  const m = world[nodeIndex];
  const det = m[0] * (m[5] * m[10] - m[6] * m[9]) - m[4] * (m[1] * m[10] - m[2] * m[9]) + m[8] * (m[1] * m[6] - m[2] * m[5]);
  const P = readAccessor(prim.attributes.POSITION);
  const N = readAccessor(prim.attributes.NORMAL);
  const uv = readAccessor(prim.attributes.TEXCOORD_0);
  const index = readAccessor(prim.indices);
  if (det < 0) for (let t = 0; t < index.length; t += 3) [index[t + 1], index[t + 2]] = [index[t + 2], index[t + 1]];
  const count = P.length / 3;
  const pos = [];
  const nor = [];
  for (let k = 0; k < count; k++) {
    const [x, y, z] = [P[k * 3], P[k * 3 + 1], P[k * 3 + 2]];
    pos.push(norm([m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]]));
    // Node matrices are rotation * uniform scale, so the upper 3x3 is fine for normals.
    const [a, b, c] = [N[k * 3], N[k * 3 + 1], N[k * 3 + 2]];
    const d = normDir([m[0] * a + m[4] * b + m[8] * c, m[1] * a + m[5] * b + m[9] * c, m[2] * a + m[6] * b + m[10] * c]);
    const len = Math.hypot(...d) || 1;
    nor.push(d.map((v) => v / len));
  }
  return { pos, nor, uv, index, material: prim.material, count };
}

/** Connected components (by welded position) → component id per vertex + bounds. */
function components(mesh) {
  const key = new Map();
  const rep = mesh.pos.map((p, k) => {
    const s = p.map((v) => v.toFixed(4)).join(',');
    if (!key.has(s)) key.set(s, k);
    return key.get(s);
  });
  const parent = rep.map((_, i) => i);
  const find = (x) => {
    while (parent[x] !== x) x = parent[x] = parent[parent[x]];
    return x;
  };
  for (let t = 0; t < mesh.index.length; t += 3) {
    const a = find(rep[mesh.index[t]]);
    parent[find(rep[mesh.index[t + 1]])] = a;
    parent[find(rep[mesh.index[t + 2]])] = a;
  }
  const comps = new Map();
  const of = rep.map((r) => find(r));
  of.forEach((r, k) => {
    if (!comps.has(r)) comps.set(r, { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity], verts: [] });
    const c = comps.get(r);
    c.verts.push(k);
    for (let a = 0; a < 3; a++) {
      c.min[a] = Math.min(c.min[a], mesh.pos[k][a]);
      c.max[a] = Math.max(c.max[a], mesh.pos[k][a]);
    }
  });
  for (const c of comps.values()) c.centre = c.min.map((v, a) => (v + c.max[a]) / 2);
  return [...comps.values()];
}

// Source layout: node 4 = body, 5 = inverted-hull outline, 7 = ears/face/zip, 10 = arms + feet.
const meshes = {
  Body: bakeMesh(4),
  Outline: bakeMesh(5),
  Details: bakeMesh(7),
  Limbs: bakeMesh(10),
};

// ------------------------------------------------------------------- skeleton
// Every joint is axis-aligned at bind (identity rotation), so clip rotations
// are plain offsets from the bind pose. Character's left is +X.
const JOINTS = [
  { name: 'Root', parent: null, at: [0, 0, 0] },
  { name: 'Hips', parent: 'Root', at: [0.014, 0.1, 0.005] },
  { name: 'Chest', parent: 'Hips', at: [0.014, 0.18, 0.005] },
  { name: 'Head', parent: 'Chest', at: [0.014, 0.265, 0.01] },
  { name: 'Ear.L', parent: 'Head', at: [0.218, 0.7, -0.016] },
  { name: 'EarTip.L', parent: 'Ear.L', at: [0.218, 0.84, -0.016] },
  { name: 'Ear.R', parent: 'Head', at: [-0.229, 0.7, 0.016] },
  { name: 'EarTip.R', parent: 'Ear.R', at: [-0.229, 0.845, 0.016] },
  { name: 'Tongue', parent: 'Head', at: [0.15, 0.425, 0.275] },
  { name: 'Arm.L', parent: 'Chest', at: [0.07, 0.207, -0.008] },
  { name: 'Arm.R', parent: 'Chest', at: [-0.05, 0.207, 0.002] },
  { name: 'Leg.L', parent: 'Hips', at: [0.047, 0.088, 0] },
  { name: 'Leg.R', parent: 'Hips', at: [-0.056, 0.09, 0] },
];
const J = Object.fromEntries(JOINTS.map((j, i) => [j.name, i]));
for (const j of JOINTS) {
  const p = j.parent ? JOINTS[J[j.parent]].at : [0, 0, 0];
  j.local = j.at.map((v, a) => v - p[a]);
}

// --------------------------------------------------------------- skin weights
const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Body + outline: hips → chest → head, blended smoothly through waist and neck. */
function bodyWeights([x, y, z]) {
  const r = Math.hypot(x - 0.014, z - 0.005);
  // The head overhangs the neck, so anything well outside the neck column
  // belongs to the head even when it is low (chin / jowls).
  const head = Math.max(smooth(0.235, 0.295, y), smooth(0.08, 0.115, r) * smooth(0.225, 0.265, y));
  const chest = (1 - head) * smooth(0.105, 0.175, y);
  return { Head: head, Chest: chest, Hips: 1 - head - chest };
}

function detailWeights(c) {
  const [cx, cy] = c.centre;
  if (c.min[1] > 0.6) {
    // An ear: stiff at the base, floppy toward the tip.
    const side = cx > 0 ? 'L' : 'R';
    const lo = JOINTS[J[`EarTip.${side}`]].at[1] - 0.06;
    return ([, y]) => {
      const tip = smooth(lo, lo + 0.12, y);
      return { [`EarTip.${side}`]: tip, [`Ear.${side}`]: 1 - tip };
    };
  }
  if (cy < 0.3) {
    // Zip: follows the torso only (never the head, although the pull sits near the neck).
    return ([, y]) => {
      const chest = smooth(0.105, 0.175, y);
      return { Chest: chest, Hips: 1 - chest };
    };
  }
  // Face parts. The tongue is the only piece below the mouth line on the character's left.
  const isTongue = c.max[1] < 0.435 && c.min[1] < 0.37 && c.min[0] > 0.08 && c.max[0] - c.min[0] < 0.15;
  return () => (isTongue ? { Tongue: 1 } : { Head: 1 });
}

function limbWeights(c) {
  const side = c.centre[0] > 0.014 ? 'L' : 'R';
  const bone = `${c.centre[1] < 0.12 ? 'Leg' : 'Arm'}.${side}`;
  return () => ({ [bone]: 1 });
}

function skin(mesh, pick) {
  mesh.joints = new Array(mesh.count);
  mesh.weights = new Array(mesh.count);
  const comps = pick ? components(mesh) : [{ verts: mesh.pos.map((_, k) => k) }];
  for (const c of comps) {
    const fn = pick ? pick(c) : bodyWeights;
    for (const k of c.verts) {
      const entries = Object.entries(fn(mesh.pos[k]))
        .filter(([, w]) => w > 1e-4)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4);
      const total = entries.reduce((s, [, w]) => s + w, 0);
      const js = [0, 0, 0, 0];
      const ws = [0, 0, 0, 0];
      entries.forEach(([name, w], i) => {
        js[i] = J[name];
        ws[i] = w / total;
      });
      mesh.joints[k] = js;
      mesh.weights[k] = ws;
    }
  }
}
skin(meshes.Body, null);
skin(meshes.Outline, null);
skin(meshes.Details, detailWeights);
skin(meshes.Limbs, limbWeights);

// ---------------------------------------------------------------- animations
const TAU = Math.PI * 2;
const FPS = 30;
/** 0→1→0 envelope: eases in over `a` seconds, holds, eases out over the last `b`. */
const env = (t, dur, a, b) => Math.min(smooth(0, a, t), 1 - smooth(dur - b, dur, t));
const ARM_REST = 0.4; // arms stick straight out in the bind pose; let them hang a little

// Each clip returns, per joint, an XYZ euler rotation `r` and/or a translation offset `t`.
const CLIPS = [
  {
    name: 'Idle',
    duration: 3,
    pose(t) {
      const p = (TAU * t) / 3;
      return {
        Hips: { t: [0, 0.006 * Math.sin(p), 0] },
        'Leg.L': { t: [0, -0.006 * Math.sin(p), 0] },
        'Leg.R': { t: [0, -0.006 * Math.sin(p), 0] },
        Chest: { r: [0.025 * Math.sin(p), 0, 0] },
        Head: { r: [0.03 * Math.sin(p + 0.6), 0.09 * Math.sin(p + 1), 0.06 * Math.sin(p)] },
        'Ear.L': { r: [0.04 * Math.sin(2 * p), 0, -0.05 + 0.06 * Math.sin(p - 0.5)] },
        'EarTip.L': { r: [0.06 * Math.sin(2 * p - 0.8), 0, 0.08 * Math.sin(p - 1.2)] },
        'Ear.R': { r: [0.04 * Math.sin(2 * p + 0.4), 0, 0.05 + 0.06 * Math.sin(p - 0.7)] },
        'EarTip.R': { r: [0.06 * Math.sin(2 * p - 0.4), 0, 0.08 * Math.sin(p - 1.4)] },
        Tongue: { r: [0.1 * Math.sin(2 * p), 0, 0.22 * Math.sin(2 * p + 0.5)] },
        'Arm.L': { r: [0, 0, -ARM_REST + 0.1 * Math.sin(p)] },
        'Arm.R': { r: [0, 0, ARM_REST - 0.1 * Math.sin(p)] },
      };
    },
  },
  {
    name: 'Run',
    duration: 0.48,
    pose(t) {
      const p = (TAU * t) / 0.48;
      const s = Math.sin(p);
      const bounce = 0.5 - 0.5 * Math.cos(2 * p);
      return {
        Hips: { t: [0, 0.035 * bounce, 0], r: [0.22, 0.12 * s, 0.05 * s] },
        Chest: { r: [0.06, -0.18 * s, 0] },
        Head: { r: [-0.16 + 0.05 * Math.cos(2 * p), 0.06 * s, -0.06 * s] },
        'Leg.L': { r: [0.95 * s, 0, 0], t: [0, 0.02 * Math.max(0, -Math.cos(p)), 0] },
        'Leg.R': { r: [-0.95 * s, 0, 0], t: [0, 0.02 * Math.max(0, Math.cos(p)), 0] },
        'Arm.L': { r: [0, -0.85 * s, -0.55] },
        'Arm.R': { r: [0, -0.85 * s, 0.55] },
        'Ear.L': { r: [-0.4 + 0.16 * Math.sin(2 * p - 0.6), 0, -0.05] },
        'EarTip.L': { r: [-0.35 + 0.22 * Math.sin(2 * p - 1.3), 0, 0] },
        'Ear.R': { r: [-0.4 + 0.16 * Math.sin(2 * p - 0.9), 0, 0.05] },
        'EarTip.R': { r: [-0.35 + 0.22 * Math.sin(2 * p - 1.6), 0, 0] },
        Tongue: { r: [0.3 * Math.sin(2 * p), 0, 0.25 * s] },
      };
    },
  },
  {
    name: 'Wave',
    duration: 1.8,
    pose(t) {
      const e = env(t, 1.8, 0.3, 0.3);
      const w = Math.sin((TAU * 3.5 * t) / 1.8);
      // The head overhangs the tiny arms, so lean away from the waving arm to keep it in view.
      return {
        Hips: { r: [0, 0, 0.05 * e] },
        Chest: { r: [0, 0, 0.08 * e] },
        Head: { r: [0, 0, 0.2 * e] },
        'Arm.L': { r: [0, -0.5 * e, -ARM_REST + e * (ARM_REST + 0.45 + 0.4 * w)] },
        'Arm.R': { r: [0, 0, ARM_REST] },
        'Ear.L': { r: [0, 0, -0.05 - 0.1 * e * w] },
        'EarTip.L': { r: [0, 0, -0.14 * e * w] },
        'Ear.R': { r: [0, 0, 0.05 - 0.1 * e * w] },
        'EarTip.R': { r: [0, 0, -0.14 * e * w] },
        Tongue: { r: [0, 0, 0.3 * e * w] },
      };
    },
  },
  {
    name: 'Jump',
    duration: 0.9,
    pose(t) {
      const crouch = env(t, 0.24, 0.14, 0.08) * (t < 0.24 ? 1 : 0);
      const u = Math.min(1, Math.max(0, (t - 0.2) / 0.45));
      const air = 4 * u * (1 - u);
      const land = t > 0.65 ? Math.sin(((t - 0.65) / 0.25) * Math.PI) : 0;
      const dip = 0.035 * crouch + 0.03 * land;
      const up = 0.3 * air;
      return {
        Hips: { t: [0, up - dip, 0], r: [0.12 * crouch + 0.1 * land - 0.08 * air, 0, 0] },
        'Leg.L': { t: [0, dip, 0], r: [-0.5 * air, 0, 0.25 * air] },
        'Leg.R': { t: [0, dip, 0], r: [-0.5 * air, 0, -0.25 * air] },
        Head: { r: [0.14 * crouch + 0.12 * land - 0.2 * air, 0, 0] },
        'Arm.L': { r: [0, 0, -ARM_REST - 0.3 * crouch + 1.5 * air - 0.2 * land] },
        'Arm.R': { r: [0, 0, ARM_REST + 0.3 * crouch - 1.5 * air + 0.2 * land] },
        'Ear.L': { r: [0.25 * crouch - 0.45 * air + 0.35 * land, 0, -0.05 - 0.2 * air] },
        'EarTip.L': { r: [0.3 * crouch - 0.55 * air + 0.5 * land, 0, -0.2 * air] },
        'Ear.R': { r: [0.25 * crouch - 0.45 * air + 0.35 * land, 0, 0.05 + 0.2 * air] },
        'EarTip.R': { r: [0.3 * crouch - 0.55 * air + 0.5 * land, 0, 0.2 * air] },
        Tongue: { r: [-0.5 * air + 0.4 * land, 0, 0] },
      };
    },
  },
  {
    name: 'Point',
    duration: 1.7,
    pose(t) {
      const e = env(t, 1.7, 0.3, 0.3);
      const jab = Math.sin((TAU * 3 * t) / 1.7);
      return {
        Hips: { r: [0.1 * e, 0, 0.06 * e] },
        Chest: { r: [0.1 * e, 0.12 * e, 0] },
        Head: { r: [0.3 * e, -0.15 * e, 0.1 * e] },
        'Arm.R': { r: [0, e * (0.5 + 0.12 * jab), ARM_REST + e * (0.85 + 0.12 * jab)] },
        'Arm.L': { r: [0, 0, -ARM_REST - 0.2 * e] },
        'Ear.L': { r: [0.25 * e, 0, -0.05] },
        'EarTip.L': { r: [0.3 * e + 0.06 * e * jab, 0, 0] },
        'Ear.R': { r: [0.25 * e, 0, 0.05] },
        'EarTip.R': { r: [0.3 * e + 0.06 * e * jab, 0, 0] },
        Tongue: { r: [0.15 * e * jab, 0, 0] },
      };
    },
  },
  {
    name: 'Dance',
    duration: 1.6,
    pose(t) {
      const p = (TAU * t) / 1.6;
      const s = Math.sin(p);
      const bounce = 0.5 - 0.5 * Math.cos(2 * p);
      return {
        Hips: { t: [0.03 * s, 0.02 * bounce, 0], r: [0, 0.2 * s, 0.14 * s] },
        Chest: { r: [0, 0, -0.2 * s] },
        Head: { r: [0.08 * Math.cos(2 * p), 0, 0.18 * Math.sin(p + 0.5)] },
        'Leg.L': { t: [-0.015 * s, 0.03 * Math.max(0, s) - 0.02 * bounce, 0], r: [0, 0, -0.14 * s] },
        'Leg.R': { t: [-0.015 * s, 0.03 * Math.max(0, -s) - 0.02 * bounce, 0], r: [0, 0, -0.14 * s] },
        'Arm.L': { r: [0, 0, 0.5 + 0.6 * Math.sin(2 * p)] },
        'Arm.R': { r: [0, 0, -0.5 + 0.6 * Math.sin(2 * p)] },
        'Ear.L': { r: [0, 0, -0.05 - 0.2 * Math.sin(p - 0.5)] },
        'EarTip.L': { r: [0, 0, -0.28 * Math.sin(p - 1.1)] },
        'Ear.R': { r: [0, 0, 0.05 - 0.2 * Math.sin(p - 0.5)] },
        'EarTip.R': { r: [0, 0, -0.28 * Math.sin(p - 1.1)] },
        Tongue: { r: [0.15 * Math.sin(2 * p), 0, 0.35 * s] },
      };
    },
  },
  {
    name: 'Cheer',
    duration: 1.4,
    pose(t) {
      const e = env(t, 1.4, 0.2, 0.3);
      const hop = e * Math.abs(Math.sin((TAU * t) / 1.4));
      const shake = Math.sin((TAU * 5 * t) / 1.4);
      return {
        Hips: { t: [0, 0.07 * hop, 0] },
        Head: { r: [-0.22 * e, 0, 0.05 * e * shake] },
        'Leg.L': { r: [0, 0, 0.3 * hop] },
        'Leg.R': { r: [0, 0, -0.3 * hop] },
        'Arm.L': { r: [0, 0, -ARM_REST + e * (ARM_REST + 1.1 + 0.15 * shake)] },
        'Arm.R': { r: [0, 0, ARM_REST - e * (ARM_REST + 1.1 + 0.15 * shake)] },
        'Ear.L': { r: [-0.2 * hop, 0, -0.05 - 0.15 * e] },
        'EarTip.L': { r: [-0.3 * hop, 0, -0.1 * e * shake] },
        'Ear.R': { r: [-0.2 * hop, 0, 0.05 + 0.15 * e] },
        'EarTip.R': { r: [-0.3 * hop, 0, 0.1 * e * shake] },
        Tongue: { r: [0.3 * e * shake, 0, 0] },
      };
    },
  },
];

function eulerToQuat([x, y, z]) {
  const [c1, c2, c3] = [Math.cos(x / 2), Math.cos(y / 2), Math.cos(z / 2)];
  const [s1, s2, s3] = [Math.sin(x / 2), Math.sin(y / 2), Math.sin(z / 2)];
  // intrinsic XYZ, matching three.js Euler('XYZ')
  return [s1 * c2 * c3 + c1 * s2 * s3, c1 * s2 * c3 - s1 * c2 * s3, c1 * c2 * s3 + s1 * s2 * c3, c1 * c2 * c3 - s1 * s2 * s3];
}

// ------------------------------------------------------------------ write GLB
const chunks = [];
let byteLength = 0;
const out = {
  asset: { version: '2.0', generator: 'atomic-exe scripts/rig-character.mjs' },
  scene: 0,
  scenes: [{ name: 'Scene', nodes: [0] }],
  nodes: [],
  meshes: [],
  skins: [],
  animations: [],
  materials: src.materials.map((m) => ({ ...m })),
  textures: src.textures,
  samplers: src.samplers,
  images: [],
  accessors: [],
  bufferViews: [],
  buffers: [],
};

function addView(buf, target) {
  const pad = (4 - (byteLength % 4)) % 4;
  if (pad) {
    chunks.push(Buffer.alloc(pad));
    byteLength += pad;
  }
  out.bufferViews.push({ buffer: 0, byteOffset: byteLength, byteLength: buf.length, ...(target ? { target } : {}) });
  chunks.push(buf);
  byteLength += buf.length;
  return out.bufferViews.length - 1;
}

const TYPES = { 1: 'SCALAR', 2: 'VEC2', 3: 'VEC3', 4: 'VEC4', 16: 'MAT4' };
function addAccessor(rows, width, componentType, { target, minMax = false, normalized = false } = {}) {
  const size = { 5126: 4, 5123: 2, 5121: 1 }[componentType];
  const buf = Buffer.alloc(rows.length * width * size);
  rows.forEach((row, k) => {
    for (let c = 0; c < width; c++) {
      const v = width === 1 ? row : row[c];
      const o = (k * width + c) * size;
      if (componentType === 5126) buf.writeFloatLE(v, o);
      else if (componentType === 5123) buf.writeUInt16LE(v, o);
      else buf.writeUInt8(v, o);
    }
  });
  const acc = { bufferView: addView(buf, target), componentType, count: rows.length, type: TYPES[width] };
  if (normalized) acc.normalized = true;
  if (minMax) {
    const col = (c) => rows.map((row) => Math.fround(width === 1 ? row : row[c]));
    acc.min = Array.from({ length: width }, (_, c) => Math.min(...col(c)));
    acc.max = Array.from({ length: width }, (_, c) => Math.max(...col(c)));
  }
  out.accessors.push(acc);
  return out.accessors.length - 1;
}

// nodes: 0 = armature, then joints, then skinned meshes
const JOINT_NODE0 = 1;
out.nodes.push({ name: 'ZapArmature', children: [JOINT_NODE0] });
JOINTS.forEach((j) => {
  const children = JOINTS.map((c, ci) => (c.parent === j.name ? JOINT_NODE0 + ci : -1)).filter((c) => c >= 0);
  out.nodes.push({ name: j.name, translation: j.local.map(Math.fround), ...(children.length ? { children } : {}) });
});

const ibm = JOINTS.map((j) => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, -j.at[0], -j.at[1], -j.at[2], 1]);
out.skins.push({
  name: 'ZapRig',
  skeleton: JOINT_NODE0,
  joints: JOINTS.map((_, i) => JOINT_NODE0 + i),
  inverseBindMatrices: addAccessor(ibm, 16, 5126),
});

for (const [name, m] of Object.entries(meshes)) {
  const tris = [];
  for (let t = 0; t < m.index.length; t++) tris.push(m.index[t]);
  const uvRows = Array.from({ length: m.count }, (_, k) => [m.uv[k * 2], m.uv[k * 2 + 1]]);
  const textured = Boolean(out.materials[m.material].pbrMetallicRoughness?.baseColorTexture);
  out.meshes.push({
    name,
    primitives: [
      {
        attributes: {
          POSITION: addAccessor(m.pos, 3, 5126, { target: 34962, minMax: true }),
          NORMAL: addAccessor(m.nor, 3, 5126, { target: 34962 }),
          ...(textured ? { TEXCOORD_0: addAccessor(uvRows, 2, 5126, { target: 34962 }) } : {}),
          JOINTS_0: addAccessor(m.joints, 4, 5121, { target: 34962 }),
          WEIGHTS_0: addAccessor(m.weights, 4, 5126, { target: 34962 }),
        },
        indices: addAccessor(tris, 1, 5123, { target: 34963 }),
        material: m.material,
        mode: 4,
      },
    ],
  });
  // Skinned meshes ignore their parents' transforms, so glTF wants them at the scene root.
  out.nodes.push({ name, mesh: out.meshes.length - 1, skin: 0 });
  out.scenes[0].nodes.push(out.nodes.length - 1);
}

for (const clip of CLIPS) {
  const frames = Math.round(clip.duration * FPS);
  const times = Array.from({ length: frames + 1 }, (_, f) => (f / frames) * clip.duration);
  const input = addAccessor(times, 1, 5126, { minMax: true });
  const poses = times.map((t) => clip.pose(t));
  const anim = { name: clip.name, channels: [], samplers: [] };
  // Every clip keys every joint, so cross-fades never leave a bone stuck in the previous clip's pose.
  JOINTS.forEach((j, ji) => {
    if (j.name === 'Root') return;
    const rot = poses.map((p) => eulerToQuat(p[j.name]?.r ?? [0, 0, 0]));
    anim.samplers.push({ input, output: addAccessor(rot, 4, 5126), interpolation: 'LINEAR' });
    anim.channels.push({ sampler: anim.samplers.length - 1, target: { node: JOINT_NODE0 + ji, path: 'rotation' } });
    if (poses.some((p) => p[j.name]?.t)) {
      const tr = poses.map((p) => j.local.map((v, a) => v + (p[j.name]?.t?.[a] ?? 0)));
      anim.samplers.push({ input, output: addAccessor(tr, 3, 5126), interpolation: 'LINEAR' });
      anim.channels.push({ sampler: anim.samplers.length - 1, target: { node: JOINT_NODE0 + ji, path: 'translation' } });
    }
  });
  out.animations.push(anim);
}

for (const img of src.images) {
  const bv = src.bufferViews[img.bufferView];
  const bytes = srcBin.subarray(bv.byteOffset ?? 0, (bv.byteOffset ?? 0) + bv.byteLength);
  out.images.push({ mimeType: img.mimeType, bufferView: addView(Buffer.from(bytes)) });
}

const binPad = (4 - (byteLength % 4)) % 4;
if (binPad) chunks.push(Buffer.alloc(binPad));
const bin = Buffer.concat(chunks);
out.buffers.push({ byteLength: bin.length });

let json = Buffer.from(JSON.stringify(out), 'utf8');
if (json.length % 4) json = Buffer.concat([json, Buffer.alloc(4 - (json.length % 4), 0x20)]);
const header = Buffer.alloc(12);
header.writeUInt32LE(0x46546c67, 0);
header.writeUInt32LE(2, 4);
header.writeUInt32LE(12 + 8 + json.length + 8 + bin.length, 8);
const jsonHead = Buffer.alloc(8);
jsonHead.writeUInt32LE(json.length, 0);
jsonHead.writeUInt32LE(0x4e4f534a, 4);
const binHead = Buffer.alloc(8);
binHead.writeUInt32LE(bin.length, 0);
binHead.writeUInt32LE(0x004e4942, 4);
writeFileSync(OUT, Buffer.concat([header, jsonHead, json, binHead, bin]));

const verts = Object.values(meshes).reduce((s, m) => s + m.count, 0);
console.log(`Rigged ${verts} vertices to ${JOINTS.length} joints, ${CLIPS.length} clips → ${OUT} (${((12 + 16 + json.length + bin.length) / 1024).toFixed(0)} kB)`);

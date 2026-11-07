// P74: fewer things to draw. A ship or a town is hundreds of little pieces, and every piece costs the phone a separate drawing request.
// mergeStatic glues the pieces that never move on their own into one piece per paint color. It looks exactly the same.
// Anything the game moves, hides or changes later is left alone: everything named in any userData (oars, sails, crew, flags, torches...),
// anything hidden when this runs, see-through things, and anything marked userData.keep.
const T = window.THREE;
const TMP = new T.Matrix4(), N3 = new T.Matrix3(), V = new T.Vector3();

function noteObjects(v, into, depth = 0){ if (!v || depth > 3) return;
  if (v.isObject3D){ into.add(v); return; }
  if (Array.isArray(v)){ for (const x of v) noteObjects(x, into, depth + 1); return; }
  if (typeof v === 'object' && Object.getPrototypeOf(v) === Object.prototype) for (const k in v) noteObjects(v[k], into, depth + 1); }

function bake(list, material, cast, receive){
  const useUv = !!(material.map || material.normalMap), useCol = !!material.vertexColors;
  let nv = 0, ni = 0; for (const m of list){ const g = m.geometry; nv += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; }
  const pos = new Float32Array(nv*3), nor = new Float32Array(nv*3), uv = useUv ? new Float32Array(nv*2) : null, col = useCol ? new Float32Array(nv*3) : null, idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
  let vo = 0, io = 0;
  for (const {geometry:g, bakeM:mt} of list){ const p = g.attributes.position, n = g.attributes.normal, u = g.attributes.uv, c = g.attributes.color, cnt = p.count;
    N3.getNormalMatrix(mt);
    for (let i = 0; i < cnt; i++){ V.fromBufferAttribute(p, i).applyMatrix4(mt); pos[(vo + i)*3] = V.x; pos[(vo + i)*3 + 1] = V.y; pos[(vo + i)*3 + 2] = V.z;
      if (n){ V.fromBufferAttribute(n, i).applyMatrix3(N3).normalize(); nor[(vo + i)*3] = V.x; nor[(vo + i)*3 + 1] = V.y; nor[(vo + i)*3 + 2] = V.z; }
      if (uv && u){ uv[(vo + i)*2] = u.getX(i); uv[(vo + i)*2 + 1] = u.getY(i); }
      if (col){ col[(vo + i)*3] = c ? c.getX(i) : 1; col[(vo + i)*3 + 1] = c ? c.getY(i) : 1; col[(vo + i)*3 + 2] = c ? c.getZ(i) : 1; } }
    const flip = mt.determinant() < 0, I = g.index, tris = (I ? I.count : cnt);
    for (let i = 0; i < tris; i += 3){ const a = I ? I.getX(i) : i, b = I ? I.getX(i + 1) : i + 1, d = I ? I.getX(i + 2) : i + 2; idx[io++] = vo + a; idx[io++] = vo + (flip ? d : b); idx[io++] = vo + (flip ? b : d); }
    vo += cnt; }
  const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setAttribute('normal', new T.BufferAttribute(nor, 3));
  if (uv) geo.setAttribute('uv', new T.BufferAttribute(uv, 2)); if (col) geo.setAttribute('color', new T.BufferAttribute(col, 3)); geo.setIndex(new T.BufferAttribute(idx, 1));
  const out = new T.Mesh(geo, material); out.castShadow = cast; out.receiveShadow = receive; out.userData.merged = true; return out;
}

export function mergeStatic(root){
  const pivots = new Set([root]);
  root.traverse(o => { noteObjects(o.userData, pivots); if (!o.visible || o.userData.keep || o.isLight || o.isInstancedMesh || o.isSprite || o.isPoints || o.isLine) pivots.add(o); });
  root.updateMatrixWorld(true);
  const groups = new Map();
  const walk = (o, pivot) => { for (const c of [...o.children]){ if (c.userData.noMerge) continue; const isPivot = pivots.has(c);
      if (c.isMesh && !isPivot && c.children.length === 0 && c.geometry && c.geometry.attributes.position && !c.morphTargetInfluences && !Array.isArray(c.material) && !c.material.transparent && c.renderOrder === 0 && !(c.material.isShaderMaterial)){
        const key = `${pivot.uuid}|${c.material.uuid}|${c.castShadow}|${c.receiveShadow}`; let g = groups.get(key); if (!g) groups.set(key, g = {pivot, list:[]}); g.list.push(c); }
      walk(c, isPivot ? c : pivot); } };
  walk(root, root);
  let before = 0, after = 0;
  for (const {pivot, list} of groups.values()){ if (list.length < 2) continue; before += list.length; after++;
    const inv = TMP.copy(pivot.matrixWorld).invert().clone();
    for (const m of list) m.bakeM = inv.clone().multiply(m.matrixWorld);
    pivot.add(bake(list, list[0].material, list[0].castShadow, list[0].receiveShadow));
    for (const m of list){ delete m.bakeM; m.parent.remove(m); } }
  // drop the empty groups left behind
  const prune = o => { for (const c of [...o.children]){ if (c.userData.noMerge) continue; prune(c); if (!pivots.has(c) && !c.children.length && !c.isMesh && !c.isLight && !c.isSprite && !c.isLine && !c.isPoints && c.type === 'Group') o.remove(c); } }; prune(root);
  return {before, after};
}
// free a model that is no longer used (shared geometry simply loads again if something else draws it)
export function freeModel(root){ root.traverse(o => { if (o.isMesh && o.geometry) o.geometry.dispose(); }); }

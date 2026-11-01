// Grass: little tufts in soft patches on the green islands, swaying in the wind. Each island's grass is one instanced mesh
// (a few hundred tufts drawn in one go), and islands off screen are skipped. Only on High graphics; Low leaves it out.
import {inPoly} from './world.js?v=5c3e890';
const T = window.THREE;

// one tuft: three soft blades leaning out a little, dark at the root and sunny at the tip
function tuftGeo(){
  const pos = [], col = [], nor = [], dark = new T.Color('#6f8a36'), tip = new T.Color('#a9c260');
  for (let b=0;b<3;b++){ const a = b/3*Math.PI*2 + .4, lean = .3 + (b % 2)*.15, h = 7.5 + b*1.2, w = 1.9;
    const ca = Math.cos(a), sa = Math.sin(a), px = -sa*w, pz = ca*w;
    pos.push(-px, 0, -pz, px, 0, pz, ca*lean*h*.5, h, sa*lean*h*.5);
    col.push(dark.r, dark.g, dark.b, dark.r, dark.g, dark.b, tip.r, tip.g, tip.b);
    for (let k=0;k<3;k++) nor.push(0, 1, 0); } // lit like the ground under it, so blades never look dark from behind
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new T.Float32BufferAttribute(col, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(nor, 3));
  return g;
}
const geo = tuftGeo();
const U = {uTime:{value:0}};
const mat = new T.MeshLambertMaterial({vertexColors:true, side:T.DoubleSide});
mat.onBeforeCompile = sh => { Object.assign(sh.uniforms, U);
  sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
    // the tips sway; neighbors move together, like wind passing over a field
    float hk = position.y/10.; hk *= hk; vec3 ip = vec3(instanceMatrix[3][0], 0., instanceMatrix[3][2]);
    transformed.x += sin(uTime*1.7 + ip.x*.045 + ip.z*.03)*2.4*hk; transformed.z += cos(uTime*1.3 + ip.x*.03 - ip.z*.04)*1.6*hk;`); };

const fields = [];
let shown = true;
const patch = (x, z) => { const a = Math.sin(x*.021 + Math.sin(z*.017)*1.7) + Math.sin(z*.025 - x*.009); return a; }; // soft patches, more grass in some places than others
// is = the island, g = its group, pts = the grass outline, hill = the hilltop outline (no grass up there), top = grass height,
// free(x, z) = false on streets, houses and farms. R = the island's own random numbers.
export function addGrass(g, pts, hill, top, R, free, tint){
  const xs = pts.map(p => p[0]), zs = pts.map(p => p[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), z0 = Math.min(...zs), z1 = Math.max(...zs);
  const area = (x1 - x0)*(z1 - z0), want = Math.min(2500, Math.floor(area/450)); if (want < 10) return;
  const m = new T.InstancedMesh(geo.clone(), mat, want), M = new T.Matrix4(), q = new T.Quaternion(), s = new T.Vector3(), p = new T.Vector3(), up = new T.Vector3(0, 1, 0), c = new T.Color();
  let n = 0;
  for (let k=0;k<want*3 && n<want;k++){
    const x = x0 + R()*(x1 - x0), z = z0 + R()*(z1 - z0);
    if (patch(x + g.position.x, z + g.position.z) < -.9 + R()*.6) continue;
    if (!inPoly(pts, x, z) || (hill && inPoly(hill, x, z)) || (free && !free(x, z))) continue;
    if (!inPoly(pts, x*1.04, z*1.04)) continue; // stay off the soft rim of the grass layer, so tufts don't float past the edge
    const sc = .75 + R()*.6; p.set(x, top - .3, z); q.setFromAxisAngle(up, R()*6.28); s.set(sc, sc*(.8 + R()*.5), sc);
    M.compose(p, q, s); m.setMatrixAt(n, M);
    c.set(tint).offsetHSL((R() - .5)*.06, 0, -R()*.12); m.setColorAt(n, c); n++; // tint = a light shade that slightly varies each tuft (it multiplies the blade colors)
  }
  if (n < 10) return;
  m.count = n; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true;
  m.receiveShadow = true; m.castShadow = false;
  // each field has its own (tiny) copy of the tuft, so it can carry a ball around the whole field: three.js uses it to skip islands off screen
  m.geometry.boundingSphere = new T.Sphere(new T.Vector3((x0 + x1)/2, top, (z0 + z1)/2), Math.hypot(x1 - x0, z1 - z0)/2 + 12);
  m.visible = shown; g.add(m); fields.push(m);
}
export function showGrass(on){ shown = on; for (const f of fields) f.visible = on; }
export function updateGrass(t){ U.uTime.value = t; }

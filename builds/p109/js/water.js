// P69: the sea itself: one water for the game and the Showroom, so what the Showroom shows is exactly what sails in the game.
const T = window.THREE;
// The sea: water with reflections of the sky and sun on many small moving waves. (P84: the cartoon sea is gone, Nicholas chose this one.)
export const SEA_LOOKS = {real:['#2d97bd', '#17679b', '#124e80', '#57c2bd']};
export const seaUniforms = () => ({uTile:{value:null}, uTileN:{value:1}, uTileO:{value:new T.Vector3()}, uZoom:{value:1}, uLair:{value:new T.Vector3(0, 0, 0)}, uNight:{value:0}, uTime:{value:0}, uSun:{value:new T.Vector3(0, 1, 0)}, uGlint:{value:1}, uStorm:{value:0}, uSky:{value:new T.Color()}, uWave:{value:1}, uGust:{value:new T.Vector3(1, 0, 0)}});
// the same swells as waveH() in world.js, written for the graphics card, with their slope (for the light) and smaller waves on top
// a smooth read of the picture: four linear samples weighted so the result has no corners (a bicubic filter)
const TILE_GLSL = `uniform sampler2D uTile; uniform float uTileN; uniform vec3 uTileO;
  vec4 tileAt(vec2 xz){ vec2 p = ((xz - uTileO.xy)/uTileO.z + .5)*(uTileN - 1.), f = fract(p), i = p - f, f2 = f*f, f3 = f2*f;
    vec2 w0 = (1. - 3.*f + 3.*f2 - f3)/6., w1 = (4. - 6.*f2 + 3.*f3)/6., w2 = (1. + 3.*f + 3.*f2 - 3.*f3)/6., w3 = f3/6., g0 = w0 + w1, g1 = w2 + w3;
    vec2 a = (i - 1. + w1/g0 + .5)/uTileN, b = (i + 1. + w3/g1 + .5)/uTileN;
    return g0.y*(g0.x*texture2D(uTile, a) + g1.x*texture2D(uTile, vec2(b.x, a.y))) + g1.y*(g0.x*texture2D(uTile, vec2(a.x, b.y)) + g1.x*texture2D(uTile, b)); }`;
const WAVES_GLSL = `
  vec3 swell(vec2 p0, float A, float t, float shore){ // height, slope along x, slope along z (keep in step with waterY() in world.js)
    vec2 p = vec2(p0.x + 70.*sin(p0.y*.0021 + 1.3) + 30.*sin(p0.y*.0057 + p0.x*.0013), p0.y + 70.*sin(p0.x*.0017 - .7) + 30.*sin(p0.x*.0049 - p0.y*.0011)); // the same uneven warp
    float a = p.x*.011 + t*1.3, b = p.y*.013 - t*1.1, c = (p.x + p.y)*.021 + t*2.;
    vec3 big = vec3(sin(a) + sin(b)*.8 + sin(c)*.4, .011*cos(a) + .4*.021*cos(c), .8*.013*cos(b) + .4*.021*cos(c))/2.2*A;
    // smaller waves from other directions, there even in the calm shallows, so the sea always rolls a little
    float d = p.x*.034 - p.y*.021 + t*1.9, e = p.x*.018 + p.y*.039 - t*1.6, C = (1.8 + A*.15)*shore;
    vec3 chop = vec3(sin(d)*.22 + sin(e)*.18, .22*.034*cos(d) + .18*.018*cos(e), -.22*.021*cos(d) + .18*.039*cos(e))*C*2.;
    return big + chop;
  }`;
export function waterMaterial(foamU){
const waterMat = new T.MeshPhongMaterial({color:'#ffffff', vertexColors:true, specular:'#000000', shininess:1, transparent:true, opacity:.8});
waterMat.defines = {};
waterMat.onBeforeCompile = sh => {
  Object.assign(sh.uniforms, foamU);
  sh.vertexShader = `attribute float aAmp, aShore, aLand; uniform float uTime, uWave; varying vec3 vWorld; varying vec2 vSl; varying float vH, vAmp, vLand, vSh;` + WAVES_GLSL + "\n" + sh.vertexShader
    .replace('#include <beginnormal_vertex>', `vec3 wp0 = (modelMatrix*vec4(position, 1.0)).xyz; float A = aAmp*uWave; vec3 sw = swell(wp0.xz, A, uTime, aShore);
      vec3 objectNormal = normalize(vec3(-sw.y, 1., -sw.z));`)
    .replace('#include <begin_vertex>', `vec3 transformed = position; transformed.y += sw.x; vH = sw.x; vAmp = max(A, .5); vSl = sw.yz; vLand = aLand; vSh = aShore;
      vWorld = (modelMatrix*vec4(transformed, 1.0)).xyz;`);
  sh.fragmentShader = TILE_GLSL + `
    varying vec3 vWorld; varying vec2 vSl; varying float vH, vAmp, vSh; uniform float uTime, uGlint, uStorm, uWave, uNight, uZoom; uniform vec3 uSun, uSky, uLair, uGust;
    // hashes and noise with no sin() in them and every corner wrapped the same way: no lines where the pattern repeats, on any phone
    vec2 h2(vec2 p){ vec3 a = fract(p.xyx*vec3(.1031, .1030, .0973)); a += dot(a, a.yzx + 33.33); return fract((a.xx + a.yz)*a.zy); }
    float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3. - 2.*f); vec2 a = mod(i, 289.), b = mod(i + 1., 289.);
      return mix(mix(h2(a).x, h2(vec2(b.x, a.y)).x, f.x), mix(h2(vec2(a.x, b.y)).x, h2(b).x, f.x), f.y); }
    // lots of small waves from many directions, bent so no crest is ever a straight line: the slope, to bend the light
    vec2 ripple(vec2 w0, float t){
      vec2 w = w0 + 22.*vec2(sin(w0.y*.017 + t*.21), sin(w0.x*.013 - t*.17));
      vec2 s = vec2(0.); float f;
      // P70: only broad, slow waves: the sea reads as smooth rolling water, with nothing fine enough to look like pixels
      f = cos(w.x*.031 + w.y*.013 + t*.9); s += f*vec2(.031, .013)*5.5;
      f = cos(w.x*-.019 + w.y*.041 - t*1.05); s += f*vec2(-.019, .041)*4.5;
      f = cos(w.x*.057 - w.y*.035 + t*1.4); s += f*vec2(.057, -.035)*2.2;
      return s; }
    ` + sh.fragmentShader
    .replace('#include <normal_fragment_begin>', `#include <normal_fragment_begin>
      float dist = length(vWorld.xz - cameraPosition.xz), zd = dist/uZoom, near = 1. - smoothstep(500., 2600., zd); // P67: zd: how far away a point is, compared with how far the camera has pulled back, so a big ship's far-out camera still sees all the detail
        vec2 rw = vWorld.xz;
        vec2 rp = ripple(rw, uTime)*(.1 + .06*uStorm + .02*min(vAmp, 12.))*near;
        // P67: from further out, wider waves take over from the small ones
        if (zk > .01){ float t2 = uTime*.55; vec2 w2 = (rw + 240.*vec2(vnoise(rw/300.) - .5, vnoise(rw/260. + 9.) - .5))/2.3; vec2 s2 = ripple(w2, t2) + ripple(w2.yx*.61 + 40., t2*.8)*.7; rp = mix(rp, s2*(.07 + .014*min(vAmp, 12.)), zk*.6); } // two sets at an angle, pushed around by noise, so no weave shows
        normal = normalize(normal + (viewMatrix*vec4(-rp.x, 0., -rp.y, 0.)).xyz);
      `)
    .replace('#include <color_fragment>', `vec4 tileC = tileAt(vWorld.xz); float landF = tileC.a; diffuseColor.rgb *= tileC.rgb;
      float zk = clamp((uZoom - 1.15)/.9, 0., 1.); // P67: 0 up close, 1 with the camera far out
        float hk = clamp(vH/vAmp, -1., 1.);
        // greener, lighter water on the crests where the light comes through, and wide slow patches, so it never looks flat
        diffuseColor.rgb *= .8*mix(.84, 1.1, smoothstep(-1., 1., hk));
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb*vec3(.9, 1.1, 1.05), smoothstep(.2, 1., hk)*.65);
        diffuseColor.rgb *= (.92 + .13*vnoise(vWorld.xz/620. + uTime*.008))*(1. + uNight*.08);
      // P70: gusts: soft dark patches of ruffled water that race downwind across the sea, stretched along the wind
      if (uGust.z > .3){ vec2 gs = vec2(dot(vWorld.xz, uGust.xy), dot(vWorld.xz, vec2(-uGust.y, uGust.x))) - vec2(uTime*(60. + 150.*uGust.z), 0.);
        float gn = vnoise(gs/vec2(1500., 520.)) *.72 + vnoise(gs/vec2(620., 240.) + 7.)*.28, gk = smoothstep(.3, .85, uGust.z);
          diffuseColor.rgb *= 1. - .17*gk*smoothstep(.5, .72, gn);
      }
      // P56: the wine-dark sea around the pirate king's lair (uLair = x, z, radius): deep wine red, crests a little lighter
      if (uLair.z > 0.){ float lk = 1. - smoothstep(uLair.z*.55, uLair.z, length(vWorld.xz - uLair.xy));
        diffuseColor.rgb = mix(diffuseColor.rgb, mix(vec3(.24, .04, .12), vec3(.46, .12, .22), smoothstep(-1., 1., hk)), lk*.9); }`)
    // everything below goes in before the fog, so far water always melts into the haze with no edge
    .replace('#include <fog_fragment>', `
      vec3 foamC = mix(vec3(.97, .99, 1.), vec3(.62, .74, .78), uStorm*.7);
      foamC = mix(foamC, vec3(.46, .58, .8), uNight*.7); // moonlit foam: softer and bluer
      vec3 Vv = normalize(cameraPosition - vWorld);
      float lair = uLair.z > 0. ? 1. - smoothstep(uLair.z*.55, uLair.z, length(vWorld.xz - uLair.xy)) : 0.;
        // the sky mirrored in the water: more at a low angle, deeper blue high up, broken up by every little wave
        vec3 nW = normalize(vec3(-vSl.x - rp.x, 1., -vSl.y - rp.y)), Rr = reflect(-Vv, nW);
        float nv = max(dot(Vv, nW), 0.), fres = .1 + 1.5*pow(1. - nv, 2.4);
        fres = min(fres, .82);
        vec3 skyC = mix(uSky*1.08, uSky*vec3(.42, .62, .98), smoothstep(.45, 1., Rr.y));
        gl_FragColor.rgb = mix(gl_FragColor.rgb, skyC, fres*(1. - .5*lair));
        // the sun on the water: a wide soft sheen, and bright glitter on the finest waves
        float sp = max(dot(reflect(-uSun, nW), Vv), 0.);
        vec3 sunC = mix(vec3(1., .95, .84), vec3(.78, .86, 1.), uNight);
        gl_FragColor.rgb += sunC*(pow(sp, 10.)*.1 + pow(sp, 60.)*.3 + pow(sp, 260.)*.5)*uGlint*near; /* P70: a smooth shine with no speckle */
        // foam: soft white on the highest crests, more in rough water, and a gentle lace where waves lap at the shore
        float n1 = vnoise(vWorld.xz/90. + vec2(uTime*.1, -uTime*.04)), n2 = vnoise(vWorld.xz/38. - vec2(uTime*.07, uTime*.1));
        float foamN = n1*.7 + n2*.3, rough = clamp((vAmp - 2.5)*.1, 0., 1.);
        float cap = smoothstep(.34, .95, hk)*smoothstep(.56 - rough*.14, .78, foamN)*(.08 + rough);
        float lace = (1. - smoothstep(.05, .34, landF))*smoothstep(.5, .72, n2*.55 + n1*.45 + .22*sin(landF*26. - uTime*.8));
        gl_FragColor.rgb = mix(gl_FragColor.rgb, foamC, clamp(cap*.8 + lace*.55, 0., .9)*(1. - lair)*(1. - .4*uNight)*(1. - smoothstep(1700., 3000., zd)));
      // the wine-dark sea stays deep red and doesn't wash out to lilac
      gl_FragColor.rgb = mix(gl_FragColor.rgb, gl_FragColor.rgb*vec3(.62, .28, .38) + vec3(.06, 0., .02), lair*.85);
      #include <fog_fragment>`);
};
return waterMat; }
// the sea floor: a darker copy of the water's colors, showing softly through the water
export function bedMaterial(foamU){
const bedMat = new T.MeshBasicMaterial({vertexColors:true, color:'#8fa6b8', fog:true});
bedMat.onBeforeCompile = sh => { Object.assign(sh.uniforms, foamU);
  sh.vertexShader = 'varying vec2 vBed;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vBed = (modelMatrix*vec4(position, 1.)).xz;');
  sh.fragmentShader = TILE_GLSL + '\nvarying vec2 vBed;\n' + sh.fragmentShader.replace('#include <color_fragment>', 'diffuseColor.rgb *= tileAt(vBed).rgb;'); };
return bedMat; }
// the same swell() as the graphics card's, for ships that ride it outside the game (the Showroom). Returns the height.
export function swellAt(x0, z0, A, t, shore){
  const x = x0 + 70*Math.sin(z0*.0021 + 1.3) + 30*Math.sin(z0*.0057 + x0*.0013), z = z0 + 70*Math.sin(x0*.0017 - .7) + 30*Math.sin(x0*.0049 - z0*.0011);
  const big = (Math.sin(x*.011 + t*1.3) + Math.sin(z*.013 - t*1.1)*.8 + Math.sin((x + z)*.021 + t*2)*.4)/2.2*A, C = (1.8 + A*.15)*shore;
  return big + (Math.sin(x*.034 - z*.021 + t*1.9)*.22 + Math.sin(x*.018 + z*.039 - t*1.6)*.18)*C*2; }

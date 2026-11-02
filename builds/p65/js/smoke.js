// Smoke like in Tiny Glade: one soft, thick column that rises and sways in a slow wave, puffier and wider as it climbs,
// and fades away at the top. Each column is a tube bent in the shader, so it costs about as much as one small model.
// Used for chimneys in the towns and for burning ships (dark at the bottom, turning grey).
const T = window.THREE;
const geo = new T.CylinderGeometry(1, 1, 1, 14, 36, true); geo.translate(0, .5, 0); // y from 0 (bottom) to 1 (top)
geo.boundingSphere = new T.Sphere(new T.Vector3(0, 60, 0), 120); // the shader stretches it up to about 130 high, so three.js gets a big enough ball to check
const shared = {uTime:{value:0}, uDim:{value:1}, uWind:{value:new T.Vector2(.25, -.15)}};

const vert = `uniform float uTime, uH, uR0, uR1, uSway, uSeed, uSpeed, uLean; uniform vec2 uWind;
  varying float vY; varying vec3 vN;
  #include <fog_pars_vertex>
  void main(){
    float y = position.y, t = uTime*uSpeed;
    // the whole column waves from side to side, more the higher it goes
    float sx = uSway*y*(sin(y*5.2 - t*1.5 + uSeed)*.7 + sin(y*10.5 - t*2.2 + uSeed*2.)*.3);
    float sz = uSway*y*cos(y*4.1 - t*1.2 + uSeed*1.7)*.6;
    // thin at the chimney, puffy and wide up top, with soft lumps rolling upward
    float r = mix(uR0, uR1, pow(y, .75))*(1. + .2*sin(y*13. - t*3. + uSeed) + .08*sin(y*29. - t*4.4));
    vec3 p = vec3(position.x*r + sx, y*uH, position.z*r + sz);
    vN = normalize(normalMatrix*vec3(position.x, .25, position.z)); vY = y;
    // the wind bends the top over (in the world, so a turning ship's smoke still streams downwind)
    vec4 wp = modelMatrix*vec4(p, 1.); wp.xz += uWind*uLean*uH*y*y;
    vec4 mvPosition = viewMatrix*wp; gl_Position = projectionMatrix*mvPosition;
    #include <fog_vertex>
  }`;
const frag = `uniform vec3 uBase, uTop; uniform float uAlpha, uDim; varying float vY; varying vec3 vN;
  #include <fog_pars_fragment>
  void main(){
    // soft light from the upper left of the screen, so the column looks round and fluffy
    float l = max(dot(normalize(vN), normalize(vec3(-.45, .75, .5))), 0.);
    vec3 c = mix(uBase, uTop, smoothstep(0., .6, vY))*(.78 + .32*l)*uDim;
    float a = uAlpha*smoothstep(0., .06, vY)*(1. - smoothstep(.55, 1., vY));
    gl_FragColor = vec4(c, a);
    #include <fog_fragment>
  }`;

// h = height, r0/r1 = radius at the bottom and the top, sway = how far it waves, base/top = colors bottom and top.
export function smokeColumn({h = 70, r0 = 2.2, r1 = 7, sway = 8, base = '#f2f0ec', top = '#ffffff', alpha = .92, speed = 1, lean = 1} = {}){
  const u = T.UniformsUtils.merge([T.UniformsLib.fog, {uH:{value:h}, uR0:{value:r0}, uR1:{value:r1}, uSway:{value:sway}, uSeed:{value:Math.random()*6.28},
    uSpeed:{value:speed}, uLean:{value:lean}, uBase:{value:new T.Color(base)}, uTop:{value:new T.Color(top)}, uAlpha:{value:alpha}}]);
  Object.assign(u, shared); // every column shares the clock and the night dimming
  const m = new T.Mesh(geo, new T.ShaderMaterial({uniforms:u, vertexShader:vert, fragmentShader:frag, transparent:true, depthWrite:false, fog:true}));
  m.renderOrder = 2; m.userData.smoke = true; return m;
}
// Every frame: move the clock on, darken the smoke at night and lean it with the wind (windA = where the wind blows to, windK 0..1).
export function updateSmoke(t, night = 0, windA = 0, windK = .5){ shared.uTime.value = t; shared.uDim.value = 1 - night*.55;
  const k = .15 + windK*.45; shared.uWind.value.set(Math.cos(windA)*k, Math.sin(windA)*k); }

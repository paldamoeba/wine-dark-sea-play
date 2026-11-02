// Screen effects for the showroom's full graphics: bloom (only things marked userData.glow shine, like torch flames),
// and the game's "tiny world" look (tilt-shift blur at the top and bottom, a little more color, a soft vignette).
const T = window.THREE;
const quadVS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }';
const blurFS = `uniform sampler2D tex; uniform vec2 dir; varying vec2 vUv;
  void main(){ vec4 c = texture2D(tex, vUv)*.227;
    c += (texture2D(tex, vUv + dir*1.385) + texture2D(tex, vUv - dir*1.385))*.316;
    c += (texture2D(tex, vUv + dir*3.231) + texture2D(tex, vUv - dir*3.231))*.07; gl_FragColor = c; }`;
const finalFS = `uniform sampler2D tex, glowA, glowB; uniform vec2 res; uniform float glow, tilt; varying vec2 vUv;
  void main(){
    vec4 c = texture2D(tex, vUv); float tot = 1.;
    if (tilt > 0.){ float r = smoothstep(.26, .5, abs(vUv.y - .5))*12.; float spin = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233)))*43758.5453)*6.2831;
      if (r > .4) for (int i = 1; i <= 16; i++){ float k = float(i), a = k*2.39996 + spin, rr = sqrt(k/16.)*r; c += texture2D(tex, vUv + vec2(cos(a), sin(a))*rr/res); tot += 1.; } }
    vec3 col = c.rgb/tot;
    col += (texture2D(glowA, vUv).rgb*1.3 + texture2D(glowB, vUv).rgb*1.6)*glow;
    if (tilt > 0.){ float l = dot(col, vec3(.299, .587, .114)); col = mix(vec3(l), col, 1.15)*vec3(1.035, 1., .955);
      col *= mix(.84, 1., smoothstep(.98, .45, length((vUv - .5)*vec2(1.1, 1.)))); }
    gl_FragColor = vec4(col, 1.);
  }`;

export function makePost(renderer){
  const quad = new T.Mesh(new T.PlaneGeometry(2, 2)); quad.frustumCulled = false;
  const qs = new T.Scene(); qs.add(quad); const qc = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const blur = new T.ShaderMaterial({uniforms:{tex:{value:null}, dir:{value:new T.Vector2()}}, vertexShader:quadVS, fragmentShader:blurFS, depthTest:false, depthWrite:false});
  const fin = new T.ShaderMaterial({uniforms:{tex:{value:null}, glowA:{value:null}, glowB:{value:null}, res:{value:new T.Vector2()}, glow:{value:0}, tilt:{value:0}}, vertexShader:quadVS, fragmentShader:finalFS, depthTest:false, depthWrite:false});
  const black = new T.MeshBasicMaterial({color:0x000000}), blackLine = new T.LineBasicMaterial({color:0x000000});
  let main = null, g1 = [], g2 = [], W = 0, H = 0;
  const rt = (w, h) => new T.WebGLRenderTarget(w, h, {minFilter:T.LinearFilter, magFilter:T.LinearFilter});
  function size(){
    const v = renderer.getDrawingBufferSize(new T.Vector2()); if (v.x === W && v.y === H) return; W = v.x; H = v.y;
    [main, ...g1, ...g2].forEach(r => r && r.dispose());
    main = renderer.capabilities.isWebGL2 && T.WebGLMultisampleRenderTarget ? new T.WebGLMultisampleRenderTarget(W, H) : rt(W, H);
    g1 = [rt(W >> 1, H >> 1), rt(W >> 1, H >> 1)]; g2 = [rt(W >> 3, H >> 3), rt(W >> 3, H >> 3)];
  }
  const pass = (m, target) => { quad.material = m; renderer.setRenderTarget(target); renderer.render(qs, qc); };
  function blurInto(src, pair, w, h, n){ let s = src;
    for (let i=0;i<n;i++){ blur.uniforms.tex.value = s.texture; blur.uniforms.dir.value.set(1/w, 0); pass(blur, pair[1]);
      blur.uniforms.tex.value = pair[1].texture; blur.uniforms.dir.value.set(0, 1/h); pass(blur, pair[0]); s = pair[0]; } }
  // Draw the frame. glow = bloom strength (0 = off), tilt = the tiny-world look on or off.
  return function render(scene, camera, {glow = 0, tilt = false} = {}){
    if (!glow && !tilt){ renderer.setRenderTarget(null); renderer.render(scene, camera); return; }
    size();
    renderer.setRenderTarget(main); renderer.render(scene, camera);
    if (glow){
      // the glow pass: everything black except the glowing things, so only they bloom (and walls in front still hide them)
      const swapped = [], bg = scene.background, fog = scene.fog; scene.background = null; scene.fog = null;
      const hidden = [];
      scene.traverse(o => { if (o.isSprite && o.visible){ hidden.push(o); o.visible = false; } else if ((o.isMesh || o.isLine) && !o.userData.glow && o.visible){ swapped.push([o, o.material]); o.material = o.isLine ? blackLine : black; } });
      const cc = renderer.getClearColor(new T.Color()), ca = renderer.getClearAlpha(); renderer.setClearColor(0x000000, 1);
      renderer.setRenderTarget(g1[0]); renderer.clear(); renderer.render(scene, camera);
      renderer.setClearColor(cc, ca); for (const [o, m] of swapped) o.material = m; for (const o of hidden) o.visible = true; scene.background = bg; scene.fog = fog;
      blurInto(g1[0], g1, W >> 1, H >> 1, 2);
      blurInto(g1[0], g2, W >> 3, H >> 3, 2);
    }
    fin.uniforms.tex.value = main.texture; fin.uniforms.glowA.value = g1[0] ? g1[0].texture : null; fin.uniforms.glowB.value = g2[0] ? g2[0].texture : null;
    fin.uniforms.res.value.set(W, H); fin.uniforms.glow.value = glow; fin.uniforms.tilt.value = tilt ? 1 : 0;
    pass(fin, null);
  };
}

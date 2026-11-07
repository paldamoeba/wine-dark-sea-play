// P74: the loading screen on a background thread. The page can be as busy as it likes, the ship keeps sailing.
self.window = self;
self.document = {createElement:() => new OffscreenCanvas(1, 1)}; // the ship's paint and hair are drawn on little canvases
self.onmessage = async e => { const m = e.data;
  if (m.resize){ if (self.run) self.run.resize(...m.resize); return; }
  try { await import(m.three); const {runBootScene} = await import('./bootscene.js?v=5b0520c');
    self.run = runBootScene(m.canvas, m.info, m.w, m.h, m.dpr, () => postMessage({first:true}));
  } catch (err) { postMessage({err:String(err)}); } };
postMessage({ready:true});

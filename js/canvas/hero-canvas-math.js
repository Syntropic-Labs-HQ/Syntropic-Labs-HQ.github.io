(function () {
  'use strict';

  const canvas = document.getElementById('hero-3d-canvas');
  const container = document.getElementById('hero-canvas-container');
  if (!canvas || !container) return;

  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, DPR = 1;

  const CYCLE_INTERVAL    = 5800;
  const INFLOW_DURATION   = 2400;
  const SIGNAL_DURATION   = 1200;
  const NODE_COUNT        = 6;
  const NODE_RADIUS       = 0.38;
  const ACCENT            = '#d4f53c';
  const ACCENT_R          = 212;
  const ACCENT_G          = 245;
  const ACCENT_B          = 60;
  const BG                = '#0e0e0e';

  const NODE_CONFIG = [
    { title: 'AUTOMATION',      angle: -Math.PI / 3,       align: 'left',   offsetX:  18, offsetY: -12 },
    { title: 'RAG SYSTEM',      angle: 0,                  align: 'center', offsetX:   0, offsetY:  35 },
    { title: '3D WEB SYSTEMS', angle:  Math.PI / 3,       align: 'left',   offsetX:  18, offsetY:  40 },
    { title: 'DESKTOP & MOBILE', angle:  2 * Math.PI / 3,   align: 'right',  offsetX: -18, offsetY:  40 },
    { title: 'WEB SYSTEMS',     angle:  Math.PI,           align: 'center', offsetX:   0, offsetY:  35 },
    { title: 'AI SYSTEMS',      angle: -2 * Math.PI / 3,   align: 'right',  offsetX: -18, offsetY: -12 }
  ];

  var nodes          = [];
  var signals        = [];
  var waves          = [];
  var scanFlashes    = [];
  var chaosParticles = [];

  var lastTime       = 0;
  var cycleStart     = 0;
  var blastFired     = false;
  var visible        = true;

  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
  function clamp(v, a, b)  { return Math.max(a, Math.min(b, v)); }
  function rgba(a)         { return 'rgba(' + ACCENT_R + ',' + ACCENT_G + ',' + ACCENT_B + ',' + a + ')'; }

  function spawnChaosParticle(cx, cy, maxDist) {
    var ang = Math.random() * Math.PI * 2;
    var isEdge = Math.random() < 0.72;
    var dist = isEdge 
      ? (0.65 + Math.random() * 0.65) * maxDist 
      : (0.25 + Math.random() * 0.40) * maxDist;
    return {
      x: cx + Math.cos(ang) * dist,
      y: cy + Math.sin(ang) * dist,
      origDist: dist,
      angle: ang,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      size: 1.8 + Math.random() * 2.2,
      alpha: 0.35 + Math.random() * 0.50,
      absorbed: false
    };
  }

  function initChaosParticles() {
    chaosParticles = [];
    var cx = W / 2, cy = H / 2;
    var maxDist = Math.min(W, H) * 0.55;
    for (var i = 0; i < 125; i++) {
      chaosParticles.push(spawnChaosParticle(cx, cy, maxDist));
    }
  }

  function initNodes() {
    nodes = [];
    var cx = W / 2, cy = H / 2;
    var scale = Math.max(0.55, Math.min(W, H) / 480);
    var nodeRadius = NODE_RADIUS * (0.75 + 0.25 * scale);
    var r = Math.min(W, H) * nodeRadius;
    var minOffset = 40;

    for (var i = 0; i < NODE_COUNT; i++) {
      var cfg = NODE_CONFIG[i];
      nodes.push({
        x: cx + Math.cos(cfg.angle) * r,
        y: cy + Math.sin(cfg.angle) * r,
        angle: cfg.angle,
        title: cfg.title,
        align: cfg.align,
        offsetX: cfg.offsetX === 0 ? 0 : Math.max(minOffset, Math.abs(cfg.offsetX) * scale) * (cfg.offsetX < 0 ? -1 : 1),
        offsetY: cfg.offsetX === 0
          ? (cfg.offsetY < 0 ? -1 : 1) * Math.max(minOffset, Math.abs(cfg.offsetY) * scale)
          : cfg.offsetY * scale,
        _scale: scale,
        flareAt: null,
        _signalDone: false
      });
    }
    initChaosParticles();
  }

  function fireOrderedBlast(now) {
    nodes.forEach(function (node) {
      node._signalDone = false;
      signals.push({ node: node, start: now, duration: SIGNAL_DURATION });
    });
    waves.push({ start: now, duration: 1100, maxRadius: Math.min(W, H) * 0.48 });
    scanFlashes.push({ start: now, duration: 600 });
  }

  function drawBrandEmblem(cx, cy, radius, now, flashT, cycleTime) {
    ctx.save();
    ctx.translate(cx, cy);

    var rOut      = radius * 1.000;
    var rIn       = radius * 0.924;
    var gap       = radius * 0.054;
    var rDiamond  = radius * 0.512;
    var chamfer   = radius * 0.045;
    var rAperture = radius * 0.144;

    var haloG = ctx.createRadialGradient(0, 0, radius * 0.2, 0, 0, radius * 1.45);
    haloG.addColorStop(0,   rgba(0.22 + flashT * 0.35));
    haloG.addColorStop(0.4, rgba(0.08 + flashT * 0.15));
    haloG.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = haloG;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 1.45, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(0, 0, radius * 1.16, 0, Math.PI * 2);
    ctx.strokeStyle = rgba(0.14);
    ctx.lineWidth   = 0.8;
    ctx.setLineDash([2, 6]);
    ctx.stroke();
    ctx.setLineDash([]);

    var bladeAngleOffsets = [0, Math.PI / 2, Math.PI, 3 * Math.PI / 2];
    var localBlade = [
      [ rOut, gap  ],
      [ rIn,  gap  ],
      [ gap,  rIn  ],
      [ gap,  rOut ]
    ];

    bladeAngleOffsets.forEach(function (baseAng) {
      var cosA = Math.cos(baseAng);
      var sinA = Math.sin(baseAng);

      var pts = [];
      for (var p = 0; p < 4; p++) {
        var lx = localBlade[p][0];
        var ly = localBlade[p][1];
        pts.push({
          x: lx * cosA - ly * sinA,
          y: lx * sinA + ly * cosA
        });
      }

      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      ctx.lineTo(pts[1].x, pts[1].y);
      ctx.lineTo(pts[2].x, pts[2].y);
      ctx.lineTo(pts[3].x, pts[3].y);
      ctx.closePath();

      var bgGrad = ctx.createLinearGradient(pts[1].x, pts[1].y, pts[0].x, pts[0].y);
      bgGrad.addColorStop(0, 'rgba(46, 74, 26, 0.95)');
      bgGrad.addColorStop(1, 'rgba(16, 26, 11, 0.94)');
      ctx.fillStyle = bgGrad;
      ctx.fill();

      ctx.strokeStyle = rgba(0.88 + flashT * 0.12);
      ctx.lineWidth   = 1.6;
      ctx.stroke();

      ctx.fillStyle = ACCENT;
      ctx.beginPath();
      ctx.arc(pts[0].x, pts[0].y, 1.6, 0, Math.PI * 2);
      ctx.fill();
    });

    var rawDia2D = [
      [  chamfer,               rDiamond - chamfer * 0.5 ],
      [  rDiamond - chamfer * 0.5, chamfer ],
      [  rDiamond - chamfer * 0.5, -chamfer ],
      [  chamfer,              -(rDiamond - chamfer * 0.5) ],
      [ -chamfer,              -(rDiamond - chamfer * 0.5) ],
      [ -(rDiamond - chamfer * 0.5), -chamfer ],
      [ -(rDiamond - chamfer * 0.5),  chamfer ],
      [ -chamfer,               rDiamond - chamfer * 0.5 ]
    ];

    ctx.beginPath();
    ctx.moveTo(rawDia2D[0][0], rawDia2D[0][1]);
    for (var d = 1; d < 8; d++) {
      ctx.lineTo(rawDia2D[d][0], rawDia2D[d][1]);
    }
    ctx.closePath();

    ctx.arc(0, 0, rAperture, 0, Math.PI * 2, true);
    ctx.closePath();

    var diaGrad = ctx.createRadialGradient(0, 0, rAperture, 0, 0, rDiamond);
    diaGrad.addColorStop(0,    '#f2ff70');
    diaGrad.addColorStop(0.35, '#d4f53c');
    diaGrad.addColorStop(1,    '#b4db1f');
    ctx.fillStyle = diaGrad;
    ctx.fill('evenodd');

    ctx.beginPath();
    ctx.moveTo(rawDia2D[0][0], rawDia2D[0][1]);
    for (var od = 1; od < 8; od++) {
      ctx.lineTo(rawDia2D[od][0], rawDia2D[od][1]);
    }
    ctx.closePath();
    ctx.strokeStyle = '#f5ff85';
    ctx.lineWidth   = 1.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, rAperture, 0, Math.PI * 2);
    ctx.fillStyle = BG;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(0, 0, rAperture, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(14, 14, 14, 0.95)';
    ctx.lineWidth   = 1.6;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, rAperture, 0, Math.PI * 2);
    ctx.strokeStyle = rgba(0.45 + flashT * 0.40);
    ctx.lineWidth   = 0.9;
    ctx.stroke();

    var fusionT = 0;
    var fusionActive = false;

    if (cycleTime >= 600 && cycleTime < INFLOW_DURATION) {
      fusionActive = true;
      fusionT = (cycleTime - 600) / (INFLOW_DURATION - 600);
    } else if (cycleTime >= INFLOW_DURATION && cycleTime < INFLOW_DURATION + 600) {
      fusionActive = true;
      fusionT = 1 - (cycleTime - INFLOW_DURATION) / 600;
    }

    if (fusionActive && fusionT > 0.02) {
      var fPower = Math.pow(fusionT, 1.25);
      var fusionR = rAperture * (0.25 + fPower * 0.65);
      var fusionSpin = now * (0.003 + fPower * 0.015);

      var fGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, fusionR * 1.8);
      fGlow.addColorStop(0,   rgba(0.95 * fPower));
      fGlow.addColorStop(0.4, rgba(0.50 * fPower));
      fGlow.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.fillStyle = fGlow;
      ctx.beginPath();
      ctx.arc(0, 0, fusionR * 1.8, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.rotate(fusionSpin);
      for (var spi = 0; spi < 3; spi++) {
        var sAng = spi * (Math.PI * 2 / 3);
        ctx.beginPath();
        ctx.arc(0, 0, fusionR * 0.85, sAng, sAng + Math.PI * 0.42);
        ctx.strokeStyle = rgba(0.85 * fPower);
        ctx.lineWidth   = 1.0 + fPower * 1.2;
        ctx.stroke();
      }
      ctx.restore();

      var coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, fusionR * 0.55);
      coreGrad.addColorStop(0,   '#ffffff');
      coreGrad.addColorStop(0.4, ACCENT);
      coreGrad.addColorStop(1,   rgba(0.70 * fPower));
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(0, 0, fusionR * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  function drawTacticalFrame(w, h) {
    var pad = 24;
    var len = 18;
    ctx.strokeStyle = rgba(0.24);
    ctx.lineWidth   = 1.0;

    ctx.beginPath();
    ctx.moveTo(pad, pad + len); ctx.lineTo(pad, pad); ctx.lineTo(pad + len, pad);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(w - pad - len, pad); ctx.lineTo(w - pad, pad); ctx.lineTo(w - pad, pad + len);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(pad, h - pad - len); ctx.lineTo(pad, h - pad); ctx.lineTo(pad + len, h - pad);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(w - pad - len, h - pad); ctx.lineTo(w - pad, h - pad); ctx.lineTo(w - pad, h - pad - len);
    ctx.stroke();
  }

  function resize() {
    DPR             = Math.min(window.devicePixelRatio || 1, 2);
    W               = container.clientWidth;
    H               = container.clientHeight;
    canvas.width    = W * DPR;
    canvas.height   = H * DPR;
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    initNodes();
  }

  document.addEventListener('visibilitychange', function () {
    visible = !document.hidden;
    if (visible) lastTime = performance.now();
  });

  window.addEventListener('resize', resize);

  function render(now) {
    requestAnimationFrame(render);
    if (!visible) return;
    if (!lastTime) {
      lastTime = now;
      cycleStart = now;
    }
    lastTime = now;

    var cx = W / 2, cy = H / 2;
    var brandRadius = Math.min(W, H) * 0.12;
    var cycleTime = (now - cycleStart) % CYCLE_INTERVAL;

    if (cycleTime < 100) {
      if (blastFired) {
        blastFired = false;
        initChaosParticles();
      }
    }

    if (cycleTime >= INFLOW_DURATION && !blastFired) {
      blastFired = true;
      fireOrderedBlast(now);
    }

    var flashT = 0;
    for (var fi = scanFlashes.length - 1; fi >= 0; fi--) {
      var f  = scanFlashes[fi];
      var ft = (now - f.start) / f.duration;
      if (ft > 1) { scanFlashes.splice(fi, 1); continue; }
      var fVal = ft < 0.15 ? ft / 0.15 : easeOutCubic(1 - (ft - 0.15) / 0.85);
      if (fVal > flashT) flashT = fVal;
    }

    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);

    if (W >= 768) drawTacticalFrame(W, H);

    {
      var gR  = Math.min(W, H) * 0.65;
      var amb = ctx.createRadialGradient(cx, cy, 0, cx, cy, gR);
      amb.addColorStop(0,    rgba(0.040));
      amb.addColorStop(0.5,  rgba(0.010));
      amb.addColorStop(1,    'rgba(0,0,0,0)');
      ctx.fillStyle = amb;
      ctx.fillRect(0, 0, W, H);
    }

    {
      ctx.strokeStyle = 'rgba(255,255,255,0.014)';
      ctx.lineWidth   = 0.5;
      var step = 48;
      for (var gx = 0; gx <= W; gx += step) {
        ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke();
      }
      for (var gy = 0; gy <= H; gy += step) {
        ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
      }
    }

    var inflowPhase = cycleTime < INFLOW_DURATION;

    if (inflowPhase) {
      var pullProg     = clamp(cycleTime / INFLOW_DURATION, 0, 1);
      var pullFactor   = Math.pow(pullProg, 2.0) * 0.11;
      var latePhase    = cycleTime >= (INFLOW_DURATION - 450);
      var lateRatio    = latePhase ? (cycleTime - (INFLOW_DURATION - 450)) / 450 : 0;

      chaosParticles.forEach(function (p) {
        if (p.absorbed) return;

        var dx = cx - p.x;
        var dy = cy - p.y;
        var dist = Math.sqrt(dx * dx + dy * dy) || 1;

        var speedBoost = pullFactor * 5.5 + lateRatio * 8.5;
        p.vx += (dx / dist) * speedBoost;
        p.vy += (dy / dist) * speedBoost;
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.90;
        p.vy *= 0.90;

        if (dist < brandRadius * 0.28 || lateRatio >= 0.96) {
          p.absorbed = true;
          return;
        }

        var distRatio = clamp(dist / (Math.min(W, H) * 0.5), 0, 1);
        var pA = p.alpha * (0.3 + (1 - distRatio) * 0.65) * (1 - lateRatio * 0.65);
        ctx.fillStyle = rgba(clamp(pA, 0, 1));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    for (var wi = waves.length - 1; wi >= 0; wi--) {
      var w   = waves[wi];
      var age = now - w.start;
      if (age > w.duration) { waves.splice(wi, 1); continue; }
      var t       = age / w.duration;
      var r       = t * w.maxRadius;
      var alpha   = (1 - t) * 0.25;
      ctx.strokeStyle = rgba(alpha);
      ctx.lineWidth   = 1.5 * (1 - t * 0.5);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    nodes.forEach(function (node) {
      var sigBoost = 0;
      for (var si = 0; si < signals.length; si++) {
        if (signals[si].node === node) {
          var st = (now - signals[si].start) / signals[si].duration;
          if (st >= 0 && st <= 1) {
            sigBoost = Math.sin(st * Math.PI);
          }
          break;
        }
      }

      var lineG = ctx.createLinearGradient(cx, cy, node.x, node.y);
      lineG.addColorStop(0,   rgba(0.25 + sigBoost * 0.60));
      lineG.addColorStop(0.6, rgba(0.12 + sigBoost * 0.45));
      lineG.addColorStop(1,   rgba(0.08 + sigBoost * 0.35));

      ctx.strokeStyle = lineG;
      ctx.lineWidth   = 1.0 + sigBoost * 0.8;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(node.x, node.y);
      ctx.stroke();
    });

    for (var si = signals.length - 1; si >= 0; si--) {
      var s   = signals[si];
      var sAge = now - s.start;
      if (sAge > s.duration) { signals.splice(si, 1); continue; }

      var st = sAge / s.duration;
      var dotProg = easeOutCubic(st);
      var dotX    = cx + (s.node.x - cx) * dotProg;
      var dotY    = cy + (s.node.y - cy) * dotProg;
      var dotR    = 3.2;
      var pulseA  = Math.sin(st * Math.PI);

      var dgMajor = ctx.createRadialGradient(dotX, dotY, 0, dotX, dotY, 14);
      dgMajor.addColorStop(0,   rgba(pulseA * 0.85));
      dgMajor.addColorStop(0.5, rgba(pulseA * 0.35));
      dgMajor.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.fillStyle = dgMajor;
      ctx.beginPath(); ctx.arc(dotX, dotY, 14, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = ACCENT;
      ctx.beginPath(); ctx.arc(dotX, dotY, dotR, 0, Math.PI * 2); ctx.fill();

      if (st >= 0.50 && !s.node._signalDone) {
        s.node.flareAt = now;
        s.node._signalDone = true;
      }
    }

    drawBrandEmblem(cx, cy, brandRadius, now, flashT, cycleTime);

    nodes.forEach(function (node, nIdx) {
      var nowFlare = node.flareAt ? now - node.flareAt : 0;
      var flaring  = node.flareAt && nowFlare < 2400;

      var flareAlpha = 0;
      if (flaring) {
        var ft = nowFlare / 2400;
        flareAlpha = Math.sin(ft * Math.PI) * 0.70;
      }

      var ringSpin = now * 0.0009 + nIdx * 1.2;

      ctx.beginPath();
      ctx.arc(node.x, node.y, 16, 0, Math.PI * 2);
      ctx.strokeStyle = rgba(0.30 + flareAlpha * 0.40);
      ctx.lineWidth   = 0.9;
      ctx.stroke();

      ctx.save();
      ctx.translate(node.x, node.y);
      ctx.rotate(ringSpin);
      ctx.beginPath();
      ctx.arc(0, 0, 24, 0, Math.PI * 0.65);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 24, Math.PI, Math.PI * 1.65);
      ctx.strokeStyle = rgba(0.35 + flareAlpha * 0.45);
      ctx.lineWidth   = 1.0;
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.translate(node.x, node.y);
      ctx.rotate(-ringSpin * 0.8);
      ctx.beginPath();
      ctx.arc(0, 0, 32, 0, Math.PI * 0.45);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 32, Math.PI, Math.PI * 1.45);
      ctx.strokeStyle = rgba(0.20 + flareAlpha * 0.35);
      ctx.lineWidth   = 0.75;
      ctx.stroke();

      for (var t = 0; t < 4; t++) {
        var tickAng = t * (Math.PI / 2);
        var tCos = Math.cos(tickAng), tSin = Math.sin(tickAng);
        ctx.beginPath();
        ctx.moveTo(tCos * 30, tSin * 30);
        ctx.lineTo(tCos * 34, tSin * 34);
        ctx.strokeStyle = rgba(0.35 + flareAlpha * 0.3);
        ctx.lineWidth   = 0.75;
        ctx.stroke();
      }
      ctx.restore();

      if (flaring) {
        var rippleFt = nowFlare / 2400;
        var ripR = 16 + rippleFt * 32;
        var ripA = (1 - rippleFt) * 0.55;
        ctx.beginPath();
        ctx.arc(node.x, node.y, ripR, 0, Math.PI * 2);
        ctx.strokeStyle = rgba(ripA);
        ctx.lineWidth   = 1.0;
        ctx.stroke();
      }

      var outerR = 7.5;
      var innerR = 3.6;

      var dotGlowR = outerR * (2.8 + flareAlpha * 1.5);
      var dg = ctx.createRadialGradient(node.x, node.y, innerR, node.x, node.y, dotGlowR);
      dg.addColorStop(0,   rgba(0.70 + flareAlpha * 0.30));
      dg.addColorStop(0.4, rgba(0.25 + flareAlpha * 0.20));
      dg.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.fillStyle = dg;
      ctx.beginPath();
      ctx.arc(node.x, node.y, dotGlowR, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(node.x, node.y, outerR, 0, Math.PI * 2, false);
      ctx.arc(node.x, node.y, innerR, 0, Math.PI * 2, true);
      ctx.fillStyle = ACCENT;
      ctx.fill('evenodd');

      ctx.beginPath();
      ctx.arc(node.x, node.y, outerR, 0, Math.PI * 2);
      ctx.strokeStyle = ACCENT;
      ctx.lineWidth   = 1.0;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(node.x, node.y, innerR, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(14, 14, 14, 0.95)';
      ctx.lineWidth   = 0.9;
      ctx.stroke();

      ctx.save();
      ctx.font = '700 ' + Math.max(9, 11.5 * (node._scale || 1)).toFixed(1) + 'px "Space Grotesk", "Inter", -apple-system, sans-serif';
      ctx.textAlign = node.align;
      ctx.textBaseline = 'middle';

      var textX = node.x + node.offsetX;
      var textY = node.y + node.offsetY;

      var estW = ctx.measureText(node.title).width;
      var pad = 8;
      if (node.align === 'left') {
        if (textX + estW + pad > W) textX = W - estW - pad;
        if (textX < pad) textX = pad;
      } else if (node.align === 'right') {
        if (textX - estW - pad < 0) textX = estW + pad;
        if (textX > W - pad) textX = W - pad;
      } else {
        if (textX - estW / 2 - pad < 0) textX = estW / 2 + pad;
        if (textX + estW / 2 + pad > W) textX = W - estW / 2 - pad;
      }
      if (textY < 12) textY = 12;
      if (textY > H - 12) textY = H - 12;

      ctx.fillStyle = 'rgba(10, 14, 8, 0.92)';
      var textMetrics = ctx.measureText(node.title);
      var padH = 6, padV = 3;
      var bgLeft = textX - padH;
      if (node.align === 'right') {
        bgLeft = textX - textMetrics.width - padH;
      } else if (node.align === 'center') {
        bgLeft = textX - (textMetrics.width / 2) - padH;
      }
      ctx.fillRect(bgLeft, textY - 8, textMetrics.width + padH * 2, 16);

      ctx.fillStyle = ACCENT;
      ctx.shadowColor = flaring ? ACCENT : 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = flaring ? 12 : 2;
      ctx.fillText(node.title, textX, textY);

      ctx.restore();
    });
  }

  resize();
  requestAnimationFrame(render);
})();

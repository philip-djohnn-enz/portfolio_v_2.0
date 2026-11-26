/**
 * CHORN PHILIP PORTFOLIO — 3-D ANIMATED BACKGROUND (WebGL, three.js r128)
 *
 * Upgrades the 2-D canvas scenes in scenes.js to real 3-D, lit and shaded, with glowing edges in the
 * site's cyan / amber / purple palette. The three scenes sit side by side in one world and the camera
 * flies between them when the specialty switch changes; it also drifts slowly and follows the mouse.
 *
 *   0  MEP        — building rising storey by storey (columns → formwork → slab pour → ducts) with
 *                   welding sparks and a warm work light; AHU with a spinning fan and duct airflow;
 *                   a slewing tower crane that shuttles duct sections between stockpiles. The load is
 *                   a 2-axis pendulum driven by the slew/trolley acceleration (it sways and settles).
 *   1  ROBOTICS   — closed-loop electronics assembly line: 12 fixture carriers circulate over/under
 *                   (top lane → drop elevator → return lane → lift elevator) and index in sync while six
 *                   stations work in parallel — robot load (gripper), PCB insert (vacuum), XYZ screwdriving
 *                   gantry, lid place (vacuum), laser seam weld with sparks, vision QC arch, robot unload
 *                   onto two mecanum AGVs that swap at the dock; quadcopters and a PCB backdrop.
 *   2  STEM       — spherical pendulum (precessing orbit, RK4), a ball that bounces with restitution,
 *                   a 3-D atom, a two-source wave-interference surface, a unit circle generating a sine
 *                   wave, Fourier epicycles drawing a heart / star, a live Lorenz attractor, a golden-angle
 *                   phyllotaxis spiral, Platonic solids / trefoil knot / Möbius strip flying round the
 *                   stage with trails, and math symbols (π Σ ∫ √ ∞ … e^iπ+1=0) swooping past the viewer.
 *
 * Falls back to the 2-D version (scenes.js) when three.js did not load, WebGL is unavailable,
 * or the visitor prefers reduced motion. Same API: BgScenes.init(), BgScenes.setScene(0|1|2).
 */
(function () {
    'use strict';

    var fallback = window.BgScenes;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hasWebGL() {
        try {
            var c = document.createElement('canvas');
            return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')));
        } catch (e) { return false; }
    }
    if (!window.THREE || !fallback || reduce || !hasWebGL()) return;   // keep the 2-D version
    var T = window.THREE;

    var COL = {
        cyan: 0x00f2fe, blue: 0x38bdf8, amber: 0xf59e0b, orange: 0xfb923c, purple: 0xa855f7,
        violet: 0xc4b5fd, green: 0x10b981, red: 0xef4444, white: 0xe2e8f0
    };
    var BG = 0x07090f;

    /* ------------------------------------------------------------------ */
    /* Small maths helpers                                                */
    /* ------------------------------------------------------------------ */
    function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
    function rand(a, b) { return a + Math.random() * (b - a); }
    function smooth(k) { k = clamp(k, 0, 1); return k * k * k * (k * (k * 6 - 15) + 10); }
    function hex(c) { return '#' + ('000000' + c.toString(16)).slice(-6); }
    function noise(x, s) { s = s || 0; return (Math.sin(x * 1.31 + s) + Math.sin(x * 2.17 + s * 1.7) * 0.6 + Math.sin(x * 3.73 + s * 2.3) * 0.3) / 1.9; }
    function wrapAngle(target, current) {
        while (target - current > Math.PI) target -= Math.PI * 2;
        while (target - current < -Math.PI) target += Math.PI * 2;
        return target;
    }

    /* Trapezoidal motion profile (speed- and acceleration-limited) — how real servo axes move. */
    function approach1(o, target, dt, vmax, amax, eps) {
        eps = eps || 0.02;
        var d = target - o.x;
        var vd = (d > 0 ? 1 : -1) * Math.min(vmax, Math.sqrt(2 * amax * Math.abs(d)));
        var dv = clamp(vd - o.v, -amax * dt, amax * dt);
        o.a = dt ? dv / dt : 0;
        o.v += dv; o.x += o.v * dt;
        // settle: close enough and slow, or we just stepped across the target at low speed (big frame steps)
        var crossed = (d > 0) !== (target - o.x > 0) && Math.abs(o.v) < amax * dt * 2;
        if ((Math.abs(target - o.x) < eps && Math.abs(o.v) < amax * 0.05) || crossed) { o.x = target; o.v = 0; o.a = 0; return true; }
        return false;
    }
    /* Straight-line 3-D move with a feed-forward velocity so a tool can follow a moving target. */
    function approach3(o, tx, ty, tz, dt, vmax, amax, fx, fy, fz) {
        fx = fx || 0; fy = fy || 0; fz = fz || 0;
        var dx = tx - o.x, dy = ty - o.y, dz = tz - o.z, d = Math.sqrt(dx * dx + dy * dy + dz * dz);
        var sp = Math.min(vmax, Math.sqrt(2 * amax * d)), inv = d > 1e-6 ? sp / d : 0;
        var ax = fx + dx * inv - o.vx, ay = fy + dy * inv - o.vy, az = fz + dz * inv - o.vz;
        var am = Math.sqrt(ax * ax + ay * ay + az * az), lim = amax * dt;
        if (am > lim) { var s = lim / am; ax *= s; ay *= s; az *= s; }
        o.vx += ax; o.vy += ay; o.vz += az;
        o.x += o.vx * dt; o.y += o.vy * dt; o.z += o.vz * dt;
        var rx = o.vx - fx, ry = o.vy - fy, rz = o.vz - fz;
        return d < 0.05 && Math.sqrt(rx * rx + ry * ry + rz * rz) < amax * 0.06;
    }

    /* ------------------------------------------------------------------ */
    /* Material kit: every scene registers its materials so it can fade    */
    /* ------------------------------------------------------------------ */
    function Kit() { this.mats = []; this.cache = {}; this.alpha = 1; this.lights = []; }
    Kit.prototype.add = function (m) {
        m.transparent = true; m.userData.base = m.opacity; m.opacity = m.userData.base * this.alpha;
        this.mats.push(m); return m;
    };
    Kit.prototype.op = function (m, v) { m.userData.base = v; m.opacity = v * this.alpha; };
    Kit.prototype.light = function (l) { l.userData.base = l.intensity; this.lights.push(l); return l; };
    Kit.prototype.lightI = function (l, v) { l.userData.base = v; l.intensity = v * this.alpha; };
    Kit.prototype.setAlpha = function (a) {
        this.alpha = a;
        for (var i = 0; i < this.mats.length; i++) this.mats[i].opacity = this.mats[i].userData.base * a;
        for (var j = 0; j < this.lights.length; j++) this.lights[j].intensity = this.lights[j].userData.base * a;
    };
    Kit.prototype.solid = function (col, op, emi, metal) {
        var k = 's' + col + '|' + op + '|' + emi + '|' + metal;
        return this.cache[k] || (this.cache[k] = this.add(new T.MeshStandardMaterial({
            color: col, emissive: col, emissiveIntensity: emi == null ? 0.18 : emi,
            metalness: metal == null ? 0.35 : metal, roughness: 0.42, opacity: op == null ? 0.92 : op
        })));
    };
    Kit.prototype.glass = function (col, op, additive) {
        var k = 'g' + col + '|' + op + '|' + !!additive;
        return this.cache[k] || (this.cache[k] = this.add(new T.MeshBasicMaterial({
            color: col, opacity: op, depthWrite: false, side: T.DoubleSide,
            blending: additive ? T.AdditiveBlending : T.NormalBlending
        })));
    };
    Kit.prototype.line = function (col, op, additive) {
        var k = 'l' + col + '|' + op + '|' + !!additive;
        return this.cache[k] || (this.cache[k] = this.add(new T.LineBasicMaterial({
            color: col, opacity: op, blending: additive ? T.AdditiveBlending : T.NormalBlending
        })));
    };

    /* Spring-back offset for things the visitor grabs and throws */
    function Spring(k, c) { this.o = new T.Vector3(); this.v = new T.Vector3(); this.held = false; this.k = k || 4; this.c = c || 1.5; }
    Spring.prototype.step = function (dt) {
        if (this.held || !dt) return;
        this.v.addScaledVector(this.o, -this.k * dt).multiplyScalar(Math.exp(-this.c * dt));
        this.o.addScaledVector(this.v, dt);
    };
    function springPick(sp, base, r, onRelease) {
        return {
            r: r, pos: function (out) { return out.copy(base).add(sp.o); },
            grab: function () { sp.held = true; sp.v.set(0, 0, 0); },
            drag: function (pt) { sp.o.copy(pt).sub(base); },
            release: function (vel) { sp.held = false; sp.v.copy(vel).clampLength(0, 30); if (onRelease) onRelease(vel); }
        };
    }
    function spinPick(center, r, S, k) {                  // drag sideways to spin, flick to keep it spinning
        var last = new T.Vector3();
        return {
            r: r, pos: function (out) { return out.copy(center); },
            grab: function (pt) { last.copy(pt); S.spin = 0; },
            drag: function (pt) { S.rot += (pt.x - last.x) * (k || 0.3); last.copy(pt); },
            release: function (vel) { S.spin = clamp(vel.x * (k || 0.3) * 0.5, -6, 6); }
        };
    }

    function edgesOf(geo) { return geo.userData.edges || (geo.userData.edges = new T.EdgesGeometry(geo, 25)); }
    function meshE(geo, mat, lineMat) {
        var m = new T.Mesh(geo, mat);
        if (lineMat) m.add(new T.LineSegments(edgesOf(geo), lineMat));
        return m;
    }
    function lines(pts, mat) {
        var g = new T.BufferGeometry();
        g.setAttribute('position', new T.Float32BufferAttribute(pts, 3));
        return new T.LineSegments(g, mat);
    }
    function dynLine(n, mat, segments, colors) {
        var g = new T.BufferGeometry();
        var a = new T.BufferAttribute(new Float32Array(n * 3), 3); a.setUsage(T.DynamicDrawUsage);
        g.setAttribute('position', a);
        if (colors) { var c = new T.BufferAttribute(new Float32Array(n * 3), 3); c.setUsage(T.DynamicDrawUsage); g.setAttribute('color', c); }
        var l = segments ? new T.LineSegments(g, mat) : new T.Line(g, mat);
        l.frustumCulled = false;
        return l;
    }
    function fadeLineMat(kit) {
        return kit.add(new T.LineBasicMaterial({ vertexColors: true, blending: T.AdditiveBlending, depthWrite: false, opacity: 1 }));
    }

    var glowTex = (function () {
        var c = document.createElement('canvas'); c.width = c.height = 64;
        var x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
        gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.22, 'rgba(255,255,255,0.65)');
        gr.addColorStop(0.55, 'rgba(255,255,255,0.15)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
        x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
        return new T.CanvasTexture(c);
    })();
    function glowSprite(kit, col, size, op) {
        var s = new T.Sprite(kit.add(new T.SpriteMaterial({ map: glowTex, color: col, blending: T.AdditiveBlending, depthWrite: false, opacity: op })));
        s.scale.set(size, size, 1);
        return s;
    }
    /* Particle cloud with per-particle colour (additive, so black = invisible) */
    function particles(kit, n, size) {
        var g = new T.BufferGeometry();
        var pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
        var pa = new T.BufferAttribute(pos, 3), ca = new T.BufferAttribute(col, 3);
        pa.setUsage(T.DynamicDrawUsage); ca.setUsage(T.DynamicDrawUsage);
        g.setAttribute('position', pa); g.setAttribute('color', ca);
        var m = kit.add(new T.PointsMaterial({ size: size, map: glowTex, vertexColors: true, blending: T.AdditiveBlending, depthWrite: false, opacity: 1 }));
        var p = new T.Points(g, m); p.frustumCulled = false;
        return {
            obj: p, n: n,
            set: function (i, x, y, z, c, k) {
                pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
                col[i * 3] = c.r * k; col[i * 3 + 1] = c.g * k; col[i * 3 + 2] = c.b * k;
            },
            hide: function (i) { col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = 0; },
            flush: function () { pa.needsUpdate = true; ca.needsUpdate = true; }
        };
    }

    /* Text label that always faces the camera; redraws only when its text changes */
    function Label(kit, col, h, align) {
        this.c = document.createElement('canvas'); this.c.width = 768; this.c.height = 72;
        this.x = this.c.getContext('2d'); this.col = hex(col); this.text = null; this.align = align || 'center';
        this.tex = new T.CanvasTexture(this.c); this.tex.minFilter = T.LinearFilter;
        this.sprite = new T.Sprite(kit.add(new T.SpriteMaterial({ map: this.tex, depthWrite: false, opacity: 0.92 })));
        this.sprite.scale.set(h * 768 / 72, h, 1);
        if (this.align === 'left') this.sprite.center.set(0, 0.5);
    }
    Label.prototype.set = function (txt) {
        if (txt === this.text) return;
        this.text = txt;
        var x = this.x;
        x.clearRect(0, 0, 768, 72);
        x.font = '500 34px "JetBrains Mono", Consolas, monospace';
        x.textBaseline = 'middle'; x.textAlign = this.align;
        x.shadowColor = this.col; x.shadowBlur = 10; x.fillStyle = this.col;
        x.fillText(txt, this.align === 'left' ? 6 : 384, 38);
        this.tex.needsUpdate = true;
    };

    var t = 0, tick = false, mobile = false;
    var _c = new T.Color();

    /* ================================================================== */
    /* SCENE 0 — MEP CONSTRUCTION SITE                                    */
    /* ================================================================== */
    function buildMEP() {
        var kit = new Kit(), g = new T.Group();
        var grid = new T.GridHelper(130, 65); grid.material = kit.add(new T.LineBasicMaterial({ color: COL.cyan, opacity: 0.08 })); g.add(grid);

        /* --- Building --- */
        var BX = -17, BZ = -2, B = 8, FH = 3, MAXF = 8, FLOOR_T = 2.4, SW = B + 0.8;
        var colGeo = new T.BoxGeometry(0.5, FH, 0.5); colGeo.translate(0, FH / 2, 0);
        var slabGeo = new T.BoxGeometry(SW, 0.3, SW); slabGeo.translate(SW / 2, 0, 0);
        var formGeo = new T.BoxGeometry(SW, 0.45, SW);
        var DL = B * 0.72;
        var ductGeo = new T.BoxGeometry(DL, 0.55, 0.85); ductGeo.translate(DL / 2, 0, 0);
        var mCol = kit.solid(0x3b4a61, 0.94, 0.12), lCol = kit.line(COL.cyan, 0.55);
        var mWet = kit.solid(0xb6c2d1, 0.92, 0.3), mSlab = kit.solid(0x4b5a70, 0.92, 0.12), lSlab = kit.line(COL.cyan, 0.7);
        var lForm = kit.line(COL.amber, 0.85), lShore = kit.line(COL.amber, 0.3);
        var mDuct = kit.glass(COL.blue, 0.22), lDuct = kit.line(COL.blue, 0.85);
        var floors = [];
        for (var f = 0; f < MAXF; f++) {
            var fl = { cols: [], mk: 0 };
            for (var i = -1; i <= 1; i++) for (var j = -1; j <= 1; j++) {
                var c = meshE(colGeo, mCol, lCol);
                c.position.set(BX + i * B / 2, f * FH, BZ + j * B / 2); c.visible = false; g.add(c); fl.cols.push(c);
            }
            fl.slab = meshE(slabGeo, mWet, lSlab); fl.slab.position.set(BX - SW / 2, (f + 1) * FH, BZ); fl.slab.visible = false; g.add(fl.slab);
            fl.form = new T.LineSegments(edgesOf(formGeo), lForm); fl.form.position.set(BX, (f + 1) * FH - 0.3, BZ); fl.form.visible = false; g.add(fl.form);
            var sp = [];
            for (var s1 = 0; s1 < 4; s1++) for (var s2 = 0; s2 < 4; s2++) {
                var px = BX - B / 2 + (s1 + 0.5) * B / 4, pz = BZ - B / 2 + (s2 + 0.5) * B / 4;
                sp.push(px, f * FH, pz, px, (f + 1) * FH - 0.5, pz);
            }
            fl.shore = lines(sp, lShore); fl.shore.visible = false; g.add(fl.shore);
            fl.duct = meshE(ductGeo, mDuct, lDuct); fl.duct.position.set(BX - DL / 2, (f + 1) * FH - 0.65, BZ + B / 2 - 1.1); fl.duct.visible = false; g.add(fl.duct);
            floors.push(fl);
        }
        // risers: chilled water supply / return + LV power
        var rGeo = new T.CylinderGeometry(0.16, 0.16, 1, 10); rGeo.translate(0, 0.5, 0);
        var RZ = BZ + B / 2 - 0.6;
        var risers = [[COL.blue, 0], [COL.green, 0.45], [COL.amber, 0.9]].map(function (r) {
            var m = new T.Mesh(rGeo, kit.solid(r[0], 0.9, 0.45)); m.position.set(BX + B / 2 - 1.5 + r[1], 0, RZ); m.visible = false; g.add(m); return m;
        });
        var floorLbl = new Label(kit, COL.amber, 0.95); g.add(floorLbl.sprite);

        // welding: sparks + flickering warm light
        var SPK = particles(kit, 260, 0.35); g.add(SPK.obj);
        var sparks = [], nextBurst = 3;
        var weldGlow = glowSprite(kit, 0xffd9a0, 3.2, 0); g.add(weldGlow);
        var weldLight = kit.light(new T.PointLight(0xff9a40, 0, 16, 2)); g.add(weldLight);

        /* --- AHU with fan + supply duct --- */
        var AX = -6, AZ = 4;
        var ahu = meshE(new T.BoxGeometry(3.4, 2.6, 2.6), kit.solid(0x1e293b, 0.96, 0.08), kit.line(COL.cyan, 0.8));
        ahu.position.set(AX, 1.3, AZ); g.add(ahu);
        var fanPos = new T.Vector3(AX - 0.55, 1.3, AZ + 1.33);
        var ring = new T.Mesh(new T.TorusGeometry(0.98, 0.07, 8, 40), kit.solid(COL.cyan, 0.95, 0.5)); ring.position.copy(fanPos); g.add(ring);
        var fan = new T.Group(); fan.position.copy(fanPos); g.add(fan);
        var bladeGeo = new T.BoxGeometry(0.82, 0.3, 0.04); bladeGeo.translate(0.5, 0, 0);
        var mBlade = kit.solid(COL.cyan, 0.9, 0.35, 0.6);
        for (var b = 0; b < 5; b++) {
            var piv = new T.Group(); piv.rotation.z = b * Math.PI * 2 / 5;
            var bl = new T.Mesh(bladeGeo, mBlade); bl.rotation.x = 0.45; piv.add(bl); fan.add(piv);
        }
        fan.add(new T.Mesh(new T.SphereGeometry(0.16, 12, 8), kit.solid(COL.white, 0.95, 0.3)));
        var blurMat = kit.add(new T.MeshBasicMaterial({ color: COL.cyan, opacity: 0, depthWrite: false, side: T.DoubleSide }));
        var blur = new T.Mesh(new T.CircleGeometry(0.93, 40), blurMat); blur.position.copy(fanPos); blur.position.z += 0.03; g.add(blur);
        var fins = [];
        for (var k = 0; k < 8; k++) { var fx = AX + 0.55 + k * 0.14; fins.push(fx, 0.3, AZ + 1.31, fx, 2.3, AZ + 1.31); }
        g.add(lines(fins, kit.line(COL.blue, 0.5)));
        var ahuLbl = new Label(kit, COL.cyan, 0.75); ahuLbl.sprite.position.set(AX, 3.5, AZ); g.add(ahuLbl.sprite);
        var DX0 = AX + 1.7, DX1 = 7.5, DY = 1.85;
        var sDuct = meshE(new T.BoxGeometry(DX1 - DX0, 0.9, 0.9), kit.glass(COL.blue, 0.2), kit.line(COL.blue, 0.85));
        sDuct.position.set((DX0 + DX1) / 2, DY, AZ); g.add(sDuct);
        var fl2 = [];
        for (var x = DX0 + 2.4; x < DX1; x += 2.4) {
            var h = 0.52;
            fl2.push(x, DY - h, AZ - h, x, DY + h, AZ - h, x, DY + h, AZ - h, x, DY + h, AZ + h, x, DY + h, AZ + h, x, DY - h, AZ + h, x, DY - h, AZ + h, x, DY - h, AZ - h);
        }
        g.add(lines(fl2, kit.line(COL.blue, 0.9)));   // flanges
        var FLOW = particles(kit, MAXF * 6 + 26, 0.28); g.add(FLOW.obj);
        var RISE = particles(kit, 24, 0.3); g.add(RISE.obj);
        var cCyan = new T.Color(COL.cyan), cBlue = new T.Color(COL.blue), cGreen = new T.Color(COL.green), cAmber = new T.Color(COL.amber);
        var fanW = 0;

        /* --- Tower crane --- */
        var MX = 10, MZ = -4, MH = 24, JL = 24, PIVY = MH - 0.45, SL = 1.6, LH = 0.8, LW = 4, LMIN = 4;
        var mp = [], hw = 0.8, cs = [[-hw, -hw], [hw, -hw], [hw, hw], [-hw, hw]];
        for (var y = 0; y < MH; y += 2) {
            var y2 = Math.min(MH, y + 2);
            for (var q = 0; q < 4; q++) {
                var a = cs[q], bb = cs[(q + 1) % 4];
                mp.push(a[0], y, a[1], a[0], y2, a[1]);
                mp.push(a[0], y2, a[1], bb[0], y2, bb[1]);
                if ((y / 2 + q) % 2 === 0) mp.push(a[0], y, a[1], bb[0], y2, bb[1]); else mp.push(bb[0], y, bb[1], a[0], y2, a[1]);
            }
        }
        var mast = lines(mp, kit.line(COL.amber, 0.85)); mast.position.set(MX, 0, MZ); g.add(mast);
        var foot = meshE(new T.BoxGeometry(3.2, 0.6, 3.2), kit.solid(0x475569, 0.95, 0.08), kit.line(COL.amber, 0.5)); foot.position.set(MX, 0.3, MZ); g.add(foot);
        var slew = new T.Group(); slew.position.set(MX, MH, MZ); g.add(slew);
        var jp = [], st = 1.5;
        for (var jx = 1.0; jx > -JL + 0.01; jx -= st) {
            var jx2 = Math.max(-JL, jx - st);
            jp.push(jx, 0, -0.6, jx2, 0, -0.6, jx, 0, 0.6, jx2, 0, 0.6, jx, 1.5, 0, jx2, 1.5, 0);
            jp.push(jx, 0, -0.6, jx, 0, 0.6, jx, 0, -0.6, jx, 1.5, 0, jx, 0, 0.6, jx, 1.5, 0);
            jp.push(jx, 0, -0.6, jx2, 1.5, 0, jx, 0, 0.6, jx2, 1.5, 0);
        }
        jp.push(-JL, 0, -0.6, -JL, 0, 0.6, -JL, 0, -0.6, -JL, 1.5, 0, -JL, 0, 0.6, -JL, 1.5, 0);
        for (var cx2 = 1.0; cx2 < 8; cx2 += 1.75) {                       // counter-jib
            var cx3 = Math.min(8, cx2 + 1.75);
            jp.push(cx2, 0, -0.6, cx3, 0, -0.6, cx2, 0, 0.6, cx3, 0, 0.6, cx2, 0, -0.6, cx3, 0, 0.6, cx3, 0, -0.6, cx3, 0, 0.6);
        }
        [[-0.8, -0.8], [0.8, -0.8], [0.8, 0.8], [-0.8, 0.8]].forEach(function (p) { jp.push(p[0], 0, p[1], 0, 6, 0); });  // A-frame
        jp.push(0, 6, 0, -JL * 0.55, 1.5, 0, 0, 6, 0, -JL * 0.92, 1.5, 0, 0, 6, 0, 7.6, 0.2, 0);                    // ties
        slew.add(lines(jp, kit.line(COL.amber, 0.85)));
        var walk = new T.Mesh(new T.BoxGeometry(JL + 9, 0.08, 1.2), kit.solid(COL.amber, 0.35, 0.3)); walk.position.set(-(JL - 8) / 2 + 0.5, 0, 0); slew.add(walk);
        var cw = meshE(new T.BoxGeometry(2.2, 1.8, 1.8), kit.solid(0x5b6678, 0.96, 0.08), kit.line(COL.amber, 0.6)); cw.position.set(6.6, -0.9, 0); slew.add(cw);
        var cab = meshE(new T.BoxGeometry(1.5, 1.3, 1.5), kit.glass(COL.cyan, 0.2), kit.line(COL.cyan, 0.9)); cab.position.set(1.5, -0.8, 1.5); slew.add(cab);
        var avLight = glowSprite(kit, COL.red, 3, 0.2); avLight.position.set(0, 6.3, 0); slew.add(avLight);
        var trolley = meshE(new T.BoxGeometry(1.1, 0.35, 1.3), kit.solid(COL.amber, 0.95, 0.3), kit.line(COL.white, 0.4)); trolley.position.y = -0.25; slew.add(trolley);
        var craneLbl = new Label(kit, COL.amber, 0.9); craneLbl.sprite.position.set(-7, 3.4, 0); slew.add(craneLbl.sprite);

        var loadGeo = new T.BoxGeometry(LW, LH, 0.9);
        var mLoad = kit.solid(0x2b6f99, 0.94, 0.3), lLoad = kit.line(COL.blue, 0.95);
        var hookG = new T.Group(); g.add(hookG);
        hookG.add(new T.Mesh(new T.BoxGeometry(0.5, 0.6, 0.35), kit.solid(COL.amber, 0.96, 0.3)));
        var hookC = new T.Mesh(new T.TorusGeometry(0.22, 0.05, 6, 16, Math.PI), kit.solid(COL.amber, 0.96, 0.3)); hookC.rotation.z = Math.PI; hookC.position.y = -0.45; hookG.add(hookC);
        var load = meshE(loadGeo, mLoad, lLoad); load.position.y = -SL - LH / 2; hookG.add(load);
        var slings = lines([0, -0.5, 0, -LW / 2 + 0.2, -SL, -0.4, 0, -0.5, 0, -LW / 2 + 0.2, -SL, 0.4,
            0, -0.5, 0, LW / 2 - 0.2, -SL, -0.4, 0, -0.5, 0, LW / 2 - 0.2, -SL, 0.4], kit.line(COL.white, 0.55));
        hookG.add(slings);
        var ropes = dynLine(4, kit.line(COL.white, 0.6), true); g.add(ropes);
        var shadowMat = kit.add(new T.MeshBasicMaterial({ color: 0x000000, opacity: 0.3, depthWrite: false }));
        var shadow = new T.Mesh(new T.PlaneGeometry(LW, 1.1), shadowMat); shadow.rotation.x = -Math.PI / 2; g.add(shadow);

        function pileAt(px2, pz2) { var dx = px2 - MX, dz = pz2 - MZ; return { x: px2, z: pz2, psi: Math.atan2(dz, -dx), r: Math.hypot(dx, dz), n: 0, meshes: [] }; }
        var PA = pileAt(16, 5), PB = pileAt(-2, 8); PA.n = 4;
        [PA, PB].forEach(function (p) {
            for (var i2 = 0; i2 < 5; i2++) {
                var m = meshE(loadGeo, mLoad, lLoad); m.position.set(p.x, LH / 2 + i2 * LH, p.z); m.rotation.y = p.psi; m.visible = false; g.add(m); p.meshes.push(m);
            }
        });
        var cr = { psi: { x: PA.psi, v: 0, a: 0 }, r: { x: PA.r, v: 0, a: 0 }, L: { x: LMIN, v: 0, a: 0 },
            sx: 0, sz: 0, wx: 0, wz: 0, st: 'goSrc', tm: 0, has: false, fromA: true };
        var qY = new T.Quaternion(), qT = new T.Quaternion(), eT = new T.Euler(), UP = new T.Vector3(0, 1, 0);
        var t0 = 0;


        /* ================= SITE LIFE: lighting, A/C, fire protection, traffic, plant, people ================= */
        var TAU = Math.PI * 2, FRONT = BZ + B / 2, ROOFY = MAXF * FH + 0.15, ROADZ = 12.1;
        var LANE = { E: ROADZ - 1.0, W: ROADZ + 1.0 };
        var cWarm = new T.Color(0xffe2a8), cRed = new T.Color(COL.red), cWater = new T.Color(0xa5e4ff), cSmoke = new T.Color(0x5b6474),
            cFire = new T.Color(0xff7a2a), cSoil = new T.Color(0xb07a45), cCold = new T.Color(0x7fdcff), cHeat = new T.Color(0xffa45c);
        var mRed = kit.solid(COL.red, 0.95, 0.45, 0.4), lRed = kit.line(COL.red, 0.9), mWhite = kit.solid(0xe5e7eb, 0.96, 0.25, 0.3);
        var mDarkS = kit.solid(0x111827, 0.96, 0.1), mGrey = kit.solid(0x475569, 0.95, 0.1), lCyanS = kit.line(COL.cyan, 0.5), lAmberS = kit.line(COL.amber, 0.45);
        function addMat(col, op, additive) {      // un-cached material, so it can be faded on its own
            return kit.add(new T.MeshBasicMaterial({ color: col, opacity: op, transparent: true, depthWrite: false, side: T.DoubleSide, blending: additive ? T.AdditiveBlending : T.NormalBlending }));
        }

        /* --- extra risers: fire water (red) + refrigerant (copper) --- */
        var fireRiser = new T.Mesh(rGeo, kit.solid(COL.red, 0.92, 0.5)); fireRiser.position.set(BX + B / 2 - 2.0, 0, RZ); fireRiser.visible = false; g.add(fireRiser);
        var refRiser = new T.Mesh(rGeo, kit.solid(0xc77d43, 0.92, 0.35, 0.8)); refRiser.position.set(BX + B / 2 - 2.45, 0, RZ); refRiser.visible = false; g.add(refRiser);

        /* --- per-floor fit-out: lights, A/C cassettes, sprinklers, hose cabinet, alarm strobe --- */
        var panelGeo = new T.PlaneGeometry(1.9, 0.45), volGeo = new T.BoxGeometry(B - 0.3, FH - 0.45, B - 0.3);
        var cassGeo = new T.BoxGeometry(1.0, 0.22, 1.0), cabGeo = new T.BoxGeometry(0.5, 0.7, 0.18);
        var SPR = []; [BX - 3.1, BX + 3.1].forEach(function (x) { [BZ - 2.8, BZ - 0.2, BZ + 2.4].forEach(function (z) { SPR.push([x, z]); }); });
        var CASS = [[BX, BZ - 2.4], [BX, BZ + 1.8]];
        floors.forEach(function (fl, f) {
            var ceil = (f + 1) * FH - 0.15;
            fl.ceil = ceil; fl.lit = 0; fl.want = true; fl.onAt = -1; fl.warm = f % 3 !== 1;
            fl.fit = new T.Group(); fl.fit.visible = false; g.add(fl.fit);
            fl.panelMat = addMat(fl.warm ? 0xfff0cc : 0xe6f7ff, 0, true);
            fl.volMat = addMat(fl.warm ? 0xffb35c : 0x7dd3fc, 0, true);
            [BX - 1.6, BX + 1.6].forEach(function (x) { [BZ - 2.4, BZ, BZ + 2.4].forEach(function (z) { var p = new T.Mesh(panelGeo, fl.panelMat); p.rotation.x = Math.PI / 2; p.position.set(x, ceil - 0.02, z); fl.fit.add(p); }); });
            var vol = new T.Mesh(volGeo, fl.volMat); vol.position.set(BX, f * FH + 0.15 + (FH - 0.45) / 2, BZ); fl.fit.add(vol);
            var halo = glowSprite(kit, fl.warm ? 0xffc77a : 0x9be7ff, B * 1.5, 0); halo.position.set(BX, f * FH + 1.5, FRONT); fl.haloMat = halo.material; fl.fit.add(halo);
            var py = ceil - 0.34, sp = [BX - 3.6, py, BZ - 0.2, BX + 3.6, py, BZ - 0.2];
            [BX - 3.1, BX + 3.1].forEach(function (x) { sp.push(x, py, BZ - 2.8, x, py, BZ + 2.4); });
            SPR.forEach(function (s) { sp.push(s[0], py, s[1], s[0], py - 0.14, s[1]); });
            fl.fit.add(lines(sp, lRed));
            CASS.forEach(function (c) { var m = meshE(cassGeo, mWhite, lCyanS); m.position.set(c[0], ceil - 0.13, c[1]); fl.fit.add(m); });
            var cab = new T.Mesh(cabGeo, mRed); cab.position.set(BX - B / 2 + 0.5, f * FH + 1.2, FRONT + 0.05); fl.fit.add(cab);
            fl.strobe = glowSprite(kit, COL.red, 1.8, 0); fl.strobe.position.set(BX + B / 2 + 0.25, f * FH + 2.3, FRONT + 0.3); fl.fit.add(fl.strobe);
        });

        /* --- roof: VRF outdoor units with fans, LED edge --- */
        var roof = new T.Group(); roof.visible = false; g.add(roof);
        var vrfFans = [], mFanB = kit.solid(COL.cyan, 0.9, 0.4, 0.5);
        [BX - 2.4, BX, BX + 2.4].forEach(function (x) {
            var u = meshE(new T.BoxGeometry(1.9, 1.5, 1.1), mWhite, lCyanS); u.position.set(x, ROOFY + 0.75, BZ - 2.8); roof.add(u);
            var fg = new T.Group(); fg.position.set(x, ROOFY + 1.53, BZ - 2.8); roof.add(fg);
            var rg = new T.Mesh(new T.TorusGeometry(0.44, 0.04, 6, 24), mDarkS); rg.rotation.x = Math.PI / 2; fg.add(rg);
            for (var b3 = 0; b3 < 3; b3++) { var bl3 = new T.Mesh(new T.BoxGeometry(0.8, 0.03, 0.16), mFanB); bl3.rotation.y = b3 * Math.PI / 3; fg.add(bl3); }
            vrfFans.push(fg);
        });
        var re = SW / 2, rp = [];
        [[-re, -re, re, -re], [re, -re, re, re], [re, re, -re, re], [-re, re, -re, -re]].forEach(function (s) { rp.push(BX + s[0], ROOFY + 0.06, BZ + s[1], BX + s[2], ROOFY + 0.06, BZ + s[3]); });
        roof.add(lines(rp, kit.line(COL.cyan, 0.95, true)));
        var beacon = glowSprite(kit, COL.red, 1.6, 0.5); beacon.position.set(BX + re, ROOFY + 0.8, BZ + re); roof.add(beacon);
        var vrfLbl = new Label(kit, COL.cyan, 1.0); vrfLbl.sprite.position.set(BX, ROOFY + 3.0, BZ - 2.8); roof.add(vrfLbl.sprite);

        /* --- fire pump house + water tank --- */
        var PHX = -27.5, PHZ = 1.5;
        var ph = meshE(new T.BoxGeometry(4.2, 2.6, 3.2), kit.glass(COL.red, 0.06), lRed); ph.position.set(PHX, 1.3, PHZ); g.add(ph);
        var pumpGeo = new T.CylinderGeometry(0.32, 0.32, 0.9, 14); pumpGeo.rotateZ(Math.PI / 2);
        [-0.8, 0.8].forEach(function (dz) {
            var mot = meshE(new T.BoxGeometry(0.9, 0.6, 0.6), mGrey, lRed); mot.position.set(PHX - 0.9, 0.5, PHZ + dz); g.add(mot);
            var pmp = new T.Mesh(pumpGeo, mRed); pmp.position.set(PHX + 0.2, 0.5, PHZ + dz); g.add(pmp);
        });
        var pumpGlow = glowSprite(kit, COL.red, 3.5, 0); pumpGlow.position.set(PHX, 1.2, PHZ + 1.7); g.add(pumpGlow);
        var tank = meshE(new T.CylinderGeometry(1.7, 1.7, 3.6, 24), kit.glass(COL.blue, 0.08), kit.line(COL.blue, 0.7)); tank.position.set(PHX, 1.8, PHZ - 4.6); g.add(tank);
        var water = new T.Mesh(new T.CylinderGeometry(1.6, 1.6, 1, 24), kit.solid(COL.blue, 0.45, 0.4)); water.position.set(PHX, 0, PHZ - 4.6); g.add(water);
        g.add(lines([PHX + 2.1, 0.35, PHZ, fireRiser.position.x, 0.35, PHZ, fireRiser.position.x, 0.35, PHZ, fireRiser.position.x, 0.35, RZ,
            PHX, 0.35, PHZ - 2.8, PHX, 0.35, PHZ - 1.6], lRed));
        var pumpLbl = new Label(kit, COL.red, 1.0); pumpLbl.sprite.position.set(PHX, 4.6, PHZ - 1.5); g.add(pumpLbl.sprite);

        /* --- floodlight towers --- */
        [[-33, 8, 1], [3, 9.2, 0], [30, 8.5, 1]].forEach(function (p) {
            var mh = 11, mast = meshE(new T.BoxGeometry(0.3, mh, 0.3), mGrey, lAmberS); mast.position.set(p[0], mh / 2, p[1]); g.add(mast);
            var head = meshE(new T.BoxGeometry(1.8, 0.5, 0.3), mDarkS, lAmberS); head.position.set(p[0], mh + 0.2, p[1]); g.add(head);
            [-0.55, 0.55].forEach(function (dx) { var lg = glowSprite(kit, 0xfff4d6, 2.2, 0.95); lg.position.set(p[0] + dx, mh + 0.2, p[1] - 0.2); g.add(lg); });
            var tgt = new T.Vector3(p[2] ? BX + 4 : 6, 0, p[2] ? BZ + 3 : 0), from = new T.Vector3(p[0], mh, p[1]);
            var len = from.distanceTo(tgt) * 0.85, cg = new T.ConeGeometry(len * 0.26, len, 24, 1, true); cg.translate(0, -len / 2, 0); cg.rotateX(-Math.PI / 2);
            var cone = new T.Mesh(cg, kit.glass(0xfff1c9, 0.022, true)); cone.position.copy(from); cone.lookAt(tgt); g.add(cone);
        });

        /* --- road + site fence --- */
        var road = new T.Mesh(new T.PlaneGeometry(110, 4.3), kit.solid(0x0b1220, 0.92, 0.04, 0)); road.rotation.x = -Math.PI / 2; road.position.set(0, 0.02, ROADZ); g.add(road);
        var rl = [-55, 0.04, ROADZ - 2.15, 55, 0.04, ROADZ - 2.15, -55, 0.04, ROADZ + 2.15, 55, 0.04, ROADZ + 2.15];
        for (var dx0 = -55; dx0 < 55; dx0 += 3) rl.push(dx0, 0.04, ROADZ, dx0 + 1.5, 0.04, ROADZ);
        g.add(lines(rl, kit.line(COL.amber, 0.5)));
        var fz = ROADZ - 2.6, fp = [];
        [[-50, -22], [-4, 15], [26, 50]].forEach(function (s) {
            fp.push(s[0], 1.1, fz, s[1], 1.1, fz, s[0], 0.5, fz, s[1], 0.5, fz);
            for (var x = s[0]; x <= s[1]; x += 2) fp.push(x, 0, fz, x, 1.2, fz);
        });
        g.add(lines(fp, kit.line(COL.amber, 0.28)));

        /* --- particles: one system for flames/smoke (big), one for water/air/soil (small) --- */
        var PBIG = particles(kit, 240, 0.7), PSM = particles(kit, 700, 0.24); g.add(PBIG.obj); g.add(PSM.obj);
        var big = [], small = [];
        function puff(list, cap, x, y, z, vx, vy, vz, life, col, grav, drag, floorY) {
            list.push({ x: x, y: y, z: z, vx: vx, vy: vy, vz: vz, life: life, max: life, c: col, g: grav, d: drag, fy: floorY == null ? 0.02 : floorY });
            if (list.length > cap) list.splice(0, list.length - cap);
        }
        function stepP(list, sys, dt, bright) {
            for (var i = list.length - 1; i >= 0; i--) {
                var p = list[i]; p.life -= dt;
                if (p.life <= 0) { list.splice(i, 1); continue; }
                var dr = Math.exp(-p.d * dt); p.vx *= dr; p.vz *= dr; p.vy = p.vy * dr - p.g * dt;
                p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
                if (p.y < p.fy) { p.y = p.fy; p.vy = 0; p.vx *= 0.3; p.vz *= 0.3; if (p.g > 0) p.life = Math.min(p.life, 0.15); }
            }
            for (var j = 0; j < sys.n; j++) {
                if (j >= list.length) { sys.hide(j); continue; }
                var q = list[j], k = q.life / q.max;
                sys.set(j, q.x, q.y, q.z, q.c, bright(q, k));
            }
            sys.flush();
        }

        /* --- vehicles --- */
        var wheelGeo = new T.CylinderGeometry(0.48, 0.48, 0.36, 14); wheelGeo.rotateX(Math.PI / 2);
        var mTyre = kit.solid(0x0b0f19, 0.97, 0.05), lTyre = kit.line(COL.white, 0.25);
        function buildTruck(kind) {
            var V = { kind: kind, g: new T.Group(), wheels: [], v: 0, x: 0, st: 'drive', tm: 0, served: false, load: 0 };
            var col = { fire: COL.red, mixer: 0xe5e7eb, dump: COL.amber, van: COL.cyan, flatbed: 0x64748b }[kind];
            var mBody = kit.solid(col, 0.96, 0.25, 0.4), lBody = kit.line(kind === 'fire' ? COL.white : COL.cyan, 0.6);
            var L = kind === 'van' ? 4.8 : kind === 'fire' ? 8 : 7, cabL = 1.9, cabH = kind === 'van' ? 1.5 : 2.0;
            V.len = L;
            var ch = new T.Mesh(new T.BoxGeometry(L, 0.35, 2.1), mDarkS); ch.position.y = 0.78; V.g.add(ch);
            var cab = meshE(new T.BoxGeometry(cabL, cabH, 2.3), mBody, lBody); cab.position.set(L / 2 - cabL / 2, 0.95 + cabH / 2, 0); V.g.add(cab);
            var ws = new T.Mesh(new T.PlaneGeometry(2.0, cabH * 0.42), kit.glass(COL.cyan, 0.4)); ws.rotation.y = Math.PI / 2; ws.position.set(L / 2 + 0.01, 0.95 + cabH * 0.7, 0); V.g.add(ws);
            [-0.8, 0.8].forEach(function (z) { var hl = glowSprite(kit, 0xfff3d6, 1.3, 0.9); hl.position.set(L / 2 + 0.08, 1.2, z); V.g.add(hl); });
            [-0.8, 0.8].forEach(function (z) { var tl = glowSprite(kit, COL.red, 0.8, 0.8); tl.position.set(-L / 2 - 0.05, 1.1, z); V.g.add(tl); });
            var axles = kind === 'van' ? [L / 2 - 0.9, -L / 2 + 0.9] : [L / 2 - 1.0, -L / 2 + 1.2, -L / 2 + 2.4];
            axles.forEach(function (ax) { [-1.0, 1.0].forEach(function (z) { var w = meshE(wheelGeo, mTyre, lTyre); w.position.set(ax, 0.48, z); V.g.add(w); V.wheels.push(w); }); });
            var rear = -L / 2, bedL = L - cabL - 0.3, bedX = rear + bedL / 2 + 0.1;
            if (kind === 'mixer') {
                V.drumG = new T.Group(); V.drumG.position.set(bedX, 2.3, 0); V.drumG.rotation.z = 0.2; V.g.add(V.drumG);
                var dg = new T.CylinderGeometry(1.1, 0.6, 4.2, 8); dg.rotateZ(Math.PI / 2);
                V.drum = meshE(dg, mBody, kit.line(COL.orange, 0.8)); V.drumG.add(V.drum);
                var chute = new T.Mesh(new T.BoxGeometry(1.2, 0.12, 0.4), mGrey); chute.position.set(rear - 0.3, 1.5, 0); chute.rotation.z = 0.5; V.g.add(chute);
            } else if (kind === 'dump') {
                var bed = meshE(new T.BoxGeometry(bedL, 1.3, 2.3), mBody, kit.line(COL.orange, 0.7)); bed.position.set(bedX, 1.65, 0); V.g.add(bed);
                V.soil = new T.Mesh(new T.BoxGeometry(bedL - 0.2, 1, 2.1), kit.solid(0x8a5a2f, 0.97, 0.15, 0.05)); V.soil.position.set(bedX, 1.05, 0); V.g.add(V.soil);
                V.bedX = bedX;
            } else if (kind === 'flatbed') {
                var deck = new T.Mesh(new T.BoxGeometry(bedL, 0.2, 2.3), mGrey); deck.position.set(bedX, 1.05, 0); V.g.add(deck);
                var pg = new T.CylinderGeometry(0.22, 0.22, bedL - 0.2, 12); pg.rotateZ(Math.PI / 2);
                [[-0.6, 1.37, COL.red], [0, 1.37, COL.blue], [0.6, 1.37, COL.red], [-0.3, 1.78, COL.green], [0.3, 1.78, COL.blue]].forEach(function (p) {
                    var pp = new T.Mesh(pg, kit.solid(p[2], 0.95, 0.35, 0.5)); pp.position.set(bedX, p[1], p[0]); V.g.add(pp);
                });
            } else if (kind === 'van') {
                var tub = meshE(new T.BoxGeometry(bedL, 0.7, 2.2), mBody, lBody); tub.position.set(bedX, 1.3, 0); V.g.add(tub);
            } else if (kind === 'fire') {
                var bod = meshE(new T.BoxGeometry(bedL, 1.7, 2.3), mBody, lBody); bod.position.set(bedX, 1.8, 0); V.g.add(bod);
                V.lights = [glowSprite(kit, COL.red, 1.4, 0), glowSprite(kit, COL.blue, 1.4, 0)];
                V.lights[0].position.set(L / 2 - 1.0, 3.1, -0.6); V.lights[1].position.set(L / 2 - 1.0, 3.1, 0.6); V.g.add(V.lights[0]); V.g.add(V.lights[1]);
                // aerial ladder: turntable + 3 telescoping sections + nozzle
                V.lad = new T.Group(); V.lad.position.set(rear + 1.3, 2.85, 0); V.g.add(V.lad);
                V.lad.add(new T.Mesh(new T.CylinderGeometry(0.7, 0.7, 0.3, 16), mGrey));
                var secGeo = new T.BoxGeometry(6, 0.24, 0.8); secGeo.translate(3, 0, 0);
                var mLad = kit.solid(0xe5e7eb, 0.95, 0.3, 0.6), lLad = kit.line(COL.amber, 0.7);
                V.secs = [0, 1, 2].map(function (k) { var s = meshE(secGeo, mLad, lLad); s.position.y = 0.2 + k * 0.08; s.scale.set(1, 1 - k * 0.15, 1 - k * 0.15); V.lad.add(s); return s; });
                V.nozzle = glowSprite(kit, COL.white, 1.0, 0); V.lad.add(V.nozzle);
                V.ld = { yaw: { x: 0, v: 0, a: 0 }, pit: { x: 0, v: 0, a: 0 }, ext: { x: 0, v: 0, a: 0 } };
            }
            g.add(V.g);
            return V;
        }
        var vehicles = [];
        function addVeh(kind, lane, x, vmax, stopX, wait) {
            var V = buildTruck(kind); V.lane = lane; V.dir = lane === 'E' ? 1 : -1; V.x = x; V.vmax = vmax; V.stopX = stopX; V.wait = wait;
            V.g.rotation.y = V.dir > 0 ? 0 : Math.PI; vehicles.push(V); return V;
        }
        var mixer = addVeh('mixer', 'E', -24, 6, -9, 5);
        var dumpT = addVeh('dump', 'W', 36, 6, 20, 4);
        addVeh('flatbed', 'E', 14, 7, null, 8);
        addVeh('van', 'W', -14, 8, null, 6);
        var fireT = addVeh('fire', 'E', -60, 9, -20.5, 0); fireT.st = 'standby'; fireT.g.visible = false;

        /* --- excavator loading the dump truck --- */
        var EX = { x: 22.5, z: 5.0 }, MOUND = { x: 27.8, z: 0.8 };
        var mound = meshE(new T.ConeGeometry(2.8, 2.2, 14, 1), kit.solid(0x7a4f2a, 0.95, 0.12, 0.05), kit.line(COL.amber, 0.25)); mound.position.set(MOUND.x, 1.1, MOUND.z); g.add(mound);
        var exG = new T.Group(); exG.position.set(EX.x, 0, EX.z); g.add(exG);
        var mEx = kit.solid(COL.amber, 0.96, 0.25, 0.5), lEx = kit.line(COL.white, 0.35);
        [-1.05, 1.05].forEach(function (z) { var tr = meshE(new T.BoxGeometry(3.6, 0.8, 0.75), mDarkS, lAmberS); tr.position.set(0, 0.4, z); exG.add(tr); });
        var upper = new T.Group(); upper.position.y = 0.9; exG.add(upper);
        var house = meshE(new T.BoxGeometry(2.8, 1.2, 2.3), mEx, lEx); house.position.set(-0.4, 0.6, 0); upper.add(house);
        var exCab = meshE(new T.BoxGeometry(1.1, 1.3, 0.95), kit.glass(COL.cyan, 0.25), kit.line(COL.cyan, 0.8)); exCab.position.set(0.55, 1.85, -0.6); upper.add(exCab);
        var EL1 = 4.6, EL2 = 3.6, EPY = 1.1, EPX = 1.0;
        var boomG = new T.Group(); boomG.position.set(EPX, EPY, 0.45); upper.add(boomG);
        var bGeo = new T.BoxGeometry(EL1, 0.5, 0.42); bGeo.translate(EL1 / 2, 0, 0); boomG.add(meshE(bGeo, mEx, lEx));
        var stickG = new T.Group(); stickG.position.x = EL1; boomG.add(stickG);
        var sGeo = new T.BoxGeometry(EL2, 0.36, 0.32); sGeo.translate(EL2 / 2, 0, 0); stickG.add(meshE(sGeo, mEx, lEx));
        var bucketG = new T.Group(); bucketG.position.x = EL2; stickG.add(bucketG);
        var bk = meshE(new T.BoxGeometry(0.9, 0.8, 1.1), mDarkS, lAmberS); bk.position.set(0.3, -0.35, 0); bucketG.add(bk);
        var bkSoil = new T.Mesh(new T.BoxGeometry(0.8, 0.3, 1.0), kit.solid(0x8a5a2f, 0.97, 0.15, 0.05)); bkSoil.position.set(0.3, 0.1, 0); bucketG.add(bkSoil);
        var exLbl = new Label(kit, COL.amber, 0.9); exLbl.sprite.position.set(EX.x, 6.2, EX.z); g.add(exLbl.sprite);
        var ex = { yaw: { x: 0, v: 0, a: 0 }, r: { x: 4.5, v: 0, a: 0 }, h: { x: 2.5, v: 0, a: 0 }, b: { x: -1, v: 0, a: 0 }, st: 'reach', tm: 0, full: false, loads: 0 };
        function yawTo(x, z) { return Math.atan2(-(z - EX.z), x - EX.x); }
        function exMove(yaw, r, h, b, dt, sp) {
            sp = sp || 1;
            var a = approach1(ex.yaw, wrapAngle(yaw, ex.yaw.x), dt, 0.9 * sp, 1.4, 0.01), c = approach1(ex.r, r, dt, 3 * sp, 5, 0.03);
            var d = approach1(ex.h, h, dt, 3 * sp, 5, 0.03), e = approach1(ex.b, b, dt, 2.5, 6, 0.02);
            return a && c && d && e;
        }
        function stepExcavator(dt) {
            var dYaw = yawTo(MOUND.x, MOUND.z), dR = Math.hypot(MOUND.x - EX.x, MOUND.z - EX.z) - EPX - 1.7;
            var truckReady = dumpT.st === 'stopped' && dumpT.load < 0.999;
            var bedWX = dumpT.x - dumpT.bedX, bedZ = LANE.W;      // truck faces −x, so its bed is on the +x side
            ex.tm += dt;
            switch (ex.st) {
                case 'reach': if (exMove(dYaw, dR + 0.6, 1.9, 0.7, dt)) { ex.st = 'dig'; ex.tm = 0; } break;
                case 'dig': if (exMove(dYaw, dR - 0.4, 0.9, -1.6, dt, 0.35)) { ex.full = true; ex.st = 'lift'; ex.tm = 0; } break;
                case 'lift': if (exMove(dYaw, 4.6, 3.8, -1.6, dt)) { ex.st = 'hold'; ex.tm = 0; } break;
                case 'hold':
                    if (truckReady) { ex.st = 'swing'; ex.tm = 0; }
                    else if (ex.tm > 3) { ex.st = 'dump'; ex.tgt = 'mound'; ex.tm = 0; }     // no truck: re-heap the spoil
                    break;
                case 'swing':
                    if (!truckReady) { ex.st = 'hold'; break; }
                    if (exMove(yawTo(bedWX, bedZ), Math.hypot(bedWX - EX.x, bedZ - EX.z) - EPX, 3.5, -1.6, dt)) { ex.st = 'dump'; ex.tgt = 'truck'; ex.tm = 0; }
                    break;
                case 'dump':
                    exMove(ex.yaw.x, ex.r.x, ex.h.x, 1.0, dt);
                    if (ex.tm < 0.8 && ex.full) {
                        var tip = bucketG.getWorldPosition(_v3);
                        for (var q = 0; q < 3; q++) puff(small, 700, tip.x + rand(-0.4, 0.4), tip.y - 0.3, tip.z + rand(-0.4, 0.4), rand(-0.3, 0.3), rand(-1, 0), rand(-0.3, 0.3), 1.2, cSoil, 9.81, 0.5, ex.tgt === 'truck' ? 1.6 : 0.6);
                    }
                    if (ex.tm > 1.0) { if (ex.full && ex.tgt === 'truck') dumpT.load = Math.min(1, dumpT.load + 0.34); ex.full = false; ex.st = 'reach'; ex.tm = 0; }
                    break;
            }
            // pose: 2-link IK for the bucket pin, bucket angle given in world terms
            var d = Math.min(Math.hypot(ex.r.x, ex.h.x - EPY - 0.9), EL1 + EL2 - 0.01);
            var c2 = (d * d - EL1 * EL1 - EL2 * EL2) / (2 * EL1 * EL2), a2 = -Math.acos(clamp(c2, -1, 1));
            var a1 = Math.atan2(ex.h.x - EPY - 0.9, ex.r.x) - Math.atan2(EL2 * Math.sin(a2), EL1 + EL2 * Math.cos(a2));
            upper.rotation.y = ex.yaw.x; boomG.rotation.z = a1; stickG.rotation.z = a2; bucketG.rotation.z = ex.b.x - (a1 + a2);
            bkSoil.visible = ex.full;
            if (tick) exLbl.set('EX-02 · ' + { reach: 'DIG', dig: 'DIG', lift: 'LIFT', hold: 'WAIT TRUCK', swing: 'SWING', dump: 'DUMP' }[ex.st] + ' · TRUCK ' + Math.round(dumpT.load * 100) + '%');
        }
        var _v3 = new T.Vector3();

        /* --- workers (hard hats + hi-vis) --- */
        var wLegGeo = new T.BoxGeometry(0.17, 0.84, 0.19); wLegGeo.translate(0, -0.42, 0);
        var wArmGeo = new T.BoxGeometry(0.13, 0.66, 0.13); wArmGeo.translate(0, -0.33, 0);
        var wTorsoGeo = new T.BoxGeometry(0.48, 0.66, 0.28), wHeadGeo = new T.SphereGeometry(0.14, 10, 8), wHatGeo = new T.SphereGeometry(0.18, 12, 6, 0, TAU, 0, Math.PI / 2);
        var mPants = kit.solid(0x1e3a5f, 0.96, 0.15), mSkin = kit.solid(0xc58c5c, 0.96, 0.2, 0.1);
        var VEST = [kit.solid(0xff7a1a, 0.97, 0.6, 0.1), kit.solid(0xd9f99d, 0.97, 0.6, 0.1)];
        var HAT = [kit.solid(0xffffff, 0.97, 0.45, 0.2), kit.solid(0xfacc15, 0.97, 0.5, 0.2), kit.solid(0xff7a1a, 0.97, 0.5, 0.2)];
        function buildWorker(i, def) {
            var Wk = { g: new T.Group(), legs: [], arms: [], ph: rand(0, TAU), d: def, seg: 0, u: 0, x: 0, z: 0, y: 0,
                base: new T.Vector3(), o: new T.Vector3(), ov: new T.Vector3(), held: false, land: 0 };
            [-0.11, 0.11].forEach(function (x) { var p = new T.Group(); p.position.set(x, 0.84, 0); p.add(new T.Mesh(wLegGeo, mPants)); Wk.g.add(p); Wk.legs.push(p); });
            var tor = new T.Mesh(wTorsoGeo, VEST[i % 2]); tor.position.y = 1.17; Wk.g.add(tor);
            [-0.31, 0.31].forEach(function (x) { var p = new T.Group(); p.position.set(x, 1.46, 0); p.add(new T.Mesh(wArmGeo, VEST[i % 2])); Wk.g.add(p); Wk.arms.push(p); });
            var hd = new T.Mesh(wHeadGeo, mSkin); hd.position.y = 1.65; Wk.g.add(hd);
            var hat = new T.Mesh(wHatGeo, HAT[i % 3]); hat.position.y = 1.7; Wk.g.add(hat);
            if (def.tool === 'flag') { var fl6 = new T.Mesh(new T.PlaneGeometry(0.45, 0.32), addMat(COL.orange, 0.9, false)); fl6.position.set(0.22, -0.68, 0); Wk.arms[1].add(fl6); }
            g.add(Wk.g);
            return Wk;
        }
        function slabTop(f) { return (f + 1) * FH + 0.15; }
        var WDEF = [
            { path: [[-12, 5.5], [-3, 6.6], [5, 6.2], [-3, 8.2]], sp: 1.3 },
            { path: [[-25, 7.2], [-11, 7.2], [-11, 4.4], [-25, 4.4]], sp: 1.2 },
            { path: [[5, 1.5], [15, 1.5], [15, 8.2], [5, 8.2]], sp: 1.4 },
            { path: [[-24, 5.2], [-30.5, 5.2], [-30.5, -1], [-24, 4]], sp: 1.1 },
            { path: [[BX - 3, BZ - 3], [BX + 3, BZ - 3], [BX + 3, BZ + 2.6], [BX - 3, BZ + 2.6]], sp: 1.0, floor: 0 },
            { path: [[BX + 3, BZ + 2.6], [BX - 3, BZ + 2.6], [BX - 3, BZ - 3], [BX + 3, BZ - 3]], sp: 1.1, floor: 2 },
            { path: [[BX - 3, BZ + 1], [BX + 3, BZ + 1]], sp: 0.9, floor: 4 },
            { path: [[BX + 2, BZ - 2], [BX - 2, BZ + 2]], sp: 0.9, floor: 6 },
            { work: 'top', x: BX - 2.2, z: BZ + 1.5, face: 0.8, tool: 'hammer' },
            { work: 'top', x: BX + 2.4, z: BZ - 1.0, face: -2.2, tool: 'hammer' },
            { work: 'ground', x: -9.8, z: 8.6, face: 0, tool: 'point' },
            { work: 'ground', x: -7.4, z: 8.4, face: 0.4, tool: 'hammer' },
            { work: 'ground', x: 12.5, z: 9.0, face: 0, tool: 'flag' },
            { work: 'ground', x: 19.2, z: 8.2, face: 2.4, tool: 'wave' },
            { work: 'ground', x: -6.3, z: 6.3, face: Math.PI, tool: 'hammer' },
            { work: 'ground', x: PHX + 2.6, z: PHZ + 2.4, face: -2.3, tool: 'point' }
        ];
        var workers = WDEF.map(function (d, i) { return buildWorker(i, d); });
        function stepWorkers(dt, done) {
            workers.forEach(function (Wk) {
                var d = Wk.d, walking = false, y = 0;
                if (d.path) {
                    if (d.floor != null) { Wk.g.visible = done > d.floor; y = slabTop(d.floor); } else Wk.g.visible = true;
                    var a = d.path[Wk.seg], b = d.path[(Wk.seg + 1) % d.path.length], sl = Math.hypot(b[0] - a[0], b[1] - a[1]);
                    Wk.u += d.sp * dt / sl;
                    if (Wk.u >= 1) { Wk.u = 0; Wk.seg = (Wk.seg + 1) % d.path.length; }
                    Wk.g.position.set(a[0] + (b[0] - a[0]) * Wk.u, y, a[1] + (b[1] - a[1]) * Wk.u);
                    Wk.g.rotation.y = Math.atan2(b[0] - a[0], b[1] - a[1]);
                    walking = true;
                } else {
                    if (d.work === 'top') { y = done >= MAXF ? ROOFY : done > 0 ? slabTop(done - 1) : 0; Wk.g.visible = true; }
                    Wk.g.position.set(d.x, y, d.z); Wk.g.rotation.y = d.face;
                }
                /* picked up by the visitor: dangle; dropped: fall, land, then walk back to work */
                Wk.base.copy(Wk.g.position);
                if (!Wk.held && (Wk.o.lengthSq() > 1e-4 || Wk.ov.lengthSq() > 1e-4)) {
                    if (Wk.o.y > 0 || Wk.ov.y > 0) {
                        Wk.ov.y -= 9.81 * dt; Wk.o.addScaledVector(Wk.ov, dt);
                        if (Wk.o.y <= 0) { Wk.o.y = 0; Wk.ov.set(0, 0, 0); Wk.land = 1.0; }
                    } else if ((Wk.land -= dt) <= 0) { Wk.o.multiplyScalar(Math.exp(-dt * 0.8)); walking = true; }
                }
                Wk.g.position.add(Wk.o);
                if (Wk.held) {
                    var sw = Math.sin(t * 14 + Wk.ph);
                    Wk.legs[0].rotation.x = 0.5 * sw; Wk.legs[1].rotation.x = -0.5 * sw;
                    Wk.arms[0].rotation.set(0, 0, -2.6); Wk.arms[1].rotation.set(0, 0, 2.6);
                    return;
                }
                Wk.arms[0].rotation.z = 0;
                Wk.ph += dt * (walking ? d.sp * 5.5 : 1);
                var s = Math.sin(Wk.ph);
                if (walking) {
                    Wk.legs[0].rotation.x = 0.55 * s; Wk.legs[1].rotation.x = -0.55 * s;
                    Wk.arms[0].rotation.x = -0.45 * s; Wk.arms[1].rotation.x = 0.45 * s; Wk.arms[1].rotation.z = 0;
                    Wk.g.position.y += Math.abs(Math.cos(Wk.ph)) * 0.05;
                } else {
                    Wk.legs[0].rotation.x = Wk.legs[1].rotation.x = 0; Wk.arms[0].rotation.x = 0;
                    var tl = t + Wk.ph;
                    if (d.tool === 'hammer') { Wk.arms[1].rotation.x = -1.4 + 0.9 * Math.abs(Math.sin(tl * 4.5)); Wk.arms[1].rotation.z = 0; }
                    else if (d.tool === 'flag' || d.tool === 'wave') { Wk.arms[1].rotation.x = 0; Wk.arms[1].rotation.z = 2.4 + 0.45 * Math.sin(tl * (d.tool === 'flag' ? 2.2 : 5)); }
                    else { Wk.arms[1].rotation.x = -1.45; Wk.arms[1].rotation.z = 0.1 * Math.sin(tl); }
                }
            });
        }

        /* --- fire drill + building systems --- */
        var drill = { st: 'idle', tm: 0, next: 9, floor: 4, fire: 0, pump: 0 };
        var fireGlow = glowSprite(kit, 0xff7a2a, 11, 0); g.add(fireGlow);
        var fireLight = kit.light(new T.PointLight(0xff7a2a, 0, 20, 2)); g.add(fireLight);
        var fireLbl = new Label(kit, COL.red, 1.3); g.add(fireLbl.sprite);
        var mepLbl = new Label(kit, COL.cyan, 1.1); mepLbl.sprite.position.set(BX, 0.6, FRONT + 4.6); g.add(mepLbl.sprite);
        var nextToggle = 8;
        function stepBuilding(dt, done) {
            var topped = done >= MAXF, nLit = 0;
            /* lights come on (with a fluorescent flicker) as each floor is finished; later some floors switch off/on */
            if (topped && (nextToggle -= dt) <= 0) { var tf = Math.floor(Math.random() * MAXF); if (!(drill.st !== 'idle' && tf === drill.floor)) floors[tf].want = !floors[tf].want; nextToggle = rand(4, 9); }
            floors.forEach(function (fl, f) {
                var fit = f < done && fl.mk > 0.99;
                fl.fit.visible = f < done;
                if (fit && fl.onAt < 0) fl.onAt = t + 0.8;
                var on = fit && fl.onAt >= 0 && t > fl.onAt && (fl.want || (drill.st !== 'idle' && f === drill.floor));
                var target = on ? 1 : 0;
                if (on && t - fl.onAt < 0.7) target = Math.random() > 0.45 ? 1 : 0.1;    // start-up flicker
                fl.lit += (target - fl.lit) * Math.min(1, dt * 9);
                if (drill.st !== 'idle' && f === drill.floor) fl.lit *= 0.75 + 0.25 * Math.random();
                kit.op(fl.panelMat, 1.0 * fl.lit); kit.op(fl.volMat, 0.24 * fl.lit); kit.op(fl.haloMat, 0.5 * fl.lit);
                if (on) nLit++;
                var alarm = drill.st === 'alarm' || drill.st === 'fight';
                kit.op(fl.strobe.material, alarm && Math.sin(t * 16 + f) > 0.55 ? 1 : 0);
                /* cool air from the two A/C cassettes */
                if (fit && Math.random() < dt * 10) CASS.forEach(function (c) {
                    var ang = Math.floor(Math.random() * 4) * Math.PI / 2;
                    puff(small, 700, c[0] + Math.cos(ang) * 0.55, fl.ceil - 0.25, c[1] + Math.sin(ang) * 0.55, Math.cos(ang) * 1.1, -0.35, Math.sin(ang) * 1.1, 1.4, cCold, 0.3, 1.5, f * FH + 0.2);
                });
            });
            var top = done * FH;
            [fireRiser, refRiser].forEach(function (r) { r.visible = top > 0; r.scale.y = Math.max(0.001, top); });
            refRiser.scale.x = refRiser.scale.z = 0.75;
            roof.visible = topped;
            vrfFans.forEach(function (fg, i) { fg.rotation.y += dt * (14 + i); });
            if (topped && Math.random() < dt * 12) { var vx = BX + (Math.floor(Math.random() * 3) - 1) * 2.4; puff(small, 700, vx + rand(-0.3, 0.3), ROOFY + 1.6, BZ - 2.8 + rand(-0.3, 0.3), rand(-0.2, 0.2), 1.6, rand(-0.2, 0.2), 1.3, cHeat, -0.4, 0.8, 0); }
            kit.op(beacon.material, Math.sin(t * 3) > 0.7 ? 1 : 0.15);
            if (tick) vrfLbl.set('VRF · 3 × 28 kW · COOLING 24°C');

            /* fire drill: alarm → sprinklers + fire pump → fire engine + aerial ladder → all clear */
            drill.tm += dt;
            var F = drill.floor, fy = F * FH + 0.2, fcx = BX + 0.5, fcz = BZ + 1.2;
            switch (drill.st) {
                case 'idle':
                    if (topped && (drill.next -= dt) <= 0) { drill.floor = 2 + Math.floor(Math.random() * (MAXF - 3)); drill.st = 'alarm'; drill.tm = 0; drill.fire = 0; }
                    break;
                case 'alarm':
                    drill.fire = Math.min(1, drill.fire + dt / 2.5);
                    if (drill.tm > 2.5) { drill.st = 'fight'; drill.tm = 0; fireT.st = 'drive'; fireT.x = -56; fireT.served = false; fireT.g.visible = true; }
                    break;
                case 'fight':
                    var hose = fireT.spraying ? 2.2 : 1;
                    drill.fire = Math.max(0, drill.fire - dt / 34 * hose);
                    if (drill.fire <= 0) { drill.st = 'clear'; drill.tm = 0; }
                    break;
                case 'clear':
                    if (drill.tm > 9) { drill.st = 'idle'; drill.next = rand(22, 32); }
                    break;
            }
            var sprink = drill.st === 'fight' || (drill.st === 'clear' && drill.tm < 2.5);
            var pumpOn = sprink || (drill.st === 'clear' && drill.tm < 4) ? 1 : 0;
            drill.pump += (pumpOn - drill.pump) * Math.min(1, dt * 2);
            var fr = drill.fire;
            if (fr > 0.01) {
                var fl7 = 0.7 + 0.3 * noise(t * 9, 2);
                fireGlow.position.set(fcx, fy + 1.0, fcz); kit.op(fireGlow.material, fr * fl7);
                fireLight.position.set(fcx, fy + 1.4, FRONT + 1.5); kit.lightI(fireLight, 5 * fr * fl7);
                for (var fq = 0; fq < 2; fq++) if (Math.random() < dt * 60 * fr) puff(big, 240, fcx + rand(-2.6, 2.6), fy, fcz + rand(-0.5, 1.6), rand(-0.2, 0.2), rand(1.2, 2.4), rand(-0.2, 0.2), rand(0.4, 0.8), cFire, -0.5, 1.2, 0);
                if (Math.random() < dt * 25 * fr) puff(big, 240, fcx + rand(-2, 2), fy + 2.2, FRONT + 0.2, rand(-0.3, 0.3), rand(1.2, 2.2), rand(0.4, 1.2), rand(2.5, 4), cSmoke, -0.25, 0.4, 0);
            } else { kit.op(fireGlow.material, 0); kit.lightI(fireLight, 0); }
            if (sprink) for (var si = 0; si < SPR.length; si++) if (Math.random() < dt * 30) {
                var a5 = rand(0, TAU), s5 = rand(0.6, 1.6);
                puff(small, 700, SPR[si][0], floors[F].ceil - 0.5, SPR[si][1], Math.cos(a5) * s5, rand(-0.5, 0), Math.sin(a5) * s5, 1.0, cWater, 9.81, 0.6, fy);
            }
            /* fire pump + flow up the red riser */
            kit.op(pumpGlow.material, 0.85 * drill.pump * (0.75 + 0.25 * Math.sin(t * 20)));
            water.scale.y = 3.2 - 0.6 * (drill.st === 'idle' ? 0 : 1) * Math.min(1, drill.tm / 10); water.position.y = water.scale.y / 2;
            if (drill.pump > 0.3 && Math.random() < dt * 30) puff(small, 700, fireRiser.position.x, 0.3, fireRiser.position.z + 0.22, 0, 5 + rand(0, 1), 0, (fy + 2) / 5.5, cRed, 0, 0, 0);
            if (tick) {
                pumpLbl.set(drill.pump > 0.3 ? 'FIRE PUMP · RUNNING 750 GPM' : 'FIRE PUMP · AUTO STANDBY');
                fireLbl.sprite.visible = drill.st !== 'idle';
                fireLbl.sprite.position.set(BX - 9.5, F * FH + 2.0, FRONT + 1);
                fireLbl.set(drill.st === 'alarm' ? 'FIRE ALARM · L' + (F + 1) : drill.st === 'fight' ? 'L' + (F + 1) + ' · SPRINKLERS ON · ' + Math.round(drill.fire * 100) + '%' : 'ALL CLEAR · L' + (F + 1));
                mepLbl.set(topped ? 'LIGHTS ' + nLit + '/' + MAXF + ' · A/C ON · FIRE ' + (drill.st === 'idle' ? 'OK' : drill.st === 'clear' ? 'RESET' : 'ALARM') : 'MEP FIT-OUT · L' + Math.max(1, done));
            }
            return { fy: fy, F: F };
        }

        function stepFireTruck(V, dt, fireInfo) {
            var lit = V.st !== 'standby' && (drill.st !== 'idle');
            kit.op(V.lights[0].material, lit && Math.sin(t * 14) > 0 ? 1 : 0); kit.op(V.lights[1].material, lit && Math.sin(t * 14) <= 0 ? 1 : 0);
            var ld = V.ld, deployed = false;
            V.spraying = false;
            if (V.st === 'stopped' && (drill.st === 'alarm' || drill.st === 'fight')) {
                var base = V.lad.getWorldPosition(_v3), tx = BX - 1.0, ty = fireInfo.fy + 1.3, tz = FRONT + 0.8;
                var dx = tx - base.x, dy = ty - base.y, dz = tz - base.z, hz = Math.hypot(dx, dz);
                var a = approach1(ld.yaw, Math.atan2(-dz, dx), dt, 0.9, 1.2, 0.005);
                var b = a && approach1(ld.pit, Math.atan2(dy, hz), dt, 0.6, 0.9, 0.005);
                var c = b && approach1(ld.ext, clamp(Math.hypot(hz, dy) - 6.6, 0, 12), dt, 3, 2.5, 0.02);
                deployed = a && b && c;
            } else {
                var c2 = approach1(ld.ext, 0, dt, 2.5, 2, 0.02);
                var b2 = c2 && approach1(ld.pit, 0, dt, 0.4, 0.6, 0.005);
                if (b2) approach1(ld.yaw, 0, dt, 0.6, 0.8, 0.005);
            }
            V.lad.rotation.set(0, ld.yaw.x, ld.pit.x);
            V.secs[1].position.x = ld.ext.x / 2; V.secs[2].position.x = ld.ext.x;
            var tipL = 6 + ld.ext.x; V.nozzle.position.set(tipL, 0.35, 0);
            if (deployed && drill.fire > 0) {
                V.spraying = true;
                kit.op(V.nozzle.material, 0.9);
                var tip = V.nozzle.getWorldPosition(new T.Vector3()), dir = new T.Vector3(Math.cos(ld.pit.x) * Math.cos(ld.yaw.x), Math.sin(ld.pit.x), -Math.cos(ld.pit.x) * Math.sin(ld.yaw.x));
                dir.y -= 0.25; dir.normalize();
                for (var q = 0; q < 3; q++) puff(small, 700, tip.x, tip.y, tip.z, dir.x * 9 + rand(-0.4, 0.4), dir.y * 9 + rand(-0.4, 0.4), dir.z * 9 + rand(-0.4, 0.4), 0.55, cWater, 9.81, 0.3, 0);
            } else kit.op(V.nozzle.material, 0);
            V.stowed = ld.ext.x === 0 && ld.pit.x === 0 && ld.yaw.x === 0;
        }
        function releaseVeh(V) {
            if (V.kind === 'mixer') return V.tm > 9;
            if (V.kind === 'dump') return V.load >= 0.999 && V.tm > 1.2;
            if (V.kind === 'fire') return (drill.st === 'clear' || drill.st === 'idle') && V.stowed;
            return true;
        }
        function stepVehicles(dt) {
            vehicles.forEach(function (V) {
                if (V.st === 'standby') { V.g.visible = false; return; }
                if (V.st === 'gone') {
                    V.tm += dt;
                    if (V.tm < V.wait) return;
                    V.x = -56 * V.dir; V.served = false; V.load = 0; V.st = 'drive'; V.v = V.vmax * 0.8;
                }
                var target = V.vmax;
                if (V.st === 'stopped') target = 0;
                else {
                    if (V.stopX !== null && !V.served) {
                        var ds = (V.stopX - V.x) * V.dir;
                        if (ds > -0.5) target = Math.min(target, Math.sqrt(2 * 2.0 * Math.max(0, ds)));
                        if (ds < 0.3 && V.v < 0.35 && !V.held) { V.st = 'stopped'; V.tm = 0; V.v = 0; V.x = V.stopX; }
                    }
                    var gap = 1e9;
                    vehicles.forEach(function (o) {
                        if (o === V || o.lane !== V.lane || o.st === 'gone' || o.st === 'standby') return;
                        var dd = (o.x - V.x) * V.dir; if (dd > 0) gap = Math.min(gap, dd - (o.len + V.len) / 2);
                    });
                    if (gap < 1e8) target = Math.min(target, Math.sqrt(2 * 2.0 * Math.max(0, gap - 2.5)));
                }
                if (V.held) V.v = 0;
                else { V.v = Math.max(0, V.v + clamp(target - V.v, -4.5 * dt, 2.2 * dt)); V.x += V.v * V.dir * dt; }
                if (V.st === 'stopped') { V.tm += dt; if (releaseVeh(V)) { V.served = true; V.st = 'drive'; } }
                if (V.x * V.dir > 58) { V.st = V.kind === 'fire' ? 'standby' : 'gone'; V.tm = 0; }
                V.g.position.set(V.x, 0, LANE[V.lane]);
                V.wheels.forEach(function (w) { w.rotation.z -= V.v * dt / 0.48; });
                if (V.drum) V.drum.rotation.x += dt * (V.st === 'stopped' ? 3.5 : 1.2);
                if (V.soil) { V.soil.visible = V.load > 0.01; V.soil.scale.y = Math.max(0.01, V.load); V.soil.position.y = 1.05 + 0.5 * V.load; }
                if (V.st === 'stopped' && V.kind === 'mixer' && Math.random() < dt * 25)       // concrete down the chute
                    puff(small, 700, V.x - V.len / 2 - 0.8, 1.2, LANE[V.lane] + rand(-0.15, 0.15), -0.4, -0.5, rand(-0.1, 0.1), 0.6, new T.Color(0x9ca3af), 9.81, 0.5, 0.05);
            });
        }

        var siteDone = 0;
        function updSite(dt, done) {
            siteDone = done;
            var info = stepBuilding(dt, done);
            stepVehicles(dt);
            stepFireTruck(fireT, dt, info);
            stepExcavator(dt);
            stepWorkers(dt, done);
            stepP(big, PBIG, dt, function (p, k) { return p.c === cSmoke ? Math.min(1, k * 2) * 0.55 : Math.min(1, k * 1.8); });
            stepP(small, PSM, dt, function (p, k) { return p.c === cCold ? Math.sin(Math.PI * k) * 0.55 : p.c === cHeat ? k * 0.35 : Math.min(1, k * 2) * 0.9; });
        }

        function ropeFor(yb) { return PIVY - (yb + LH + SL); }
        function craneStep(dt) {
            var src = cr.fromA ? PA : PB, dst = cr.fromA ? PB : PA;
            var vS = 0.22, aS = 0.07, vR = 2.4, aR = 0.7, vL = 2.6, aL = 1.4;
            var prevL = cr.L.x, at, ar;
            cr.psi.a = 0; cr.r.a = 0; cr.tm += dt;
            var settled = Math.hypot(cr.sx, cr.sz) < 0.03 && Math.hypot(cr.wx, cr.wz) < 0.06;
            function goTo(p) {
                var a1 = approach1(cr.psi, wrapAngle(p.psi, cr.psi.x), dt, vS, aS, 0.003);
                var a2 = approach1(cr.r, p.r, dt, vR, aR, 0.02);
                return a1 && a2;
            }
            switch (cr.st) {
                case 'goSrc':
                    ar = approach1(cr.L, LMIN, dt, vL, aL); at = goTo(src);
                    if (at && ar && (settled || cr.tm > 5)) { cr.st = 'down'; cr.tm = 0; }
                    break;
                case 'down':
                    goTo(src);
                    if (approach1(cr.L, ropeFor((src.n - 1) * LH), dt, vL * 0.8, aL)) { cr.st = 'hook'; cr.tm = 0; }
                    break;
                case 'hook':
                    if (cr.tm > 1.1) { cr.has = true; src.n--; cr.st = 'up'; cr.tm = 0; }
                    break;
                case 'up':
                    if (approach1(cr.L, LMIN, dt, vL * 0.8, aL * 0.8)) { cr.st = 'travel'; cr.tm = 0; }
                    break;
                case 'travel':
                    at = goTo(dst);
                    if (at && (settled || cr.tm > 7)) { cr.st = 'down2'; cr.tm = 0; }   // wait for the sway to die out
                    break;
                case 'down2':
                    goTo(dst);
                    if (approach1(cr.L, ropeFor(dst.n * LH), dt, vL * 0.5, aL * 0.6)) { cr.st = 'unhook'; cr.tm = 0; }
                    break;
                case 'unhook':
                    if (cr.tm > 1.1) { cr.has = false; dst.n++; cr.st = 'up2'; cr.tm = 0; }
                    break;
                case 'up2':
                    if (approach1(cr.L, LMIN, dt, vL, aL)) { if (src.n === 0) cr.fromA = !cr.fromA; cr.st = 'goSrc'; cr.tm = 0; }
                    break;
            }
            if (dt <= 0) return;
            if (cr.held) { cr.wx = cr.wz = 0; return; }
            // Pivot (trolley) acceleration in polar coordinates → drives a 2-axis pendulum:
            //   s'' = −(g·sin s + a·cos s + 2·L'·s') / L − c·s'
            var ps = cr.psi, rr = cr.r;
            var erx = -Math.cos(ps.x), erz = Math.sin(ps.x), etx = Math.sin(ps.x), etz = Math.cos(ps.x);
            var aRad = rr.a - rr.x * ps.v * ps.v, aTan = rr.x * ps.a + 2 * rr.v * ps.v;
            var ax = aRad * erx + aTan * etx, az = aRad * erz + aTan * etz;
            var L = cr.L.x, Ld = (L - prevL) / dt, n = 4, hh = dt / n;
            for (var i3 = 0; i3 < n; i3++) {
                cr.wx += (-(9.81 * Math.sin(cr.sx) + ax * Math.cos(cr.sx) + 2 * Ld * cr.wx) / L - 0.25 * cr.wx) * hh;
                cr.wz += (-(9.81 * Math.sin(cr.sz) + az * Math.cos(cr.sz) + 2 * Ld * cr.wz) / L - 0.25 * cr.wz) * hh;
                cr.sx += cr.wx * hh; cr.sz += cr.wz * hh;
            }
            cr.wx += noise(t * 0.37, 3) * 0.01 * dt; cr.wz += noise(t * 0.29, 9) * 0.01 * dt;   // light wind
        }

        function emit(ex, ey, ez, n) {
            for (var i4 = 0; i4 < n; i4++) {
                var sp3 = rand(2, 5.5), life = rand(0.4, 1.1);
                sparks.push({ x: ex, y: ey, z: ez, vx: rand(-1, 1) * sp3 * 0.7, vy: rand(0.1, 1) * sp3, vz: rand(-1, 1) * sp3 * 0.7, life: life, max: life });
            }
            if (sparks.length > 260) sparks.splice(0, sparks.length - 260);
        }

        function update(dt) {
            /* building */
            t0 += dt;
            var prog = t0 / FLOOR_T;
            var done = Math.min(MAXF, Math.floor(prog)), cur = done < MAXF ? prog - done : 1;
            var storeys = done < MAXF ? done + 1 : MAXF, weld = null;
            for (var f2 = 0; f2 < MAXF; f2++) {
                var fl3 = floors[f2], show = f2 < storeys, pf = f2 < done ? 1 : cur;
                var ck = clamp(pf / 0.3, 0, 1), sk = clamp((pf - 0.3) / 0.45, 0, 1), mk = clamp((pf - 0.8) / 0.2, 0, 1);
                for (var c2 = 0; c2 < 9; c2++) { fl3.cols[c2].visible = show; fl3.cols[c2].scale.y = Math.max(0.001, ck); }
                fl3.form.visible = fl3.shore.visible = show && pf > 0.2 && pf < 1;
                fl3.slab.visible = show && sk > 0; fl3.slab.scale.x = Math.max(0.001, sk);
                fl3.slab.material = pf >= 1 ? mSlab : mWet;
                fl3.duct.visible = show && mk > 0; fl3.duct.scale.x = Math.max(0.001, mk);
                fl3.mk = show ? mk : 0;
                if (show && pf < 0.3) {
                    var cc = fl3.cols[Math.floor(t * 1.4) % 9].position;
                    weld = [cc.x, f2 * FH + FH * ck, cc.z];
                } else if (show && sk > 0 && sk < 1) {
                    weld = [BX - SW / 2 + SW * sk, (f2 + 1) * FH + 0.2, BZ + noise(t * 2, f2) * B * 0.45];
                }
            }
            var top = done * FH;
            risers.forEach(function (r) { r.visible = top > 0; r.scale.y = Math.max(0.001, top); });
            floorLbl.sprite.position.set(BX, storeys * FH + 1.8, BZ + B / 2);
            if (tick) floorLbl.set(done < MAXF ? 'FLOOR ' + (done + 1) + '/' + MAXF + ' · ' + Math.round(cur * 100) + '%' : 'TOPPED OUT · ' + MAXF + ' FLOORS');

            /* welding sparks (+ occasional hot works after topping out) */
            if (weld && Math.random() < dt * 40) emit(weld[0], weld[1], weld[2], 2 + (Math.random() * 3 | 0));
            if (done >= MAXF && (nextBurst -= dt) <= 0) {
                var bf = 1 + Math.floor(Math.random() * (MAXF - 1));
                emit(BX + rand(-2.5, 2.5), (bf + 1) * FH - 0.4, BZ + B / 2 - 1.1, 18);
                nextBurst = rand(2.5, 5);
            }
            if (weld) {
                weldGlow.position.set(weld[0], weld[1], weld[2]); kit.op(weldGlow.material, rand(0.5, 1));
                weldLight.position.set(weld[0], weld[1] + 0.4, weld[2] + 0.8); kit.lightI(weldLight, rand(1.2, 2.4));
            } else { kit.op(weldGlow.material, 0); kit.lightI(weldLight, 0); }
            for (var s = sparks.length - 1; s >= 0; s--) {
                var p = sparks[s];
                p.life -= dt;
                if (p.life <= 0) { sparks.splice(s, 1); continue; }
                var dr = Math.exp(-1.3 * dt);
                p.vx *= dr; p.vz *= dr; p.vy = p.vy * dr - 9.81 * dt;
                p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
                if (p.y < 0.02) { p.y = 0.02; p.vy *= -0.3; p.vx *= 0.5; p.vz *= 0.5; }
            }
            for (var s3 = 0; s3 < SPK.n; s3++) {
                if (s3 >= sparks.length) { SPK.hide(s3); continue; }
                var sp2 = sparks[s3], kk = sp2.life / sp2.max;
                _c.setRGB(1, 0.45 + 0.5 * kk, 0.12 + 0.7 * kk * kk);
                SPK.set(s3, sp2.x, sp2.y, sp2.z, _c, Math.min(1, kk * 1.6));
            }
            SPK.flush();

            /* AHU fan spins up with inertia; airflow speed follows it */
            fanW += (9 + 0.6 * noise(t * 0.4, 5) - fanW) * (1 - Math.exp(-dt * 0.5));
            fan.rotation.z -= fanW * dt;
            kit.op(blurMat, clamp(fanW / 9, 0, 1) * 0.2);
            var flow = fanW / 9, idx = 0;
            if (tick) ahuLbl.set('AHU-01 · SA ' + (flow * 4.2).toFixed(1) + ' m/s');
            for (var f4 = 0; f4 < MAXF; f4++) {
                var mk2 = floors[f4].mk, dy0 = (f4 + 1) * FH - 0.65, dz0 = BZ + B / 2 - 1.1;
                for (var q2 = 0; q2 < 6; q2++, idx++) {
                    if (mk2 < 1) { FLOW.hide(idx); continue; }
                    var spd = 1.2 + ((q2 * 13) % 7) * 0.15, u = ((t * spd + q2 * DL / 6 + f4) % DL);
                    FLOW.set(idx, BX - DL / 2 + u, dy0 + noise(t * 2 + q2, f4) * 0.15, dz0 + noise(t * 1.7 + q2, f4 + 3) * 0.25, cCyan, Math.sin(Math.PI * u / DL));
                }
            }
            var span = DX1 - DX0 - 0.4;
            for (var q3 = 0; q3 < 26; q3++, idx++) {
                var u2 = (t * (1.8 + (q3 * 7 % 9) * 0.15) * flow + q3 * span / 26) % span;
                FLOW.set(idx, DX0 + 0.2 + u2, DY + noise(t * 3 + q3, q3) * 0.25, AZ + noise(t * 2.3 + q3, q3 + 5) * 0.25, cCyan, Math.sin(Math.PI * u2 / span) * flow);
            }
            FLOW.flush();
            for (var r2 = 0; r2 < 24; r2++) {
                var kind = r2 % 3, ri = Math.floor(r2 / 3);
                if (top <= 0) { RISE.hide(r2); continue; }
                var rp = risers[kind].position, uu;
                if (kind === 0) uu = (t * 1.4 + ri * top / 8) % top;
                else if (kind === 1) uu = top - (t * 1.4 + ri * top / 8) % top;
                else uu = (t * 4 + ri * top / 8) % top;
                RISE.set(r2, rp.x, uu, rp.z + 0.2, kind === 0 ? cBlue : kind === 1 ? cGreen : cAmber, kind === 2 ? 0.6 + 0.4 * Math.sin(t * 10 + ri) : 0.9);
            }
            RISE.flush();

            /* crane */
            craneStep(dt);
            slew.rotation.y = cr.psi.x;
            trolley.position.x = -cr.r.x;
            var erx = -Math.cos(cr.psi.x), erz = Math.sin(cr.psi.x), etx = Math.sin(cr.psi.x), etz = Math.cos(cr.psi.x);
            var px2 = MX + cr.r.x * erx, pz2 = MZ + cr.r.x * erz, L = cr.L.x;
            cr.piv = { x: px2, z: pz2 };
            var hx = px2 + L * Math.sin(cr.sx), hz = pz2 + L * Math.sin(cr.sz);
            var hy = PIVY - L * Math.sqrt(Math.max(0, 1 - Math.sin(cr.sx) * Math.sin(cr.sx) - Math.sin(cr.sz) * Math.sin(cr.sz)));
            var ra = ropes.geometry.attributes.position.array, o = 0.18;
            ra.set([px2 - etx * o, PIVY, pz2 - etz * o, hx - etx * o, hy + 0.3, hz - etz * o,
                px2 + etx * o, PIVY, pz2 + etz * o, hx + etx * o, hy + 0.3, hz + etz * o]);
            ropes.geometry.attributes.position.needsUpdate = true;
            hookG.position.set(hx, hy, hz);
            qY.setFromAxisAngle(UP, cr.psi.x); eT.set(-cr.sz, 0, cr.sx); qT.setFromEuler(eT);
            hookG.quaternion.copy(qT).multiply(qY);
            load.visible = cr.has;
            slings.visible = cr.has || cr.st === 'hook' || cr.st === 'unhook';
            shadow.visible = cr.has;
            if (cr.has) {
                var hgt = clamp((hy - SL - LH) / 20, 0, 1);
                shadow.position.set(hx, 0.03, hz); shadow.rotation.z = cr.psi.x;
                shadow.scale.set(1 + hgt * 0.6, 1 + hgt * 0.6, 1);
                kit.op(shadowMat, 0.35 * (1 - hgt * 0.75));
            }
            [PA, PB].forEach(function (pl) { for (var m = 0; m < pl.meshes.length; m++) pl.meshes[m].visible = m < pl.n; });
            var fl5 = Math.pow(Math.max(0, Math.sin(t * 4.2)), 8);
            kit.op(avLight.material, 0.15 + 0.85 * fl5); avLight.scale.setScalar(1.5 + 2.5 * fl5);
            if (tick) craneLbl.set('TC-01 · ' + (cr.has ? '1.8' : '0.4') + ' t · R ' + cr.r.x.toFixed(1) + ' m · sway ' + (Math.hypot(cr.sx, cr.sz) * 180 / Math.PI).toFixed(1) + '°');
            updSite(dt, done);
        }
        /* --- things the visitor can grab / click --- */
        var picks = [];
        var _ho = new T.Vector3();
        picks.push({                                          // crane hook / load: pull it and let it swing
            r: 2.2, pos: function (out) { out.copy(hookG.position); if (cr.has) out.y -= SL + LH / 2; return out; },
            grab: function () { cr.held = true; },
            drag: function (pt) {
                if (!cr.piv) return;
                var L = cr.L.x + (cr.has ? SL + LH / 2 : 0);
                cr.sx = Math.asin(clamp((pt.x - cr.piv.x) / L, -0.6, 0.6)); cr.sz = Math.asin(clamp((pt.z - cr.piv.z) / L, -0.6, 0.6));
            },
            release: function (vel) { cr.held = false; var L = cr.L.x + 1; cr.wx = clamp(vel.x / L, -1.2, 1.2); cr.wz = clamp(vel.z / L, -1.2, 1.2); }
        });
        workers.forEach(function (Wk) {
            picks.push({
                r: 1.1, enabled: function () { return Wk.g.visible; },
                pos: function (out) { out.copy(Wk.g.position); out.y += 0.9; return out; },
                grab: function () { Wk.held = true; Wk.ov.set(0, 0, 0); },
                drag: function (pt) { Wk.o.copy(pt).sub(Wk.base); Wk.o.y -= 0.9; },
                release: function (vel) { Wk.held = false; Wk.ov.copy(vel).clampLength(0, 12); Wk.land = 0; }
            });
        });
        vehicles.forEach(function (V) {
            picks.push({
                r: 3.4, enabled: function () { return V.st !== 'standby' && V.st !== 'gone'; },
                pos: function (out) { out.copy(V.g.position); out.y += 1.6; return out; },
                grab: function () { V.held = true; },
                drag: function (pt) { V.x = clamp(pt.x, -56, 56); },
                release: function () { V.held = false; if (V.st === 'stopped' && V.stopX !== null && Math.abs(V.x - V.stopX) > 0.6) V.st = 'drive'; }
            });
        });
        floors.forEach(function (fl, f) {                     // click a floor: lights on / off
            picks.push({ r: 3.0, enabled: function () { return f < siteDone; },
                pos: function (out) { return out.set(BX, f * FH + 1.5, FRONT); },
                click: function () { fl.want = !fl.want; } });
        });
        picks.push({ r: 2.8, pos: function (out) { return out.set(PHX, 1.3, PHZ); },   // pump house: run a fire drill now
            click: function () { if (drill.st === 'idle' && siteDone >= MAXF) drill.next = 0; } });
        picks.push({ r: 2.2, pos: function (out) { return out.copy(fanPos); }, click: function () { fanW += 14; } });   // AHU fan boost
        return { kit: kit, group: g, update: update, picks: picks };
    }

    /* ================================================================== */
    /* SCENE 1 — ROBOTIC ASSEMBLY LINE (closed loop)                       */
    /* ================================================================== */
    /* A pallet-carrier assembly line, the way electronics are really built. Twelve fixture carriers ride
       a closed over/under loop (top lane → drop elevator → return lane underneath → lift elevator) and
       index forward together one pitch at a time. While the line dwells, every station works in parallel:
         01 LOAD    6-axis robot, parallel gripper: housing from the infeed table onto the carrier
         02 PCB     robot with vacuum cups inserts the circuit board
         03 SCREW   XYZ gantry drives four screws, one corner after another
         04 LID     robot with vacuum cups places the cover
         05 WELD    laser gantry traces the seam (sparks, hot bead)
            QC      vision arch scans every unit as it passes underneath
         06 UNLOAD  robot palletises finished units; a full pallet leaves on a mecanum AGV while the
                    standby AGV docks, then loops round behind the line back to standby.
       The emptied carrier drops to the return lane and comes back to station 01 — an endless loop. */
    function buildRobo() {
        var kit = new Kit(), g = new T.Group();
        var grid = new T.GridHelper(130, 65); grid.material = kit.add(new T.LineBasicMaterial({ color: COL.amber, opacity: 0.07 })); g.add(grid);

        /* ---------- loop geometry ---------- */
        var HALF = 16, TOPY = 1.3, BOTY = 0.35, DROP = TOPY - BOTY, CZ = 0, PT = 0.16;
        var LOOP = 4 * HALF + 2 * DROP, NC = 12, PITCH = LOOP / NC, OFF = (2 * HALF - 5 * PITCH) / 2;
        var SX = []; for (var si = 0; si < 6; si++) SX.push(-HALF + OFF + si * PITCH);
        function pathAt(s, out) {
            s = ((s % LOOP) + LOOP) % LOOP;
            if (s < 2 * HALF) { out.x = -HALF + s; out.y = TOPY; out.lane = 0; }
            else if (s < 2 * HALF + DROP) { out.x = HALF; out.y = TOPY - (s - 2 * HALF); out.lane = 1; }
            else if (s < 4 * HALF + DROP) { out.x = HALF - (s - 2 * HALF - DROP); out.y = BOTY; out.lane = 2; }
            else { out.x = -HALF; out.y = BOTY + (s - 4 * HALF - DROP); out.lane = 3; }
            return out;
        }
        var _p = { x: 0, y: 0, lane: 0 };

        /* ---------- materials ---------- */
        var mDark = kit.solid(0x1f2937, 0.96, 0.08), mFrame = kit.solid(0x1e293b, 0.96, 0.08), mBelt = kit.solid(0x0b1220, 0.97, 0.05);
        var mRail = kit.solid(COL.amber, 0.95, 0.35), mLeg = kit.solid(0x334155, 0.95, 0.1);
        var lAmber = kit.line(COL.amber, 0.7), lAmberS = kit.line(COL.amber, 0.45), lCyan = kit.line(COL.cyan, 0.8), lCyanS = kit.line(COL.cyan, 0.45);
        var mLink = kit.solid(COL.amber, 0.96, 0.22, 0.6), mJoint = kit.solid(COL.cyan, 0.96, 0.45, 0.5), mTurret = kit.solid(COL.orange, 0.96, 0.25, 0.5);

        /* ---------- conveyor: top lane + return lane underneath ---------- */
        [TOPY, BOTY].forEach(function (y) {
            var belt = meshE(new T.BoxGeometry(2 * HALF, 0.08, 1.15), mBelt, lAmberS); belt.position.set(0, y - 0.045, CZ); g.add(belt);
            [-0.66, 0.66].forEach(function (z) { var r = new T.Mesh(new T.BoxGeometry(2 * HALF, 0.1, 0.08), mRail); r.position.set(0, y + 0.02, CZ + z); g.add(r); });
        });
        var legGeo = new T.BoxGeometry(0.14, TOPY - 0.09, 0.14);
        for (var lx = -HALF + 1; lx <= HALF - 1; lx += 3.75) [-0.72, 0.72].forEach(function (z) { var l = new T.Mesh(legGeo, mLeg); l.position.set(lx, (TOPY - 0.09) / 2, CZ + z); g.add(l); });
        var cleatGeo = new T.BoxGeometry(0.06, 0.025, 1.0), mCleat = kit.solid(COL.amber, 0.6, 0.25), cleatsT = [], cleatsB = [];
        for (var ci = 0; ci < 2 * HALF; ci++) {
            var c1 = new T.Mesh(cleatGeo, mCleat); c1.position.set(0, TOPY + 0.003, CZ); g.add(c1); cleatsT.push(c1);
            var c2 = new T.Mesh(cleatGeo, mCleat); c2.position.set(0, BOTY + 0.003, CZ); g.add(c2); cleatsB.push(c2);
        }
        var drumGeo = new T.CylinderGeometry(0.2, 0.2, 1.2, 14), mDrum = kit.solid(0x475569, 0.95, 0.1), drums = [];
        [[-HALF, TOPY], [HALF, TOPY], [-HALF, BOTY], [HALF, BOTY]].forEach(function (p) {
            var d = meshE(drumGeo, mDrum, lAmberS); d.rotation.x = Math.PI / 2; d.position.set(p[0], p[1] - 0.2, CZ); g.add(d); drums.push(d);
        });
        // end elevators: carriers drop to the return lane on the right and are lifted back up on the left
        var elevs = [-HALF, HALF].map(function (x, k) {
            var E = { x: x, lane: k ? 1 : 3, rest: k ? TOPY : BOTY, y: { x: k ? TOPY : BOTY, v: 0, a: 0 } };
            var ox = x + (k ? 1.0 : -1.0), mh = TOPY + 1.3;
            var postGeo = new T.BoxGeometry(0.14, mh, 0.14);
            [-0.85, 0.85].forEach(function (z) { var p = meshE(postGeo, mFrame, lCyanS); p.position.set(ox, mh / 2, CZ + z); g.add(p); });
            var top = new T.Mesh(new T.BoxGeometry(0.14, 0.14, 1.84), mRail); top.position.set(ox, mh, CZ); g.add(top);
            E.plat = meshE(new T.BoxGeometry(1.8, 0.06, 1.3), mDark, lCyan); E.plat.position.set(x, E.y.x - 0.03, CZ); g.add(E.plat);
            E.lbl = new Label(kit, COL.cyan, 0.42); E.lbl.sprite.position.set(ox, mh + 0.45, CZ); g.add(E.lbl.sprite);
            E.lbl.set(k ? 'DROP ▼' : 'LIFT ▲');
            return E;
        });

        /* ---------- product parts (origin = carrier plate top) ---------- */
        var PART = { base: { lo: 0, hi: 0.3 }, pcb: { lo: 0.3, hi: 0.35 }, lid: { lo: 0.3, hi: 0.44 }, unit: { lo: 0, hi: 0.44 } };
        var gHouse = new T.BoxGeometry(1.1, 0.3, 0.8), gPcb = new T.BoxGeometry(0.96, 0.05, 0.66);
        var gChip = new T.BoxGeometry(0.24, 0.05, 0.2), gChip2 = new T.BoxGeometry(0.14, 0.04, 0.3), gLed = new T.BoxGeometry(0.06, 0.04, 0.06);
        var gScrew = new T.CylinderGeometry(0.055, 0.055, 0.07, 10), gLid = new T.BoxGeometry(1.12, 0.14, 0.82);
        var mHouse = kit.solid(0x475569, 0.96, 0.12, 0.55), lHouse = kit.line(COL.cyan, 0.55);
        var mPcb = kit.solid(0x0e7c4d, 0.97, 0.35, 0.15), lPcb = kit.line(COL.green, 0.8), mChip = kit.solid(0x0b0f19, 0.97, 0.05);
        var mScrew = kit.solid(0xd1d5db, 0.97, 0.3, 0.9), mLid = kit.glass(COL.cyan, 0.16), lLid = kit.line(COL.cyan, 0.85), lSeam = kit.line(0xffc46b, 0.95, true);
        var SCREW_XZ = [[-0.4, -0.25], [0.4, -0.25], [0.4, 0.25], [-0.4, 0.25]];
        var SEAM = [[-0.56, -0.41], [0.56, -0.41], [0.56, 0.41], [-0.56, 0.41], [-0.56, -0.41]], SEAM_LEN = 2 * (1.12 + 0.82);
        var sp0 = []; for (var sk = 0; sk < 4; sk++) sp0.push(SEAM[sk][0], 0.445, SEAM[sk][1], SEAM[sk + 1][0], 0.445, SEAM[sk + 1][1]);
        var seamGeo = new T.BufferGeometry(); seamGeo.setAttribute('position', new T.Float32BufferAttribute(sp0, 3));
        function mkHouse() { var m = meshE(gHouse, mHouse, lHouse); m.position.y = 0.15; return m; }
        function mkPcb() {
            var m = meshE(gPcb, mPcb, lPcb); m.position.y = 0.325;
            var a1 = new T.Mesh(gChip, mChip); a1.position.set(-0.2, 0.05, 0.05); m.add(a1);
            var a2 = new T.Mesh(gChip2, mChip); a2.position.set(0.25, 0.045, -0.08); m.add(a2);
            var led = new T.Mesh(gLed, mJoint); led.position.set(0.3, 0.045, 0.22); m.add(led);
            return m;
        }
        function mkScrew(k) { var m = new T.Mesh(gScrew, mScrew); m.position.set(SCREW_XZ[k][0], 0.385, SCREW_XZ[k][1]); return m; }
        function mkLid() { var m = meshE(gLid, mLid, lLid); m.position.y = 0.37; return m; }
        function mkSeam() { return new T.LineSegments(seamGeo, lSeam); }
        function mkPart(type) {
            var p = new T.Group();
            if (type === 'base' || type === 'unit') p.add(mkHouse());
            if (type === 'pcb' || type === 'unit') p.add(mkPcb());
            if (type === 'unit') for (var k = 0; k < 4; k++) p.add(mkScrew(k));
            if (type === 'lid' || type === 'unit') p.add(mkLid());
            if (type === 'unit') p.add(mkSeam());
            return p;
        }

        /* ---------- fixture carriers ---------- */
        var gPlate = new T.BoxGeometry(1.5, PT, 1.1), gPin = new T.CylinderGeometry(0.045, 0.045, 0.12, 8);
        var mPlate = kit.solid(0x111827, 0.97, 0.1), lPlate = kit.line(COL.cyan, 0.65), mPin = kit.solid(COL.amber, 0.95, 0.4);
        var carriers = [];
        for (var i = 0; i < NC; i++) {
            var C = { i: i, g: new T.Group(), prod: new T.Group(), stage: i < 6 ? i : 0, nScrew: 0, qc: i === 5, flash: 0, lane: 0 };
            var pl = meshE(gPlate, mPlate, lPlate); pl.position.y = PT / 2; C.g.add(pl);
            for (var pk = -1; pk <= 1; pk += 2) { var pin = new T.Mesh(gPin, mPin); pin.position.set(pk * 0.66, PT + 0.06, pk * 0.45); C.g.add(pin); }
            C.prod.position.y = PT; C.g.add(C.prod);
            C.house = mkHouse(); C.pcb = mkPcb(); C.lid = mkLid(); C.seam = mkSeam();
            C.screws = [mkScrew(0), mkScrew(1), mkScrew(2), mkScrew(3)];
            [C.house, C.pcb, C.lid, C.seam].concat(C.screws).forEach(function (m) { this.add(m); }, C.prod);
            C.tag = glowSprite(kit, COL.green, 1.1, 0); C.tag.position.set(0, 0.8, 0); C.prod.add(C.tag);
            g.add(C.g); carriers.push(C);
        }
        function showStage(C) {
            C.house.visible = C.stage >= 1; C.pcb.visible = C.stage >= 2;
            for (var k = 0; k < 4; k++) C.screws[k].visible = C.stage >= 3 || (C.stage === 2 && k < C.nScrew);
            C.lid.visible = C.stage >= 4; C.seam.visible = C.stage >= 5;
        }

        /* ---------- line control: synchronous indexing ---------- */
        var LN = { st: 'dwell', k: 0, idx: { x: 0, v: 0, a: 0 }, tm: 0, cyc: 0, last: 0, out: 0, qc: 0 };
        var NEED = [0, 1, 2, 3, 4, 5], ST = [{}, {}, {}, {}, {}, {}];
        function slotC(m) { return carriers[((m - LN.k) % NC + NC) % NC]; }
        function beginDwell() { for (var m = 0; m < 6; m++) ST[m].done = slotC(m).stage !== NEED[m]; LN.tm = 0; }
        function lineS() { return LN.k * PITCH + LN.idx.x; }
        function stepLine(dt) {
            LN.cyc += dt;
            if (LN.st === 'index') {
                if (approach1(LN.idx, PITCH, dt, 4.2, 6, 0.002)) {
                    LN.idx.x = 0; LN.idx.v = 0; LN.k++; LN.st = 'dwell'; LN.last = LN.cyc; LN.cyc = 0; beginDwell();
                }
            } else {
                LN.tm += dt;
                if (LN.tm > 0.35 && ST.every(function (s) { return s.done; })) LN.st = 'index';
            }
        }
        beginDwell();

        /* ---------- robots ---------- */
        var L1 = 2.6, L2 = 2.3, BZ = -2.9, SHY = 1.75, FT = 1.0;
        var l1Geo = new T.BoxGeometry(L1, 0.42, 0.48); l1Geo.translate(L1 / 2, 0, 0);
        var l2Geo = new T.BoxGeometry(L2, 0.34, 0.4); l2Geo.translate(L2 / 2, 0, 0);
        var capGeo = new T.CylinderGeometry(0.3, 0.3, 0.62, 18), fingerGeo = new T.BoxGeometry(0.3, 0.34, 0.08), cupGeo = new T.CylinderGeometry(0.075, 0.11, 0.1, 12);

        function buildArm(bx, tool, job, home, ready) {
            var A = { bx: bx, TO: tool === 'vac' ? 0.65 : 0.58, job: job, home: home, ready: ready, fingers: [], vac: null,
                root: new T.Group(), yawG: new T.Group(), sh: new T.Group(), el: new T.Group(), wr: new T.Group(), j6: new T.Group() };
            A.root.position.set(bx, 0, BZ); g.add(A.root);
            var plate = meshE(new T.CylinderGeometry(0.9, 1.0, 0.25, 24), mDark, lAmber); plate.position.y = 0.125; A.root.add(plate);
            var ped = meshE(new T.CylinderGeometry(0.5, 0.6, 1.2, 20), mDark, lAmber); ped.position.y = 0.85; A.root.add(ped);
            A.yawG.position.y = 1.45; A.root.add(A.yawG);
            var tur = meshE(new T.CylinderGeometry(0.62, 0.62, 0.45, 20), mTurret, lAmber); tur.position.y = 0.2; A.yawG.add(tur);
            A.sh.position.y = SHY - 1.45; A.yawG.add(A.sh);
            var cap1 = new T.Mesh(capGeo, mJoint); cap1.rotation.x = Math.PI / 2; A.sh.add(cap1);
            A.sh.add(meshE(l1Geo, mLink, lAmber));
            A.el.position.x = L1; A.sh.add(A.el);
            var cap2 = new T.Mesh(capGeo, mJoint); cap2.rotation.x = Math.PI / 2; cap2.scale.set(0.8, 0.85, 0.8); A.el.add(cap2);
            A.el.add(meshE(l2Geo, mLink, lAmber));
            A.wr.position.x = L2; A.el.add(A.wr);
            var wrist = new T.Mesh(new T.CylinderGeometry(0.15, 0.15, 0.45, 12), mJoint); wrist.position.y = -0.22; A.wr.add(wrist);
            A.wr.add(A.j6);                                   // J6 keeps the tool square to the line
            if (tool === 'vac') {
                var vp = meshE(new T.BoxGeometry(0.9, 0.12, 0.66), mDark, lCyan); vp.position.y = -0.5; A.j6.add(vp);
                [[-0.3, -0.2], [0.3, -0.2], [0.3, 0.2], [-0.3, 0.2]].forEach(function (p) { var cup = new T.Mesh(cupGeo, mJoint); cup.position.set(p[0], -0.6, p[1]); A.j6.add(cup); });
                A.vac = glowSprite(kit, COL.cyan, 1.4, 0); A.vac.position.y = -0.66; A.j6.add(A.vac);
            } else {
                var gp = meshE(new T.BoxGeometry(0.42, 0.14, 1.36), mDark, lCyan); gp.position.y = -0.5; A.j6.add(gp);
                for (var k = 0; k < 2; k++) { var fg = new T.Mesh(fingerGeo, mJoint); fg.position.y = -0.73; A.j6.add(fg); A.fingers.push(fg); }
            }
            A.tool = { x: home.x, y: home.y, z: home.z, vx: 0, vy: 0, vz: 0 };
            A.cyl = { yaw: { x: 0, v: 0, a: 0 }, rho: { x: 0, v: 0, a: 0 }, y: { x: 0, v: 0, a: 0 } };
            A.st = 'idle'; A.tm = 0; A.grip = 0; A.tgt = home;
            A.held = mkPart(job.part); A.held.visible = false; g.add(A.held);
            cylInit(A);
            return A;
        }
        function yawOf(A, x, z) { return Math.atan2(-(z - BZ), x - A.bx); }
        function cylInit(A) {
            var o = A.tool;
            A.cyl.yaw.x = yawOf(A, o.x, o.z); A.cyl.rho.x = Math.hypot(o.x - A.bx, o.z - BZ); A.cyl.y.x = o.y;
            A.cyl.yaw.v = A.cyl.rho.v = A.cyl.y.v = 0;
        }
        /* joint-space-like move (yaw / reach / height): big moves arc around the base like a real robot */
        function cylMove(A, tx, ty, tz, dt) {
            var c = A.cyl;
            var a1 = approach1(c.yaw, wrapAngle(yawOf(A, tx, tz), c.yaw.x), dt, 2.0, 3.6, 0.004);
            var a2 = approach1(c.rho, Math.hypot(tx - A.bx, tz - BZ), dt, 2.4, 4.5, 0.01);
            var a3 = approach1(c.y, ty, dt, 2.4, 4.5, 0.01);
            A.tool.x = A.bx + c.rho.x * Math.cos(c.yaw.x); A.tool.z = BZ - c.rho.x * Math.sin(c.yaw.x); A.tool.y = c.y.x;
            A.tool.vx = A.tool.vy = A.tool.vz = 0;
            return a1 && a2 && a3;
        }
        var CYL = { idle: 1, toPick: 1, carry: 1, toPlace: 1 };
        function go(A, st) { if (CYL[st] && !CYL[A.st]) cylInit(A); A.st = st; A.tm = 0; }

        function stepArm(A, dt) {
            var o = A.tool, J = A.job, TO = A.TO, VM = 3.0, AM = 7, p;
            A.tm += dt;
            switch (A.st) {
                case 'idle':
                    if ((p = J.pick())) { A.tgt = p; go(A, 'toPick'); break; }
                    cylMove(A, A.home.x, A.home.y, A.home.z, dt); break;
                case 'toPick':
                    if (cylMove(A, A.tgt.x, A.tgt.y + TO + 0.8, A.tgt.z, dt)) go(A, 'pickDown'); break;
                case 'pickDown':
                    if (approach3(o, A.tgt.x, A.tgt.y + TO, A.tgt.z, dt, VM * 0.45, AM * 0.6)) go(A, 'grip'); break;
                case 'grip':
                    A.grip = Math.min(1, A.grip + dt / 0.28);
                    if (A.grip >= 1) { J.picked(); A.held.visible = true; go(A, 'pickUp'); }
                    break;
                case 'pickUp':
                    if (approach3(o, A.tgt.x, A.tgt.y + TO + 0.8, A.tgt.z, dt, VM * 0.6, AM)) { if (J.lifted) J.lifted(); go(A, 'carry'); }
                    break;
                case 'carry':
                    if ((p = J.place())) { A.tgt = p; go(A, 'toPlace'); break; }
                    cylMove(A, A.ready.x, A.ready.y, A.ready.z, dt); break;
                case 'toPlace':
                    if (cylMove(A, A.tgt.x, A.tgt.y + TO + 0.8, A.tgt.z, dt)) go(A, 'placeDown'); break;
                case 'placeDown':
                    if (approach3(o, A.tgt.x, A.tgt.y + TO, A.tgt.z, dt, VM * 0.35, AM * 0.5)) go(A, 'release'); break;
                case 'release':
                    A.grip = Math.max(0, A.grip - dt / 0.28);
                    if (A.grip <= 0) { A.held.visible = false; J.placed(); go(A, 'placeUp'); }
                    break;
                case 'placeUp':
                    if (approach3(o, A.tgt.x, A.tgt.y + TO + 0.8, A.tgt.z, dt, VM * 0.6, AM)) go(A, 'idle'); break;
            }
        }
        function poseArm(A) {
            var o = A.tool, dx = o.x - A.bx, dz = o.z - BZ;
            var yaw = Math.atan2(-dz, dx), rho = Math.hypot(dx, dz), h = o.y - SHY;
            var d = Math.min(Math.hypot(rho, h), L1 + L2 - 0.01);
            var c2 = (d * d - L1 * L1 - L2 * L2) / (2 * L1 * L2);
            var a2 = -Math.acos(clamp(c2, -1, 1));
            var a1 = Math.atan2(h, rho) - Math.atan2(L2 * Math.sin(a2), L1 + L2 * Math.cos(a2));
            A.yawG.rotation.y = yaw; A.sh.rotation.z = a1; A.el.rotation.z = a2; A.wr.rotation.z = -(a1 + a2);
            A.j6.rotation.y = -yaw;
            if (A.fingers.length) { var gw = 0.62 - 0.17 * A.grip; A.fingers[0].position.z = -gw; A.fingers[1].position.z = gw; }
            if (A.vac) kit.op(A.vac.material, 0.85 * A.grip);
            if (A.held.visible) A.held.position.set(o.x, o.y - A.TO - PART[A.job.part].hi, o.z);
        }

        /* ---------- infeed tables ---------- */
        function buildFeeder(x, z, part, n, pitch) {
            var F = { x: x, z: z, n: n, items: [], topY: FT + (n - 1) * pitch + (PART[part].hi - PART[part].lo) };
            var tbl = meshE(new T.BoxGeometry(1.6, FT, 1.25), mFrame, lAmberS); tbl.position.set(x, FT / 2, z); g.add(tbl);
            for (var k = 0; k < n; k++) { var it = mkPart(part); it.position.set(x, FT + k * pitch - PART[part].lo, z); g.add(it); F.items.push(it); }
            return F;
        }
        function carrierTop(C, part) { return { x: C.g.position.x, y: C.g.position.y + PT + PART[part].hi, z: CZ }; }
        function feederJob(F, m, part) {
            return {
                part: part,
                pick: function () { return { x: F.x, y: F.topY, z: F.z }; },
                picked: function () { F.items[F.n - 1].visible = false; },
                place: function () { var C = slotC(m); return (LN.st === 'dwell' && !ST[m].done && C.stage === NEED[m]) ? carrierTop(C, part) : null; },
                placed: function () { var C = slotC(m); C.stage = NEED[m] + 1; F.items[F.n - 1].visible = true; ST[m].done = true; }
            };
        }
        var FZ = -1.9;
        var feeders = [buildFeeder(SX[0] - 2.5, FZ, 'base', 3, 0.3), buildFeeder(SX[1] - 2.5, FZ, 'pcb', 6, 0.09), buildFeeder(SX[3] - 2.5, FZ, 'lid', 3, 0.14)];

        /* ---------- AGVs (mecanum, so they translate without turning) ---------- */
        var DOCK = { x: SX[5], z: -6.6 }, PALTOP = 0.52;
        var PSLOT = [[-0.62, -0.45], [0.62, -0.45], [-0.62, 0.45], [0.62, 0.45]];
        var ROUTE = [[0, 0], [9.5, 0], [9.5, -2.3], [-5.6, -2.3], [-5.6, 0], [0, 0]], RL = [0];
        for (var ri = 1; ri < ROUTE.length; ri++) RL.push(RL[ri - 1] + Math.abs(ROUTE[ri][0] - ROUTE[ri - 1][0]) + Math.abs(ROUTE[ri][1] - ROUTE[ri - 1][1]));
        var U_STANDBY = RL[4], U_END = RL[5], U_DELIVER = RL[2];
        var mAgv = kit.solid(0x111827, 0.96, 0.1), mPallet = kit.solid(0x8b5a2b, 0.95, 0.12, 0.05), gWheel = new T.CylinderGeometry(0.22, 0.22, 0.16, 12);
        function buildAgv(u, st) {
            var V2 = { grp: new T.Group(), units: [], n: 0, u: { x: u, v: 0, a: 0 }, st: st };
            var body = meshE(new T.BoxGeometry(2.8, 0.3, 2.2), mAgv, lCyan); body.position.y = 0.2; V2.grp.add(body);
            [[-1.1, -1.1], [1.1, -1.1], [1.1, 1.1], [-1.1, 1.1]].forEach(function (p) { var w = new T.Mesh(gWheel, mJoint); w.rotation.x = Math.PI / 2; w.position.set(p[0], 0.2, p[1]); V2.grp.add(w); });
            var pal = meshE(new T.BoxGeometry(2.6, 0.17, 2.0), mPallet, lAmber); pal.position.y = 0.435; V2.grp.add(pal);
            V2.beacon = glowSprite(kit, COL.amber, 0.8, 0.6); V2.beacon.position.set(1.25, 0.6, 0.95); V2.grp.add(V2.beacon);
            for (var k = 0; k < 4; k++) { var un = mkPart('unit'); un.position.set(PSLOT[k][0], PALTOP, PSLOT[k][1]); un.visible = false; V2.grp.add(un); V2.units.push(un); }
            V2.lbl = new Label(kit, COL.amber, 0.45); V2.lbl.sprite.position.y = 1.8; V2.grp.add(V2.lbl.sprite);
            g.add(V2.grp);
            return V2;
        }
        var agvs = [buildAgv(0, 'dock'), buildAgv(U_STANDBY, 'standby')];
        function docked() { for (var k = 0; k < agvs.length; k++) if (agvs[k].st === 'dock') return agvs[k]; return null; }
        function routeAt(u) {
            for (var k = 1; k < ROUTE.length; k++) if (u <= RL[k] || k === ROUTE.length - 1) {
                var f = RL[k] > RL[k - 1] ? clamp((u - RL[k - 1]) / (RL[k] - RL[k - 1]), 0, 1) : 0;
                return [ROUTE[k - 1][0] + (ROUTE[k][0] - ROUTE[k - 1][0]) * f, ROUTE[k - 1][1] + (ROUTE[k][1] - ROUTE[k - 1][1]) * f];
            }
        }
        function stepAgv(V2, dt) {
            switch (V2.st) {
                case 'dock': if (V2.n >= 4) V2.st = 'go'; break;
                case 'go':
                    if (V2.n && V2.u.x > U_DELIVER) { V2.n = 0; V2.units.forEach(function (un) { un.visible = false; }); }   // delivered to the warehouse
                    if (approach1(V2.u, U_STANDBY, dt, 3.6, 2.4, 0.02)) V2.st = 'standby';
                    break;
                case 'standby': if (!agvs.some(function (o2) { return o2 !== V2 && (o2.st === 'dock' || o2.st === 'enter'); })) V2.st = 'enter'; break;
                case 'enter': if (approach1(V2.u, U_END, dt, 3.6, 2.4, 0.02)) { V2.u.x = 0; V2.u.v = 0; V2.st = 'dock'; } break;
            }
            var q = routeAt(V2.u.x);
            V2.grp.position.set(DOCK.x + q[0], 0, DOCK.z + q[1]);
            kit.op(V2.beacon.material, V2.st === 'go' || V2.st === 'enter' ? (Math.sin(t * 12) > 0 ? 0.95 : 0.15) : 0.35);
            if (tick) V2.lbl.set(V2.st === 'dock' ? 'AGV · LOADING ' + V2.n + '/4' : V2.st === 'standby' ? 'AGV · STANDBY' : 'AGV · ' + (V2.n ? 'TO WAREHOUSE' : 'RETURNING'));
        }
        var unloadJob = {
            part: 'unit',
            pick: function () { var C = slotC(5); return (LN.st === 'dwell' && !ST[5].done && C.stage === 5) ? carrierTop(C, 'unit') : null; },
            picked: function () { var C = slotC(5); C.stage = 0; C.qc = false; },
            lifted: function () { ST[5].done = true; },
            place: function () { var V2 = docked(); return (V2 && V2.n < 4) ? { x: DOCK.x + PSLOT[V2.n][0], y: PALTOP + PART.unit.hi, z: DOCK.z + PSLOT[V2.n][1] } : null; },
            placed: function () { var V2 = docked(); if (V2) { V2.units[V2.n].visible = true; V2.n++; } LN.out++; }
        };

        var arms = [
            buildArm(SX[0], 'grip', feederJob(feeders[0], 0, 'base'), { x: SX[0] - 2.3, y: 3.4, z: -1.3 }, { x: SX[0], y: 3.6, z: -0.7 }),
            buildArm(SX[1], 'vac', feederJob(feeders[1], 1, 'pcb'), { x: SX[1] - 2.3, y: 3.4, z: -1.3 }, { x: SX[1], y: 3.6, z: -0.7 }),
            buildArm(SX[3], 'vac', feederJob(feeders[2], 3, 'lid'), { x: SX[3] - 2.3, y: 3.4, z: -1.3 }, { x: SX[3], y: 3.6, z: -0.7 }),
            buildArm(SX[5], 'grip', unloadJob, { x: SX[5], y: 3.6, z: -0.8 }, { x: DOCK.x, y: 3.4, z: -5.0 })
        ];
        var armStation = [0, 1, 3, 5];

        /* ---------- XYZ gantries: screwdriving (03) and laser welding (05) ---------- */
        var GH = 4.3;
        function buildGantry(x, col) {
            var G = { x: x, hx: { x: x, v: 0, a: 0 }, hz: { x: 0, v: 0, a: 0 }, hy: { x: TOPY + PT + 1.4, v: 0, a: 0 }, st: 'home', tm: 0 };
            var postGeo = new T.BoxGeometry(0.14, GH, 0.14), lc = kit.line(col, 0.8);
            [[-1, -1.2], [1, -1.2], [-1, 1.2], [1, 1.2]].forEach(function (p) { var m = meshE(postGeo, mFrame, lCyanS); m.position.set(x + p[0], GH / 2, CZ + p[1]); g.add(m); });
            [-1.2, 1.2].forEach(function (z) { var r = new T.Mesh(new T.BoxGeometry(2.14, 0.12, 0.12), mRail); r.position.set(x, GH, CZ + z); g.add(r); });
            G.bridge = meshE(new T.BoxGeometry(0.2, 0.16, 2.5), mDark, lc); G.bridge.position.y = GH + 0.12; g.add(G.bridge);
            G.car = meshE(new T.BoxGeometry(0.42, 0.42, 0.36), mDark, lc); g.add(G.car);
            var spGeo = new T.CylinderGeometry(0.06, 0.06, 1, 10); spGeo.translate(0, 0.5, 0);
            G.sp = new T.Mesh(spGeo, mJoint); g.add(G.sp);
            G.tip = new T.Group(); g.add(G.tip);
            G.set = function () {
                G.bridge.position.x = G.hx.x;
                G.car.position.set(G.hx.x, GH - 0.1, G.hz.x);
                G.sp.position.set(G.hx.x, G.hy.x + 0.22, G.hz.x); G.sp.scale.y = Math.max(0.01, GH - 0.3 - G.hy.x - 0.22);
                G.tip.position.set(G.hx.x, G.hy.x, G.hz.x);
            };
            G.home = function (dt) {
                var a = approach1(G.hx, x, dt, 3, 14, 0.005), b = approach1(G.hz, 0, dt, 3, 14, 0.005), c = approach1(G.hy, TOPY + PT + 1.4, dt, 3, 14, 0.005);
                return a && b && c;
            };
            G.lbl = col;
            return G;
        }
        // screwdriver
        var SCR = buildGantry(SX[2], COL.cyan);
        var bit = new T.Mesh(new T.CylinderGeometry(0.04, 0.02, 0.22, 6), mRail); bit.position.y = 0.11; SCR.tip.add(bit);
        var scrGlow = glowSprite(kit, COL.cyan, 0.9, 0); SCR.tip.add(scrGlow);
        function stepScrew(dt) {
            var C = slotC(2), py = TOPY + PT, cx = C.g.position.x, spin = 0, S2 = SCR;
            var active = LN.st === 'dwell' && !ST[2].done && C.stage === 2;
            switch (S2.st) {
                case 'home': S2.home(dt); if (active) S2.st = 'move'; break;
                case 'move':
                    var a = approach1(S2.hx, cx + SCREW_XZ[C.nScrew][0], dt, 3, 14, 0.004);
                    var b = approach1(S2.hz, CZ + SCREW_XZ[C.nScrew][1], dt, 3, 14, 0.004);
                    var c = approach1(S2.hy, py + 0.75, dt, 3, 14, 0.004);
                    if (a && b && c) S2.st = 'down';
                    break;
                case 'down':
                    if (approach1(S2.hy, py + 0.5, dt, 2.2, 12, 0.004)) { S2.cur = C.nScrew; C.nScrew++; S2.st = 'drive'; S2.tm = 0; }
                    break;
                case 'drive':                                     // screw spins down 8 mm and seats
                    S2.tm += dt; var k = Math.min(1, S2.tm / 0.5);
                    C.screws[S2.cur].position.y = 0.385 + 0.08 * (1 - k);
                    S2.hy.x = py + 0.42 + 0.08 * (1 - k); S2.hy.v = 0; spin = 1;
                    if (k >= 1) S2.st = 'up';
                    break;
                case 'up':
                    if (approach1(S2.hy, py + 0.75, dt, 3, 14, 0.004)) {
                        if (C.nScrew >= 4) { C.stage = 3; C.nScrew = 0; ST[2].done = true; S2.st = 'home'; } else S2.st = 'move';
                    }
                    break;
            }
            bit.rotation.y += spin * 40 * dt;
            kit.op(scrGlow.material, spin ? rand(0.5, 0.95) : 0);
            SCR.set();
        }
        // laser welder
        var LAS = buildGantry(SX[4], COL.orange);
        var noz = new T.Mesh(new T.ConeGeometry(0.11, 0.26, 12), mTurret); noz.rotation.x = Math.PI; noz.position.y = 0.13; LAS.tip.add(noz);
        var beamGeo = new T.CylinderGeometry(0.03, 0.03, 1, 6); beamGeo.translate(0, -0.5, 0);
        var beam = new T.Mesh(beamGeo, kit.glass(0xff8a3d, 0.85, true)); LAS.tip.add(beam);
        var lasDot = glowSprite(kit, 0xffe0b0, 1.8, 0); g.add(lasDot);
        var lasLight = kit.light(new T.PointLight(0xff9a40, 0, 10, 2)); g.add(lasLight);
        var seamDyn = dynLine(8, kit.line(0xffe9c4, 1, true), false); g.add(seamDyn);
        var SPK = particles(kit, 180, 0.22); g.add(SPK.obj);
        var sparks = [];
        function emit(ex, ey, ez, n) {
            for (var q = 0; q < n; q++) {
                var sp = rand(1.5, 4.5), life = rand(0.3, 0.9);
                sparks.push({ x: ex, y: ey, z: ez, vx: rand(-1, 1) * sp * 0.7, vy: rand(0.1, 1) * sp, vz: rand(-1, 1) * sp * 0.7, life: life, max: life });
            }
            if (sparks.length > 180) sparks.splice(0, sparks.length - 180);
        }
        function seamPoint(d, out) {               // point at distance d along the seam loop
            for (var k = 0; k < 4; k++) {
                var ax = SEAM[k][0], az = SEAM[k][1], bx = SEAM[k + 1][0], bz = SEAM[k + 1][1], sl = Math.abs(bx - ax) + Math.abs(bz - az);
                if (d <= sl || k === 3) { var f = clamp(d / sl, 0, 1); out[0] = ax + (bx - ax) * f; out[1] = az + (bz - az) * f; return k; }
                d -= sl;
            }
        }
        var _sp = [0, 0];
        function stepLaser(dt) {
            var C = slotC(4), py = TOPY + PT, cx = C.g.position.x, top = py + PART.lid.hi, welding = false, L3 = LAS;
            var active = LN.st === 'dwell' && !ST[4].done && C.stage === 4;
            switch (L3.st) {
                case 'home': L3.home(dt); if (active) L3.st = 'move'; break;
                case 'move':
                    var a = approach1(L3.hx, cx + SEAM[0][0], dt, 3, 14, 0.004), b = approach1(L3.hz, CZ + SEAM[0][1], dt, 3, 14, 0.004), c = approach1(L3.hy, top + 0.55, dt, 3, 14, 0.004);
                    if (a && b && c) { L3.st = 'weld'; L3.tm = 0; }
                    break;
                case 'weld':
                    L3.tm += dt; var u = Math.min(1, L3.tm / 2.6), seg = seamPoint(u * SEAM_LEN, _sp);
                    L3.hx.x = cx + _sp[0]; L3.hz.x = CZ + _sp[1]; L3.hx.v = L3.hz.v = 0; welding = true;
                    var arr = seamDyn.geometry.attributes.position.array, n = 0;
                    for (var k = 0; k <= seg; k++) { arr[n * 3] = cx + SEAM[k][0]; arr[n * 3 + 1] = top + 0.005; arr[n * 3 + 2] = CZ + SEAM[k][1]; n++; }
                    arr[n * 3] = L3.hx.x; arr[n * 3 + 1] = top + 0.005; arr[n * 3 + 2] = L3.hz.x; n++;
                    seamDyn.geometry.setDrawRange(0, n); seamDyn.geometry.attributes.position.needsUpdate = true;
                    if (Math.random() < dt * 45) emit(L3.hx.x, top, L3.hz.x, 2 + (Math.random() * 3 | 0));
                    if (u >= 1) { C.stage = 5; ST[4].done = true; L3.st = 'up'; }
                    break;
                case 'up': if (approach1(L3.hy, top + 1.2, dt, 3, 14, 0.004)) L3.st = 'home'; break;
            }
            seamDyn.visible = welding;
            beam.visible = welding; beam.scale.y = Math.max(0.01, L3.hy.x - top);
            if (welding) {
                lasDot.position.set(L3.hx.x, top + 0.02, L3.hz.x); kit.op(lasDot.material, rand(0.6, 1));
                lasLight.position.set(L3.hx.x, top + 0.5, L3.hz.x + 0.6); kit.lightI(lasLight, rand(1.4, 2.4));
            } else { kit.op(lasDot.material, 0); kit.lightI(lasLight, 0); }
            for (var s = sparks.length - 1; s >= 0; s--) {
                var p = sparks[s];
                p.life -= dt;
                if (p.life <= 0) { sparks.splice(s, 1); continue; }
                var dr = Math.exp(-1.3 * dt);
                p.vx *= dr; p.vz *= dr; p.vy = p.vy * dr - 9.81 * dt;
                p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
                var floor = Math.abs(p.z - CZ) < 0.6 ? TOPY : 0.02;
                if (p.y < floor) { p.y = floor; p.vy *= -0.3; p.vx *= 0.5; p.vz *= 0.5; }
            }
            for (var s3 = 0; s3 < SPK.n; s3++) {
                if (s3 >= sparks.length) { SPK.hide(s3); continue; }
                var sp2 = sparks[s3], kk = sp2.life / sp2.max;
                _c.setRGB(1, 0.45 + 0.5 * kk, 0.12 + 0.7 * kk * kk);
                SPK.set(s3, sp2.x, sp2.y, sp2.z, _c, Math.min(1, kk * 1.6));
            }
            SPK.flush();
            LAS.set();
        }

        /* ---------- vision QC arch between weld and unload ---------- */
        var VX = (SX[4] + SX[5]) / 2, VH = 3.3;
        [-1.25, 1.25].forEach(function (z) { var p = meshE(new T.BoxGeometry(0.16, VH, 0.16), mFrame, lCyanS); p.position.set(VX, VH / 2, CZ + z); g.add(p); });
        var vBeam = meshE(new T.BoxGeometry(0.22, 0.22, 2.7), mDark, lCyan); vBeam.position.set(VX, VH, CZ); g.add(vBeam);
        var cam = meshE(new T.BoxGeometry(0.5, 0.4, 0.55), mDark, lCyan); cam.position.set(VX, VH - 0.3, CZ); g.add(cam);
        var lens = new T.Mesh(new T.CylinderGeometry(0.13, 0.16, 0.18, 14), mJoint); lens.position.set(VX, VH - 0.58, CZ); g.add(lens);
        var fanMat = kit.glass(COL.cyan, 0.04, true);
        var fan = new T.Mesh(new T.ConeGeometry(1.1, VH - 0.7 - TOPY, 4, 1, true), fanMat); fan.rotation.y = Math.PI / 4;
        fan.scale.set(0.35, 1, 1); fan.position.set(VX, (VH - 0.67 + TOPY) / 2, CZ); g.add(fan);
        var scanBar = new T.Mesh(new T.BoxGeometry(0.04, 0.02, 1.0), kit.glass(COL.cyan, 0, true)); g.add(scanBar);
        var qcLbl = new Label(kit, COL.green, 0.45); qcLbl.sprite.position.set(VX, VH + 0.55, CZ); g.add(qcLbl.sprite);
        function stepVision(dt) {
            var scan = null;
            carriers.forEach(function (C) {
                if (C.lane !== 0 || C.stage !== 5) return;
                var dx = C.g.position.x - VX;
                if (Math.abs(dx) < 0.8) scan = C;
                if (dx > 0 && dx < 1.5 && !C.qc) { C.qc = true; C.flash = 1; LN.qc++; }
            });
            kit.op(fanMat, scan ? 0.16 + 0.06 * Math.sin(t * 30) : 0.035);
            if (scan) {
                var top = TOPY + PT + PART.unit.hi + 0.01;
                scanBar.position.set(scan.g.position.x + 0.5 * Math.sin(t * 9), top, CZ);
                kit.op(scanBar.material, 0.9);
            } else kit.op(scanBar.material, 0);
            carriers.forEach(function (C) {
                if (C.flash > 0) C.flash = Math.max(0, C.flash - dt / 1.2);
                kit.op(C.tag.material, C.stage === 5 ? 0.9 * C.flash : 0);
            });
            if (tick) qcLbl.set('QC VISION · PASS ' + LN.qc + '/' + LN.qc);
        }

        /* ---------- labels ---------- */
        var SNAME = ['01 LOAD', '02 PCB INSERT', '03 SCREW ×4', '04 LID', '05 LASER WELD', '06 UNLOAD'];
        var slbl = SX.map(function (x) { var l = new Label(kit, COL.cyan, 0.46); l.sprite.position.set(x, 5.6, -1.4); g.add(l.sprite); return l; });
        var ARM_TXT = { idle: 'READY', toPick: 'PICK', pickDown: 'PICK', grip: 'GRIP', pickUp: 'LIFT', carry: 'WAIT', toPlace: 'MOVE', placeDown: 'PLACE', release: 'RELEASE', placeUp: 'RETRACT' };
        var GAN_TXT = { home: 'READY', move: 'MOVE', down: 'FEED', drive: 'DRIVE', up: 'RETRACT', weld: 'WELDING' };
        var lineLbl = new Label(kit, COL.amber, 0.6, 'left'); lineLbl.sprite.position.set(-HALF + 0.2, 0.2, 2.2); g.add(lineLbl.sprite);
        var lineLbl2 = new Label(kit, COL.amber, 0.6, 'left'); lineLbl2.sprite.position.set(1.5, 0.2, 2.2); g.add(lineLbl2.sprite);
        function updateLabels() {
            arms.forEach(function (A, k) {
                var m = armStation[k], s = ARM_TXT[A.st];
                if (A.vac && (A.st === 'grip' || A.st === 'pickUp' || A.st === 'carry' || A.st === 'toPlace' || A.st === 'placeDown')) s = 'VAC ON · ' + s;
                slbl[m].set(SNAME[m] + ' · ' + s);
            });
            slbl[2].set(SNAME[2] + ' · ' + (SCR.st === 'home' ? 'READY' : GAN_TXT[SCR.st] + ' ' + Math.min(4, slotC(2).nScrew) + '/4'));
            slbl[4].set(SNAME[4] + ' · ' + GAN_TXT[LAS.st]);
            lineLbl.set('LINE A1 · ' + NC + ' CARRIERS · ' + (LN.st === 'index' ? 'INDEXING ▶' : 'DWELL'));
            lineLbl2.set('CYCLE ' + (LN.last ? LN.last.toFixed(1) : '--') + ' s · OUTPUT ' + LN.out + ' u');
        }

        /* --- Drones --- */
        function buildDrone(scale, seed) {
            var D = { g: new T.Group(), blades: [], seed: seed, base: new T.Vector3(), sp: new Spring(3, 1.3) };
            D.g.scale.setScalar(scale);
            D.g.add(meshE(new T.BoxGeometry(0.9, 0.25, 0.9), kit.solid(0x111827, 0.96, 0.1), lCyan));
            [Math.PI / 4, -Math.PI / 4].forEach(function (r) { var arm = new T.Mesh(new T.BoxGeometry(2.1, 0.07, 0.1), kit.solid(COL.amber, 0.95, 0.3)); arm.rotation.y = r; D.g.add(arm); });
            var discMat = kit.glass(COL.white, 0.1), bladeGeo = new T.BoxGeometry(0.8, 0.02, 0.07), mB = kit.solid(COL.white, 0.7, 0.4);
            [[0.74, 0.74], [-0.74, 0.74], [0.74, -0.74], [-0.74, -0.74]].forEach(function (p, i) {
                var motor = new T.Mesh(new T.CylinderGeometry(0.1, 0.1, 0.16, 10), mJoint); motor.position.set(p[0], 0.1, p[1]); D.g.add(motor);
                var disc = new T.Mesh(new T.CircleGeometry(0.42, 24), discMat); disc.rotation.x = -Math.PI / 2; disc.position.set(p[0], 0.2, p[1]); D.g.add(disc);
                var bl = new T.Mesh(bladeGeo, mB); bl.position.set(p[0], 0.21, p[1]); bl.userData.dir = i === 0 || i === 3 ? 1 : -1; D.g.add(bl); D.blades.push(bl);
            });
            var gL = glowSprite(kit, COL.green, 0.6, 0.9); gL.position.set(0.74, 0, -0.74); D.g.add(gL);
            var rL = glowSprite(kit, COL.red, 0.6, 0.9); rL.position.set(-0.74, 0, -0.74); D.g.add(rL);
            D.strobe = glowSprite(kit, COL.white, 1.4, 0); D.strobe.position.set(0, 0.2, 0); D.g.add(D.strobe);
            var cone = new T.Mesh(new T.ConeGeometry(2.3, 7, 28, 1, true), kit.glass(COL.cyan, 0.05, true)); cone.position.y = -3.5; D.g.add(cone);
            D.ring = new T.Mesh(new T.RingGeometry(1.5, 1.68, 48), kit.glass(COL.cyan, 0.4, true)); D.ring.rotation.x = -Math.PI / 2; g.add(D.ring);
            g.add(D.g);
            return D;
        }
        var drones = [buildDrone(1, 0), buildDrone(0.75, 0.5)];
        var droneLbl = new Label(kit, COL.cyan, 0.65); g.add(droneLbl.sprite);
        var PATHS = [{ cx: 0, cy: 9.2, cz: 1, ax: 12, wx: 0.22, az: 3, wz: 0.31, ph: 0 }, { cx: 1, cy: 7.0, cz: -4.5, ax: 9, wx: 0.17, az: 2.4, wz: 0.4, ph: 2.4 }];

        /* --- PCB backdrop --- */
        var pcb = new T.Group(); pcb.position.set(0, 6.8, -11.5); g.add(pcb);
        pcb.add(meshE(new T.PlaneGeometry(48, 12), kit.glass(0x0f3d2e, 0.14), kit.line(COL.amber, 0.3)));
        var traces = [], tp = [];
        for (var tr = 0; tr < 16; tr++) {
            var x0 = rand(-23, 23), y0 = rand(-5.4, 5.4), pts = [[x0, y0]], len = 0;
            for (var sg = 0; sg < 4; sg++) {
                var last = pts[pts.length - 1], horiz = sg % 2 === 0;
                var nx = horiz ? clamp(last[0] + rand(-7, 7), -23.5, 23.5) : last[0], ny = horiz ? last[1] : clamp(last[1] + rand(-3, 3), -5.6, 5.6);
                pts.push([nx, ny]); len += Math.abs(nx - last[0]) + Math.abs(ny - last[1]);
                tp.push(last[0], last[1], 0.02, nx, ny, 0.02);
            }
            var pulse = glowSprite(kit, COL.cyan, 0.7, 0.9); pcb.add(pulse);
            traces.push({ pts: pts, len: Math.max(len, 0.1), sp: rand(2, 5), off: rand(0, 20), s: pulse });
        }
        pcb.add(lines(tp, kit.line(COL.amber, 0.28)));
        for (var chp = 0; chp < 4; chp++) {
            var chip = meshE(new T.BoxGeometry(2.4, 1.6, 0.25), kit.solid(0x0b1220, 0.96, 0.05), kit.line(COL.amber, 0.7));
            chip.position.set(-15 + chp * 10 + rand(-2, 2), rand(-3, 3), 0.15); pcb.add(chip);
        }

        function update(dt) {
            /* line indexing + carriers on the loop */
            stepLine(dt);
            var s0 = lineS();
            carriers.forEach(function (C) {
                pathAt(OFF + C.i * PITCH + s0, _p);
                C.g.position.set(_p.x, _p.y, CZ); C.lane = _p.lane;
                showStage(C);
            });
            for (var i = 0; i < cleatsT.length; i++) {
                var u = ((i + s0) % (2 * HALF) + 2 * HALF) % (2 * HALF);
                cleatsT[i].position.x = u - HALF; cleatsB[i].position.x = HALF - u;
            }
            drums.forEach(function (d) { d.rotation.y = -s0 / 0.2; });
            elevs.forEach(function (E) {
                var on = null;
                for (var k = 0; k < carriers.length; k++) if (carriers[k].lane === E.lane) { on = carriers[k]; break; }
                if (on) { E.y.x = on.g.position.y; E.y.v = 0; } else approach1(E.y, E.rest, dt, 2.5, 8, 0.005);
                E.plat.position.y = E.y.x - 0.03;
            });
            /* stations */
            arms.forEach(function (A) { if (!A.manual) stepArm(A, dt); poseArm(A); });
            stepScrew(dt);
            stepLaser(dt);
            stepVision(dt);
            agvs.forEach(function (V2) { stepAgv(V2, dt); });
            if (tick) updateLabels();
            /* drones: position on a smooth path, bank angle from the path's acceleration (a = g·tanθ) */
            drones.forEach(function (D, k) {
                var p = PATHS[k], ph = p.ph;
                var x = p.cx + p.ax * Math.sin(p.wx * t + ph), z = p.cz + p.az * Math.sin(p.wz * t + ph * 1.3);
                var y = p.cy + 0.6 * Math.sin(0.7 * t + ph) + noise(t * 1.3, k * 5) * 0.12;
                var ax = -p.ax * p.wx * p.wx * Math.sin(p.wx * t + ph), az = -p.az * p.wz * p.wz * Math.sin(p.wz * t + ph * 1.3);
                D.base.set(x, y, z); D.sp.step(dt); D.g.position.copy(D.base).add(D.sp.o);
                D.g.rotation.set(Math.atan(az / 9.81) * 2.4 + noise(t * 2, k) * 0.02, 0.35 * Math.sin(t * 0.1 + k), -Math.atan(ax / 9.81) * 2.4, 'YXZ');
                D.blades.forEach(function (bl) { bl.rotation.y += bl.userData.dir * 47 * dt; });
                kit.op(D.strobe.material, ((t + D.seed) % 1.2) < 0.07 ? 1 : 0);
                D.ring.position.set(D.g.position.x, 0.04, D.g.position.z);
                D.ring.scale.setScalar(0.6 + ((t * 0.8 + D.seed) % 1) * 0.9);
                if (k === 0) {
                    droneLbl.sprite.position.set(D.g.position.x, D.g.position.y + 1.6, D.g.position.z);
                    if (tick) droneLbl.set('UAV-01 · ALT ' + y.toFixed(1) + ' m · BANK ' + Math.abs(Math.atan(ax / 9.81) * 2.4 * 57.3).toFixed(0) + '°');
                }
            });
            /* PCB pulses */
            traces.forEach(function (tr2) {
                var dd = (t * tr2.sp + tr2.off) % tr2.len, acc = 0;
                for (var k2 = 1; k2 < tr2.pts.length; k2++) {
                    var p0 = tr2.pts[k2 - 1], p1 = tr2.pts[k2], sl = Math.abs(p1[0] - p0[0]) + Math.abs(p1[1] - p0[1]);
                    if (acc + sl >= dd) { var uu = sl ? (dd - acc) / sl : 0; tr2.s.position.set(p0[0] + (p1[0] - p0[0]) * uu, p0[1] + (p1[1] - p0[1]) * uu, 0.05); break; }
                    acc += sl;
                }
            });
        }
        /* --- grab a robot by its wrist and drive it yourself; it resumes its job when released --- */
        var picks = [];
        arms.forEach(function (A) {
            picks.push({
                r: 1.4, pos: function (out) { return out.set(A.tool.x, A.tool.y - 0.4, A.tool.z); },
                grab: function () { A.manual = true; },
                drag: function (pt) {
                    var sx = A.bx, sz = BZ, dx = pt.x - sx, dy = Math.max(0.9, pt.y + 0.4) - SHY, dz = pt.z - sz;
                    var d = Math.hypot(dx, dy, dz), k = d > L1 + L2 - 0.15 ? (L1 + L2 - 0.15) / d : 1;
                    if (Math.hypot(dx, dz) < 0.4) dx = 0.4;
                    A.tool.x = sx + dx * k; A.tool.y = SHY + dy * k; A.tool.z = sz + dz * k;
                },
                release: function () { A.manual = false; A.tool.vx = A.tool.vy = A.tool.vz = 0; if (CYL[A.st]) cylInit(A); }
            });
        });
        drones.forEach(function (D, k) { picks.push(springPick(D.sp, D.base, k ? 1.5 : 2)); });
        return { kit: kit, group: g, update: update, picks: picks };
    }

    /* ================================================================== */
    /* SCENE 2 — STEM / PHYSICS LAB                                        */
    /* ================================================================== */
    var FORMULAS = [
        'F = ma', 'E = mc²', 'V = IR', 'P = VI', 'v = u + at', 's = ut + ½at²', 'λ = c / f',
        'F = Gm₁m₂ / r²', 'ΣF = 0', 'p = mv', 'W = F·d', 'Eₖ = ½mv²', 'Q = mcΔT', 'T = 2π√(L/g)',
        'sin²θ + cos²θ = 1', '∫ f(x) dx', '∇·E = ρ / ε₀', 'a² + b² = c²', 'PV = nRT', 'ω = 2πf',
        'τ = r × F', 'F = kx', 'Δx·Δp ≥ ħ/2', 'R = ρL / A'
    ];
    function buildSTEM() {
        var kit = new Kit(), g = new T.Group();
        var grid = new T.GridHelper(130, 65); grid.material = kit.add(new T.LineBasicMaterial({ color: COL.purple, opacity: 0.08 })); g.add(grid);
        var cPurple = new T.Color(COL.purple), cViolet = new T.Color(COL.violet), cCyan = new T.Color(COL.cyan);

        /* --- Spherical pendulum on a gantry (RK4) --- */
        var PV = new T.Vector3(-13, 12, -3), PL = 9, GL = Math.pow(2 * Math.PI / 3.2, 2);
        var mFrame = kit.solid(0x4c3a7a, 0.95, 0.2, 0.5), lV = kit.line(COL.violet, 0.6);
        [-4, 4].forEach(function (dx) { var post = meshE(new T.BoxGeometry(0.3, 12.6, 0.3), mFrame, lV); post.position.set(PV.x + dx, 6.3, PV.z); g.add(post); });
        var bar = meshE(new T.BoxGeometry(8.6, 0.35, 0.35), mFrame, lV); bar.position.set(PV.x, 12.6, PV.z); g.add(bar);
        var rod = dynLine(2, kit.line(COL.white, 0.6)); g.add(rod);
        var bob = new T.Mesh(new T.SphereGeometry(0.65, 32, 20), kit.add(new T.MeshStandardMaterial({ color: COL.purple, emissive: COL.purple, emissiveIntensity: 0.3, metalness: 0.7, roughness: 0.22 })));
        g.add(bob);
        var bobGlow = glowSprite(kit, COL.purple, 3, 0.45); g.add(bobGlow);
        var NTR = 170, ptrail = dynLine(NTR, fadeLineMat(kit), false, true); g.add(ptrail);
        var ptPos = ptrail.geometry.attributes.position.array, ptCol = ptrail.geometry.attributes.color.array;
        for (var i0 = 0; i0 < NTR; i0++) { var k0 = Math.pow(1 - i0 / NTR, 1.5) * 0.9; ptCol[i0 * 3] = cPurple.r * k0; ptCol[i0 * 3 + 1] = cPurple.g * k0; ptCol[i0 * 3 + 2] = cPurple.b * k0; }
        var pshMat = kit.add(new T.MeshBasicMaterial({ color: 0x000000, opacity: 0.35, depthWrite: false }));
        var pshadow = new T.Mesh(new T.CircleGeometry(0.8, 24), pshMat); pshadow.rotation.x = -Math.PI / 2; g.add(pshadow);
        // state: [θ (from vertical), φ (azimuth), θ', φ'] — angular momentum keeps it orbiting (precessing ellipse)
        var pen = [0.6, 0, 0, 1.0], pfill = false;
        function deriv(s) {
            var sn = Math.sin(s[0]), cs = Math.cos(s[0]);
            return [s[2], s[3], sn * cs * s[3] * s[3] - GL * sn, Math.abs(sn) > 0.02 ? -2 * s[2] * s[3] * cs / sn : 0];
        }
        function addS(s, k, h) { return [s[0] + k[0] * h, s[1] + k[1] * h, s[2] + k[2] * h, s[3] + k[3] * h]; }
        function stepPend(dt) {
            var n = 4, h = dt / n;
            for (var i = 0; i < n; i++) {
                var k1 = deriv(pen), k2 = deriv(addS(pen, k1, h / 2)), k3 = deriv(addS(pen, k2, h / 2)), k4 = deriv(addS(pen, k3, h));
                for (var j = 0; j < 4; j++) pen[j] += (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j]) * h / 6;
            }
        }
        var penLbl = new Label(kit, COL.violet, 0.8); penLbl.sprite.position.set(PV.x, 14, PV.z); g.add(penLbl.sprite);

        /* --- Projectile with bounces --- */
        var L0 = new T.Vector3(-5, 0, 5), V0 = new T.Vector3(6.4, 8.6, -1.4);
        var ball = new T.Mesh(new T.SphereGeometry(0.38, 24, 16), kit.add(new T.MeshStandardMaterial({ color: 0xffffff, emissive: COL.violet, emissiveIntensity: 0.45, metalness: 0.3, roughness: 0.3 })));
        g.add(ball);
        var NB = 120, btrail = dynLine(NB, fadeLineMat(kit), false, true); g.add(btrail);
        var btPos = btrail.geometry.attributes.position.array, btCol = btrail.geometry.attributes.color.array;
        for (var j0 = 0; j0 < NB; j0++) { var kb = (1 - j0 / NB) * 0.85; btCol[j0 * 3] = cViolet.r * kb; btCol[j0 * 3 + 1] = cViolet.g * kb; btCol[j0 * 3 + 2] = cViolet.b * kb; }
        var bshMat = kit.add(new T.MeshBasicMaterial({ color: 0x000000, opacity: 0.35, depthWrite: false }));
        var bshadow = new T.Mesh(new T.CircleGeometry(0.45, 20), bshMat); bshadow.rotation.x = -Math.PI / 2; g.add(bshadow);
        var arrow = new T.ArrowHelper(new T.Vector3(1, 0, 0), new T.Vector3(), 1, COL.amber, 0.45, 0.28);
        kit.add(arrow.line.material); kit.add(arrow.cone.material); g.add(arrow);
        var ideal = [], tf = 2 * V0.y / 9.81;
        for (var s = 0; s <= 1.0001; s += 0.04) { var tt = s * tf; ideal.push(L0.x + V0.x * tt, V0.y * tt - 4.905 * tt * tt, L0.z + V0.z * tt); }
        var idealG = new T.BufferGeometry(); idealG.setAttribute('position', new T.Float32BufferAttribute(ideal, 3));
        g.add(new T.Points(idealG, kit.add(new T.PointsMaterial({ color: COL.violet, size: 0.14, opacity: 0.5 }))));
        var pj = { p: L0.clone(), v: V0.clone(), st: 'fly', tm: 0, sq: 0 }, bfill = false;
        var _d = new T.Vector3();
        var projLbl = new Label(kit, COL.violet, 0.7, 'left'); projLbl.sprite.position.set(L0.x, 6.6, L0.z); g.add(projLbl.sprite);
        projLbl.set('BOUNCE · e = 0.62 · g = 9.81 m/s²');

        /* --- Atom --- */
        var atom = new T.Group(); atom.position.set(13, 9, -4); g.add(atom);
        var nucl = [[0, 0, 0, 1], [0.5, 0.3, 0.1, 0], [-0.4, 0.4, -0.2, 1], [0.2, -0.5, 0.3, 0], [-0.5, -0.2, 0.3, 1], [0.4, -0.1, -0.45, 0], [-0.1, 0.2, 0.55, 1]];
        var nuc = new T.Group(); atom.add(nuc);
        var mP = kit.solid(COL.red, 0.97, 0.35, 0.3), mN = kit.solid(COL.purple, 0.97, 0.35, 0.3), sphG = new T.SphereGeometry(0.42, 18, 12);
        nucl.forEach(function (n) { var m = new T.Mesh(sphG, n[3] ? mP : mN); m.position.set(n[0], n[1], n[2]); nuc.add(m); });
        atom.add(glowSprite(kit, COL.purple, 4.5, 0.35));
        var orbits = [];
        for (var o = 0; o < 3; o++) {
            var og = new T.Group(); og.rotation.set(1.15, o * Math.PI / 3, 0, 'YXZ'); atom.add(og);
            og.add(new T.Mesh(new T.TorusGeometry(3.2, 0.025, 6, 120), kit.glass(COL.cyan, 0.35)));
            var el = new T.Mesh(new T.SphereGeometry(0.14, 12, 8), kit.glass(COL.white, 1)); og.add(el);
            el.add(glowSprite(kit, COL.cyan, 1.2, 0.8));
            var etr = dynLine(18, fadeLineMat(kit), false, true); og.add(etr);
            orbits.push({ el: el, tr: etr, sp: 1.6 + o * 0.35, ph: o * 2 });
        }

        /* --- Wave interference surface (two point sources) --- */
        var WS = mobile ? [40, 10] : [72, 18];
        var wgeo = new T.PlaneGeometry(30, 7, WS[0], WS[1]); wgeo.rotateX(-Math.PI / 2);
        var wcol = new Float32Array(wgeo.attributes.position.count * 3);
        wgeo.setAttribute('color', new T.BufferAttribute(wcol, 3));
        var wave = new T.Mesh(wgeo, kit.add(new T.MeshBasicMaterial({ wireframe: true, vertexColors: true, opacity: 0.55 })));
        wave.position.set(2, 0.35, -9.5); wave.frustumCulled = false; g.add(wave);
        var SRC = [[-5, -3.5], [5, -3.5]];
        var srcBalls = SRC.map(function (sp) { var m = new T.Mesh(new T.SphereGeometry(0.18, 12, 8), kit.glass(COL.cyan, 0.9)); m.position.set(wave.position.x + sp[0], 0.35, wave.position.z + sp[1]); g.add(m); return m; });
        var waveLbl = new Label(kit, COL.violet, 0.7); waveLbl.sprite.position.set(2, 2.4, -9.5); g.add(waveLbl.sprite);
        waveLbl.set('y = A[sin(kr₁−ωt) + sin(kr₂−ωt)]');

        /* --- Floating formulas at different depths --- */
        var forms = [], nF = mobile ? 8 : 12;
        for (var fI = 0; fI < nF; fI++) {
            var cv = document.createElement('canvas'); cv.width = 512; cv.height = 96;
            var cx = cv.getContext('2d'), col = Math.random() > 0.35 ? COL.violet : COL.cyan;
            cx.font = 'italic 56px "Cambria Math", "Times New Roman", serif'; cx.textBaseline = 'middle'; cx.textAlign = 'center';
            cx.fillStyle = hex(col); cx.shadowColor = hex(col); cx.shadowBlur = 12;
            cx.fillText(FORMULAS[fI % FORMULAS.length], 256, 50);
            var tex = new T.CanvasTexture(cv); tex.minFilter = T.LinearFilter;
            var spr = new T.Sprite(kit.add(new T.SpriteMaterial({ map: tex, depthWrite: false, opacity: 0.5 })));
            var hgt = rand(0.9, 1.7); spr.scale.set(hgt * 512 / 96, hgt, 1);
            spr.position.set(rand(-28, 28), rand(0, 24), rand(-18, 10)); g.add(spr);
            forms.push({ s: spr, v: rand(0.35, 0.8), ph: rand(0, 6.28), b: spr.position.clone(), sp: new Spring(2.5, 1.2) });
        }

        /* ================= MATH LAYER ================= */
        var penHeld = false, atomS = { rot: 0, spin: 0 }, lzS = { rot: 0, spin: 0 }, ucHeld = false, ucOff = 0, ucTheta = 0, phStart = 0;
        var feBase = new T.Vector3(15, 4.2, 5), feSp = new Spring(3, 1.4);
        var lAxis = kit.line(COL.white, 0.25), lCyanM = kit.line(COL.cyan, 0.85);
        function setL(l, a, b, c, d, e, f) {
            var p = l.geometry.attributes.position.array; p[0] = a; p[1] = b; p[2] = c; p[3] = d; p[4] = e; p[5] = f;
            l.geometry.attributes.position.needsUpdate = true;
        }
        function fadeTrail(n, c1, c2, peak, pw) {
            var tr = dynLine(n, fadeLineMat(kit), false, true), col = tr.geometry.attributes.color.array;
            for (var q = 0; q < n; q++) {
                var u = q / n, k = Math.pow(1 - u, pw || 1.3) * (peak || 0.9);
                col[q * 3] = (c1.r + (c2.r - c1.r) * u) * k; col[q * 3 + 1] = (c1.g + (c2.g - c1.g) * u) * k; col[q * 3 + 2] = (c1.b + (c2.b - c1.b) * u) * k;
            }
            tr.geometry.attributes.color.needsUpdate = true; tr.fill = false;
            return tr;
        }
        function pushTrail(tr, x, y, z) {
            var a = tr.geometry.attributes.position.array, n = a.length / 3;
            a.copyWithin(3, 0, (n - 1) * 3); a[0] = x; a[1] = y; a[2] = z;
            if (!tr.fill) { for (var q = 1; q < n; q++) { a[q * 3] = x; a[q * 3 + 1] = y; a[q * 3 + 2] = z; } tr.fill = true; }
            tr.geometry.attributes.position.needsUpdate = true;
        }
        function circlePts(r, n) {
            var p = [];
            for (var q = 0; q < n; q++) { var a0 = q / n * Math.PI * 2, a1 = (q + 1) / n * Math.PI * 2; p.push(r * Math.cos(a0), r * Math.sin(a0), 0, r * Math.cos(a1), r * Math.sin(a1), 0); }
            return p;
        }
        var TAU = Math.PI * 2;

        /* --- Unit circle → sine wave (e^{iθ} = cos θ + i sin θ) --- */
        var UC = new T.Group(); UC.position.set(-8.5, 15, -3); g.add(UC);
        var UR = 2.2, UW = 11, UN = 140, WX0 = UR + 0.8;
        UC.add(lines(circlePts(UR, 72), lCyanM));
        UC.add(lines([-UR - 0.6, 0, 0, WX0 + UW + 0.3, 0, 0, 0, -UR - 0.6, 0, 0, UR + 0.6, 0], lAxis));
        var tk = []; for (var q0 = 1; q0 <= 4; q0++) { var xx = WX0 + q0 * UW / 4; tk.push(xx, -0.18, 0, xx, 0.18, 0); }
        UC.add(lines(tk, lAxis));
        var ucRad = dynLine(2, kit.line(COL.white, 0.9)), ucSin = dynLine(2, kit.line(COL.cyan, 0.95)), ucCos = dynLine(2, kit.line(COL.violet, 0.95));
        var ucLink = dynLine(2, kit.line(COL.cyan, 0.3)), ucArc = dynLine(40, kit.line(COL.amber, 0.85)), ucWave = dynLine(UN, kit.line(COL.cyan, 0.9));
        [ucRad, ucSin, ucCos, ucLink, ucArc, ucWave].forEach(function (l) { UC.add(l); });
        var ucDot = glowSprite(kit, COL.white, 1.0, 0.95), ucDot2 = glowSprite(kit, COL.cyan, 0.9, 0.95); UC.add(ucDot); UC.add(ucDot2);
        var ucLbl = new Label(kit, COL.cyan, 0.55, 'left'); ucLbl.sprite.position.set(-UR - 0.4, UR + 0.95, 0); UC.add(ucLbl.sprite);
        var ucLbl2 = new Label(kit, COL.violet, 0.55, 'left'); ucLbl2.sprite.position.set(WX0 + 1.2, UR + 0.95, 0); UC.add(ucLbl2.sprite);
        ucLbl2.set('e^(iθ) = cos θ + i·sin θ');
        function updUnit() {
            if (ucHeld) ucOff = ucTheta - t * 0.8;
            var th = t * 0.8 + ucOff, cs = Math.cos(th), sn = Math.sin(th), px = UR * cs, py = UR * sn;
            setL(ucRad, 0, 0, 0, px, py, 0); setL(ucSin, px, 0, 0, px, py, 0); setL(ucCos, 0, 0, 0, px, 0, 0); setL(ucLink, px, py, 0, WX0, py, 0);
            var ap = ucArc.geometry.attributes.position.array, thm = ((th % TAU) + TAU) % TAU;
            for (var q = 0; q < 40; q++) { var a = thm * q / 39; ap[q * 3] = 0.6 * Math.cos(a); ap[q * 3 + 1] = 0.6 * Math.sin(a); ap[q * 3 + 2] = 0; }
            ucArc.geometry.attributes.position.needsUpdate = true;
            var wp = ucWave.geometry.attributes.position.array;
            for (var q2 = 0; q2 < UN; q2++) { var u = q2 / (UN - 1) * UW; wp[q2 * 3] = WX0 + u; wp[q2 * 3 + 1] = UR * Math.sin(th - TAU * u / UW); wp[q2 * 3 + 2] = 0; }
            ucWave.geometry.attributes.position.needsUpdate = true;
            ucDot.position.set(px, py, 0); ucDot2.position.set(WX0, py, 0);
            if (tick) ucLbl.set('θ ' + (thm * 57.2958).toFixed(0) + '° · sin ' + sn.toFixed(2) + ' · cos ' + cs.toFixed(2));
        }

        /* --- Fourier epicycles: rotating circles c_k·e^{ikt} add up to draw a shape --- */
        function dft(xs, ys, K) {
            var N = xs.length, out = [];
            for (var k = -K; k <= K; k++) {
                var re = 0, im = 0;
                for (var n = 0; n < N; n++) { var a = -k * n / N * TAU, c = Math.cos(a), s = Math.sin(a); re += xs[n] * c - ys[n] * s; im += xs[n] * s + ys[n] * c; }
                re /= N; im /= N;
                var r = Math.hypot(re, im);
                if (r > 2e-3) out.push({ k: k, r: r, ph: Math.atan2(im, re) });
            }
            return out.sort(function (p, q) { return q.r - p.r; });
        }
        var hxs = [], hys = [], sxs = [], sys = [], NSF = 512;
        for (var n0 = 0; n0 < NSF; n0++) {           // heart: x = 16 sin³t, y = 13cos t − 5cos 2t − 2cos 3t − cos 4t
            var s0 = n0 / NSF * TAU, sn0 = Math.sin(s0);
            hxs.push(16 * sn0 * sn0 * sn0 * 0.13); hys.push((13 * Math.cos(s0) - 5 * Math.cos(2 * s0) - 2 * Math.cos(3 * s0) - Math.cos(4 * s0)) * 0.13);
        }
        var STV = []; for (var q1 = 0; q1 <= 10; q1++) { var sa = Math.PI / 2 + q1 * Math.PI / 5, sr = (q1 % 2 ? 0.42 : 1) * 2.4; STV.push([sr * Math.cos(sa), sr * Math.sin(sa)]); }
        for (var n1 = 0; n1 < NSF; n1++) {           // five-point star, sampled along its outline
            var f = n1 / NSF * 10, e0 = Math.floor(f), fr = f - e0;
            sxs.push(STV[e0][0] + (STV[e0 + 1][0] - STV[e0][0]) * fr); sys.push(STV[e0][1] + (STV[e0 + 1][1] - STV[e0][1]) * fr);
        }
        var SHAPES = [{ name: 'HEART', c: dft(hxs, hys, 6) }, { name: 'STAR', c: dft(sxs, sys, 40) }];
        var FE = new T.Group(); FE.position.set(15, 4.2, 5); FE.scale.setScalar(1.3); g.add(FE);
        var MAXC = 0; SHAPES.forEach(function (sh) { MAXC = Math.max(MAXC, sh.c.length); });
        var unitCirc = new T.BufferGeometry(), ucp = [];
        for (var q3 = 0; q3 < 48; q3++) { var a3 = q3 / 48 * TAU; ucp.push(Math.cos(a3), Math.sin(a3), 0); }
        unitCirc.setAttribute('position', new T.Float32BufferAttribute(ucp, 3));
        var feCircMat = kit.line(COL.violet, 0.45), feCircles = [];
        for (var q4 = 0; q4 < MAXC; q4++) { var lc = new T.LineLoop(unitCirc, feCircMat); FE.add(lc); feCircles.push(lc); }
        var feArms = dynLine(MAXC + 1, kit.line(COL.white, 0.7)); FE.add(feArms);
        var FEN = 320, fePath = fadeTrail(FEN, new T.Color(0xffffff), new T.Color(COL.cyan), 1, 0.3); FE.add(fePath);
        var feTip = glowSprite(kit, COL.cyan, 1.1, 1); FE.add(feTip);
        var feLbl = new Label(kit, COL.violet, 0.55); feLbl.sprite.position.set(0, -3.3, 0); FE.add(feLbl.sprite);
        var feLbl2 = new Label(kit, COL.cyan, 0.5); feLbl2.sprite.position.set(0, -3.85, 0); FE.add(feLbl2.sprite);
        feLbl2.set('z(t) = Σ cₖ · e^(ikt)');
        var FW = 0.6;
        function epi(cs, tau, out) {
            var x = 0, y = 0;
            for (var k = 0; k < cs.length; k++) { var c = cs[k], a = c.k * tau + c.ph; x += c.r * Math.cos(a); y += c.r * Math.sin(a); }
            out[0] = x; out[1] = y;
        }
        var _e = [0, 0];
        function updFourier(dt) {
            feSp.step(dt); FE.position.copy(feBase).add(feSp.o);
            var tau = t * FW, cyc = Math.floor(tau / TAU), sh = SHAPES[cyc % 2], cs = sh.c;
            var ap = feArms.geometry.attributes.position.array, x = 0, y = 0;
            ap[0] = 0; ap[1] = 0; ap[2] = 0;
            for (var k = 0; k < MAXC; k++) {
                var C = feCircles[k];
                if (k >= cs.length) { C.visible = false; ap[(k + 1) * 3] = x; ap[(k + 1) * 3 + 1] = y; ap[(k + 1) * 3 + 2] = 0; continue; }
                var c = cs[k], a = c.k * tau + c.ph;
                C.visible = true; C.position.set(x, y, 0); C.scale.setScalar(Math.max(c.r, 1e-3));
                x += c.r * Math.cos(a); y += c.r * Math.sin(a);
                ap[(k + 1) * 3] = x; ap[(k + 1) * 3 + 1] = y; ap[(k + 1) * 3 + 2] = 0;
            }
            feArms.geometry.attributes.position.needsUpdate = true;
            feTip.position.set(x, y, 0);
            // the drawn path: only the part already traced in this cycle, so each shape draws itself from scratch
            var done = tau - cyc * TAU, pp = fePath.geometry.attributes.position.array;
            for (var q = 0; q < FEN; q++) { epi(cs, tau - Math.min(done, TAU * 0.995) * q / (FEN - 1), _e); pp[q * 3] = _e[0]; pp[q * 3 + 1] = _e[1]; pp[q * 3 + 2] = 0; }
            fePath.geometry.attributes.position.needsUpdate = true;
            if (tick) feLbl.set('FOURIER · ' + sh.name + ' · ' + cs.length + ' CIRCLES');
        }

        /* --- Lorenz attractor (chaos), integrated live with RK4 --- */
        var LZ = new T.Group(); LZ.position.set(17.5, 12.2, -13); LZ.scale.setScalar(0.17); g.add(LZ);
        var lz = [1, 1, 1], LSIG = 10, LRHO = 28, LBET = 8 / 3, LH = 0.005, NLZ = mobile ? 800 : 1500;
        function lzD(s) { return [LSIG * (s[1] - s[0]), s[0] * (LRHO - s[2]) - s[1], s[0] * s[1] - LBET * s[2]]; }
        function lzStep() {
            var k1 = lzD(lz), k2 = lzD([lz[0] + k1[0] * LH / 2, lz[1] + k1[1] * LH / 2, lz[2] + k1[2] * LH / 2]);
            var k3 = lzD([lz[0] + k2[0] * LH / 2, lz[1] + k2[1] * LH / 2, lz[2] + k2[2] * LH / 2]), k4 = lzD([lz[0] + k3[0] * LH, lz[1] + k3[1] * LH, lz[2] + k3[2] * LH]);
            for (var j = 0; j < 3; j++) lz[j] += (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j]) * LH / 6;
        }
        for (var w0 = 0; w0 < 1500; w0++) lzStep();
        var lzTrail = fadeTrail(NLZ, new T.Color(COL.cyan), new T.Color(COL.purple), 1); LZ.add(lzTrail);
        for (var w1 = NLZ; w1 > 0; w1--) { lzStep(); pushTrail(lzTrail, lz[0], lz[2], lz[1]); }
        var lzHead = glowSprite(kit, COL.white, 6, 1); LZ.add(lzHead);
        var lzLbl = new Label(kit, COL.cyan, 0.55); lzLbl.sprite.position.set(17.5, 21.8, -13); g.add(lzLbl.sprite);
        lzLbl.set('LORENZ · σ=10 ρ=28 β=8/3');
        var lzAcc = 0;
        function updLorenz(dt) {
            lzAcc += dt * 0.55;                         // simulated seconds per real second
            while (lzAcc > LH) { lzAcc -= LH; lzStep(); pushTrail(lzTrail, lz[0], lz[2], lz[1]); }
            lzHead.position.set(lz[0], lz[2], lz[1]);
            lzS.rot += dt * lzS.spin; lzS.spin *= Math.exp(-dt * 0.6); LZ.rotation.y = 0.35 * Math.sin(t * 0.07) + lzS.rot;
        }

        /* --- Phyllotaxis: sunflower seeds at the golden angle 137.5° --- */
        var NPH = mobile ? 220 : 380, GOLD = Math.PI * (3 - Math.sqrt(5)), PHY = particles(kit, NPH, 0.34);
        PHY.obj.position.set(-11, 0.08, 9); g.add(PHY.obj);
        var phLbl = new Label(kit, COL.amber, 0.5); phLbl.sprite.position.set(-11, 1.0, 12.4); g.add(phLbl.sprite);
        phLbl.set('GOLDEN ANGLE 137.5° · r = c·√n');
        var cAmber = new T.Color(COL.amber);
        function updPhyllo() {
            var grow = ((t - phStart) * 40) % (NPH + 140);
            for (var n = 0; n < NPH; n++) {
                if (n > grow) { PHY.hide(n); continue; }
                var r = 0.17 * Math.sqrt(n), a = n * GOLD + t * 0.08, u = n / NPH;
                _c.copy(cAmber).lerp(cPurple, u);
                PHY.set(n, r * Math.cos(a), 0, r * Math.sin(a), _c, Math.min(1, (grow - n) / 12) * (grow > NPH + 100 ? (NPH + 140 - grow) / 40 : 1));
            }
            PHY.flush();
        }

        /* --- Math solids flying round the whole stage (they pass in front of the camera) --- */
        function mobiusGeo() {
            var pos = [], idx = [], NU = 60, NV = 5;
            for (var iu = 0; iu <= NU; iu++) for (var iv = 0; iv <= NV; iv++) {
                var u = iu / NU * TAU, v = (iv / NV - 0.5) * 0.9, r = 1.05 + v * Math.cos(u / 2);
                pos.push(r * Math.cos(u), r * Math.sin(u), v * Math.sin(u / 2));
            }
            for (var a = 0; a < NU; a++) for (var b = 0; b < NV; b++) { var i1 = a * (NV + 1) + b, i2 = i1 + NV + 1; idx.push(i1, i2, i1 + 1, i2, i2 + 1, i1 + 1); }
            var geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
            return geo;
        }
        var FLYDEF = [
            { geo: new T.IcosahedronGeometry(1.15, 0), col: COL.cyan, txt: 'ICOSAHEDRON · V − E + F = 2' },
            { geo: new T.DodecahedronGeometry(1.15, 0), col: COL.violet, txt: 'DODECAHEDRON · φ = (1+√5)/2' },
            { geo: new T.TorusKnotGeometry(0.75, 0.2, 64, 6, 2, 3), col: COL.purple, txt: 'TREFOIL KNOT (2, 3)', wire: true },
            { geo: mobiusGeo(), col: COL.cyan, txt: 'MÖBIUS STRIP · ONE SIDE', wire: true },
            { geo: new T.OctahedronGeometry(1.2, 0), col: COL.amber, txt: 'OCTAHEDRON · V = (√2/3)a³' }
        ];
        var flyers = FLYDEF.map(function (d, i) {
            var F = { g: new T.Group(), ph: i / FLYDEF.length * TAU, R: 22 + (i % 3) * 1.6, i: i, base: new T.Vector3(), sp: new Spring(3.5, 1.4), spin: 0 };
            F.g.add(new T.Mesh(d.geo, kit.glass(d.col, 0.1)));
            F.g.add(new T.LineSegments(d.wire ? new T.WireframeGeometry(d.geo) : edgesOf(d.geo), kit.line(d.col, d.wire ? 0.5 : 0.95, true)));
            F.g.add(glowSprite(kit, d.col, 3.2, 0.25));
            g.add(F.g);
            var cc = new T.Color(d.col);
            F.tr = fadeTrail(mobile ? 50 : 90, cc, cc, 0.7); g.add(F.tr);
            F.lbl = new Label(kit, d.col, 0.42); F.lbl.set(d.txt); g.add(F.lbl.sprite);
            return F;
        });
        function updFlyers(dt) {
            flyers.forEach(function (F) {
                var a = t * 0.12 + F.ph;
                var x = F.R * Math.sin(a), z = 4 + 16 * Math.cos(a) + 2 * Math.sin(a * 3 + F.i);
                var y = 8.5 + 4.5 * Math.sin(2 * a + F.i) + 1.2 * Math.sin(t * 0.6 + F.i);
                F.base.set(x, y, z); F.sp.step(dt); F.g.position.copy(F.base).add(F.sp.o);
                var gp = F.g.position; F.spin *= Math.exp(-dt * 0.7);
                F.g.rotation.x += dt * (0.5 + 0.1 * F.i + F.spin); F.g.rotation.y += dt * (0.8 - 0.07 * F.i + F.spin);
                F.lbl.sprite.position.set(gp.x, gp.y + 1.9, gp.z);
                if (dt) pushTrail(F.tr, gp.x, gp.y, gp.z);
            });
        }

        /* --- Math symbols swooping past the viewer --- */
        var SYMS = ['π', 'Σ', '∫', '√', '∞', 'Δ', 'θ', '∂', 'λ', 'EULER'];
        var SCOL = [COL.cyan, COL.violet, COL.purple, COL.cyan, COL.amber, COL.violet, COL.cyan, COL.purple, COL.violet, COL.amber];
        var nSym = mobile ? 6 : SYMS.length;
        var syms = [];
        for (var si = 0; si < nSym; si++) {
            var euler = SYMS[si] === 'EULER', cvs = document.createElement('canvas');
            cvs.width = euler ? 900 : 256; cvs.height = 256;
            var x2 = cvs.getContext('2d'), sc = hex(SCOL[si]);
            x2.fillStyle = sc; x2.shadowColor = sc; x2.shadowBlur = 18; x2.textBaseline = 'middle';
            if (euler) {                                 // e^{iπ} + 1 = 0 with a real superscript
                var big = 'italic 150px "Cambria Math", "Times New Roman", serif', small = 'italic 80px "Cambria Math", "Times New Roman", serif';
                x2.textAlign = 'left';
                x2.font = big; x2.fillText('e', 30, 150); var ex = 30 + x2.measureText('e').width + 6;
                x2.font = small; x2.fillText('iπ', ex, 78); ex += x2.measureText('iπ').width + 10;
                x2.font = big; x2.fillText('+ 1 = 0', ex, 150);
            } else {
                x2.font = 'italic 200px "Cambria Math", "Times New Roman", serif'; x2.textAlign = 'center';
                x2.fillText(SYMS[si], 128, 140);
            }
            var stex = new T.CanvasTexture(cvs); stex.minFilter = T.LinearFilter;
            var ssp = new T.Sprite(kit.add(new T.SpriteMaterial({ map: stex, depthWrite: false, opacity: 0.85 })));
            var sh2 = euler ? 2.1 : 2.4; ssp.scale.set(sh2 * cvs.width / 256, sh2, 1);
            g.add(ssp);
            var scc = new T.Color(SCOL[si]);
            var str = fadeTrail(36, scc, scc, 0.6); g.add(str);
            syms.push({ s: ssp, tr: str, ph: si / nSym * TAU, i: si, R: 13 + (si % 4) * 2.2, base: new T.Vector3(), sp: new Spring(3.5, 1.4), spin: 0, r: euler ? 2.6 : 1.5 });
        }
        function updSymbols(dt) {
            syms.forEach(function (S) {
                var a = -t * 0.19 + S.ph;                 // opposite direction to the solids
                var x = S.R * Math.sin(a) + 3 * Math.sin(a * 2.3 + S.i);
                var z = 11 + 13 * Math.cos(a);             // nearest point ≈ 24 → swoops right past the camera
                var y = 9 + 5 * Math.sin(a * 1.7 + S.i * 1.3) + 1.5 * Math.cos(t * 0.5 + S.i);
                S.base.set(x, y, z); S.sp.step(dt); S.s.position.copy(S.base).add(S.sp.o);
                S.spin *= Math.exp(-dt * 0.8); S.rot = (S.rot || 0) + S.spin * dt;
                S.s.material.rotation = 0.25 * Math.sin(t * 0.7 + S.i) + S.rot;
                if (dt) pushTrail(S.tr, S.s.position.x, S.s.position.y, S.s.position.z);
            });
        }

        function update(dt) {
            /* pendulum */
            if (dt && !penHeld) stepPend(dt);
            var sn = Math.sin(pen[0]);
            var bx = PV.x + PL * sn * Math.cos(pen[1]), by = PV.y - PL * Math.cos(pen[0]), bz = PV.z + PL * sn * Math.sin(pen[1]);
            bob.position.set(bx, by, bz); bobGlow.position.copy(bob.position);
            var ra = rod.geometry.attributes.position.array; ra[0] = PV.x; ra[1] = PV.y; ra[2] = PV.z; ra[3] = bx; ra[4] = by; ra[5] = bz;
            rod.geometry.attributes.position.needsUpdate = true;
            if (dt) {
                ptPos.copyWithin(3, 0, (NTR - 1) * 3); ptPos[0] = bx; ptPos[1] = by; ptPos[2] = bz;
                if (!pfill) { for (var f0 = 1; f0 < NTR; f0++) { ptPos[f0 * 3] = bx; ptPos[f0 * 3 + 1] = by; ptPos[f0 * 3 + 2] = bz; } pfill = true; }
                ptrail.geometry.attributes.position.needsUpdate = true;
            }
            pshadow.position.set(bx, 0.03, bz); pshadow.scale.setScalar(1 + (by / 12) * 0.8); kit.op(pshMat, 0.35 * (1 - by / 16));
            if (tick) penLbl.set('SPHERICAL PENDULUM · θ ' + (pen[0] * 57.3).toFixed(1) + '° · φ ' + (((pen[1] * 57.3) % 360 + 360) % 360).toFixed(0) + '°');

            /* projectile */
            pj.tm += dt; pj.sq = Math.max(0, pj.sq - dt * 6);
            if (pj.st === 'fly') {
                pj.v.y -= 9.81 * dt; pj.p.addScaledVector(pj.v, dt);
                if (pj.p.y <= 0) {
                    pj.p.y = 0; pj.sq = Math.min(1, -pj.v.y / V0.y);
                    pj.v.y = -pj.v.y * 0.62; pj.v.x *= 0.8; pj.v.z *= 0.8;
                    if (pj.v.y < 0.8) { pj.v.y = 0; pj.st = 'roll'; }
                }
            } else if (pj.st === 'roll') {
                var sp = Math.hypot(pj.v.x, pj.v.z), ns = Math.max(0, sp - 1.6 * dt);
                if (sp > 0) { pj.v.x *= ns / sp; pj.v.z *= ns / sp; }
                pj.p.addScaledVector(pj.v, dt);
                if (ns <= 0) { pj.st = 'rest'; pj.tm = 0; }
            } else if (pj.st === 'rest' && pj.tm > 1.3) {
                pj.p.copy(L0); pj.v.copy(V0); pj.st = 'fly'; bfill = false;
            }
            var br = 0.38, sq = pj.sq * 0.35;
            ball.position.set(pj.p.x, pj.p.y + br * (1 - sq), pj.p.z); ball.scale.set(1 + sq, 1 - sq, 1 + sq);
            if (dt) {
                btPos.copyWithin(3, 0, (NB - 1) * 3); btPos[0] = ball.position.x; btPos[1] = ball.position.y; btPos[2] = ball.position.z;
                if (!bfill) { for (var f1 = 1; f1 < NB; f1++) { btPos[f1 * 3] = ball.position.x; btPos[f1 * 3 + 1] = ball.position.y; btPos[f1 * 3 + 2] = ball.position.z; } bfill = true; }
                btrail.geometry.attributes.position.needsUpdate = true;
            }
            bshadow.position.set(pj.p.x, 0.03, pj.p.z); bshadow.scale.setScalar(1 + pj.p.y * 0.12); kit.op(bshMat, 0.4 * (1 - Math.min(1, pj.p.y / 8)));
            var vl = pj.v.length();
            arrow.visible = pj.st !== 'rest' && vl > 0.3;
            if (arrow.visible) { arrow.position.copy(ball.position); _d.copy(pj.v).divideScalar(vl); arrow.setDirection(_d); arrow.setLength(0.6 + vl * 0.28, 0.45, 0.28); }

            /* atom */
            atomS.rot += dt * (0.18 + atomS.spin); atomS.spin *= Math.exp(-dt * 0.6); atom.rotation.y = atomS.rot; atom.rotation.x = 0.25 * Math.sin(t * 0.13);
            nuc.position.set(noise(t * 7) * 0.03, noise(t * 6, 2) * 0.03, 0);
            orbits.forEach(function (ob) {
                var e = t * ob.sp + ob.ph, R = 3.2;
                ob.el.position.set(R * Math.cos(e), R * Math.sin(e), 0);
                var ap = ob.tr.geometry.attributes.position.array, ac = ob.tr.geometry.attributes.color.array;
                for (var q = 0; q < 18; q++) {
                    var ee = e - q * 0.07, kk = (1 - q / 18) * 0.9;
                    ap[q * 3] = R * Math.cos(ee); ap[q * 3 + 1] = R * Math.sin(ee); ap[q * 3 + 2] = 0;
                    ac[q * 3] = cCyan.r * kk; ac[q * 3 + 1] = cCyan.g * kk; ac[q * 3 + 2] = cCyan.b * kk;
                }
                ob.tr.geometry.attributes.position.needsUpdate = true; ob.tr.geometry.attributes.color.needsUpdate = true;
            });

            /* wave surface */
            var wp = wgeo.attributes.position.array, A = 0.24, kw = 2.1, w = 3;
            for (var v = 0; v < wp.length; v += 3) {
                var x = wp[v], z = wp[v + 2];
                var r1 = Math.hypot(x - SRC[0][0], z - SRC[0][1]), r2 = Math.hypot(x - SRC[1][0], z - SRC[1][1]);
                var y = A * (Math.sin(kw * r1 - w * t) / (1 + r1 * 0.08) + Math.sin(kw * r2 - w * t) / (1 + r2 * 0.08));
                wp[v + 1] = y;
                var m = clamp(0.5 + y / (A * 2.2), 0, 1);
                wcol[v] = cPurple.r + (cCyan.r - cPurple.r) * m; wcol[v + 1] = cPurple.g + (cCyan.g - cPurple.g) * m; wcol[v + 2] = cPurple.b + (cCyan.b - cPurple.b) * m;
            }
            wgeo.attributes.position.needsUpdate = true; wgeo.attributes.color.needsUpdate = true;
            srcBalls.forEach(function (sb) { sb.position.y = 0.35 + 0.2 * Math.sin(-w * t); });

            /* math layer */
            updUnit(); updFourier(dt); updLorenz(dt); updPhyllo(); updFlyers(dt); updSymbols(dt);

            /* formulas drift upward with a gentle sway */
            forms.forEach(function (fm) {
                fm.b.y += fm.v * dt;
                fm.b.x += Math.sin(t * 0.3 + fm.ph) * 0.15 * dt;
                if (fm.b.y > 26 && !fm.sp.held) { fm.b.set(rand(-28, 28), -1, rand(-18, 10)); fm.sp.o.set(0, 0, 0); fm.sp.v.set(0, 0, 0); }
                fm.sp.step(dt); fm.s.position.copy(fm.b).add(fm.sp.o);
                kit.op(fm.s.material, 0.35 + 0.25 * Math.sin(t * 0.8 + fm.ph));
            });
        }
        /* --- things the visitor can grab, throw, spin or click --- */
        var picks = [];
        picks.push({                                          // pendulum bob: pull it out and let go
            r: 1.3, pos: function (out) { return out.copy(bob.position); },
            grab: function () { penHeld = true; },
            drag: function (pt) {
                var d = pt.clone().sub(PV); d.y = Math.min(d.y, PL * 0.2); d.normalize();
                pen[0] = Math.acos(clamp(-d.y, -1, 1)); pen[1] = Math.atan2(d.z, d.x); pen[2] = pen[3] = 0;
            },
            release: function (vel) {
                penHeld = false;
                var th = pen[0], ph = pen[1], st = Math.sin(th), ct = Math.cos(th);
                pen[2] = clamp((vel.x * ct * Math.cos(ph) + vel.y * st + vel.z * ct * Math.sin(ph)) / PL, -3, 3);
                pen[3] = Math.abs(st) > 0.05 ? clamp((-vel.x * Math.sin(ph) + vel.z * Math.cos(ph)) / (PL * st), -3, 3) : 0;
            }
        });
        picks.push({                                          // ball: pick it up and throw it
            r: 1.0, pos: function (out) { return out.copy(ball.position); },
            grab: function () { pj.st = 'held'; },
            drag: function (pt) { pj.p.copy(pt); pj.p.y = Math.max(0, pt.y - 0.38); },
            release: function (vel) { pj.v.copy(vel).clampLength(0, 22); pj.st = 'fly'; pj.tm = 0; }
        });
        picks.push(spinPick(atom.position, 3.6, atomS, 0.35));
        picks.push(spinPick(new T.Vector3(17.5, 12.2 + 25 * 0.17, -13), 5, lzS, 0.25));
        picks.push({                                          // unit circle: turn θ by hand
            r: 0.9, pos: function (out) { return out.copy(ucDot.position).add(UC.position); },
            grab: function () { ucHeld = true; ucTheta = t * 0.8 + ucOff; },
            drag: function (pt) { var a = Math.atan2(pt.y - UC.position.y, pt.x - UC.position.x); ucTheta += wrapAngle(a, ucTheta % TAU) - ucTheta % TAU; },
            release: function () { ucHeld = false; }
        });
        picks.push(springPick(feSp, feBase, 3.4));
        srcBalls.forEach(function (sb, k) {                   // drag the wave sources → new interference pattern
            picks.push({ r: 0.9, plane: 'ground', pos: function (out) { return out.copy(sb.position); },
                grab: function () {}, release: function () {},
                drag: function (pt) {
                    SRC[k][0] = clamp(pt.x - wave.position.x, -14, 14); SRC[k][1] = clamp(pt.z - wave.position.z, -3.3, 3.3);
                    sb.position.x = wave.position.x + SRC[k][0]; sb.position.z = wave.position.z + SRC[k][1];
                } });
        });
        picks.push({ r: 3.2, pos: function (out) { return out.copy(PHY.obj.position); }, click: function () { phStart = t; } });
        flyers.forEach(function (F) { picks.push(springPick(F.sp, F.base, 1.8, function (v) { F.spin = 4 + v.length() * 0.4; })); });
        syms.forEach(function (S) { picks.push(springPick(S.sp, S.base, S.r, function (v) { S.spin = clamp(v.x * 0.4, -8, 8); })); });
        forms.forEach(function (fm) { picks.push(springPick(fm.sp, fm.b, 1.4)); });
        return { kit: kit, group: g, update: update, picks: picks };
    }

    /* ================================================================== */
    /* Engine: renderer, camera rig, scene switching                       */
    /* ================================================================== */
    var renderer, world, camera, canvas, W = 0, H = 0;
    var scenes = [], cur = 0, prev = null, lastTs = 0, lastTick = -1, active = null, raf = 0;
    var pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    // All three scenes share one stage; switching cross-fades them (a holographic "morph") while the
    // camera sweeps round the stage and re-frames for the new scene — the screen is never empty.
    var VIEWS = [
        { target: [-2, 11.5, 1], dist: 58, elev: 6, half: 31 },
        { target: [0, 3.0, -2.4], dist: 29, elev: 7.5, half: 19.5 },
        { target: [0, 7.5, -1], dist: 38, elev: 5, half: 24 }
    ];
    var camPos = new T.Vector3(), camTgt = new T.Vector3();
    var vTo = {}, vNow = { d: 56, tx: -3, ty: 12.5, tz: 0, elev: 5 }, vFrom = {};
    var trans = { k: 1 };

    function viewParams(i, out) {
        var v = VIEWS[i], aspect = W / H, tanH = Math.tan(camera.fov * Math.PI / 360);
        out.d = clamp(v.half / (tanH * aspect), v.dist, v.dist * 2.3);   // pull back on narrow (portrait) screens
        out.tx = v.target[0]; out.ty = v.target[1]; out.tz = v.target[2]; out.elev = v.elev;
        return out;
    }

    function resize() {
        W = window.innerWidth; H = window.innerHeight;
        renderer.setSize(W, H, false);
        canvas.style.width = '100vw'; canvas.style.height = '100vh';
        camera.aspect = W / H; camera.updateProjectionMatrix();
    }

    function intensity() {
        var k = clamp(1 - window.scrollY / (H * 0.9), 0, 1);
        return (0.42 + 0.58 * k) * (mobile ? 0.85 : 1);
    }

    function frame(dt) {
        t += dt;
        var tk = Math.floor(t * 6); tick = tk !== lastTick; lastTick = tk;
        pointer.x += (pointer.tx - pointer.x) * Math.min(1, dt * 2);
        pointer.y += (pointer.ty - pointer.y) * Math.min(1, dt * 2);

        viewParams(cur, vTo);
        var e = 1, sweep = 0;
        if (trans.k < 1) {
            trans.k = Math.min(1, trans.k + dt / 1.8);
            e = smooth(trans.k);
            for (var key in vTo) vNow[key] = vFrom[key] + (vTo[key] - vFrom[key]) * e;
            sweep = Math.sin(Math.PI * e) * 0.8;                // orbit around the stage during the morph
        } else { for (var key2 in vTo) vNow[key2] = vTo[key2]; }
        var yaw = 0.2 * Math.sin(t * 0.06) + pointer.x * 0.12 + sweep;
        camTgt.set(vNow.tx, vNow.ty, vNow.tz);
        camPos.set(vNow.tx + Math.sin(yaw) * vNow.d, vNow.ty + vNow.elev - pointer.y * 2.5 + Math.sin(Math.PI * e) * 4, vNow.tz + Math.cos(yaw) * vNow.d);
        camera.position.copy(camPos); camera.lookAt(camTgt);

        for (var i = 0; i < scenes.length; i++) {
            // the old scene dissolves out as the new one materialises
            var a = i === cur ? (prev !== null ? smooth(e * 1.4 - 0.2) : 1) : (i === prev ? 1 - smooth(e * 1.4 - 0.2) : 0);
            var S = scenes[i];
            S.group.visible = a > 0.002;
            if (Math.abs(S.kit.alpha - a) > 1e-4) S.kit.setAlpha(a);
            if (S.group.visible) S.update(dt);
        }
        if (trans.k >= 1) prev = null;
        updateHover();
        var I = intensity().toFixed(3);
        if (canvas.style.opacity !== I) canvas.style.opacity = I;
        renderer.render(world, camera);
    }

    function loop(ts) {
        raf = requestAnimationFrame(loop);
        if (document.hidden) { lastTs = 0; return; }
        var dt = lastTs ? Math.min(0.05, (ts - lastTs) / 1000) : 0.016;
        lastTs = ts;
        frame(dt);
    }

    function start() {
        mobile = window.innerWidth < 768;
        var old = document.getElementById('blueprint-canvas');
        canvas = document.createElement('canvas');
        canvas.className = 'fixed-canvas'; canvas.setAttribute('aria-hidden', 'true'); canvas.id = 'scene3d-canvas';
        renderer = new T.WebGLRenderer({ canvas: canvas, alpha: true, antialias: !mobile, powerPreference: 'high-performance' });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 1.75));
        renderer.setClearColor(0x000000, 0);
        world = new T.Scene();
        world.fog = new T.FogExp2(BG, 0.0085);
        camera = new T.PerspectiveCamera(40, 1, 0.5, 400);
        world.add(new T.HemisphereLight(0xbfe9ff, 0x0a0f1e, 0.85));
        var sun = new T.DirectionalLight(0xffffff, 0.85); sun.position.set(30, 50, 40); world.add(sun);
        var rim = new T.DirectionalLight(0x7dd3fc, 0.35); rim.position.set(-40, 20, -30); world.add(rim);

        [buildMEP, buildRobo, buildSTEM].forEach(function (build, i) {
            var S = build();
            S.kit.setAlpha(i === 0 ? 1 : 0); S.group.visible = i === 0;
            world.add(S.group); scenes.push(S);
        });
        if (old && old.parentNode) { old.parentNode.insertBefore(canvas, old); old.style.display = 'none'; }
        else document.body.insertBefore(canvas, document.body.firstChild);
        resize();
        window.addEventListener('resize', resize);
        bindPointer();
        if (!mobile) window.addEventListener('mousemove', function (ev) {
            if (hold) return;                                  // keep the camera still while dragging
            pointer.tx = (ev.clientX / W - 0.5) * 2; pointer.ty = (ev.clientY / H - 0.5) * 2;
        }, { passive: true });
        canvas.addEventListener('webglcontextlost', function (ev) { ev.preventDefault(); cancelAnimationFrame(raf); }, false);
        frame(0.016);
        raf = requestAnimationFrame(loop);
    }

    /* ================================================================== */
    /* Pointer play: grab, drag, throw and click things in the background  */
    /* ================================================================== */
    // A press only reaches the 3-D scene where the page has nothing of its own: no link, button, text or card.
    var NOGRAB = 'a,button,input,textarea,select,label,summary,video,iframe,img,svg,[role="button"],[onclick],[contenteditable],[tabindex],.glass-nav,.quick-dock,.scene-chip,.cutout-frame,.bg-hint';
    var ndc = new T.Vector2(), ray = new T.Raycaster(), dPlane = new T.Plane(), _pv = new T.Vector3(), _pq = new T.Vector3(), _cd = new T.Vector3();
    var hold = null, hover = { x: 0, y: 0, dirty: false, on: false }, hintEl = null;
    function grabbableAt(x, y) {
        var el = document.elementFromPoint(x, y);
        if (!el) return false;
        if (el === canvas) return true;
        for (var e = el; e && e.nodeType === 1 && e !== document.body && e !== document.documentElement; e = e.parentElement) {
            if (e.matches(NOGRAB)) return false;
            var cs = getComputedStyle(e);
            if ((cs.backdropFilter && cs.backdropFilter !== 'none') || (cs.webkitBackdropFilter && cs.webkitBackdropFilter !== 'none')) return false;
            var m = /rgba?\(([^)]+)\)/.exec(cs.backgroundColor);
            if (m) { var pa = m[1].split(','); if ((pa.length > 3 ? parseFloat(pa[3]) : 1) > 0.5) return false; }
            if (e === el) for (var n = e.firstChild; n; n = n.nextSibling) if (n.nodeType === 3 && n.textContent.trim()) return false;
        }
        return true;
    }
    function pickAt(x, y) {
        if (!renderer || trans.k < 1) return null;
        var S = scenes[cur];
        if (!S || !S.picks) return null;
        var best = null, bestK = 1, tanH = Math.tan(camera.fov * Math.PI / 360);
        for (var i = 0; i < S.picks.length; i++) {
            var P = S.picks[i];
            if (P.enabled && !P.enabled()) continue;
            P.pos(_pv);
            _pq.copy(_pv).project(camera);
            if (_pq.z > 1 || _pq.z < -1) continue;
            var sx = (_pq.x + 1) / 2 * W, sy = (1 - _pq.y) / 2 * H;
            var rpx = Math.max(16, P.r / (_pv.distanceTo(camera.position) * tanH) * H / 2);
            var k = Math.hypot(sx - x, sy - y) / rpx;
            if (k < bestK) { bestK = k; best = P; }
        }
        return best;
    }
    function rayPoint(x, y, out) {
        ndc.set(x / W * 2 - 1, -(y / H) * 2 + 1); ray.setFromCamera(ndc, camera);
        return ray.ray.intersectPlane(dPlane, out);
    }
    function startHold(P, x, y) {
        P.pos(_pv);
        if (P.plane === 'ground') dPlane.setFromNormalAndCoplanarPoint(_cd.set(0, 1, 0), _pv);
        else { camera.getWorldDirection(_cd); dPlane.setFromNormalAndCoplanarPoint(_cd.negate(), _pv); }
        var now = performance.now();
        hold = { P: P, x0: x, y0: y, moved: false, lt: now, last: _pv.clone(), pt: _pv.clone(), vel: new T.Vector3() };
        if (P.drag && P.grab) P.grab(_pv.clone());
        document.documentElement.classList.add('bg-grabbing');
        hideHint();
    }
    function moveHold(x, y) {
        if (!hold) return;
        if (Math.hypot(x - hold.x0, y - hold.y0) > 6) hold.moved = true;
        if (!hold.P.drag || !rayPoint(x, y, hold.pt)) return;
        var now = performance.now(), dts = Math.max(0.004, (now - hold.lt) / 1000);
        _pq.copy(hold.pt).sub(hold.last).divideScalar(dts);
        hold.vel.lerp(_pq, 0.4);
        hold.last.copy(hold.pt); hold.lt = now;
        hold.P.drag(hold.pt.clone());
    }
    function endHold() {
        if (!hold) return;
        var P = hold.P;
        if (performance.now() - hold.lt > 120) hold.vel.set(0, 0, 0);   // stopped before letting go → no throw
        if (!hold.moved && P.click) P.click();
        if (P.drag && P.release) P.release(hold.vel.clone().clampLength(0, 40));
        hold = null;
        document.documentElement.classList.remove('bg-grabbing');
    }
    function updateHover() {
        if (!hover.dirty || hold) return;
        hover.dirty = false;
        var on = grabbableAt(hover.x, hover.y) && !!pickAt(hover.x, hover.y);
        if (on !== hover.on) { hover.on = on; document.documentElement.classList.toggle('bg-can-grab', on); }
    }
    function showHint() {
        try { if (localStorage.getItem('bgPlayHint')) return; localStorage.setItem('bgPlayHint', '1'); } catch (e) { /* storage blocked */ }
        var lang = (document.documentElement.lang || 'en').slice(0, 2);
        var txt = {
            en: (mobile ? 'Touch & drag' : 'Drag, throw or click') + ' the 3-D objects in the background',
            km: 'អូស បោះ ឬចុចលើវត្ថុ 3-D នៅផ្ទៃខាងក្រោយ',
            zh: '拖动、抛掷或点击背景中的 3D 物体'
        }[lang] || '';
        if (!txt) return;
        hintEl = document.createElement('div'); hintEl.className = 'bg-hint'; hintEl.setAttribute('role', 'status');
        hintEl.textContent = '✋ ' + txt;
        document.body.appendChild(hintEl);
        requestAnimationFrame(function () { if (hintEl) hintEl.classList.add('show'); });
        setTimeout(hideHint, 7000);
    }
    function hideHint() {
        if (!hintEl) return;
        var el = hintEl; hintEl = null; el.classList.remove('show');
        setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 600);
    }
    function bindPointer() {
        window.addEventListener('mousedown', function (ev) {
            if (ev.button !== 0 || !grabbableAt(ev.clientX, ev.clientY)) return;
            var P = pickAt(ev.clientX, ev.clientY);
            if (!P) return;
            ev.preventDefault(); startHold(P, ev.clientX, ev.clientY);
        });
        window.addEventListener('mousemove', function (ev) {
            if (hold) { moveHold(ev.clientX, ev.clientY); return; }
            hover.x = ev.clientX; hover.y = ev.clientY; hover.dirty = true;
        }, { passive: true });
        window.addEventListener('mouseup', endHold);
        window.addEventListener('blur', endHold);
        window.addEventListener('scroll', function () { hover.dirty = true; }, { passive: true });
        window.addEventListener('touchstart', function (ev) {
            if (ev.touches.length !== 1) { endHold(); return; }
            var tc = ev.touches[0];
            if (!grabbableAt(tc.clientX, tc.clientY)) return;
            var P = pickAt(tc.clientX, tc.clientY);
            if (!P) return;
            ev.preventDefault(); startHold(P, tc.clientX, tc.clientY);      // only blocks scrolling when something was grabbed
        }, { passive: false });
        window.addEventListener('touchmove', function (ev) { if (!hold) return; ev.preventDefault(); moveHold(ev.touches[0].clientX, ev.touches[0].clientY); }, { passive: false });
        window.addEventListener('touchend', endHold);
        window.addEventListener('touchcancel', endHold);
        setTimeout(showHint, 2500);
    }

    window.BgScenes = {
        init: function () {
            try {
                start(); active = '3d';
            } catch (err) {
                // Anything goes wrong → clean up and use the 2-D version
                if (window.console) console.warn('3-D background unavailable, using 2-D fallback:', err);
                cancelAnimationFrame(raf);
                if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
                var old = document.getElementById('blueprint-canvas'); if (old) old.style.display = '';
                active = '2d'; window.BgScenes = fallback; fallback.init();
            }
        },
        setScene: function (i) {
            if (active === '2d') return fallback.setScene(i);
            i = ((i % 3) + 3) % 3;
            if (i === cur || !renderer) return;
            for (var key in vNow) vFrom[key] = vNow[key];
            trans.k = 0;
            prev = cur; cur = i;
            document.body.setAttribute('data-scene', ['mep', 'robotics', 'stem'][i]);
        },
        get scene() { return cur; }
    };
})();

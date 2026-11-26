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
 *                   a 3-D atom with orbiting electrons, a two-source wave-interference surface and
 *                   physics formulas floating at different depths.
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
        var crossed = (d > 0) !== (target - o.x > 0) && Math.abs(o.v) < amax * dt * 3 + amax * 0.05;
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
        }
        return { kit: kit, group: g, update: update };
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
            var D = { g: new T.Group(), blades: [], seed: seed };
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
            arms.forEach(function (A) { stepArm(A, dt); poseArm(A); });
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
                D.g.position.set(x, y, z);
                D.g.rotation.set(Math.atan(az / 9.81) * 2.4 + noise(t * 2, k) * 0.02, 0.35 * Math.sin(t * 0.1 + k), -Math.atan(ax / 9.81) * 2.4, 'YXZ');
                D.blades.forEach(function (bl) { bl.rotation.y += bl.userData.dir * 47 * dt; });
                kit.op(D.strobe.material, ((t + D.seed) % 1.2) < 0.07 ? 1 : 0);
                D.ring.position.set(x, 0.04, z);
                D.ring.scale.setScalar(0.6 + ((t * 0.8 + D.seed) % 1) * 0.9);
                if (k === 0) {
                    droneLbl.sprite.position.set(x, y + 1.6, z);
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
        return { kit: kit, group: g, update: update };
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
        var forms = [], nF = mobile ? 10 : 18;
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
            forms.push({ s: spr, v: rand(0.35, 0.8), ph: rand(0, 6.28) });
        }

        function update(dt) {
            /* pendulum */
            if (dt) stepPend(dt);
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
            atom.rotation.y += dt * 0.18; atom.rotation.x = 0.25 * Math.sin(t * 0.13);
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

            /* formulas drift upward with a gentle sway */
            forms.forEach(function (fm) {
                fm.s.position.y += fm.v * dt;
                fm.s.position.x += Math.sin(t * 0.3 + fm.ph) * 0.15 * dt;
                if (fm.s.position.y > 26) fm.s.position.set(rand(-28, 28), -1, rand(-18, 10));
                kit.op(fm.s.material, 0.35 + 0.25 * Math.sin(t * 0.8 + fm.ph));
            });
        }
        return { kit: kit, group: g, update: update };
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
        { target: [-3, 12.5, 0], dist: 56, elev: 5, half: 27 },
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
        if (!mobile) window.addEventListener('mousemove', function (ev) {
            pointer.tx = (ev.clientX / W - 0.5) * 2; pointer.ty = (ev.clientY / H - 0.5) * 2;
        }, { passive: true });
        canvas.addEventListener('webglcontextlost', function (ev) { ev.preventDefault(); cancelAnimationFrame(raf); }, false);
        frame(0.016);
        raf = requestAnimationFrame(loop);
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

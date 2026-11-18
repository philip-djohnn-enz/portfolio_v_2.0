/**
 * CHORN PHILIP PORTFOLIO — ANIMATED BACKGROUND SCENES
 * One full-screen canvas behind the page, with three hand-drawn scenes that cross-fade
 * when the specialty switch changes:
 *   0  MEP        — building rising floor by floor (columns → formwork → slab → services) with
 *                   welding sparks, turbulent duct airflow, water & power risers, and a tower crane
 *                   that shuttles duct sections between two stockpiles. The hanging load is a real
 *                   damped pendulum driven by the trolley's acceleration, so it sways when the
 *                   trolley starts/stops and the operator waits for it to settle before lowering.
 *   1  ROBOTICS   — automation cell: a moving conveyor, two robot arms that track a box on the
 *                   belt, grip it, lift it off and stack it on a pallet (trapezoidal motion
 *                   profiles, inverse kinematics), quadcopter drones that bank with acceleration,
 *                   PCB traces with signal pulses
 *   2  STEM       — depth-layered floating formulas, a nonlinear pendulum (RK4), a projectile
 *                   that bounces with restitution and friction, a 3-D atom, wave interference
 * Everything is drawn with code (no images), so it is light, sharp on any screen and copyright-free.
 *
 * API:  BgScenes.init()   BgScenes.setScene(0|1|2)
 */
(function () {
    'use strict';

    var C = {
        cyan: '0,242,254', blue: '56,189,248', amber: '245,158,11', orange: '251,146,60',
        purple: '168,85,247', violet: '196,181,253', green: '16,185,129', red: '239,68,68', white: '226,232,240'
    };
    function rgba(c, a) { return 'rgba(' + (C[c] || c) + ',' + Math.max(0, a) + ')'; }
    var ACCENT = ['cyan', 'amber', 'purple'];

    var canvas, ctx, W = 0, H = 0, S = 1, mobile = false;
    var t = 0, lastTs = 0;
    var scene = 0, prevScene = null, mix = 1;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var nodes = [], traces = [], formulas = [];

    /* ------------------------------------------------------------------ */
    /* Setup                                                              */
    /* ------------------------------------------------------------------ */
    function resize() {
        var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
        var oldW = W;
        W = window.innerWidth; H = window.innerHeight;
        canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
        canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        mobile = W < 768;
        S = Math.max(0.55, Math.min(W, H * 1.3) / 1100);
        // Phones fire resize when the URL bar shows/hides; only rebuild layouts when the width changes
        if (W !== oldW) {
            buildNodes(); buildTraces(); buildFormulas();
            robo = null;
        }
        if (reduce) frame(0);
    }

    function rand(a, b) { return a + Math.random() * (b - a); }
    function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }

    function buildNodes() {
        nodes = [];
        var n = Math.floor(Math.min(W, 1400) / (mobile ? 80 : 55));
        for (var i = 0; i < n; i++) {
            nodes.push({ x: rand(0, W), y: rand(0, H), vx: rand(-0.2, 0.2), vy: rand(-0.2, 0.2), r: rand(1, 2.4), p: rand(0, 6.28) });
        }
    }

    function buildTraces() {
        traces = [];
        var count = mobile ? 4 : 8;
        for (var i = 0; i < count; i++) {
            var left = i % 2 === 0;
            var x = left ? 0 : W, y = rand(H * 0.25, H * 0.75);
            var pts = [[x, y]];
            var segs = 3 + Math.floor(Math.random() * 3);
            for (var k = 0; k < segs; k++) {
                var len = rand(30, 90) * S;
                var diag = k % 2 === 1;
                x += (left ? 1 : -1) * len;
                if (diag) y += (Math.random() > 0.5 ? 1 : -1) * len * 0.6;
                pts.push([x, y]);
            }
            var total = 0;
            for (var j = 1; j < pts.length; j++) total += Math.hypot(pts[j][0] - pts[j - 1][0], pts[j][1] - pts[j - 1][1]);
            traces.push({ pts: pts, len: total, speed: rand(60, 140), off: rand(0, total) });
        }
    }

    var FORMULAS = [
        'F = ma', 'E = mc²', 'V = IR', 'P = VI', 'v = u + at', 's = ut + ½at²', 'λ = c / f',
        'F = Gm₁m₂ / r²', 'ΣF = 0', 'p = mv', 'W = F·d', 'Eₖ = ½mv²', 'Q = mcΔT', 'T = 2π√(L/g)',
        'sin²θ + cos²θ = 1', '∫ f(x) dx', '∇·E = ρ / ε₀', 'a² + b² = c²', 'PV = nRT', 'ω = 2πf',
        'τ = r × F', 'dy/dx', 'F = kx', 'Δx·Δp ≥ ħ/2', 'I = Q / t', 'R = ρL / A'
    ];
    function buildFormulas() {
        formulas = [];
        var n = mobile ? 11 : 22;
        for (var i = 0; i < n; i++) {
            // z = depth (0 far … 1 near): nearer formulas are bigger, brighter and drift faster (parallax)
            var z = Math.pow(Math.random(), 1.4);
            formulas.push({
                text: FORMULAS[i % FORMULAS.length],
                x: rand(0.03, 0.97) * W, y: rand(0, H), z: z,
                vy: lerp(6, 26, z), size: lerp(12, mobile ? 21 : 32, z) * Math.max(S, 0.8),
                rot: rand(-0.12, 0.12), ph: rand(0, 6.28), sway: rand(4, 12),
                col: Math.random() > 0.35 ? 'violet' : 'cyan'
            });
        }
        formulas.sort(function (p, q) { return p.z - q.z; });
    }

    /* ------------------------------------------------------------------ */
    /* Shared helpers                                                     */
    /* ------------------------------------------------------------------ */
    function line(x1, y1, x2, y2) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
    function circle(x, y, r, fill) { ctx.beginPath(); ctx.arc(x, y, Math.max(0.1, r), 0, Math.PI * 2); fill ? ctx.fill() : ctx.stroke(); }
    function label(txt, x, y, col, a, size, align) {
        ctx.font = (size || 10) * Math.max(S, 0.9) + 'px "JetBrains Mono", monospace';
        ctx.textAlign = align || 'left';
        ctx.fillStyle = rgba(col, a);
        ctx.fillText(txt, x, y);
        ctx.textAlign = 'left';
    }
    function lerp(a, b, k) { return a + (b - a) * k; }
    function glow(x, y, r, col, a) {
        var g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, rgba(col, a)); g.addColorStop(1, rgba(col, 0));
        ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    // Smooth pseudo-noise from incommensurate sines (cheap, organic jitter)
    function noise(x, seed) { seed = seed || 0; return (Math.sin(x * 1.31 + seed) + Math.sin(x * 2.17 + seed * 1.7) * 0.6 + Math.sin(x * 3.73 + seed * 2.3) * 0.3) / 1.9; }

    /* Trapezoidal motion profile (accel-limited, speed-limited, decelerates to stop exactly on target).
       This is how real servo axes, crane trolleys and hoists move. o = {x, v, a} */
    function approach1(o, target, dt, vmax, amax) {
        var d = target - o.x;
        var vd = (d > 0 ? 1 : -1) * Math.min(vmax, Math.sqrt(2 * amax * Math.abs(d)));
        var dv = clamp(vd - o.v, -amax * dt, amax * dt);
        o.a = dt ? dv / dt : 0;
        o.v += dv; o.x += o.v * dt;
        if (Math.abs(target - o.x) < 0.6 && Math.abs(o.v) < amax * 0.05) { o.x = target; o.v = 0; o.a = 0; return true; }
        return false;
    }
    /* Same idea in 2-D: straight-line move with a feed-forward velocity (fx, fy) so a tool can
       follow a moving target, e.g. a box on a running conveyor. o = {x, y, vx, vy} */
    function approach2(o, tx, ty, dt, vmax, amax, fx, fy) {
        fx = fx || 0; fy = fy || 0;
        var dx = tx - o.x, dy = ty - o.y, d = Math.hypot(dx, dy);
        var sp = Math.min(vmax, Math.sqrt(2 * amax * d));
        var vx = fx + (d > 1e-4 ? dx / d * sp : 0), vy = fy + (d > 1e-4 ? dy / d * sp : 0);
        var ax = vx - o.vx, ay = vy - o.vy, am = Math.hypot(ax, ay), lim = amax * dt;
        if (am > lim) { ax *= lim / am; ay *= lim / am; }
        o.vx += ax; o.vy += ay; o.x += o.vx * dt; o.y += o.vy * dt;
        return d < 2.5 && Math.hypot(o.vx - fx, o.vy - fy) < amax * 0.06;
    }

    /* Spark / particle system (gravity + air drag + ground bounce), drawn as motion-blurred streaks */
    function stepSparks(list, dt, groundY) {
        for (var i = list.length - 1; i >= 0; i--) {
            var p = list[i];
            p.life -= dt;
            if (p.life <= 0) { list.splice(i, 1); continue; }
            var drag = Math.exp(-p.drag * dt);
            p.vx *= drag; p.vy = p.vy * drag + p.g * dt;
            p.x += p.vx * dt; p.y += p.vy * dt;
            if (groundY && p.y > groundY) { p.y = groundY; p.vy *= -0.3; p.vx *= 0.6; }
        }
    }
    function drawSparks(list, a) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineCap = 'round';
        for (var i = 0; i < list.length; i++) {
            var p = list[i], k = p.life / p.max;     // 1 → 0 as the spark cools
            var col = k > 0.6 ? '255,244,214' : k > 0.3 ? '255,190,90' : '251,120,40';
            ctx.strokeStyle = rgba(col, Math.min(1, k * 1.4) * a);
            ctx.lineWidth = 1.1 + k;
            line(p.x, p.y, p.x - p.vx * 0.022, p.y - p.vy * 0.022);
        }
        ctx.restore();
    }
    function emitSparks(list, x, y, n, spread) {
        for (var i = 0; i < n; i++) {
            var ang = -Math.PI / 2 + rand(-spread, spread);
            var sp = rand(60, 220) * S;
            var life = rand(0.35, 1.0);
            list.push({ x: x, y: y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, g: 520 * S, drag: 1.6, life: life, max: life });
        }
        if (list.length > 220) list.splice(0, list.length - 220);
    }

    /* Base layer: blueprint grid + circuit network, tinted per scene */
    function drawBase(accent, a) {
        var g = 60;
        ctx.lineWidth = 1;
        ctx.strokeStyle = rgba(accent, 0.03 * a);
        for (var x = 0; x < W; x += g) line(x, 0, x, H);
        for (var y = 0; y < H; y += g) line(0, y, W, y);

        for (var i = 0; i < nodes.length; i++) {
            var p = nodes[i];
            ctx.fillStyle = rgba(accent, (0.35 + 0.35 * Math.sin(t * 2 + p.p)) * a);
            circle(p.x, p.y, p.r, true);
            for (var j = i + 1; j < nodes.length; j++) {
                var q = nodes[j], d = Math.hypot(p.x - q.x, p.y - q.y);
                if (d < 130) {
                    ctx.strokeStyle = rgba(accent, (1 - d / 130) * 0.18 * a);
                    ctx.lineWidth = 0.8;
                    line(p.x, p.y, q.x, q.y);
                }
            }
        }
    }

    function moveNodes(dt) {
        for (var i = 0; i < nodes.length; i++) {
            var p = nodes[i];
            // gentle wandering instead of straight-line ping-pong
            var wob = noise(t * 0.3, p.p * 10) * 0.004;
            var c = Math.cos(wob), s = Math.sin(wob), vx = p.vx;
            p.vx = vx * c - p.vy * s; p.vy = vx * s + p.vy * c;
            p.x += p.vx * dt * 60; p.y += p.vy * dt * 60;
            if (p.x < 0 || p.x > W) { p.vx *= -1; p.x = clamp(p.x, 0, W); }
            if (p.y < 0 || p.y > H) { p.vy *= -1; p.y = clamp(p.y, 0, H); }
        }
    }

    function tint(col, a) {
        var gr = ctx.createRadialGradient(W * 0.5, H * 0.45, 0, W * 0.5, H * 0.45, Math.max(W, H) * 0.75);
        gr.addColorStop(0, rgba(col, 0.07 * a));
        gr.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gr;
        ctx.fillRect(0, 0, W, H);
    }

    /* ================================================================== */
    /* SCENE 0 — MEP CONSTRUCTION SITE                                    */
    /* ================================================================== */
    var mep = {
        bt: reduce ? 999 : 0,    // seconds of construction so far
        sparks: [], nextBurst: 2,
        fanW: reduce ? 9 : 0,     // AHU fan angular speed (spins up with inertia)
        fanA: 0,
        crane: null
    };
    var FLOOR_TIME = 1.7;         // seconds to build one storey

    function drawDuctSection(x, y, w, h, a) {
        var g = ctx.createLinearGradient(0, y, 0, y + h);
        g.addColorStop(0, rgba('blue', 0.32 * a)); g.addColorStop(0.45, rgba('blue', 0.12 * a)); g.addColorStop(1, rgba('blue', 0.22 * a));
        ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = rgba('blue', 0.8 * a); ctx.lineWidth = 1.3; ctx.strokeRect(x, y, w, h);
        // flanges
        ctx.strokeStyle = rgba('blue', 0.9 * a); ctx.lineWidth = 2;
        line(x, y - 1.5, x, y + h + 1.5); line(x + w, y - 1.5, x + w, y + h + 1.5);
        ctx.strokeStyle = rgba('blue', 0.4 * a); ctx.lineWidth = 1;
        line(x, y, x + w, y + h);
    }

    function stepCrane(cr, G, dt) {
        var gpx = 9.81 * 30 * S;               // 1 m ≈ 30 px
        var Lmin = H * 0.1;
        function ropeFor(bottomY) { return Math.max(Lmin, bottomY - G.sling - G.lh - G.jibY - 5 * S); }
        var src = cr.fromA ? cr.A : cr.B, dst = cr.fromA ? cr.B : cr.A;
        var srcX = cr.fromA ? G.ax : G.bx2, dstX = cr.fromA ? G.bx2 : G.ax;
        var tv = 110 * S, ta = 20 * S, rv = 110 * S, ra = 90 * S;
        var settled = Math.abs(cr.th) < 0.05 && Math.abs(cr.w) < 0.1;
        var at, ar, prevL = cr.rope.x;
        cr.tm += dt;
        cr.trol.a = 0;                          // only non-zero on frames where the trolley drives

        switch (cr.st) {
            case 'goSrc':
                ar = approach1(cr.rope, Lmin, dt, rv, ra);
                at = approach1(cr.trol, srcX, dt, tv, ta);
                if (at && ar && (settled || cr.tm > 5)) { cr.st = 'down'; cr.tm = 0; }
                break;
            case 'down':
                approach1(cr.trol, srcX, dt, tv, ta);
                if (approach1(cr.rope, ropeFor(G.gy - (src.n - 1) * G.lh), dt, rv * 0.7, ra)) { cr.st = 'hook'; cr.tm = 0; }
                break;
            case 'hook':
                if (cr.tm > 1.0) { cr.has = true; src.n--; cr.st = 'up'; cr.tm = 0; }
                break;
            case 'up':
                if (approach1(cr.rope, Lmin, dt, rv * 0.8, ra * 0.8)) { cr.st = 'travel'; cr.tm = 0; }
                break;
            case 'travel':
                at = approach1(cr.trol, dstX, dt, tv, ta);
                // a good operator waits for the load to stop swinging before lowering it
                if (at && (settled || cr.tm > 7)) { cr.st = 'down2'; cr.tm = 0; }
                break;
            case 'down2':
                approach1(cr.trol, dstX, dt, tv, ta);
                if (approach1(cr.rope, ropeFor(G.gy - dst.n * G.lh), dt, rv * 0.5, ra * 0.6)) { cr.st = 'unhook'; cr.tm = 0; }
                break;
            case 'unhook':
                if (cr.tm > 1.0) { cr.has = false; dst.n++; cr.st = 'up2'; cr.tm = 0; }
                break;
            case 'up2':
                if (approach1(cr.rope, Lmin, dt, rv, ra)) {
                    if (src.n === 0) cr.fromA = !cr.fromA;   // pile emptied → shuttle them back
                    cr.st = 'goSrc'; cr.tm = 0;
                }
                break;
        }
        if (dt <= 0) return;
        // Pendulum with moving pivot and variable length:
        //   θ'' = −(g·sinθ + a_trolley·cosθ + 2·L'·θ') / L − c·θ'
        var Ld = (cr.rope.x - prevL) / dt;
        var n = 4, h = dt / n;
        for (var i = 0; i < n; i++) {
            var acc = -(gpx * Math.sin(cr.th) + cr.trol.a * Math.cos(cr.th) + 2 * Ld * cr.w) / cr.rope.x - 0.5 * cr.w;
            cr.w += acc * h; cr.th += cr.w * h;
        }
        // light gusts of wind (a small torque, scaled by dt so it can't pump the swing)
        cr.w += noise(t * 0.37, 3) * 0.012 * dt;
    }

    function drawMEP(a, dt) {
        var gy = H * 0.95;
        ctx.lineCap = 'round';
        dt = dt || 0;

        // Ground line with hatch
        ctx.strokeStyle = rgba('cyan', 0.35 * a); ctx.lineWidth = 1.2;
        line(0, gy, W, gy);
        ctx.strokeStyle = rgba('cyan', 0.12 * a);
        for (var hx = 0; hx < W; hx += 14) line(hx, gy, hx - 8, gy + 8);

        /* --- Building under construction --- */
        var bx = mobile ? W * 0.03 : W * 0.04;
        var bw = mobile ? W * 0.36 : Math.min(W * 0.22, 340);
        var fh = Math.max(26, 46 * S);
        var maxF = Math.max(4, Math.min(10, Math.floor((gy - H * 0.2) / fh)));
        mep.bt += dt;
        var prog = mep.bt / FLOOR_TIME;                 // e.g. 3.4 → three floors done, 4th at 40 %
        var done = Math.min(maxF, Math.floor(prog));
        var cur = done < maxF ? prog - done : 1;        // progress of the storey being built
        var storeys = done < maxF ? done + 1 : maxF;
        var cols = 4;
        var weldX = null, weldY = null;

        for (var f = 0; f < storeys; f++) {
            var pf = f < done ? 1 : cur;
            var y0 = gy - f * fh, fy = y0 - fh;
            // 1) columns rise
            var ck = clamp(pf / 0.35, 0, 1);
            ctx.strokeStyle = rgba('cyan', 0.45 * a); ctx.lineWidth = 2;
            for (var c = 0; c <= cols; c++) {
                var cx = bx + (bw * c) / cols;
                line(cx, y0, cx, y0 - fh * ck);
            }
            if (pf < 0.35) { weldX = bx + bw * (Math.floor(t * 1.3) % (cols + 1)) / cols; weldY = y0 - fh * ck; }
            // 2) formwork + slab pour sweeps across
            var sk = clamp((pf - 0.35) / 0.4, 0, 1);
            if (sk > 0) {
                var sx1 = bx - 6 + (bw + 12) * sk;
                var cured = pf >= 1;
                if (!cured) {
                    ctx.strokeStyle = rgba('amber', 0.75 * a); ctx.lineWidth = 2.5; ctx.setLineDash([6, 5]);
                    line(bx - 6, fy, bx + bw + 6, fy);          // formwork
                    ctx.setLineDash([]);
                    ctx.strokeStyle = rgba('amber', 0.25 * a); ctx.lineWidth = 1;
                    for (var sh = bx + bw / 12; sh < bx + bw; sh += bw / 6) line(sh, fy, sh, y0); // shoring props
                }
                ctx.strokeStyle = rgba(cured ? 'cyan' : 'white', (cured ? 0.5 : 0.7) * a); ctx.lineWidth = cured ? 2 : 3;
                line(bx - 6, fy, sx1, fy);                       // poured concrete
                if (!cured && sk < 1) { weldX = sx1; weldY = fy; }
            }
            // 3) MEP services fade in once the slab is done
            var mk = clamp((pf - 0.8) / 0.2, 0, 1);
            if (mk <= 0) continue;
            var ma = a * mk;
            var dy = fy + fh * 0.22, dh = fh * 0.2, dw = bw * 0.62;
            ctx.strokeStyle = rgba('blue', 0.45 * ma); ctx.lineWidth = 1.2;
            ctx.strokeRect(bx + 10, dy, dw, dh);
            // turbulent airflow: short streaks with individual speeds and wobble
            var dir = f % 2 ? 1 : -1;
            ctx.strokeStyle = rgba('cyan', 0.7 * ma); ctx.lineWidth = 1.2;
            for (var q = 0; q < 6; q++) {
                var spd = 34 + (q * 13) % 22;
                var u = ((t * spd * dir + q * dw / 6 + f * 17) % dw + dw) % dw;
                var yy = dy + dh / 2 + noise(t * 2.5 + q, f) * dh * 0.28;
                ctx.globalAlpha = Math.sin(Math.PI * u / dw);
                line(bx + 10 + u, yy, bx + 10 + u - dir * 7, yy);
            }
            ctx.globalAlpha = 1;
            ctx.fillStyle = rgba('cyan', 0.35 * ma);
            for (var dd = 1; dd <= 2; dd++) ctx.fillRect(bx + 10 + bw * 0.2 * dd, dy + dh, 10, 3);
        }

        // welding sparks at the active work point (and occasional MEP fit-out hot works afterwards)
        if (dt > 0) {
            if (weldX !== null && Math.random() < dt * 30) emitSparks(mep.sparks, weldX, weldY, 2 + (Math.random() * 3 | 0), 1.1);
            if (done >= maxF && (mep.nextBurst -= dt) <= 0) {
                var ff = 1 + Math.floor(Math.random() * (maxF - 1));
                emitSparks(mep.sparks, bx + rand(0.15, 0.7) * bw, gy - ff * fh + fh * 0.3, 14, 1.3);
                mep.nextBurst = rand(2.5, 5);
            }
            stepSparks(mep.sparks, dt, gy);
        }
        if (weldX !== null) glow(weldX, weldY, 18 * S, '255,220,160', (0.35 + 0.35 * Math.random()) * a);
        drawSparks(mep.sparks, a);

        // risers: water (supply/return) + electrical, reach the highest finished slab
        var topY = gy - Math.max(done, 0.001) * fh;
        var rTop = topY + 4, riseH = gy - rTop;
        var px = bx + bw * 0.8;
        if (riseH > 20) {
            ctx.lineWidth = 2;
            ctx.strokeStyle = rgba('blue', 0.55 * a); line(px, gy, px, rTop);
            ctx.strokeStyle = rgba('green', 0.45 * a); line(px + 9, gy, px + 9, rTop);
            var ex = bx + bw * 0.9;
            ctx.strokeStyle = rgba('amber', 0.5 * a); line(ex, gy, ex, rTop);
            for (var k = 0; k < 6; k++) {
                var up = (t * 55 + k * (riseH / 6)) % riseH;
                ctx.fillStyle = rgba('blue', 0.9 * a); circle(px + noise(t * 4 + k) * 0.8, gy - up, 2.4, true);
                ctx.fillStyle = rgba('green', 0.8 * a); circle(px + 9 + noise(t * 4 + k, 2) * 0.8, rTop + up, 2.2, true);
                ctx.fillStyle = rgba('amber', (0.6 + 0.4 * Math.sin(t * 10 + k)) * a);
                ctx.fillRect(ex - 2, gy - ((t * 120 + k * (riseH / 6)) % riseH), 4, 7);
            }
            label('CHW-S/R', px - 6, gy + 18, 'blue', 0.7 * a, 9, 'center');
            label('LV-RISER', ex + 4, gy + 30, 'amber', 0.7 * a, 9, 'center');
        }
        label(done < maxF ? 'FLOOR ' + (done + 1) + '/' + maxF + ' · ' + Math.round(cur * 100) + '%' : 'TOPPED OUT · ' + maxF + ' FL',
            bx, gy - storeys * fh - 10, 'amber', 0.85 * a, 10);

        /* --- AHU with fan that spins up + main duct --- */
        var ahuX = bx + bw + 18 * S, ahuW = 70 * S, ahuH = 48 * S, ahuY = gy - ahuH;
        if (!mobile) {
            // fan inertia: first-order spin-up to ~9 rad/s with slight load flutter
            var target = 9 + 0.6 * noise(t * 0.4, 5);
            mep.fanW += (target - mep.fanW) * (1 - Math.exp(-dt * 0.6));
            mep.fanA += mep.fanW * dt;
            ctx.strokeStyle = rgba('cyan', 0.55 * a); ctx.lineWidth = 1.5;
            ctx.strokeRect(ahuX, ahuY, ahuW, ahuH);
            var fx = ahuX + ahuW * 0.35, fyy = ahuY + ahuH / 2, fr = ahuH * 0.34;
            circle(fx, fyy, fr);
            // motion blur: ghost copies trailing behind each blade, longer when faster
            var blur = Math.min(0.5, mep.fanW * 0.04);
            for (var gh = 4; gh >= 0; gh--) {
                ctx.fillStyle = rgba('cyan', (gh === 0 ? 0.55 : 0.12) * a);
                for (var b = 0; b < 5; b++) {
                    var ang = mep.fanA + b * Math.PI * 2 / 5 - gh * blur / 4;
                    ctx.beginPath();
                    ctx.moveTo(fx, fyy);
                    ctx.arc(fx, fyy, fr * 0.9, ang, ang + 0.42);
                    ctx.closePath(); ctx.fill();
                }
            }
            ctx.fillStyle = rgba('white', 0.7 * a); circle(fx, fyy, 2.5, true);
            // coil fins
            ctx.strokeStyle = rgba('blue', 0.4 * a); ctx.lineWidth = 1;
            for (var cf = 0; cf < 5; cf++) line(ahuX + ahuW * 0.65 + cf * 4, ahuY + 6, ahuX + ahuW * 0.65 + cf * 4, ahuY + ahuH - 6);
            label('AHU-01 · ' + Math.round(mep.fanW * 9.55 * 10) * 10 + ' rpm', ahuX, ahuY - 8, 'cyan', 0.8 * a, 10);

            // main supply duct
            var dEnd = W * 0.6, dTop = gy - ahuH * 0.72, dH2 = ahuH * 0.36;
            ctx.strokeStyle = rgba('blue', 0.4 * a); ctx.lineWidth = 1.3;
            ctx.strokeRect(ahuX + ahuW, dTop, dEnd - ahuX - ahuW, dH2);
            var span = dEnd - ahuX - ahuW - 12, flow = mep.fanW / 9;
            ctx.strokeStyle = rgba('cyan', 0.75 * a); ctx.lineWidth = 1.4;
            for (var ch = 0; ch < 14; ch++) {
                var vspd = (55 + (ch * 23) % 40) * flow;
                var ux = (t * vspd + ch * span / 14) % span;
                var cy0 = dTop + dH2 / 2 + noise(t * 3 + ch * 1.7, ch) * dH2 * 0.3;
                ctx.globalAlpha = Math.max(0, Math.sin(Math.PI * ux / span) * flow);
                line(ahuX + ahuW + 6 + ux, cy0, ahuX + ahuW + 6 + ux - 10 * flow, cy0);
            }
            ctx.globalAlpha = 1;
            label('SA DUCT 600×400 · ' + (flow * 4.2).toFixed(1) + ' m/s', ahuX + ahuW + 14, dTop - 6, 'blue', 0.6 * a, 9);

            // overhead cable tray with current pulses
            var trayY = H * 0.12;
            ctx.strokeStyle = rgba('amber', 0.25 * a); ctx.lineWidth = 1;
            line(W * 0.3, trayY, W * 0.7, trayY); line(W * 0.3, trayY + 6, W * 0.7, trayY + 6);
            for (var tr = 0; tr < 4; tr++) {
                var tx = W * 0.3 + ((t * 160 + tr * W * 0.1) % (W * 0.4));
                ctx.fillStyle = rgba('amber', 0.8 * a); ctx.fillRect(tx, trayY + 1, 10, 4);
            }
        }

        /* --- Tower crane --- */
        var mx = mobile ? W * 0.9 : W * 0.84;
        var my = H * 0.17;
        var mw = 14 * S;
        var jibL = mobile ? W * 0.5 : W * 0.3;
        var G = {
            gy: gy, jibY: my + 8 * S, lh: 18 * S, lw: 66 * S, sling: 22 * S,
            ax: mx - jibL * (mobile ? 0.3 : 0.22), bx2: mx - jibL * (mobile ? 0.82 : 0.78)
        };
        if (!mep.crane) {
            mep.crane = { trol: { x: G.ax, v: 0, a: 0 }, rope: { x: H * 0.1, v: 0, a: 0 }, th: 0, w: 0,
                st: 'goSrc', tm: 0, has: false, fromA: true, A: { n: 4 }, B: { n: 0 } };
        }
        var cr = mep.crane;
        stepCrane(cr, G, dt);

        ctx.strokeStyle = rgba('amber', 0.6 * a); ctx.lineWidth = 1.4;
        line(mx - mw / 2, gy, mx - mw / 2, my); line(mx + mw / 2, gy, mx + mw / 2, my);
        ctx.strokeStyle = rgba('amber', 0.3 * a);
        for (var my2 = gy; my2 > my + mw; my2 -= mw * 1.4) {
            line(mx - mw / 2, my2, mx + mw / 2, my2 - mw * 1.4);
            line(mx - mw / 2, my2, mx + mw / 2, my2);
        }
        ctx.strokeStyle = rgba('amber', 0.6 * a);
        line(mx, my, mx, my - 40 * S);
        line(mx, my - 40 * S, mx - jibL * 0.7, my);
        line(mx, my - 40 * S, mx + jibL * 0.28, my);
        ctx.lineWidth = 1.6;
        line(mx - jibL, my, mx + jibL * 0.3, my);
        line(mx - jibL, G.jibY, mx + jibL * 0.3, G.jibY);
        ctx.strokeStyle = rgba('amber', 0.25 * a); ctx.lineWidth = 1;
        for (var jx = mx - jibL; jx < mx + jibL * 0.3; jx += 14 * S) line(jx, G.jibY, jx + 7 * S, my);
        ctx.fillStyle = rgba('amber', 0.35 * a);
        ctx.fillRect(mx + jibL * 0.2, G.jibY, 22 * S, 20 * S);
        ctx.strokeStyle = rgba('cyan', 0.6 * a);
        ctx.strokeRect(mx + mw / 2, my + 10 * S, 16 * S, 14 * S);
        // aviation obstruction light: short flash with a soft halo
        var fl = Math.pow(Math.max(0, Math.sin(t * 4.2)), 8);
        ctx.fillStyle = rgba('red', (0.2 + 0.8 * fl) * a);
        circle(mx, my - 42 * S, 3.2, true);
        if (fl > 0.02) glow(mx, my - 42 * S, 22 * S, 'red', 0.55 * fl * a);

        // stockpiles at both ends of the trolley run
        [[G.ax, cr.A.n], [G.bx2, cr.B.n]].forEach(function (pl) {
            for (var s = 0; s < pl[1]; s++) drawDuctSection(pl[0] - G.lw / 2, gy - (s + 1) * G.lh, G.lw, G.lh, 0.8 * a);
        });
        var hk = { x: cr.trol.x + Math.sin(cr.th) * cr.rope.x, y: G.jibY + 5 * S + Math.cos(cr.th) * cr.rope.x };
        // ground shadow of the hanging load
        if (cr.has) {
            var hgt = clamp((gy - hk.y) / (gy - G.jibY), 0, 1);
            ctx.fillStyle = rgba('0,0,0', 0.35 * (1 - hgt * 0.7) * a);
            ctx.beginPath(); ctx.ellipse(hk.x, gy + 2, G.lw * (0.5 + hgt * 0.4), 3.5, 0, 0, Math.PI * 2); ctx.fill();
        }
        // trolley
        ctx.fillStyle = rgba('amber', 0.75 * a); ctx.fillRect(cr.trol.x - 7, G.jibY, 14, 5 * S);
        ctx.fillStyle = rgba('white', 0.6 * a);
        circle(cr.trol.x - 4, G.jibY + 1, 1.5, true); circle(cr.trol.x + 4, G.jibY + 1, 1.5, true);
        // twin hoist ropes
        ctx.strokeStyle = rgba('white', 0.45 * a); ctx.lineWidth = 1;
        line(cr.trol.x - 2, G.jibY + 5 * S, hk.x - 2, hk.y); line(cr.trol.x + 2, G.jibY + 5 * S, hk.x + 2, hk.y);
        // hook block + load rotate with the swing angle
        ctx.save();
        ctx.translate(hk.x, hk.y); ctx.rotate(-cr.th);
        ctx.fillStyle = rgba('amber', 0.8 * a); ctx.fillRect(-5, -3, 10, 7);
        ctx.strokeStyle = rgba('amber', 0.9 * a); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 9, 4.5, 0, Math.PI); ctx.stroke();
        if (cr.has || cr.st === 'hook' || cr.st === 'unhook') {
            var slack = cr.has ? 0 : 3 * S;     // slings go slack while rigging
            ctx.strokeStyle = rgba('white', 0.4 * a); ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(0, 10); ctx.quadraticCurveTo(-G.lw / 4, G.sling / 2 + slack, -G.lw / 2 + 2, G.sling); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, 10); ctx.quadraticCurveTo(G.lw / 4, G.sling / 2 + slack, G.lw / 2 - 2, G.sling); ctx.stroke();
        }
        if (cr.has) drawDuctSection(-G.lw / 2, G.sling, G.lw, G.lh, a);
        ctx.restore();

        var mass = cr.has ? 1.8 : 0.4;
        label('TC-01 · ' + mass.toFixed(1) + ' t · sway ' + (cr.th * 180 / Math.PI).toFixed(1) + '°', mx - jibL, my - 8, 'amber', 0.75 * a, 10);
    }

    /* ================================================================== */
    /* SCENE 1 — INDUSTRIAL AUTOMATION CELL                               */
    /* ================================================================== */
    var robo = null;

    function ik(bx, by, tx, ty, L1, L2) {
        var dx = tx - bx, dy = ty - by;
        var d = Math.min(Math.hypot(dx, dy), L1 + L2 - 0.5);
        var c2 = (d * d - L1 * L1 - L2 * L2) / (2 * L1 * L2);
        var a2 = -Math.acos(clamp(c2, -1, 1)); // elbow up
        var a1 = Math.atan2(dy, dx) - Math.atan2(L2 * Math.sin(a2), L1 + L2 * Math.cos(a2));
        var ex = bx + L1 * Math.cos(a1), ey = by + L1 * Math.sin(a1);
        return { ex: ex, ey: ey, x: ex + L2 * Math.cos(a1 + a2), y: ey + L2 * Math.sin(a1 + a2), a1: a1, a2: a2 };
    }

    function roboGeom() {
        var cvY = H * 0.86, L = (mobile ? 62 : 105) * S;
        var arms = mobile
            ? [{ bx: W * 0.82, dir: -1 }]
            : [{ bx: W * 0.12, dir: 1 }, { bx: W * 0.88, dir: -1 }];
        arms.forEach(function (g) {
            g.by = cvY - L * 1.05; g.L = L;
            g.pickX = g.bx + g.dir * 1.45 * L;
            g.palX = g.bx - g.dir * 1.2 * L;
        });
        return { cvY: cvY, L: L, bs: 30 * S, bh: 16 * S, v: 55 * S, spacing: 190 * S, arms: arms };
    }

    function initRobo(G) {
        robo = { boxes: [], dist: 0, n: 0, pos: 0, arms: [] };
        for (var x = W - G.spacing * 0.3; x > -G.bs; x -= G.spacing) robo.boxes.unshift({ x: x, claimed: null });
        robo.boxes.forEach(function (b, i) { b.id = i; });
        robo.n = robo.boxes.length;
        G.arms.forEach(function (g) {
            robo.arms.push({ tool: { x: g.pickX - g.dir * 0.4 * g.L, y: g.by - 0.2 * g.L, vx: 0, vy: 0 },
                grip: 0, st: 'wait', tm: 0, box: null, n: 0, clr: 0 });
        });
    }

    function stepRobo(G, dt) {
        robo.pos += G.v * dt;
        robo.dist += G.v * dt;
        for (var i = robo.boxes.length - 1; i >= 0; i--) {
            robo.boxes[i].x += G.v * dt;
            if (robo.boxes[i].x > W + 10) robo.boxes.splice(i, 1);
        }
        if (robo.dist >= G.spacing) {
            robo.dist -= G.spacing;
            robo.boxes.unshift({ id: robo.n++, x: -G.bs + robo.dist, claimed: null });
        }
        var gripY = G.cvY - G.bs - 14 * S;
        var palTop = G.cvY - 6 * S;

        G.arms.forEach(function (g, ai) {
            var arm = robo.arms[ai];
            if (!arm) return;
            var L = g.L, o = arm.tool, vmax = 2.4 * L, amax = 7 * L;
            var box = arm.box, bcx = box ? box.x + G.bs / 2 : 0;
            var placeY = palTop - (arm.n + 1) * G.bs - 14 * S;
            arm.tm += dt;
            if (arm.clr > 0) { arm.clr -= dt / 1.4; if (arm.clr <= 0) { arm.clr = 0; arm.n = 0; } }
            function lost() {           // box escaped the work envelope before it was gripped
                if (box && bcx > g.pickX + 0.45 * L) { box.claimed = null; arm.box = null; arm.st = 'wait'; arm.tm = 0; return true; }
                return false;
            }
            switch (arm.st) {
                case 'wait':
                    approach2(o, g.pickX - 0.45 * L, gripY - 0.55 * L, dt, vmax, amax);
                    if (arm.clr > 0 || arm.n >= 3) break;
                    for (var k = 0; k < robo.boxes.length; k++) {
                        var b = robo.boxes[k], cx = b.x + G.bs / 2;
                        if (b.claimed !== null || (G.arms.length > 1 && b.id % 2 !== ai)) continue;
                        if (cx > g.pickX - 0.85 * L && cx < g.pickX - 0.05 * L) {
                            b.claimed = ai; arm.box = b; arm.st = 'approach'; arm.tm = 0; break;
                        }
                    }
                    break;
                case 'approach':      // hover over the box while matching belt speed (conveyor tracking)
                    if (lost()) break;
                    if (approach2(o, bcx, gripY - 0.4 * L, dt, vmax, amax, G.v, 0)) { arm.st = 'descend'; arm.tm = 0; }
                    break;
                case 'descend':
                    if (lost()) break;
                    if (approach2(o, bcx, gripY, dt, vmax * 0.5, amax * 0.6, G.v, 0)) { arm.st = 'grip'; arm.tm = 0; }
                    break;
                case 'grip':
                    approach2(o, bcx, gripY, dt, vmax, amax, G.v, 0);
                    arm.grip = Math.min(1, arm.grip + dt / 0.25);
                    if (arm.grip >= 1) {
                        var bi = robo.boxes.indexOf(box);
                        if (bi >= 0) robo.boxes.splice(bi, 1);
                        box.held = true; arm.st = 'lift'; arm.tm = 0; arm.liftX = o.x + G.v * 0.15;
                    }
                    break;
                case 'lift':
                    if (approach2(o, arm.liftX, gripY - 0.75 * L, dt, vmax * 0.7, amax)) { arm.st = 'swing'; arm.tm = 0; }
                    break;
                case 'swing':
                    if (approach2(o, g.palX, placeY - 0.45 * L, dt, vmax, amax)) { arm.st = 'place'; arm.tm = 0; }
                    break;
                case 'place':
                    if (approach2(o, g.palX, placeY, dt, vmax * 0.35, amax * 0.5)) { arm.st = 'release'; arm.tm = 0; }
                    break;
                case 'release':
                    arm.grip = Math.max(0, arm.grip - dt / 0.25);
                    if (arm.grip <= 0) { arm.n++; arm.box = null; arm.st = 'retreat'; arm.tm = 0; }
                    break;
                case 'retreat':
                    if (approach2(o, g.palX, placeY - 0.4 * L, dt, vmax * 0.6, amax)) {
                        if (arm.n >= 3) arm.clr = 1;       // pallet full → dispatched
                        arm.st = 'wait'; arm.tm = 0;
                    }
                    break;
            }
            if (arm.tm > 8 && arm.st !== 'wait') {           // watchdog
                if (arm.box && !arm.box.held) arm.box.claimed = null;
                arm.box = null; arm.grip = 0; arm.st = 'wait'; arm.tm = 0;
            }
        });
    }

    function drawBox(x, y, s, a, id) {
        var g = ctx.createLinearGradient(x, y, x + s, y + s);
        g.addColorStop(0, rgba('251,191,96', 0.42 * a)); g.addColorStop(1, rgba('180,100,20', 0.22 * a));
        ctx.fillStyle = g; ctx.fillRect(x, y, s, s);
        ctx.strokeStyle = rgba('amber', 0.85 * a); ctx.lineWidth = 1.3; ctx.strokeRect(x, y, s, s);
        ctx.strokeStyle = rgba('orange', 0.55 * a); ctx.lineWidth = 2;
        line(x + s / 2, y, x + s / 2, y + s * 0.35);                        // tape
        ctx.fillStyle = rgba('white', 0.35 * a); ctx.fillRect(x + s * 0.15, y + s * 0.6, s * 0.35, s * 0.18); // label
        if (id !== undefined) label('#' + (100 + ((id * 7) % 89)), x + 2, y - 4, 'amber', 0.5 * a, 8);
    }

    function metalLink(x1, y1, x2, y2, w, a) {
        var ang = Math.atan2(y2 - y1, x2 - x1), nx = -Math.sin(ang) * w / 2, ny = Math.cos(ang) * w / 2;
        var mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
        var g = ctx.createLinearGradient(mx - nx, my - ny, mx + nx, my + ny);
        g.addColorStop(0, rgba('120,70,6', 0.85 * a));
        g.addColorStop(0.3, rgba('255,206,120', 0.9 * a));
        g.addColorStop(0.55, rgba('245,158,11', 0.85 * a));
        g.addColorStop(1, rgba('70,40,4', 0.9 * a));
        ctx.strokeStyle = g; ctx.lineWidth = w; ctx.lineCap = 'round';
        line(x1, y1, x2, y2);
    }
    function jointCap(x, y, r, a) {
        var g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
        g.addColorStop(0, rgba('220,250,255', 0.95 * a)); g.addColorStop(0.5, rgba('cyan', 0.8 * a)); g.addColorStop(1, rgba('0,70,80', 0.9 * a));
        ctx.fillStyle = g; circle(x, y, r, true);
    }

    function drawArm(g, arm, a, G) {
        var bx = g.bx, by = g.by;
        var r = ik(bx, by, arm.tool.x, arm.tool.y, g.L, g.L);
        var carrying = !!(arm.box && arm.box.held);

        // pallet stand + stacked boxes
        var palTop = G.cvY - 6 * S;
        ctx.strokeStyle = rgba('amber', 0.45 * a); ctx.lineWidth = 1.5;
        ctx.fillStyle = rgba('amber', 0.15 * a);
        ctx.fillRect(g.palX - G.bs * 0.8, palTop, G.bs * 1.6, 6 * S);
        ctx.strokeRect(g.palX - G.bs * 0.8, palTop, G.bs * 1.6, 6 * S);
        line(g.palX - G.bs * 0.6, palTop + 6 * S, g.palX - G.bs * 0.6, H);
        line(g.palX + G.bs * 0.6, palTop + 6 * S, g.palX + G.bs * 0.6, H);
        var slide = arm.clr > 0 ? (1 - arm.clr) : 0, sa = arm.clr > 0 ? arm.clr : 1;
        for (var s = 0; s < arm.n; s++) {
            drawBox(g.palX - G.bs / 2 - g.dir * slide * 60 * S, palTop - (s + 1) * G.bs, G.bs, a * sa);
        }
        label('PALLET ' + arm.n + '/3', g.palX, palTop + 20 * S, 'amber', 0.6 * a, 9, 'center');

        // pedestal
        var pg = ctx.createLinearGradient(bx - 18 * S, 0, bx + 18 * S, 0);
        pg.addColorStop(0, rgba('amber', 0.06 * a)); pg.addColorStop(0.4, rgba('amber', 0.2 * a)); pg.addColorStop(1, rgba('amber', 0.05 * a));
        ctx.fillStyle = pg; ctx.fillRect(bx - 18 * S, by, 36 * S, H - by);
        ctx.strokeStyle = rgba('amber', 0.5 * a); ctx.lineWidth = 1.5;
        ctx.strokeRect(bx - 18 * S, by, 36 * S, H - by);
        // links with metallic shading + a dress-pack cable along the arm
        metalLink(bx, by, r.ex, r.ey, 14 * S, a);
        metalLink(r.ex, r.ey, r.x, r.y, 11 * S, a);
        ctx.strokeStyle = rgba('20,14,4', 0.7 * a); ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(bx, by - 6 * S);
        ctx.quadraticCurveTo(r.ex, r.ey - 14 * S, r.x, r.y - 4 * S); ctx.stroke();
        jointCap(bx, by, 8 * S, a); jointCap(r.ex, r.ey, 6.5 * S, a);
        ctx.strokeStyle = rgba('cyan', 0.35 * a); ctx.lineWidth = 1;
        circle(bx, by, 12 * S); circle(r.ex, r.ey, 10 * S);

        // wrist + parallel gripper (kept vertical, fingers close on the box sides)
        var gw = lerp(G.bs / 2 + 7 * S, G.bs / 2 + 1.5 * S, arm.grip);
        if (carrying) drawBox(r.x - G.bs / 2, r.y + 14 * S, G.bs, a);
        ctx.strokeStyle = rgba('cyan', 0.9 * a); ctx.lineWidth = 3 * S;
        line(r.x, r.y, r.x, r.y + 10 * S);
        ctx.lineWidth = 2.5 * S;
        line(r.x - gw, r.y + 10 * S, r.x + gw, r.y + 10 * S);
        line(r.x - gw, r.y + 10 * S, r.x - gw, r.y + 26 * S);
        line(r.x + gw, r.y + 10 * S, r.x + gw, r.y + 26 * S);

        // live joint readout
        var j1 = (-r.a1 * 180 / Math.PI).toFixed(1), j2 = (-r.a2 * 180 / Math.PI).toFixed(1);
        label('J1 ' + j1 + '°  J2 ' + j2 + '°', bx, by + 26 * S, 'cyan', 0.75 * a, 10, 'center');
        var stTxt = { wait: '○ READY', approach: '◎ TRACKING', descend: '◎ TRACKING', grip: '● GRIP', lift: '● LIFT',
            swing: '● MOVE', place: '● PLACE', release: '○ RELEASE', retreat: '○ RETRACT' }[arm.st];
        label(stTxt, bx, by + 40 * S, arm.grip > 0.5 ? 'green' : 'white', 0.7 * a, 9, 'center');
    }

    function drawDrone(cx, cy, size, a, tilt, seed) {
        ctx.save();
        ctx.translate(cx, cy); ctx.rotate(tilt);
        // scan cone
        var g = ctx.createLinearGradient(0, 0, 0, size * 5);
        g.addColorStop(0, rgba('cyan', 0.18 * a)); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(-size * 0.25, size * 0.3); ctx.lineTo(size * 0.25, size * 0.3);
        ctx.lineTo(size * 1.3, size * 5); ctx.lineTo(-size * 1.3, size * 5); ctx.closePath(); ctx.fill();
        var sl = ((t * 1.2 + seed) % 1) * size * 4.6;
        ctx.strokeStyle = rgba('cyan', 0.5 * a * (1 - sl / (size * 4.6))); ctx.lineWidth = 1;
        line(-size * 0.25 - sl * 0.23, size * 0.3 + sl, size * 0.25 + sl * 0.23, size * 0.3 + sl);
        // arms
        ctx.strokeStyle = rgba('amber', 0.8 * a); ctx.lineWidth = 3;
        line(-size, 0, size, 0);
        line(-size * 0.9, 0, -size * 0.9, -size * 0.2); line(size * 0.9, 0, size * 0.9, -size * 0.2);
        // rotors: translucent blur discs (seen in perspective) with a faint strobing blade
        [-1, 1].forEach(function (s2, i) {
            var rx = size * 0.55, ry = size * 0.09, cxr = s2 * size * 0.9, cyr = -size * 0.22;
            var rg = ctx.createRadialGradient(cxr, cyr, 0, cxr, cyr, rx);
            rg.addColorStop(0, rgba('white', 0.04 * a)); rg.addColorStop(0.8, rgba('white', 0.16 * a)); rg.addColorStop(1, rgba('white', 0.02 * a));
            ctx.fillStyle = rg;
            ctx.beginPath(); ctx.ellipse(cxr, cyr, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
            var ph = t * 41 * (i ? -1 : 1) + seed;
            ctx.strokeStyle = rgba('white', 0.35 * a); ctx.lineWidth = 1.5;
            line(cxr - Math.cos(ph) * rx, cyr - Math.sin(ph) * ry, cxr + Math.cos(ph) * rx, cyr + Math.sin(ph) * ry);
        });
        // body
        ctx.fillStyle = rgba('12,16,26', 0.95 * a); ctx.strokeStyle = rgba('cyan', 0.9 * a); ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-size * 0.35, -size * 0.18, size * 0.7, size * 0.36, 5) : ctx.rect(-size * 0.35, -size * 0.18, size * 0.7, size * 0.36);
        ctx.fill(); ctx.stroke();
        ctx.strokeStyle = rgba('blue', 0.7 * a);
        line(0, size * 0.18, 0, size * 0.32);
        // navigation LEDs: steady green/red sides, white anti-collision strobe
        ctx.fillStyle = rgba('green', 0.9 * a); circle(size * 0.98, 0, 2, true);
        ctx.fillStyle = rgba('red', 0.9 * a); circle(-size * 0.98, 0, 2, true);
        if (((t + seed) % 1.2) < 0.06) { ctx.fillStyle = rgba('white', a); circle(0, -size * 0.18, 2.2, true); glow(0, -size * 0.18, 12, 'white', 0.5 * a); }
        ctx.restore();
    }

    /* Drone flight path + its analytic acceleration → bank angle = atan(a / g) like a real quadcopter */
    function droneState(Ax, wx, ph, Ay, wy, cxp, cyp, seed) {
        var x = cxp + Ax * Math.sin(wx * t + ph);
        var y = cyp + Ay * Math.sin(wy * t + ph) + noise(t * 1.3, seed) * 3 * S;
        var ax = -Ax * wx * wx * Math.sin(wx * t + ph);
        var gpx = 9.81 * 18 * S;
        return { x: x, y: y, tilt: Math.atan(ax / gpx) * 2.2 + noise(t * 2, seed) * 0.02 };
    }

    function drawRobo(a, dt) {
        var G = roboGeom();
        if (!robo || robo.arms.length !== G.arms.length) initRobo(G);
        if (dt) stepRobo(G, dt);
        var cvY = G.cvY;
        ctx.lineCap = 'round';

        /* --- PCB traces with signal pulses --- */
        for (var i = 0; i < traces.length; i++) {
            var tr = traces[i];
            ctx.strokeStyle = rgba('amber', 0.22 * a); ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(tr.pts[0][0], tr.pts[0][1]);
            for (var j = 1; j < tr.pts.length; j++) ctx.lineTo(tr.pts[j][0], tr.pts[j][1]);
            ctx.stroke();
            var end = tr.pts[tr.pts.length - 1];
            ctx.strokeStyle = rgba('amber', 0.45 * a); circle(end[0], end[1], 4);
            var dist = (t * tr.speed + tr.off) % tr.len, acc = 0;
            for (var k = 1; k < tr.pts.length; k++) {
                var p0 = tr.pts[k - 1], p1 = tr.pts[k], sl = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
                if (acc + sl >= dist) {
                    var u = (dist - acc) / sl;
                    ctx.fillStyle = rgba('cyan', 0.95 * a);
                    ctx.shadowColor = rgba('cyan', a); ctx.shadowBlur = 10;
                    circle(lerp(p0[0], p1[0], u), lerp(p0[1], p1[1], u), 2.8, true);
                    ctx.shadowBlur = 0;
                    break;
                }
                acc += sl;
            }
        }

        /* --- Conveyor belt (dashes + rollers driven by the actual belt travel) --- */
        var bh = G.bh;
        ctx.strokeStyle = rgba('amber', 0.5 * a); ctx.lineWidth = 1.5;
        line(0, cvY, W, cvY); line(0, cvY + bh, W, cvY + bh);
        ctx.setLineDash([10, 10]); ctx.lineDashOffset = -robo.pos;
        ctx.strokeStyle = rgba('amber', 0.3 * a);
        line(0, cvY + bh / 2, W, cvY + bh / 2);
        ctx.setLineDash([]); ctx.lineDashOffset = 0;
        var rs = 46 * S, rr = 7 * S, ra = robo.pos / rr;
        ctx.strokeStyle = rgba('amber', 0.4 * a); ctx.lineWidth = 1;
        for (var rx = rs / 2; rx < W; rx += rs) {
            var ry = cvY + bh + 9 * S;
            circle(rx, ry, rr);
            line(rx - Math.cos(ra) * rr, ry - Math.sin(ra) * rr, rx + Math.cos(ra) * rr, ry + Math.sin(ra) * rr);
        }
        for (var b = 0; b < robo.boxes.length; b++) {
            var bxp = robo.boxes[b].x;
            ctx.fillStyle = rgba('0,0,0', 0.3 * a); ctx.fillRect(bxp + 3, cvY - 2, G.bs, 3);   // contact shadow
            drawBox(bxp, cvY - G.bs, G.bs, a, robo.boxes[b].id);
        }
        // photo-eye sensor at each pick station
        G.arms.forEach(function (g) {
            var hit = robo.boxes.some(function (bb) { return Math.abs(bb.x + G.bs / 2 - g.pickX) < G.bs / 2; });
            ctx.fillStyle = rgba(hit ? 'green' : 'red', 0.85 * a);
            circle(g.pickX, cvY + bh + 26 * S, 2.5, true);
        });
        label('CONVEYOR CV-02 · 0.35 m/s', 12, cvY + bh + 34 * S, 'amber', 0.6 * a, 10);

        /* --- Robot arms --- */
        G.arms.forEach(function (g, ai) { drawArm(g, robo.arms[ai], a, G); });

        /* --- Drones --- */
        var d1 = droneState(W * (mobile ? 0.3 : 0.36), 0.22, 0, H * 0.05, 0.7, W * 0.5, H * 0.2, 1);
        drawDrone(d1.x, d1.y, (mobile ? 26 : 38) * S, a, d1.tilt, 0);
        if (!mobile) {
            var d2 = droneState(W * 0.28, 0.17, 2.4, H * 0.04, 0.9, W * 0.5, H * 0.36, 7);
            drawDrone(d2.x, d2.y, 24 * S, a * 0.55, d2.tilt, 0.5);
        }
        label('UAV-01 · ALT ' + (12 + 3 * Math.sin(t * 0.7)).toFixed(1) + ' m · BANK ' + (d1.tilt * 180 / Math.PI).toFixed(0) + '°',
            d1.x, d1.y - 40 * S, 'cyan', 0.7 * a, 10, 'center');
    }

    /* ================================================================== */
    /* SCENE 2 — STEM / PHYSICS                                            */
    /* ================================================================== */
    var PEND_TH0 = 0.75;
    var pend = { th: PEND_TH0, w: 0, trail: [] };
    var proj = { x: 0, y: 0, vx: 0, vy: 0, st: 'reset', tm: 0, trail: [], sq: 0 };

    function pendAcc(th, w, gL) { return -gL * Math.sin(th) - 0.004 * w; }
    function stepPendulum(dt) {
        // Nonlinear pendulum θ'' = −(g/L)·sinθ, integrated with RK4 (small-angle period ≈ 2.6 s)
        var gL = Math.pow(2 * Math.PI / 2.6, 2), n = 3, h = dt / n;
        for (var i = 0; i < n; i++) {
            var th = pend.th, w = pend.w;
            var k1t = w, k1w = pendAcc(th, w, gL);
            var k2t = w + k1w * h / 2, k2w = pendAcc(th + k1t * h / 2, w + k1w * h / 2, gL);
            var k3t = w + k2w * h / 2, k3w = pendAcc(th + k2t * h / 2, w + k2w * h / 2, gL);
            var k4t = w + k3w * h, k4w = pendAcc(th + k3t * h, w + k3w * h, gL);
            pend.th += (k1t + 2 * k2t + 2 * k3t + k4t) * h / 6;
            pend.w += (k1w + 2 * k2w + 2 * k3w + k4w) * h / 6;
        }
        // air drag slowly bleeds energy; top it up at the bottom of the swing so it never dies out
        var E = 0.5 * pend.w * pend.w + gL * (1 - Math.cos(pend.th));
        var E0 = gL * (1 - Math.cos(PEND_TH0));
        if (E < E0 * 0.75 && Math.abs(pend.th) < 0.05) pend.w *= Math.sqrt(E0 / E);
    }

    function stepProjectile(dt, R, Hm) {
        var T = 3.0, g = 8 * Hm / (T * T);             // apex Hm reached at T/2
        if (proj.st === 'reset') {
            proj.x = 0; proj.y = 0; proj.vx = R / T; proj.vy = 4 * Hm / T; proj.st = 'fly'; proj.tm = 0; proj.trail = [];
        }
        proj.tm += dt;
        proj.sq = Math.max(0, proj.sq - dt * 6);
        if (proj.st === 'fly') {
            proj.vy -= g * dt;
            proj.x += proj.vx * dt; proj.y += proj.vy * dt;
            if (proj.y <= 0) {                             // impact: restitution + friction
                proj.y = 0;
                proj.sq = Math.min(1, Math.abs(proj.vy) / (4 * Hm / T));
                proj.vy = -proj.vy * 0.62; proj.vx *= 0.8;
                if (proj.vy < Hm * 0.08) { proj.vy = 0; proj.st = 'roll'; }
            }
        } else if (proj.st === 'roll') {
            proj.vx = Math.max(0, proj.vx - R * 0.35 * dt);   // rolling resistance
            proj.x += proj.vx * dt;
            if (proj.vx <= 0) { proj.st = 'rest'; proj.tm = 0; }
        } else if (proj.st === 'rest' && proj.tm > 1.2) {
            proj.st = 'reset';
        }
        if (dt > 0) { proj.trail.push([proj.x, proj.y]); if (proj.trail.length > 90) proj.trail.shift(); }
    }

    function drawSTEM(a, dt) {
        dt = dt || 0;
        /* --- Floating formulas (depth parallax + gentle sideways drift) --- */
        for (var i = 0; i < formulas.length; i++) {
            var f = formulas[i];
            if (dt) { f.y -= f.vy * dt; if (f.y < -40) { f.y = H + 40; f.x = rand(0.03, 0.97) * W; } }
            var tw = 0.45 + 0.35 * Math.sin(t * 0.8 + f.ph);
            ctx.save();
            ctx.translate(f.x + Math.sin(t * 0.25 + f.ph) * f.sway, f.y); ctx.rotate(f.rot + Math.sin(t * 0.3 + f.ph) * 0.03);
            ctx.font = 'italic ' + f.size + 'px "Cambria Math", "Times New Roman", serif';
            ctx.fillStyle = rgba(f.col, tw * lerp(0.3, 0.65, f.z) * a);
            ctx.fillText(f.text, 0, 0);
            ctx.restore();
        }

        ctx.lineCap = 'round';
        /* --- Pendulum (nonlinear, RK4) --- */
        if (dt) stepPendulum(dt);
        var pvx = mobile ? W * 0.14 : W * 0.1, pvy = H * 0.15;
        var Lp = Math.min(H * 0.32, 260 * S + 60);
        ctx.strokeStyle = rgba('violet', 0.6 * a); ctx.lineWidth = 3;
        line(pvx - 30 * S, pvy, pvx + 30 * S, pvy);
        for (var h = 0; h < 4; h++) line(pvx - 30 * S + h * 18 * S, pvy, pvx - 36 * S + h * 18 * S, pvy - 8);
        var th = pend.th;
        var pbx = pvx + Lp * Math.sin(th), pby = pvy + Lp * Math.cos(th);
        if (dt) { pend.trail.push([pbx, pby]); if (pend.trail.length > 22) pend.trail.shift(); }
        // fading motion trail along the real path
        for (var tr = 1; tr < pend.trail.length; tr++) {
            var p0 = pend.trail[tr - 1], p1 = pend.trail[tr];
            ctx.strokeStyle = rgba('purple', 0.4 * (tr / pend.trail.length) * a);
            ctx.lineWidth = 16 * S * (tr / pend.trail.length);
            line(p0[0], p0[1], p1[0], p1[1]);
        }
        ctx.strokeStyle = rgba('white', 0.5 * a); ctx.lineWidth = 1.2;
        line(pvx, pvy, pbx, pby);
        var bg = ctx.createRadialGradient(pbx - 4 * S, pby - 4 * S, 1, pbx, pby, 13 * S);
        bg.addColorStop(0, rgba('235,220,255', 0.95 * a)); bg.addColorStop(0.45, rgba('purple', 0.95 * a)); bg.addColorStop(1, rgba('60,20,100', 0.95 * a));
        ctx.fillStyle = bg; circle(pbx, pby, 13 * S, true);
        ctx.setLineDash([4, 5]); ctx.strokeStyle = rgba('violet', 0.35 * a); ctx.lineWidth = 1.2;
        line(pvx, pvy, pvx, pvy + Lp + 20);
        ctx.setLineDash([]);
        ctx.beginPath(); ctx.arc(pvx, pvy, 40 * S, Math.PI / 2 - th, Math.PI / 2, th < 0); ctx.stroke();
        label('θ = ' + (th * 180 / Math.PI).toFixed(1) + '°  ω = ' + pend.w.toFixed(2) + ' rad/s', pvx + 8, pvy + 60 * S, 'violet', 0.85 * a, 11);
        label('θ″ = −(g/L)·sinθ', pvx - 30 * S, pvy - 16, 'violet', 0.7 * a, 10);

        /* --- Atom (3-D orbits, depth-sorted electrons with trails) --- */
        var ax = mobile ? W * 0.84 : W * 0.86, ay = H * 0.27, ar = (mobile ? 46 : 74) * S;
        var inc = Math.acos(0.36), els = [];
        ctx.lineWidth = 1.2;
        for (var o = 0; o < 3; o++) {
            var rot = o * Math.PI / 3 + t * 0.15;
            ctx.strokeStyle = rgba('cyan', 0.3 * a);
            ctx.beginPath(); ctx.ellipse(ax, ay, ar, ar * 0.36, rot, 0, Math.PI * 2); ctx.stroke();
            els.push({ e: t * (1.6 + o * 0.35) + o * 2, rot: rot });
        }
        function project(e, rot) {
            var ex = ar * Math.cos(e), ey = ar * Math.sin(e) * Math.cos(inc), ez = Math.sin(e) * Math.sin(inc);
            return { x: ax + ex * Math.cos(rot) - ey * Math.sin(rot), y: ay + ex * Math.sin(rot) + ey * Math.cos(rot), z: ez };
        }
        function drawElectron(el) {
            ctx.save(); ctx.globalCompositeOperation = 'lighter';
            for (var s = 10; s >= 0; s--) {
                var pp = project(el.e - s * 0.06, el.rot);
                var depth = 0.55 + 0.45 * pp.z;
                ctx.fillStyle = rgba('cyan', (s === 0 ? 0.95 : 0.22 * (1 - s / 11)) * depth * a);
                circle(pp.x, pp.y, (s === 0 ? 3.6 : 2.6) * (0.75 + 0.35 * pp.z), true);
            }
            var hp = project(el.e, el.rot);
            glow(hp.x, hp.y, 12, 'cyan', 0.45 * (0.55 + 0.45 * hp.z) * a);
            ctx.restore();
        }
        els.forEach(function (el) { if (project(el.e, el.rot).z < 0) drawElectron(el); });
        var nuc = [[0, 0, 'purple'], [5, 3, 'red'], [-4, 4, 'purple'], [2, -5, 'red'], [-5, -2, 'red'], [4, -1, 'purple']];
        var jit = noise(t * 6) * 0.6;
        nuc.forEach(function (n) {
            var nx = ax + (n[0] + jit) * S, ny = ay + (n[1] - jit) * S, nr = 5 * S;
            var ng = ctx.createRadialGradient(nx - nr * 0.35, ny - nr * 0.35, 0.5, nx, ny, nr);
            ng.addColorStop(0, rgba('white', 0.9 * a)); ng.addColorStop(0.5, rgba(n[2], 0.9 * a)); ng.addColorStop(1, rgba('20,10,30', 0.9 * a));
            ctx.fillStyle = ng; circle(nx, ny, nr, true);
        });
        els.forEach(function (el) { if (project(el.e, el.rot).z >= 0) drawElectron(el); });

        /* --- Projectile with bounces --- */
        if (!mobile) {
            var x0 = W * 0.2, y0 = H * 0.86, R = W * 0.24, Hm = H * 0.32;
            stepProjectile(dt, R, Hm);
            ctx.strokeStyle = rgba('white', 0.25 * a); ctx.lineWidth = 1;
            line(x0, y0, x0 + R * 1.85, y0); line(x0, y0, x0, y0 - Hm - 30);
            label('x', x0 + R * 1.85 + 4, y0 + 4, 'white', 0.5 * a, 10); label('y', x0 - 4, y0 - Hm - 36, 'white', 0.5 * a, 10);
            // ideal (no-bounce) parabola for reference
            ctx.fillStyle = rgba('violet', 0.22 * a);
            for (var s = 0; s <= 1.0001; s += 0.05) circle(x0 + R * s, y0 - 4 * Hm * s * (1 - s), 1.4, true);
            // actual path trail
            ctx.lineWidth = 2;
            for (var q = 1; q < proj.trail.length; q++) {
                var u0 = proj.trail[q - 1], u1 = proj.trail[q];
                ctx.strokeStyle = rgba('violet', 0.55 * (q / proj.trail.length) * a);
                line(x0 + u0[0], y0 - u0[1], x0 + u1[0], y0 - u1[1]);
            }
            var pxp = x0 + proj.x, pyp = y0 - proj.y, br = 7 * S, vs = 0.3;
            if (proj.st === 'fly' || proj.st === 'roll') {
                ctx.strokeStyle = rgba('amber', 0.85 * a); ctx.lineWidth = 2;
                arrow(pxp, pyp, pxp + proj.vx * vs, pyp - proj.vy * vs);
                ctx.strokeStyle = rgba('cyan', 0.6 * a); ctx.lineWidth = 1.2;
                arrow(pxp, pyp, pxp + proj.vx * vs, pyp);
                arrow(pxp, pyp, pxp, pyp - proj.vy * vs);
                label('v', pxp + proj.vx * vs + 6, pyp - proj.vy * vs, 'amber', 0.9 * a, 12);
            }
            // shadow + squash-and-stretch on impact
            var hgt = clamp(proj.y / Hm, 0, 1);
            ctx.fillStyle = rgba('0,0,0', 0.35 * (1 - hgt * 0.8) * a);
            ctx.beginPath(); ctx.ellipse(pxp, y0 + 1, br * (1.2 - hgt * 0.5), 2.5, 0, 0, Math.PI * 2); ctx.fill();
            var sq = proj.sq * 0.35;
            ctx.save();
            ctx.translate(pxp, pyp - br * (1 - sq));
            ctx.scale(1 + sq, 1 - sq);
            var pg = ctx.createRadialGradient(-br * 0.35, -br * 0.35, 0.5, 0, 0, br);
            pg.addColorStop(0, rgba('white', a)); pg.addColorStop(0.6, rgba('violet', 0.95 * a)); pg.addColorStop(1, rgba('purple', 0.9 * a));
            ctx.fillStyle = pg;
            ctx.shadowColor = rgba('violet', a); ctx.shadowBlur = 12;
            circle(0, 0, br, true);
            ctx.restore();
            label('e = 0.62 · y = x·tanθ − gx² / (2v²cos²θ)', x0 + 6, y0 - Hm - 12, 'violet', 0.7 * a, 11);
        }

        /* --- Wave interference --- */
        var wy = H * 0.95, A = 9 * S;
        var waves = [[0.018, 2.2, 'purple', 0.55], [0.026, -1.6, 'cyan', 0.45]];
        waves.forEach(function (w) {
            ctx.strokeStyle = rgba(w[2], w[3] * a); ctx.lineWidth = 1.5;
            ctx.beginPath();
            for (var x = 0; x <= W; x += 6) {
                var y = wy + A * Math.sin(x * w[0] / S + t * w[1]);
                x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
            }
            ctx.stroke();
        });
        ctx.strokeStyle = rgba('white', 0.35 * a); ctx.lineWidth = 1;
        ctx.beginPath();
        for (var x2 = 0; x2 <= W; x2 += 6) {
            var y2 = wy - 34 * S + A * (Math.sin(x2 * 0.018 / S + t * 2.2) + Math.sin(x2 * 0.026 / S - t * 1.6));
            x2 === 0 ? ctx.moveTo(x2, y2) : ctx.lineTo(x2, y2);
        }
        ctx.stroke();
        label('y = A sin(kx − ωt)', W - 12, wy - 52 * S, 'violet', 0.65 * a, 10, 'right');
    }

    function arrow(x1, y1, x2, y2) {
        line(x1, y1, x2, y2);
        var ang = Math.atan2(y2 - y1, x2 - x1), hs = 7;
        if (Math.hypot(x2 - x1, y2 - y1) < 4) return;
        line(x2, y2, x2 - hs * Math.cos(ang - 0.4), y2 - hs * Math.sin(ang - 0.4));
        line(x2, y2, x2 - hs * Math.cos(ang + 0.4), y2 - hs * Math.sin(ang + 0.4));
    }

    /* ------------------------------------------------------------------ */
    /* Render loop                                                         */
    /* ------------------------------------------------------------------ */
    var DRAW = [drawMEP, drawRobo, drawSTEM];

    function intensity() {
        // Strong behind the hero, calmer behind text-heavy sections so content stays readable
        var k = Math.max(0, Math.min(1, 1 - window.scrollY / (H * 0.9)));
        return (0.42 + 0.58 * k) * (mobile ? 0.8 : 1);
    }

    function frame(dt) {
        ctx.clearRect(0, 0, W, H);
        var I = intensity();
        if (prevScene !== null && mix < 1) {
            tint(ACCENT[prevScene], 1 - mix);
            tint(ACCENT[scene], mix);
            drawBase(ACCENT[scene], 1);
            DRAW[prevScene](I * (1 - mix), dt);
            DRAW[scene](I * mix, dt);
        } else {
            tint(ACCENT[scene], 1);
            drawBase(ACCENT[scene], 1);
            DRAW[scene](I, dt);
        }
    }

    function loop(ts) {
        var dt = lastTs ? Math.min(0.05, (ts - lastTs) / 1000) : 0.016;
        lastTs = ts;
        if (!document.hidden) {
            t += dt;
            moveNodes(dt);
            if (mix < 1) { mix = Math.min(1, mix + dt / 0.9); if (mix >= 1) prevScene = null; }
            frame(dt);
        } else {
            lastTs = 0;   // don't let the physics jump after the tab was hidden
        }
        requestAnimationFrame(loop);
    }

    window.BgScenes = {
        init: function () {
            canvas = document.getElementById('blueprint-canvas');
            if (!canvas || !canvas.getContext) return;
            ctx = canvas.getContext('2d');
            resize();
            window.addEventListener('resize', resize);
            if (reduce) {
                t = 2.5; frame(0);
                window.addEventListener('scroll', function () { frame(0); }, { passive: true });
            } else {
                requestAnimationFrame(loop);
            }
        },
        setScene: function (i) {
            i = ((i % 3) + 3) % 3;
            if (i === scene || !ctx) return;
            prevScene = scene; scene = i; mix = reduce ? 1 : 0;
            if (reduce) { prevScene = null; frame(0); }
            document.body.setAttribute('data-scene', ['mep', 'robotics', 'stem'][i]);
        },
        get scene() { return scene; }
    };
})();

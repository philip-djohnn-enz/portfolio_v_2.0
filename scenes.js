/**
 * CHORN PHILIP PORTFOLIO — ANIMATED BACKGROUND SCENES
 * One full-screen canvas behind the page, with three hand-drawn scenes that cross-fade
 * when the specialty switch changes:
 *   0  MEP        — building going up floor by floor, ducts with airflow, water & power risers,
 *                   tower crane carrying a load, spinning AHU fan
 *   1  ROBOTICS   — automation cell: two robot arms picking boxes off a conveyor,
 *                   scanning drones, PCB traces with signal pulses
 *   2  STEM       — floating physics formulas, pendulum, projectile motion, atom, wave interference
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
    function rgba(c, a) { return 'rgba(' + (C[c] || c) + ',' + a + ')'; }
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
        W = window.innerWidth; H = window.innerHeight;
        canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
        canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        mobile = W < 768;
        S = Math.max(0.55, Math.min(W, H * 1.3) / 1100);
        buildNodes(); buildTraces(); buildFormulas();
        if (reduce) frame(0);
    }

    function rand(a, b) { return a + Math.random() * (b - a); }

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
            formulas.push({
                text: FORMULAS[i % FORMULAS.length],
                x: rand(0.03, 0.97) * W, y: rand(0, H),
                vy: rand(8, 22), size: rand(14, mobile ? 20 : 30) * Math.max(S, 0.8),
                rot: rand(-0.12, 0.12), ph: rand(0, 6.28),
                col: Math.random() > 0.35 ? 'violet' : 'cyan'
            });
        }
    }

    /* ------------------------------------------------------------------ */
    /* Shared helpers                                                     */
    /* ------------------------------------------------------------------ */
    function line(x1, y1, x2, y2) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
    function circle(x, y, r, fill) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); fill ? ctx.fill() : ctx.stroke(); }
    function label(txt, x, y, col, a, size, align) {
        ctx.font = (size || 10) * Math.max(S, 0.9) + 'px "JetBrains Mono", monospace';
        ctx.textAlign = align || 'left';
        ctx.fillStyle = rgba(col, a);
        ctx.fillText(txt, x, y);
        ctx.textAlign = 'left';
    }
    function ease(x) { return 0.5 - 0.5 * Math.cos(Math.PI * Math.max(0, Math.min(1, x))); }
    function lerp(a, b, k) { return a + (b - a) * k; }

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
            p.x += p.vx * dt * 60; p.y += p.vy * dt * 60;
            if (p.x < 0 || p.x > W) p.vx *= -1;
            if (p.y < 0 || p.y > H) p.vy *= -1;
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
    function drawMEP(a) {
        var gy = H * 0.95;
        ctx.lineCap = 'round';

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
        var cyc = 16, p = (t % cyc) / cyc;
        var built = Math.min(maxF, 1 + Math.floor(p * (maxF + 1.5)));
        var topY = gy - built * fh;

        // columns
        ctx.strokeStyle = rgba('cyan', 0.45 * a); ctx.lineWidth = 2;
        var cols = 4;
        for (var c = 0; c <= cols; c++) {
            var cx = bx + (bw * c) / cols;
            line(cx, gy, cx, topY);
        }
        for (var f = 0; f < built; f++) {
            var fy = gy - (f + 1) * fh;
            var isNew = f === built - 1 && built < maxF;
            // slab
            ctx.strokeStyle = rgba(isNew ? 'amber' : 'cyan', (isNew ? 0.55 + 0.35 * Math.sin(t * 6) : 0.5) * a);
            ctx.lineWidth = isNew ? 2.5 : 2;
            if (isNew) ctx.setLineDash([6, 5]);
            line(bx - 6, fy, bx + bw + 6, fy);
            ctx.setLineDash([]);
            if (isNew) continue;

            // duct with moving airflow
            var dy = fy + fh * 0.22, dh = fh * 0.2;
            ctx.strokeStyle = rgba('blue', 0.45 * a); ctx.lineWidth = 1.2;
            ctx.strokeRect(bx + 10, dy, bw * 0.62, dh);
            ctx.setLineDash([5, 7]);
            ctx.lineDashOffset = (f % 2 ? 1 : -1) * t * 35;
            ctx.strokeStyle = rgba('cyan', 0.75 * a);
            line(bx + 14, dy + dh / 2, bx + 6 + bw * 0.62, dy + dh / 2);
            ctx.setLineDash([]); ctx.lineDashOffset = 0;
            // diffusers
            ctx.fillStyle = rgba('cyan', 0.35 * a);
            for (var d = 1; d <= 2; d++) ctx.fillRect(bx + 10 + bw * 0.2 * d, dy + dh, 10, 3);
        }

        // risers: water (supply/return) + electrical
        var rTop = topY + 4, riseH = gy - rTop;
        var px = bx + bw * 0.8;
        ctx.lineWidth = 2;
        ctx.strokeStyle = rgba('blue', 0.55 * a); line(px, gy, px, rTop);
        ctx.strokeStyle = rgba('green', 0.45 * a); line(px + 9, gy, px + 9, rTop);
        var ex = bx + bw * 0.9;
        ctx.strokeStyle = rgba('amber', 0.5 * a); line(ex, gy, ex, rTop);
        if (riseH > 20) {
            for (var k = 0; k < 6; k++) {
                var up = (t * 55 + k * (riseH / 6)) % riseH;
                ctx.fillStyle = rgba('blue', 0.9 * a); circle(px, gy - up, 2.4, true);
                ctx.fillStyle = rgba('green', 0.8 * a); circle(px + 9, rTop + up, 2.2, true);
                ctx.fillStyle = rgba('amber', (0.6 + 0.4 * Math.sin(t * 10 + k)) * a);
                ctx.fillRect(ex - 2, gy - ((t * 120 + k * (riseH / 6)) % riseH), 4, 7);
            }
        }
        label('CHW-S/R', px - 6, gy + 18, 'blue', 0.7 * a, 9, 'center');
        label('LV-RISER', ex + 4, gy + 30, 'amber', 0.7 * a, 9, 'center');
        label('FLOOR ' + built + '/' + maxF, bx, topY - 10, 'amber', 0.85 * a, 10);

        /* --- AHU with spinning fan + main duct to the right --- */
        var ahuX = bx + bw + 18 * S, ahuW = 70 * S, ahuH = 48 * S, ahuY = gy - ahuH;
        if (!mobile) {
            ctx.strokeStyle = rgba('cyan', 0.55 * a); ctx.lineWidth = 1.5;
            ctx.strokeRect(ahuX, ahuY, ahuW, ahuH);
            var fx = ahuX + ahuW * 0.35, fyy = ahuY + ahuH / 2, fr = ahuH * 0.34;
            circle(fx, fyy, fr);
            ctx.strokeStyle = rgba('cyan', 0.85 * a);
            for (var b = 0; b < 4; b++) {
                var ang = t * 6 + b * Math.PI / 2;
                line(fx, fyy, fx + Math.cos(ang) * fr * 0.9, fyy + Math.sin(ang) * fr * 0.9);
            }
            // coil fins
            ctx.strokeStyle = rgba('blue', 0.4 * a);
            for (var cf = 0; cf < 5; cf++) line(ahuX + ahuW * 0.65 + cf * 4, ahuY + 6, ahuX + ahuW * 0.65 + cf * 4, ahuY + ahuH - 6);
            label('AHU-01', ahuX, ahuY - 8, 'cyan', 0.8 * a, 10);

            // main supply duct running toward the crane
            var dEnd = W * 0.74, dTop = gy - ahuH * 0.72, dH2 = ahuH * 0.36;
            ctx.strokeStyle = rgba('blue', 0.4 * a); ctx.lineWidth = 1.3;
            ctx.strokeRect(ahuX + ahuW, dTop, dEnd - ahuX - ahuW, dH2);
            // chevrons showing airflow
            ctx.strokeStyle = rgba('cyan', 0.7 * a); ctx.lineWidth = 1.5;
            var span = dEnd - ahuX - ahuW - 20;
            for (var ch = 0; ch < 8; ch++) {
                var chx = ahuX + ahuW + 10 + ((t * 70 + ch * span / 8) % span);
                var cy0 = dTop + dH2 / 2;
                ctx.beginPath(); ctx.moveTo(chx - 5, cy0 - 5); ctx.lineTo(chx, cy0); ctx.lineTo(chx - 5, cy0 + 5); ctx.stroke();
            }
            label('SA DUCT 600×400', ahuX + ahuW + 14, dTop - 6, 'blue', 0.6 * a, 9);

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
        ctx.strokeStyle = rgba('amber', 0.6 * a); ctx.lineWidth = 1.4;
        // mast lattice
        line(mx - mw / 2, gy, mx - mw / 2, my); line(mx + mw / 2, gy, mx + mw / 2, my);
        ctx.strokeStyle = rgba('amber', 0.3 * a);
        for (var my2 = gy; my2 > my + mw; my2 -= mw * 1.4) {
            line(mx - mw / 2, my2, mx + mw / 2, my2 - mw * 1.4);
            line(mx - mw / 2, my2, mx + mw / 2, my2);
        }
        // apex + ties
        ctx.strokeStyle = rgba('amber', 0.6 * a);
        line(mx, my, mx, my - 40 * S);
        line(mx, my - 40 * S, mx - jibL * 0.7, my);
        line(mx, my - 40 * S, mx + jibL * 0.28, my);
        // jib + counter-jib (lattice)
        ctx.lineWidth = 1.6;
        line(mx - jibL, my, mx + jibL * 0.3, my);
        line(mx - jibL, my + 8 * S, mx + jibL * 0.3, my + 8 * S);
        ctx.strokeStyle = rgba('amber', 0.25 * a); ctx.lineWidth = 1;
        for (var jx = mx - jibL; jx < mx + jibL * 0.3; jx += 14 * S) line(jx, my + 8 * S, jx + 7 * S, my);
        // counterweight
        ctx.fillStyle = rgba('amber', 0.35 * a);
        ctx.fillRect(mx + jibL * 0.2, my + 8 * S, 22 * S, 20 * S);
        // cab
        ctx.strokeStyle = rgba('cyan', 0.6 * a);
        ctx.strokeRect(mx + mw / 2, my + 10 * S, 16 * S, 14 * S);
        // blinking aviation light
        ctx.fillStyle = rgba('red', (Math.sin(t * 4) > 0 ? 0.95 : 0.15) * a);
        circle(mx, my - 42 * S, 3.5, true);

        // trolley + hoist + load
        var tk = 0.5 + 0.5 * Math.sin(t * 0.32);
        var trolX = mx - jibL * (0.2 + 0.72 * tk);
        var hoist = H * 0.24 + H * 0.12 * (0.5 + 0.5 * Math.sin(t * 0.45 + 1));
        var sw = 0.06 * Math.sin(t * 1.4);
        var hx2 = trolX + Math.sin(sw) * hoist, hy2 = my + 8 * S + Math.cos(sw) * hoist;
        ctx.fillStyle = rgba('amber', 0.7 * a); ctx.fillRect(trolX - 6, my + 8 * S, 12, 5);
        ctx.strokeStyle = rgba('white', 0.45 * a); ctx.lineWidth = 1;
        line(trolX - 2, my + 13 * S, hx2 - 2, hy2); line(trolX + 2, my + 13 * S, hx2 + 2, hy2);
        // hook
        ctx.strokeStyle = rgba('amber', 0.8 * a); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(hx2, hy2 + 6, 5, 0, Math.PI); ctx.stroke();
        // load: a duct section on slings
        var lw = 66 * S, lh = 18 * S, ly = hy2 + 22 * S;
        ctx.strokeStyle = rgba('white', 0.35 * a); ctx.lineWidth = 1;
        line(hx2, hy2 + 8, hx2 - lw / 2, ly); line(hx2, hy2 + 8, hx2 + lw / 2, ly);
        ctx.fillStyle = rgba('blue', 0.18 * a); ctx.fillRect(hx2 - lw / 2, ly, lw, lh);
        ctx.strokeStyle = rgba('blue', 0.75 * a); ctx.lineWidth = 1.4; ctx.strokeRect(hx2 - lw / 2, ly, lw, lh);
        line(hx2 - lw / 2, ly, hx2 + lw / 2, ly + lh);
        label('TC-01 · ' + (2 + 1.5 * tk).toFixed(1) + ' t', mx - jibL, my - 8, 'amber', 0.75 * a, 10);
    }

    /* ================================================================== */
    /* SCENE 1 — INDUSTRIAL AUTOMATION CELL                               */
    /* ================================================================== */
    function ik(bx, by, tx, ty, L1, L2) {
        var dx = tx - bx, dy = ty - by;
        var d = Math.min(Math.hypot(dx, dy), L1 + L2 - 0.5);
        var c2 = (d * d - L1 * L1 - L2 * L2) / (2 * L1 * L2);
        var a2 = -Math.acos(Math.max(-1, Math.min(1, c2))); // elbow up
        var a1 = Math.atan2(dy, dx) - Math.atan2(L2 * Math.sin(a2), L1 + L2 * Math.cos(a2));
        var ex = bx + L1 * Math.cos(a1), ey = by + L1 * Math.sin(a1);
        return { ex: ex, ey: ey, x: ex + L2 * Math.cos(a1 + a2), y: ey + L2 * Math.sin(a1 + a2), a1: a1, a2: a2 };
    }

    function drawArm(bx, by, dir, phase, a, L) {
        // keyframes: [x offset, y offset, grip(0 open,1 closed)]
        var K = [
            [dir * 0.95, -0.15, 0], // above belt
            [dir * 0.95, 0.12, 0],  // down to box
            [dir * 0.95, 0.12, 1],  // grip
            [dir * 0.45, -1.15, 1], // lift high
            [-dir * 0.85, -0.55, 1],// swing over to pallet
            [-dir * 0.85, -0.2, 1], // lower
            [-dir * 0.85, -0.2, 0], // release
            [dir * 0.2, -1.1, 0]    // return high
        ];
        var period = 6.4, seg = period / K.length;
        var tt = ((t + phase) % period) / seg;
        var i = Math.floor(tt), k = ease(tt - i);
        var A = K[i], B = K[(i + 1) % K.length];
        var tx = bx + lerp(A[0], B[0], k) * L * 1.6;
        var ty = by + lerp(A[1], B[1], k) * L * 1.6;
        var grip = lerp(A[2], B[2], k);
        var carrying = grip > 0.5 && i >= 2 && i <= 5;

        var r = ik(bx, by, tx, ty, L, L);

        // pedestal
        ctx.fillStyle = rgba('amber', 0.12 * a);
        ctx.strokeStyle = rgba('amber', 0.5 * a); ctx.lineWidth = 1.5;
        ctx.fillRect(bx - 18 * S, by, 36 * S, H - by);
        ctx.strokeRect(bx - 18 * S, by, 36 * S, H - by);
        // links
        ctx.lineCap = 'round';
        ctx.strokeStyle = rgba('amber', 0.75 * a); ctx.lineWidth = 13 * S;
        line(bx, by, r.ex, r.ey); line(r.ex, r.ey, r.x, r.y);
        ctx.strokeStyle = rgba('20,14,4', 0.9 * a); ctx.lineWidth = 5 * S;
        line(bx, by, r.ex, r.ey); line(r.ex, r.ey, r.x, r.y);
        // joints
        ctx.fillStyle = rgba('cyan', 0.9 * a);
        circle(bx, by, 7 * S, true); circle(r.ex, r.ey, 6 * S, true);
        ctx.strokeStyle = rgba('cyan', 0.5 * a); ctx.lineWidth = 1;
        circle(bx, by, 12 * S); circle(r.ex, r.ey, 10 * S);
        // wrist + gripper (always pointing down)
        var gw = lerp(14, 7, grip) * S;
        ctx.strokeStyle = rgba('cyan', 0.9 * a); ctx.lineWidth = 3 * S;
        line(r.x, r.y, r.x, r.y + 10 * S);
        line(r.x - gw, r.y + 10 * S, r.x + gw, r.y + 10 * S);
        line(r.x - gw, r.y + 10 * S, r.x - gw, r.y + 22 * S);
        line(r.x + gw, r.y + 10 * S, r.x + gw, r.y + 22 * S);
        if (carrying) {
            var bs = 26 * S;
            ctx.fillStyle = rgba('amber', 0.35 * a); ctx.fillRect(r.x - bs / 2, r.y + 14 * S, bs, bs);
            ctx.strokeStyle = rgba('amber', 0.9 * a); ctx.lineWidth = 1.5; ctx.strokeRect(r.x - bs / 2, r.y + 14 * S, bs, bs);
        }
        // live joint readout
        var j1 = (-r.a1 * 180 / Math.PI).toFixed(1), j2 = (-r.a2 * 180 / Math.PI).toFixed(1);
        label('J1 ' + j1 + '°  J2 ' + j2 + '°', bx, by + 26 * S, 'cyan', 0.75 * a, 10, 'center');
        label(carrying ? '● GRIP' : '○ OPEN', bx, by + 40 * S, carrying ? 'green' : 'white', 0.7 * a, 9, 'center');
    }

    function drawDrone(cx, cy, size, a, tilt) {
        ctx.save();
        ctx.translate(cx, cy); ctx.rotate(tilt);
        // scan cone
        var g = ctx.createLinearGradient(0, 0, 0, size * 5);
        g.addColorStop(0, rgba('cyan', 0.18 * a)); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(-size * 0.25, size * 0.3); ctx.lineTo(size * 0.25, size * 0.3);
        ctx.lineTo(size * 1.3, size * 5); ctx.lineTo(-size * 1.3, size * 5); ctx.closePath(); ctx.fill();
        var sl = ((t * 1.2) % 1) * size * 4.6;
        ctx.strokeStyle = rgba('cyan', 0.5 * a * (1 - sl / (size * 4.6))); ctx.lineWidth = 1;
        line(-size * 0.25 - sl * 0.23, size * 0.3 + sl, size * 0.25 + sl * 0.23, size * 0.3 + sl);
        // arms
        ctx.strokeStyle = rgba('amber', 0.8 * a); ctx.lineWidth = 3;
        line(-size, 0, size, 0);
        line(-size * 0.9, 0, -size * 0.9, -size * 0.2); line(size * 0.9, 0, size * 0.9, -size * 0.2);
        // rotors (blur)
        var spin = Math.abs(Math.sin(t * 30));
        ctx.strokeStyle = rgba('white', 0.55 * a); ctx.lineWidth = 2;
        [-1, 1].forEach(function (s2) {
            ctx.beginPath();
            ctx.ellipse(s2 * size * 0.9, -size * 0.22, size * (0.25 + 0.3 * spin), 2.5, 0, 0, Math.PI * 2);
            ctx.stroke();
        });
        // body
        ctx.fillStyle = rgba('12,16,26', 0.95 * a); ctx.strokeStyle = rgba('cyan', 0.9 * a); ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-size * 0.35, -size * 0.18, size * 0.7, size * 0.36, 5) : ctx.rect(-size * 0.35, -size * 0.18, size * 0.7, size * 0.36);
        ctx.fill(); ctx.stroke();
        // spray tank + nozzle
        ctx.strokeStyle = rgba('blue', 0.7 * a);
        line(0, size * 0.18, 0, size * 0.32);
        // LED
        ctx.fillStyle = rgba(Math.sin(t * 8) > 0 ? 'green' : 'red', 0.95 * a);
        circle(size * 0.25, 0, 2.5, true);
        ctx.restore();
    }

    function drawRobo(a) {
        var cvY = H * 0.86;
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
            // pulse position along polyline
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

        /* --- Conveyor belt --- */
        var bh = 16 * S;
        ctx.strokeStyle = rgba('amber', 0.5 * a); ctx.lineWidth = 1.5;
        line(0, cvY, W, cvY); line(0, cvY + bh, W, cvY + bh);
        ctx.setLineDash([10, 10]); ctx.lineDashOffset = -t * 60 * S;
        ctx.strokeStyle = rgba('amber', 0.3 * a);
        line(0, cvY + bh / 2, W, cvY + bh / 2);
        ctx.setLineDash([]); ctx.lineDashOffset = 0;
        var rs = 46 * S;
        ctx.strokeStyle = rgba('amber', 0.4 * a); ctx.lineWidth = 1;
        for (var rx = rs / 2; rx < W; rx += rs) {
            var ry = cvY + bh + 9 * S;
            circle(rx, ry, 7 * S);
            var ra = t * 5;
            line(rx, ry, rx + Math.cos(ra) * 7 * S, ry + Math.sin(ra) * 7 * S);
        }
        // boxes riding the belt
        var spacing = 190 * S, bs = 30 * S;
        var nBoxes = Math.ceil(W / spacing) + 1;
        for (var b = 0; b < nBoxes; b++) {
            var bxp = ((t * 55 * S + b * spacing) % (W + spacing)) - spacing;
            ctx.fillStyle = rgba('amber', 0.18 * a); ctx.fillRect(bxp, cvY - bs, bs, bs);
            ctx.strokeStyle = rgba('amber', 0.7 * a); ctx.lineWidth = 1.3; ctx.strokeRect(bxp, cvY - bs, bs, bs);
            ctx.strokeStyle = rgba('orange', 0.5 * a); line(bxp + bs / 2, cvY - bs, bs / 2 + bxp, cvY);
            label('#' + (100 + ((b * 7) % 89)), bxp + 2, cvY - bs - 4, 'amber', 0.5 * a, 8);
        }
        label('CONVEYOR CV-02 · 0.35 m/s', 12, cvY + bh + 34 * S, 'amber', 0.6 * a, 10);

        /* --- Robot arms (one on phones) --- */
        var L = (mobile ? 62 : 105) * S;
        if (mobile) {
            drawArm(W * 0.82, cvY - L * 1.05, -1, 0, a, L);
        } else {
            drawArm(W * 0.12, cvY - L * 1.05, 1, 0, a, L);
            drawArm(W * 0.88, cvY - L * 1.05, -1, 3.2, a, L);
        }

        /* --- Drones --- */
        var dx = W * 0.5 + W * (mobile ? 0.3 : 0.36) * Math.sin(t * 0.22);
        var dy = H * 0.2 + H * 0.05 * Math.sin(t * 0.7);
        drawDrone(dx, dy, (mobile ? 26 : 38) * S, a, Math.cos(t * 0.22) * 0.12);
        if (!mobile) {
            drawDrone(W * 0.5 + W * 0.28 * Math.sin(t * 0.17 + 2.4), H * 0.36 + H * 0.04 * Math.sin(t * 0.9), 24 * S, a * 0.55, Math.cos(t * 0.17 + 2.4) * 0.1);
        }
        label('UAV-01 · ALT ' + (12 + 3 * Math.sin(t * 0.7)).toFixed(1) + ' m · GPS LOCK', dx, dy - 40 * S, 'cyan', 0.7 * a, 10, 'center');
    }

    /* ================================================================== */
    /* SCENE 2 — STEM / PHYSICS                                            */
    /* ================================================================== */
    function drawSTEM(a, dt) {
        /* --- Floating formulas --- */
        for (var i = 0; i < formulas.length; i++) {
            var f = formulas[i];
            if (dt) { f.y -= f.vy * dt; if (f.y < -40) { f.y = H + 40; f.x = rand(0.03, 0.97) * W; } }
            var tw = 0.45 + 0.35 * Math.sin(t * 0.8 + f.ph);
            ctx.save();
            ctx.translate(f.x, f.y); ctx.rotate(f.rot);
            ctx.font = 'italic ' + f.size + 'px "Cambria Math", "Times New Roman", serif';
            ctx.fillStyle = rgba(f.col, tw * 0.55 * a);
            ctx.fillText(f.text, 0, 0);
            ctx.restore();
        }

        ctx.lineCap = 'round';
        /* --- Pendulum (with fading trail) --- */
        var pvx = mobile ? W * 0.14 : W * 0.1, pvy = H * 0.15;
        var Lp = Math.min(H * 0.32, 260 * S + 60);
        var om = 1.7, th0 = 0.55;
        ctx.strokeStyle = rgba('violet', 0.6 * a); ctx.lineWidth = 3;
        line(pvx - 30 * S, pvy, pvx + 30 * S, pvy);
        for (var h = 0; h < 4; h++) line(pvx - 30 * S + h * 18 * S, pvy, pvx - 36 * S + h * 18 * S, pvy - 8);
        for (var tr = 10; tr >= 0; tr--) {
            var tht = th0 * Math.cos(om * (t - tr * 0.05));
            var bxp = pvx + Lp * Math.sin(tht), byp = pvy + Lp * Math.cos(tht);
            ctx.fillStyle = rgba('purple', (tr === 0 ? 0.95 : 0.12 * (1 - tr / 11)) * a);
            circle(bxp, byp, (tr === 0 ? 13 : 10) * S, true);
        }
        var th = th0 * Math.cos(om * t);
        var pbx = pvx + Lp * Math.sin(th), pby = pvy + Lp * Math.cos(th);
        ctx.strokeStyle = rgba('white', 0.5 * a); ctx.lineWidth = 1.2;
        line(pvx, pvy, pbx, pby);
        ctx.setLineDash([4, 5]); ctx.strokeStyle = rgba('violet', 0.35 * a);
        line(pvx, pvy, pvx, pvy + Lp + 20);
        ctx.setLineDash([]);
        ctx.beginPath(); ctx.arc(pvx, pvy, 40 * S, Math.PI / 2 - th, Math.PI / 2, th < 0); ctx.stroke();
        label('θ = ' + (th * 180 / Math.PI).toFixed(1) + '°', pvx + 8, pvy + 60 * S, 'violet', 0.85 * a, 11);
        label('T = 2π√(L/g)', pvx - 30 * S, pvy - 16, 'violet', 0.7 * a, 10);

        /* --- Atom --- */
        var ax = mobile ? W * 0.84 : W * 0.86, ay = H * 0.27, ar = (mobile ? 46 : 74) * S;
        ctx.lineWidth = 1.2;
        for (var o = 0; o < 3; o++) {
            var rot = o * Math.PI / 3 + t * 0.15;
            ctx.strokeStyle = rgba('cyan', 0.35 * a);
            ctx.beginPath(); ctx.ellipse(ax, ay, ar, ar * 0.36, rot, 0, Math.PI * 2); ctx.stroke();
            var e = t * (1.6 + o * 0.35) + o * 2;
            var ex = ar * Math.cos(e), ey = ar * 0.36 * Math.sin(e);
            ctx.fillStyle = rgba('cyan', 0.95 * a);
            ctx.shadowColor = rgba('cyan', a); ctx.shadowBlur = 10;
            circle(ax + ex * Math.cos(rot) - ey * Math.sin(rot), ay + ex * Math.sin(rot) + ey * Math.cos(rot), 3.5, true);
            ctx.shadowBlur = 0;
        }
        var nuc = [[0, 0, 'purple'], [5, 3, 'red'], [-4, 4, 'purple'], [2, -5, 'red'], [-5, -2, 'red'], [4, -1, 'purple']];
        nuc.forEach(function (n) { ctx.fillStyle = rgba(n[2], 0.85 * a); circle(ax + n[0] * S, ay + n[1] * S, 5 * S, true); });

        /* --- Projectile motion --- */
        if (!mobile) {
            var x0 = W * 0.2, y0 = H * 0.86, R = W * 0.3, Hm = H * 0.32, T = 3.2;
            ctx.strokeStyle = rgba('white', 0.25 * a); ctx.lineWidth = 1;
            line(x0, y0, x0 + R + 30, y0); line(x0, y0, x0, y0 - Hm - 30);
            label('x', x0 + R + 34, y0 + 4, 'white', 0.5 * a, 10); label('y', x0 - 4, y0 - Hm - 36, 'white', 0.5 * a, 10);
            ctx.fillStyle = rgba('violet', 0.35 * a);
            for (var s = 0; s <= 1.0001; s += 0.05) circle(x0 + R * s, y0 - 4 * Hm * s * (1 - s), 1.6, true);
            var tau = (t % (T + 0.6)) / T;
            if (tau <= 1) {
                var pxp = x0 + R * tau, pyp = y0 - 4 * Hm * tau * (1 - tau);
                var vx = R / T * 0.35, vy = -4 * Hm * (1 - 2 * tau) / T * 0.35;
                ctx.strokeStyle = rgba('amber', 0.85 * a); ctx.lineWidth = 2;
                arrow(pxp, pyp, pxp + vx, pyp + vy);
                ctx.strokeStyle = rgba('cyan', 0.6 * a); ctx.lineWidth = 1.2;
                arrow(pxp, pyp, pxp + vx, pyp);
                arrow(pxp, pyp, pxp, pyp + vy);
                ctx.fillStyle = rgba('white', 0.95 * a);
                ctx.shadowColor = rgba('violet', a); ctx.shadowBlur = 12;
                circle(pxp, pyp, 7 * S, true);
                ctx.shadowBlur = 0;
                label('v', pxp + vx + 6, pyp + vy, 'amber', 0.9 * a, 12);
            }
            label('y = x·tanθ − gx² / (2v²cos²θ)', x0 + 6, y0 - Hm - 12, 'violet', 0.7 * a, 11);
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

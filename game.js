// The little runner game hidden between the paintings on the home page.
// As you scroll, each gap between two paintings gradually parts to reveal one
// level, and draws shut again as you scroll past it. After the last painting comes the
// final level: a face-off with a giant pink blob.
//
// Running levels: space (or a tap / click) starts and jumps. Things to dodge:
// ground obstacles, flying white blobs, and the odd cowboy taking a shot at you.
// Final level:    space shoots the bow, the up arrow jumps.
// Once a level is running, the arrow keys move the runner left and right.

const HomeGames = (() => {
    // ---------- settings you can tweak ----------

    // blobs: how often a white blob comes flying at you instead of a ground obstacle
    // (0 = never, 1 = always). high: whether some fly at head height, where jumping gets you hit.
    // cowboys: how often a cowboy steps in from the right and takes a shot at you.
    const LEVELS = [
        { name: 'LEVEL 1', speed: 220, goal: 8,  scenery: 'hills',     obstacles: ['rock'],                   sun: 30,
          blobs: 0,    high: false, cowboys: 0.12, win: "You're such a good boy!",    lose: 'Not trying hard enough!' },
        { name: 'LEVEL 2', speed: 255, goal: 10, scenery: 'mountains', obstacles: ['rock', 'cactus'],         sun: 16,
          blobs: 0.3,  high: false, cowboys: 0.15, win: "We're really so impressed!", lose: "focus, we're watching" },
        { name: 'LEVEL 3', speed: 295, goal: 12, scenery: 'city',      obstacles: ['post', 'spike', 'cactus'], sun: 2,
          blobs: 0.4,  high: true,  cowboys: 0.18, win: "You're our favorite",        lose: 'You let us down' },
        { name: 'LEVEL 4', speed: 335, goal: 14, scenery: 'pines',     obstacles: ['rock', 'cactus', 'post', 'spike'], sun: -12,
          blobs: 0.5,  high: true,  cowboys: 0.22, win: "You're our favorite",        lose: 'You let us down' }
    ];
    const SKY = [
        ['#3a1466', '#8a2f8f', '#ff9a3d'],
        ['#31105c', '#7d2a86', '#ff8a35'],
        ['#270c50', '#6b2378', '#f9772e'],
        ['#1c0840', '#571c68', '#e8632a']
    ];

    // The final level.
    const BOSS = {
        name: 'FINAL LEVEL', scenery: 'hills', sun: -22, sky: ['#150530', '#4a1560', '#d9502a'],
        hits: 28,                 // arrows needed to pop the blob
        win: 'Welcome to funtown', lose: 'Bad blob!'
    };

    const SILHOUETTE = '#0d0612';   // player, obstacles and ground
    const FAR = '#2a0e3f';          // scenery in the distance
    const TEXT = '#ffd9a8';
    const WHITE = '#f6f1e7';        // the white blobs from the paintings
    const WHITE_SHADE = '#8fbbe6';  // their pale blue underside
    const PINK = '#ef9a86';         // the big pink blob
    const OUTLINE = '#17475c';      // its dark blue outline
    const BLOB_SPEED = 1.6;         // how much faster than the ground a white blob flies
    const BULLET_SPEED = 330;       // how much faster than the ground a cowboy's bullet flies
    const GRAVITY = 1400;
    const JUMP = 520;
    const WALK = 190;               // how fast the arrow keys move the runner across the screen

    // The game is drawn on a virtual screen 200 units tall; the width follows the page.
    const VIEW_H = 200;
    const GROUND = 168;

    const TOUCH = window.matchMedia('(pointer: coarse)').matches;   // phones and tablets

    let games = [];
    let listening = false;
    let checkQueued = false;

    const hash = (i, seed) => {
        const v = Math.sin(i * 127.1 + seed * 311.7) * 43758.5453;
        return v - Math.floor(v);
    };
    const rand = (a, b) => a + Math.random() * (b - a);

    // ---------- one level ----------

    function createGame(strip, index) {
        const canvas = strip.querySelector('canvas');
        const ctx = canvas.getContext('2d');
        const boss = strip.hasAttribute('data-boss');
        const level = boss ? BOSS : LEVELS[index % LEVELS.length];
        const sky = boss ? BOSS.sky : SKY[index % SKY.length];
        const lap = Math.floor(index / LEVELS.length);   // more gaps than levels: go round again, faster
        const speed = boss ? 0 : level.speed + lap * 60;

        const g = {
            strip, canvas, index, boss,
            state: 'idle',          // idle | running | paused | dead | clear
            width: 300, scale: 1,
            scroll: 0, phase: 0, time: 0,
            x: 0, y: GROUND, vy: 0,
            left: false, right: false,   // arrow keys being held
            obstacles: [], plan: [], planned: 0, passed: 0,
            cowboys: [], smoke: [], puff: 0,
            // final level
            hp: BOSS.hits, arrows: [], shots: [], drops: [], splats: [],
            cool: 0, attack: 0, flash: 0, dying: 0, burst: false,
            frame: 0, last: 0
        };

        const startX = () => (boss ? Math.max(14, g.width * 0.14) : g.width > 520 ? g.width * 0.34 : g.width * 0.2);
        const bossR = () => (g.width < 360 ? 40 : 50);
        const bossX = () => g.width - bossR() - 26;
        const bossY = () => GROUND - bossR() * 1.5 + Math.sin(g.time * 1.6) * 4;
        const maxX = () => (boss ? bossX() - bossR() - 34 : g.width - 30);

        function resize() {
            const cssW = canvas.clientWidth, cssH = canvas.clientHeight;
            if (!cssW || !cssH) return;
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            canvas.width = Math.round(cssW * dpr);
            canvas.height = Math.round(cssH * dpr);
            g.scale = cssH / VIEW_H;
            g.width = cssW / g.scale;
            g.x = g.state === 'running' || g.state === 'paused' ? Math.min(g.x, maxX()) : startX();
            ctx.setTransform(dpr * g.scale, 0, 0, dpr * g.scale, 0, 0);
            draw();
        }

        function reset() {
            g.scroll = 0; g.time = 0; g.x = startX(); g.y = GROUND; g.vy = 0;
            g.left = g.right = false;
            g.obstacles = []; g.plan = []; g.planned = 0; g.passed = 0;
            g.cowboys = []; g.smoke = []; g.puff = 0;
            g.hp = BOSS.hits; g.arrows = []; g.shots = []; g.drops = []; g.splats = [];
            g.cool = 0; g.attack = 1.3; g.flash = 0; g.dying = 0; g.burst = false;
        }

        function lose() {
            g.state = 'dead';
            g.left = g.right = false;
            playing();
        }

        // ---------- running levels ----------

        // Things to dodge are planned by the moment they reach the runner, so a slow
        // ground obstacle and a fast blob never arrive on top of each other.
        const travel = vx => (g.width + 20 - startX()) / vx;

        function planNext() {
            const prev = g.plan[g.plan.length - 1];
            const arrival = prev ? prev.arrival + rand(0.95, 1.7) : travel(speed) + 0.4;
            let o;
            if (Math.random() < level.cowboys) {
                // a bullet at chest height: it has to be jumped
                o = { type: 'bullet', w: 10, h: 4, up: 26, vx: speed + BULLET_SPEED };
            } else if (Math.random() < level.blobs) {
                // low and middle blobs have to be jumped; a high one sails overhead, so don't jump into it
                const heights = level.high ? [14, 30, 62] : [14, 30];
                const up = heights[Math.floor(Math.random() * heights.length)];
                o = { type: 'blob', w: rand(28, 40), h: rand(16, 21), up, vx: speed * BLOB_SPEED, seed: rand(0, 6) };
            } else {
                const type = level.obstacles[Math.floor(Math.random() * level.obstacles.length)];
                const size = {
                    rock:   { w: rand(26, 36), h: rand(18, 26) },
                    cactus: { w: 18, h: rand(34, 44) },
                    post:   { w: 9,  h: rand(46, 54) },
                    spike:  { w: rand(30, 38), h: 22 }
                }[type];
                o = { type, w: size.w, h: size.h, vx: speed };
            }
            o.arrival = arrival;
            o.x = g.width + 20;
            o.counted = false;
            g.plan.push(o);
            g.planned++;
        }

        function tickRun(dt) {
            for (const o of g.obstacles) o.x -= o.vx * dt;
            g.obstacles = g.obstacles.filter(o => !o.counted || o.x + o.w > -30);

            // plan far enough ahead, then release each thing when it is due
            while (g.planned < level.goal && (!g.plan.length || g.plan[g.plan.length - 1].arrival < g.time + travel(speed) + 0.5)) planNext();
            for (const o of g.plan) {
                if (o.released) continue;
                if (o.type === 'bullet') {
                    // the cowboy steps in first, then fires from where he stands
                    const fire = o.arrival - (g.width - 46 - startX()) / o.vx;
                    if (!o.cowboy && g.time >= fire - 0.75) { o.cowboy = true; g.cowboys.push({ born: g.time, fire }); }
                    if (g.time >= fire) { o.released = true; o.x = g.width - 46; g.obstacles.push(o); }
                } else if (g.time >= o.arrival - travel(o.vx)) { o.released = true; g.obstacles.push(o); }
            }
            g.cowboys = g.cowboys.filter(c => g.time < c.fire + 1.2);

            const px = g.x;
            for (const o of g.obstacles) {
                // slightly forgiving hit boxes
                const overlapX = px + 18 > o.x + 3 && px + 4 < o.x + o.w - 3;
                const hit = o.up !== undefined
                    ? overlapX && g.y > GROUND - o.up - o.h / 2 + 3 && g.y - 42 < GROUND - o.up + o.h / 2 - 3
                    : overlapX && g.y > GROUND - o.h + 4;
                if (hit) { lose(); return; }
                if (!o.counted && o.x + o.w < px) { o.counted = true; g.passed++; }
            }
            if (g.passed >= level.goal) { g.state = 'clear'; playing(); }
        }

        // ---------- final level ----------

        function shoot() {
            if (g.state !== 'running' || g.cool > 0 || g.dying) return;
            g.cool = 0.28;
            g.arrows.push({ x: g.x + 24, y: g.y - 27, vx: 560, vy: -30 });
        }

        // A burst of liquid drops. They fall, and leave a puddle where they land.
        function splash(x, y, n, colors, power) {
            for (let i = 0; i < n; i++) {
                const a = rand(-Math.PI, 0), v = rand(0.25, 1) * power;
                g.drops.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - power * 0.2, r: rand(1.5, 4), color: colors[Math.floor(Math.random() * colors.length)] });
            }
        }

        function explode() {
            const bx = bossX(), by = bossY(), R = bossR();
            for (let i = 0; i < 130; i++) {
                const a = rand(-Math.PI * 1.08, Math.PI * 0.08), v = rand(90, 560);
                const pick = Math.random();
                g.drops.push({
                    x: bx + rand(-R, R) * 0.7, y: by + rand(-R, R) * 0.9,
                    vx: Math.cos(a) * v, vy: Math.sin(a) * v - 120,
                    r: pick < 0.12 ? rand(8, 15) : rand(2.5, 8),
                    color: pick < 0.74 ? PINK : pick < 0.9 ? OUTLINE : '#ffffff'
                });
            }
        }

        // The blob spits white liquid at you. On a phone you can't walk away,
        // so there it only uses the ones you dodge by jumping (or by not jumping).
        function fire() {
            const hurt = 1 - g.hp / BOSS.hits;
            const kind = Math.random();
            const bx = bossX(), R = bossR();
            const v = 240 + hurt * 90;
            if (!TOUCH && kind < 0.35) {
                const T = 1.45, y0 = bossY() - R * 0.9, target = g.x + 11;
                g.shots.push({ type: 'lob', x: bx - R * 0.5, y: y0, vx: (target - (bx - R * 0.5)) / T, vy: (GROUND - 7 - y0 - 250 * T * T) / T, r: 8, target, seed: rand(0, 6) });
            } else if (kind < 0.75) {
                g.shots.push({ type: 'spit', x: bx - R, y: GROUND - 13, vx: -v, vy: 0, r: 9, seed: rand(0, 6) });
            } else {
                g.shots.push({ type: 'spit', x: bx - R, y: GROUND - 62, vx: -v, vy: 0, r: 9, seed: rand(0, 6) });
            }
            g.attack = 1.55 - hurt * 0.65;
        }

        function tickBoss(dt) {
            g.cool -= dt;
            g.flash = Math.max(0, g.flash - dt);
            const bx = bossX(), by = bossY(), R = bossR();

            for (const a of g.arrows) {
                a.vy += 30 * dt; a.x += a.vx * dt; a.y += a.vy * dt;      // arrows fly almost flat, so they reach on wide screens
                if (!g.dying && Math.hypot((a.x - bx) / 0.92, (a.y - by) / 1.25) < R) {
                    a.dead = true;
                    g.hp--; g.flash = 0.14;
                    splash(a.x, a.y, 7, [PINK, PINK, '#ffffff'], 190);
                    if (g.hp <= 0) { g.dying = 0.0001; g.shots = []; }
                } else if (a.x > g.width + 20 || a.y > GROUND) a.dead = true;
            }
            g.arrows = g.arrows.filter(a => !a.dead);

            for (const d of g.drops) {
                d.vy += 700 * dt; d.x += d.vx * dt; d.y += d.vy * dt;
                if (d.y >= GROUND - 1) { d.dead = true; g.splats.push({ x: d.x, w: d.r * rand(1.6, 2.6), color: d.color }); }
            }
            g.drops = g.drops.filter(d => !d.dead);
            if (g.splats.length > 220) g.splats.splice(0, g.splats.length - 220);

            if (g.dying) {
                g.dying += dt;
                if (!g.burst && g.dying > 1.0) { g.burst = true; explode(); }
                if (g.dying > 3.2) { g.state = 'clear'; playing(); }
                return;
            }

            g.attack -= dt;
            if (g.attack <= 0) fire();

            for (const s of g.shots) {
                if (s.type === 'lob') s.vy += 500 * dt;
                s.x += s.vx * dt; s.y += s.vy * dt;
                if (s.type === 'lob' && s.y >= GROUND - 6) {
                    s.dead = true;
                    splash(s.x, GROUND - 6, 8, [WHITE, WHITE_SHADE], 150);
                } else if (s.x < -40) s.dead = true;
                const hit = g.x + 18 > s.x - s.r + 2 && g.x + 4 < s.x + s.r - 2 && g.y > s.y - s.r + 2 && g.y - 42 < s.y + s.r - 2;
                if (hit && !s.dead) { lose(); return; }
            }
            g.shots = g.shots.filter(s => !s.dead);
        }

        // Moves the game forward by dt seconds.
        function tick(dt) {
            if (g.state !== 'running') return;
            g.time += dt;

            const dir = (g.right ? 1 : 0) - (g.left ? 1 : 0);
            g.x = Math.max(6, Math.min(maxX(), g.x + dir * WALK * dt));
            g.vy += GRAVITY * dt;
            g.y += g.vy * dt;
            if (g.y >= GROUND) { g.y = GROUND; g.vy = 0; }

            // cigarette smoke: little puffs left behind in the air
            g.puff -= dt;
            if (g.puff <= 0) {
                g.puff = 0.09;
                g.smoke.push({ x: g.x + 26, y: g.y - 37, vx: boss ? rand(-10, 4) : -speed * 0.35 + rand(-10, 10), vy: rand(-22, -10), age: 0 });
            }
            for (const m of g.smoke) { m.age += dt; m.x += m.vx * dt; m.y += m.vy * dt; }
            g.smoke = g.smoke.filter(m => m.age < 1.1);

            if (boss) {
                if (dir) g.phase += dt * 14;
                g.striding = dir !== 0;
                tickBoss(dt);
            } else {
                g.scroll += speed * dt;
                g.phase += dt * (speed / 14);
                g.striding = true;
                tickRun(dt);
            }
        }

        // ---------- drawing ----------

        function drawSky() {
            const grad = ctx.createLinearGradient(0, 0, 0, GROUND);
            grad.addColorStop(0, sky[0]);
            grad.addColorStop(0.6, sky[1]);
            grad.addColorStop(1, sky[2]);
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, g.width, VIEW_H);

            if (boss || index % LEVELS.length >= 2) {   // stars come out as the sun goes down
                ctx.fillStyle = 'rgba(255, 230, 200, 0.7)';
                for (let i = 0; i < 40; i++) {
                    const x = hash(i, 9 + index) * g.width, y = hash(i, 5 + index) * GROUND * 0.5;
                    ctx.fillRect(x, y, 1.2, 1.2);
                }
            }

            const sx = g.width * (boss ? 0.4 : 0.72), sy = GROUND - level.sun;
            const glow = ctx.createRadialGradient(sx, sy, 10, sx, sy, 150);
            glow.addColorStop(0, 'rgba(255, 170, 70, 0.75)');
            glow.addColorStop(1, 'rgba(255, 140, 50, 0)');
            ctx.fillStyle = glow;
            ctx.fillRect(0, 0, g.width, GROUND);
            const sun = ctx.createLinearGradient(0, sy - 34, 0, sy + 34);
            sun.addColorStop(0, '#ffd98a');
            sun.addColorStop(1, '#ff6a1f');
            ctx.fillStyle = sun;
            ctx.beginPath();
            ctx.arc(sx, sy, 34, 0, Math.PI * 2);
            ctx.fill();
        }

        function drawScenery() {
            const off = g.scroll * 0.25;
            ctx.fillStyle = FAR;
            if (level.scenery === 'hills' || level.scenery === 'mountains') {
                ctx.beginPath();
                ctx.moveTo(0, GROUND);
                for (let x = 0; x <= g.width + 4; x += 4) {
                    const wx = x + off;
                    let h;
                    if (level.scenery === 'hills') {
                        h = 26 + Math.sin(wx * 0.011) * 16 + Math.sin(wx * 0.027 + 2) * 8;
                    } else {
                        const tri = (v, p) => Math.abs(((v / p) % 1 + 1) % 1 - 0.5) * 2;
                        h = 12 + tri(wx, 190) * 62 + tri(wx + 60, 83) * 20;
                    }
                    ctx.lineTo(x, GROUND - h);
                }
                ctx.lineTo(g.width, GROUND);
                ctx.fill();
            } else if (level.scenery === 'city') {
                const bw = 26;
                for (let i = Math.floor(off / bw) - 1; i * bw - off < g.width; i++) {
                    const x = i * bw - off, h = 18 + hash(i, 3) * 62;
                    ctx.fillStyle = FAR;
                    ctx.fillRect(x, GROUND - h, bw - 3, h);
                    ctx.fillStyle = 'rgba(255, 160, 70, 0.8)';       // a few lit windows
                    for (let k = 0; k < 3; k++) {
                        if (hash(i * 7 + k, 11) > 0.55) ctx.fillRect(x + 4 + hash(i + k, 2) * 14, GROUND - h + 6 + k * 11, 2.5, 3.5);
                    }
                }
            } else {
                const tw = 30;
                for (let i = Math.floor(off / tw) - 1; i * tw - off < g.width + tw; i++) {
                    const x = i * tw - off + hash(i, 4) * 10, h = 34 + hash(i, 6) * 46;
                    ctx.beginPath();
                    ctx.moveTo(x, GROUND);
                    ctx.lineTo(x + 11, GROUND - h);
                    ctx.lineTo(x + 22, GROUND);
                    ctx.fill();
                }
            }
        }

        // A drop of white liquid, like the ones in the paintings: a round head that
        // ripples, a tail that stretches out behind it, and droplets breaking off.
        // (cx, cy) is the middle of the head; the tail trails away at `angle`.
        function drawLiquid(cx, cy, r, len, angle, seed) {
            const t = g.time * 9 + seed;
            const wave = Math.sin(t) * r * 0.3, wave2 = Math.cos(t * 1.3) * r * 0.22;
            const pulse = 1 + Math.sin(t * 1.7) * 0.08;
            const body = (dy, shrink) => {
                const rr = r * pulse * shrink;
                ctx.beginPath();
                ctx.moveTo(len, wave + dy);
                ctx.bezierCurveTo(len * 0.62, -rr * 0.25 + wave2 + dy, rr * 1.15, -rr * 1.12 + dy, 0, -rr + dy);
                ctx.arc(0, dy, rr, -Math.PI / 2, Math.PI / 2, true);
                ctx.bezierCurveTo(rr * 1.15, rr * 1.12 + dy, len * 0.62, rr * 0.45 + wave2 + dy, len, wave + dy);
                ctx.fill();
            };
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(angle);
            ctx.fillStyle = WHITE_SHADE;
            body(1.6, 1);
            for (let i = 0; i < 3; i++) {       // droplets breaking away from the tail
                const d = len + 5 + i * (5 + r * 0.25) + Math.sin(t * 0.8 + i * 2) * 2;
                ctx.beginPath();
                ctx.arc(d, wave * (1 + i * 0.5) + Math.sin(t * 1.4 + i) * 2, r * (0.3 - i * 0.07), 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.fillStyle = WHITE;
            body(0, 0.9);
            for (let i = 0; i < 3; i++) {
                const d = len + 5 + i * (5 + r * 0.25) + Math.sin(t * 0.8 + i * 2) * 2;
                ctx.beginPath();
                ctx.arc(d - 0.4, wave * (1 + i * 0.5) + Math.sin(t * 1.4 + i) * 2 - 0.5, r * (0.24 - i * 0.06), 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.fillStyle = '#ffffff';          // wet shine
            ctx.beginPath();
            ctx.ellipse(-r * 0.3, -r * 0.38, r * 0.3, r * 0.15, -0.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // A cowboy, facing left: hat, long coat, one arm out with a pistol.
        // He steps in from the right edge, fires once, and steps back out.
        function drawCowboy(c) {
            const since = g.time - c.born, after = g.time - c.fire;
            const slideIn = 1 - Math.min(1, since / 0.45), slideOut = Math.max(0, (after - 0.45) / 0.6);
            const ease = v => v * v;
            const x = g.width - 30 + (ease(slideIn) + ease(Math.min(1, slideOut))) * 60;
            const y = GROUND;
            const kick = after > 0 && after < 0.12 ? 2 : 0;      // recoil
            ctx.fillStyle = SILHOUETTE;
            ctx.strokeStyle = SILHOUETTE;
            ctx.lineCap = 'butt';
            ctx.lineJoin = 'miter';
            ctx.lineWidth = 5;
            ctx.beginPath();                                      // bow-legged stance
            ctx.moveTo(x + 2, y - 20); ctx.lineTo(x - 5, y - 9); ctx.lineTo(x - 5, y);
            ctx.moveTo(x + 6, y - 20); ctx.lineTo(x + 12, y - 9); ctx.lineTo(x + 11, y);
            ctx.stroke();
            ctx.beginPath();                                      // coat
            ctx.moveTo(x - 3, y - 36); ctx.lineTo(x + 11, y - 36); ctx.lineTo(x + 13, y - 15); ctx.lineTo(x - 5, y - 15);
            ctx.fill();
            ctx.fillRect(x - 1, y - 46, 10, 10);                  // head
            ctx.fillRect(x - 9, y - 47.5, 26, 2.6);               // hat brim
            ctx.fillRect(x - 2, y - 54, 12, 7);                   // hat crown
            ctx.lineWidth = 4;                                    // gun arm
            ctx.beginPath();
            ctx.moveTo(x + 2, y - 33); ctx.lineTo(x - 13 + kick, y - 28);
            ctx.stroke();
            ctx.fillRect(x - 22 + kick, y - 30.5, 10, 3);         // pistol
            ctx.fillRect(x - 14 + kick, y - 30, 3, 6);
            if (after > 0 && after < 0.09) {                      // muzzle flash
                ctx.fillStyle = '#ffd98a';
                ctx.beginPath();
                ctx.moveTo(x - 23, y - 29);
                ctx.lineTo(x - 34, y - 34); ctx.lineTo(x - 30, y - 29); ctx.lineTo(x - 36, y - 26); ctx.lineTo(x - 23, y - 27.5);
                ctx.fill();
            }
        }

        function drawObstacle(o) {
            if (o.type === 'bullet') {
                const y = GROUND - o.up;
                const streak = ctx.createLinearGradient(o.x, 0, o.x + 34, 0);
                streak.addColorStop(0, 'rgba(255, 217, 138, 0.9)');
                streak.addColorStop(1, 'rgba(255, 217, 138, 0)');
                ctx.fillStyle = streak;
                ctx.fillRect(o.x + 4, y - 0.8, 30, 1.6);
                ctx.fillStyle = '#ffe9b8';
                ctx.beginPath();
                ctx.ellipse(o.x + 5, y, 5, 2, 0, 0, Math.PI * 2);
                ctx.fill();
                return;
            }
            if (o.type === 'blob') {
                const r = o.h / 2 + 1;
                drawLiquid(o.x + r, GROUND - o.up, r, o.w - r + 6, 0, o.seed);
                return;
            }
            const b = GROUND;
            ctx.fillStyle = SILHOUETTE;
            ctx.beginPath();
            if (o.type === 'rock') {
                ctx.ellipse(o.x + o.w / 2, b, o.w / 2, o.h, 0, Math.PI, 0);
            } else if (o.type === 'spike') {
                const n = 3, sw = o.w / n;
                for (let i = 0; i < n; i++) {
                    ctx.moveTo(o.x + i * sw, b);
                    ctx.lineTo(o.x + i * sw + sw / 2, b - o.h);
                    ctx.lineTo(o.x + (i + 1) * sw, b);
                }
            } else if (o.type === 'post') {
                ctx.rect(o.x + 2, b - o.h, o.w - 4, o.h);
                ctx.rect(o.x - 2, b - o.h, o.w + 4, 5);
            } else {   // cactus
                ctx.roundRect(o.x + 6, b - o.h, 6, o.h, 3);
                ctx.roundRect(o.x, b - o.h * 0.7, 5, o.h * 0.35, 2.5);
                ctx.rect(o.x, b - o.h * 0.4, 8, 4);
                ctx.roundRect(o.x + 13, b - o.h * 0.85, 5, o.h * 0.35, 2.5);
                ctx.rect(o.x + 10, b - o.h * 0.55, 8, 4);
            }
            ctx.fill();
        }

        // The giant pink blob from the paintings: an egg of pink with a thick dark
        // blue outline, a white shine, and two small balls hanging off it on loops.
        function drawBoss() {
            if (g.burst) return;
            const swell = g.dying ? 1 + Math.min(g.dying, 1) * 0.4 : 1;
            const shake = g.dying ? Math.sin(g.time * 70) * g.dying * 2.5 : 0;
            const R = bossR() * swell;
            const bx = bossX() + shake, by = bossY() - (swell - 1) * 20;
            const t = g.time;
            const jolt = g.flash > 0 ? 0.06 : 0;
            const fill = g.flash > 0 || (g.dying && Math.sin(g.time * 40) > 0) ? '#ffd3c8' : PINK;

            // the egg: narrow on top, heavy at the bottom, always slowly sloshing
            const pts = [];
            const N = 22;
            for (let i = 0; i < N; i++) {
                const th = (i / N) * Math.PI * 2;
                const rr = R * (1 + 0.07 * Math.sin(3 * th + t * 1.5) + 0.04 * Math.sin(5 * th - t * 2.3) + jolt * Math.sin(th * 7 + t * 30));
                const wide = 0.9 + 0.12 * Math.sin(th);       // wider low down
                pts.push([bx + Math.cos(th) * rr * wide, by + Math.sin(th) * rr * 1.25]);
            }
            const trace = () => {
                ctx.beginPath();
                for (let i = 0; i <= N; i++) {
                    const a = pts[i % N], b = pts[(i + 1) % N];
                    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
                    if (i === 0) ctx.moveTo(mx, my); else ctx.quadraticCurveTo(a[0], a[1], mx, my);
                }
                ctx.closePath();
            };

            // the two hanging balls, each on a loop of outline
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            [[-1, 0.0], [1, 1.7]].forEach(([side, lag]) => {
                const hx = bx + side * R * 0.78, hy = by + R * 0.35;
                const ballX = bx + side * R * 1.02 + Math.sin(t * 2.1 + lag) * 3;
                const ballY = Math.min(GROUND - 9, by + R * 1.2 + Math.cos(t * 2.1 + lag) * 2);
                const ballR = R * 0.2;
                ctx.strokeStyle = OUTLINE;
                ctx.lineWidth = R * 0.13;
                ctx.beginPath();
                ctx.moveTo(hx, hy);
                ctx.quadraticCurveTo(bx + side * R * 1.35, by + R * 0.7, ballX, ballY);
                ctx.stroke();
                ctx.fillStyle = fill;
                ctx.beginPath();
                ctx.arc(ballX, ballY, ballR, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1.6;
                ctx.beginPath();
                ctx.arc(ballX, ballY, ballR * 0.55, -0.9, 0.2);
                ctx.stroke();
            });

            trace();
            ctx.fillStyle = fill;
            ctx.fill();
            ctx.strokeStyle = OUTLINE;
            ctx.lineWidth = R * 0.14;
            ctx.stroke();

            ctx.strokeStyle = '#ffffff';        // the painted shine
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(bx - R * 0.1, by - R * 0.1, R * 0.62, -1.15, -0.35);
            ctx.stroke();
        }

        function drawFinalLevel() {
            // puddles left by everything that has splashed down
            for (const s of g.splats) {
                ctx.fillStyle = s.color;
                ctx.beginPath();
                ctx.ellipse(s.x, GROUND + 1.2, s.w, 1.8, 0, 0, Math.PI * 2);
                ctx.fill();
            }

            // where a lobbed drop is going to land
            for (const s of g.shots) {
                if (s.type !== 'lob') continue;
                ctx.fillStyle = 'rgba(246, 241, 231, 0.35)';
                ctx.beginPath();
                ctx.ellipse(s.target, GROUND + 1, 11, 2.2, 0, 0, Math.PI * 2);
                ctx.fill();
            }

            drawBoss();

            for (const s of g.shots) drawLiquid(s.x, s.y, s.r, s.r * 2.2, Math.atan2(-s.vy, -s.vx), s.seed);

            // arrows
            ctx.strokeStyle = SILHOUETTE;
            ctx.fillStyle = SILHOUETTE;
            ctx.lineCap = 'butt';
            for (const a of g.arrows) {
                ctx.save();
                ctx.translate(a.x, a.y);
                ctx.rotate(Math.atan2(a.vy, a.vx));
                ctx.lineWidth = 1.6;
                ctx.beginPath();
                ctx.moveTo(-16, 0); ctx.lineTo(0, 0);
                ctx.moveTo(-16, 0); ctx.lineTo(-19, -2.5);
                ctx.moveTo(-16, 0); ctx.lineTo(-19, 2.5);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(3, 0); ctx.lineTo(-3, -2.6); ctx.lineTo(-3, 2.6);
                ctx.fill();
                ctx.restore();
            }

            // flying drops, stretched along the way they are moving
            for (const d of g.drops) {
                const v = Math.hypot(d.vx, d.vy);
                ctx.fillStyle = d.color;
                ctx.beginPath();
                ctx.ellipse(d.x, d.y, d.r * (1 + Math.min(v / 500, 0.9)), d.r * 0.85, Math.atan2(d.vy, d.vx), 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // A boxy person, seen from the side, facing right. (x, y) is where the feet touch.
        // On the final level he carries a bow.
        function drawRunner(x, y) {
            const air = y < GROUND - 1;
            const moving = g.state === 'running' && g.striding;
            const cx = x + 11;
            const lean = moving && !boss ? 2 : 0;
            ctx.fillStyle = SILHOUETTE;
            ctx.strokeStyle = SILHOUETTE;
            ctx.lineCap = 'butt';
            ctx.lineJoin = 'miter';

            const hip = { x: cx - 1, y: y - 17 };
            const shoulder = { x: cx + lean, y: y - 29 };

            // legs: thigh then shin, swinging in opposite directions
            ctx.lineWidth = 5;
            for (let i = 0; i < 2; i++) {
                const cycle = g.phase + i * Math.PI;
                let thigh = moving ? Math.sin(cycle) * 0.9 : (i ? 0.14 : -0.14);
                let shin = thigh - (moving ? (0.5 + 0.5 * Math.cos(cycle)) * 1.2 : 0);
                if (air) { thigh = i ? -0.5 : 1.0; shin = i ? -1.7 : 0.3; }
                const knee = { x: hip.x + Math.sin(thigh) * 9, y: hip.y + Math.cos(thigh) * 9 };
                ctx.beginPath();
                ctx.moveTo(hip.x, hip.y);
                ctx.lineTo(knee.x, knee.y);
                ctx.lineTo(knee.x + Math.sin(shin) * 9, knee.y + Math.cos(shin) * 9);
                ctx.stroke();
            }

            ctx.lineWidth = 4;
            if (boss) {
                // one arm holds the bow out in front, the other draws the string back
                const hand = { x: shoulder.x + 13, y: shoulder.y + 1 };
                const pull = g.cool > 0.14 ? 2 : -5;      // string snaps forward just after a shot
                ctx.beginPath();
                ctx.moveTo(shoulder.x, shoulder.y);
                ctx.lineTo(hand.x, hand.y);
                ctx.moveTo(shoulder.x, shoulder.y);
                ctx.lineTo(shoulder.x - 5, shoulder.y + 4);
                ctx.lineTo(hand.x + pull - 6, hand.y);
                ctx.stroke();
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(hand.x - 8, hand.y, 13, -1.05, 1.05);
                ctx.stroke();
                ctx.lineWidth = 0.8;
                ctx.beginPath();
                ctx.moveTo(hand.x - 8 + Math.cos(1.05) * 13, hand.y - Math.sin(1.05) * 13);
                ctx.lineTo(hand.x + pull - 6, hand.y);
                ctx.lineTo(hand.x - 8 + Math.cos(1.05) * 13, hand.y + Math.sin(1.05) * 13);
                ctx.stroke();
            } else {
                // arms: bent at the elbow, swinging opposite to the legs
                for (let i = 0; i < 2; i++) {
                    let upper = moving ? -Math.sin(g.phase + i * Math.PI) * 0.9 : (i ? 0.1 : -0.1);
                    let bend = moving ? 1.3 : 0.15;
                    if (air) { upper = i ? -2.2 : 2.0; bend = 0.4; }
                    const elbow = { x: shoulder.x + Math.sin(upper) * 7, y: shoulder.y + Math.cos(upper) * 7 };
                    ctx.beginPath();
                    ctx.moveTo(shoulder.x, shoulder.y);
                    ctx.lineTo(elbow.x, elbow.y);
                    ctx.lineTo(elbow.x + Math.sin(upper + bend) * 7, elbow.y + Math.cos(upper + bend) * 7);
                    ctx.stroke();
                }
            }

            // body and head: plain blocks
            ctx.save();
            ctx.translate(hip.x, hip.y + 2);
            ctx.rotate(Math.atan2(shoulder.x - hip.x, hip.y - shoulder.y));
            ctx.fillRect(-6, -16, 12, 17);        // torso
            ctx.fillRect(-4.5, -28, 11, 11);      // head
            ctx.strokeStyle = WHITE;              // cigarette
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(6.5, -20); ctx.lineTo(13, -21);
            ctx.stroke();
            ctx.fillStyle = Math.sin(g.time * 6) > 0.3 ? '#ffb347' : '#ff6a1f';   // the ember glows
            ctx.fillRect(13, -22, 2, 2);
            ctx.restore();
        }

        function label(text, x, y, size, align) {
            ctx.font = `500 ${size}px "IBM Plex Mono", monospace`;
            ctx.textAlign = align;
            ctx.fillStyle = TEXT;
            ctx.fillText(text, x, y);
        }

        function draw() {
            drawSky();
            drawScenery();
            ctx.fillStyle = SILHOUETTE;
            ctx.fillRect(0, GROUND, g.width, VIEW_H - GROUND);
            if (boss) drawFinalLevel();
            else {
                g.cowboys.forEach(drawCowboy);
                g.obstacles.forEach(drawObstacle);
            }
            for (const m of g.smoke) {
                const life = m.age / 1.1;
                ctx.fillStyle = `rgba(235, 225, 240, ${(0.42 * (1 - life)).toFixed(3)})`;
                ctx.beginPath();
                ctx.arc(m.x, m.y, 1.4 + life * 5, 0, Math.PI * 2);
                ctx.fill();
            }
            drawRunner(g.x, g.y);

            const small = g.width < 420;
            if (boss) {
                // how much blob is left
                const bw = small ? 80 : 120, bx0 = g.width - 12 - bw;
                label(level.name, bx0 - 8, 20, small ? 10 : 11, 'right');
                ctx.fillStyle = PINK;
                ctx.fillRect(bx0, 13, bw * Math.max(0, g.hp) / BOSS.hits, 7);
                ctx.strokeStyle = TEXT;
                ctx.lineWidth = 1;
                ctx.strokeRect(bx0, 13, bw, 7);
            } else {
                label(`${level.name}  ${g.passed}/${level.goal}`, g.width - 12, 20, small ? 10 : 11, 'right');
            }

            const cx = boss ? Math.min(g.width / 2, bossX() - bossR() - 60) : g.width / 2;
            const big = small ? 14 : 17, sub = small ? 9.5 : 11;
            const go = TOUCH ? 'tap' : 'press space';
            if (g.state === 'idle') {
                label(level.name, cx, 62, big, 'center');
                if (boss) {
                    label(TOUCH ? 'tap to start' : 'press space to start', cx, 80, sub, 'center');
                    label(TOUCH ? 'tap right to shoot, left to jump' : 'space shoots · ↑ jumps · ← → move', cx, 95, sub, 'center');
                } else {
                    label(TOUCH ? 'tap to start, tap to jump' : 'press space to start', cx, 80, sub, 'center');
                    if (!TOUCH) label('arrows: ← → move, ↑ jump', cx, 95, sub, 'center');
                }
            } else if (g.state === 'paused') {
                label('paused', cx, 62, big, 'center');
                label(`${go} to keep going`, cx, 80, sub, 'center');
            } else if (g.state === 'dead') {
                label(level.lose, cx, 62, big, 'center');
                label(`${go} to try again`, cx, 80, sub, 'center');
            } else if (g.state === 'clear') {
                const next = games[index + 1];
                label(level.win, g.width / 2, 62, big, 'center');
                label(boss ? 'the blob is no more' : next && next.boss ? "Don't be scared!" : 'keep scrolling for the next level ↓', g.width / 2, 80, sub, 'center');
            }
        }

        // ---------- running ----------

        function visible() {
            const r = strip.getBoundingClientRect();
            return r.bottom > 0 && r.top < window.innerHeight;
        }

        function pause() {
            if (g.state !== 'running') return;
            g.state = 'paused';
            g.left = g.right = false;
            playing();
        }

        function loop(now) {
            if (g.state !== 'running') { draw(); g.frame = 0; return; }
            if (!visible()) { pause(); draw(); g.frame = 0; return; }
            const dt = Math.min((now - g.last) / 1000, 0.033);
            g.last = now;
            tick(dt);
            draw();
            g.frame = requestAnimationFrame(loop);
        }

        function run() {
            g.state = 'running';
            playing();
            g.last = performance.now();
            if (!g.frame) g.frame = requestAnimationFrame(loop);
        }

        // Start, jump, try again.
        function press() {
            if (g.state === 'running') {
                if (g.y >= GROUND) g.vy = -JUMP;
            } else if (g.state === 'paused') {
                run();
            } else {
                reset();
                run();
            }
        }

        // The space bar: shoots on the final level, otherwise the same as press().
        function space() {
            if (boss && g.state === 'running') shoot();
            else press();
        }

        function stop() {
            if (g.frame) cancelAnimationFrame(g.frame);
            g.frame = 0;
            g.state = 'idle';
        }

        canvas.addEventListener('pointerdown', e => {
            if (boss && g.state === 'running') {
                const r = canvas.getBoundingClientRect();
                if ((e.clientX - r.left) / r.width < 0.35) press(); else shoot();
            } else {
                press();
            }
        });

        Object.assign(g, { resize, press, space, shoot, pause, stop, tick, draw, reset, level, speed, bossX, bossR });
        return g;
    }

    // ---------- the page around the games ----------

    // While a level is being played, the home text steps out of the way.
    function playing() {
        document.body.classList.toggle('game-playing', games.some(g => g.state === 'running'));
    }

    // Each gap opens and closes gradually, tied to the scrolling itself: it starts
    // to part as it comes up from the bottom of the screen, is fully open by the
    // middle, and draws shut again as it leaves through the top. The final level,
    // below the last painting, is always open.
    function check() {
        checkQueued = false;
        const vh = window.innerHeight;
        for (const g of games) {
            if (g.boss) continue;
            const full = g.canvas.offsetHeight;
            const top = g.strip.getBoundingClientRect().top;
            const above = g.strip.previousElementSibling;
            // until the painting above has loaded we don't know where the gap really is
            const ready = !(above && above.tagName === 'IMG' && !(above.complete && above.naturalWidth));
            const opening = (vh * 0.95 - top) / Math.max(vh * 0.45, full * 1.2);
            const closing = 1 + top / Math.max(vh * 0.5, full);
            let open = ready ? Math.max(0, Math.min(1, opening, closing)) : 0;
            open = open * open * (3 - 2 * open);        // ease in and out
            g.open = open;
            g.strip.style.height = (open * full).toFixed(1) + 'px';
            g.strip.classList.toggle('open', open > 0.01);
            if (open < 0.6) g.pause();
        }
    }

    function queueCheck() {
        if (checkQueued) return;
        checkQueued = true;
        requestAnimationFrame(check);
    }

    function onResize() {
        games.forEach(g => g.resize());
        queueCheck();
    }

    // Space plays whichever level is most on screen. If none is, space scrolls the page as usual.
    // The arrow keys only belong to the game while a level is actually running;
    // the rest of the time they scroll the page as usual.
    function onKey(e) {
        if (!games.length) return;
        const running = games.find(g => g.state === 'running');

        if (running && (e.code === 'ArrowLeft' || e.code === 'ArrowRight' || e.code === 'ArrowUp')) {
            e.preventDefault();
            if (e.code === 'ArrowLeft') running.left = true;
            else if (e.code === 'ArrowRight') running.right = true;
            else running.press();
            return;
        }

        if (e.code !== 'Space') return;
        let best = running || null, bestShare = 0.5;
        if (!best) {
            if (e.repeat) return;
            for (const g of games) {
                if (!g.boss && !(g.open > 0.9)) continue;
                const r = g.strip.getBoundingClientRect();
                const share = (Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0)) / r.height;
                if (share > bestShare) { best = g; bestShare = share; }
            }
        }
        if (!best) return;
        e.preventDefault();
        if (e.repeat && !best.boss) return;     // holding space keeps shooting, but doesn't keep jumping
        best.space();
    }

    function onKeyUp(e) {
        for (const g of games) {
            if (e.code === 'ArrowLeft') g.left = false;
            if (e.code === 'ArrowRight') g.right = false;
        }
    }

    function mount(container) {
        unmount();
        games = [...container.querySelectorAll('.home-game')].map(createGame);
        if (!games.length) return;
        container.querySelectorAll('.home-painting').forEach(img => img.addEventListener('load', queueCheck));
        if (!listening) {
            window.addEventListener('scroll', queueCheck, { passive: true });
            window.addEventListener('resize', onResize);
            document.addEventListener('keydown', onKey);
            document.addEventListener('keyup', onKeyUp);
            listening = true;
        }
        // The gaps change height as you scroll, so stop the browser from trying
        // to hold the page still around them (it makes the scrolling stutter).
        document.documentElement.style.overflowAnchor = 'none';
        games.forEach(g => g.resize());
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => games.forEach(g => g.draw()));
        queueCheck();
    }

    function unmount() {
        games.forEach(g => g.stop());
        games = [];
        document.body.classList.remove('game-playing');
        document.documentElement.style.overflowAnchor = '';
        if (listening) {
            window.removeEventListener('scroll', queueCheck);
            window.removeEventListener('resize', onResize);
            document.removeEventListener('keydown', onKey);
            document.removeEventListener('keyup', onKeyUp);
            listening = false;
        }
    }

    return { mount, unmount, check, get games() { return games; } };
})();

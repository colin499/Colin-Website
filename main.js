// Site logic. Posts come from posts.js, which is generated from the content/ folder by build.js.
//
// The site is a stack of cards, one per part: home (the painting with the title
// over it), paintings, writing, projects, cha and contact. The buttons float in
// front of whichever card is showing. Clicking one slides that card up over the
// current one, which shrinks back behind it. A piece of writing or a project is
// a card of its own that slides over its section; its back link slides it away.

// The runner game hidden between the paintings on the home card (see game.js).
// Switched off for now: set this to true to bring it back (it also brings back
// the full stack of background paintings, since the levels sit between them).
const GAMES_ON = false;
let allPosts = [...posts];

// The sections, in button order, and the kind of post each shows.
const SECTIONS = ['paintings', 'writing', 'projects', 'cha', 'contact'];
const TYPES = { paintings: 'painting', writing: 'writing', projects: 'projects', cha: 'cha' };
// Sections shown as a grid of squares that each open into one piece.
const PIECE_SECTIONS = ['writing', 'projects'];

const SLIDE_MS = 450;      // how long a card takes to slide (the same as in style.css)

// The card on top: 'home', a section like 'writing', or a piece like 'writing/<slug>'.
let currentCard = null;
let cardTimer = 0;

function pieceSlug(post) {
    return post.title.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'untitled';
}

function postsOf(section) {
    return allPosts.filter(p => p.type === TYPES[section]).sort((a, b) => new Date(b.date) - new Date(a.date));
}

// Which card an address means: '' is home, '#writing' a section, '#writing/<slug>' a piece.
function keyFromHash(hash) {
    const [name, slug] = decodeURIComponent(hash.replace(/^#/, '')).split('/');
    if (slug && PIECE_SECTIONS.includes(name)) return name + '/' + slug;
    return SECTIONS.includes(name) ? name : 'home';
}

// A floating button, or the site title: bring that card to the top.
// The address keeps the card (index.html#writing), so reloading and the back button work.
function goTo(name) {
    navigate(name === 'home' ? '' : '#' + name);
}

// Open one piece (of writing, or one project) from its grid.
function openPiece(section, slug) {
    navigate('#' + section + '/' + slug);
}

function navigate(hash) {
    if (location.hash !== hash) history.pushState(null, '', hash || location.pathname + location.search);
    showCard(keyFromHash(hash), true);
}

window.addEventListener('popstate', () => showCard(keyFromHash(location.hash), true));



function formatDate(dateStr) {
    const [year, month, day] = dateStr.split('-');
    const months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
    return `${months[parseInt(month) - 1]} ${parseInt(day)}, ${year}`;
}

function renderPost(post) {
    const meta = `${formatDate(post.date)} — ${post.type}`;

    if (PIECE_SECTIONS.includes(post.type)) {
        const bodyHtml = post.contentHtml || post.content
            .split('\n\n')
            .map(p => `<p>${p.trim()}</p>`)
            .join('');
        // a project's cover photo sits above its text
        const cover = post.image ? `<img class="post-image" src="${post.image}" alt="${post.title}">` : '';
        return `
            <article class="post post-writing">
                <div class="post-meta">${meta}</div>
                <h2 class="post-title">${post.title}</h2>
                <div class="post-body">${cover}${bodyHtml}</div>
            </article>
        `;
    }

    // Cha photos run the full width of the screen, like the home page,
    // with the title sitting on top of the photo.
    if (post.type === 'cha' && post.image) {
        return `
            <article class="post-full">
                <img class="post-full-image" src="${post.image}" alt="${post.title}"${sizeAttrs(post)} loading="lazy">
                <div class="post-full-text">
                    <h2 class="post-title">${post.title}</h2>
                    ${post.caption ? `<div class="post-full-caption">${post.caption}</div>` : ''}
                </div>
            </article>
        `;
    }

    return '';
}

// Sounds for the buttons on the home page.
const BUTTON_SOUND_VOLUME = 0.8;   // 0 = silent, 1 = full volume
const BUTTON_SOUNDS = {
    paintings: { file: 'assets/sounds/Bleep.wav' },
    writing:   { file: 'assets/sounds/Bloop.wav' },
    projects:  { file: 'assets/sounds/Blip.wav' },
    cha:       { file: 'assets/sounds/Bllam.wav' },
    contact:   { file: 'assets/sounds/Bingo.wav' }
};

for (const sound of Object.values(BUTTON_SOUNDS)) {
    sound.audio = new Audio(sound.file);
    sound.audio.preload = 'auto';
    sound.audio.volume = BUTTON_SOUND_VOLUME;
}

function playButtonSound(name) {
    const sound = BUTTON_SOUNDS[name];
    if (!sound) return;
    sound.audio.currentTime = 0;
    sound.audio.play().catch(() => {});
}

// ---------- the stack of cards ----------

function renderStack() {
    const feed = document.getElementById('feed');
    HomeGames.unmount();

    // The backdrop: the first photo in content/background/. With the game on, every
    // photo is stacked top to bottom with a level in each gap, as it used to be.
    const all = (typeof backgrounds !== 'undefined' && backgrounds.length)
        ? backgrounds
        : [{ image: 'assets/home-painting.jpg', title: '' }];
    const panels = GAMES_ON ? all : all.slice(0, 1);
    feed.innerHTML = `
        <section class="card card-home" data-card="home">
            <div class="home${GAMES_ON ? '' : ' home-one-screen'}">
                <div class="home-overlay">
                <div class="home-card">
                    <h1 class="home-title">Brain Food</h1>
                    <div class="post-body home-text">${typeof home !== 'undefined' ? home.html : ''}</div>
                </div>
                </div>
                ${panels.map((p, i) => `<img class="home-painting" src="${p.image}" alt="${p.title}"${sizeAttrs(p)}${i ? ' loading="lazy"' : ''}>`)
                    .join(GAMES_ON ? '<div class="home-game"><canvas aria-label="A small running game: press space or tap to start and jump, arrow keys to move"></canvas></div>' : '')}
                ${GAMES_ON ? '<div class="home-game home-boss open" data-boss><canvas aria-label="The final level: press space or tap to shoot arrows at the giant pink blob"></canvas></div>' : ''}
                ${GAMES_ON || WALKER_ON ? '<div class="home-floor"></div>' : ''}
            </div>
        </section>
        ${SECTIONS.map(renderSection).join('')}
    `;
    if (GAMES_ON) HomeGames.mount(feed.querySelector('.card-home'));
}

// One section's card: a heading, then its posts.
function renderSection(name) {
    let body;
    if (name === 'contact') {
        body = `
            <div class="post post-writing">
                <a href="mailto:colinlysik@gmail.com">colinlysik@gmail.com</a>
                <div><a class="button" href="https://colinlysik.substack.com/" target="_blank" rel="noopener">substack</a></div>
            </div>
        `;
    } else {
        const sorted = postsOf(name);
        if (!sorted.length) {
            body = '<div class="empty">nothing here yet.</div>';
        } else if (name === 'paintings') {
            // A grid of squares, one per painting. Clicking one shows the whole painting big.
            body = `
                <div class="tiles">
                    ${sorted.map(p => `
                    <a class="tile tile-photo tile-painting" href="${p.image}" onclick="openLightbox(this.querySelector('img')); return false;">
                        <img class="tile-image" src="${p.image}" alt="${p.title}"${p.caption ? ` data-caption="${p.caption.replace(/"/g, '&quot;')}"` : ''} loading="lazy">
                        <span class="tile-text">
                            <span class="tile-title">${p.title}</span>
                            <span class="tile-date">${formatDate(p.date)}</span>
                        </span>
                    </a>`).join('')}
                </div>
            `;
        } else if (PIECE_SECTIONS.includes(name)) {
            // Writing and projects: a grid of squares, one per piece. Clicking a square opens that piece.
            body = `
                <div class="tiles">
                    ${sorted.map(p => {
                        // the cover photo, or else the first photo in the piece, becomes the picture on its square
                        const photo = p.image || ((p.contentHtml || '').match(/<img[^>]+src="([^"]+)"/) || [])[1];
                        return `
                        <a class="tile${photo ? ' tile-photo' : ''}" href="#${name}/${pieceSlug(p)}" onclick="openPiece('${name}', '${pieceSlug(p)}'); return false;">
                            ${photo ? `<img class="tile-image" src="${photo}" alt="" loading="lazy">` : ''}
                            <span class="tile-text">
                                <span class="tile-title">${p.title}</span>
                                <span class="tile-date">${formatDate(p.date)}</span>
                            </span>
                        </a>
                    `; }).join('')}
                </div>
            `;
        } else {
            body = sorted.map(renderPost).join('');
        }
    }
    return `<section class="card" data-card="${name}"><h2 class="section-title">${name}</h2>${body}</section>`;
}

// The card for a key. A piece's card is made the first time it is opened and kept.
function cardFor(key) {
    const found = document.querySelector(`.card[data-card="${CSS.escape(key)}"]`);
    if (found) return found;
    const [section, slug] = key.split('/');
    const piece = slug && postsOf(section).find(p => pieceSlug(p) === slug);
    if (!piece) return null;
    const card = document.createElement('section');
    card.className = 'card card-piece';
    card.dataset.card = key;
    card.innerHTML = `
        <div class="piece-back"><a href="#${section}" onclick="goTo('${section}'); return false;">← all ${section}</a></div>
        ${renderPost(piece)}
    `;
    document.getElementById('feed').appendChild(card);
    return card;
}

// Bring a card to the top. Going forward, it slides up over the current card,
// which shrinks back behind it. Going back (to home, or from a piece to its
// section), the current card slides down out of the way instead.
function showCard(key, animate) {
    const next = cardFor(key) || cardFor('home');
    key = next.dataset.card;
    const prev = currentCard ? cardFor(currentCard) : null;
    if (prev === next) return;
    const back = key === 'home' || (currentCard && currentCard.startsWith(key + '/'));
    currentCard = key;

    document.body.classList.toggle('is-home', key === 'home');
    document.querySelectorAll('.dock a').forEach(a => {
        a.classList.toggle('is-current', key === a.dataset.section || key.startsWith(a.dataset.section + '/'));
    });

    // tidy up any card still mid-slide from a quick earlier click
    clearTimeout(cardTimer);
    document.querySelectorAll('.card').forEach(c => { if (c !== next && c !== prev) c.classList.remove('is-active', 'is-behind', 'is-leaving'); });

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!prev || !animate || reduce) {
        if (prev) prev.classList.remove('is-active', 'is-behind', 'is-leaving');
        next.classList.remove('is-behind', 'is-leaving');
        next.classList.add('is-active');
        return;
    }
    if (back) {
        next.classList.add('is-behind', 'no-anim');   // start from behind, without animating there
        void next.offsetWidth;
        next.classList.remove('is-behind', 'no-anim');
        next.classList.add('is-active');
        prev.classList.remove('is-active');
        prev.classList.add('is-leaving');
        cardTimer = setTimeout(() => prev.classList.remove('is-leaving'), SLIDE_MS);
    } else {
        next.classList.remove('is-leaving');
        next.classList.add('is-active');
        prev.classList.remove('is-active');
        prev.classList.add('is-behind');
        cardTimer = setTimeout(() => prev.classList.remove('is-behind'), SLIDE_MS);
    }
}

// width and height for a photo, when the build recorded them, so a card
// doesn't jump about while photos load.
function sizeAttrs(p) {
    return p.width && p.height ? ` width="${p.width}" height="${p.height}"` : '';
}

// The lightbox shows one painting big. The arrows (or the keyboard arrow
// keys, or swiping on a phone) step through every painting on the page.
let lightboxImages = [];
let lightboxIndex = 0;

function openLightbox(img) {
    lightboxImages = [...document.querySelectorAll('#feed .tile-painting img')];
    lightboxIndex = Math.max(0, lightboxImages.indexOf(img));
    showLightboxImage();
    document.getElementById('lightbox').classList.add('open');
}

function showLightboxImage() {
    const img = lightboxImages[lightboxIndex];
    if (!img) return;
    document.getElementById('lightbox-img').src = img.src;
    document.getElementById('lightbox-img').alt = img.alt;
    document.getElementById('lightbox-title').textContent = img.dataset.caption ? `${img.alt} — ${img.dataset.caption}` : img.alt;
    document.getElementById('lightbox').classList.toggle('single', lightboxImages.length < 2);
}

function stepLightbox(direction) {
    if (lightboxImages.length < 2) return;
    lightboxIndex = (lightboxIndex + direction + lightboxImages.length) % lightboxImages.length;
    showLightboxImage();
}

function closeLightbox() {
    document.getElementById('lightbox').classList.remove('open');
}

document.addEventListener('keydown', function (e) {
    if (!document.getElementById('lightbox').classList.contains('open')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') stepLightbox(-1);
    if (e.key === 'ArrowRight') stepLightbox(1);
});

// Swipe left or right on a phone to move between paintings.
(function () {
    const box = document.getElementById('lightbox');
    let startX = null, startY = null;
    box.addEventListener('touchstart', e => {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
    }, { passive: true });
    box.addEventListener('touchend', e => {
        if (startX === null) return;
        const dx = e.changedTouches[0].clientX - startX;
        const dy = e.changedTouches[0].clientY - startY;
        startX = startY = null;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) stepLightbox(dx < 0 ? 1 : -1);
    }, { passive: true });
})();

// ---------- walker: pounces at the cursor when it gets close ----------

// The bouncing photo at the bottom of the screen, with its pounce and cat noise.
// Switched off for now: set this to true to bring it all back.
const WALKER_ON = false;

const walker = WALKER_ON ? document.getElementById('walker') : null;
if (!WALKER_ON) {
    const el = document.getElementById('walker');
    if (el) el.remove();
    document.body.classList.add('no-walker');
}
const walkerImg = walker ? walker.querySelector('img') : null;
const POUNCE_RANGE = 150;   // px from the walker's centre that triggers the attack
const POUNCE_REACH = 70;    // how far it lunges toward the cursor
let mouse = null;
let attacking = false;

document.addEventListener('mousemove', e => { mouse = { x: e.clientX, y: e.clientY }; });
document.addEventListener('mouseleave', () => { mouse = null; });

// On a phone there is no cursor: a finger on the screen counts instead.
function trackTouch(e) {
    const t = e.touches[0];
    if (t) mouse = { x: t.clientX, y: t.clientY };
}
document.addEventListener('touchstart', trackTouch, { passive: true });
document.addEventListener('touchmove', trackTouch, { passive: true });
document.addEventListener('touchend', () => { mouse = null; });
document.addEventListener('touchcancel', () => { mouse = null; });

function checkWalker() {
    // no pouncing (or cat noises) while the game is being played
    const hidden = document.body.classList.contains('game-playing');
    if (!walker || !mouse || hidden) { if (attacking) stopAttack(); return; }
    const r = walker.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const dx = mouse.x - cx;
    const dy = mouse.y - cy;
    const dist = Math.hypot(dx, dy);

    if (dist < POUNCE_RANGE) {
        const reach = Math.min(POUNCE_REACH, dist);
        walkerImg.style.setProperty('--dx', (dx / dist * reach).toFixed(1) + 'px');
        walkerImg.style.setProperty('--dy', (dy / dist * reach).toFixed(1) + 'px');
        walkerImg.style.setProperty('--rot', (dx >= 0 ? 12 : -12) + 'deg');
        if (!attacking) { attacking = true; walker.classList.add('attacking'); }
        spawnDistress();
        attackSounds();
    } else if (attacking) {
        stopAttack();
    }
}

// Little distress marks that fly off the cursor while it's being attacked.
const DISTRESS_MARKS = ['!', '!!', '✶', '✸', '⚡', '#', '@', '*', '?!'];
const DISTRESS_EVERY = 110;   // ms between marks (smaller = more frantic)
const DISTRESS_COLORS = ['#111', '#d1352b'];
const calmMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let lastDistress = 0;

function spawnDistress() {
    const now = performance.now();
    if (calmMotion.matches || now - lastDistress < DISTRESS_EVERY) return;
    lastDistress = now;

    for (let i = 0; i < 2; i++) {
        const mark = document.createElement('span');
        mark.className = 'distress';
        mark.textContent = DISTRESS_MARKS[Math.floor(Math.random() * DISTRESS_MARKS.length)];
        mark.style.left = mouse.x + 'px';
        mark.style.top = mouse.y + 'px';
        mark.style.color = DISTRESS_COLORS[Math.floor(Math.random() * DISTRESS_COLORS.length)];
        mark.style.fontSize = (14 + Math.random() * 14).toFixed(0) + 'px';
        document.body.appendChild(mark);

        // Fly outward in a random direction, leaning upward, then fade.
        const angle = Math.random() * Math.PI * 2;
        const far = 45 + Math.random() * 55;
        const x = Math.cos(angle) * far;
        const y = Math.sin(angle) * far - 25;
        const spin = (Math.random() * 120 - 60).toFixed(0);
        mark.animate([
            { transform: 'translate(-50%, -50%) scale(0.4)', opacity: 1 },
            { transform: `translate(calc(-50% + ${x * 0.7}px), calc(-50% + ${y * 0.7}px)) scale(1.2) rotate(${spin * 0.6}deg)`, opacity: 1, offset: 0.5 },
            { transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(0.9) rotate(${spin}deg)`, opacity: 0 }
        ], { duration: 550 + Math.random() * 250, easing: 'cubic-bezier(0.1, 0.7, 0.3, 1)' })
            .onfinish = () => mark.remove();
    }
}

// Attack sound: a cat recording that plays for as long as the attack lasts.
// Browsers only allow sound after the visitor has clicked or pressed a key
// somewhere on the page, so the attack is silent until then.
const SOUND_VOLUME = 0.6;     // 0 = silent, 1 = full volume
const attackSound = new Audio('assets/sounds/cat-attack.mp3');
attackSound.loop = true;
attackSound.volume = SOUND_VOLUME;
attackSound.preload = 'auto';
// The recording opens with a moment of near silence, so start just past it.
attackSound.addEventListener('loadedmetadata', () => { attackSound.currentTime = 0.6; }, { once: true });

function attackSounds() {
    if (attackSound.paused) attackSound.play().catch(() => {});
}

function stopAttack() {
    attacking = false;
    walker.classList.remove('attacking');
    attackSound.pause();
}

if (walker) setInterval(checkWalker, 60);

// The cards leave room under the top bar, so CSS needs its height.
function setHeaderHeight() {
    document.documentElement.style.setProperty('--header-h', document.querySelector('header').offsetHeight + 'px');
}

window.addEventListener('resize', setHeaderHeight);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(setHeaderHeight);
setHeaderHeight();

// Substack posts are already in posts.js (the build downloads them).
allPosts = posts;
renderStack();
showCard(keyFromHash(location.hash), false);

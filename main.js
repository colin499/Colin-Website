// Site logic. Posts come from posts.js, which is generated from the content/ folder by build.js.
let currentFilter = 'home';
let allPosts = [...posts];

function toggleDropdown() {
    document.getElementById('dropdown').classList.toggle('open');
}

function selectFilter(value, label) {
    currentFilter = value;
    document.getElementById('dropdown-label').textContent = label;
    document.getElementById('dropdown').classList.remove('open');
    render();
    window.scrollTo(0, 0);
}

document.addEventListener('click', function (e) {
    const dropdown = document.getElementById('dropdown');
    if (!dropdown.contains(e.target)) {
        dropdown.classList.remove('open');
    }
});

function formatDate(dateStr) {
    const [year, month, day] = dateStr.split('-');
    const months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
    return `${months[parseInt(month) - 1]} ${parseInt(day)}, ${year}`;
}

function parseSubstackContent(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const parts = [];
    doc.body.querySelectorAll('p, img, h2, h3').forEach(el => {
        if (el.tagName === 'IMG') {
            parts.push(`<img class="post-image" src="${el.src}" alt="${el.alt || ''}">`);
        } else {
            const text = el.textContent.trim();
            if (text) parts.push(`<p>${text}</p>`);
        }
    });
    return parts.join('');
}

async function fetchSubstackPosts() {
    const rssUrl = 'https://colinlysik.substack.com/feed';
    const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;
    try {
        const res = await fetch(apiUrl);
        const data = await res.json();
        if (data.status !== 'ok') return [];
        return data.items.map(item => ({
            type: 'writing',
            date: item.pubDate.split(' ')[0],
            title: item.title,
            contentHtml: parseSubstackContent(item.content || item.description)
        }));
    } catch (e) {
        return [];
    }
}

function renderPost(post) {
    const meta = `${formatDate(post.date)} — ${post.type}`;

    if (post.type === 'writing') {
        const bodyHtml = post.contentHtml || post.content
            .split('\n\n')
            .map(p => `<p>${p.trim()}</p>`)
            .join('');
        return `
            <article class="post post-writing">
                <div class="post-meta">${meta}</div>
                <h2 class="post-title">${post.title}</h2>
                <div class="post-body">${bodyHtml}</div>
            </article>
        `;
    }

    if (post.image) {
        return `
            <article class="post post-painting post-${post.type}">
                <div class="post-meta">${meta}</div>
                <h2 class="post-title">${post.title}</h2>
                <img class="post-image" src="${post.image}" alt="${post.title}" onclick="openLightbox(this.src)">
                ${post.caption ? `<div class="post-caption">${post.caption}</div>` : ''}
            </article>
        `;
    }

    return '';
}

function render() {
    const feed = document.getElementById('feed');

    // On the home page the top bar goes away: the title and menu float over the paintings.
    document.body.classList.toggle('is-home', currentFilter === 'home');
    setHeaderHeight();

    if (currentFilter === 'home') {
        // One full-width painting per photo in content/background/, stacked
        // top to bottom. The card stays put while they scroll past behind it.
        const panels = (typeof backgrounds !== 'undefined' && backgrounds.length)
            ? backgrounds
            : [{ image: 'assets/home-painting.jpg', title: '' }];
        feed.innerHTML = `
            <section class="home">
                <div class="home-overlay">
                <div class="home-card">
                    <h1 class="home-title">Brain Foood</h1>
                    <div class="post-body home-text">${typeof home !== 'undefined' ? home.html : ''}</div>
                    <ul class="home-links">
                        <li><a href="#" onclick="selectFilter('painting', 'paintings'); return false;">paintings</a></li>
                        <li><a href="#" onclick="selectFilter('writing', 'writing'); return false;">writing</a></li>
                        <li><a href="#" onclick="selectFilter('cha', 'cha'); return false;">cha</a></li>
                        <li><a href="#" onclick="selectFilter('contact', 'contact'); return false;">contact</a></li>
                    </ul>
                </div>
                </div>
                ${panels.map((p, i) => `<img class="home-painting" src="${p.image}" alt="${p.title}"${i ? ' loading="lazy"' : ''}>`).join('')}
            </section>
        `;
        return;
    }

    if (currentFilter === 'contact') {
        feed.innerHTML = `
            <div class="post post-writing">
                <a href="mailto:colinlysik@gmail.com">colinlysik@gmail.com</a>
                <div><a class="button" href="https://colinlysik.substack.com/" target="_blank" rel="noopener">substack</a></div>
            </div>
        `;
        return;
    }

    const filtered = allPosts.filter(p => p.type === currentFilter);

    const sorted = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));

    if (sorted.length === 0) {
        feed.innerHTML = '<div class="empty">nothing here yet.</div>';
        return;
    }

    feed.innerHTML = sorted.map(renderPost).join('');
}

function openLightbox(src) {
    document.getElementById('lightbox-img').src = src;
    document.getElementById('lightbox').classList.add('open');
}

function closeLightbox() {
    document.getElementById('lightbox').classList.remove('open');
}

document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeLightbox();
});

// ---------- walker: pounces at the cursor when it gets close ----------

const walker = document.getElementById('walker');
const walkerImg = walker ? walker.querySelector('img') : null;
const POUNCE_RANGE = 150;   // px from the walker's centre that triggers the attack
const POUNCE_REACH = 70;    // how far it lunges toward the cursor
let mouse = null;
let attacking = false;

document.addEventListener('mousemove', e => { mouse = { x: e.clientX, y: e.clientY }; });
document.addEventListener('mouseleave', () => { mouse = null; });

function checkWalker() {
    if (!walker || !mouse) { if (attacking) stopAttack(); return; }
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

function stopAttack() {
    attacking = false;
    walker.classList.remove('attacking');
}

setInterval(checkWalker, 60);

// The home card is held in place just below the header, so CSS needs its height.
function setHeaderHeight() {
    const h = document.body.classList.contains('is-home') ? 0 : document.querySelector('header').offsetHeight;
    document.documentElement.style.setProperty('--header-h', h + 'px');
}

window.addEventListener('resize', setHeaderHeight);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(setHeaderHeight);
setHeaderHeight();

async function init() {
    const substackPosts = await fetchSubstackPosts();
    allPosts = [...posts, ...substackPosts];
    render();
}

init();

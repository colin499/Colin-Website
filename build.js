// Turns the files in content/ into posts.js, which the website reads.
// You never need to edit this file. Run it by double-clicking "Build Site.command".

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
// Image folders: each one becomes a section of the site. Add more here if you want.
const IMAGE_SECTIONS = [
    { type: 'painting', dir: path.join(ROOT, 'content', 'paintings') },
    { type: 'cha',      dir: path.join(ROOT, 'content', 'cha') }
];
const WRITING_DIR = path.join(ROOT, 'content', 'writing');
// Photos in here become the home page background, stacked top to bottom.
const BACKGROUND_DIR = path.join(ROOT, 'content', 'background');
const BACKGROUND_OUT = path.join(ROOT, 'assets', 'background');
const BACKGROUND_MAX_PX = 2400;
const OUT_FILE = path.join(ROOT, 'posts.js');
const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
const TEXT_EXTS = ['.md', '.txt'];

function isText(file) {
    return TEXT_EXTS.includes(path.extname(file).toLowerCase());
}

const warnings = [];

// ---------- helpers ----------

function listFiles(dir) {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir).filter(f => !f.startsWith('.'));
}

function isImage(file) {
    return IMAGE_EXTS.includes(path.extname(file).toLowerCase());
}

function fileDate(file) {
    return fs.statSync(file).mtime.toISOString().slice(0, 10);
}

function titleFromFilename(file) {
    return path.basename(file, path.extname(file)).replace(/[-_]+/g, ' ').trim().normalize('NFC');
}

// Reads the block between the two "---" lines at the top of a file.
function parseFrontMatter(text) {
    const meta = {};
    let body = text;
    const m = text.match(/^﻿?---\s*\r?\n([\s\S]*?)\r?\n---\s*(?:\r?\n|$)/);
    if (m) {
        m[1].split(/\r?\n/).forEach(line => {
            const idx = line.indexOf(':');
            if (idx === -1) return;
            const key = line.slice(0, idx).trim().toLowerCase();
            let value = line.slice(idx + 1).trim();
            if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }
            meta[key] = value;
        });
        body = text.slice(m[0].length);
    }
    return { meta, body: body.trim() };
}

function isDraft(meta) {
    return ['true', 'yes', '1'].includes(String(meta.draft || '').toLowerCase());
}

function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Handles *italic*, **bold**, [links](url) and ![images](src) inside a line.
function inline(text) {
    let s = escapeHtml(text);
    s = s.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img class="post-image" src="$2" alt="$1">');
    s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
    return s;
}

// Blank line = new paragraph. "## " at the start of a line = heading.
function markdownToHtml(md) {
    return md
        .split(/\r?\n\s*\r?\n/)
        .map(block => block.trim())
        .filter(Boolean)
        .map(block => {
            const heading = block.match(/^#{1,6}\s+(.*)$/);
            if (heading) return `<h3>${inline(heading[1])}</h3>`;
            if (/^!\[[^\]]*\]\([^)]+\)$/.test(block)) return inline(block);
            return `<p>${inline(block)}</p>`;
        })
        .join('');
}

// The Mac stores accented letters (like the í in "Mía") differently from the
// web server, so file names are converted to the form the server expects.
function relativeUrl(file) {
    return path.relative(ROOT, file).split(path.sep).join('/').normalize('NFC');
}

// iPhone photos (.heic) can't be shown in a browser. Convert them to .jpeg
// next to the original, using the built-in macOS "sips" tool.
function convertHeic(dir) {
    for (const file of listFiles(dir)) {
        if (!['.heic', '.heif'].includes(path.extname(file).toLowerCase())) continue;
        const src = path.join(dir, file);
        const out = path.join(dir, path.basename(file, path.extname(file)) + '.jpeg');
        if (fs.existsSync(out)) continue;
        try {
            execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '85', src, '--out', out], { stdio: 'ignore' });
            console.log(`Converted ${path.relative(ROOT, src)} to .jpeg`);
        } catch (e) {
            warnings.push(`${path.relative(ROOT, src)}: could not convert from HEIC — skipped.`);
        }
    }
}

// ---------- image sections (paintings, cha) ----------

// Phone photos are several megabytes each, which is slow to load (especially
// on a phone). The site shows a web-sized .jpg copy kept in assets/web/.
const WEB_OUT = path.join(ROOT, 'assets', 'web');
const WEB_MAX_PX = 1800;
const webCopiesInUse = new Set();

function webCopy(src, label) {
    const out = path.join(WEB_OUT, label, path.basename(src, path.extname(src)) + '.jpg');
    if (!fs.existsSync(out) || fs.statSync(out).mtimeMs < fs.statSync(src).mtimeMs) {
        try {
            fs.mkdirSync(path.dirname(out), { recursive: true });
            execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '80', '-Z', String(WEB_MAX_PX), src, '--out', out], { stdio: 'ignore' });
            console.log(`Prepared web copy of ${path.relative(ROOT, src)}`);
        } catch (e) {
            return relativeUrl(src);   // couldn't shrink it, so use the original
        }
    }
    webCopiesInUse.add(out);
    return relativeUrl(out);
}

// Remove web copies of photos that have been deleted or renamed.
function cleanWebCopies(dir) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) cleanWebCopies(full);
        else if (!entry.name.startsWith('.') && !webCopiesInUse.has(full)) fs.unlinkSync(full);
    }
}

function buildImageSection(type, dir) {
    const label = path.basename(dir);
    convertHeic(dir);
    const files = listFiles(dir);
    const notes = files.filter(f => isText(f) && !f.toLowerCase().startsWith("readme"));
    const images = files.filter(isImage);
    const usedImages = new Set();
    const posts = [];

cleanWebCopies(WEB_OUT);

    for (const note of notes) {
        const full = path.join(dir, note);
        const { meta, body } = parseFrontMatter(fs.readFileSync(full, 'utf8'));
        if (isDraft(meta)) continue;

        // Find the image: the "image:" line, or an image with the same name as the note.
        let image = meta.image;
        if (!image) {
            const base = path.basename(note, path.extname(note)).toLowerCase();
            image = images.find(img => path.basename(img, path.extname(img)).toLowerCase() === base);
        }
        if (!image || !fs.existsSync(path.join(dir, image))) {
            warnings.push(`content/${label}/${note}: can't find image "${image || '(none given)'}" — skipped.`);
            continue;
        }
        usedImages.add(image);

        posts.push({
            type,
            date: meta.date || fileDate(path.join(dir, image)),
            title: meta.title || titleFromFilename(note),
            image: webCopy(path.join(dir, image), label),
            caption: meta.caption || body || ''
        });
    }

    // Images with no note still get shown, using the file name as the title.
    for (const image of images) {
        if (usedImages.has(image)) continue;
        const full = path.join(dir, image);
        posts.push({
            type,
            date: fileDate(full),
            title: titleFromFilename(image),
            image: webCopy(full, label),
            caption: ''
        });
        warnings.push(`content/${label}/${image} has no note — shown with title "${titleFromFilename(image)}". Add a .md file to give it a real title and caption.`);
    }

    return posts;
}

// ---------- writing ----------

function buildWriting() {
    const posts = [];
    for (const file of listFiles(WRITING_DIR)) {
        if (!isText(file)) continue;
        if (file.toLowerCase().startsWith('readme')) continue;
        const full = path.join(WRITING_DIR, file);
        const { meta, body } = parseFrontMatter(fs.readFileSync(full, 'utf8'));
        if (isDraft(meta)) continue;
        if (!body) {
            warnings.push(`content/writing/${file} is empty — skipped.`);
            continue;
        }
        posts.push({
            type: 'writing',
            date: meta.date || fileDate(full),
            title: meta.title || titleFromFilename(file),
            contentHtml: markdownToHtml(body)
        });
    }
    return posts;
}

// ---------- home page background ----------

// Every photo in content/background/ gets a web-sized .jpg copy in
// assets/background/ (the originals are too big to load quickly).
function buildBackgrounds() {
    const sources = listFiles(BACKGROUND_DIR)
        .filter(f => isImage(f) || ['.heic', '.heif'].includes(path.extname(f).toLowerCase()))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
    const backgrounds = [];

    for (const file of sources) {
        const src = path.join(BACKGROUND_DIR, file);
        const out = path.join(BACKGROUND_OUT, path.basename(file, path.extname(file)) + '.jpg');
        if (!fs.existsSync(out) || fs.statSync(out).mtimeMs < fs.statSync(src).mtimeMs) {
            try {
                fs.mkdirSync(BACKGROUND_OUT, { recursive: true });
                execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '80', '-Z', String(BACKGROUND_MAX_PX), src, '--out', out], { stdio: 'ignore' });
                console.log(`Prepared background ${path.relative(ROOT, src)}`);
            } catch (e) {
                if (!isImage(file)) {
                    warnings.push(`${path.relative(ROOT, src)}: could not convert — skipped.`);
                    continue;
                }
                // Couldn't shrink it, so use the original as it is.
                backgrounds.push({ image: relativeUrl(src), title: titleFromFilename(file) });
                continue;
            }
        }
        backgrounds.push({ image: relativeUrl(out), title: titleFromFilename(file) });
    }

    if (!backgrounds.length) {
        warnings.push('content/background/ has no photos — the home page will use assets/home-painting.jpg.');
    }
    return backgrounds;
}

const backgrounds = buildBackgrounds();

// Clear out web-sized copies of photos that are no longer in content/background/.
if (fs.existsSync(BACKGROUND_OUT)) {
    const inUse = new Set(backgrounds.map(b => path.basename(b.image)));
    for (const file of listFiles(BACKGROUND_OUT)) {
        if (!inUse.has(file)) fs.unlinkSync(path.join(BACKGROUND_OUT, file));
    }
}

// ---------- privacy: remove GPS location from photos ----------

// Phone photos record where they were taken. The site is public, so wipe that
// out of every .jpg/.jpeg in content/ and assets/. The picture itself is untouched.
function stripGps(file) {
    const buf = fs.readFileSync(file);
    if (buf.length < 4 || buf.readUInt16BE(0) !== 0xFFD8) return false;
    const SIZES = [0, 1, 1, 2, 4, 8, 1, 1, 2, 4, 8, 4, 8];
    let changed = false;
    let pos = 2;
    while (pos + 4 <= buf.length && buf[pos] === 0xFF) {
        const marker = buf[pos + 1];
        if (marker === 0xDA || marker === 0xD9) break;
        const len = buf.readUInt16BE(pos + 2);
        const end = pos + 2 + len;
        if (end > buf.length) break;
        if (marker === 0xE1 && buf.toString('latin1', pos + 4, pos + 10) === 'Exif\0\0') {
            const tiff = pos + 10;
            const le = buf.toString('latin1', tiff, tiff + 2) === 'II';
            const u16 = o => le ? buf.readUInt16LE(o) : buf.readUInt16BE(o);
            const u32 = o => le ? buf.readUInt32LE(o) : buf.readUInt32BE(o);
            const ifd0 = tiff + u32(tiff + 4);
            if (ifd0 + 2 <= end) {
                const n = u16(ifd0);
                for (let i = 0; i < n && ifd0 + 2 + (i + 1) * 12 <= end; i++) {
                    const entry = ifd0 + 2 + i * 12;
                    if (u16(entry) !== 0x8825) continue;
                    const gps = tiff + u32(entry + 8);
                    if (gps + 2 > end) break;
                    const count = u16(gps);
                    for (let j = 0; j < count && gps + 2 + (j + 1) * 12 <= end; j++) {
                        const e = gps + 2 + j * 12;
                        const size = (SIZES[u16(e + 2)] || 1) * u32(e + 4);
                        const data = tiff + u32(e + 8);
                        if (size > 4 && data + size <= end) buf.fill(0, data, data + size);
                        buf.fill(0, e, e + 12);
                    }
                    if (count) { buf.writeUInt16BE(0, gps); changed = true; }
                }
            }
        }
        pos = end;
    }
    if (changed) {
        const { atime, mtime } = fs.statSync(file);
        fs.writeFileSync(file, buf);
        fs.utimesSync(file, atime, mtime);   // keep the file's date as it was
    }
    return changed;
}

function stripGpsIn(dir) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) { stripGpsIn(full); continue; }
        if (!['.jpg', '.jpeg'].includes(path.extname(entry.name).toLowerCase())) continue;
        try {
            if (stripGps(full)) console.log(`Removed location from ${path.relative(ROOT, full)}`);
        } catch (e) {
            warnings.push(`${path.relative(ROOT, full)}: could not check for location data.`);
        }
    }
}

stripGpsIn(path.join(ROOT, 'content'));
stripGpsIn(path.join(ROOT, 'assets'));

// ---------- write posts.js ----------

const posts = [
    ...IMAGE_SECTIONS.flatMap(s => buildImageSection(s.type, s.dir)),
    ...buildWriting()
];

for (const p of posts) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(p.date)) {
        warnings.push(`"${p.title}" has date "${p.date}" — dates should look like 2026-04-28. Using today instead.`);
        p.date = new Date().toISOString().slice(0, 10);
    }
}

// ---------- home page ----------

const HOME_FILE = ['home.md', 'home.txt'].map(f => path.join(ROOT, 'content', f)).find(fs.existsSync);
let homeHtml = '';
if (HOME_FILE) {
    homeHtml = markdownToHtml(parseFrontMatter(fs.readFileSync(HOME_FILE, 'utf8')).body);
} else {
    warnings.push('content/home.md (or home.txt) is missing — the home page will be blank.');
}

const header = [
    '// GENERATED FILE — do not edit by hand.',
    '// Edit the files in the content/ folder, then double-click "Build Site.command".',
    ''
].join('\n');

fs.writeFileSync(OUT_FILE,
    header +
    'const home = ' + JSON.stringify({ html: homeHtml }, null, 4) + ';\n\n' +
    'const backgrounds = ' + JSON.stringify(backgrounds, null, 4) + ';\n\n' +
    'const posts = ' + JSON.stringify(posts, null, 4) + ';\n');

const counts = {};
posts.forEach(p => { counts[p.type] = (counts[p.type] || 0) + 1; });
console.log('Built posts.js: ' + Object.entries(counts).map(([t, n]) => `${n} ${t}`).join(', ') + `, ${backgrounds.length} background.`);
if (warnings.length) {
    console.log('');
    console.log('Heads up:');
    warnings.forEach(w => console.log('  - ' + w));
}

# How to edit this website

Everything you post lives in the `content` folder. You never need to touch
`index.html`, `main.js`, `style.css` or `posts.js`.

After any change, double-click **Build Site.command**. It rebuilds the site
and opens it in your browser. That's it.

**Nothing changes on the site until you do this.** Editing a file alone isn't
enough. If the site still looks old after building, press Cmd+Shift+R in the
browser to reload it fresh.

## Put it online

Building only updates the copy on your Mac. When it looks right, double-click
**Publish Site.command**. It builds again, lists what changed, asks for a few
words describing the change (or just press Return), and uploads it.
colinlysik.com shows the changes a minute or two later.

- It only publishes the website's own files. Other things lying around in
  this folder, like screen recordings, are left alone.
- If a file is over 100 MB it stops and tells you which one, because GitHub
  won't take it. Nothing is published until that's fixed.
- If the upload fails, your changes are still saved on this Mac. Ask Claude
  to push them.

---

## Change the home page text

Edit `content/home.md` (or `home.txt`, either works). Plain text, blank line between paragraphs, same
italic and bold rules as writing. Rebuild.

## Change the home page background

The home page background is made of the photos in `content/background/`.
Each one is shown whole, as wide as the screen, and they stack top to
bottom, so scrolling down the home page scrolls over them one after another.
Crop the photo to just the painting before adding it.

- To add one, drop the photo into `content/background/` and rebuild.
  iPhone photos (`.heic`) are fine.
- They go in file-name order: the first name is at the top. To reorder,
  rename them, for example `1-gold.jpeg`, `2-apple.jpeg`.
- To remove one, delete it from the folder and rebuild. To keep it around
  without showing it, move it into `content/background/not-shown/` instead.

## Add a painting

1. Drop the photo into `content/paintings/`.
2. Make a text file next to it with the same name but ending in `.md`
   (for example `blue-horse.jpeg` and `blue-horse.md`). A `.txt` file works
   just as well. Put this inside:

```
---
title: blue horse
date: 2026-06-01
caption: oil on wood
---
```

3. Double-click **Build Site.command**.

Notes:
- iPhone photos (`.heic`) are fine. The build converts them to `.jpeg`
  automatically. Name the note after the photo as usual.
- If you skip the `.md` file the painting still shows, using the file name
  as the title and the file's date.
- If the photo has a different name than the note, add a line
  `image: IMG_1234.jpeg` to the note.
- Dates are year-month-day, like `2026-06-01`. Newest shows first.
- Caption can be left blank.

## Add a photo of Cha

Same as a painting, but in `content/cha/`. Drop the photo in, add a `.md`
note with the same name for a title, date and caption, and rebuild. It shows
up under "cha" in the menu.

## Add writing

1. Make a file in `content/writing/`, ending in `.md` or `.txt`, like `my-essay.md`.
2. Put this at the top, then write below the second `---`:

```
---
title: My Essay
date: 2026-06-01
---

First paragraph goes here.

Leave a blank line between paragraphs.

## A section heading starts with two # signs

*Italic* goes between single stars. **Bold** between double stars.
```

3. Double-click **Build Site.command**.

Your Substack posts show up alongside these. The build downloads them
from Substack each time you run it, so after publishing something new on
Substack, double-click **Build Site.command** to get it onto the site.
If Substack can't be reached, the posts saved from the last build are used.

## Add a project

Each project is a button down the left side of the projects page. Clicking
the button shows that project's photos beside it, with whatever text you
want under each photo.

1. Drop the project's photos into `content/projects/`. iPhone photos
   (`.heic`) are fine, and so are renderings saved as `.png`.
2. Make a file in `content/projects/` ending in `.md`, like
   `ipad-mini-case.md`. The title is what the button says. List each
   photo on its own line like `![](photo.jpeg)`, and put any text you
   want under a photo right after it:

```
---
title: iPad mini e-reader case
date: 2026-10-17
---

![](ipad-mini-case-1.png)

A few words about this view, if you want them. Leave a blank line
between paragraphs. *Italic* and **bold** work like in writing.

![](ipad-mini-case-2.png)
```

3. Double-click **Build Site.command**.

**Videos** work the same way. Drop the video into `content/projects/` and
write `![](my-video.mov)` on its own line where you want it. The build
makes a smaller copy for the site, which can take a minute the first time.
The original stays on your computer only, because it's usually too big
to put online.

To use only part of a video, add the start and end in seconds:

```
![](layover-video.mov from 1 to 22)
```

A photo with no text after it is fine. Text before the first photo works
too. Projects are listed newest date first, so change the dates to reorder
the buttons.

The button is filled with the project's first photo. To use a different
one, add a line to the top block naming it:

```
image: ipad-mini-case-2.png
```

The photo is cropped to fit the button, showing its middle. To show a
different part, add `crop: top` (or `bottom`, `left`, `right`) to the
top block.

## Hide something without deleting it

Add `draft: true` to the top block of any painting note or piece of writing.
It disappears from the site until you remove that line.

## Remove something

Delete its file (and the image, for paintings), then rebuild.

## Where things are

```
content/
  home.md           the text on the home page
  background/       photos behind the home page, stacked top to bottom
  paintings/        photos + one .md note per painting
  cha/              photos of Cha, same format as paintings
  writing/          one .md file per piece of writing
    original-word-docs/   the Word files these started as (not used by the site)
  projects/         one .md file per project (a button each), plus its photos and videos
assets/
  substack-posts.json   your Substack posts, saved by the build (don't edit)
tools/shrink-video  makes the smaller video copies (used by the build)
Build Site.command  double-click after editing, to see it on your Mac
Publish Site.command  double-click to put it online
HOW-TO-EDIT.md      this file
```

## Going online later

When you're ready to put this on the internet, the `content` folder is
already in the format that free tools like Netlify + Decap CMS expect.
That gives you a browser-based editor with image upload and a publish
button, with no more file editing at all.

## The game between the paintings

Scrolling the home page used to open a small running game in the gaps
between the paintings, with a final level after the last one.

**Currently switched off.** To bring it back, open `main.js`, find the line
`const GAMES_ON = false;` near the top and change `false` to `true`, then
rebuild. The game itself lives in `game.js`.

## The bouncing photo at the bottom

**Currently switched off.** To bring it back, open `main.js`, find the line
`const WALKER_ON = false;` and change `false` to `true`, then rebuild.

If you move the cursor near it, it pounces at the cursor until you back off.

That's `assets/colin-and-cat.png`. To swap it, replace that file with
another cut-out PNG of the same name. To change its size or speed, the
settings are at the bottom of `style.css` under "Bouncing walker"
(`width: 100px` for size, `18s` for how long a crossing takes,
`0.45s` for bounce speed).

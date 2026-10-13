# How to edit this website

Everything you post lives in the `content` folder. You never need to touch
`index.html`, `main.js`, `style.css` or `posts.js`.

After any change, double-click **Build Site.command**. It rebuilds the site
and opens it in your browser. That's it.

**Nothing changes on the site until you do this.** Editing a file alone isn't
enough. If the site still looks old after building, press Cmd+Shift+R in the
browser to reload it fresh.

---

## Change the home page text

Edit `content/home.md` (or `home.txt`, either works). Plain text, blank line between paragraphs, same
italic and bold rules as writing. Rebuild.

## Change the home page background

The site is a stack of cards: a painting fills the home card with the title
over it, and the buttons floating along the bottom slide the other cards
(paintings, writing, projects, cha, contact) up over it.

The backdrop is the first photo, by file name, in `content/background/`.
Crop the photo to just the painting before adding it.

- To change it, drop the new photo in and give it a name that sorts first,
  for example `1-gold.jpeg`. iPhone photos (`.heic`) are fine.
- The other photos in the folder are only used when the game is switched on
  (see "The game between the paintings"), when they stack top to bottom in
  file-name order with a level in each gap.
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

Same as writing, but in `content/projects/`. Make a file ending in `.md`,
like `treehouse.md`, with the same top block (title and date) and the
write-up below it. It shows up under "projects" in the menu as a grid of
squares; clicking one opens the project.

Photos: drop them into `content/projects/` next to the file. To show one
at the top of the project (and on its square), add a line to the top block:

```
image: treehouse.jpeg
```

To put photos in the text, write `![](treehouse-2.jpeg)` on its own line
wherever you want one. iPhone photos (`.heic`) are fine.

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
  projects/         one .md file per project, plus its photos
assets/
  substack-posts.json   your Substack posts, saved by the build (don't edit)
Build Site.command  double-click after editing
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
rebuild. The game itself lives in `game.js`. With it on, every photo in
`content/background/` is shown again, stacked top to bottom.

## The bouncing photo at the bottom

**Currently switched off.** To bring it back, open `main.js`, find the line
`const WALKER_ON = false;` and change `false` to `true`, then rebuild.

If you move the cursor near it, it pounces at the cursor until you back off.

That's `assets/colin-and-cat.png`. To swap it, replace that file with
another cut-out PNG of the same name. To change its size or speed, the
settings are at the bottom of `style.css` under "Bouncing walker"
(`width: 100px` for size, `18s` for how long a crossing takes,
`0.45s` for bounce speed).

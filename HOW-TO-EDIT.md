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

The home page background is made of the photos in `content/background/`.
Each one is shown whole, as wide as the screen, and they stack top to
bottom, so scrolling down the home page scrolls over them one after another.
Crop the photo to just the painting before adding it.

- To add one, drop the photo into `content/background/` and rebuild.
  iPhone photos (`.heic`) are fine.
- They go in file-name order: the first name is at the top. To reorder,
  rename them, for example `1-gold.jpeg`, `2-apple.jpeg`.
- To remove one, delete it from the folder and rebuild.

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

Your Substack posts still show up automatically alongside these.

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
Build Site.command  double-click after editing
HOW-TO-EDIT.md      this file
```

## Going online later

When you're ready to put this on the internet, the `content` folder is
already in the format that free tools like Netlify + Decap CMS expect.
That gives you a browser-based editor with image upload and a publish
button, with no more file editing at all.

## The bouncing photo at the bottom

If you move the cursor near it, it pounces at the cursor until you back off.

That's `assets/colin-and-cat.png`. To swap it, replace that file with
another cut-out PNG of the same name. To change its size or speed, the
settings are at the bottom of `style.css` under "Bouncing walker"
(`width: 100px` for size, `18s` for how long a crossing takes,
`0.45s` for bounce speed).

# Footprint Intelligence poster tool

Makes the "I am going" / "I am speaking at" post people share before a Footprint
Intelligence leadership event: pick the event, drop in a photo, type a name,
download a 1080 × 1350 PNG.

Two audiences, one codebase:

| domain | audience | headline | repo |
|---|---|---|---|
| share.footprint-intelligence.com | attendees | I AM GOING | `fi-share` |
| speak.footprint-intelligence.com | speakers | I AM SPEAKING AT, under a SPEAKER label | `fi-speak` |

Which build runs is decided from the hostname at runtime — see
`assets/js/variant.js`. Nothing is configured per deployment; the only file that
differs between the two repositories is `CNAME`. Add `?variant=speaker` to any
URL to see the speaker build from the attendee domain or from localhost.

## Running it

```bash
node serve.mjs      # http://localhost:8792
```

No build step, no dependencies. It is static files and ES modules; the server is
30 lines of `node:http` that exist only because ES modules will not load over
`file://`.

## Publishing

```bash
./deploy.sh          # both builds
./deploy.sh speak    # just the speaker one
```

Force-pushes both mirrors, creates the repositories and the Pages sites on first
run, and turns on **Enforce HTTPS** — GitHub leaves that off by default, which
serves the site over plain `http` too and earns a "Not secure" badge in the
address bar.

## Changing the events

`assets/js/editions.js` is the single source of truth. The picker, the poster's
date line, the background lookup and the export filename all read from it — add
or re-date an event there and nothing else needs touching.

`city` is what the poster prints large. `label` is only needed when the city
alone would be ambiguous, which is why the two Munich dates carry one.

## Changing the pictures

Drop a portrait file into `assets/img/bg/` named after the event id and it is
picked up on the next load. `assets/img/bg/README.md` has the sizes and the
manifest format for offering several shots per event.

Until a photo exists an event still works — the poster draws a tinted gradient
with a faint leaf watermark, using that event's `tint`.

## What is inherited, and what is not

The layout, the intro animation, the canvas renderer, the combobox and the
exporters are shared with the DDX poster tool this was built from, deliberately
unchanged. What was swapped is the brand: wordmark, favicon, colours, typeface,
photographs, domains and copy.

The two projects share no files and no repositories. They are independent copies
— fixing a bug in one does not fix it in the other.

## Known gaps

- **Not indexed.** `robots.txt` and a `noindex` meta keep the tool out of search
  so it does not compete with the real event pages. Delete both to change that.
- **Photography is Unsplash stock.** Replace it with real event photography when
  there is some — that is a file drop into `assets/img/bg/`, not a code change.
- **The event name is set in capitals**, like every other line on the poster.
  The longest of the four runs to two lines because of it. Lower-casing that one
  line is a single `.toUpperCase()` in `poster.js`, but it will then be the only
  mixed-case type on the poster.

## Regenerating the social preview image

`assets/img/og-image.png` is the poster's own empty state, rendered by the app
rather than drawn beside it, so it cannot drift from what the tool actually
makes. To rebuild it after a design change, run the dev server and, in the
browser console:

```js
const {Poster} = await import('/assets/js/poster.js');
const ph = new Image(); ph.src = 'assets/img/placeholder-photo.jpg'; await ph.decode();
const p = new Poster(); await p.wordmarkReady;
await p.setData({ name:'', role:'', edition:null, mode:'image',
                  headline:'I AM GOING', bgIndex:0, videoIndex:0, photo:ph, photoZoom:1 });
p.skipIntro();
const src = p.renderAt();
const og = Object.assign(document.createElement('canvas'), {width:1200, height:630});
const x = og.getContext('2d');
x.fillStyle = '#050505'; x.fillRect(0, 0, 1200, 630);
const h = 630*0.88, w = h*src.width/src.height;
x.drawImage(src, (1200-w)/2, (630-h)/2, w, h);
await fetch('/__og', { method:'POST', body: og.toDataURL('image/png') });
```

`/__og` is a dev-only endpoint in `serve.mjs`: one fixed destination, no path
taken from the request, and the server binds to the loopback interface only.

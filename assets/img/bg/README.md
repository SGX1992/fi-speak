# Event backgrounds

Drop a file in here named after the event id and it is picked up on the next
load — no code change, no manifest entry. The ids are the ones in
`assets/js/editions.js`:

| file                        | event                                    |
|-----------------------------|------------------------------------------|
| `dusseldorf.jpg`            | FI x EY Leadership Breakfast, 8 Sep 2026 |
| `hamburg.jpg`               | Afterwork Roundtable, 9 Sep 2026         |
| `munich-climate-week.jpg`   | Roundtable Breakfast, 23 Oct 2026        |
| `conference.jpg`            | Leadership Summer Conference, 10 Jun 2027|

`.avif`, `.jpg`, `.png` and `.webp` are all probed, in that order.

Shoot or crop **portrait, 1080 × 1350 or larger**. The poster darkens the lower
half heavily for the type, so the interesting part of the picture should sit in
the top two thirds. Anything under about 1600 px tall will look soft on a
retina screen.

To offer several shots for one event — the picker shows them as thumbnails —
name them in `manifest.json` instead:

```json
{
  "hamburg": [
    { "file": "hamburg.jpg",   "label": "Harbour" },
    { "file": "hamburg-2.jpg", "label": "Speicherstadt" }
  ],
  "_shared": [
    { "file": "neutral-1.jpg", "label": "Neutral" }
  ]
}
```

`_shared` is offered on every event, after its own shots. Anything listed under
`default` is the fallback for events with nothing of their own.

Until a file exists the poster draws a tinted gradient with a faint leaf
watermark, using the event's `tint` — so an event is publishable before its
photograph is.

import { ACCENT, DISPLAY_WEIGHT, FONT, WHITE, capHeight, clamp, drawTracked, drawTrackedReveal, fitSize, mixHex, roundRect } from './brand.js?v=ee1512a';
import { background } from './backgrounds.js?v=ee1512a';
import { posterName } from './editions.js?v=ee1512a';
import { variant } from './variant.js?v=ee1512a';
import { backgroundVideo, seek } from './videobg.js?v=ee1512a';

export const W = 1080;
export const H = 1350;
export const STILL_LOOP = 8; // only used if a video export ever runs in image mode

/* Exported so the whole layout — spacing, type caps, the brand wash — can be
   nudged from the console while art-directing, without an edit-reload cycle. */
/* The colour that changes nothing for each blend mode. White is neutral for
   multiply; overlay and soft-light pivot around mid-grey instead. */
/* The build-in. Each layer gets a window in the intro, as a fraction of
   INTRO_MS, and fades up while sliding a few pixels into place. The headline is
   deliberately early and the card late, so you watch the card crop into it —
   the layering that makes the poster work is also what it shows you first.

   Exports never see this: main.js calls skipIntro() before rendering. */
const INTRO_MS = 5000;
const NAME_REVEAL_MS = 420; // only the changed tail of the name animates
const BG_FADE_MS = 750; // cross-fade when the edition or the chosen shot changes
const CUE = {
  background: [0.00, 0.34],
  headline:   [0.20, 0.46],
  card:       [0.34, 0.62],
  date:       [0.56, 0.72],
  city:       [0.64, 0.84],
  name:       [0.74, 0.92],
  role:       [0.80, 0.96],
  partners:   [0.80, 0.94],
  logo:       [0.10, 0.34],
  footer:     [0.86, 1.00],
  tint:       [0.40, 1.00],
};

const easeOut = (t) => 1 - Math.pow(1 - t, 3);

/* The event name is a phrase, not a city, so it has to break. Rather than break
   at whatever word overflows, every balanced split into 1..maxLines lines is
   measured and the one that lets the type run largest wins — which is what stops
   a five-word name from setting itself as one long line and one short one.

   Memoised because renderAt runs 720 times during a video export and the answer
   only changes when the event does. */
const wrapCache = new Map();
function wrapToFit(c, text, maxW, cap, weight, track, maxLines) {
  const key = `${text}|${maxW}|${cap}|${weight}|${track}|${maxLines}`;
  const hit = wrapCache.get(key);
  if (hit) return hit;

  const words = text.split(/\s+/).filter(Boolean);
  let best = { size: 0, lines: [text] };

  /* Every way to cut the word list into n runs, for n up to maxLines. With five
     words and two lines that is four candidates — brute force is the simplest
     thing that is also exactly right. */
  const walk = (start, left, acc) => {
    if (left === 0) {
      const lines = [...acc, words.slice(start).join(' ')];
      if (lines.some((l) => !l)) return;
      const size = Math.min(cap, ...lines.map((l) => fitSize(c, l, maxW, weight, track, cap)));
      if (size > best.size) best = { size, lines };
      return;
    }
    for (let i = start + 1; i < words.length; i++) {
      walk(i, left - 1, [...acc, words.slice(start, i).join(' ')]);
    }
  };
  for (let n = 1; n <= Math.min(maxLines, words.length); n++) walk(0, n - 1, []);

  wrapCache.set(key, best);
  return best;
}

/* 0 before the cue, 1 after it, eased in between. */
function cue(name, t) {
  const [from, to] = CUE[name];
  if (t >= 1) return 1;
  return easeOut(clamp((t - from) / (to - from), 0, 1));
}

/* Cover-fit onto the poster, anchored slightly above centre. */
function paintCover(c, src, zoom, alpha) {
  if (!src || alpha <= 0) return;
  const iw = src.videoWidth || src.naturalWidth || src.width;
  const ih = src.videoHeight || src.naturalHeight || src.height;
  if (!iw || !ih) return;
  const scale = Math.max(W / iw, H / ih) * zoom;
  const dw = iw * scale;
  const dh = ih * scale;
  const prev = c.globalAlpha;
  c.globalAlpha = prev * alpha;
  c.drawImage(src, (W - dw) / 2, (H - dh) * 0.42, dw, dh);
  c.globalAlpha = prev;
}

/* Draw `body` faded up and nudged into place. p of 1 skips the save/restore
   entirely, so a finished poster costs exactly what it did before the intro
   existed — which matters because a 24-second export runs this 720 times. */
function layer(c, p, rise, body) {
  if (p <= 0) return;
  if (p >= 1) return body();
  c.save();
  c.globalAlpha = p;
  c.translate(0, (1 - p) * rise);
  body();
  c.restore();
}

const NEUTRAL = {
  multiply: '#FFFFFF',
  screen: '#000000',
  overlay: '#808080',
  'soft-light': '#808080',
};

export const L = {
  side: 76,
  headline: 'I AM GOING',
  headMaxW: 936,
  headTrack: -0.038,
  headOverlap: 0.2,   // how far the card crops into the headline, in cap heights
  eyebrowSize: 22,    // the small wide line above it, on the speaker build
  eyebrowTrack: 0.42,
  eyebrowGap: 26,
  card: { w: 548, h: 616, r: 28, y: 272 },
  dateGap: 62,        // date baseline above the card's bottom edge
  dateMaxW: 640,
  dateCap: 44,
  /* The title hangs off the date, not off the card. The two are one thing — the
     event's billing — and measuring from the date's baseline to the title's cap
     height keeps the optical gap between them identical whether the title sets
     at 150 or at 55, which a fixed offset from the card could never do. */
  dateToTitle: 30,
  cityMaxW: 940,
  cityCap: 150,
  cityTrack: -0.038,
  cityMaxLines: 2,    // three would push the name past the footer
  cityLead: 1.02,     // line spacing, in multiples of the fitted size
  nameGap: 92,
  nameMaxW: 620,
  nameCap: 84,
  /* Regular, not bold. The event title above it carries the weight on this
     poster; setting the person's name at 700 as well made the two compete.
     Tracking eases off with it — the tight negative fit was drawn for a bold
     face and reads cramped on a regular one. */
  nameWeight: 400,
  /* The event outranks the person on this poster, so the name is capped as a
     fraction of whatever size the title actually reached — not at a fixed size
     that a wrapped, and therefore smaller, title could quietly slip under. */
  nameToTitle: 0.82,
  nameTrack: -0.006,
  /* The optional role-and-company line under the name. Deliberately sized like
     the footer URL rather than like the name — it is an attribution, and at
     name scale it would compete with the person it describes. Left in a dimmed
     white rather than the accent so it stays subordinate to the date. */
  roleGap: 44,        // role baseline below the name baseline
  roleMaxW: 780,
  roleCap: 28,
  roleTrack: 0.16,
  roleTone: 0.34,     // how far white is pulled toward black
  /* Brand wash: a left-to-right ramp toward the Footprint green, laid over the finished
     poster so the image and the type sit in one light.

     `tintMode` is a canvas blend mode and `tintStrength` runs 0–1. Each mode has a
     different *neutral* colour — the one that changes nothing — so the ramp is
     built from that colour outward and strength means the same in all of them.
     Getting this wrong is the classic trap: white is neutral for multiply, but in
     overlay white doubles the brightness and blows the left side out.

       multiply    can only ever darken, so contrast survives — this is the one
                   that behaves like a gel over the lens, and it is the default
       soft-light  lifts the shadows as it warms them, which reads as washed out
       overlay     more contrast still, but it turns a blue sky green

     Strength is what keeps multiply usable: at 1 it drags white type all the way
     to yellow, at 0.30 it reads as a warm cast over an image that still has its
     blacks. */
  tintMode: 'multiply',
  tintStrength: 0.30,
  tintScope: 'all',

  /* The host's mark, centred above the headline. Sized by height, not width, so
     a tall stacked logo and a wide one take the same vertical bite out of the
     space the headline needs.

     What it can grow into is fixed by the speaker build, not the attendee one:
     the SPEAKER eyebrow starts at y=167 where the attendee headline only starts
     at 183. At 34 + 110 the mark ends at 144, which leaves 23px of air under it
     there and 39 here. Growing it further means moving it into the top margin,
     which is already tighter than the 76px at the sides. */
  logoTop: 34,
  logoH: 110,

  partnersTop: 1142,
  footBase: 1274,
  footSize: 22,
  footWeight: 400,
  footTrack: 0.42, // set wide, small and light — a caption, not a headline
  footTone: 0.45,  // how far the accent is lifted toward white
  markW: 172,        // wider than DDX's: two lines of type, not one
};
/* The partner strip runs the full measure between the margins, so a row of
   logos is as large as the poster can make it — derived from `side` rather than
   set by hand, or the two drift the next time the margin moves. */
L.partnersMaxW = W - L.side * 2;

L.card.x = (W - L.card.w) / 2;
L.card.bottom = L.card.y + L.card.h;

export class Poster {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = W;
    this.canvas.height = H;
    this.ctx = this.canvas.getContext('2d');

    this.data = null;
    this.mode = 'image'; // 'image' | 'video'
    this.bg = null; // { image, placeholder } once resolved
    this.bgPrev = null; // held only while a cross-fade is running
    this.bgFade = 0;
    this.video = null;
    this.videoKey = '';
    this.dropActive = false; // a file is hovering over the portrait card
    this.partners = new Map(); // edition id -> logo strip Image, or null
    this.logos = new Map();    // edition id -> top-of-poster mark, or null
    /* Framing is kept as a ratio of the available slack, not pixels, so zooming
       doesn't throw the crop away and one number drives both the drag and the
       slider. -0.25 starts a touch high: on a portrait the face is above centre. */
    this.pan = { x: 0, y: -0.25 };

    this.introStart = 0; // 0 = no intro running, render the finished poster
    this.introKeepsBackground = false;
    this.nameAt = 0;
    this.nameFrom = 0;
    this.wordmark = new Image();
    this.wordmark.src = 'assets/img/fi-wordmark.png';
    this.wordmarkReady = new Promise((r) => {
      this.wordmark.onload = r;
      this.wordmark.onerror = r;
    });
  }

  get card() {
    return L.card;
  }

  /* `keepBackground` is for a replay after an edition change: the cross-fade is
     already carrying the image across, so fading the background up from nothing
     as well would blank the poster for a frame before rebuilding it. Everything
     in front of it still deals in exactly as it does on first load. */
  beginIntro({ keepBackground = false } = {}) {
    this.introStart = performance.now();
    this.introKeepsBackground = keepBackground;
  }

  /* Anything that needs the finished poster — every export — calls this first. */
  skipIntro() {
    this.introStart = 0;
    this.nameAt = 0;
    this.nameFrom = 0;
  }

  /* How much of two strings is identical from the left. Typing a letter moves
     this by one, so only that letter animates; editing in the middle replays
     from the edit onward, which is what it looks like it should do. */
  static sharedPrefix(a = '', b = '') {
    const n = Math.min(a.length, b.length);
    let i = 0;
    while (i < n && a[i] === b[i]) i++;
    return i;
  }

  get introT() {
    if (!this.introStart) return 1;
    const t = (performance.now() - this.introStart) / INTRO_MS;
    if (t >= 1) {
      this.introStart = 0;
      return 1;
    }
    return t;
  }

  /* Video mode loops for exactly as long as the clip; image mode is a still, so
     the number only matters if something asks it for a video anyway. */
  get loopSeconds() {
    const d = this.mode === 'video' ? this.video?.duration : 0;
    return Number.isFinite(d) && d > 0.2 ? d : STILL_LOOP;
  }

  /* Background loading is async, so the poster keeps rendering the old one until
     the new edition's image is in — no flash of empty frame while switching. */
  async setData(data) {
    const bgChanged =
      this.data?.edition?.id !== data.edition?.id || this.data?.bgIndex !== data.bgIndex;
    if (this.data && this.data.photo !== data.photo) this.pan = { x: 0, y: -0.25 };
    if (this.data && this.data.name !== data.name) {
      this.nameFrom = Poster.sharedPrefix(
        (this.data.name || '').toUpperCase(),
        (data.name || '').toUpperCase(),
      );
      this.nameAt = performance.now();
    }
    this.data = data;
    this.mode = data.mode === 'video' ? 'video' : 'image';
    this.loadPartners(data.edition);
    this.loadLogo(data.edition);

    if (bgChanged || !this.bg) {
      const next = await background(data.edition, data.bgIndex || 0);
      /* Hold the outgoing image so the new one can rise through it. Skipped on
         the very first load, where there is nothing to fade from. */
      if (this.bg && this.bg.image !== next.image) {
        this.bgPrev = this.bg;
        this.bgFade = performance.now();
      }
      this.bg = next;
    }
    if (this.mode === 'video') {
      const want = `${data.edition?.id || '-'}|${data.videoIndex || 0}`;
      if (!this.video || this.videoKey !== want) {
        this.video = await backgroundVideo(data.edition, data.videoIndex || 0);
        this.videoKey = want;
      }
    }

    /* The clip only runs while it is on screen. Exports pause it and seek. */
    if (this.video) {
      if (this.mode === 'video') this.video.play().catch(() => {});
      else this.video.pause();
    }
    return this.bg;
  }

  /* Put the background on the exact frame for `seconds`, then renderAt draws it.
     A no-op for a still, so image exports stay synchronous in practice. */
  async prepare(seconds) {
    if (this.mode !== 'video' || !this.video) return;
    this.video.pause();
    await seek(this.video, seconds % this.loopSeconds);
  }

  resume() {
    if (this.mode === 'video') this.video?.play().catch(() => {});
  }

  /* How the photo is laid into the card: cover-fit, then zoom, then pan —
     clamped so a gap can never open at the edges. */
  photoRect() {
    const p = this.data?.photo;
    if (!p) return null;
    const iw = p instanceof HTMLImageElement ? p.naturalWidth : p.width;
    const ih = p instanceof HTMLImageElement ? p.naturalHeight : p.height;
    const scale = Math.max(L.card.w / iw, L.card.h / ih) * (this.data.photoZoom || 1);
    const dw = iw * scale;
    const dh = ih * scale;
    const slackX = (dw - L.card.w) / 2;
    const slackY = (dh - L.card.h) / 2;
    return {
      dw, dh, slackX, slackY,
      x: L.card.x - slackX + clamp(this.pan.x, -1, 1) * slackX,
      y: L.card.y - slackY + clamp(this.pan.y, -1, 1) * slackY,
    };
  }

  /* Drag deltas arrive in poster pixels; slack converts them to the ratio. */
  nudgePhoto(dx, dy) {
    const r = this.photoRect();
    if (!r) return;
    if (r.slackX > 0.5) this.pan.x = clamp(this.pan.x + dx / r.slackX, -1, 1);
    if (r.slackY > 0.5) this.pan.y = clamp(this.pan.y + dy / r.slackY, -1, 1);
  }

  setFraming(y) {
    this.pan.y = clamp(y, -1, 1);
  }

  renderAt() {
    const c = this.ctx;
    const d = this.data;

    c.fillStyle = '#000';
    c.fillRect(0, 0, W, H);
    if (!d) return this.canvas;

    const t = this.introT;
    const bg = this.introKeepsBackground ? 1 : cue('background', t);

    layer(c, bg, 0, () => {
      this.drawBackground(c, 1 + (1 - bg) * 0.06); // settles out of a slow push-in
      if (L.tintScope === 'background') this.drawTint(c, cue('tint', t));
      this.drawScrim(c);
    });

    layer(c, cue('headline', t), 20, () => this.drawHeadline(c));
    this.drawCard(c, cue('card', t));
    this.drawCopy(c, t);
    layer(c, cue('logo', t), 10, () => this.drawLogo(c));
    layer(c, cue('partners', t), 12, () => this.drawPartners(c));
    layer(c, cue('footer', t), 14, () => this.drawFooter(c));
    if (L.tintScope === 'all') this.drawTint(c, cue('tint', t));
    return this.canvas;
  }

  /* Video mode draws the clip's current frame and adds no motion of its own —
     the footage already moves. A still gets no push-in either: image mode only
     ever exports a PNG, so animating it would just make that PNG's crop a
     lottery. Both are cover-fit and anchored slightly above centre. */
  drawBackground(c, zoom = 1) {
    const useVideo = this.mode === 'video' && this.video && this.video.readyState >= 2;
    if (useVideo) return paintCover(c, this.video, zoom, 1);

    let p = 1;
    if (this.bgFade) {
      p = clamp((performance.now() - this.bgFade) / BG_FADE_MS, 0, 1);
      if (p >= 1) {
        this.bgFade = 0;
        this.bgPrev = null;
      }
    }
    /* The outgoing shot stays put underneath while the new one rises through it
       and settles out of a slight push-in — a swap you can follow rather than a
       cut you only notice afterwards. */
    if (this.bgPrev && p < 1) paintCover(c, this.bgPrev.image, zoom, 1);
    paintCover(c, this.bg?.image, zoom * (1 + (1 - p) * 0.05), this.bgPrev ? easeOut(p) : 1);
  }

  /* Two passes: an even knock-back over the whole photo so white type stays
     legible on any image, then the fall to solid black that the lower half of
     the poster is built on. */
  drawScrim(c) {
    /* Light enough that a bright beach shot still reads as one — the headline's
       contrast comes from the top wash below, not from flattening the photo. */
    c.fillStyle = 'rgba(0,0,0,.12)';
    c.fillRect(0, 0, W, H);

    /* The headline is white and the background is whatever someone uploads —
       this top-down wash is what guarantees it stays readable over a bright sky
       or a pale concrete ceiling. */
    const top = c.createLinearGradient(0, 0, 0, H * 0.30);
    top.addColorStop(0, 'rgba(0,0,0,.50)');
    top.addColorStop(0.5, 'rgba(0,0,0,.16)');
    top.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = top;
    c.fillRect(0, 0, W, H * 0.30);

    const fadeTop = H * 0.28;
    const fadeEnd = H * 0.60;
    const g = c.createLinearGradient(0, fadeTop, 0, fadeEnd);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.5, 'rgba(0,0,0,.62)');
    g.addColorStop(1, 'rgba(0,0,0,1)');
    c.fillStyle = g;
    c.fillRect(0, fadeTop, W, fadeEnd - fadeTop);
    c.fillStyle = '#000';
    c.fillRect(0, fadeEnd - 1, W, H - fadeEnd + 1);
  }

  /* Sits *behind* the card — the card crops its lower edge, which is what gives
     the layout its depth. Drawn before the card for exactly that reason. */
  drawHeadline(c) {
    /* `??` rather than `||`, because an empty string is a real choice here —
       the "None" option — and must not fall through to the default. */
    const text = this.data?.headline ?? L.headline;
    const eyebrow = variant().eyebrow;
    if (!text && !eyebrow) return;

    let capTop = L.card.y;
    if (text) {
      const size = fitSize(c, text, L.headMaxW, DISPLAY_WEIGHT, L.headTrack);
      const cap = capHeight(c, size, DISPLAY_WEIGHT);
      const base = L.card.y + cap * L.headOverlap;
      capTop = base - cap;
      c.fillStyle = WHITE;
      drawTracked(c, text, W / 2, base, size, DISPLAY_WEIGHT, L.headTrack, 'center');
    }

    /* Sits above the headline, set small and wide — the same voice as the URL in
       the footer, so it reads as a label rather than a second headline. */
    if (eyebrow) {
      c.fillStyle = mixHex(ACCENT, '#FFFFFF', L.footTone); // the footer's tone
      drawTracked(c, eyebrow, W / 2, capTop - L.eyebrowGap, L.eyebrowSize, 600, L.eyebrowTrack, 'center');
    }
  }

  drawCard(c, progress = 1) {
    if (progress <= 0) return;
    const { x, y, w, h, r } = L.card;
    c.save();
    c.globalAlpha = progress;
    if (progress < 1) {
      const k = 0.94 + 0.06 * progress;
      c.translate(x + w / 2, y + h / 2);
      c.scale(k, k);
      c.translate(-(x + w / 2), -(y + h / 2));
    }
    roundRect(c, x, y, w, h, r);
    c.clip();

    c.fillStyle = '#14161A';
    c.fillRect(x, y, w, h);

    const p = this.photoRect();
    if (p) c.drawImage(this.data.photo, p.x, p.y, p.dw, p.dh);

    /* The drop ring is painted here, inside the card's clip and *before* the
       fade, so the gradient washes over its lower half and the date and city
       print on top of it. Drawn as an HTML overlay it sat above the canvas and
       cut a hard line straight through the type. */
    if (this.dropActive) {
      roundRect(c, x, y, w, h, r);
      c.strokeStyle = ACCENT;
      c.lineWidth = 8; // half is clipped away, so this reads as a 4px inset ring
      c.stroke();
    }

    /* The fade the copy sits on. Ends fully black so the card dissolves into the
       poster instead of stopping at a hard edge. */
    const g = c.createLinearGradient(0, y + h * 0.42, 0, y + h);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.45, 'rgba(0,0,0,.55)');
    g.addColorStop(1, 'rgba(0,0,0,1)');
    c.fillStyle = g;
    c.fillRect(x, y, w, h);
    c.restore();
  }

  drawCopy(c, t = 1) {
    const d = this.data;

    /* With no edition chosen the poster still has to read as a poster, so both
       slots hold their shape: the date line announces the tour, and the name
       line shows where a name will go. */
    const date = d.edition?.date || 'COMING SOON';
    const dateSize = fitSize(c, date, L.dateMaxW, 600, 0.24, L.dateCap);
    const dateBase = L.card.bottom - L.dateGap;
    layer(c, cue('date', t), 12, () => {
      c.fillStyle = ACCENT;
      drawTracked(c, date, W / 2, dateBase, dateSize, 600, 0.24, 'center');
    });

    /* Before an event is picked the poster still has to say what it is for. The
       wordmark already carries the brand, so this slot describes the occasion
       instead of repeating the name below it. */
    const city = (d.edition ? posterName(d.edition) : 'Exclusive Leadership Event').toUpperCase();
    const wrapped = wrapToFit(c, city, L.cityMaxW, L.cityCap, DISPLAY_WEIGHT, L.cityTrack, L.cityMaxLines);
    const cityLead = wrapped.size * L.cityLead;
    const cityBase = dateBase + L.dateToTitle + capHeight(c, wrapped.size, DISPLAY_WEIGHT);
    layer(c, cue('city', t), 18, () => {
      c.fillStyle = WHITE;
      wrapped.lines.forEach((line, i) => {
        drawTracked(c, line, W / 2, cityBase + i * cityLead, wrapped.size, DISPLAY_WEIGHT, L.cityTrack, 'center');
      });
    });
    /* Everything below the event name hangs off its last line, not its first,
       so a two-line name pushes the name and role down instead of colliding. */
    const cityBottom = cityBase + (wrapped.lines.length - 1) * cityLead;

    const placeholder = !d.edition && !d.name;
    const name = (d.name || (placeholder ? 'Your name' : '')).toUpperCase();
    if (name) {
      const nameCap = Math.min(L.nameCap, wrapped.size * L.nameToTitle);
      const nameSize = fitSize(c, name, L.nameMaxW, L.nameWeight, L.nameTrack, nameCap);
      const y = cityBottom + L.nameGap;
      let reveal = 1;
      if (this.nameAt) {
        reveal = (performance.now() - this.nameAt) / NAME_REVEAL_MS;
        if (reveal >= 1) {
          this.nameAt = 0;
    this.nameFrom = 0;
          reveal = 1;
        }
      }
      layer(c, cue('name', t), 14, () => {
        /* Dimmed when it is standing in for a name, so it reads as an invitation
           rather than as somebody called Your Name. */
        c.fillStyle = placeholder ? mixHex(WHITE, '#000000', 0.52) : WHITE;
        if (reveal < 1) {
          drawTrackedReveal(c, name, W / 2, y, nameSize, L.nameWeight, L.nameTrack, 'center', reveal, this.nameFrom);
        } else {
          drawTracked(c, name, W / 2, y, nameSize, L.nameWeight, L.nameTrack, 'center');
        }
      });
    }

    /* Optional, and genuinely optional: nothing stands in for it when empty,
       because a poster with no role reads as finished, while a greyed-out
       "Your role" would read as a form someone abandoned. */
    const role = (d.role || '').toUpperCase();
    if (role) {
      const roleSize = fitSize(c, role, L.roleMaxW, 500, L.roleTrack, L.roleCap);
      const roleY = cityBottom + L.nameGap + L.roleGap;
      layer(c, cue('role', t), 12, () => {
        c.fillStyle = mixHex(WHITE, '#000000', L.roleTone);
        drawTracked(c, role, W / 2, roleY, roleSize, 500, L.roleTrack, 'center');
      });
    }
  }

  drawTint(c, progress = 1) {
    if (!L.tintStrength || progress <= 0) return;
    const neutral = NEUTRAL[L.tintMode] || '#FFFFFF';
    const end = mixHex(neutral, ACCENT, L.tintStrength * progress);
    const g = c.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, neutral);
    g.addColorStop(0.32, mixHex(neutral, end, 0.22));
    g.addColorStop(1, end);
    c.save();
    c.globalCompositeOperation = L.tintMode;
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
    c.restore();
  }

  /* An edition can carry a partner strip; most don't. Loaded once per edition
     and cached as null when absent, so a missing file is never re-requested. */
  loadPartners(edition) {
    if (!edition?.partners) return;
    if (this.partners.has(edition.id)) return;
    this.partners.set(edition.id, null);
    const img = new Image();
    img.onload = () => this.partners.set(edition.id, img);
    img.src = `assets/img/${edition.partners}`;
  }

  /* Loaded once per edition and cached as null when absent, so an edition with
     no mark never re-requests one. */
  loadLogo(edition) {
    if (!edition?.logo) return;
    if (this.logos.has(edition.id)) return;
    this.logos.set(edition.id, null);
    const img = new Image();
    img.onload = () => this.logos.set(edition.id, img);
    img.src = `assets/img/${edition.logo}`;
  }

  drawLogo(c) {
    const img = this.logos.get(this.data?.edition?.id);
    if (!img) return;
    const h = L.logoH;
    const w = (h * img.naturalWidth) / img.naturalHeight;
    c.drawImage(img, (W - w) / 2, L.logoTop, w, h);
  }

  drawPartners(c) {
    const img = this.partners.get(this.data?.edition?.id);
    if (!img) return;
    const w = L.partnersMaxW;
    const h = (w * img.naturalHeight) / img.naturalWidth;
    c.drawImage(img, (W - w) / 2, L.partnersTop, w, h);
  }

  drawFooter(c) {
    c.fillStyle = mixHex(ACCENT, '#FFFFFF', L.footTone);
    drawTracked(c, 'FOOTPRINT-INTELLIGENCE.COM', L.side, L.footBase, L.footSize, L.footWeight, L.footTrack, 'left');

    const wm = this.wordmark;
    if (wm.naturalWidth) {
      const w = L.markW;
      const h = (w * wm.naturalHeight) / wm.naturalWidth;
      c.drawImage(wm, W - L.side - w, L.footBase - h * 0.78, w, h);
    }
  }
}

export { FONT };

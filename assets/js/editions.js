/* The Footprint Intelligence event series. This file is the single source of
   truth: the picker, the poster headline, the date line, the background image
   and the export filename all read from it. Add or re-date an event here and
   nothing else needs touching.

   `poster` is what the poster prints large, `label` is what the picker shows,
   and `city` is the fallback for both. They differ on purpose: the poster has
   room for the event's full name, the picker has a single line and only needs
   enough to tell two Munich dates apart.

   `bg` names a file in assets/img/bg/, defaulting to `<id>.jpg`. A missing file
   falls back to default.jpg, and if that is missing too the poster draws a
   tinted gradient using `tint` — so an event is publishable before its photo
   exists.

   `partners` is an optional logo strip in assets/img/, printed under the name.
   White marks on transparent, wide and short — it is scaled to a fixed width.

   `logo` is an optional mark for the top of the poster, above the headline —
   for an event that runs under someone else's banner. Same rules: white on
   transparent, and it is scaled to a fixed height. */
export const EDITIONS = [
  { id: 'dusseldorf', city: 'Düsseldorf', poster: 'Düsseldorf Leadership Roundtable',
    date: '8TH SEPTEMBER 2026', dated: true, tint: '#1F4A3A',
    event: 'FI x EY Leadership Breakfast' },
  { id: 'hamburg', city: 'Hamburg', poster: 'Hamburg Leadership Roundtable',
    date: '9TH SEPTEMBER 2026', dated: true, tint: '#1C3B4A',
    event: 'Afterwork Leadership Roundtable' },
  { id: 'munich-climate-week', city: 'Munich', label: 'Munich · Climate Week',
    poster: 'Munich Leadership Roundtable', logo: 'munich-climate-week.png',
    date: '23RD OCTOBER 2026', dated: true, tint: '#24402C',
    event: 'Leadership Roundtable Breakfast' },
  { id: 'conference', city: 'Munich', label: 'Munich · Conference',
    poster: 'Munich Sustainability Leadership Summer Conference',
    date: '10TH JUNE 2027', dated: true, tint: '#2B4A55',
    event: 'Leadership Summer Conference' },
];

/* Nothing is selected to begin with. A link shared with Hamburg people must not
   arrive with Düsseldorf already chosen — the poster stays on its empty state
   until someone picks, and everything downstream of the choice stays locked. */
export const NO_EDITION = '';
export const DEFAULT_EDITION = NO_EDITION;

export const byId = (id) => EDITIONS.find((e) => e.id === id) || null;

/* What the picker calls an event: the city, unless two share one. */
export const pickerLabel = (e) => e.label || e.city;

/* What the poster prints large: the event's full name where there is one. */
export const posterName = (e) => e.poster || e.city;

/* Nice-cased for the picker: "8TH SEPTEMBER 2026" -> "8th September 2026". */
export const prettyDate = (e) =>
  e.date.replace(/\b(\w)(\w*)/g, (_, a, b) => a + b.toLowerCase());

/* Two audiences, one codebase.

   Which one is decided by hostname, so the same files can be published to both
   domains with nothing to configure and nothing to keep in sync. Anything that
   differs between them belongs in this table — reach for a hostname check
   anywhere else and the two will drift. */

export const VARIANTS = {
  attendee: {
    eyebrow: null,
    /* "I am invited" leads: these are application-only leadership events, and the
       invitation is the thing worth posting about. */
    headlines: ['I AM INVITED', 'I AM GOING', 'SEE YOU AT'],
    chips: ['I am invited', 'I am going', 'See you at'],
    title: 'I am going | Footprint Intelligence',
    slug: 'i-am-going',
  },
  speaker: {
    eyebrow: 'SPEAKER',
    /* Speaking stays first here — it is the whole reason this build exists. */
    headlines: ['I AM SPEAKING AT', 'I AM INVITED', 'SEE YOU AT'],
    chips: ['I am speaking at', 'I am invited', 'See you at'],
    title: 'I am speaking | Footprint Intelligence',
    slug: 'speaker',
  },
};

/* `?variant=speaker` is there so the speaker build can be checked from the
   attendee domain, and from localhost, without a second deployment. */
export function variantName() {
  const asked = new URLSearchParams(location.search).get('variant');
  if (asked && VARIANTS[asked]) return asked;
  return /^speak\./i.test(location.hostname) ? 'speaker' : 'attendee';
}

export const variant = () => VARIANTS[variantName()];

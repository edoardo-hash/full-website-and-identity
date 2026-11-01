/**
 * Design for the catalogue we have (design critique, 30 Oct 2026): with few public listings the site leads with the
 * buyer brief and off-market access, and hides what only makes sense with many listings.
 */
/** Below this many public listings: no collections, no browse-by-area, no filters on Properties. */
export const FEW_LISTINGS = 6;
/** From this many public listings the homepage gets its search form back. */
export const SEARCH_FORM_FROM = 10;

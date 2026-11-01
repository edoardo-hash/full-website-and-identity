/**
 * Sale features catalog, copied from invenio-portal src/lib/sales/features.ts (30 Oct 2026). Keep the keys in step:
 * the portal writes villa_sale_feature rows with these item keys. Yes or no only: a row = yes, no row = no.
 * The licence is never a feature (licence field) and distances are road km (src/data/road-km.json).
 */
export type FeatureGroup = "views" | "position" | "outdoor" | "indoor" | "style" | "condition" | "legal";

export const FEATURE_GROUPS: FeatureGroup[] = ["views", "position", "outdoor", "indoor", "style", "condition", "legal"];

export interface FeatureItem {
  key: string;
  group: FeatureGroup;
  details?: string[];
}

export const FEATURES: FeatureItem[] = [
  { key: "sea_view", group: "views" },
  { key: "sunset", group: "views" },
  { key: "es_vedra", group: "views" },
  { key: "formentera_view", group: "views" },
  { key: "old_town_view", group: "views" },
  { key: "country_view", group: "views" },
  { key: "front_line", group: "position" },
  { key: "direct_sea_access", group: "position" },
  { key: "walk_beach", group: "position" },
  { key: "walk_shops", group: "position" },
  { key: "gated", group: "position" },
  { key: "near_golf", group: "position" },
  { key: "pool", group: "outdoor", details: ["heated", "infinity", "saltwater", "indoor"] },
  { key: "garden", group: "outdoor" },
  { key: "lawn", group: "outdoor" },
  { key: "tennis", group: "outdoor", details: ["private", "shared"] },
  { key: "outdoor_kitchen", group: "outdoor" },
  { key: "bbq", group: "outdoor" },
  { key: "play_area", group: "outdoor" },
  { key: "yoga_deck", group: "outdoor" },
  { key: "roof_terrace", group: "outdoor" },
  { key: "fenced", group: "outdoor" },
  { key: "air_con", group: "indoor" },
  { key: "central_heating", group: "indoor" },
  { key: "underfloor_heating", group: "indoor" },
  { key: "gym", group: "indoor" },
  { key: "sauna", group: "indoor" },
  { key: "jacuzzi", group: "indoor" },
  { key: "wine_cellar", group: "indoor" },
  { key: "office", group: "indoor" },
  { key: "club_room", group: "indoor" },
  { key: "pro_kitchen", group: "indoor" },
  { key: "smart_home", group: "indoor" },
  { key: "safe_room", group: "indoor" },
  { key: "elevator", group: "indoor" },
  { key: "wheelchair", group: "indoor" },
  { key: "modern", group: "style" },
  { key: "finca", group: "style" },
  { key: "blakstad", group: "style" },
  { key: "traditional", group: "style" },
  { key: "turnkey", group: "condition" },
  { key: "to_reform", group: "condition" },
  { key: "new_build", group: "condition" },
  { key: "project", group: "condition" },
  { key: "final_de_obra", group: "legal" },
  { key: "flat_land", group: "legal" },
  { key: "own_water", group: "legal" },
  { key: "horses", group: "legal" },
  { key: "annex", group: "legal" },
  { key: "staff_quarters", group: "legal" },
  { key: "parking", group: "legal" },
  { key: "solar", group: "legal" },
  { key: "osmosis", group: "legal" },
  { key: "rental_history", group: "legal" },
];

/** A villa's features: item → detail (comma-separated keys) or null. Absent = no. */
export type FeatureSet = Map<string, string | null>;

/** Item and group labels in English; the other languages come from the translated dictionary. */
export const FEATURE_LABELS: Record<string, string> = {
  sea_view: "Sea view",
  sunset: "Sunset views",
  es_vedra: "Views of Es Vedrà",
  formentera_view: "Views to Formentera",
  old_town_view: "Views of Dalt Vila (old town)",
  country_view: "Countryside views",
  front_line: "Front line",
  direct_sea_access: "Direct sea access",
  walk_beach: "Walk to the beach",
  walk_shops: "Walk to shops",
  gated: "Gated community",
  near_golf: "Near the golf course",
  pool: "Swimming pool",
  garden: "Garden",
  lawn: "Lawn",
  tennis: "Tennis / padel court",
  outdoor_kitchen: "Outdoor kitchen",
  bbq: "BBQ area",
  play_area: "Children's play area",
  yoga_deck: "Yoga deck",
  roof_terrace: "Roof terrace",
  fenced: "Fenced",
  air_con: "Air conditioning",
  central_heating: "Central heating",
  underfloor_heating: "Underfloor heating",
  gym: "Gym",
  sauna: "Sauna / hammam",
  jacuzzi: "Jacuzzi",
  wine_cellar: "Wine cellar",
  office: "Office",
  club_room: "Club / cinema room",
  pro_kitchen: "Professional kitchen",
  smart_home: "Smart home",
  safe_room: "Safe room",
  elevator: "Lift",
  wheelchair: "Wheelchair friendly",
  modern: "Modern",
  finca: "Finca style",
  blakstad: "Blakstad",
  traditional: "Traditional Ibizan",
  turnkey: "Turnkey",
  to_reform: "To reform",
  new_build: "New build",
  project: "Project / plot with building licence",
  final_de_obra: "Final de obra / cédula",
  flat_land: "Flat usable land",
  own_water: "Well / own water",
  horses: "Horses allowed",
  annex: "Annex / guest apartment",
  staff_quarters: "Staff quarters",
  parking: "Parking / garage",
  solar: "Solar power",
  osmosis: "Osmosis water system",
  rental_history: "Proven rental history",
  // details
  d_heated: "heated",
  d_infinity: "infinity",
  d_saltwater: "saltwater",
  d_indoor: "indoor",
  d_private: "private",
  d_shared: "shared",
};

export const GROUP_LABELS: Record<FeatureGroup, string> = {
  views: "Views",
  position: "Position",
  outdoor: "Outdoor",
  indoor: "Indoor",
  style: "Style",
  condition: "Condition",
  legal: "Legal and land",
};

/** Item text with its detail, in the given labels: "Swimming pool (heated, infinity)". */
export function featureText(labels: Record<string, string>, key: string, detail: string | null): string {
  const base = labels[key] ?? FEATURE_LABELS[key] ?? key;
  const d = (detail ?? "").split(",").filter(Boolean).map((k) => labels[`d_${k}`] ?? FEATURE_LABELS[`d_${k}`] ?? k);
  return d.length ? `${base} (${d.join(", ")})` : base;
}

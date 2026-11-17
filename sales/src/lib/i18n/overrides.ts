import type { Lang } from ".";

/**
 * Hand corrections on top of DeepSeek's translations, by dictionary key ("section.key"). They win over the model
 * and need no re-translation: add a line, deploy. Keep {placeholders} as in English.
 */
export const OVERRIDES: Partial<Record<Lang, Record<string, string>>> = {
  nl: {
    // 17 Nov 2026: apartments are shown too, always named as apartments.
    "card.titleBedsApartment": "Appartement met {beds} slaapkamers in {area}",
    "card.titleApartment": "Appartement in {area}",
    "property.checkedLeadApartment": "Ons verkoopteam heeft deze gecontroleerd voordat dit appartement te koop werd aangeboden.",
    // 1 Nov 2026: the model split the emphasis in two ("*van binnen* *bekend*"); one accent, as in the other languages.
    "home.title": "Villa's te koop in Ibiza, van binnen *bekend*.",
  },
  es: {
    "card.titleBedsApartment": "Apartamento de {beds} dormitorios en {area}",
    "card.titleApartment": "Apartamento en {area}",
    "property.checkedLeadApartment": "Nuestro equipo comercial revisó estos puntos antes de que este apartamento saliera a la venta.",
    // 1 Nov 2026: one verb on both brief buttons.
    "brief.send": "Envíe su brief",
  },
  it: {
    "card.titleBedsApartment": "Appartamento con {beds} camere da letto a {area}",
    "card.titleApartment": "Appartamento a {area}",
    "property.checkedLeadApartment": "Il nostro team commerciale ha esaminato questi aspetti prima che questo appartamento fosse messo in vendita.",
    // 1 Nov 2026 (design critique): the model wrote "Invi"; one wording on both brief buttons.
    "nav.sendBrief": "Invii la Sua richiesta",
    "brief.send": "Invii la Sua richiesta",
    // 30 Oct 2026: the model wrote the plural "Vendete la vostra villa"; the site uses Lei throughout.
    "sell.title": "Venda la Sua villa con il team che la conosce già",
  },
};

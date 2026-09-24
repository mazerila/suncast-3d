# SEO and AI-search notes

The problem this site has is specific: **the app is a WebGL canvas**. Google
renders JavaScript and will see the rendered UI, but the crawlers behind AI
answer engines (GPTBot, ClaudeBot, PerplexityBot, and friends) generally do
**not** execute JavaScript — to them, `/` is a page of UI labels with no prose.
Everything below follows from that.

## The pieces

| File / place | Purpose |
|---|---|
| `public/index.html` `<head>` | Title, description, canonical, robots, Open Graph + Twitter cards, `preconnect` to the 3D hosts, JSON-LD (`WebApplication` + `Person`). |
| `public/index.html` `<noscript>` | Real prose describing the app and a link to the guide, for readers without JS/WebGL — and for crawlers that don't render. |
| `public/guide/index.html` | The **content asset**: what the readings mean, how the numbers are computed, honest accuracy limits, use cases, FAQ. `TechArticle` + `FAQPage` + `BreadcrumbList`. |
| `public/guide/{fr,es,de,it}/index.html` | The same guide in the app's other four languages — a translation, not a stub: localised title, description, FAQ questions, example cities and `og:locale`. All five point at each other with `hreflang` + `x-default`, and each has a language row in its footer. |
| `public/guide/guide.css` | Shared stylesheet for the five guide pages (one copy, not five). |
| `public/llms.txt` | Plain-language summary for AI assistants: what the app does, its distinctive output, its limits, deep-link parameters, page list. |
| `public/robots.txt` | Allows everything, names the AI crawlers explicitly, points to the sitemap. |
| `public/sitemap.xml` | `/`, `/guide/`, `/guide/fr/` with `xhtml:link` alternates. |
| `public/img/og-card.png` | 1200×630 social card (source: `scripts/og-card.html`, rendered in a browser and saved). |
| `firebase.json` | `X-Robots-Tag: noindex, nofollow` on `/embed` and `/embed/**`; cache headers for the new file types. |

## Decisions worth remembering

- **The embed is noindexed by header, not disallowed in robots.txt.** A URL
  blocked by robots.txt can never be read, so a `Disallow` would *keep* an
  already-indexed page in the index. Crawling is allowed; the header removes it.
- **Canonical is always `https://suncast.web.app/`** for the app. Deep links
  (`?lat=…&lng=…&date=…`) are states of one page, not separate documents;
  without this they would be an infinite duplicate-URL space.
- **No `hreflang` on the app page.** The five languages share one URL and are
  switched client-side, so there is nothing distinct for a search engine to
  index per language. The *guide* is where language-specific URLs exist
  (`/guide/`, `/guide/fr/`, `/guide/es/`, `/guide/de/`, `/guide/it/`), and each
  carries the full set of `hreflang` links plus `x-default` → `/guide/`.
- **Guides are translated, not machine-swapped.** The FAQ questions in each
  language are the questions people actually type in that language
  ("nimmt mir das Nachbarhaus im Winter die Sonne?"), not word-for-word
  renderings of the English ones — that is the whole point of having the page
  in that language. The example cities are local too.
- **The runtime title must match the static one.** `document.title` is set from
  `i18n.js` (`docTitle`) on load and on every language switch; if that string
  drifts from the `<title>` in the HTML, the rendered title Google indexes is
  the i18n one. Change both together.
- **No invented structured data.** No `aggregateRating`, no review counts, no
  fake organisation. Schema.org markup states only what is true: a free web
  application, its features, its author, its licence.
- **Accuracy limits are stated, not hidden.** OpenStreetMap heights are
  defaults, vegetation is absent. Saying so is what makes the guide worth
  citing — and an answer engine that quotes the caveat is doing the site a
  favour, not a disservice.

## Adding a language to the guide

The five current languages match the app's interface languages. For a sixth:

1. Copy `public/guide/index.html` to `public/guide/<lang>/index.html`, translate
   the prose, the `<title>`, the description and the JSON-LD `FAQPage` answers
   (the questions are what people type into a search box — write the questions
   people actually ask in that language, don't transliterate), and swap the
   example cities for local ones.
2. Set `lang="<lang>"`, `og:locale`, the canonical to the new URL, and add the
   new `hreflang` line to **every** guide page (they must all point at each
   other, plus `x-default` → `/guide/`). Add it to each footer language row.
3. Add the URL to `public/sitemap.xml` with the same `xhtml:link` block.
4. Add the language to `public/i18n.js` and `public/llms.txt`. The app's
   `#guide-link` needs no change: `applyLang()` derives the path from `LANG`
   (`/guide/` for English, `/guide/<lang>/` otherwise).

## Checks after a change

```bash
npx --yes http-server public -p 3010   # or: PORT=3010 npm start
curl -s localhost:3010/robots.txt | head
curl -s localhost:3010/sitemap.xml | python3 -c 'import sys,xml.dom.minidom; xml.dom.minidom.parse(sys.stdin); print("valid")'
```

- JSON-LD: paste a page into <https://validator.schema.org/>.
- Social cards: <https://opengraph.dev/> (the image must be an absolute URL —
  relative paths break in every scraper).
- After deploying, submit `https://suncast.web.app/sitemap.xml` once in Google
  Search Console and Bing Webmaster Tools; both also verify by DNS or by an
  HTML file dropped in `public/`.

## What would move the needle next

1. **Backlinks beat everything else here.** A single link from an estate-agency
   site that embeds the viewer, or from an OpenStreetMap/Cesium community page,
   is worth more than any on-page tweak.
2. **More guide pages, one question each** ("how many hours of sun does a
   north-facing garden get?", "how to read a sun path diagram"), each answering
   the question in its first paragraph — that first paragraph is what an answer
   engine quotes.
3. **City/landmark pages** generated from a list (`/sun/paris/`, `/sun/lyon/`)
   would capture long-tail searches, but only if each page says something
   specific about that place. Thin templated pages would hurt.
4. **Core Web Vitals**: CesiumJS is ~4 MB from a CDN. The guide pages are
   static and fast; the app page will never be. Keep the `preconnect` hints and
   avoid adding more third-party scripts to `/`.

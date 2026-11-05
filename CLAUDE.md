# Tide

Kuukautisten ja hyvinvoinnin seurantasovellus (PWA). Pääkäyttäjä: iPhone, Safari → Lisää Koti-valikkoon.
Käyttöliittymä on suomeksi; koodi, kommentit ja commit-viestit englanniksi.

## Ehdottomat periaatteet

- **Data vain laitteella.** IndexedDB (Dexie). Ei backendiä, ei pilveä, ei analytiikkaa, ei ulkoisia
  pyyntöjä ajon aikana (ei CDN-fontteja tms.). Sovelluksen pitää toimia täysin offline.
- Ennuste ja hedelmällisyysikkuna ovat arvioita. Niitä ei saa esittää ehkäisyyn sopivina.

## Komennot (pnpm)

```bash
pnpm dev          # kehityspalvelin
pnpm test         # Vitest
pnpm lint         # ESLint
pnpm exec tsc     # tyyppitarkistus (noEmit)
pnpm build        # tsc + vite build (PWA)
pnpm icons        # generoi ikonit public/logo.svg:stä
pnpm contrast     # tarkistaa tokens.css:n väriparien WCAG-kontrastin (vaalea + tumma)
```

**Ennen kuin ilmoitat vaiheen tai muutoksen valmiiksi: `pnpm lint && pnpm exec tsc && pnpm test` ja kaikki läpi.
Jos muutit värejä: myös `pnpm contrast`.**

## Rakenne

- `src/domain/` – puhdas logiikka (syklit, ennuste, jaksot, kalenterimerkinnät). Ei Reactia eikä Dexietä.
  Kaikelle tänne tulevalle logiikalle kirjoitetaan Vitest-testit (`*.test.ts` samaan kansioon).
- `src/db/` – Dexie-skeema (`db.ts`), tallennusrajapinta (`persistence.ts`), varmuuskopio (`backup.ts`).
- `src/store/` – sovelluksen tila: koko data muistissa, muutokset kirjoitetaan läpi `Persistence`-rajapinnalle.
  Komponentit lukevat tilaa `useTide(selector)`-hookilla ja muuttavat sitä vain storen metodeilla.
- `src/features/<näkymä>/` – näkymät ja niiden CSS.
- `src/components/` – yleiskäyttöiset komponentit (Sheet, Scale, Segmented, TabBar, ikonit).
- `src/i18n/` – **kaikki** käyttöliittymätekstit. Komponentit hakevat tekstit `const { t, f } = useI18n()`
  (`t` = tekstit, `f` = päivämäärämuodot). Ei kovakoodattuja merkkijonoja komponentteihin.
  Uusi kieli = uusi tiedosto tyyppiä `Messages` + rivi `LOCALES`-olioon (`i18n/index.ts`).
- `src/brand.ts` – tuotenimi ja teemavärit. Mahdollinen nimenvaihto: `brand.ts`, taivutusmuodot `i18n/fi.ts`:n alussa,
  `public/logo.svg` (+ `pnpm icons`), `index.html`, `vite.config.ts`:n manifest.

## Datamalli ja skeemamuutokset

- Päivämäärät ovat merkkijonoja `yyyy-MM-dd` (`ISODate`), ei `Date`-olioita tallennettuna. Käytä `domain/dates.ts`-apureita.
- `DayEntry` = yksi rivi per päivä. Uudet seurattavat (vaihe 3) tallennetaan `metrics`-kenttään tracker-id:llä.
  Se ei ole indeksoitu, joten uusi seurattava **ei vaadi** skeemamuutosta.
- Skeemamuutos (uusi taulu tai indeksi): lisää uusi `this.version(n)` tiedostoon `db/db.ts`. Vanhoja versioita ei muokata.
  Jos varmuuskopion muoto muuttuu, nosta `BACKUP_VERSION` ja pidä vanhojen tiedostojen tuonti toimivana.

## Design (tavoitteena julkaisukelpoinen laatu)

Tyyli: hillitty premium. Otsikot Fraunces (soft, luokka `.display`), leipäteksti Inter. Fontit ovat
itse hostattuja (`styles/fonts.css`, vain latin-subset), ei CDN:ää.

- Värit, välistykset (`--space-*`), pyöristykset, typografia ja liike (`--ease-*`, `--dur-*`) vain `styles/tokens.css`:stä.
- Kaikki animaatiot kunnioittavat `prefers-reduced-motion`-asetusta (globaali sääntö `global.css`:ssä).
- Näkymien vaihdot käyttävät View Transitions -rajapintaa (`useHashRoute`). Etusivun rengas ja kalenterikortti
  jakavat nimen `cycle-hero`, jolloin rengas muuntuu kalenteriksi.
- Kaaviot: yksi sarja = yksi väri ilman legendaa, ohuet palkit, 4 px pyöristys datapäässä, arvot tekstiväreillä.
- Uudet näkymät tarkistetaan kuvakaappauksin iPhone-koossa sekä vaaleassa että tummassa teemassa.

## UI-käytännöt

- Mobiili edellä. Kosketuskohteet vähintään 44 px (`--tap`). Syöttökentät 16 px (iOS ei zoomaa).
- Värit vain `styles/tokens.css`:n CSS-muuttujista. Tarkista sekä vaalea että tumma teema.
- Huomioi iOS:n safe area (`env(safe-area-inset-*)`).
- Kirjaus on nopeaa: napautukset ja asteikot, ei pitkiä lomakkeita. Muutokset tallentuvat heti, ei erillistä Tallenna-nappia päiväkirjauksessa.

## Git

- Jokaisen vaiheen lopussa commit-viesti `Phase N completed`.
- Julkaisu: GitHub Pages (`.github/workflows/deploy.yml`), `BASE_PATH=/<repo>/`.

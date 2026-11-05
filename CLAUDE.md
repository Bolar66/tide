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

## Salaus (PIN-lukko, vaihe 2)

- Avainhierarkia (`src/crypto/keys.ts`): satunnainen 32-tavuinen pääsalaisuus → HKDF → AES-GCM-datan avain
  ja HMAC-avain rivitunnisteisiin. Pääsalaisuus tallennetaan vain lukittuna (wrapped): PIN (PBKDF2 600k),
  palautuskoodi (HKDF), passkey/Face ID (WebAuthn PRF). Vaiheen 4 tilin salasana = uusi lukko samalle salaisuudelle.
- Lukko päällä: data on `sealed`-taulussa (`EncryptedPersistence`), v1-taulut ovat tyhjiä. `meta`-taulussa
  on vain lukon asetukset ja epäonnistuneet yritykset, ei koskaan terveystietoja.
- **Älä odota WebCrypto-kutsuja Dexie-transaktion sisällä** (transaktio commitoituu kesken). Salaa ensin, kirjoita sitten.
- Pääsalaisuus on vain `session/Root.tsx`:n muistissa. Älä tallenna sitä mihinkään, äläkä lokita avaimia tai purettua dataa.
- Muutokset salaukseen vaativat testit (`src/crypto/*.test.ts`) ja selaintestin: käyttöönotto, väärä PIN,
  avaus, palautuskoodi, poisto käytöstä.

## Hyvinvointiseuranta (vaihe 3)

- Seurattavat määritellään vain `src/trackers/registry.ts`:ssä (id, tyyppi, rajat, ryhmä, oletuksena päällä).
  Tekstit `i18n`:n `trackers.items[id]`. Arvot tallentuvat `DayEntry.metrics[id]`, joka **ei vaadi migraatiota**.
- Tracker-id:tä ei saa koskaan vaihtaa eikä käyttää uudelleen: vanha data ja varmuuskopiot viittaavat siihen.
- Kaikki arvot kulkevat `sanitizeMetric()`-funktion läpi ennen tallennusta.
- Vaihevertailu (`domain/phaseStats.ts`) luokittelee päivät syklin todellisen pituuden mukaan. Havainnot eivät
  koskaan nosta esiin vaihetta tasapelin sattuessa.

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

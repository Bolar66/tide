import { format } from 'date-fns';
import { fi as fiLocale } from 'date-fns/locale/fi';
import { fromISO, type ISODate } from '../domain/dates';
import type { Flow } from '../domain/types';

export const locale = fiLocale;

export const days = (n: number) => `${n} ${n === 1 ? 'päivä' : 'päivää'}`;
export const inDays = (n: number) => (n === 0 ? 'tänään' : n === 1 ? 'huomenna' : `${n} päivän päästä`);

/** "torstai 5. marraskuuta" */
export const longDate = (d: ISODate) => format(fromISO(d), 'cccc d. MMMM', { locale });
/** "5.11." */
export const shortDate = (d: ISODate) => format(fromISO(d), 'd.M.');
/** "5.11.2026" */
export const fullDate = (d: ISODate) => format(fromISO(d), 'd.M.yyyy');
export const monthTitle = (d: Date) => format(d, 'LLLL yyyy', { locale });

export const flowLabels: Record<Flow, string> = { light: 'Vähän', medium: 'Normaali', heavy: 'Runsas' };

export const t = {
  tabs: { today: 'Tänään', calendar: 'Kalenteri', stats: 'Tilastot', settings: 'Asetukset' },
  common: {
    save: 'Tallenna',
    cancel: 'Peruuta',
    close: 'Sulje',
    delete: 'Poista',
    undo: 'Kumoa',
    loading: 'Ladataan…',
    loadError: 'Tietojen lataaminen epäonnistui. Sulje sovellus kokonaan ja avaa se uudelleen.',
    saveError: 'Viimeisintä muutosta ei saatu tallennettua. Tarkista, että laitteella on tilaa.',
  },
  today: {
    cycleDay: (n: number) => `Syklin ${n}. päivä`,
    periodDay: (n: number) => `Kuukautiset, ${n}. päivä`,
    started: 'Kuukautiset alkoivat tänään',
    ended: 'Kuukautiset loppuivat tänään',
    startedOther: 'Alkoivat toisena päivänä…',
    endedOther: 'Loppuivat toisena päivänä…',
    next: (when: string) => `Seuraavat kuukautiset arviolta ${when}`,
    late: (n: number) => `Kuukautiset ovat ${days(n)} myöhässä ennusteesta`,
    noHistory: 'Kirjaa kuukautisten alku, niin Tide alkaa ennustaa seuraavia.',
    forgotEnd: (n: number) => `Kuukautiset ovat jatkuneet ${days(n)}. Muistitko merkitä loppumisen?`,
    defaultsNote: 'Ennuste käyttää oletusarvoja (28 pv sykli, 5 pv kuukautiset), kunnes historiaa kertyy.',
    todayLog: 'Tämän päivän kirjaukset',
    backupReminder: (n: number | null) =>
      n === null ? 'Et ole vielä tehnyt varmuuskopiota.' : `Edellisestä varmuuskopiosta on ${days(n)}.`,
    backupAction: 'Tee varmuuskopio',
  },
  day: {
    flow: 'Vuoto',
    noFlow: 'Ei',
    symptoms: 'Oireet',
    note: 'Muistiinpano',
    notePlaceholder: 'Miltä tänään tuntui?',
    markStart: 'Kuukautiset alkoivat tänä päivänä',
    markEnd: 'Kuukautiset loppuivat tänä päivänä',
    inPeriod: 'Kuukautispäivä',
    future: 'Tulevia päiviä ei voi vielä kirjata.',
    errors: {
      'inside-existing': 'Tämä päivä on jo merkitty kuukautispäiväksi.',
      'open-period-exists': 'Edelliset kuukautiset on vielä merkitty käynnissä oleviksi. Merkitse ensin niiden loppupäivä.',
      'no-period': 'Ennen tätä päivää ei ole alkaneita kuukautisia.',
      'before-start': 'Loppupäivä ei voi olla ennen alkupäivää.',
      'overlaps-next': 'Päivä menee seuraavien kuukautisten päälle.',
    } as Record<string, string>,
  },
  symptoms: {
    cramps: { label: 'Kivut', low: 'lievä', high: 'voimakas' },
    headache: { label: 'Päänsärky', low: 'lievä', high: 'voimakas' },
    mood: { label: 'Mieliala', low: 'huono', high: 'hyvä' },
    energy: { label: 'Energia', low: 'matala', high: 'korkea' },
  },
  calendar: {
    prev: 'Edellinen kuukausi',
    next: 'Seuraava kuukausi',
    today: 'Tänään',
    weekdays: ['ma', 'ti', 'ke', 'to', 'pe', 'la', 'su'],
    legendPeriod: 'Kuukautiset',
    legendPredicted: 'Ennuste',
    legendLogged: 'Kirjauksia',
  },
  stats: {
    title: 'Tilastot',
    avgCycle: 'Syklin keskipituus',
    avgPeriod: 'Kuukautisten kesto',
    variation: 'Vaihtelu',
    cycles: 'Kirjattuja syklejä',
    range: (min: number, max: number) => `${min}–${max} pv`,
    sd: (sd: number) => `± ${sd.toFixed(1).replace('.', ',')} pv`,
    defaults: 'Oletusarvo, kunnes kirjattuna on vähintään yksi kokonainen sykli.',
    basis: (n: number) => `Laskettu ${n} viimeisimmästä syklistä.`,
    history: 'Historia',
    empty: 'Ei vielä kirjattuja kuukautisia.',
    ongoing: 'käynnissä',
    cycleLength: (n: number) => `sykli ${n} pv`,
    outlier: 'ei mukana keskiarvossa',
    addPast: 'Lisää aiemmat kuukautiset',
    editTitle: 'Muokkaa kuukautisia',
    addTitle: 'Lisää kuukautiset',
    start: 'Alkupäivä',
    end: 'Loppupäivä',
    noEnd: 'Jatkuvat yhä',
    confirmDelete: 'Poistetaanko nämä kuukautiset? Päiväkohtaiset kirjaukset säilyvät.',
    errors: {
      'end-before-start': 'Loppupäivä ei voi olla ennen alkupäivää.',
      overlap: 'Päivät menevät päällekkäin toisten kuukautisten kanssa.',
    } as Record<string, string>,
  },
  settings: {
    title: 'Asetukset',
    theme: 'Teema',
    themes: { system: 'Järjestelmä', light: 'Vaalea', dark: 'Tumma' },
    backup: 'Varmuuskopio',
    backupInfo:
      'Tiedot ovat vain tällä laitteella. Jos sovelluksen poistaa, tiedot häviävät, joten tee varmuuskopio säännöllisesti ja tallenna se Tiedostoihin.',
    exportWarning: 'Varmuuskopiotiedosto ei ole salattu. Säilytä se paikassa, johon vain sinulla on pääsy.',
    export: 'Vie varmuuskopio',
    import: 'Tuo varmuuskopio',
    lastBackup: (d: string) => `Edellinen varmuuskopio: ${d}`,
    neverBackedUp: 'Varmuuskopiota ei ole vielä tehty.',
    importTitle: 'Tuo varmuuskopio',
    importSummary: (p: number, d: number) => `Tiedostossa on ${p} kuukautisjaksoa ja ${d} päivän kirjaukset.`,
    importMerge: 'Yhdistä nykyisiin',
    importMergeHint: 'Uudemmat päiväkirjaukset voittavat, päällekkäisiä jaksoja ei tuoda.',
    importReplace: 'Korvaa kaikki',
    importReplaceHint: 'Nykyiset tiedot poistetaan ja korvataan tiedoston sisällöllä.',
    importDone: 'Varmuuskopio tuotu.',
    exportDone: 'Varmuuskopio tehty.',
    importErrors: {
      'not-json': 'Tiedosto ei ole kelvollinen JSON-tiedosto.',
      'not-tide': 'Tiedosto ei ole Tiden varmuuskopio.',
      'too-new': 'Varmuuskopio on tehty uudemmalla Tide-versiolla. Päivitä sovellus ensin.',
      invalid: 'Varmuuskopiossa on virheellisiä tietoja, eikä sitä voitu tuoda.',
    },
    storage: 'Tallennus',
    persisted: 'Pysyvä tallennus on käytössä.',
    notPersisted: 'Selain voi tyhjentää tiedot tilan loppuessa. Lisää Tide Koti-valikkoon ja tee varmuuskopioita.',
    privacy: 'Tide ei lähetä mitään tietoja minnekään. Ei tiliä, ei pilveä, ei analytiikkaa.',
  },
};

export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

import type { Article, LearnSection } from './types';

/**
 * Finnish learning content. General health information based on Terveyskirjasto (Duodecim),
 * THL, Väestöliitto and international guidelines (FIGO, ACOG). Should be reviewed by a health
 * professional before a public release.
 */

export const SECTIONS: Record<LearnSection, { title: string; description: string }> = {
  basics: { title: 'Perusteet', description: 'Kuukautiskierto, mikä on normaalia ja miten oireita voi helpottaa.' },
  young: { title: 'Nuorille', description: 'Ensimmäiset kuukautiset, suojat ja keho muutoksessa.' },
  partner: { title: 'Läheisille', description: 'Miten ymmärtää ja tukea läheistä kierron eri vaiheissa.' },
  deeper: { title: 'Syvemmälle', description: 'Hormonit, tutkimustieto ja tavallisimmat sairaudet.' },
};

export const SOURCE_LINKS: Record<string, string> = {
  Terveyskirjasto: 'https://www.terveyskirjasto.fi/',
  THL: 'https://thl.fi/',
  Väestöliitto: 'https://www.vaestoliitto.fi/',
  'Käypä hoito': 'https://www.kaypahoito.fi/',
  'Nuorten mielenterveystalo': 'https://www.mielenterveystalo.fi/fi/nuoret',
  Endometrioosiyhdistys: 'https://www.endometrioosiyhdistys.fi/',
};

export const ARTICLES: Article[] = [
  // ---------------------------------------------------------------- Perusteet
  {
    id: 'cycle',
    section: 'basics',
    title: 'Kuukautiskierto lyhyesti',
    summary: 'Neljä vaihetta, jotka toistuvat noin kuukauden välein.',
    minutes: 3,
    blocks: [
      {
        type: 'p',
        text: 'Kuukautiskierto lasketaan kuukautisten ensimmäisestä päivästä seuraavien kuukautisten alkuun. Aikuisilla kierto kestää tavallisesti 24–38 päivää. Kierron aikana hormonit valmistavat kehoa mahdolliseen raskauteen, ja jos raskautta ei ala, kierto alkaa alusta.',
      },
      { type: 'h', text: '1. Kuukautiset' },
      { type: 'p', text: 'Kohdun limakalvo irtoaa ja poistuu vuotona. Vuoto kestää yleensä 3–7 päivää. Hormonitasot ovat nyt matalimmillaan.' },
      { type: 'h', text: '2. Follikulaarivaihe' },
      {
        type: 'p',
        text: 'Munasarjoissa kypsyy munarakkuloita, ja estrogeenin määrä kasvaa. Kohdun limakalvo paksuuntuu. Moni tuntee olonsa energiseksi.',
      },
      { type: 'h', text: '3. Ovulaatio' },
      {
        type: 'p',
        text: 'Kypsä munasolu irtoaa munasarjasta. Ovulaatio tapahtuu yleensä noin kaksi viikkoa ennen seuraavia kuukautisia, mutta ajankohta vaihtelee kierrosta toiseen.',
      },
      { type: 'h', text: '4. Luteaalivaihe' },
      {
        type: 'p',
        text: 'Progesteroni nousee ja valmistaa kohtua. Jos raskautta ei ala, hormonit laskevat vaiheen lopussa, ja moni huomaa tällöin PMS-oireita ennen kuin kuukautiset alkavat uudelleen.',
      },
      { type: 'tip', text: 'Kirjaamalla oireita muutaman kierron ajan opit tunnistamaan oman kehosi rytmin.' },
    ],
    sources: ['Terveyskirjasto', 'Väestöliitto'],
  },
  {
    id: 'normal',
    section: 'basics',
    title: 'Mikä on normaalia?',
    summary: 'Kierron pituus, vuodon määrä ja vaihtelu: mihin kannattaa kiinnittää huomiota.',
    minutes: 3,
    blocks: [
      { type: 'p', text: 'Jokaisen kierto on yksilöllinen, ja pientä vaihtelua kierrosta toiseen on kaikilla. Tavallista on:' },
      {
        type: 'list',
        items: [
          'kierron pituus 24–38 päivää (nuorilla ensimmäisinä vuosina 21–45 päivää)',
          'vaihtelu oman kierron pituudessa korkeintaan noin viikon verran',
          'vuoto kestää enintään 8 päivää',
          'vuodossa voi olla pieniä hyytymiä, ja sen väri vaihtelee kirkkaan punaisesta ruskeaan',
        ],
      },
      { type: 'p', text: 'Stressi, sairastuminen, matkustaminen, painon muutokset ja runsas liikunta voivat siirtää kuukautisia.' },
      {
        type: 'care',
        text: 'Hakeudu terveydenhuoltoon, jos vuoto on niin runsasta, että joudut vaihtamaan suojan tunnin tai kahden välein useita tunteja peräkkäin, vuoto kestää yli 8 päivää, kuukautiset jäävät pois yli kolmeksi kuukaudeksi tai sinulla on vuotoa kuukautisten välillä tai yhdynnän jälkeen.',
      },
    ],
    sources: ['Terveyskirjasto', 'Käypä hoito'],
  },
  {
    id: 'pain',
    section: 'basics',
    title: 'Kuukautiskivut ja niiden helpottaminen',
    summary: 'Miksi kuukautiset sattuvat ja mikä niihin auttaa.',
    minutes: 3,
    blocks: [
      {
        type: 'p',
        text: 'Kuukautiskivut johtuvat prostaglandiineista, jotka saavat kohdun supistelemaan, jotta limakalvo poistuu. Kipua tuntuu yleensä alavatsassa ja joskus alaselässä tai reisissä. Kivut ovat tavallisesti voimakkaimmillaan ensimmäisinä päivinä.',
      },
      { type: 'h', text: 'Mikä auttaa?' },
      {
        type: 'list',
        items: [
          'Tulehduskipulääkkeet, kuten ibuprofeeni tai naprokseeni, vähentävät prostaglandiinien tuotantoa. Ne tehoavat parhaiten, kun ne ottaa heti kipujen alkaessa.',
          'Lämpö, esimerkiksi lämpötyyny tai lämmin suihku, rentouttaa kohtua.',
          'Liikunta ja venyttely voivat lievittää kipuja.',
          'Hormonaalinen ehkäisy vähentää kipuja monilla. Siitä voi kysyä terveydenhuollosta.',
        ],
      },
      { type: 'tip', text: 'Lue kipulääkkeen pakkausseloste ja noudata annostusta. Apteekista saa neuvoja.' },
      {
        type: 'care',
        text: 'Jos kivut estävät koulunkäynnin, töiden tai harrastukset eivätkä tavalliset kipulääkkeet auta, siitä kannattaa kertoa lääkärille. Kovat kivut voivat liittyä esimerkiksi endometrioosiin, ja niihin on saatavilla hoitoa.',
      },
    ],
    sources: ['Terveyskirjasto', 'Endometrioosiyhdistys'],
  },
  {
    id: 'pms',
    section: 'basics',
    title: 'PMS ja PMDD',
    summary: 'Kuukautisia edeltävät oireet ja milloin ne ovat liian voimakkaita.',
    minutes: 3,
    blocks: [
      {
        type: 'p',
        text: 'PMS eli premenstruaalinen oireyhtymä tarkoittaa oireita, jotka alkavat kierron loppupuolella ja helpottavat muutaman päivän kuluessa kuukautisten alkamisesta. Valtaosa kokee jonkinlaisia oireita, mutta niiden voimakkuus vaihtelee paljon.',
      },
      {
        type: 'list',
        items: [
          'Ärtyneisyys, mielialan vaihtelu, itkuherkkyys ja ahdistus',
          'Väsymys ja keskittymisvaikeudet',
          'Turvotus, rintojen arkuus ja päänsärky',
          'Lisääntynyt ruokahalu ja mielihalut',
        ],
      },
      {
        type: 'p',
        text: 'PMDD (premenstruaalinen dysforinen häiriö) on PMS:n vaikea muoto, jota esiintyy muutamalla prosentilla. Siinä mielialaoireet ovat niin voimakkaita, että ne haittaavat merkittävästi arkea ja ihmissuhteita.',
      },
      { type: 'tip', text: 'Oireiden kirjaaminen Tideen auttaa sinua ja lääkäriä näkemään, toistuvatko oireet samassa kohdassa kiertoa.' },
      {
        type: 'care',
        text: 'Jos oireet haittaavat elämääsi joka kuukausi, hakeudu terveydenhuoltoon. PMS:ään ja PMDD:hen on tehokkaita hoitoja. Jos sinulla on itsetuhoisia ajatuksia, hae apua heti.',
      },
    ],
    sources: ['Terveyskirjasto', 'Käypä hoito'],
  },
  {
    id: 'care',
    section: 'basics',
    title: 'Milloin hakeutua hoitoon?',
    summary: 'Merkit, joiden vuoksi kannattaa kääntyä terveydenhuollon puoleen.',
    minutes: 2,
    blocks: [
      { type: 'p', text: 'Useimmat kierron vaihtelut ovat harmittomia. Ota kuitenkin yhteyttä terveydenhuoltoon, jos:' },
      {
        type: 'list',
        items: [
          'kuukautiset jäävät tulematta yli kolmeksi kuukaudeksi (eikä kyse ole raskaudesta)',
          'kierto on toistuvasti alle 24 tai yli 38 päivää (nuorilla ensimmäisinä vuosina alle 21 tai yli 45 päivää)',
          'vuoto on hyvin runsasta tai kestää yli 8 päivää',
          'sinulla on vuotoa kuukautisten välillä tai yhdynnän jälkeen',
          'kivut ovat niin kovia, etteivät tavalliset kipulääkkeet auta',
          'mielialaoireet haittaavat elämääsi joka kuukausi',
          'ensimmäiset kuukautiset eivät ole alkaneet 16 ikävuoteen mennessä',
        ],
      },
      {
        type: 'care',
        text: 'Hakeudu päivystykseen, jos sinulla on äkillinen voimakas vatsakipu, kuumetta ja pahoinvointia tamponin käytön aikana tai runsas verenvuoto, johon liittyy huimausta.',
      },
    ],
    sources: ['Terveyskirjasto', 'THL'],
  },

  // ---------------------------------------------------------------- Nuorille
  {
    id: 'first',
    section: 'young',
    title: 'Ensimmäiset kuukautiset',
    summary: 'Milloin ne alkavat, miltä ne tuntuvat ja miten niihin voi varautua.',
    minutes: 3,
    blocks: [
      {
        type: 'p',
        text: 'Ensimmäiset kuukautiset alkavat useimmiten 10–16 vuoden iässä, keskimäärin noin 12–13-vuotiaana. Ne ovat merkki siitä, että keho kasvaa ja kehittyy. Kaikilla aikataulu on oma, eikä aikaisemmin tai myöhemmin alkaminen ole huono asia.',
      },
      {
        type: 'p',
        text: 'Ensimmäisinä vuosina kierto on usein epäsäännöllinen. Kuukautiset voivat tulla tiheästi tai jäädä välillä pois. Tämä on täysin tavallista, koska keholta kestää aikaa löytää oma rytminsä.',
      },
      { type: 'h', text: 'Näin varaudut' },
      {
        type: 'list',
        items: [
          'Pidä repussa side tai pari ja varahousut.',
          'Ensimmäinen vuoto on usein niukkaa ja väriltään ruskeaa.',
          'Jos kuukautiset yllättävät koulussa, kouluterveydenhoitajalta saa apua ja suojia.',
        ],
      },
      { type: 'tip', text: 'Kuukautisista saa puhua. Vanhemmat, kouluterveydenhoitaja ja kaverit ovat hyviä ihmisiä kysyä.' },
    ],
    sources: ['Väestöliitto', 'Terveyskirjasto'],
  },
  {
    id: 'products',
    section: 'young',
    title: 'Kuukautissuojat',
    summary: 'Siteet, tamponit, kuukupit ja kuukautisalusvaatteet: mitä eroa niillä on?',
    minutes: 3,
    blocks: [
      { type: 'p', text: 'Ei ole yhtä oikeaa suojaa. Moni käyttää eri suojia eri tilanteissa. Kokeile rauhassa, mikä tuntuu sinusta hyvältä.' },
      {
        type: 'list',
        items: [
          'Side kiinnitetään alushousuihin. Se on helppo aloittaa ja sopii myös yöksi.',
          'Tamponi asetetaan emättimeen. Sen kanssa voi uida. Vaihda tamponi 4–8 tunnin välein, äläkä pidä samaa yli 8 tuntia.',
          'Kuukuppi asetetaan emättimeen ja tyhjennetään 8–12 tunnin välein. Se on uudelleenkäytettävä.',
          'Kuukautisalusvaatteet imevät vuodon itseensä ja pestään käytön jälkeen.',
        ],
      },
      {
        type: 'tip',
        text: 'Aloita pienimmästä tamponin tai kupin koosta. Asettaminen helpottaa, kun olet rentona ja kokeilet eri asentoja.',
      },
      {
        type: 'care',
        text: 'Toksinen sokkioireyhtymä on hyvin harvinainen mutta vakava tila. Jos sinulle nousee tamponin tai kupin käytön aikana äkillisesti korkea kuume, ihottumaa tai pahoinvointia, poista suoja ja hakeudu heti hoitoon.',
      },
    ],
    sources: ['Väestöliitto', 'Terveyskirjasto'],
  },
  {
    id: 'feelings',
    section: 'young',
    title: 'Keho, tunteet ja kenelle puhua',
    summary: 'Murrosiän muutokset ovat iso juttu. Et ole niiden kanssa yksin.',
    minutes: 2,
    blocks: [
      {
        type: 'p',
        text: 'Murrosiässä keho muuttuu nopeasti, ja hormonit vaikuttavat myös tunteisiin. On tavallista, että mieliala vaihtelee, välillä ärsyttää tai itkettää ilman selvää syytä. Kierron mukana vaihtelevat tunteet eivät tarkoita, että sinussa olisi jotain vikaa.',
      },
      {
        type: 'list',
        items: [
          'Riittävä uni, säännöllinen syöminen ja liike auttavat jaksamaan.',
          'Kirjaamalla tunteita voit huomata, toistuvatko ne samassa kohdassa kiertoa.',
          'Jokaisen keho on erilainen. Vertailu muihin, myös somessa, ei kerro sinusta mitään.',
        ],
      },
      {
        type: 'tip',
        text: 'Voit puhua kouluterveydenhoitajalle, kuraattorille tai jollekulle aikuiselle, johon luotat. Myös nimettömiä chat- ja puhelinpalveluja on tarjolla.',
      },
    ],
    sources: ['Väestöliitto', 'Nuorten mielenterveystalo'],
  },

  // ---------------------------------------------------------------- Läheisille
  {
    id: 'support',
    section: 'partner',
    title: 'Näin tuet läheistäsi kierron eri vaiheissa',
    summary: 'Pienet teot oikeaan aikaan merkitsevät paljon.',
    minutes: 3,
    blocks: [
      {
        type: 'p',
        text: 'Kierto vaikuttaa kehoon ja mieleen, mutta jokainen kokee sen eri tavalla. Paras tapa tukea on kiinnostua siitä, miltä juuri hänestä tuntuu, ja kysyä sen sijaan, että olettaisi.',
      },
      { type: 'h', text: 'Kuukautisten aikana' },
      {
        type: 'list',
        items: [
          'Tarjoa lämpötyyny, teetä tai hänen lempiherkkuaan.',
          'Ota kotitöitä hoitaaksesi ja anna lupa levätä.',
          'Varmista, että kotona on kipulääkettä ja suojia.',
        ],
      },
      { type: 'h', text: 'Follikulaarivaihe ja ovulaatio' },
      { type: 'p', text: 'Monella energia nousee. Hyvä aika yhteisille suunnitelmille, liikunnalle ja menoille.' },
      { type: 'h', text: 'Luteaalivaihe ja PMS' },
      {
        type: 'list',
        items: [
          'Kärsivällisyys auttaa. Herkkyys ja väsymys ovat todellisia, eivät liioittelua.',
          'Kysy, kaipaako hän seuraa vai omaa aikaa.',
          'Vältä isojen kiistojen aloittamista väsyneenä. Asiat voi ottaa puheeksi myöhemmin.',
        ],
      },
      { type: 'tip', text: 'Jos hän jakaa kanssasi tietoja Tidestä, voit nähdä kierron vaiheen ja varautua etukäteen.' },
    ],
    sources: ['Väestöliitto'],
  },
  {
    id: 'say',
    section: 'partner',
    title: 'Mitä kannattaa sanoa ja mitä ei',
    summary: 'Sanoilla on väliä. Näin vältät tavallisimmat sudenkuopat.',
    minutes: 2,
    blocks: [
      { type: 'h', text: 'Kannattaa' },
      {
        type: 'list',
        items: [
          '”Miten voin auttaa?”',
          '”Haluatko, että teen ruoan tänään?”',
          '”Sano, jos tarvitset omaa aikaa. Ei haittaa.”',
          '”Harmi, että sattuu. Toinko lämpötyynyn?”',
        ],
      },
      { type: 'h', text: 'Kannattaa välttää' },
      {
        type: 'list',
        items: [
          '”Onks sulla menkat?” riidan tai erimielisyyden keskellä. Se vähättelee hänen tunteitaan.',
          '”Ei se nyt niin paha voi olla.” Kivun voimakkuutta ei voi arvioida ulkopuolelta.',
          'Vitsit, jotka tekevät kuukautisista noloja tai inhottavia.',
        ],
      },
      {
        type: 'tip',
        text: 'Kuukautiset ovat arkinen asia. Kun niistä voi puhua avoimesti, molempien on helpompi kertoa tarpeistaan.',
      },
    ],
    sources: ['Väestöliitto'],
  },

  // ---------------------------------------------------------------- Syvemmälle
  {
    id: 'hormones',
    section: 'deeper',
    title: 'Hormonit kierron takana',
    summary: 'FSH, LH, estrogeeni ja progesteroni: kuka tekee mitä ja milloin.',
    minutes: 4,
    blocks: [
      {
        type: 'p',
        text: 'Kuukautiskiertoa säätelee hypotalamuksen, aivolisäkkeen ja munasarjojen välinen palautejärjestelmä. Hypotalamus erittää GnRH:ta, joka saa aivolisäkkeen tuottamaan follikkelia stimuloivaa hormonia (FSH) ja luteinisoivaa hormonia (LH).',
      },
      {
        type: 'list',
        items: [
          'FSH käynnistää munarakkuloiden kypsymisen kierron alussa. Yksi rakkula kasvaa yleensä muita suuremmaksi.',
          'Estrogeeni (pääasiassa estradioli) nousee rakkulan kasvaessa ja paksuntaa kohdun limakalvoa. Korkea estrogeenitaso laukaisee LH-piikin.',
          'LH-piikki käynnistää ovulaation noin 24–36 tunnin kuluessa.',
          'Progesteroni nousee ovulaation jälkeen keltarauhasesta. Se muuttaa limakalvon raskaudelle sopivaksi ja nostaa perusruumiinlämpöä noin 0,2–0,5 °C.',
        ],
      },
      {
        type: 'p',
        text: 'Keltarauhanen toimii noin 12–14 päivää. Jos raskautta ei ala, se surkastuu, progesteroni ja estrogeeni laskevat ja limakalvo irtoaa. Siksi kierron pituuden vaihtelu johtuu useimmiten follikulaarivaiheen eikä luteaalivaiheen pituudesta.',
      },
      {
        type: 'tip',
        text: 'Tämä on myös syy siihen, miksi Tide arvioi ovulaation laskemalla taaksepäin seuraavien kuukautisten odotetusta alkamisesta.',
      },
    ],
    sources: ['Terveyskirjasto'],
  },
  {
    id: 'conditions',
    section: 'deeper',
    title: 'Endometrioosi ja PCOS',
    summary: 'Kaksi yleistä mutta usein myöhään tunnistettua sairautta.',
    minutes: 3,
    blocks: [
      { type: 'h', text: 'Endometrioosi' },
      {
        type: 'p',
        text: 'Endometrioosissa kohdun limakalvon kaltaista kudosta kasvaa kohdun ulkopuolella, esimerkiksi munasarjoissa ja vatsakalvolla. Sitä arvioidaan esiintyvän noin joka kymmenennellä hedelmällisessä iässä olevalla. Tyypillisiä oireita ovat kovat kuukautiskivut, kipu yhdynnässä ja pitkäaikainen alavatsakipu. Diagnoosi viivästyy usein vuosia.',
      },
      { type: 'h', text: 'PCOS (monirakkulainen munasarjaoireyhtymä)' },
      {
        type: 'p',
        text: 'PCOS on yksi yleisimmistä hormonaalisista häiriöistä, ja sitä esiintyy noin 10 prosentilla. Tyypillisiä piirteitä ovat epäsäännölliset tai harvat kuukautiset, mieshormonien vaikutukset, kuten akne ja lisääntynyt karvoitus, sekä munasarjojen monirakkulainen rakenne ultraäänessä.',
      },
      {
        type: 'care',
        text: 'Molempia voidaan hoitaa. Jos tunnistat itsessäsi oireita, kirjaa ne ylös ja ota ne puheeksi lääkärin kanssa. Kierto- ja oiremerkinnät helpottavat arviota.',
      },
    ],
    sources: ['Käypä hoito', 'Endometrioosiyhdistys', 'Terveyskirjasto'],
  },
  {
    id: 'contraception',
    section: 'deeper',
    title: 'Miksi ennuste ei sovellu ehkäisyyn',
    summary: 'Kalenteriin perustuvat arviot ja niiden rajoitukset.',
    minutes: 2,
    blocks: [
      {
        type: 'p',
        text: 'Tide arvioi ovulaation ja hedelmällisen ikkunan aiempien kiertojesi keskiarvon perusteella. Ovulaation ajankohta voi kuitenkin vaihdella kierrosta toiseen usealla päivällä, eikä sovellus pysty havaitsemaan sitä suoraan.',
      },
      {
        type: 'p',
        text: 'Siittiöt voivat elää elimistössä jopa viisi päivää, joten raskaus on mahdollinen myös arvioidun ikkunan ulkopuolella. Pelkkiin kalenterilaskelmiin perustuvien menetelmien luotettavuus tavallisessa käytössä on selvästi heikompi kuin esimerkiksi kondomin, ehkäisypillereiden tai kierukan.',
      },
      {
        type: 'care',
        text: 'Jos haluat ehkäistä raskautta, valitse luotettava ehkäisymenetelmä yhdessä terveydenhuollon ammattilaisen kanssa. Ehkäisyneuvontaa saa oman hyvinvointialueesi ehkäisyneuvolasta.',
      },
    ],
    sources: ['THL', 'Väestöliitto', 'Käypä hoito'],
  },
];

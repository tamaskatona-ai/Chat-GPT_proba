# Végvár

Magyar nyelvű, saját bázisépítős stratégiai böngészőjáték-prototípus. Nincs telepítendő külső függőség; Node.js 22+ szükséges.

```sh
npm start
```

A szerver alapértelmezett portja 3000, a `PORT` változóval módosítható. Ellenőrzés: `npm test`. A forrás módosítása után az önálló játékfájl újraépítése: `npm run build`.

## Kipróbálás telepítés nélkül

A GitHubon válaszd a **Code → Download ZIP** lehetőséget, majd csomagold ki a letöltött fájlt. Nyisd meg a `vegvar.html` fájlt Chrome-ban vagy Edge-ben: az egyetlen fájl tartalmazza a teljes játékot, Node.js nélkül is használható. Az `index.html` fájl is megnyitható, ha a mellette lévő CSS- és JavaScript-fájlok ugyanabban a mappában maradnak.

## Többjátékos mód: egymás megtámadása

A **Közös játékszoba** panelen legfeljebb nyolcan játszhattok egymás ellen. Név, szoba és meghívólink, szerveren mentett bázisok, 15 másodperces portyák, automatikus védekezés, veszteségek, valós zsákmányátadás és mindkét játékosnak csatajelentés tartozik hozzá. Az egyjátékos mentés külön megmarad.

**A GitHub Pages önmagában nem futtat közös szervert.** Az internetes többjátékos módhoz a követett Cloudflare Worker + SQLite konfigurációt kell egyszer közzétenni saját fiókból; az ingyenes keretre készült. Helyben a `npm start` már a közös Node-szervert indítja. [Beállítás, meghívás és csataszabályok](MULTIPLAYER.md).

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/tamaskatona-ai/Chat-GPT_proba)

## Telepítés iPhone-ra

A játék **kezdőképernyőre telepíthető webalkalmazás (PWA)**: saját Végvár ikonnal, Safari-címsor nélküli alkalmazásablakkal, érintésvezérléssel és offline indulással. Nem kell hozzá App Store, Xcode vagy fizetős fejlesztői fiók. Az első megnyitáshoz HTTPS-webcím és internet szükséges.

1. Safariban nyisd meg a közzétett játékot: `https://tamaskatona-ai.github.io/Chat-GPT_proba/`.
2. Koppints a **Megosztás → Főképernyőhöz adás → Hozzáadás** lehetőségre. Újabb iOS-en a **Megnyitás webalkalmazásként** kapcsoló legyen bekapcsolva. A játék **Telepítés telefonra** gombja ugyanezeket a lépéseket mutatja.
3. Indítsd el a Végvár ikonnal, és internet mellett várd meg az **Offline játék kész** jelzést. Ezután hálózat nélkül is elindul a teljes játék és a 3D térkép.

A telepítést az iPhone tulajdonosának kell elvégeznie; egy weboldal nem adhatja hozzá magát automatikusan a főképernyőhöz. A mentés helyben marad. A Safari és a telepített alkalmazás külön tárhelyet használhat, ezért telepítés után az ikonról érdemes játszani. Az iOS tárhelyfelszabadítása vagy a webhelyadatok törlése az offline fájlokat és a helyi mentést is eltávolíthatja.

### GitHub Pages közzététel

A fenti webcím csak bekapcsolt Pages mellett él. A repository **Settings → Pages** oldalán válaszd a **Deploy from a branch**, **main**, **/ (root)** beállításokat, majd **Save**. A követett `.nojekyll`, manifest, ikonok és service worker közvetlenül kiszolgálhatók ebből a mappából; nincs külön telepítési függőség. A publikálás néhány percet vehet igénybe. A repository vagy a GitHub-előfizetés Pages-jogosultsága szükséges. A fájlok GitHubra feltöltése önmagában nem kapcsolja be a Pages szolgáltatást.

### Offline mód és frissítések

A `sw.js` egy teljes kiadást gyorsítótáraz, a repository alkönyvtárában is. Minden szükséges fájlnak sikeresen le kell töltődnie, mielőtt az új kiadás települ. A `npm run build` a fájlok tartalmából számolja a kiadás azonosítóját, ezért a játék módosításai után ezt is futtatni kell. A játék **Frissítés és újraindítás** gombot mutat, amikor egy új kiadás teljesen letöltődött; megnyomása menti a haladást és újraindítja az alkalmazást. Az offline fájlok frissítése nem törli a helyi játékmentést.

Helyi fejlesztéshez a `localhost` is támogatott. Egy telefonról elért sima `http://` LAN-cím nem elég az offline telepítéshez: ahhoz HTTPS szükséges. A letöltött `vegvar.html` továbbra is használható önálló fájlként, de az iPhone-os telepítéshez a közzétett főoldalt kell megnyitni.

## Interaktív 3D játéktér

A térképet most valódi, WebGL-alapú 3D jelenet rajzolja. A helyben csomagolt Three.js-megjelenítőnek nincs külső CDN- vagy hálózati függősége. Az épületek külön falakat, tetőket, ablakkereteket, üveget és felszereléseket kapnak. A karaktereken nagy felbontású, arcra illesztett bőrtextúra, külön szem, írisz, pupilla, szemöldök, orr, száj és részletes kéz látható. A közeli egységek terepmintás egyenruhát, sisakot, felszerelést és tagolt, járás közben mozgó végtagokat kapnak. A távoli modelleken is megmarad az arctextúra. Ezek saját, procedurális 3D modellek és anyagfelületek, nem fotogrammetriás vagy fotórealisztikus modellek.

A városban civil NPC-k járnak az utcákon; a falakon kívül 44 zombi bolyong a romok között. A kószáló zombik nem változtatják meg önkényesen a mentett játékmenetet: a harc az expedíció indításakor zajlik. Az épületekre és az emberekre kattintva adatlap nyílik. Az épület adatlapjáról elérhető a fejlesztőkártya. A katona vagy zombi közelnézete követi a kiválasztott szereplőt.

- Bal egérgombbal húzás: a térkép mozgatása; jobb gombbal vagy Shift+húzással: forgatás és nézetdöntés.
- Görgő vagy **+ / −** gombok: nagyítás és kicsinyítés. Dupla kattintás vagy az adatlapon a **Közelnézet**: a kiválasztott objektum közeli nézete.
- **Bázis / Katonák / Zombik / Felderítők / Óriás**: közvetlen kameranézetek. A házikó gomb visszaállítja az áttekintést.
- Telefonon egy ujjal húzható a térkép, két ujjal nagyítható és mozgatható.
- Billentyűzettel: fókuszáld a térképet; nyilak: mozgatás, +/−: zoom, Home: áttekintés, Escape: kijelölés megszüntetése. A kameragombok és az épületcímkék Tab billentyűvel is elérhetők.

Közelítéskor a geometria újrarajzolódik, és a közeli karakterek részletes modellre váltanak; nem az áttekintő képernyő képpontjait nagyítjuk. **Magas** részletességben legfeljebb kétszeres képpontsűrűség, anyagfelületi domborítás és dinamikus árnyékok működnek. A **Kímélő** beállítás megőrzi a 3D-t és a közeli karaktermodelleket, de csökkenti az árnyékok és távoli díszletek költségét. Telefonon vagy szoftveres grafikus meghajtón ez az alapbeállítás. A képernyőn kívüli térkép rajzolása szünetel, a gazdaság és a küldetések közben tovább haladnak.

A 3D-hez modern, WebGL-t támogató böngésző és grafikus gyorsítás ajánlott. WebGL nélkül a játék jelzett 2D tartaléknézettel indul; a gazdaság és a küldetések továbbra is működnek. Az elérhető sebesség a gép grafikus képességeitől függ.

Az expedíció 6 másodperc kivonulásból, 4,5 másodperc csatából és 4,5 másodperc hazatérésből áll. A korábbi játékszabályok és mentések megmaradnak. Legfeljebb 24 figura jeleníti meg a sereget; a számláló mindig a tényleges létszámot mutatja. A felderítők külön ösvényen mennek a sátor nyitott bejárata elé. A sátor önállóan kijelölhető és közelről is megvizsgálható; valódi ajtónyílása, feltekert ajtólapja, fekhelye, padlója és sátorkötelei vannak.

## Aranypénz és harci morál

Minden győztes expedícióért `25 + körzetszám × 10` aranyat zsákmányolsz a zombiktól. Az első körzet 35 aranyat ad. Vereségért és várakozásért nem jár arany; induláskor 0 aranyad van.

A **Harci morál** panelen aranyért növelheted a katonák erejét. Öt szint van, mindegyik +10 százalékpont katonai harci erőt ad, legfeljebb +50%-ig. A morál **10 percenként 5 százalékponttal csökken**, legalább nulláig, offline is. A buzdítás legfeljebb +10 százalékpontot ad, maximum +50%-ig; ára a jelenlegi moráltól függően 30–150 arany. A védőfal erejét a morál nem szorozza meg. Expedíció közben a morál nem módosítható.

Ha fejlesztéshez vagy kiképzéshez kevés a nyersanyag, külön aranygomb jelenik meg. A játék összeadja a hiányzó egész nyersanyagegységeket; minden megkezdett 10 egység kiváltása 1 arany. A meglévő nyersanyagokat is felhasználja, az arany csak a hiányt pótolja. Vásárlás előtt egy ablak mutatja a hiányt és a legnagyobb levonható aranyösszeget. Megerősítés nélkül nem költ aranyat. A parancsnokság szintkorlátját és a bevetés alatti tiltásokat arannyal sem lehet megkerülni.

A korábbi mentéseket a játék megőrzi: 0 arannyal és 0. morálszinttel egészülnek ki. Az új mezők a szokásos helyi mentés részei. Az arany kizárólag játékon belül szerzett virtuális pénz.

## Felderítők és átmeneti termelési bónuszok

A térkép alatti **Felderítőcsapat** panelről 3 katonát küldhetsz a városon kívüli ellátóhelyre. A kék egyenruhás csapat saját ösvényen vonul ki, kutat és hazatér. Az út oda 10 másodperc, a kutatás **5 teljes perc**, a visszaút 10 másodperc: a teljes felderítés 5 perc 20 másodperc. Egyszerre egy felderítőcsapat lehet kint.

A 3 katona a meglévő seregből kerül ki. Amíg távol vannak, nem vesznek részt a csatákban és nem adnak harci erőt. A többiekkel közben indíthatsz expedíciót, és új katonákat is képezhetsz. Harc közben új felderítőcsapat nem indítható, mert a szabad katonák már bevetésen vannak. A felderítés biztonságos: mind a 3 katona visszatér, harci veszteséget csak a harcoló sereg szenved.

Minden felderítés zsákmánya **9 bónuszcsomag** (3 fa-, 3 vas- és 3 élelemcsomag) és **75 arany**. Ezek csak hazatéréskor kerülnek a raktárba. A felderítés újratöltés és böngészőbezárás után is a mentett időpontok alapján fejeződik be; az eltelt időért a következő megnyitáskor jár a zsákmány, egyszer.

A csomagokat külön kell aktiválni a **Termelési bónuszok** panelen. Egy csomag **5 percre ×2 termelést** ad a saját nyersanyagához. A három nyersanyag bónusza egyszerre is működhet. Azonos csomag újraaktiválása további 5 perccel hosszabbítja az időt; a szorzó továbbra is ×2 marad. Az aktív idő a böngésző bezárása alatt is telik. A játék az időközben lejáró bónuszoknál pontosan külön számolja a gyorsított és a normál termelés idejét, a meglévő 4 órás offline termelési korláton belül.

A régi mentések új felderítés és bónuszok nélkül folytatódnak; a korábbi hadsereg, arany és épületek megmaradnak.

## A kibővített térkép és az óriások

A bejárható térkép **168 × 112** egység a korábbi 84 × 56 helyett: mindkét irányban dupla, területében négyszeres. A háttérterep is mindkét irányban megduplázódik. **44 kószáló zombi és 8 ritka óriászombi** járőrözik rajta. Kis tó náddal és tavirózsákkal, két barázdált szántó és négy ténylegesen kiemelkedő domb teszi változatossá a vidéket. A karakterek a talaj magasságát követik. A **Tó**, **Szántó** és **Dombok** kameragombokkal közvetlenül is megtekinthetők a tájak.

Az óriásokat a térképen vagy a panel legördülő listájából választhatod ki. Mindegyiknek saját életereje, sérülése, mozgása, zsákmánya és újraéledési órája van. Egy alapzombi referenciaereje 95; az óriás harci ereje és teljes életereje ennek a szorzata:

| Óriás | Alapzombi ereje | Harci erő / teljes HP |
| --- | ---: | ---: |
| Pusztító | 100 | 9500 |
| Romboló | 120 | 11400 |
| Vasmarok | 140 | 13300 |
| Dögvész | 160 | 15200 |
| Földrengető | 180 | 17100 |
| Ostromló | 200 | 19000 |
| Végítélet | 210 | 19950 |
| Világfaló | 220 | 20900 |

Ezek kifejezetten nehéz ellenfelek: a kezdő sereg csak töredéknyi sebzést okoz, erősítés és sok támadás szükséges. Minden óriás feje fölött százalékos életerősáv látható. A régi mentés első óriásának sérülési aránya és a település haladása megmarad.
Az **Óriászombi megtámadása** gomb külön, 15 másodperces expedíciót indít. A csapat egy másik útvonalon jut el hozzá. Egy támadás a sereg induláskori összesített harci erejének megfelelő sebzést ad, legfeljebb az óriás megmaradt életerejéig. A sebzés öt találatban, a csata alatt jelenik meg. Ha az óriás túléli, a sérülése **megmarad**, várakozáskor és újratöltéskor sem gyógyul vissza. Újabb csapatokkal tovább sebezheted, amíg el nem esik.

A túlélő óriás elleni támadáskor a bevetett katonák 25%-a, a végső győzelemkor 12%-a vész el, felfelé kerekítve, legalább 1 katona. A felderítők nem vesznek részt ezekben a csatákban. Egyszerre csak egy harci expedíció folyhat, a külön felderítés közben folytatódhat. Az óriás elleni harc nem lépteti előre a normál körzeteket.

A 100× erejű óriás zsákmánya: **1500 arany, 2400 fa, 1800 vas és 2000 élelem**. Az erősebb típusok zsákmánya a szorzójukkal arányosan nő; a 220× erejű óriás például **3300 aranyat** ad. A panel a kiválasztott ellenfél pontos jutalmát mutatja. A jutalom a 15 másodperces expedíció végén kerül a készletbe; egy pusztán sebesítő támadásért nem jár. A mentés az egyes találatokat és a jutalom átvételét is megőrzi, így az újratöltés nem ismétli meg a sebzést vagy a zsákmányt. A haláltól számítva **5 perc** múlva teljes életerővel újraéled, és ismét teljes zsákmányt ad. A visszaszámlálás offline is telik. Harcon kívül kószál; támadáskor a sereg az aktuális helyéhez vonul.

## Játékmenet

A fa, vas és élelem automatikusan termelődik. Az 1. szintű vasfeldolgozó alaptermelése **176 vas/perc**, minden további szint újabb 176 vas/percet ad; aktív vasbónusszal ez a termelés duplázódik. A fa alaptermelése **105,6 fa/perc** épületszintenként. Az épületkártyákon fejleszthetsz; a parancsnokság szintje korlátozza a többi épületet. A laktanyában 5 katonát képezhetsz 50 élelemért és 20 vasért. A 15 másodperces expedíciók eredménye a kijelzett harci erőtől függ. Expedíció alatt a kiképzés és fejlesztés szünetel. A védelem és a laktanya növeli az erőt. Győzelemkor zsákmány jár és megnyílik a következő körzet, vereségkor erősítve újrapróbálhatod.

A játék böngészőnként, localStorage-ba ment. Visszatéréskor legfeljebb 4 órányi nyersanyagtermelést számol el. Az „Új település” gomb megerősítés után törli a helyi haladást.

Ez egy egyjátékos prototípus, szerveroldali fiókok, többjátékos funkciók és valódi pénzes vásárlások nélkül. Az építkezés és kiképzés azonnali. Az ikonokat a rendszer emoji betűkészlete jeleníti meg.

## Külső összetevő

Three.js 0.160.1, MIT licenc. A csomag és licenc a `vendor/` mappában található; eredet és ellenőrzőösszeg: `vendor/README.md`. Az önálló HTML tartalmazza a megjelenítőt és annak licencfejlécét.

A normál expedíciók egymás után másik kószáló zombit céloznak. A térképen egy zombi kijelölésével és a **Zombi megtámadása** gombbal konkrét ellenfelet is választhatsz. A csata a célpont induláskori helyén zajlik.

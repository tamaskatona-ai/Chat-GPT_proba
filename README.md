# Végvár

Magyar nyelvű, saját bázisépítős stratégiai böngészőjáték-prototípus. Nincs telepítendő külső függőség; Node.js 18+ szükséges.

```sh
npm start
```

A szerver alapértelmezett portja 3000, a `PORT` változóval módosítható. Ellenőrzés: `npm test`.

## Kipróbálás telepítés nélkül

A GitHubon válaszd a **Code → Download ZIP** lehetőséget, majd csomagold ki a letöltött fájlt. Nyisd meg a `vegvar.html` fájlt Chrome-ban vagy Edge-ben: az egyetlen fájl tartalmazza a teljes játékot, Node.js nélkül is használható. Az `index.html` fájl is megnyitható, ha a mellette lévő CSS- és JavaScript-fájlok ugyanabban a mappában maradnak.

## Grafikus játéktér

A főképernyőn saját rajzolt, animált térkép látható a bázis épületeivel, erdővel, romokkal és egységekkel. A **Sereg indítása** gombbal indul az expedíció: a katonák kivonulnak az úton (6 másodperc), megküzdenek a zombikkal (4,5 másodperc), majd a túlélők visszatérnek (4,5 másodperc). A csata eredményét a harci erő határozza meg; az animáció ezt jeleníti meg. Legfeljebb 24 katonai figura jelképezi a teljes sereget, a címke a tényleges létszámot mutatja.

Az épületekre kattintva a hozzájuk tartozó fejlesztőkártyára jutsz. Telefonon a térkép oldalra görgethető. Az expedíció újratöltés után is ugyanott folytatódik az eltárolt befejezési idő alapján. A grafika nem igényel külső képeket, szolgáltatásokat vagy internetkapcsolatot.

## Aranypénz és harci morál

Minden győztes expedícióért `25 + körzetszám × 10` aranyat zsákmányolsz a zombiktól. Az első körzet 35 aranyat ad. Vereségért és várakozásért nem jár arany; induláskor 0 aranyad van.

A **Harci morál** panelen aranyért tartósan növelheted a katonák erejét. Öt szint van, mindegyik +10 százalékpont katonai harci erőt ad, legfeljebb +50%-ig. A szintek 30, 60, 90, 120 és 150 aranyba kerülnek. A védőfal erejét a morál nem szorozza meg. Expedíció közben a morál nem módosítható.

Ha fejlesztéshez vagy kiképzéshez kevés a nyersanyag, külön aranygomb jelenik meg. A játék összeadja a hiányzó egész nyersanyagegységeket; minden megkezdett 10 egység kiváltása 1 arany. A meglévő nyersanyagokat is felhasználja, az arany csak a hiányt pótolja. Vásárlás előtt egy ablak mutatja a hiányt és a legnagyobb levonható aranyösszeget. Megerősítés nélkül nem költ aranyat. A parancsnokság szintkorlátját és a bevetés alatti tiltásokat arannyal sem lehet megkerülni.

A korábbi mentéseket a játék megőrzi: 0 arannyal és 0. morálszinttel egészülnek ki. Az új mezők a szokásos helyi mentés részei. Az arany kizárólag játékon belül szerzett virtuális pénz.

## Felderítők és átmeneti termelési bónuszok

A térkép alatti **Felderítőcsapat** panelről 3 katonát küldhetsz a városon kívüli ellátóhelyre. A kék egyenruhás csapat saját ösvényen vonul ki, kutat és hazatér. Az út oda 10 másodperc, a kutatás **5 teljes perc**, a visszaút 10 másodperc: a teljes felderítés 5 perc 20 másodperc. Egyszerre egy felderítőcsapat lehet kint.

A 3 katona a meglévő seregből kerül ki. Amíg távol vannak, nem vesznek részt a csatákban és nem adnak harci erőt. A többiekkel közben indíthatsz expedíciót, és új katonákat is képezhetsz. Harc közben új felderítőcsapat nem indítható, mert a szabad katonák már bevetésen vannak. A felderítés biztonságos: mind a 3 katona visszatér, harci veszteséget csak a harcoló sereg szenved.

Minden felderítés zsákmánya **9 bónuszcsomag** (3 fa-, 3 vas- és 3 élelemcsomag) és **75 arany**. Ezek csak hazatéréskor kerülnek a raktárba. A felderítés újratöltés és böngészőbezárás után is a mentett időpontok alapján fejeződik be; az eltelt időért a következő megnyitáskor jár a zsákmány, egyszer.

A csomagokat külön kell aktiválni a **Termelési bónuszok** panelen. Egy csomag **5 percre ×2 termelést** ad a saját nyersanyagához. A három nyersanyag bónusza egyszerre is működhet. Azonos csomag újraaktiválása további 5 perccel hosszabbítja az időt; a szorzó továbbra is ×2 marad. Az aktív idő a böngésző bezárása alatt is telik. A játék az időközben lejáró bónuszoknál pontosan külön számolja a gyorsított és a normál termelés idejét, a meglévő 4 órás offline termelési korláton belül.

A régi mentések új felderítés és bónuszok nélkül folytatódnak; a korábbi hadsereg, arany és épületek megmaradnak.

## Játékmenet

A fa, vas és élelem automatikusan termelődik. Az 1. szintű vasfeldolgozó alaptermelése **220 vas/perc**, minden további szint újabb 220 vas/percet ad; aktív vasbónusszal ez a termelés duplázódik. Az épületkártyákon fejleszthetsz; a parancsnokság szintje korlátozza a többi épületet. A laktanyában 5 katonát képezhetsz 50 élelemért és 20 vasért. A 15 másodperces expedíciók eredménye a kijelzett harci erőtől függ. Expedíció alatt a kiképzés és fejlesztés szünetel. A védelem és a laktanya növeli az erőt. Győzelemkor zsákmány jár és megnyílik a következő körzet, vereségkor erősítve újrapróbálhatod.

A játék böngészőnként, localStorage-ba ment. Visszatéréskor legfeljebb 4 órányi nyersanyagtermelést számol el. Az „Új település” gomb megerősítés után törli a helyi haladást.

Ez egy egyjátékos prototípus, szerveroldali fiókok, többjátékos funkciók és valódi pénzes vásárlások nélkül. Az építkezés és kiképzés azonnali. Az ikonokat a rendszer emoji betűkészlete jeleníti meg.

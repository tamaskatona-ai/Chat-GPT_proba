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

## Játékmenet

A fa, fém és élelem automatikusan termelődik. Az épületkártyákon fejleszthetsz; a parancsnokság szintje korlátozza a többi épületet. A laktanyában 5 katonát képezhetsz 50 élelemért és 20 fémért. A 15 másodperces expedíciók eredménye a kijelzett harci erőtől függ. Expedíció alatt a kiképzés és fejlesztés szünetel. A védelem és a laktanya növeli az erőt. Győzelemkor zsákmány jár és megnyílik a következő körzet, vereségkor erősítve újrapróbálhatod.

A játék böngészőnként, localStorage-ba ment. Visszatéréskor legfeljebb 4 órányi nyersanyagtermelést számol el. Az „Új település” gomb megerősítés után törli a helyi haladást.

Ez egy egyjátékos prototípus, szerveroldali fiókok, többjátékos funkciók és valódi pénzes vásárlások nélkül. Az építkezés és kiképzés azonnali. Az ikonokat a rendszer emoji betűkészlete jeleníti meg.

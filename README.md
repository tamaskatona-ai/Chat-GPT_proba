# Végvár

Magyar nyelvű, saját bázisépítős stratégiai böngészőjáték-prototípus. Nincs telepítendő külső függőség; Node.js 18+ szükséges.

```sh
npm start
```

A szerver alapértelmezett portja 3000, a `PORT` változóval módosítható. Ellenőrzés: `npm test`.

## Kipróbálás telepítés nélkül

A GitHubon válaszd a **Code → Download ZIP** lehetőséget, majd csomagold ki a letöltött fájlt. Nyisd meg a `vegvar.html` fájlt Chrome-ban vagy Edge-ben: az egyetlen fájl tartalmazza a teljes játékot, Node.js nélkül is használható. Az `index.html` fájl is megnyitható, ha a mellette lévő CSS- és JavaScript-fájlok ugyanabban a mappában maradnak.

## Játékmenet

A fa, fém és élelem automatikusan termelődik. Az épületkártyákon fejleszthetsz; a parancsnokság szintje korlátozza a többi épületet. A laktanyában 5 katonát képezhetsz 50 élelemért és 20 fémért. A 15 másodperces expedíciók eredménye a kijelzett harci erőtől függ. Expedíció alatt a kiképzés és fejlesztés szünetel. A védelem és a laktanya növeli az erőt. Győzelemkor zsákmány jár és megnyílik a következő körzet, vereségkor erősítve újrapróbálhatod.

A játék böngészőnként, localStorage-ba ment. Visszatéréskor legfeljebb 4 órányi nyersanyagtermelést számol el. Az „Új település” gomb megerősítés után törli a helyi haladást.

Ez egy egyjátékos prototípus, szerveroldali fiókok, többjátékos funkciók és valódi pénzes vásárlások nélkül. Az építkezés és kiképzés azonnali. Az ikonokat a rendszer emoji betűkészlete jeleníti meg.

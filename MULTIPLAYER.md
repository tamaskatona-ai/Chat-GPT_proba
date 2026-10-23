# Barátok elleni játék

A többjátékos mód közös szerveren fut. A GitHub Pages az egyjátékos webalkalmazást tudja kiszolgálni; közös adatbázist és támadásokat nem futtat. Az alábbi Cloudflare-változat egyszerre szolgálja ki a teljes, iPhone-ra telepíthető játékot és az online világot.

## Ingyenes internetes közzététel

[**Közös világ közzététele Cloudflare-en**](https://deploy.workers.cloudflare.com/?url=https://github.com/tamaskatona-ai/Chat-GPT_proba)

1. A játékgazda lépjen be saját Cloudflare-fiókjába, és kapcsolja hozzá ezt a GitHub-tárolót. A Workers ingyenes keretét válassza. A SQLite-alapú Durable Object tárolót a követett `wrangler.jsonc` hozza létre, nem szükséges külön adatbázist létrehozni.
2. A közzététel végén kapott `https://….workers.dev` játékcímet nyissa meg minden barát. A meglévő GitHub Pages-címen is megadható ez a cím a **Játékszerver címe** mezőben.
3. Az első játékos a **Közös játékszoba** panelen adjon meg egy nevet; hagyja üresen a szobakódot, majd válassza a **Szoba létrehozása / csatlakozás** gombot.
4. Küldje el a **Meghívólink másolása** gombbal kapott linket. A barát megnyitja, megadja a saját nevét és csatlakozik. Ezután a másik játékos mellett a **Megtámadom** gombbal indítható csata.

Ha a Cloudflare nem ismeri fel automatikusan a projektet: **Workers & Pages → Create application → Import a repository**, majd válassza ki ezt a tárolót. A build parancsa `npm run build:online`, a deploy parancsa `npm run deploy`; a projekt saját Wrangler-konfigurációját használja. A kód a Workers ingyenes keretéhez készült; a szolgáltatás aktuális kvótái érvényesek. Az ingyenes keret nem jelent korlátlan kapacitást.

Parancssorból, saját Cloudflare-bejelentkezéssel:

```sh
npm ci
npm run deploy
```

A deploy parancs automatikusan elkészíti a statikus alkalmazást. Az adatbázis nem a repositoryba vagy a böngészőbe kerül: a Cloudflare tartós SQLite-tárolója őrzi meg. Éles közzétételt csak a saját fiók jogosultságával lehet elvégezni. A repositoryba sem API-kulcsot, sem játékos-visszatérési kódot nem szabad feltölteni.

## A csaták szabályai

- Szobánként legfeljebb **8 játékos**, egy szervervilágban legfeljebb 256 játékos fér el.
- Az online bázis **új, egyenlő kezdőállapotból indul**. A korábbi helyi bázis megmarad, de annak készleteit nem lehet feltölteni a közös szerverre.
- Minden online termelést, kiképzést, fejlesztést, morált, felderítést és zombi elleni csatát a szerver számol. A kliens nem küldhet be saját készletet, katonaszámot vagy időt.
- Másik játékoshoz legalább **5 szabad katona** kell. A bevetés **15 másodperc**. A felderítőket a támadó és a védő sereg létszámából is levonjuk.
- A támadó és a védő induláskori ereje dönt; döntetlennél a támadó győz. Egy résztvevő egyszerre csak egy csatában vehet részt. Védekezés közben az állomány nem változtatható parancsokkal.
- A támadó vesztesége győzelemnél 15%, vereségnél 35%. A védő vesztesége a támadó győzelménél 25%, egyébként 10%; felfelé kerekítve, legfeljebb a részt vevő sereg. A felderítők sértetlenek maradnak.
- Győzelemkor a védő pillanatnyi készleteinek **10%-a** vihető el, nyersanyagonként legfeljebb **400**, aranyból **150**. A védőtől pontosan ugyanennyi vonódik le. Vereségért nem jár zsákmány. A körzetszintet a játékos elleni harc nem növeli.
- A támadó **percenként** indíthat portyát. A védő a csata vége után **2 percig** nem támadható újra. A saját támadást ez a védelem nem tiltja.
- A védőnek nem kell nyitva tartania a játékot. A Cloudflare riasztása vagy a Node-szerver időzítője befejezi a csatát; újratöltéssel és ismételt lekéréssel nem jár kétszer zsákmány.
- Mindkét fél csatajelentést kap. Az utolsó tíz jelentés megmarad. Az online állás két másodpercenként frissül.

## Visszatérés, telefon és offline mód

A szerverhez tartozó saját visszatérési kód automatikusan elmentődik az adott böngészőben. A **Saját visszatérési kód mentése** alatt le is másolható, és egy másik készüléken a **Visszatérés meglévő online bázishoz** mezőben használható. Ez a kód birtoklói hozzáférés: csak magadnak mentsd el; a barátoknak a meghívólinket küldd. Nincs e-mailes jelszó-visszaállítás.

iPhone-on a közös játékcímet nyisd meg Safariban, majd **Megosztás → Főképernyőhöz adás**. A Safari és a telepített alkalmazás eltérő tárhelyet használhat, ezért a saját visszatérési kód legyen elmentve. Az online játékhoz internet kell. Kapcsolatvesztéskor a közös állás nem módosítható; a **Vissza az egyjátékos módba** gomb a külön helyi bázist tölti be. A service worker nem tárazza az API-válaszokat.

## Saját Node-szerver és helyi próba

```sh
npm start
```

A Node.js 22+ szerverhez nincsen külső futásidejű függőség. A `PORT` változóval állítható a port. Két külön böngészőprofil ugyanazt a szervercímet használva tesztelheti a játékot; ugyanazon a Wi-Fi-n a gép helyi IP-címét és a portot kell megnyitni, nem a másik telefon saját localhost-címét. Az internetes és iPhone-os telepítéshez HTTPS-cím ajánlott, a service workerhez szükséges is.

A Node-szerver a `data/online.json` fájlba ment, atomikus fájlcserével. A könyvtár Gitből kizárt, a fájl nem érhető el HTTP-n. A szervergépen készíts róla biztonsági másolatot. Olyan tárhelyen, ahol újraindításkor törlődik a fájlrendszer, ez a változat nem tartós: ott a Cloudflare-változatot vagy állandó lemezt használj. Több Node-folyamat nem használhatja egyszerre ugyanazt a mentésfájlt.

Másik weboldalról való csatlakozáshoz az `ALLOWED_ORIGINS` környezeti változóban, vesszővel elválasztva adhatók meg az engedélyezett origin-ek. Alapértelmezetten a saját origin és `https://tamaskatona-ai.github.io` engedélyezett. A visszatérési kulcsok Bearer fejlécben mennek, az állásválaszok `no-store` jelölést kapnak.

Cloudflare helyi tesztje:

```sh
npm ci
npm run dev:online
```

A Wrangler helyben ugyanazt a Worker + SQLite Durable Object kódot futtatja. A `npm run build:online` a `public/` generált mappába csak a kliens szükséges fájljait másolja: szerverkód és mentések nem kerülnek a statikus alkalmazásba.

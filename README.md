# LG Ring

Zvonček pre **LG webOS TV bez rootu**. Home Assistant prijme udalosť zvončeka, podľa potreby zobudí TV cez Wake-on-LAN a spustí `sk.filip.doorbell`. Aplikácia prehrá pribalený dvojtónový zvuk a voliteľne zobrazí kameru.

## Stav projektu

Pripravený klient a vzory YAML. Lokálny náhľad a automatické testy možno spustiť bez inštalovania závislostí. Nasadenie, zvuk na skutočnej TV, Wake-on-LAN a kameru treba overiť na konkrétnom modeli. Bez rootu aplikácia nepočúva udalosti vo vypnutej TV. Spustenie prepne TV na túto aplikáciu.

## 1. Najprv over Wake-on-LAN

1. V Home Assistante pridaj integráciu **LG webOS TV** a potvrď párovanie na TV.
2. Ak chýba akcia `wake_on_lan.send_magic_packet`, pridaj do existujúceho `configuration.yaml` samostatný riadok `wake_on_lan:` a reštartuj HA. Existujúcu konfiguráciu neprepisuj.
3. V **Developer Tools → Actions → YAML mode** vlož obsah `home-assistant/test-wol.yaml` a nahraď MAC adresou sieťového rozhrania TV.
4. Vypni TV ovládačom a vykonaj akciu. Over prebudenie aj po dlhšom vypnutí.

HA a TV majú byť v rovnakej sieti; pre prvý test je vhodný Ethernet. Názov nastavenia prebudenia závisí od modelu (Mobile TV On / Turn on via Wi-Fi, prípadne Wake on LAN v IP control settings). Quick Start+ sám osebe nie je dôkaz funkčného prebudenia. Ak to nefunguje, potrebujeme model, webOS verziu a spôsob pripojenia.

## 2. Náhľad na počítači

```sh
npm start
```

Otvor http://127.0.0.1:4173 a stlač **Vyskúšať zvonček**. Po 15 sekundách sa náhľad vráti na úvodnú obrazovku. Šípky presúvajú výber, Enter potvrdzuje, Escape simuluje tlačidlo Späť. V prehliadači môže automatické prehratie bez kliknutia blokovať politika autoplay.

```sh
npm test
```

## 3. Inštalácia do LG bez rootu

### Cez vlastný repozitár Homebrew Channel

Cieľ pre prvé testovanie: **LG 75QNED87A6B, webOS 25 / 10.3.1-3006**. Test na tomto modeli zatiaľ neprebehol.

Ak už máš Homebrew Channel, vytvor a spusti lokálny repozitár:

```sh
npm run repo:build
npm run repo:serve
```

Server vypíše adresu `http://IP_POCITACA:4174/repo.json`. V TV otvor **Homebrew Channel → Settings (ozubené koliesko) → Add repository**, zadaj celú adresu vrátane `/repo.json`, vráť sa do katalógu a obnov zoznam. Vyber **LG Ring – Zvonček → Install → Launch** a stlač **Vyskúšať zvonček**.

Počítač aj TV musia byť v rovnakej sieti a počítač musí počas inštalácie bežať. Adresa `localhost` na TV odkazuje na TV, preto použi IP vypísanú serverom. Ak má počítač viac rozhraní, vyber adresu siete spoločnej s TV. Ak systémový firewall blokuje spojenie, povoľ prichádzajúce spojenie pre tento server. Server zdieľa iba katalóg a `.ipk`; zastav ho cez Ctrl+C. Po inštalácii ho aplikácia nepotrebuje, ale pri obnove katalógu musí byť opäť dostupný.

Root nie je potrebný pre našu aplikáciu. Homebrew Channel bez rootu používa vývojovú inštaláciu; vlastný repozitár neodstraňuje požiadavku aktívneho Developer Mode ani jeho časové obmedzenie.

Pre trvalý repozitár možno celý obsah `dist/repository/` umiestniť na statický hosting (napr. GitHub Pages alebo vlastný server). URL musí priamo vracať `repo.json`, nie HTML stránku GitHub projektu; hosting má povoľovať CORS. Katalóg obsahuje manifest a SHA-256 balíka, ikona je vložená priamo a odkaz na `.ipk` je relatívny.

### Verejný repozitár na GitHub Pages

Workflow `.github/workflows/pages.yml` pri každom pushi do `main` spustí testy, vytvorí `.ipk` a katalóg a publikuje výlučne obsah `dist/repository/` cez Pages. V repozitári nastav **Settings → Pages → Build and deployment → Source: GitHub Actions**. Workflow možno spustiť aj ručne cez **Actions → Publish webOSBrew repository → Run workflow**.

Adresa katalógu je `https://filyyyp.github.io/lg-ring-app/repo.json` (dostupná po úspešnom deploymente). Zdrojový projekt: [filyyyp/lg-ring-app](https://github.com/filyyyp/lg-ring-app). Prvý úspešný deployment zobrazí adresu v Actions. Až potom ju pridaj do Homebrew Channel. Aktualizácie sa publikujú pushom do `main`; pre tlačidlo Update na TV zvýš verziu aplikácie. Na GitHub nepatria osobné MAC/IP adresy, kamerové tokeny ani prístupové údaje; priložené HA súbory obsahujú iba príklady.

Pri aktualizácii zvýš `version` v `app/appinfo.json`, znova spusti `npm run repo:build` a reštartuj server. Homebrew Channel ponúkne **Update**. Pri rovnakej verzii možno v detaile aplikácie stlačiť **5** pre **Reinstall**.

Formát overený podľa [načítania katalógu](https://github.com/webosbrew/webos-homebrew-channel/blob/main/frontend/views/BrowserPanel.js), [detailu a inštalácie](https://github.com/webosbrew/webos-homebrew-channel/blob/main/frontend/views/DetailsPanel.js) a [generátora manifestu](https://github.com/webosbrew/webos-homebrew-channel/blob/main/tools/gen-manifest.js).

### Priamo cez Developer Mode a CLI

Použi oficiálny [webOS CLI](https://webostv.developer.lge.com/develop/tools/cli-introduction). Na TV nainštaluj **Developer Mode** z LG Apps, prihlás sa LG Developer účtom, zapni Dev Mode a po reštarte Key Server. Podrobnosti sú v [návode LG](https://webostv.developer.lge.com/develop/getting-started/developer-mode-app).

CLI je vývojová závislosť projektu. Po stiahnutí projektu spusti `npm ci`; nasledujúce príkazy používajú jeho lokálnu inštaláciu:

```sh
npx ares-setup-device
# Pridaj zariadenie s názvom lg, IP adresou TV, portom 9922 a používateľom prisoner.
npx ares-novacom --device lg --getkey
# Zadaj passphrase z Developer Mode aplikácie.
npm run package
npx ares-install --device lg dist/sk.filip.doorbell_0.1.0_all.ipk
npx ares-launch --device lg sk.filip.doorbell
```

Pri použití CLI pre viac platforiem zvoľ profil TV podľa jeho dokumentácie. Developer Mode má obmedzenú platnosť; pred vypršaním obnov session v aplikácii. LG uvádza, že vypnutie Developer Mode odinštaluje vývojové aplikácie. Toto je vývojové nasadenie, nie trvalá inštalácia z obchodu.

Test spustenia so zazvonením (zopakuj aj keď už aplikácia beží):

```sh
npx ares-launch --device lg sk.filip.doorbell --params '{"action":"doorbell","duration":15}'
```

## 4. Prepojenie s Home Assistantom

Pri zapnutej TV spusti `home-assistant/test-ring.yaml` cez **Developer Tools → Actions**. Nahraď `media_player.lg_tv` svojou entitou.

Potom vytvor novú automatizáciu, otvor jej YAML editor a vlož `home-assistant/automation.yaml`. Nahraď:

- `binary_sensor.doorbell` – senzor zvončeka; vzor predpokladá prechod `off` → `on`. Pri event entite, MQTT alebo device triggeri uprav spúšťač podľa integrácie.
- `media_player.lg_tv` – všade rovnaká entita TV.
- `AA:BB:CC:DD:EE:FF` – MAC TV.

Automatizácia čaká najviac 30 sekúnd na aktívny stav TV a pri timeout končí. Opakované zazvonenie obnoví časovač aplikácie. Automatizácia nemení systémovú hlasitosť, mute ani zvukový výstup TV: zvuk preto nemusí byť počuť pri stíšení alebo vypnutom soundbare. Parameter `volume` ovláda iba prehrávač aplikácie.

## Parametre spustenia

| Parameter | Predvolené | Význam |
| --- | --- | --- |
| `action` | — | `doorbell` spustí zazvonenie; inak úvodná obrazovka |
| `duration` | `15` | Sekundy do zatvorenia, rozsah 5–120 |
| `volume` | `0.7` | Hlasitosť zvuku aplikácie 0–1 |
| `message` | Pozri sa, kto prišiel na návštevu. | Text pod nadpisom |
| `label` | VCHODOVÉ DVERE | Označenie vstupu |
| `camera` | — | Priama HTTP(S) adresa média |
| `cameraType` | `video` | `video` alebo `image` |

Video používa natívny prehrávač TV (napríklad kompatibilné HLS/H.264). Podpora kodekov a TLS závisí od modelu. RTSP, WebRTC a stránka HA dashboardu nie sú priamym zdrojom pre tento prehrávač. `image` zobrazí obrázok bez periodického obnovovania. Pri chybe kamery zvonček pokračuje.

TV musí mať prístup k URL bez prihlasovacej stránky a vlastných Authorization hlavičiek. Aplikácia nevytvára kamerový stream ani HA token. Do balíka nevkladaj hlavný HA token; zdroj kamery nastavíme podľa tvojej integrácie, ideálne lokálne alebo krátkodobým URL. Overenie kamery urob až po úspešnom teste zvuku.

Po časovači alebo tlačidle Späť aplikácia zavolá `window.close()`. Správanie návratu a obnovenie predchádzajúceho zdroja závisí od TV a **nie je garantované**. Automaticky nevypína TV, ktorú zobudila. Nejde o prekrytie cez Netflix/HDMI ani o prehrávanie v deep standby so zhasnutým panelom.

## Súbory a zdroje

- `app/` – samostatná HTML/CSS/JS aplikácia bez externých knižníc.
- `scripts/assets.py` – reprodukovateľné vytvorenie vlastného WAV zvuku a PNG ikony (`npm run assets`).
- `tests/` – simulované udalosti launch/relaunch, časovače a chybové stavy; nenahrádzajú test na TV.
- Vývojový `@webos-tools/cli@3.2.6` má podľa `npm audit` dve hlásenia v pribalených `js-yaml` a `qs` (1 high, 1 moderate); `npm audit fix` ich neodstránil. CLI používaj na vlastné projektové súbory. Tieto závislosti nie sú súčasťou aplikácie v TV ani lokálneho náhľadu.
- [webOS lifecycle a parametre udalostí](https://webostv.developer.lge.com/develop/guides/app-lifecycle-management)
- [appinfo.json](https://webostv.developer.lge.com/develop/references/appinfo-json)
- [LG webOS v Home Assistante](https://www.home-assistant.io/integrations/webostv/)
- [Akcia webostv.command](https://www.home-assistant.io/actions/webostv.command/)

# ErtugrulsPuzzle (PuzzleApp)

Cordova ile yazilmis, Android odakli bir yapboz oyunu. Bir yandan oynarsin, bir yandan da "Puzzle Studio" ile kendi yapboz desenini uretirsin.

Kural basit: resmi sec, parcala, karistir, sureyi yen.

```
   __  __
  / /_/ /_  _  __
 / __  / / / / / /
/_/ /_/_/ /_/ /_/
```

## Oyun Modu (Play)

- Hazir gorseller + galeriden resim yukleme
- Zorluk: 3x3, 4x4, 5x5, 6x6
- Oynanis: iki parcaya tikla, yer degistirsin
- Hamle sayaci + sure + kazaninca konfeti ve "win" sesi

## Puzzle Studio (Design)

`www/slicer.html` uzerinden calisir.

- Satir/sutun sayisi ile parcala
- Stratejiler: `standart`, `educa`, `ribbon`, `random`, `ravensburger`, `victorian`, `strip`, `flow`, `laser`
- Detayli ayarlar: knob derinligi, duz oran, egrilik, organiklik, knob genisligi
- Hazir presetler + localStorage uzerinden kaydet/geri cagir
- Cikti: tam resmi kaydet veya parcalari tek tek PNG olarak indir

## Teknoloji

- Apache Cordova
- cordova-android `14.x`
- Vanilla JavaScript, HTML, CSS
- Ses: Web Audio API (harici ses dosyasi yok)
- Test: Node test runner (`node --test`)

## Hizli Baslangic

Gereksinimler:

- Node.js 20+
- Java 17+
- Android SDK
- Cordova CLI: `npm i -g cordova`

Kurulum ve test:

```bash
npm install
npm test
```

Android'de calistirma (emulator veya cihaz):

```bash
cordova prepare android
cordova run android
```

Debug APK derleme (platform klasorunden):

```bash
cd platforms/android
./tools/gradlew assembleDebug
```

Windows PowerShell:

```powershell
cd platforms/android
.\tools\gradlew.bat assembleDebug
```

## Proje Yapisi

- `www/`: Oyunun arayuzu ve ana kod
- `www/puzzle.js`: oyun akisi (hamle, timer, kazanma kontrolu)
- `www/puzzle-logic.js`: saf mantik (test ediliyor)
- `www/slicer.js`: Puzzle Studio uretim akisi
- `platforms/android/`: Android platform kaynaklari (bu repoda bilerek takip ediliyor)
- `test/puzzle-logic.test.js`: birim testleri

## Repo Notlari

- `.tools/` git disinda (buyuk arac/artifact birikmesin diye).
- Android build/cache dosyalari `platforms/android/.gitignore` ile dislanir (`.gradle`, `*/build`, `local.properties`).
- Imza anahtarlari/keystore dosyalarini repoya koyma.

## Sorun Giderme (Kisa)

- Hazir gorsellerden ikisi internet ister (Unsplash). Offline isen galeriden resim yukle.
- `cordova` bulunamazsa: `npm i -g cordova`
- Android SDK/JDK bulunamazsa: `JAVA_HOME` ve Android SDK path ayarlarini kontrol et.

## Lisans

Apache-2.0

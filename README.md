# Restaurant-app

Zintegrowany system do obslugi restauracji laczacy kiosk samoobslugowy, panel pracownika, panel menedzera oraz ekran numerkow. Projekt przygotowany jako praca inzynierska kladzie nacisk na pelne domkniecie funkcjonalne, czytelna architekture oraz kompletna dokumentacje eksploatacyjna.

## Spis tresci
- [Cel projektu](#cel-projektu)
- [Zakres funkcjonalny](#zakres-funkcjonalny)
- [Architektura systemu](#architektura-systemu)
- [Warstwa frontend](#warstwa-frontend)
- [Warstwa backend](#warstwa-backend)
- [API referencyjne](#api-referencyjne)
- [Wymagania i konfiguracja](#wymagania-i-konfiguracja)
- [Uruchamianie w trybie deweloperskim](#uruchamianie-w-trybie-deweloperskim)
- [Tryb produkcyjny i wdrozenie](#tryb-produkcyjny-i-wdrozenie)
- [Obsluga plikow i zasobow statycznych](#obsluga-plikow-i-zasobow-statycznych)
- [Testy i jak je uruchamiac](#testy-i-jak-je-uruchamiac)
- [Kontrola jakosci i linting](#kontrola-jakosci-i-linting)
- [Struktura katalogow](#struktura-katalogow)
- [Najczestsze problemy i wskazowki](#najczestsze-problemy-i-wskazowki)
- [Dalsze kierunki rozwoju](#dalsze-kierunki-rozwoju)

## Cel projektu

Celem aplikacji jest zapewnienie restauracji jednego narzedzia do:
- przyjmowania zamowien od klientow (tryb kiosku),
- koordynacji pracy kuchni (panel pracownika),
- zarzadzania menu, raportami i analiza sprzedazy (panel menedzera),
- wyswietlania numerow zamowien dla klientow oczekujacych (publiczny ekran).

W projekcie skupiono sie na pelnym obiegu informacji: od zlozenia zamowienia przez klienta, przez prace zespolu restauracji, az po raportowanie wynikow dziennych.

## Zakres funkcjonalny

**Rola klienta**
- wybor produktow w kiosku z filtrowaniem po kategoriach,
- podsumowanie zamowienia z rozdzieleniem trybu "na miejscu" / "na wynos",
- finalizacja zamowienia i prezentacja numeru.

**Rola pracownika**
- przeglad zamowien do zrobienia,
- zmiana statusow w kolejnosci W realizacji → Gotowe → Zrealizowane,
- anulowanie zamowienia z potwierdzeniem,
- podglad pozycji w zamowieniu i szybkie wyszukiwanie.

**Rola menedzera**
- panel nawigacyjny z podsumowaniem roli,
- zarzadzanie menu (dodawanie, edycja, usuwanie, aktywacja/dezaktywacja, upload zdjec JPG),
- przeglad zamowien z rozbudowanymi filtrami (daty, godziny, status, typ),
- generowanie raportow do PDF lub CSV (zamowienia i statystyki, limit do 5000 wierszy),
- podglad raportow z mozliwoscia pobrania gotowego pliku.

**Ekran publiczny**
- odswiezanie aktywnych numerow co 5 s,
- wsparcie dla naglowka `ETag` (304 Not Modified) w celu minimalizacji ruchu,
- prezentacja zamowien w statusie W realizacji oraz Gotowe.

## Architektura systemu

System sklada sie z dwoch niezaleznych, ale scisle wspolpracujacych warstw:
- **Frontend**: aplikacja React + TypeScript budowana Vite (port domyslnie 5173 w trybie dev). Warstwa prezentacji odpowiada za routing klienta, zarzadzanie sesja JWT i interakcje z REST API.
- **Backend**: aplikacja Java 17 oparta o Spring Boot (port domyslnie 8081). Odpowiada za logike domenowa, persystencje, generowanie raportow (JasperReports) i uwierzytelnianie (JWT).

Komunikacja odbywa sie przez REST API (JSON). Autoryzacja bazuje na naglowku `Authorization: Bearer <token>`. Warstwa backendowa wymusza role przez interceptor (`AuthInterceptor`), a frontend pilnuje dostepu nawigacyjnego przez komponenty `RequireAuth` i `RequireRole`.

## Warstwa frontend

### Stos technologiczny
- React 19 (funkcyjne komponenty + hooki),
- React Router 6 (routing, ochrona tras),
- TypeScript (scisla kontrola typow, tryb `strict`),
- React-DatePicker i date-fns (filtry dat w panelu menedzera),
- Playwright (testy e2e),
- Vitest + React Testing Library (testy jednostkowe).

### Glowne widoki
- **LandingView**: ekran startowy z kafelkami prowadzasymi do poszczegolnych modulow, szybka zmiana hasla i informacje o zalogowanej roli.
- **OrderingKioskView**: tryb samoobslugowy z kategoriami, animacjami przejsc (`FadeTransition`), koszykiem i finalizacja zamowienia wysylanego POST-em na `/api/orders`.
- **OrderNumbersScreen**: atlas numerow zamowien z odswiezaniem co 5 s. Wspiera ETag, aby przy braku zmian backend zwracal 304 i nie obciazal sieci.
- **EmployeeOrdersView**: zakladki (Do zrealizowania / Zrealizowane / Anulowane), odswiezenie co 10 s, zmiana statusu i anulowanie z potwierdzeniem.
- **ManagerLayout**: wspolny layout z nawigacja boczna i przyciskiem wylogowania, odsyla do:
  - **ManagerMenuView**: CRUD na pozycjach menu, filtry w naglowkach tabeli, upload JPG (walidacja rozszerzenia i `Content-Type`), licznik aktywnych pozycji.
  - **ManagerOrdersView**: filtry dat i godzin (ReactDatePicker, pola time), auto-odswiezanie co 15 s, paginacja (PAGE_SIZE = 200) i prezentacja pozycji w zamowieniu.
  - **ManagerReportsView**: generowanie raportow pdf/csv (zamowienia i statystyki). Widok pilnuje limitu 5000 rekordow, wyswietla komunikaty bledu z backendu i pobiera pliki binarne.
- **LoginView**: formularz logowania z szybkim wypelnianiem danych testowych oraz obsluga przekierowania `?next=` i ograniczania roli (`roles=`).

### Uwierzytelnianie w przegladarce
- `AuthContext` trzyma token JWT, role i czas wygasniecia; dane sa zapisywane w `localStorage`.
- Wbudowany wrapper fetch monitoruje odpowiedzi 401/403 i w razie potrzeby automatycznie wylogowuje uzytkownika (komunikat alert + przekierowanie).
- Automatyczne wygaszanie sesji nastawia `setTimeout` na podstawie `expiresAt`.
- Hook `useRoleAccess` ulatwia blokowanie elementow UI na podstawie roli.

## Warstwa backend

### Stos technologiczny
- Spring Boot 3.5, Spring Data JPA, Hibernate.
- Baza danych: H2 w profilu dev/test, MySQL w prod.
- JWT z biblioteka `io.jsonwebtoken`.
- JasperReports 6.21 (raporty PDF) + generowanie CSV.

### Modele domenowe
- `MenuItem`: pozycja menu (id, nazwa, opis, cena, kategoria, flaga active, sciezka obrazu).
- `OrderEntity`: zamowienie (numer dzienny, data, status, typ, lista pozycji, znaczniki czasowe).
- `OrderItem`: pojedyncza pozycja zamowienia.
- `OrderStatusChange`: historia zmian statusow (wykorzystywana przy raportach).
- `DailyOrderCounter`: licznik numerow dziennych sterowany przez `OrderService`.
- `UserAccount`: uzytkownicy systemu (`manager`, `employee`) z haslem zahashowanym w BCrypt.

### Najwazniejsze uslugi
- `OrderService`: tworzenie zamowien (walidacja pozycji, nadawanie numerow ciaglych w danym dniu), zmiany statusow z kontrola kolejnosci, cache aktywnych zamowien dla ekranu publicznego (TTL 2 s), generowanie raportow PDF/CSV, sumowanie wartosci zamowien, obsluga limitow (max 5000 rekordow na raport).
- `MenuItemService`: udostepnianie publicznego menu dla kiosku.
- `AuthService` + `JwtService`: logowanie, walidacja tokenow, zmiana hasla (kontrola minimalnej dlugosci).

### Bezpieczenstwo
- `AuthInterceptor` sprawdza token w naglowku:
  - `/api/manager/**` wymaga roli `manager`,
  - `GET /api/orders` oraz modyfikacje statusow wymagaja roli `manager` lub `employee`,
  - `/api/public/**` jest otwarte (ekran numerkow),
  - inne endpointy publiczne: logowanie, tworzenie zamowienia.
- W przypadku braku uprawnien interceptor wysyla `401` lub `403`.

### Seeding danych startowych
Podczas startu aplikacji (CommandLineRunner):
- tworzone sa przykadowe pozycje menu (Burger, Wrap, Frytki),
- kreator dodaje piec zamowien z rozna historia statusow,
- zakladane sa konta `manager/manager123` oraz `employee/employee123`.

## API referencyjne

| Endpoint | Metoda | Opis | Dostep |
| --- | --- | --- | --- |
| `/api/auth/login` | POST | Logowanie, zwraca token JWT, role i timestamp wygasniecia. | publiczny |
| `/api/auth/logout` | POST | Inwalidacja sesji po stronie klienta (backend przyjmuje wywolanie). | manager/employee |
| `/api/auth/change-password` | POST | Zmiana hasla; wymaga aktualnego hasla i tokenu. | manager/employee |
| `/api/menu` | GET | Publiczne menu dla kiosku. | publiczny |
| `/api/orders` | POST | Utworzenie zamowienia z koszyka kiosku. | publiczny |
| `/api/orders` | GET | Paginowany widok zamowien dla pracownikow (filtry status, typ, todayOnly). | manager/employee |
| `/api/orders/{id}/status` | PUT | Zmiana statusu zamowienia. | manager/employee |
| `/api/orders/{id}` | DELETE | Anulowanie zamowienia. | manager/employee |
| `/api/manager/menu` | GET/POST/PUT/Delete | Zarzadzanie menu (CRUD). | manager |
| `/api/manager/menu/upload` | POST (multipart) | Upload zdjecia JPG, zwraca sciezke `/uploads/...`. | manager |
| `/api/manager/menu/{id}/toggle-active` | PATCH | Zmiana flagi aktywnosci pozycji menu. | manager |
| `/api/manager/orders` | GET | Raport zamowien z filtrami dat/czasu/statusu. | manager |
| `/api/manager/orders/report` | GET | Generowanie raportu PDF/CSV (`reportType=orders|stats`, `format=pdf|csv`). | manager |
| `/api/public/orders/active` | GET | Lista aktywnych numerow zamowien z naglowkiem `ETag`. | publiczny |

## Wymagania i konfiguracja

**Frontend**
- Node.js 20+,
- npm 9+,
- przegladarka wspierajaca ES2020.

**Backend**
- Java 17,
- Maven (skrypt `mvnw.cmd`/`mvnw` dolaczony),
- w profilu produkcyjnym wymagana baza MySQL 8.

**Zmiennie srodowiskowe**
- `APP_JWT_SECRET` – klucz HMAC do podpisu JWT (domyslnie `change-me-in-prod`, w prod nalezy nadpisac),
- `APP_JWT_TTL_HOURS` – czas zycia tokenu (domyslnie 8h),
- `APP_CORS_ALLOWED_ORIGINS` – lista originow rozdzielona przecinkami (np. `http://localhost:5173,http://twoja-domena`),
- `APP_UPLOAD_DIR` – sciezka na pliki JPG (domyslnie `uploads` w katalogu backendu),
- `SPRING_PROFILES_ACTIVE` – `dev`, `test` lub `prod` (domyslnie `prod`),
- `SPRING_DATASOURCE_*` – konfiguracja MySQL w prod,
- `VITE_API_BASE_URL` – adres backendu od strony frontendu (domyslnie `http://localhost:8081`).

## Uruchamianie w trybie deweloperskim

1. Skonfiguruj backend:
   ```powershell
   cd backend
   ./mvnw.cmd spring-boot:run
   ```
   - Profil `dev` uruchamia sie automatycznie z baza H2 in-memory.
   - Port HTTP: `http://localhost:8081`.
2. Skonfiguruj frontend:
   ```powershell
   cd ..
   npm install
   npm run dev
   ```
   - Aplikacja bedzie dostepna pod `http://localhost:5173`.
   - Jezeli backend pracuje na innym adresie, ustaw zmienna `VITE_API_BASE_URL` w `.env`.
3. Zaloguj sie uzywajac danych testowych:
   - menedzer: `manager / manager123`,
   - pracownik: `employee / employee123`.

> Alternatywnie mozna wystartowac oba serwisy poprzez `docker compose up --build` – szczegoly w sekcji [Konteneryzacja (Docker)](#konteneryzacja-docker).

## Tryb produkcyjny i wdrozenie

### Backend
- Skrypt `backend/run-prod.ps1` buduje artefakt (`mvnw.cmd -q clean package`) i uruchamia najnowszy `jar` z katalogu `target`.
- Przed startem ustaw wymagane zmienne (MySQL, `APP_JWT_SECRET`).
- W razie potrzeby uruchom `mvnw` na Linux/macOS i startuj aplikacje przez `java -jar backend/target/restaurant-backend-*.jar`.

### Frontend
- Zbuduj projekt: `npm run build` (plik wynikowy w `dist/`).
- Do serwowania statycznego mozesz wykorzystac dowolny serwer (np. Nginx). Upewnij sie, ze zapytania `fetch` trafiaja na backend (konfiguracja proxy lub environment).
- Playwright w trybie produkcyjnym korzysta z `npm run preview` (port 4173) – to rowniez mozna wykorzystac jako szybki podglad po buildzie.

### Konteneryzacja (Docker)
- Plik `docker-compose.yml` uruchamia kompletny zestaw uslug: backend (Spring Boot, profil `dev`) oraz frontend (Nginx serwujacy gotowy build Vite).
- Uruchomienie lokalne:
  ```powershell
  docker compose up --build
  ```
  - Frontend: `http://localhost:8080`
  - Backend API: `http://localhost:8081`
- Backend startuje w profilu `dev` z baza H2 zapisywana do wolumenu `backend_data`. Przy pierwszym uruchomieniu seedowane sa konta testowe oraz pozycje menu przeniesione z wersji produkcyjnej; dalsze zmiany (np. edycja menu) pozostaja zachowane po restarcie kontenerow. Jesli potrzebujesz w pelni produkcyjnego trybu, ustaw `SPRING_PROFILES_ACTIVE=prod` i podaj parametry MySQL.
- Katalog `backend/uploads` z repo jest montowany do kontenera (bind mount), dlatego obrazy produktow sa dostepne od razu i mozna je aktualizowac z poziomu hosta.
- Argument `VITE_API_BASE_URL` oraz zmienne srodowiskowe Springa (`APP_*`, `SPRING_*`) mozna modyfikowac w `docker-compose.yml`, aby dostosowac konfiguracje do srodowiska docelowego lub rejestru obrazow.

### Baza danych
- Profil `prod` wymaga istnienia bazy `restaurantdb` oraz uzytkownika z uprawnieniami DDL/DML.
- Parametr `SPRING_JPA_HIBERNATE_DDL_AUTO` domyslnie `update`. W srodowisku produkcyjnym mozna zmienic na `validate`.

## Obsluga plikow i zasobow statycznych

- Menedzer moze ladowac zdjecia produktow poprzez `/api/manager/menu/upload`. Pliki sa zapisywane w katalogu wskazanym przez `APP_UPLOAD_DIR` i udostepniane pod `/uploads/...`.
- `StaticResourceConfiguration` mapuje katalog uploadow oraz konfiguruje CORS (metody GET/POST/PUT/PATCH/DELETE/OPTIONS).
- Aplikacja frontendowa posiada statyczne grafiki w katalogu `public/img`.
- W celu resetu katalogu uploadow nalezy recznie usunac pliki z dysku (system nie kasuje plikow przy usunieciu pozycji menu).

## Testy i jak je uruchamiac

### Testy jednostkowe (frontend)
- Komenda: `npm run test`
- Srodowisko: Vitest + React Testing Library (`jsdom`).
- Pokryte obszary:
  - zachowanie `AuthContext` (login, logout, auto-logout po 401),
  - routing ochronny `RequireRole`.
- Raport pokrycia: generowany automatycznie (`coverage/`).

### Testy jednostkowe (backend)
- Komenda: `cd backend && ./mvnw.cmd test`
- Zakres: `OrderSpecificationsTest` sprawdza filtrowanie po dacie, czasie, statusie i typie. Profil `test` korzysta z H2 w trybie MySQL.

### Testy end-to-end (Playwright)
- Komenda: `npm run test:e2e`
  - Buduje frontend (`npm run build`), uruchamia serwer preview (port 4173) i odpala testy.
  - Scenariusze obejmuja logowanie menedzera, panel pracownika oraz ekran publiczny (mockowane API Playwrighta).
- Testy "na zywo" mozna wlaczyc ustawiajac zmienna `PLAYWRIGHT_LIVE=true`. Wtedy spec `tests/e2e/live-api.spec.ts` przestaje byc pomijana i laczy sie z realnym backendem (zalecany profil `test`).

## Kontrola jakosci i linting

- `npm run lint` uruchamia ESLint (konfiguracja TypeScript + React Hooks).
- TypeScript dziala w trybie `strict`, blokujac m.in. nieuzywane parametry i importy.
- Backend korzysta z konwencji Spring Boot; zadne automatyczne formatowanie nie jest uruchamiane podczas builda, ale projekt jest kompatybilny z `spring-javaformat`.

## CI/CD

- Workflow GitHub Actions znajduje sie w `.github/workflows/ci.yml`.
  - **Frontend QA**: `npm ci`, `npm run lint`, `npm run test`, `npm run build`, `npx playwright test`.
  - **Backend QA**: `./mvnw dependency:go-offline`, `./mvnw test`, `./mvnw package -DskipTests`.
- Workflow uruchamia sie dla push i pull request na galezie `main`, `master`, `develop` oraz `fix/**`, zapewniajac automatyczny feedback przed scaleniem zmian.
- Wyniki kazdego przebiegu sa widoczne w zakladce **Actions** na GitHubie, co dokumentuje historie testow i buildow na potrzeby projektu inzynierskiego.

## Struktura katalogow

| Sciezka | Opis |
| --- | --- |
| `backend/` | Aplikacja Spring Boot (kod, konfiguracja, skrypty). |
| `backend/src/main/java/pl/restaurant/restaurantbackend/` | Logika domenowa (kontrolery, serwisy, modele, bezpieczenstwo). |
| `backend/src/main/resources/` | Konfiguracje `application-*.properties`, szablony JasperReports (`orders_report.jrxml`, `orders_stats_report.jrxml`). |
| `backend/run-prod.ps1` | Skrypt uruchomieniowy dla Windows (profil prod + MySQL). |
| `src/` | Kod frontendowy React (widoki, konteksty, style). |
| `src/views/` | Widoki wysokiego poziomu (Landing, ManagerLayout, OrderingKiosk). |
| `tests/e2e/` | Scenariusze Playwright. |
| `public/` | Statyczne zasoby serwowane przez Vite (logo, grafiki). |

## Najczestsze problemy i wskazowki

- **401 przy wywolaniu API** – upewnij sie, ze `APP_JWT_SECRET` na backendzie i tokeny w przegladarce sa zgodne. Wyczysc `localStorage` (AuthContext sam to robi przy niezgodnym tokenie).
- **Problemy z uploadem zdjec** – endpoint akceptuje tylko pliki JPG z poprawnym naglowkiem MIME. Sprawdz czy `app.upload.dir` ma prawa zapisu.
- **Brak numerow na ekranie publicznym** – odpowiedzi 304 sa spodziewane. Wymus odswiezenie backendu (np. zmiana statusu) lub skasuj naglowek `If-None-Match` w debugerze, aby sprawdzic czy backend zwraca nowe dane.
- **CORS** – skonfiguruj `APP_CORS_ALLOWED_ORIGINS` na backendzie i restartuj aplikacje.
- **Bledy raportow (413/400)** – backend ogranicza zakres raportu do 31 dni oraz 5000 rekordow. Zweryfikuj filtry dat/czasu.

## Dalsze kierunki rozwoju

- Integracja z zewnetrznym systemem POS (eksport zamowien do JSON/CSV w czasie rzeczywistym).
- Dodanie modułu powiadomien (e-mail/SMS) przy zmianie statusu zamowienia.
- Rozszerzenie testow backendu o scenariusze serwisowe (OrderService, AuthService).
- Dodanie internacjonalizacji UI (obecnie etykiety sa po polsku, bez wsparcia wielojezycznosci).

# Restaurant-app

Zintegrowany system do obsługi restauracji łączący kiosk samoobsługowy, panel pracownika, panel menedżera oraz ekran numerków. Projekt przygotowany jako praca inżynierska kładzie nacisk na pełne domknięcie funkcjonalne, czytelną architekturę oraz kompletną dokumentację eksploatacyjną.

## Spis treści
- [Cel projektu](#cel-projektu)
- [Zakres funkcjonalny](#zakres-funkcjonalny)
- [Architektura systemu](#architektura-systemu)
- [Warstwa frontend](#warstwa-frontend)
- [Warstwa backend](#warstwa-backend)
- [API referencyjne](#api-referencyjne)
- [Wymagania i konfiguracja](#wymagania-i-konfiguracja)
- [Uruchamianie w trybie deweloperskim](#uruchamianie-w-trybie-deweloperskim)
- [Tryb produkcyjny i wdrożenie](#tryb-produkcyjny-i-wdrozenie)
- [Obsługa plików i zasobów statycznych](#obsługa-plików-i-zasobów-statycznych)
- [Testy i jak je uruchamiać](#testy-i-jak-je-uruchamiać)
- [Kontrola jakości i linting](#kontrola-jakości-i-linting)
- [Struktura katalogów](#struktura-katalogów)
- [Najczęstsze problemy i wskazówki](#najczęstsze-problemy-i-wskazówki)
- [Dalsze kierunki rozwoju](#dalsze-kierunki-rozwoju)

## Cel projektu

Celem aplikacji jest zapewnienie restauracji jednego narzędzia do:
- przyjmowania zamówień od klientów (tryb kiosku),
- koordynacji pracy kuchni (panel pracownika),
- zarządzania menu, raportami i analizą sprzedaży (panel menedżera),
- wyświetlania numerów zamówień dla klientów oczekujących (publiczny ekran).

W projekcie skupiono się na pełnym obiegu informacji: od złożenia zamówienia przez klienta, przez pracę zespołu restauracji, aż po raportowanie wyników dziennych.

## Zakres funkcjonalny

**Rola klienta**
- wybór produktów w kiosku z filtrowaniem po kategoriach,
- podsumowanie zamówienia z rozdzieleniem trybu "na miejscu" / "na wynos",
- finalizacja zamówienia i prezentacja numeru.

**Rola pracownika**
- przegląd zamówień do zrobienia,
- zmiana statusów w kolejności W realizacji → Gotowe → Zrealizowane,
- anulowanie zamówienia z potwierdzeniem,
- podgląd pozycji w zamówieniu i szybkie wyszukiwanie.

**Rola menedżera**
- panel nawigacyjny z podsumowaniem roli,
- zarządzanie menu (dodawanie, edycja, usuwanie, aktywacja/dezaktywacja, upload zdjęć JPG),
- przegląd zamówień z rozbudowanymi filtrami (daty, godziny, status, typ),
- generowanie raportów do PDF lub CSV (zamówienia i statystyki, limit do 5000 wierszy),
- podgląd raportów z możliwością pobrania gotowego pliku.

**Ekran publiczny**
- odświeżanie aktywnych numerów co 5 s,
- wsparcie dla nagłówka `ETag` (304 Not Modified) w celu minimalizacji ruchu,
- Klient przy odświeżaniu wysyła nagłówek If-None-Match z ostatnio otrzymanym ETag; jeśli dane się nie zmieniły, backend zwraca 304 Not Modified bez treści odpowiedzi.
- prezentacja zamówień w statusie W realizacji oraz Gotowe.

## Architektura systemu

System składa się z dwóch niezależnych, ale ściśle współpracujących warstw:
- **Frontend**: aplikacja React + TypeScript budowana Vite (port domyślnie 5173 w trybie dev). Warstwa prezentacji odpowiada za routing klienta, zarządzanie sesją JWT i interakcje z REST API.
- **Backend**: aplikacja Java 17 oparta o Spring Boot (port domyślnie 8081). Odpowiada za logikę domenową, persystencję, generowanie raportów (JasperReports) i uwierzytelnianie (JWT).

Komunikacja odbywa się przez REST API (JSON). Autoryzacja bazuje na nagłówku `Authorization: Bearer <token>`. Warstwa backendowa wymusza role przez interceptor (`AuthInterceptor`), a frontend pilnuje dostępu nawigacyjnego przez komponenty `RequireAuth` i `RequireRole`.

## Warstwa frontend

### Stos technologiczny
- React 19 (funkcyjne komponenty + hooki),
- React Router 6 (routing, ochrona tras),
- TypeScript (ścisła kontrola typów, tryb `strict`),
- React-DatePicker i date-fns (filtry dat w panelu menedżera),
- Playwright (testy e2e),
- Vitest + React Testing Library (testy jednostkowe).

### Główne widoki
- **LandingView**: ekran startowy z kafelkami prowadzącymi do poszczególnych modułów, szybka zmiana hasła i informacje o zalogowanej roli.
- **OrderingKioskView**: tryb samoobsługowy z kategoriami, animacjami przejść (`FadeTransition`), koszykiem i finalizacją zamówienia wysyłanego POST-em na `/api/orders`.
- **OrderNumbersScreen**: widok numerów zamówień z odświeżaniem co 5 s. Wspiera ETag, aby przy braku zmian backend zwracał 304 i nie obciążał sieci.
- **EmployeeOrdersView**: zakładki (Do zrealizowania / Zrealizowane / Anulowane), odświeżenie co 10 s, zmiana statusu i anulowanie z potwierdzeniem.
- **ManagerLayout**: wspólny layout z nawigacją boczną i przyciskiem wylogowania, odsyła do:
    - **ManagerMenuView**: CRUD na pozycjach menu, filtry w nagłówkach tabeli, upload JPG (walidacja rozszerzenia i `Content-Type`), licznik aktywnych pozycji.
    - **ManagerOrdersView**: filtry dat i godzin (ReactDatePicker, pola time), auto-odświeżanie co 15 s, paginacja (PAGE_SIZE = 200) i prezentacja pozycji w zamówieniu.
    - **ManagerReportsView**: generowanie raportów pdf/csv (zamówienia i statystyki). Widok pilnuje limitu 5000 rekordów, wyświetla komunikaty błędu z backendu i pobiera pliki binarne.
- **LoginView**: formularz logowania z szybkim wypełnianiem danych testowych oraz obsługą przekierowania `?next=` i ograniczania roli (`roles=`).

### Lokalizacja PL/EN
- Interfejs posiada globalny przełącznik języka (flagi PL / EN) widoczny w stopce aplikacji; wybór jest zapisywany w `localStorage`, dzięki czemu preferencja przetrwa odświeżenie i ponowne logowanie.
- Hook `useTranslate` z `LocaleContext` odpowiada za dynamiczne tłumaczenia nagłówków, komunikatów oraz etykiet we wszystkich widokach (kiosk, panel pracownika, panel menedżera, ekran numerków i logowanie) bez potrzeby przeładowania strony.
- Pozycje menu przechowują pola `nameEn` oraz `descriptionEn`. Formularz menedżera pozwala je wypełnić przy dodawaniu/edycji, a backend automatycznie wypełnia brakujące wartości (seed + skrypty z katalogu `backend/sql`). Wyświetlanie zamówień, raportów i ekranów pracowniczych korzysta z tych samych danych, więc tłumaczenie obejmuje też zamówienia historyczne.

### Uwierzytelnianie w przeglądarce
- `AuthContext` trzyma token JWT, rolę i czas wygaśnięcia; dane są zapisywane w `localStorage`.
- Wbudowany wrapper fetch monitoruje odpowiedzi 401/403 i w razie potrzeby automatycznie wylogowuje użytkownika (komunikat alert + przekierowanie).
- Automatyczne wygaszanie sesji nastawia `setTimeout` na podstawie `expiresAt`.
- Hook `useRoleAccess` ułatwia blokowanie elementów UI na podstawie roli.

## Warstwa backend

### Stos technologiczny
- Spring Boot 3.5, Spring Data JPA, Hibernate.
- Baza danych: H2 w profilu dev/test, MySQL w prod.
- JWT z biblioteką `io.jsonwebtoken`.
- JasperReports 6.21 (raporty PDF) + generowanie CSV.

### Modele domenowe
- `MenuItem`: pozycja menu (id, nazwa, opis, cena, kategoria, flaga active, ścieżka obrazu).
- `OrderEntity`: zamówienie (numer dzienny, data, status, typ, lista pozycji, znaczniki czasowe).
- `OrderItem`: pojedyncza pozycja zamówienia.
- `OrderStatusChange`: historia zmian statusów (wykorzystywana przy raportach).
- `DailyOrderCounter`: licznik numerów dziennych sterowany przez `OrderService`.
- `UserAccount`: użytkownicy systemu (`manager`, `employee`) z hasłem zahashowanym w BCrypt.

### Najważniejsze usługi
- `OrderService`: tworzenie zamówień (walidacja pozycji, nadawanie numerów ciągłych w danym dniu), zmiany statusów z kontrolą kolejności, cache aktywnych zamówień dla ekranu publicznego (TTL 2 s), generowanie raportów PDF/CSV, sumowanie wartości zamówień, obsługa limitów (max 5000 rekordów na raport).
- `MenuItemService`: udostępnianie publicznego menu dla kiosku.
- `AuthService` + `JwtService`: logowanie, walidacja tokenów, zmiana hasła (kontrola minimalnej długości).

### Bezpieczeństwo
- `AuthInterceptor` sprawdza token w nagłówku:
  - `/api/manager/**` wymaga roli `manager`,
  - `GET /api/orders` oraz modyfikacje statusów wymagają roli `manager` lub `employee`,
  - `/api/public/**` jest otwarte (ekran numerków),
  - inne endpointy publiczne: logowanie, tworzenie zamówienia.
- W przypadku braku uprawnień interceptor wysyła `401` lub `403`.

### Seeding danych startowych
Podczas startu aplikacji (CommandLineRunner):
- tworzone są przykładowe pozycje menu (Burger, Wrap, Frytki),
- kreator dodaje pięć zamówień z różną historią statusów,
- zakładane są konta `manager/manager123` oraz `employee/employee123`.

## API referencyjne

| Endpoint | Metoda | Opis | Dostęp |
| --- | --- | --- | --- |
| `/api/auth/login` | POST | Logowanie, zwraca token JWT, rolę i timestamp wygaśnięcia. | publiczny |
| `/api/auth/logout` | POST | Unieważnienie sesji użytkownika. | manager/employee |
| `/api/auth/change-password` | POST | Zmiana hasła; wymaga aktualnego hasła i tokenu. | manager/employee |
| `/api/menu` | GET | Publiczne menu dla kiosku. | publiczny |
| `/api/orders` | POST | Utworzenie zamówienia z koszyka kiosku. | publiczny |
| `/api/orders` | GET | Paginowany widok zamówień dla pracowników (filtry status, typ, todayOnly). | manager/employee |
| `/api/orders/{id}/status` | PUT | Zmiana statusu zamówienia. | manager/employee |
| `/api/orders/{id}` | DELETE | Anulowanie zamówienia. | manager/employee |
| `/api/manager/menu` | GET/POST/PUT/DELETE | Zarządzanie menu (CRUD). | manager |
| `/api/manager/menu/upload` | POST (multipart) | Upload zdjęcia JPG, zwraca ścieżkę `/uploads/...`. | manager |
| `/api/manager/menu/{id}/toggle-active` | PATCH | Zmiana flagi aktywności pozycji menu. | manager |
| `/api/manager/orders` | GET | Raport zamówień z filtrami dat/czasu/statusu. | manager |
| `/api/manager/orders/report` | GET | Generowanie raportu. Parametry: reportType = orders lub stats, format = pdf lub csv, filtry dat/czasu/statusu/typu jak w /api/manager/orders. Ograniczenia: zakres maks. 31 dni oraz limit 5000 rekordów na raport. | manager |
| `/api/public/orders/active` | GET | Lista aktywnych numerów zamówień z nagłówkiem `ETag`. | publiczny |

## Wymagania i konfiguracja

**Frontend**
- Node.js 20+,
- npm 9+,
- przeglądarka wspierająca ES2020.

**Backend**
- Java 17,
- Maven (skrypt `mvnw.cmd`/`mvnw` dołączony),
- w profilu produkcyjnym wymagana baza MySQL 8.

**Zmiennie środowiskowe**
- `APP_JWT_SECRET` - klucz HMAC do podpisu JWT (domyślnie `change-me-in-prod`, w prod należy nadpisać),
- `APP_JWT_TTL_HOURS` - czas życia tokenu (domyślnie 8h),
- `APP_CORS_ALLOWED_ORIGINS` - lista originów rozdzielona przecinkami (np. `http://localhost:5173,http://twoja-domena`),
- `APP_UPLOAD_DIR` - ścieżka na pliki JPG (domyślnie `uploads` w katalogu backendu),
- `SPRING_PROFILES_ACTIVE` - `dev`, `test` lub `prod` (domyślnie `prod`),
- `SPRING_DATASOURCE_*` - konfiguracja MySQL w prod,
- `VITE_API_BASE_URL` - adres backendu od strony frontendu (domyślnie `http://localhost:8081`).

## Uruchamianie w trybie deweloperskim

1. Skonfiguruj backend:
   ```powershell
   cd backend
   ./mvnw.cmd spring-boot:run
   ```
   - Profil `dev` uruchamia się automatycznie z bazą H2 in-memory.
   - Port HTTP: `http://localhost:8081`.
2. Skonfiguruj frontend:
   ```powershell
   cd ..
   npm install
   npm run dev
   ```
   - Aplikacja będzie dostępna pod `http://localhost:5173`.
   - Jeżeli backend pracuje na innym adresie, ustaw zmienną `VITE_API_BASE_URL` w `.env`.
3. Zaloguj się używając danych testowych:
   - menedżer: `manager / manager123`,
   - pracownik: `employee / employee123`.

> Alternatywnie można wystartować oba serwisy poprzez `docker compose up --build` - szczegóły w sekcji [Konteneryzacja (Docker)](#konteneryzacja-docker).

## Tryb produkcyjny i wdrożenie

### Backend
- Skrypt `backend/run-prod.ps1` buduje artefakt (`mvnw.cmd -q clean package`) i uruchamia najnowszy `jar` z katalogu `target`.
- Przed startem ustaw wymagane zmienne (MySQL, `APP_JWT_SECRET`).
- W razie potrzeby uruchom `mvnw` na Linux/macOS i startuj aplikację przez `java -jar backend/target/restaurant-backend-*.jar`.

### Frontend
- Zbuduj projekt: `npm run build` (plik wynikowy w `dist/`).
- Do serwowania statycznego możesz wykorzystać dowolny serwer (np. Nginx). Upewnij się, że zapytania `fetch` trafiają na backend (konfiguracja proxy lub environment).
- Playwright w trybie produkcyjnym korzysta z `npm run preview` (port 4173) - to również można wykorzystać jako szybki podgląd po buildzie.

### Konteneryzacja (Docker)
- Plik `docker-compose.yml` uruchamia kompletny zestaw usług: backend (Spring Boot, profil `dev`) oraz frontend (Nginx serwujący gotowy build Vite).
- Uruchomienie lokalne:
  ```powershell
  docker compose up --build
  ```
  - Frontend: `http://localhost:8080`
  - Backend API: `http://localhost:8081`
- Backend startuje w profilu `dev` z bazą H2 zapisywaną do wolumenu `backend_data`. Przy pierwszym uruchomieniu seedowane są konta testowe oraz pozycje menu przeniesione z wersji produkcyjnej; dalsze zmiany (np. edycja menu) pozostają zachowane po restarcie kontenerów. Jeśli potrzebujesz w pełni produkcyjnego trybu, ustaw `SPRING_PROFILES_ACTIVE=prod` i podaj parametry MySQL.
- Katalog `backend/uploads` z repo jest montowany do kontenera (bind mount), dlatego obrazy produktów są dostępne od razu i można je aktualizować z poziomu hosta.
- Argument `VITE_API_BASE_URL` oraz zmienne środowiskowe Springa (`APP_*`, `SPRING_*`) można modyfikować w `docker-compose.yml`, aby dostosować konfigurację do środowiska docelowego lub rejestru obrazów.

### Baza danych
- Profil `prod` wymaga istnienia bazy `restaurantdb` oraz użytkownika z uprawnieniami DDL/DML.
- Parametr `SPRING_JPA_HIBERNATE_DDL_AUTO` domyślnie `update`. W środowisku produkcyjnym można zmienić na `validate`.

## Obsługa plików i zasobów statycznych

- Menedżer może ładować zdjęcia produktów poprzez `/api/manager/menu/upload`. Pliki są zapisywane w katalogu wskazanym przez `APP_UPLOAD_DIR` i udostępniane pod `/uploads/...`.
- `StaticResourceConfiguration` mapuje katalog uploadów oraz konfiguruje CORS (metody GET/POST/PUT/PATCH/DELETE/OPTIONS).
- Aplikacja frontendowa posiada statyczne grafiki w katalogu `public/img`.
- W celu resetu katalogu uploadów należy ręcznie usunąć pliki z dysku (system nie kasuje plików przy usunięciu pozycji menu).
- Backend waliduje Content-Type i rozszerzenie oraz ogranicza typ pliku do JPG;

## Testy i jak je uruchamiać

### Testy jednostkowe (frontend)
- Komenda: `npm run test`
- Środowisko: Vitest + React Testing Library (`jsdom`).
- Pokryte obszary:
  - zachowanie `AuthContext` (login, logout, auto-logout po 401),
  - routing ochronny `RequireRole`.
- Raport pokrycia: generowany automatycznie (`coverage/`).

### Testy jednostkowe (backend)
- Komenda: `cd backend && ./mvnw.cmd test`
- Zakres: `OrderSpecificationsTest` sprawdza filtrowanie po dacie, czasie, statusie i typie. Profil `test` korzysta z H2 w trybie MySQL.

### Testy end-to-end (Playwright)
- Podstawowy scenariusz (mockowane API):
  ```powershell
  npm run test:e2e
  ```
  - Skrypt buduje frontend (`npm run build`), uruchamia serwer preview (port 4173) i odpala testy.
  - Obejmuje logowanie menedżera, panel pracownika oraz ekran publiczny z danymi mockowanymi przez Playwrighta.
- Testy na żywo przeciw uruchomionemu backendowi (profil `dev` z H2):
  ```powershell
  # terminal 1
  cd backend
  $env:SPRING_PROFILES_ACTIVE = 'dev'
  $env:APP_JWT_SECRET = 'dev-secret-key'
  $env:APP_CORS_ALLOWED_ORIGINS = '[http://127.0.0.1:4173](http://127.0.0.1:4173),http://localhost:4173'
  .\mvnw.cmd spring-boot:run

  # terminal 2 (folder główny projektu)
  $env:PLAYWRIGHT_LIVE = 'true'
  npm run test:e2e
  ```
  - Zaczekaj, aż w logach backendu pojawi się komunikat `Tomcat started on port 8081 (http)`.
  - Po ustawieniu `PLAYWRIGHT_LIVE` aktywowane zostają scenariusze `tests/e2e/live-api.spec.ts`, które łączą się z realnym API (kontrolery REST, seedowane dane H2).

## Kontrola jakości i linting

- `npm run lint` uruchamia ESLint (konfiguracja TypeScript + React Hooks).
- TypeScript działa w trybie `strict`, blokując m.in. nieużywane parametry i importy.
- Backend korzysta z konwencji Spring Boot; żadne automatyczne formatowanie nie jest uruchamiane podczas builda, ale projekt jest kompatybilny z `spring-javaformat`.

## CI/CD

- Workflow GitHub Actions znajduje się w `.github/workflows/ci.yml`.
  - **Frontend QA**: `npm ci`, `npm run lint`, `npm run test`, `npm run build`, `npx playwright test`.
  - **Backend QA**: `./mvnw dependency:go-offline`, `./mvnw test`, `./mvnw package -DskipTests`.
- Workflow uruchamia się dla push i pull request na gałęzie `main`, `master`, `develop` oraz `fix/**`, zapewniając automatyczny feedback przed scaleniem zmian.
- Wyniki każdego przebiegu są widoczne w zakładce **Actions** na GitHubie, co dokumentuje historię testów i buildów na potrzeby projektu inżynierskiego.

## Struktura katalogów

| Ścieżka | Opis |
| --- | --- |
| `backend/` | Aplikacja Spring Boot (kod, konfiguracja, skrypty). |
| `backend/src/main/java/pl/restaurant/restaurantbackend/` | Logika domenowa (kontrolery, serwisy, modele, bezpieczeństwo). |
| `backend/src/main/resources/` | Konfiguracje `application-*.properties`, szablony JasperReports (`orders_report.jrxml`, `orders_stats_report.jrxml`). |
| `backend/run-prod.ps1` | Skrypt uruchomieniowy dla Windows (profil prod + MySQL). |
| `src/` | Kod frontendowy React (widoki, konteksty, style). |
| `src/views/` | Widoki wysokiego poziomu (Landing, ManagerLayout, OrderingKiosk). |
| `tests/e2e/` | Scenariusze Playwright. |
| `public/` | Statyczne zasoby serwowane przez Vite (logo, grafiki). |

## Najczęstsze problemy i wskazówki

- **401 przy wywołaniu API** - upewnij się, że `APP_JWT_SECRET` na backendzie i tokeny w przeglądarce są zgodne. Wyczyść `localStorage` (AuthContext sam to robi przy niezgodnym tokenie).
- **Problemy z uploadem zdjęć** - endpoint akceptuje tylko pliki JPG z poprawnym nagłówkiem MIME. Sprawdź czy `app.upload.dir` ma prawa zapisu.
- **Brak numerów na ekranie publicznym** - odpowiedzi 304 są spodziewane. Wymuś odświeżenie backendu (np. zmiana statusu) lub skasuj nagłówek `If-None-Match` w debugerze, aby sprawdzić czy backend zwraca nowe dane.
- **CORS** - skonfiguruj `APP_CORS_ALLOWED_ORIGINS` na backendzie i restartuj aplikację.
- **Błędy raportów (413/400)** - backend ogranicza zakres raportu do 31 dni oraz 5000 rekordów. Zweryfikuj filtry dat/czasu.

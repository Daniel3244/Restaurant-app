# Restaurant-app

Aplikacja webowa do zarzadzania restauracja.

## Moduly
- Panel klienta (przegladanie menu, skladanie zamowien)
- Panel pracownika (zarzadzanie zamowieniami)
- Panel menedzera (zarzadzanie menu, raporty)
- Ekran numerkow (dla klientow)

## Technologie
- Frontend: React + TypeScript (Vite)
- Backend: Java + Spring Boot
- Baza danych: H2 (dev) / MySQL (prod)

## Uruchomienie

### Backend
```powershell
cd backend
./mvnw.cmd spring-boot:run
```

Domyslnie wlacza sie profil `dev` (H2 w pamieci), wiec nie trzeba lokalnego MySQL. Przy starcie seedowane sa konta testowe:

- manager / manager123
- employee / employee123

Aby uzyc bazy MySQL uruchom serwer z profilem `prod`:
```powershell
set SPRING_PROFILES_ACTIVE=prod
set APP_JWT_SECRET=twoj-sekret-prod
./mvnw.cmd spring-boot:run
```
Upewnij sie, ze baza `restaurantdb` i dane logowania pokrywaja sie z plikiem `application-prod.properties`.

> **JWT**: tokeny sa podpisywane kluczem HMAC pobieranym z `APP_JWT_SECRET` (domyslnie `change-me-in-prod`). TTL tokenu to 8 godzin (`APP_JWT_TTL_HOURS`).

### Frontend
```powershell
npm install
npm run dev
```

Adres API mozna nadpisac w pliku `.env` zmienna `VITE_API_BASE_URL`.

---

Instrukcje beda dalej rozbudowywane wraz z projektem.\n\n> Po zalogowaniu mozna zmienic wlasne haslo (panel startowy) � backendowe API: POST /api/auth/change-password (wymaga naglowka Authorization).

 


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
`
cd backend
./mvnw.cmd spring-boot:run
`

Domyslnie uruchamia sie profil dev z baza H2 w pamieci, wiec nie potrzeba lokalnego MySQL. Po starcie seedowane sa konta:

- manager / manager123
- employee / employee123

Aby uzyc MySQL ustaw profil prod, np.:
`
set SPRING_PROFILES_ACTIVE=prod
./mvnw.cmd spring-boot:run
`
(Administracyjnie upewnij sie, ze baza estaurantdb i dane logowania zgadzaja sie z pplication-prod.properties.)

### Frontend
`
npm install
npm run dev
`

W razie potrzeby adres API mozesz nadpisac w .env zmienna VITE_API_BASE_URL.

---

Najwazniejsze instrukcje beda rozbudowywane wraz z projektem.

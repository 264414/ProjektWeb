# GameVault — Secure Full-Stack Game Store

Kompletna aplikacja full-stack sklepu z grami cyfrowymi, przygotowana jako baza do projektu akademickiego z analizy ryzyka i secure coding dla kodu generowanego przez AI.

## Cel akademicki

Aplikacja demonstruje bezpieczne wzorce programistyczne i jest gotowa do późniejszej analizy podatności, pentestów oraz oceny jakości kodu generowanego przez AI.

## Struktura projektu

```text
projekt/
├── client/
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── src/
│       ├── main.tsx
│       ├── router.tsx
│       ├── styles.css
│       ├── components/
│       │   ├── AuthGuard.tsx
│       │   ├── FormField.tsx
│       │   ├── LoadingState.tsx
│       │   ├── RoleGuard.tsx
│       │   └── StatusBadge.tsx
│       ├── hooks/
│       │   └── useCurrentUser.ts
│       ├── layouts/
│       │   └── AppLayout.tsx
│       ├── lib/
│       │   ├── api.ts
│       │   ├── format.ts
│       │   └── query-client.ts
│       ├── pages/
│       │   ├── AdminPage.tsx
│       │   ├── ChangePasswordPage.tsx
│       │   ├── DashboardPage.tsx
│       │   ├── GamesPage.tsx
│       │   ├── LoginPage.tsx
│       │   ├── ManageGamesPage.tsx
│       │   ├── NotFoundPage.tsx
│       │   ├── OrderPage.tsx
│       │   ├── RegisterPage.tsx
│       │   └── ReviewPage.tsx
│       ├── schemas/
│       │   ├── admin.ts
│       │   ├── auth.ts
│       │   ├── order.ts
│       │   └── review.ts
│       └── types/
│           └── api.ts
├── server/
│   ├── .env
│   ├── .env.example
│   ├── package.json
│   ├── tsconfig.json
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   └── src/
│       ├── app.ts
│       ├── index.ts
│       ├── config/
│       │   ├── env.ts
│       │   └── logger.ts
│       ├── lib/
│       │   ├── async-handler.ts
│       │   ├── audit.ts
│       │   ├── cookies.ts
│       │   ├── http-error.ts
│       │   ├── password.ts
│       │   ├── prisma.ts
│       │   └── session.ts
│       ├── middleware/
│       │   ├── authenticate.ts
│       │   ├── csrf-protect.ts
│       │   ├── error-handler.ts
│       │   ├── not-found.ts
│       │   ├── request-id.ts
│       │   ├── require-role.ts
│       │   └── validate.ts
│       ├── routes/
│       │   ├── admin.routes.ts
│       │   ├── auth.routes.ts
│       │   ├── dashboard.routes.ts
│       │   ├── game.routes.ts
│       │   ├── index.ts
│       │   ├── order.routes.ts
│       │   └── review.routes.ts
│       ├── schemas/
│       │   ├── admin.schemas.ts
│       │   ├── auth.schemas.ts
│       │   ├── game.schemas.ts
│       │   ├── order.schemas.ts
│       │   └── review.schemas.ts
│       ├── services/
│       │   ├── access.service.ts
│       │   ├── auth.service.ts
│       │   └── dashboard.service.ts
│       └── types/
│           ├── auth.ts
│           └── express.d.ts
├── .gitignore
├── package.json
└── README.md
```

## Technologie i uzasadnienie

- **React + TypeScript + Vite** — SPA z pełną kontrolą typów i szybkim dev serwerem
- **React Router** — chronione trasy z AuthGuard i RoleGuard
- **React Hook Form + Zod** — walidacja formularzy z tą samą logiką co backend (DRY)
- **TanStack Query** — bezpieczne pobieranie danych, cache, invalidacja po mutacjach
- **Node.js + Express** — REST API z elastyczną warstwą middleware
- **PostgreSQL + Prisma ORM** — typowane zapytania, brak surowego SQL → ochrona przed SQL Injection
- **Helmet** — bezpieczne nagłówki HTTP (CSP, frameguard, no-sniff, Referrer-Policy)
- **CORS z whitelistą** — ograniczenie dozwolonych originów
- **express-rate-limit** — ograniczenie brute force na endpointach auth
- **Cookie-based auth** — sesja w `httpOnly` cookie, bez tokenów w localStorage/sessionStorage
- **CSRF double-submit z podpisanym cookie** — ochrona operacji mutujących stan
- **argon2id** — odporne hashowanie haseł
- **Pino + audit log w bazie** — bezpieczne logowanie zdarzeń bez danych wrażliwych

## Funkcjonalności

### Sklep z grami (GameVault)
- Katalog 8 gier z gatunkami: ACTION, RPG, STRATEGY, SPORTS, HORROR, ADVENTURE, PUZZLE, SIMULATION
- Przeglądanie i kupowanie gier (formularz zamówienia)
- System recenzji z ocenami gwiazdkowymi (1–5)
- Panel dashboardu zależny od roli

### Uwierzytelnianie
- Rejestracja, logowanie, wylogowanie, zmiana hasła
- Sesja w httpOnly cookie z SHA-256 hash tokenu w bazie

### Role użytkowników
- **ADMIN** — widzi wszystko: użytkownicy, gry, zamówienia, recenzje, audit logi; może zmieniać role
- **MANAGER** — zarządza katalogiem gier (dodawanie, aktywacja/dezaktywacja), widzi wszystkie zamówienia i recenzje
- **USER** — widzi tylko własne zamówienia i recenzje

## Uruchomienie krok po kroku

1. Upewnij się, że działa PostgreSQL (localhost:5432)
2. Utwórz bazę `secure_ai_demo`:
   ```sql
   CREATE DATABASE secure_ai_demo;
   ```
3. Skopiuj i skonfiguruj zmienne środowiskowe:
   ```bash
   # server/.env już istnieje z domyślnymi wartościami developerskimi
   ```
4. Zainstaluj zależności:
   ```bash
   npm install
   npm run install:all
   ```
5. Wykonaj migrację Prisma:
   ```bash
   cd server
   npx prisma migrate dev --name game-store
   ```
6. Zasil bazę danymi testowymi:
   ```bash
   npm run prisma:seed
   ```
7. Wróć do katalogu głównego i uruchom aplikację:
   ```bash
   cd ..
   npm run dev
   ```
8. Frontend: `http://localhost:5173` · Backend: `http://localhost:4000`

## Konta seed

| Rola    | E-mail                  | Hasło                 |
|---------|-------------------------|-----------------------|
| ADMIN   | admin@example.com       | AdminChangeMe123!     |
| MANAGER | manager@example.com     | ManagerChangeMe123!   |
| USER    | user@example.com        | UserChangeMe123!      |

**Zmień hasła po pierwszym uruchomieniu. Nie używaj poza środowiskiem developerskim.**

## Endpointy REST API

```
GET    /api/health
GET    /api/auth/csrf-token
GET    /api/auth/me
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/change-password

GET    /api/dashboard

GET    /api/games                      (auth: wszyscy)
POST   /api/games                      (auth: MANAGER, ADMIN)
PATCH  /api/games/:gameId              (auth: MANAGER, ADMIN)

GET    /api/orders                     (auth: USER=własne, MANAGER/ADMIN=wszystkie)
POST   /api/orders                     (auth: wszyscy)
PATCH  /api/orders/:orderId/status     (auth: MANAGER, ADMIN)

GET    /api/reviews                    (auth: USER=własne, MANAGER/ADMIN=wszystkie)
POST   /api/reviews                    (auth: wszyscy)

GET    /api/admin/overview             (auth: ADMIN)
PATCH  /api/admin/users/:userId        (auth: ADMIN)
```

## Zastosowane zabezpieczenia

1. **Helmet** — Content-Security-Policy, X-Content-Type-Options, Referrer-Policy, Frameguard
2. **httpOnly + SameSite=Strict + Secure** — cookie sesyjne chronione przed XSS i CSRF
3. **Brak tokenów auth w localStorage/sessionStorage** — mitygacja XSS token theft
4. **CSRF double-submit** — podpisane cookie + nagłówek `X-CSRF-Token` dla wszystkich mutacji
5. **Rate limiting** — logowanie (5/15min), rejestracja (3/15min), zmiana hasła (5/15min)
6. **Zod na kliencie i serwerze** — walidacja wejścia na obu warstwach
7. **Prisma ORM bez surowego SQL** — ochrona przed SQL Injection
8. **RBAC po stronie backendu** — scope builders na poziomie zapytań, nie tylko UI
9. **Transakcja przy zakupie** — atomowe zmniejszenie stoku + zapis zamówienia (mitygacja oversell)
10. **Audit log** — wszystkie zdarzenia uwierzytelniania, autoryzacji i operacji administracyjnych
11. **Redakcja danych wrażliwych** — automatyczne usuwanie password/token/secret/cookie z logów
12. **Centralny error handler** — brak stack trace dla klienta (5xx = generic message)
13. **Request ID** — każde żądanie ma UUID dla korelacji zdarzeń audytowych
14. **Argon2id** — odporne hashowanie haseł (timeCost: 3, memoryCost: 19 456 KB)
15. **Unikatowość recenzji** — @@unique([userId, gameId]) na poziomie bazy danych
16. **Ochrona przed auto-democją** — admin nie może usunąć własnej roli ADMIN
17. **CORS z whitelistą** — tylko skonfigurowane originy
18. **Limit rozmiaru payload** — 10 KB dla JSON i urlencoded

## Potencjalne ryzyka, które nadal pozostają

- Rate limiter korzysta z pamięci procesu — w środowisku rozproszonym wymaga Redis
- Sesje bez fingerprintingu urządzenia — kompromis na rzecz czytelności
- Brak testów automatycznych (SAST/DAST/unit/integration)
- `COOKIE_SECURE=false` w lokalnym .env — produkcja wymaga `true`
- Brak MFA i mechanizmu blokady kont
- Ceny gier przechowywane jako Float, nie Decimal — ryzyko błędów zaokrąglania w dużej skali
- Brak mechanizmu zwrotów/refundów — status zamówienia jest jednokierunkowy (PENDING→COMPLETED/CANCELLED)

## Co warto sprawdzić w pentestach

- Próby obejścia CSRF na endpointach POST i PATCH
- Brute force na `/auth/login`, `/auth/register`, `/auth/change-password` oraz skuteczność rate limiting
- Eskalacja uprawnień: wywołania `/api/admin/*` z sesją USER lub MANAGER
- Weryfikacja zakresu RBAC: czy USER może pobrać zamówienia innego użytkownika przez manipulację parametrami
- Próby złożenia zamówienia na nieaktywną grę lub z ujemną ilością
- Enumeracja użytkowników po komunikatach błędów auth
- Manipulacja cookie sesyjnym i próby przywrócenia wygasłych sesji
- XSS przez pola recenzji i zamówień wyświetlane w tabelach
- Duplikaty recenzji — czy aplikacja prawidłowo obsługuje conflict 409
- Bypass ograniczeń CORS przez nieautoryzowane originy
- Zawartość logów audytowych pod kątem wycieku danych wrażliwych
- Race condition przy jednoczesnym składaniu zamówień (oversell test)

## Miejsca z komentarzami bezpieczeństwa

- [server/src/lib/audit.ts](server/src/lib/audit.ts) — redakcja danych wrażliwych
- [server/src/lib/session.ts](server/src/lib/session.ts) — haszowanie tokenów
- [server/src/middleware/authenticate.ts](server/src/middleware/authenticate.ts) — httpOnly cookie auth
- [server/src/middleware/csrf-protect.ts](server/src/middleware/csrf-protect.ts) — CSRF double-submit
- [server/src/services/access.service.ts](server/src/services/access.service.ts) — RBAC scope builders
- [server/src/routes/order.routes.ts](server/src/routes/order.routes.ts) — transakcja Prisma (anti-oversell)
- [server/src/routes/auth.routes.ts](server/src/routes/auth.routes.ts) — rate limiting, audit logging
- [server/src/routes/admin.routes.ts](server/src/routes/admin.routes.ts) — ochrona przed auto-democją
# ProjektWeb

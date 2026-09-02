# Daily Planner

Aplikacja "Daily Planner" działa jako statyczna strona hostowana na GitHub Pages i zapisuje dane do pliku `data/data.json` w tym repozytorium.

Jak to działa
- Interfejs działa całkowicie w przeglądarce (HTML/CSS/JS).
- Aby zapisać zmiany do repo, aplikacja wykorzystuje GitHub REST API i wymaga jednorazowego Personal Access Token (PAT) wklejonego przez użytkownika podczas sesji.
- Token jest trzymany tylko w pamięci (nie zapisywany w localStorage) i używany do wywołań API.

Zalecane uprawnienia tokena
- Dla publicznego repo: wydać token z zakresem `public_repo`.
- Dla prywatnego repo: wymagany jest zakres `repo`.

Generowanie tokena
1. Otwórz https://github.com/settings/tokens
2. Wybierz "Generate new token" → nadaj nazwę i zaznacz `public_repo` (lub `repo` dla prywatnego)
3. Skopiuj token i wklej go w polu na stronie aplikacji (tylko na czas sesji).

Pliki w repo
- index.html — UI
- src/app.js — logika aplikacji i integracja z GitHub API
- src/style.css — proste style
- data/data.json — plik danych (app tworzy go automatycznie, jeśli nie istnieje)

Bezpieczeństwo
- PAT ma pełne uprawnienia do zapisu w repo — nie przechowuj go w niepewnych miejscach.
- Po zakończeniu sesji usuń token (przycisk Wyloguj) lub usuń token w ustawieniach GitHub.

Jeśli chcesz, mogę później przekształcić zapis tak, by używać bezpiecznego backendu (Cloudflare Workers / Netlify Functions), gdzie token nie musiałby być manipulowany przez użytkownika.

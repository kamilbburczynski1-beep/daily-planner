# Daily Planner — rozbudowana wersja

Ta wersja zawiera:
- Kalendarz z możliwością otwarcia pojedynczego dnia
- Zakładki: Zadania, Kroki, Finanse, Książki, Statystyki, Backup/Import
- System zapisu per-entry: `data/days/YYYY-MM-DD.json` dla dni oraz `data/finance/entries.json` dla transakcji
- Import CSV dla finansów oraz prosty backup JSON

Autoryzacja
- Aplikacja używa krótkotrwałego Personal Access Token (PAT) wklejanego przez użytkownika tylko na czas sesji.
- Token NIE jest zapisywany w localStorage — trzymany jest tylko w pamięci JS.

Uruchomienie
1. Włącz GitHub Pages (branch: main, folder: /).  
2. Otwórz stronę i wklej PAT (scope: public_repo lub repo jeśli repo prywatne).  
3. Używaj formularzy. Każde dodanie tworzy/aktualizuje pliki w katalogu data/ w repo (commit w Twoim imieniu, jeśli token ma access).

Dalsze kroki
- Mogę dodać: automatyczne agregacje miesięczne, kalendarz z drag&drop (FullCalendar), wykresy bardziej zaawansowane, eksport CSV, filtrowanie i wyszukiwanie oraz backupy per-entry.

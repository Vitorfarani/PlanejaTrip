# Changelog

## 2026-09-26 — README translated

**Translated**
- Translated the README from Portuguese to English, including the SQL comments, the Row Level Security policy names in the setup script, and the environment variable placeholders (`sua_url_do_supabase` → `your_supabase_url`, etc.).
- The default profile name in the `handle_new_user` trigger inside the README's SQL script changed from `'Usuário'` to `'User'`. This only affects new databases created from the README script; existing databases are unchanged.
- Noted that `docs/SETUP_EMAIL.md` is in Portuguese.
- Fixed the clone URL (`<url-do-repositorio>` → the real repository URL).

**Small additions**
- Project structure: added `TravelAssistantChat.tsx` and `services/geminiService.ts`, which exist in the code but were missing from the tree.
- AI features: added "Travel assistant chat" to the list, matching the existing chat component.

No code was changed.

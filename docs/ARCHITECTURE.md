# Oracle — архитектура

Небольшое анонимное serverless-приложение: пользователь задаёт вопрос, бэкенд возвращает «пророчество» от LLM.

```text
GitHub Pages (Nuxt, статика)
  │ POST { question }
  ▼
Cloudflare Worker (валидация → промпт → OpenRouter → Groq → валидация ответа)
  │ HTTPS
  ▼
OpenRouter + Groq (OpenAI-совместимые chat/completions)
```

## Структура репозитория

```text
frontend/   # Nuxt 3 + Vue, статический сайт для GitHub Pages
worker/     # Cloudflare Worker (API), TypeScript
docs/       # документация
.github/workflows/deploy.yml  # CI/CD: worker + frontend + Pages
```

Вся инфраструктура — Cloudflare Workers + GitHub Pages, IaC нет, деплой через Wrangler.

## Frontend `frontend/`

- `app.vue` — каркас страницы
- `components/OracleForm.vue` — ввод вопроса
- `components/OracleResult.vue` — показ ответа
- `components/OracleStatus.vue` — показ ошибки
- `composables/useOracle.ts` — состояние `result / error / isLoading / isBlocked`
- `services/oracleApi.ts` — `POST { question }` на URL воркера (таймаут 40с)
- `types/oracle.ts` — типы ответа и ошибок
- `nuxt.config.ts` — `oracleApiUrl` из `NUXT_PUBLIC_ORACLE_API_URL`, `baseURL` из `NUXT_APP_BASE_URL`

Секретов во фронтенде нет. Пример: `frontend/.env.example`.

Сборка: `npm run generate` → `frontend/.output/public` → GitHub Pages.

## Worker `worker/`

Код: `worker/src/`, конфиг: `worker/wrangler.toml`. Слои разделены:
бизнес-логика ничего не знает про Cloudflare, платформа — ничего про LLM.

```text
src/types.ts               # контракты: OracleResponse, OracleProvider, OracleDeps, RateLimiter
src/oracle.ts              # чистый домен: валидация вопроса/ответа, промпт, парсинг
src/providers.ts           # фабрика createProvider + общий парсинг конфига
src/providers/openrouter.ts # OpenRouterProvider (тонкая обёртка)
src/providers/groq.ts      # GroqProvider (тонкая обёртка)
src/providers/openaiCompatible.ts # общий chat/completions: Bearer, messages, response_format json_object
src/providers/fallback.ts  # FallbackProvider: primary → secondary при пустом ответе
src/http.ts                # Cloudflare-адаптер: CORS, JSON-ответы, clientIp, rate-limit
src/handler.ts             # оркестрация handleAsk(request, deps)
src/index.ts               # composition root: Env → конфиги → провайдеры → handleAsk
```

Выбор LLM — через DI: хендлер зависит только от интерфейса
`OracleProvider`, конкретная реализация подставляется фабрикой
`createProvider(kind, config)`. Primary задаётся env `ORACLE_PROVIDER`
(дефолт `"openrouter"`), опциональный fallback — env `ORACLE_FALLBACK_PROVIDER`
(пусто = выключен). Провайдер отвечает не голым `null`, а `ProviderAnswer`:
успех либо провал с флагом `blocked` (только для HTTP `403` провайдера).
`FallbackProvider` при пустом ответе primary (4xx/5xx/timeout/сеть,
а также битый контент) прозрачно спрашивает secondary тем же вопросом —
включая случай запрета primary; итоговый `blocked` доходит до хендлера,
только если упёрлись оба. Если пусты оба без запрета — `502`.
Невалидный конфиг fallback не ломает primary: цепочка молча
остаётся из одного провайдера с ошибкой в логе. Новый провайдер —
это новый файл + одна ветка в фабрике, хендлер не меняется.

Обработка запроса. Проверки метода идут до сборки провайдера,
поэтому preflight и 405 не зависят от ключей LLM (битый конфиг даёт
502 только на реальные ask-запросы, а не маскируется под CORS):

1. `OPTIONS` → `204` (CORS preflight). Ответ несёт `Access-Control-Max-Age: 600`, поэтому браузер кэширует префлайт и не шлёт `OPTIONS` перед каждым POST (без него Chrome отправляет префлайт на каждый клик, дефолт кэша ~5с).
2. Не-`POST` → `405 { error: "invalid_request" }`. Чужой путь (не `/`) и тело больше 8 КБ (`Content-Length` > 8192) → `400`: мусор отсекается до парсинга и лимита, контракт не меняется.
3. Штатный Workers Rate Limiting **до** парсинга тела (префлайты не лимитируются): сначала бакет per-IP (`CF-Connecting-IP`, `10` запросов / `60` сек), затем глобальный бакет (`100` запросов / `60` сек, защита квоты LLM). При превышении → `429 { error: "oracle_resting", retry_after: 60 }` + заголовок `Retry-After: 60`. Лимиты задаются в `worker/wrangler.toml` (`[[ratelimits]]`), `period` бывает только `10` или `60`. Лимиты локальны на колокейшн и разрешительные — это защита от bursts, не точный учёт. Без биндингов (локальный `dev`) проверка пропускается.
4. Парсинг JSON. `question` обязан быть строкой `1..500` символов после `trim()`, иначе `400 { error: "invalid_request" }`.
4. Промпт собирается только на бэкенде (русский, мистический стиль, требование вернуть только JSON).
5. Запрос в primary-провайдер (дефолт OpenRouter: `POST /api/v1/chat/completions`, `response_format: {json_object}`; Groq — тот же протокол), таймаут через `AbortController` (по умолчанию 20с). При пустом ответе primary и включённом fallback — повтор тем же вопросом в secondary.
6. Ответ модели чистится от ```-обёртки, парсится и валидируется: `verdict` (непустая строка), `confidence` (число `0..100`), `prophecy` и `reason` (непустые строки, каждое поле до 4000 символов). Иначе `502 { error: "oracle_unavailable" }`. Явный запрет провайдера (его HTTP `403`) — особый случай: `403 { error: "blocked" }`, VPN-экран вместо «попробуй позже». Остальные 4xx/5xx, сеть, таймаут и битый контент идут в `502`.
7. CORS: заголовок `Access-Control-Allow-Origin` ставится только если `Origin` есть в `CORS_ALLOWED_ORIGINS` (поддерживается `*`). `Access-Control-Allow-Methods`/`-Allow-Headers`/`-Max-Age` (`worker/src/http.ts`) ставятся во все ответы — вне preflight они игнорируются, поэтому отдельной ветки для `OPTIONS` не нужно.

Переменные окружения воркера. Параметры генерации общие для всех
провайдеров (`ORACLE_*`), своё у каждого провайдера — только ключ и модель:

| Имя | Тип | Назначение |
| --- | --- | --- |
| `OPENROUTER_API_KEY` | secret (`wrangler secret put`) | ключ OpenRouter |
| `OPENROUTER_MODEL` | var | идентификатор модели OpenRouter (`vendor/model`) |
| `GROQ_API_KEY` | secret (`wrangler secret put`) | ключ Groq |
| `GROQ_MODEL` | var | идентификатор модели Groq |
| `ORACLE_PROVIDER` | var (опц.) | primary-провайдер, дефолт `openrouter` |
| `ORACLE_FALLBACK_PROVIDER` | var (опц.) | fallback-провайдер, пусто = выключен |
| `ORACLE_MAX_TOKENS` | var | лимит токенов ответа |
| `ORACLE_TEMPERATURE` | var | температура |
| `ORACLE_TIMEOUT` | var | таймаут запроса, сек |
| `CORS_ALLOWED_ORIGINS` | var | список разрешённых origin через запятую |

## Деплой `.github/workflows/deploy.yml`

Три джобы, запускаются на `push` в `main` и на PR (пути `worker/**`, `frontend/**`):

1. `worker-check`: `npm ci`, `npm run check` (tsc), `npm run lint` (eslint), `npm run test` (vitest). Только на `push`: `wrangler secret put OPENROUTER_API_KEY` + `wrangler secret put GROQ_API_KEY` + `wrangler deploy --var ...`.
2. `frontend`: `npm ci`, `npm run lint`, `npm run typecheck` (`nuxt prepare` + `vue-tsc`), `npm run test` (vitest), затем `nuxt generate` с `NUXT_APP_BASE_URL` и `NUXT_PUBLIC_ORACLE_API_URL` (из `vars.CLOUDFLARE_WORKER_URL`), загрузка артефакта Pages.
3. `deploy-pages`: публикация на GitHub Pages. Только на `push`.

Нужные GitHub Secrets/Vars: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `GROQ_API_KEY`, `GROQ_MODEL`, `ORACLE_PROVIDER`, `ORACLE_FALLBACK_PROVIDER` (`groq` для связки openrouter → groq), `ORACLE_MAX_TOKENS`, `ORACLE_TEMPERATURE`, `ORACLE_TIMEOUT`, `CORS_ALLOWED_ORIGINS`, `CLOUDFLARE_WORKER_URL`.

Безопасность CI — отдельно в `.github/workflows/security.yml`: gitleaks (секреты), CodeQL (SAST, JS/TS), аудит зависимостей (воркер — чистый `npm audit`, фронт — `audit-ci` с allowlist). Все `uses:` в workflows запинены на SHA (без Dependabot обновляются вручную). Заголовки фронта — `frontend/public/_headers`, копируется в корень сборки.

Допустимые исключения аудита (`frontend/audit-ci.jsonc`, только без патчей upstream и с dev-only экспозицией): `GHSA-86w9-cpqp-85rv` (node-forge в dev-сервере Nuxt), `GHSA-vfj7-8cjw-p6xm` (braces в сборке). Пересматривать при появлении патчей; vitest держим на ^5 из-за `GHSA-82fw-gwwq-j7x9` в 3.x/4.x.

## Ошибки API

```text
400 invalid_request     # плохой JSON или вопрос вне 1..500 символов
405 invalid_request     # не-POST метод
429 oracle_resting      # превышен rate limit, повтор через retry_after секунд
403 blocked             # провайдер явно запретил запрос — фронт показывает VPN-экран
502 oracle_unavailable  # провайдеры недоступны, неверный конфиг, ошибка rate-limit биндинга или ответ модели не прошёл валидацию
(none) blocked         # только фронт: воркер молчит дольше таймаута — сеть глушат, тот же VPN-экран
```

Код `blocked` имеет два источника с одним экраном: бэкенд ставит его при
HTTP `403` от LLM-провайдера (ключ/модель в порядке, но запрос отклонён
политикой — типично для региональных блокировок), фронт — когда ответа нет
вообще (сеть, таймаут, оборванный CORS-preflight): `askOracle` ловит сетевой
сбой и подставляет `blocked`. Отдельной проактивной `OPTIONS`-проверки связи
на монтировании сейчас нет — экран появляется по факту неудачного ask-запроса.

Внутренние детали (статусы провайдера, тексты ошибок, стек-трейсы) наружу не отдаются, в логи пишутся краткие коды (`openrouter_http_error`, `groq_response_invalid` и т.п.).

## Разработка

Проверки запускаются отдельно в каждом пакете (`frontend/`, `worker/`).

```text
cd worker
npm run check       # tsc --noEmit
npm run lint        # eslint .
npm run test        # vitest run
npm run test:watch  # vitest (watch-режим)

cd frontend
npm run lint        # eslint . (модуль @nuxt/eslint)
npm run typecheck   # nuxt prepare + vue-tsc --noEmit
npm run test        # vitest run
npm run test:watch  # vitest (watch-режим)
```

Тесты покрывают чистую логику без сети и браузера: в воркере по модулям —
`oracle` (валидация, промпт), `providers` (фабрика, конфиг, каждый
провайдер с подменённым fetch), `http` (CORS, IP, лимитеры) и `handler` (весь флоу
со стабом провайдера через DI); во фронте — `services/oracleApi` (успех, коды ошибок, `retry_after` из тела и заголовка) и `services/oracleErrors` (склонения, `retry`-тексты). Те же команды гоняются в CI до деплоя.

## Когда включать Turnstile

Сейчас antibot-слой — только rate limits (10/мин с IP, 100/мин глобально).
Этого хватает, пока нет признаков абуза. Триггеры переходить на Cloudflare
Turnstile: устойчивые `429` у живых пользователей, заметное сгорание квоты LLM,
подозрение на ротацию IPv6 (per-IP лимит против неё бессилен — адресов
бесконечно, identity без аккаунтов нет). Интеграция тогда: виджет во фронте →
токен в теле `ask` → проверка через `siteverify` в воркере → новый код ошибки.
Мониторинг до тех пор — ручной `wrangler tail` и коды `rate_limited` в логах.

# Oracle — архитектура

Небольшое анонимное serverless-приложение: пользователь задаёт вопрос, бэкенд возвращает «пророчество» от LLM.

```text
GitHub Pages (Nuxt, статика)
  │ POST { question }
  ▼
Cloudflare Worker (валидация → промпт → Gemini → валидация ответа)
  │ HTTPS
  ▼
Google Gemini (generativelanguage.googleapis.com)
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
- `composables/useOracle.ts` — состояние `result / error / isLoading`
- `services/oracleApi.ts` — `POST { question }` на URL воркера
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
src/providers/gemini.ts    # GeminiProvider (прямой Gemini API)
src/providers/openrouter.ts # OpenRouterProvider (OpenAI-совместимый chat/completions)
src/providers/fallback.ts  # FallbackProvider: primary → secondary при пустом ответе
src/http.ts                # Cloudflare-адаптер: CORS, JSON-ответы, clientIp, rate-limit
src/handler.ts             # оркестрация handleAsk(request, deps)
src/index.ts               # composition root: Env → конфиги → провайдеры → handleAsk
```

Выбор LLM — через DI: хендлер зависит только от интерфейса
`OracleProvider`, конкретная реализация подставляется фабрикой
`createProvider(kind, config)`. Primary задаётся env `ORACLE_PROVIDER`
(дефолт `"gemini"`), опциональный fallback — env `ORACLE_FALLBACK_PROVIDER`
(пусто = выключен). `FallbackProvider` при пустом ответе primary
(4xx/5xx/timeout/сеть, а также битый контент — всё это `null`)
прозрачно спрашивает secondary тем же вопросом; если пусты оба —
`502`. Невалидный конфиг fallback не ломает primary: цепочка молча
остаётся из одного провайдера с ошибкой в логе. Новый провайдер —
это новый файл + одна ветка в фабрике, хендлер не меняется.

Обработка запроса:

1. `OPTIONS` → `204` (CORS preflight).
2. Не-`POST` → `405 { error: "invalid_request" }`.
3. Штатный Workers Rate Limiting **до** парсинга тела (префлайты не лимитируются): сначала бакет per-IP (`CF-Connecting-IP`, `10` запросов / `60` сек), затем глобальный бакет (`100` запросов / `60` сек, защита квоты Gemini). При превышении → `429 { error: "oracle_resting", retry_after: 60 }` + заголовок `Retry-After: 60`. Лимиты задаются в `worker/wrangler.toml` (`[[ratelimits]]`), `period` бывает только `10` или `60`. Лимиты локальны на колокейшн и разрешительные — это защита от bursts, не точный учёт. Без биндингов (локальный `dev`) проверка пропускается.
4. Парсинг JSON. `question` обязан быть строкой `1..500` символов после `trim()`, иначе `400 { error: "invalid_request" }`.
4. Промпт собирается только на бэкенде (русский, мистический стиль, требование вернуть только JSON).
5. Запрос в primary-провайдер (дефолт Gemini: `POST /v1beta/models/{model}:generateContent`, `responseMimeType: application/json`; OpenRouter: `POST /api/v1/chat/completions`, `response_format: {json_object}`), таймаут через `AbortController` (по умолчанию 20с). При пустом ответе primary и включённом fallback — повтор тем же вопросом в secondary.
6. Ответ модели чистится от ```-обёртки, парсится и валидируется: `verdict` (непустая строка), `confidence` (число `0..100`), `prophecy` и `reason` (непустые строки, каждое поле до 4000 символов). Иначе `502 { error: "oracle_unavailable" }`.
7. CORS: заголовок `Access-Control-Allow-Origin` ставится только если `Origin` есть в `CORS_ALLOWED_ORIGINS` (поддерживается `*`).

Переменные окружения воркера. Параметры генерации общие для всех
провайдеров (`ORACLE_*`), своё у каждого провайдера — только ключ и модель:

| Имя | Тип | Назначение |
| --- | --- | --- |
| `GEMINI_API_KEY` | secret (`wrangler secret put`) | ключ Gemini |
| `GEMINI_MODEL` | var | идентификатор модели Gemini |
| `OPENROUTER_API_KEY` | secret (`wrangler secret put`) | ключ OpenRouter |
| `OPENROUTER_MODEL` | var | идентификатор модели OpenRouter (`vendor/model`) |
| `ORACLE_PROVIDER` | var (опц.) | primary-провайдер, дефолт `gemini` |
| `ORACLE_FALLBACK_PROVIDER` | var (опц.) | fallback-провайдер, пусто = выключен |
| `ORACLE_MAX_TOKENS` | var | лимит токенов ответа |
| `ORACLE_TEMPERATURE` | var | температура |
| `ORACLE_TIMEOUT` | var | таймаут запроса, сек |
| `CORS_ALLOWED_ORIGINS` | var | список разрешённых origin через запятую |

## Деплой `.github/workflows/deploy.yml`

Три джобы, запускаются на `push` в `main` и на PR (пути `worker/**`, `frontend/**`):

1. `worker-check`: `npm ci`, `npm run check` (tsc), `npm run lint` (eslint), `npm run test` (vitest). Только на `push`: `wrangler secret put GEMINI_API_KEY` + `wrangler secret put OPENROUTER_API_KEY` + `wrangler deploy --var ...`.
2. `frontend`: `npm ci`, `npm run lint`, `npm run typecheck` (`nuxt prepare` + `vue-tsc`), `npm run test` (vitest), затем `nuxt generate` с `NUXT_APP_BASE_URL` и `NUXT_PUBLIC_ORACLE_API_URL` (из `vars.CLOUDFLARE_WORKER_URL`), загрузка артефакта Pages.
3. `deploy-pages`: публикация на GitHub Pages. Только на `push`.

Нужные GitHub Secrets/Vars: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `ORACLE_PROVIDER`, `ORACLE_FALLBACK_PROVIDER` (`openrouter` для связки gemini → openrouter), `ORACLE_MAX_TOKENS`, `ORACLE_TEMPERATURE`, `ORACLE_TIMEOUT`, `CORS_ALLOWED_ORIGINS`, `CLOUDFLARE_WORKER_URL`.

## Ошибки API

```text
400 invalid_request     # плохой JSON или вопрос вне 1..500 символов
405 invalid_request     # не-POST метод
429 oracle_resting      # превышен rate limit, повтор через retry_after секунд
502 oracle_unavailable  # Gemini недоступен, неверный конфиг, ошибка rate-limit биндинга или ответ модели не прошёл валидацию
```

Внутренние детали (статусы провайдера, тексты ошибок, стек-трейсы) наружу не отдаются, в логи пишутся краткие коды (`gemini_http_error`, `gemini_response_invalid` и т.п.).

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
`oracle` (валидация, промпт), `providers` (фабрика, конфиг, Gemini с
подменённым fetch), `http` (CORS, IP, лимитеры) и `handler` (весь флоу
со стабом провайдера через DI); во фронте — `services/oracleApi` (успех, коды ошибок, `retry_after` из тела и заголовка) и `services/oracleErrors` (склонения, `retry`-тексты). Те же команды гоняются в CI до деплоя.

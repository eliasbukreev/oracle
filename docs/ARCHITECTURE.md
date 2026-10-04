# Oracle — архитектура

Небольшое анонимное serverless-приложение: пользователь задаёт вопрос, бэкенд возвращает «пророчество» от LLM.

```text
GitHub Pages (Nuxt, статика)
  │ POST { question }
  ▼
Cloudflare Worker (валидация → вытягивание 3 карт + положение → промпт с картами и эталонными значениями → OpenRouter → Groq → валидация расклада)
  │ HTTPS
  ▼
OpenRouter + Groq (OpenAI-совместимые chat/completions)
```

## Структура репозитория

```text
frontend/   # Nuxt 4 + Vue, статический сайт для GitHub Pages
worker/     # Cloudflare Worker (API), TypeScript
docs/       # документация
.github/workflows/deploy.yml  # CI/CD: worker + frontend + Pages
```

Вся инфраструктура — Cloudflare Workers + GitHub Pages, IaC нет, деплой через Wrangler.

## Frontend `frontend/`

Структура каталогов — как в Nuxt 4: `srcDir` равен `app/`, поэтому алиас `~`
указывает на `app/`, а `nuxt.config.ts`, `public/` и `vitest.config.ts` живут
в корне `frontend/`.

- `app/app.vue` — каркас: панель + `AnimatePresence` с экранами
- `app/components/OracleForm.vue` — ввод вопроса
- `app/components/TarotScreenHome.vue` — экран вопроса (шапка + форма + статус)
- `app/components/TarotScreenLoading.vue` — экран загрузки
- `app/components/TarotCardScreen.vue` — экран карты (слева карта, справа текст, кнопка под текстом)
- `app/components/TarotScreenFinale.vue` — итог + миниатюры + «Новый вопрос»
- `app/components/TarotCardImage.vue` — картинка карты (рубашка до загрузки, поворот перевёрнутой)
- `app/components/OracleStatus.vue` — показ ошибки
- `app/composables/useOracle.ts` — запрос к API: `result / error / isLoading / isBlocked`
- `app/composables/useTarotFlow.ts` — тонкая Vue-обёртка над машиной экранов (+ `preview()` только для dev)
- `app/components/DevPreviewBar.vue` — плавающая dev-панель превью экранов (в прод не попадает)
- `app/services/tarotFlow.ts` — чистая машина `home → loading → card-0 → card-1 → card-2 → finale` (редьюсер, только вперёд)
- `app/services/tarotPreview.ts` — дев-фикстура расклада с реальными картинками (только dev)
- `app/services/screenMotion.ts` — параметры перехода экранов (fade+slide 0.25с)
- `app/services/oracleApi.ts` — `POST { question }` на URL воркера (таймаут 40с)
- `app/types/oracle.ts` — типы ответа и ошибок
- `nuxt.config.ts` — `oracleApiUrl` из `NUXT_PUBLIC_ORACLE_API_URL`, `baseURL` из `NUXT_APP_BASE_URL`; модуль `motion-v/nuxt`
- `app/app.config.ts` — режим иконок (`css` + слой `base`, иначе маски перебивают утилиты Tailwind)

Стек фронта минимальный: Nuxt 4, Tailwind v4 (через `@tailwindcss/vite`),
`@nuxt/icon` + локальные коллекции `lucide` и `game-icons` (трикветра и прочая
мистика — из `game-icons`, интерфейс — из `lucide`), `@nuxt/fonts`, `@vueuse/nuxt`,
`motion-v` (переходы экранов через `AnimatePresence mode="wait"`, `<motion.div>`
импортируется вручную — автоимпорт его не подхватывает; `MotionConfig
reduced-motion="user"` гасит анимации по системной настройке). Пинга нет,
состояние живёт в composables.

Превью экранов в dev: `nuxt dev` показывает внизу панель `dev` с кнопками
«Загрузка», «Карта 1/2/3», «Финал», «Сброс» — экраны открываются на мок-раскладе
(`tarotPreview.ts`) без бэкенда. Панель и фикстура грузятся только в dev
(асинхронные чанки за `import.meta.dev`), в прод-бандле их нет — проверяется
поиском `Дев-панель`/`PREVIEW_SPREAD` в `.output/public/_nuxt/`.

Три неочевидных места, из-за которых всё ломается тихо:

- Токены в `app/assets/css/main.css` лежат в `@theme`. Namespace `text-*`
  обслуживает и размер, и цвет, поэтому размеры названы `text-caption`,
  `text-note`, `text-body`, ` text-lead`, `text-display` — иначе `text-overline`
  или `text-label` затёрли бы сами себя и текст получился бы кеглем 16px.
- Значение тени в `@theme` не должно ссылаться на другой токен
  (`var(--color-...)`): Tailwind публикует в `:root` только используемые
  переменные, и несуществующая превращает `box-shadow` в invalid → `none`.
- `@nuxt/icon` кладёт CSS коллекции в `<style>` инлайном (CSP у нас нет,
  см. раздел про деплой, так что это просто факт). Клиентский бандл иконок
  (`clientBundle.scan`) обязателен: иконки, рендерящиеся только на клиенте
  (спиннер, иконки в карточке ошибки), не попадают в пререндер и без
  `scan` модуль пошёл бы за ними на `api.iconify.design` в рантайме.

Секретов во фронтенде нет. Пример: `frontend/.env.example`.

Сборка: `npm run generate` → `frontend/.output/public` → GitHub Pages.

## Worker `worker/`

Код: `worker/src/`, конфиг: `worker/wrangler.toml`. Слои разделены:
бизнес-логика ничего не знает про Cloudflare, платформа — ничего про LLM.

```text
src/types.ts               # контракты: TarotResponse/DrawnCard/TarotAskInput, ориентация, OracleProvider, OracleDeps, RateLimiter
src/oracle.ts              # чистый домен: валидация вопроса
src/tarot/deck.ts          # каноническая колода: полные 78 карт Райдера-Уэйта (id, имя RU, значения up/rev RU, файл изображения)
src/tarot/draw.ts          # вытягивание 3 уникальных карт сервером (past/present/future) + монетка положения (upright/reversed)
src/tarot/prompt.ts        # промт: для каждой карты только эталонное значение выпавшего положения
src/tarot/validate.ts      # парсинг + строгая сверка id/позиции/положения с вытянутыми
src/tarot/workflow.ts      # langgraph-like оркестрация: validate → draw → askTarot
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
4. Workflow расклада (`runTarotWorkflow`): сервер случайно тянет 3 уникальные карты из полной колоды 78 (`crypto.getRandomValues`, позиции `past/present/future`) и монеткой определяет положение каждой (`upright/reversed`) — LLM их только толкует, выбрать свои не может.
5. Промпт собирается только на бэкенде (русский, мистический стиль, требование вернуть только JSON) и включает для каждой карты `имя (id: slug)`, положение и эталонное значение именно этого положения из классических толкований (переведены на русский, запечены в `deck.ts`) — модель обязана вернуть те же `id`, `position` и `orientation` в том же порядке, а толкование не должно противоречить эталону.
6. Запрос в primary-провайдер (дефолт OpenRouter: `POST /api/v1/chat/completions`, `response_format: {json_object}`; Groq — тот же протокол), таймаут через `AbortController` (по умолчанию 20с). При пустом ответе primary и включённом fallback — повтор тем же входом (вопрос + те же карты) в secondary.
7. Ответ модели чистится от ```-обёртки, парсится и валидируется: ровно 3 карты, `id`/`position`/`orientation` строго равны вытянутым, `meaning` и `summary` — непустые строки до 4000 символов; имена в ответ API подставляются из канона колоды, а не из текста модели. Иначе `502 { error: "oracle_unavailable" }`. Явный запрет провайдера (его HTTP `403`) — особый случай: `403 { error: "blocked" }`, VPN-экран вместо «попробуй позже». Остальные 4xx/5xx, сеть, таймаут и битый контент идут в `502`.
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
| `ORACLE_MAX_TOKENS` | var | лимит токенов ответа (для расклада из 3 карт рекомендуется ≥1200) |
| `ORACLE_TEMPERATURE` | var | температура |
| `ORACLE_TIMEOUT` | var | таймаут запроса, сек |
| `CORS_ALLOWED_ORIGINS` | var | список разрешённых origin через запятую |
| `TAROT_IMAGE_BASE_URL` | var (опц.) | base URL картинок таро в R2, напр. `https://assets.example.com`; пусто = ответы без `imageUrl` |

## Деплой `.github/workflows/deploy.yml`

Три джобы, запускаются на `push` в `main` и на PR (пути `worker/**`, `frontend/**`).
Node везде 24: Nuxt 4 требует `^22.19.0 || ^24.11.0 || >=26`, а брать нижнюю
границу 22 в плавающем теге рискованно.

1. `worker-check`: `npm ci`, `npm run check` (tsc), `npm run lint` (eslint), `npm run test` (vitest). Только на `push`: `wrangler secret put OPENROUTER_API_KEY` + `wrangler secret put GROQ_API_KEY` + `wrangler deploy --var ...`.
2. `frontend`: `npm ci`, `npm run lint`, `npm run typecheck` (`nuxt prepare` + `vue-tsc`), `npm run test` (vitest), затем `nuxt generate` с `NUXT_APP_BASE_URL` и `NUXT_PUBLIC_ORACLE_API_URL` (из `vars.CLOUDFLARE_WORKER_URL`), загрузка артефакта Pages.
3. `deploy-pages`: публикация на GitHub Pages. Только на `push`.

Нужные GitHub Secrets/Vars: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `GROQ_API_KEY`, `GROQ_MODEL`, `ORACLE_PROVIDER`, `ORACLE_FALLBACK_PROVIDER` (`groq` для связки openrouter → groq), `ORACLE_MAX_TOKENS`, `ORACLE_TEMPERATURE`, `ORACLE_TIMEOUT`, `CORS_ALLOWED_ORIGINS`, `CLOUDFLARE_WORKER_URL`, `TAROT_IMAGE_BASE_URL` (опц., см. «Изображения карт»).

Безопасность CI — отдельно в `.github/workflows/security.yml`: gitleaks (секреты), CodeQL (SAST, JS/TS), аудит зависимостей (воркер — чистый `npm audit`, фронт — `audit-ci` с allowlist). Все `uses:` в workflows запинены на SHA (без Dependabot обновляются вручную).

Кастомных security-заголовков (включая CSP) нет сознательно: GitHub Pages отдаёт файлы с фиксированным набором заголовков и `_headers`-файлы не поддерживает (это конвенция Cloudflare Pages / Netlify). Это приемлемо: во фронте нет `v-html`/`innerHTML`, Vue экранирует интерполяции, cookies/auth нет — XSS-поверхность минимальна. Путь возврата: переезд на Cloudflare Pages (там `_headers` оживёт) либо meta-tag CSP (без `frame-ancestors`/`report-uri`/`sandbox`).

## Изображения карт

Картинки живут в R2 за кастомным доменом и раздаются самим Cloudflare — воркер трафиком не нагружается, фронт тянет по 3 картинки на расклад напрямую. Всё в бесплатном тарифе R2 (10 ГБ, 10M чтений/мес).

- Источник: `temp/Cards-png/*.png` (в репозиторий не коммитится, см. корневой `.gitignore`).
- Конвертация: `temp/convert-webp.sh` (`cwebp -q 82`) → `temp/webp/tarot/*.webp`, 21 МБ → ~3 МБ. Имена 1-в-1, только расширение `.webp`.
- Заливка: вручную через UI дашборда в `tarot/` бакета (79 файлов: 78 карт + `CardBacks.webp`). Автоматизации в CI нет сознательно — набор статичный.
- Связка с кодом: `worker/src/tarot/deck.ts` хранит PNG-имена набора, `worker/src/tarot/images.ts` маппит их в WebP-ключи и строит абсолютные URL от `TAROT_IMAGE_BASE_URL`. API отдаёт `cards[].imageUrl` + `backImageUrl` (пустые строки, если base не задан, — фронт тогда рисует только текст).
- Перевёрнутые карты — CSS `rotate-180` во фронте (`TarotCardImage.vue`), вторых файлов не нужно; рубашка показывается пока лицо грузится.

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
`oracle` (валидация вопроса), `tarot` (колода 78, вытягивание + монетка положения,
промт с эталонными значениями, сверка расклада с вытянутыми картами, workflow),
`providers` (фабрика, конфиг, каждый провайдер с подменённым fetch),
`http` (CORS, IP, лимитеры) и `handler` (весь флоу со стабом провайдера через DI);
во фронте — `app/services/oracleApi` (успех, коды ошибок, `retry_after` из тела и заголовка) и `app/services/oracleErrors` (склонения, `retry`-тексты). Те же команды гоняются в CI до деплоя.

## Когда включать Turnstile

Сейчас antibot-слой — только rate limits (10/мин с IP, 100/мин глобально).
Этого хватает, пока нет признаков абуза. Триггеры переходить на Cloudflare
Turnstile: устойчивые `429` у живых пользователей, заметное сгорание квоты LLM,
подозрение на ротацию IPv6 (per-IP лимит против неё бессилен — адресов
бесконечно, identity без аккаунтов нет). Интеграция тогда: виджет во фронте →
токен в теле `ask` → проверка через `siteverify` в воркере → новый код ошибки.
Мониторинг до тех пор — ручной `wrangler tail` и коды `rate_limited` в логах.

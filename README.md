# Оракул — расклад Таро из трёх карт

**Демо: https://oracle.fivemanarmy.ru**

Мистический одностраничник: задаёшь вопрос — получаешь расклад
«прошлое / настоящее / будущее» с толкованием от LLM. Живёт на
GitHub Pages + Cloudflare Workers.

```text
Nuxt-статика (GitHub Pages)
  │ POST { question }
  ▼
Cloudflare Worker (валидация → 3 карты + положение → промпт → LLM → проверка)
  │ HTTPS
  ▼
OpenRouter → Groq (fallback)
```

Карты тянет сервер из полной колоды (78, Райдер–Уэйт), положение
прямая/перевёрнутая — монеткой. Модель их только толкует, выбрать
свои не может. Картинки — WebP в S3-совместимом хранилище.

## Структура

```text
frontend/   # Nuxt 4, app-like экраны с motion-v
worker/     # Cloudflare Worker, TypeScript + vitest
docs/       # ARCHITECTURE.md, VISUAL_GUIDE.md
temp/       # исходники колоды и конвертер в WebP (в git не едет)
```

## Локальный запуск

```bash
cd frontend && npm install && npm run dev   # http://localhost:3000
```

В dev внизу экрана — панель `dev`: превью загрузки, карт и финала
без бэкенда. Проверки: `npm run lint`, `npm run typecheck`, `npm run test`
в каждом пакете (`worker`: ещё `npm run check`).

## Переменные в Github Actions

### Variavles

`CLOUDFLARE_ACCOUNT_ID` - cf аккаунт
`CLOUDFLARE_WORKER_URL` - адрес cf воркера
`OPENROUTER_MODEL` - название модели openrouter | openai/gpt-oss-20b
`GROQ_MODEL` - название модели groq | qwen/qwen3.8-27b:free
`ORACLE_PROVIDERS` - цепочка провайдеров через запятую, первый — primary | openrouter,groq,orca
`ORACLE_MAX_TOKENS` - максимальное количество токенов в ответе | 2500
`ORACLE_TEMPERATURE` - температура модели, больше - эзотеричнее | 0.8
`ORACLE_TIMEOUT` - сбор запроса при долгом ответе | 45
`CORS_ALLOWED_ORIGINS` - разрешеные домены для запроса к воркеру
`SITE_URL` - домен сайта
`SITE_BASE_PATH` - путь к сайту | /
`TAROT_IMAGE_BASE_URL` - адрес s3 хранилища

### Secrets

`CLOUDFLARE_API_TOKEN`
`GROQ_API_KEY`
`OPENROUTER_API_KEY`
`ORCA_API_KEY`

## Документация

- `docs/ARCHITECTURE.md` — устройство, API, деплой, чеклист переезда на домен
- `docs/VISUAL_GUIDE.md` — палитра, шрифты, компоненты (по мотивам evgenia)

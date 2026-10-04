# Oracle — визуальный гайд

Основа — личный сайт https://evgenia.fivemanarmy.ru/
(исходники: соседний репозиторий `evgenia`, Astro + Tailwind).
Настроение одной строкой: **тёмный мистически-редакционный люкс —
чернильный мрак, звёздная пыль, латунь, острая serif-типографика.**

Этот документ — единственный источник визуальных решений.
Будущий агент: сначала читай его, потом `app/assets/css/main.css`.

## Правила (коротко)

1. Ни одного цвета вне `@theme` в `main.css`. Нашёл hex в компоненте — выноси в токен.
2. Скруглений нет: все радиусы `0`. Исключение — только круглые доты/орбы
   (`rounded-full` там, где круг задуман, не прямоугольник).
3. Один акцент — `brass`. Никаких вторых акцентных цветов
   (`rose` — только hover-подложка карточек в `rgba(91,38,61,0.12)`).
4. Шрифты всегда с кириллицей (`subsets: [cyrillic, latin]`).
5. Заголовки/цитаты/цифры — serif, интерфейс/кнопки/подписи — sans.
   Курсив в serif — для акцентных слов, не для абзацев.

## Палитра

### Ядро

| Токен | HEX | Использование |
| --- | --- | --- |
| `ink` | `#0B0B14` | Фон `body`, панелей-низа |
| `paper` | `#EEE7D8` | Основной текст |
| `brass` | `#C9A96E` | Единственный акцент: eyebrow, кнопки, цены, звёзды, бордеры |
| `muted` | `#B4A9A1` | Приглушённый текст (подзаголовки, описания) |

### Поверхности

| Токен | HEX | Использование |
| --- | --- | --- |
| `panel` | `#0D0D17` | Панели, карточки |
| `raise` | `#11101E` | Приподнятые поверхности, инпуты (`rgba(0,0,0,0.12)` поверх) |
| `hero-top` | `#28172E` | Верх hero-градиента |
| `card-hover` | `rgba(91,38,61,0.12)` | Hover-фон карточек (единственное место `rose`) |

### Текст: шкала warm-gray (тёмный → светлый)

`#514A4A` (неактивные доты) → `#736C6E` (футер) → `#81777A` (мелкие подписи) →
`#8D8382`, `#918483` → `#978C8A`, `#9B9090` (текст карточек) →
`#A69B98`, `#A79C98` (ссылки) → `#B4A9A1` (`muted`) → `#BDB0A9` (цитаты) →
`#EEE7D8` (`paper`).

В `@theme` держим только используемые ступени (см. `main.css`),
новые ступени добавляем только с местом использования.

### Бордеры (все `1px solid`)

| Значение | Использование |
| --- | --- |
| `rgba(201,169,110,0.13)` | Разделители nav/футер |
| `rgba(201,169,110,0.16–0.18)` | Рамки карточек, фреймов |
| `rgba(201,169,110,0.2)` | Рамки инпутов |
| `rgba(201,169,110,0.55)` | Внутренняя рамка карт таро |
| `#9B7B47` | Внешняя рамка кнопок и карт таро, hover-цвет карточек |
| `#7D643A` | Рамка CTA в навигации |

### Свечения и фоны

- Hero-градиент: `radial-gradient(ellipse at 50% 38%, #28172E 0%, #11101E 36%, #0B0B14 70%)`.
- Глоу: `500×400px, #632743, blur(110px), opacity 0.18`.
- Свечение карт: `box-shadow: 0 0 55px #792C50`.
- Звёздное поле: два слоя `radial-gradient(... 1px, transparent 1px)`
  (`paper` + `brass`), `background-size: 173px 197px, 271px 229px`,
  `opacity 0.28–0.35`, дрейф `translateY(30px)` 18–27с.
- Фон всегда: `position: relative + overflow: hidden`, контент `z-index ≥ 1`.

## Типографика

- `display: 'Cormorant Garamond', serif` — заголовки, цены, цитаты, `em`,
  инпуты. Веса `400/500/600` + `italic`.
- `sans: 'Manrope', sans-serif` — `body`, кнопки, eyebrow, лейблы.
  Веса `400/500/600`.

| Элемент | Стиль |
| --- | --- |
| `h1` hero | `400 clamp(80px,11vw,170px)/0.72, ls -0.055em`; акцент — `brass italic` |
| `h2` | `400 clamp(55px,6vw,92px)/0.9, ls -0.04em` |
| `h3` в карточке | `40px` |
| Подзаголовок hero | `italic 26px/1.35 display, muted` |
| Текст карточек | `20px/1.5 display` + warm-gray |
| Цитаты | `italic 29–34px/1.4 display` |
| Цифры (цены/stats) | `43–50px display, brass` |
| `eyebrow` | `11px sans uppercase, ls 0.27em, brass` |
| Кнопки | `11px uppercase, ls 0.27em` (токен `tracking-overline`; в оригинале `0.2em`, унифицировано) |
| Лейблы формы | `10px uppercase, ls 0.18em` |
| Мелкие подписи | `9–10px uppercase, ls 0.15–0.2em` |

## Компоненты

### Кнопки

Прозрачный фон, бордер `#9B7B47`, текст `brass`, `padding 21px 34px`,
`11px uppercase ls 0.2em`, `transition .25s`. Hover — инверсия:
фон `brass`, текст `ink`. Залитый вариант — фон `rgba(201,169,110,0.13)`.
Текстовые ссылки: warm-gray, hover `brass`, стрелка `→`/`↓` 16–18px.

### Карточки

`min-height 390px, padding 38px 45px, border rgba(201,169,110,0.18)`.
Hover: `border-color #9B7B47`, фон `rgba(91,38,61,0.12)`,
`transform: translateY(-5px), transition .3s`. Символ сверху `25px brass`,
заголовок с отступом, разделитель `mini-rule`.

### Разделители

`gold-rule: 76×1px, linear-gradient(90deg, brass, transparent)`.
По центру (`margin: 30px auto`) или влево в текстовых блоках.

### Eyebrow

`11px sans uppercase ls 0.27em brass`, под ним `margin-bottom: 20px`.

### Карты таро

Двойная рамка: внешняя `#9B7B47`, внутренняя `rgba(201,169,110,0.55)`
с отступом; `box-shadow: 0 0 55px #792C50`; лёгкий наклон/флоат
для декоративных (в раскладе — строго прямо).

### Форма

Лейблы `10px uppercase ls 0.18em`, инпуты `18px display, paper`
на `rgba(0,0,0,0.12)`, `padding 17px`, бордер `0.2`, фокус — `brass`.
Успех — `brass italic 20px` по центру.

### Фото

Фрейм `padding 10px + border 0.16`, само фото `grayscale(1)
contrast(.9)`, поверх — wash-градиент, подпись `10px/1.7 ls 0.15em brass`
слева снизу.

## Маппинг старой темы oracle → эта

| Было (`night`-гамма) | Стало |
| --- | --- |
| `night #120d24`, `panel #1c1435`, `raise #171128` | `ink #0B0B14`, `panel #0D0D17`, `raise #11101E` |
| `accent/accent-soft #c8a9ff/#dac5ff`, `accent-ink` | `brass #C9A96E`, hover-инверсия в `ink` |
| `ink/ink-bright #f6f1ff/#fffaff` | `paper #EEE7D8` |
| `muted #a99ebf`, `faint`, `count`, `label` | Шкала warm-gray (`muted #B4A9A1` + ступени) |
| `confidence`, `verdict`, `prophecy`, `reason-*` | `paper`/`muted`/ступени шкалы (именованных «магических» токенов не держим) |
| `glow-top/bottom #8f62ff/#4d2d9a`, `grid #b99dff` | `#632743`, звёзды `paper/brass` |
| `warn/warn-line/warn-fill` | `brass`-бордеры; тёплый фон `#4e301c` → `rgba(201,169,110,0.13)` |
| `edge*/oracle-*/status-*` | Бордеры из таблицы выше; подложки `raise`/`panel` |
| `radius-button/field/card/panel 12–28px` | `0` везде |
| `shadow-lift/focus`, `animate-spin-fast` | Свечения вместо подъёма; спиннер оставить |
| `font-sans DM Sans`, `font-display Playfair` | `Manrope`, `Cormorant Garamond` (cyrillic+latin) |

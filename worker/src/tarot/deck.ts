export type Arcana = "major" | "minor";

export interface DeckCard {
  id: string;
  nameRu: string;
  arcana: Arcana;
  suit?: "wands" | "cups" | "pentacles" | "swords";
  /** Эталонное значение прямой карты. Даётся провайдеру в промте. */
  meaningUp: string;
  /** Эталонное значение перевёрнутой карты. Даётся провайдеру в промте. */
  meaningRev: string;
  image: string;
}

export const FULL_DECK: readonly DeckCard[] = [
  // --- Старшие Арканы (id сохранены для совместимости) ---
  {
    id: "the-fool",
    nameRu: "Шут",
    arcana: "major",
    meaningUp:
      "Легкомыслие, мания, экстравагантность, опьянение, бред, неистовство, разоблачение.",
    meaningRev:
      "Невнимательность, отрешённость, рассеянность, беспечность, апатия, пустота, тщеславие.",
    image: "00-TheFool.png",
  },
  {
    id: "the-magician",
    nameRu: "Маг",
    arcana: "major",
    meaningUp:
      "Мастерство, дипломатия, ловкость; уверенность в себе, воля; также болезнь, потери, козни врагов.",
    meaningRev: "Душевная болезнь, позор, беспокойство.",
    image: "01-TheMagician.png",
  },
  {
    id: "the-high-priestess",
    nameRu: "Верховная Жрица",
    arcana: "major",
    meaningUp:
      "Тайны, мистерия, будущее пока сокрыто; молчание, упорство; мудрость, наука.",
    meaningRev: "Страсть, пыл, самомнение, поверхностные знания.",
    image: "02-TheHighPriestess.png",
  },
  {
    id: "the-empress",
    nameRu: "Императрица",
    arcana: "major",
    meaningUp:
      "Плодородие, действие, инициатива, долголетие; также трудности, сомнения, неведение.",
    meaningRev:
      "Свет, истина, распутывание сложных дел, всеобщее ликование; по другому толкованию — колебания.",
    image: "03-TheEmpress.png",
  },
  {
    id: "the-emperor",
    nameRu: "Император",
    arcana: "major",
    meaningUp:
      "Стабильность, власть, защита, осуществление; помощь, разум, убеждённость; авторитет и воля.",
    meaningRev:
      "Доброжелательность, сострадание; замешательство врагов, препятствия, незрелость.",
    image: "04-TheEmperor.png",
  },
  {
    id: "the-hierophant",
    nameRu: "Иерофант",
    arcana: "major",
    meaningUp:
      "Брак, союз; милосердие и доброта; вдохновение; человек, к которому обращаются за помощью.",
    meaningRev:
      "Общество, взаимопонимание, согласие; чрезмерная доброта, слабость.",
    image: "05-TheHierophant.png",
  },
  {
    id: "the-lovers",
    nameRu: "Влюблённые",
    arcana: "major",
    meaningUp: "Влечение, любовь, красота, преодолённые испытания.",
    meaningRev:
      "Неудача, безрассудные замыслы, расстроенная свадьба, противоречия.",
    image: "06-TheLovers.png",
  },
  {
    id: "the-chariot",
    nameRu: "Колесница",
    arcana: "major",
    meaningUp:
      "Помощь, провидение, триумф; также война, самонадеянность, месть, тревоги.",
    meaningRev: "Бунт, ссора, спор, тяжба, поражение.",
    image: "07-TheChariot.png",
  },
  {
    id: "strength",
    nameRu: "Сила",
    arcana: "major",
    meaningUp:
      "Сила, энергия, действие, смелость, великодушие; полный успех и почести.",
    meaningRev:
      "Деспотизм, злоупотребление силой, слабость, раздор, иногда позор.",
    image: "08-Strength.png",
  },
  {
    id: "the-hermit",
    nameRu: "Отшельник",
    arcana: "major",
    meaningUp:
      "Благоразумие, осмотрительность; а также предательство, притворство, плутовство.",
    meaningRev: "Скрытность, маскировка, страх, необоснованная осторожность.",
    image: "09-TheHermit.png",
  },
  {
    id: "wheel-of-fortune",
    nameRu: "Колесо Фортуны",
    arcana: "major",
    meaningUp: "Судьба, удача, успех, возвышение, счастье.",
    meaningRev: "Прирост, изобилие, избыток.",
    image: "10-WheelOfFortune.png",
  },
  {
    id: "justice",
    nameRu: "Справедливость",
    arcana: "major",
    meaningUp:
      "Справедливость, честность, неподкупность; торжество правой стороны в суде.",
    meaningRev:
      "Буква закона, юридические сложности, фанатизм, предвзятость, чрезмерная строгость.",
    image: "11-Justice.png",
  },
  {
    id: "the-hanged-man",
    nameRu: "Повешенный",
    arcana: "major",
    meaningUp:
      "Мудрость, осмотрительность, проницательность, испытания, жертва, интуиция, предвидение.",
    meaningRev: "Эгоизм, толпа, её интересы.",
    image: "12-TheHangedMan.png",
  },
  {
    id: "death",
    nameRu: "Смерть",
    arcana: "major",
    meaningUp:
      "Конец, разрушение; потеря покровителя; крушение брачных планов.",
    meaningRev: "Застой, сон, летаргия, оцепенение; разрушенная надежда.",
    image: "13-Death.png",
  },
  {
    id: "temperance",
    nameRu: "Умеренность",
    arcana: "major",
    meaningUp: "Бережливость, умеренность, хозяйственность, умение ладить.",
    meaningRev: "Разлад, неудачные союзы, соперничающие интересы.",
    image: "14-Temperance.png",
  },
  {
    id: "the-devil",
    nameRu: "Дьявол",
    arcana: "major",
    meaningUp:
      "Разорение, насилие, натиск, рок; предопределённое, но не обязательно злое.",
    meaningRev: "Злой рок, слабость, мелочность, слепота.",
    image: "15-TheDevil.png",
  },
  {
    id: "the-tower",
    nameRu: "Башня",
    arcana: "major",
    meaningUp:
      "Бедствие, нужда, крушение, позор, обман, гибель; внезапная катастрофа.",
    meaningRev: "То же в меньшей степени; угнетение, заточение, тирания.",
    image: "16-TheTower.png",
  },
  {
    id: "the-star",
    nameRu: "Звезда",
    arcana: "major",
    meaningUp:
      "Потеря, кража, лишения; по другому толкованию — надежда и светлые перспективы.",
    meaningRev: "Высокомерие, надменность, бессилие.",
    image: "17-TheStar.png",
  },
  {
    id: "the-moon",
    nameRu: "Луна",
    arcana: "major",
    meaningUp:
      "Скрытые враги, опасность, клевета, тьма, страх, обман, заблуждение.",
    meaningRev:
      "Непостоянство, молчание, обман и заблуждения в меньшей степени.",
    image: "18-TheMoon.png",
  },
  {
    id: "the-sun",
    nameRu: "Солнце",
    arcana: "major",
    meaningUp: "Материальное счастье, удачный брак, довольство.",
    meaningRev: "То же, но в меньшей степени.",
    image: "19-TheSun.png",
  },
  {
    id: "judgement",
    nameRu: "Суд",
    arcana: "major",
    meaningUp:
      "Перемена положения, обновление, итог; по другому толкованию — полный проигрыш тяжбы.",
    meaningRev: "Слабость, малодушие; обдумывание, решение, приговор.",
    image: "20-Judgement.png",
  },
  {
    id: "the-world",
    nameRu: "Мир",
    arcana: "major",
    meaningUp: "Верный успех, награда, путешествие, переезд, перемена места.",
    meaningRev: "Застой, неподвижность, стагнация, постоянство.",
    image: "21-TheWorld.png",
  },
  // --- Младшие Арканы: Жезлы ---
  {
    id: "ace-of-wands",
    nameRu: "Туз Жезлов",
    arcana: "minor",
    suit: "wands",
    meaningUp:
      "Творение, начинание, предприятие, истоки; рождение, семья; деньги, наследство.",
    meaningRev: "Падение, упадок, крушение, гибель; омрачённая радость.",
    image: "Wands01.png",
  },
  {
    id: "two-of-wands",
    nameRu: "Двойка Жезлов",
    arcana: "minor",
    suit: "wands",
    meaningUp:
      "Богатство и великолепие — либо страдание, тоска и унижение; власть и грусть властителя.",
    meaningRev: "Неожиданность, удивление, волнение, страх.",
    image: "Wands02.png",
  },
  {
    id: "three-of-wands",
    nameRu: "Тройка Жезлов",
    arcana: "minor",
    suit: "wands",
    meaningUp: "Прочность, торговля, открытие; удачное деловое партнёрство.",
    meaningRev: "Конец бед, передышка, прекращение невзгод.",
    image: "Wands03.png",
  },
  {
    id: "four-of-wands",
    nameRu: "Четвёрка Жезлов",
    arcana: "minor",
    suit: "wands",
    meaningUp: "Приют, отдых, согласие, гармония, процветание, мир.",
    meaningRev: "Значение не меняется: процветание, счастье, красота.",
    image: "Wands04.png",
  },
  {
    id: "five-of-wands",
    nameRu: "Пятёрка Жезлов",
    arcana: "minor",
    suit: "wands",
    meaningUp:
      "Соревнование, борьба за богатство; битва жизни; золото, выгода.",
    meaningRev: "Тяжбы, споры, обман, противоречия.",
    image: "Wands05.png",
  },
  {
    id: "six-of-wands",
    nameRu: "Шестёрка Жезлов",
    arcana: "minor",
    suit: "wands",
    meaningUp: "Победа, триумф; добрые вести; оправдавшиеся надежды.",
    meaningRev: "Страх перед врагом, предательство, задержки.",
    image: "Wands06.png",
  },
  {
    id: "seven-of-wands",
    nameRu: "Семёрка Жезлов",
    arcana: "minor",
    suit: "wands",
    meaningUp:
      "Доблесть, преимущество позиции; переговоры, торговая война; успех.",
    meaningRev: "Растерянность, тревога; предостережение от нерешительности.",
    image: "Wands07.png",
  },
  {
    id: "eight-of-wands",
    nameRu: "Восьмёрка Жезлов",
    arcana: "minor",
    suit: "wands",
    meaningUp:
      "Скорость, стремительность; вести, спешащие к счастливому концу; стрелы любви.",
    meaningRev: "Стрелы ревности, укоры совести, семейные ссоры.",
    image: "Wands08.png",
  },
  {
    id: "nine-of-wands",
    nameRu: "Девятка Жезлов",
    arcana: "minor",
    suit: "wands",
    meaningUp: "Сила в обороне; готовность смело встретить натиск; проволочки.",
    meaningRev: "Препятствия, невзгоды, бедствия.",
    image: "Wands09.png",
  },
  {
    id: "ten-of-wands",
    nameRu: "Десятка Жезлов",
    arcana: "minor",
    suit: "wands",
    meaningUp: "Гнёт, бремя успеха; богатство и его тяготы; притворство.",
    meaningRev: "Противоречия, трудности, интриги.",
    image: "Wands10.png",
  },
  {
    id: "page-of-wands",
    nameRu: "Паж Жезлов",
    arcana: "minor",
    suit: "wands",
    meaningUp:
      "Верный посланник, добрые вести; молодой человек, готовый помочь; семейные новости.",
    meaningRev: "Сплетни, дурные вести, нерешительность, нестабильность.",
    image: "Wands11.png",
  },
  {
    id: "knight-of-wands",
    nameRu: "Рыцарь Жезлов",
    arcana: "minor",
    suit: "wands",
    meaningUp:
      "Отъезд, отсутствие, бегство, переезд; перемена места жительства.",
    meaningRev: "Разрыв, разлад, ссора.",
    image: "Wands12.png",
  },
  {
    id: "queen-of-wands",
    nameRu: "Королева Жезлов",
    arcana: "minor",
    suit: "wands",
    meaningUp: "Дружелюбная, честная женщина; успех в делах; любовь к деньгам.",
    meaningRev: "Ревность, противодействие, обман, неверность.",
    image: "Wands13.png",
  },
  {
    id: "king-of-wands",
    nameRu: "Король Жезлов",
    arcana: "minor",
    suit: "wands",
    meaningUp:
      "Честный, добросовестный мужчина; честные вести; неожиданное наследство.",
    meaningRev: "Строгость, суровость — но с терпимостью.",
    image: "Wands14.png",
  },
  // --- Младшие Арканы: Кубки ---
  {
    id: "ace-of-cups",
    nameRu: "Туз Кубков",
    arcana: "minor",
    suit: "cups",
    meaningUp:
      "Дом истинного сердца: радость, довольство, изобилие, плодородие.",
    meaningRev: "Дом ложного сердца: изменчивость, переворот.",
    image: "Cups01.png",
  },
  {
    id: "two-of-cups",
    nameRu: "Двойка Кубков",
    arcana: "minor",
    suit: "cups",
    meaningUp: "Любовь, дружба, союз, согласие, симпатия.",
    meaningRev: "Похоть, жадность, ревность, неутолённые желания.",
    image: "Cups02.png",
  },
  {
    id: "three-of-cups",
    nameRu: "Тройка Кубков",
    arcana: "minor",
    suit: "cups",
    meaningUp: "Счастливый исход, победа, исполнение, исцеление.",
    meaningRev: "Избыток чувственных удовольствий; спешка, завершение.",
    image: "Cups03.png",
  },
  {
    id: "four-of-cups",
    nameRu: "Четвёрка Кубков",
    arcana: "minor",
    suit: "cups",
    meaningUp:
      "Пресыщение, отвращение, воображаемые огорчения; смешанное удовольствие.",
    meaningRev: "Новизна, предзнаменование, новые связи.",
    image: "Cups04.png",
  },
  {
    id: "five-of-cups",
    nameRu: "Пятёрка Кубков",
    arcana: "minor",
    suit: "cups",
    meaningUp:
      "Потеря, но не всё потеряно; наследство, передача; брак с горечью.",
    meaningRev: "Новости, союзы, возвращение; ложные планы.",
    image: "Cups05.png",
  },
  {
    id: "six-of-cups",
    nameRu: "Шестёрка Кубков",
    arcana: "minor",
    suit: "cups",
    meaningUp: "Прошлое и воспоминания; счастье из прошлого; ушедшее.",
    meaningRev: "Будущее, обновление, то, что ещё придёт.",
    image: "Cups06.png",
  },
  {
    id: "seven-of-cups",
    nameRu: "Семёрка Кубков",
    arcana: "minor",
    suit: "cups",
    meaningUp: "Плоды фантазии, грёзы; достижения зыбкие, непрочные.",
    meaningRev: "Желание, воля, решимость, замысел.",
    image: "Cups07.png",
  },
  {
    id: "eight-of-cups",
    nameRu: "Восьмёрка Кубков",
    arcana: "minor",
    suit: "cups",
    meaningUp: "Угасание дела; то, что казалось важным, оказалось маловажным.",
    meaningRev: "Великая радость, веселье, пир.",
    image: "Cups08.png",
  },
  {
    id: "nine-of-cups",
    nameRu: "Девятка Кубков",
    arcana: "minor",
    suit: "cups",
    meaningUp: "Согласие, довольство, победа, успех.",
    meaningRev: "Правда, верность, свобода; также ошибки и несовершенства.",
    image: "Cups09.png",
  },
  {
    id: "ten-of-cups",
    nameRu: "Десятка Кубков",
    arcana: "minor",
    suit: "cups",
    meaningUp: "Полное довольство сердца; совершенство любви и дружбы.",
    meaningRev: "Ложное довольство, гнев, насилие.",
    image: "Cups10.png",
  },
  {
    id: "page-of-cups",
    nameRu: "Паж Кубков",
    arcana: "minor",
    suit: "cups",
    meaningUp:
      "Юноша, готовый услужить; новости, послание; размышление, учёба.",
    meaningRev: "Склонность, привязанность; соблазн, обман.",
    image: "Cups11.png",
  },
  {
    id: "knight-of-cups",
    nameRu: "Рыцарь Кубков",
    arcana: "minor",
    suit: "cups",
    meaningUp: "Прибытие вестника; предложение, приглашение.",
    meaningRev: "Хитрость, мошенничество, обман.",
    image: "Cups12.png",
  },
  {
    id: "queen-of-cups",
    nameRu: "Королева Кубков",
    arcana: "minor",
    suit: "cups",
    meaningUp:
      "Добрая, честная женщина; дар предвидения; успех, счастье, мудрость.",
    meaningRev: "Женщина, которой нельзя доверять; порок, бесчестье.",
    image: "Cups13.png",
  },
  {
    id: "king-of-cups",
    nameRu: "Король Кубков",
    arcana: "minor",
    suit: "cups",
    meaningUp:
      "Справедливый человек, готовый помочь; честность, творческий ум.",
    meaningRev: "Нечестный человек; мошенничество, несправедливость, убытки.",
    image: "Cups14.png",
  },
  // --- Младшие Арканы: Пентакли ---
  {
    id: "ace-of-pentacles",
    nameRu: "Туз Пентаклей",
    arcana: "minor",
    suit: "pentacles",
    meaningUp: "Полное довольство, восторг; золото.",
    meaningRev:
      "Тёмная сторона богатства; процветание, но сомнительной пользы.",
    image: "Pentacles01.png",
  },
  {
    id: "two-of-pentacles",
    nameRu: "Двойка Пентаклей",
    arcana: "minor",
    suit: "pentacles",
    meaningUp: "Веселье, игра; письменные вести; препятствия, хлопоты.",
    meaningRev: "Напускное веселье; письма, документы.",
    image: "Pentacles02.png",
  },
  {
    id: "three-of-pentacles",
    nameRu: "Тройка Пентаклей",
    arcana: "minor",
    suit: "pentacles",
    meaningUp: "Мастерство, ремесло; знатность, слава.",
    meaningRev: "Посредственность, мелочность, слабость.",
    image: "Pentacles03.png",
  },
  {
    id: "four-of-pentacles",
    nameRu: "Четвёрка Пентаклей",
    arcana: "minor",
    suit: "pentacles",
    meaningUp: "Прочность владений; дар, наследство.",
    meaningRev: "Подвешенность, задержки, противодействие.",
    image: "Pentacles04.png",
  },
  {
    id: "five-of-pentacles",
    nameRu: "Пятёрка Пентаклей",
    arcana: "minor",
    suit: "pentacles",
    meaningUp: "Материальные беды, нищета; также любовь и согласие.",
    meaningRev: "Беспорядок, крушение, раздор, мотовство.",
    image: "Pentacles05.png",
  },
  {
    id: "six-of-pentacles",
    nameRu: "Шестёрка Пентаклей",
    arcana: "minor",
    suit: "pentacles",
    meaningUp: "Дары, милости; внимание, бдительность; нынешнее процветание.",
    meaningRev: "Желание, зависть, ревность, иллюзия.",
    image: "Pentacles06.png",
  },
  {
    id: "seven-of-pentacles",
    nameRu: "Семёрка Пентаклей",
    arcana: "minor",
    suit: "pentacles",
    meaningUp: "Деньги, торговля; либо ссоры; либо невинность.",
    meaningRev: "Тревога о деньгах, данных в долг.",
    image: "Pentacles07.png",
  },
  {
    id: "eight-of-pentacles",
    nameRu: "Восьмёрка Пентаклей",
    arcana: "minor",
    suit: "pentacles",
    meaningUp: "Работа, ремесло, мастерство; подготовительный этап.",
    meaningRev: "Тщеславие, алчность, ростовщичество; хитрость.",
    image: "Pentacles08.png",
  },
  {
    id: "nine-of-pentacles",
    nameRu: "Девятка Пентаклей",
    arcana: "minor",
    suit: "pentacles",
    meaningUp: "Благоразумие, успех, уверенность, проницательность.",
    meaningRev: "Плутовство, обман, сорванные планы.",
    image: "Pentacles09.png",
  },
  {
    id: "ten-of-pentacles",
    nameRu: "Десятка Пентаклей",
    arcana: "minor",
    suit: "pentacles",
    meaningUp: "Выгода, богатство; семейные дела, дом.",
    meaningRev: "Случай, потеря, кража; иногда дар, приданое.",
    image: "Pentacles10.png",
  },
  {
    id: "page-of-pentacles",
    nameRu: "Паж Пентаклей",
    arcana: "minor",
    suit: "pentacles",
    meaningUp: "Прилежание, учёба, размышление; вести и вестник.",
    meaningRev: "Расточительность, роскошь; дурные вести.",
    image: "Pentacles11.png",
  },
  {
    id: "knight-of-pentacles",
    nameRu: "Рыцарь Пентаклей",
    arcana: "minor",
    suit: "pentacles",
    meaningUp: "Польза, ответственность, прямота.",
    meaningRev: "Застой, праздность, беспечность.",
    image: "Pentacles12.png",
  },
  {
    id: "queen-of-pentacles",
    nameRu: "Королева Пентаклей",
    arcana: "minor",
    suit: "pentacles",
    meaningUp: "Богатство, щедрость, безопасность, свобода.",
    meaningRev: "Зло, подозрения, страх, недоверие.",
    image: "Pentacles13.png",
  },
  {
    id: "king-of-pentacles",
    nameRu: "Король Пентаклей",
    arcana: "minor",
    suit: "pentacles",
    meaningUp: "Деловая хватка, ум, успех в делах.",
    meaningRev: "Порок, слабость, извращённость, опасность.",
    image: "Pentacles14.png",
  },
  // --- Младшие Арканы: Мечи ---
  {
    id: "ace-of-swords",
    nameRu: "Туз Мечей",
    arcana: "minor",
    suit: "swords",
    meaningUp: "Триумф, завоевание; огромная сила в любви и ненависти.",
    meaningRev: "Та же сила с гибельным исходом; зачатие, прибавление.",
    image: "Swords01.png",
  },
  {
    id: "two-of-swords",
    nameRu: "Двойка Мечей",
    arcana: "minor",
    suit: "swords",
    meaningUp: "Равновесие, мужество, дружба; нежность.",
    meaningRev: "Самозванство, ложь, двуличие.",
    image: "Swords02.png",
  },
  {
    id: "three-of-swords",
    nameRu: "Тройка Мечей",
    arcana: "minor",
    suit: "swords",
    meaningUp: "Разлука, разрыв, рассеяние.",
    meaningRev: "Отчуждение ума, ошибки, смятение.",
    image: "Swords03.png",
  },
  {
    id: "four-of-swords",
    nameRu: "Четвёрка Мечей",
    arcana: "minor",
    suit: "swords",
    meaningUp: "Бдительность, уединение, отдых, изгнание.",
    meaningRev: "Мудрое управление, осмотрительность, бережливость.",
    image: "Swords04.png",
  },
  {
    id: "five-of-swords",
    nameRu: "Пятёрка Мечей",
    arcana: "minor",
    suit: "swords",
    meaningUp: "Унижение, разрушение, бесчестье, потери.",
    meaningRev: "То же; похороны.",
    image: "Swords05.png",
  },
  {
    id: "six-of-swords",
    nameRu: "Шестёрка Мечей",
    arcana: "minor",
    suit: "swords",
    meaningUp: "Путешествие по воде, путь, поручение.",
    meaningRev: "Признание, огласка; предложение руки.",
    image: "Swords06.png",
  },
  {
    id: "seven-of-swords",
    nameRu: "Семёрка Мечей",
    arcana: "minor",
    suit: "swords",
    meaningUp: "Замысел, надежда; ссора; план, что может рухнуть.",
    meaningRev: "Добрый совет; клевета, болтовня.",
    image: "Swords07.png",
  },
  {
    id: "eight-of-swords",
    nameRu: "Восьмёрка Мечей",
    arcana: "minor",
    suit: "swords",
    meaningUp: "Дурные вести, кризис, осуждение, конфликт; болезнь.",
    meaningRev: "Тревога, препятствия, предательство; рок.",
    image: "Swords08.png",
  },
  {
    id: "nine-of-swords",
    nameRu: "Девятка Мечей",
    arcana: "minor",
    suit: "swords",
    meaningUp: "Смерть, неудача, обман, отчаяние.",
    meaningRev: "Плен, подозрения, страх, стыд.",
    image: "Swords09.png",
  },
  {
    id: "ten-of-swords",
    nameRu: "Десятка Мечей",
    arcana: "minor",
    suit: "swords",
    meaningUp: "Боль, слёзы, скорбь, опустошение.",
    meaningRev: "Выгода, успех, власть — но непрочные.",
    image: "Swords10.png",
  },
  {
    id: "page-of-swords",
    nameRu: "Паж Мечей",
    arcana: "minor",
    suit: "swords",
    meaningUp: "Власть, надзор, слежка, проверка.",
    meaningRev: "Неподготовленность; болезнь.",
    image: "Swords11.png",
  },
  {
    id: "knight-of-swords",
    nameRu: "Рыцарь Мечей",
    arcana: "minor",
    suit: "swords",
    meaningUp: "Храбрость, защита; гнев, война, разрушение.",
    meaningRev: "Неблагоразумие, неспособность, расточительность.",
    image: "Swords12.png",
  },
  {
    id: "queen-of-swords",
    nameRu: "Королева Мечей",
    arcana: "minor",
    suit: "swords",
    meaningUp: "Вдовство, печаль, разлука, лишения.",
    meaningRev: "Злоба, фанатизм, обман, лицемерие.",
    image: "Swords13.png",
  },
  {
    id: "king-of-swords",
    nameRu: "Король Мечей",
    arcana: "minor",
    suit: "swords",
    meaningUp: "Суд и власть: повеление, закон, воинствующий ум.",
    meaningRev: "Жестокость, вероломство, злой умысел.",
    image: "Swords14.png",
  },
];

const BY_ID = new Map(FULL_DECK.map((card) => [card.id, card]));

/** Совместимость: прежнее имя экспорта для колоды Старших Арканов. */
export const MAJOR_ARCANA: readonly DeckCard[] = FULL_DECK.filter(
  (card) => card.arcana === "major",
);

export function deckCardById(id: string): DeckCard | undefined {
  return BY_ID.get(id);
}

export function isDeckId(id: unknown): id is string {
  return typeof id === "string" && BY_ID.has(id);
}

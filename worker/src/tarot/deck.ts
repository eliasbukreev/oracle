// Каноническая колода: 22 Старших Аркана Райдера-Уэйта.
// id — стабильный slug (контракт с фронтом для будущих изображений),
// nameRu — каноническое русское имя (единственный источник истины для текста).

export interface DeckCard {
  id: string;
  nameRu: string;
  number: number;
}

export const MAJOR_ARCANA: readonly DeckCard[] = [
  { id: "the-fool", nameRu: "Шут", number: 0 },
  { id: "the-magician", nameRu: "Маг", number: 1 },
  { id: "the-high-priestess", nameRu: "Верховная Жрица", number: 2 },
  { id: "the-empress", nameRu: "Императрица", number: 3 },
  { id: "the-emperor", nameRu: "Император", number: 4 },
  { id: "the-hierophant", nameRu: "Иерофант", number: 5 },
  { id: "the-lovers", nameRu: "Влюблённые", number: 6 },
  { id: "the-chariot", nameRu: "Колесница", number: 7 },
  { id: "strength", nameRu: "Сила", number: 8 },
  { id: "the-hermit", nameRu: "Отшельник", number: 9 },
  { id: "wheel-of-fortune", nameRu: "Колесо Фортуны", number: 10 },
  { id: "justice", nameRu: "Справедливость", number: 11 },
  { id: "the-hanged-man", nameRu: "Повешенный", number: 12 },
  { id: "death", nameRu: "Смерть", number: 13 },
  { id: "temperance", nameRu: "Умеренность", number: 14 },
  { id: "the-devil", nameRu: "Дьявол", number: 15 },
  { id: "the-tower", nameRu: "Башня", number: 16 },
  { id: "the-star", nameRu: "Звезда", number: 17 },
  { id: "the-moon", nameRu: "Луна", number: 18 },
  { id: "the-sun", nameRu: "Солнце", number: 19 },
  { id: "judgement", nameRu: "Суд", number: 20 },
  { id: "the-world", nameRu: "Мир", number: 21 },
];

const BY_ID = new Map(MAJOR_ARCANA.map((card) => [card.id, card]));

export function deckCardById(id: string): DeckCard | undefined {
  return BY_ID.get(id);
}

export function isDeckId(id: unknown): id is string {
  return typeof id === "string" && BY_ID.has(id);
}

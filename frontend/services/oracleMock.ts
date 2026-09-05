import type { OracleResponse } from '~/types/oracle'

const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds))

export async function createSession() {
  await wait(180)
  return { ready: true }
}

export async function askOracle(question: string): Promise<OracleResponse> {
  await wait(900)

  const normalizedQuestion = question.trim().toLowerCase()

  if (normalizedQuestion.includes('лимит')) {
    throw new Error('oracle_resting')
  }

  if (normalizedQuestion.includes('ошибка')) {
    throw new Error('oracle_unavailable')
  }

  const isPositive = /получится|стоит|учить|начать|да|успех/.test(normalizedQuestion)

  return {
    verdict: isPositive ? 'ДА' : 'ПУТЬ ОТКРЫТ',
    confidence: isPositive ? 87 : 74,
    prophecy: isPositive
      ? 'Ты уже стоишь у порога. Первый шаг будет самым важным, а дальше дорога проявится сама.'
      : 'Ответ скрыт в движении. Не жди идеального знака: ясность придет после первого действия.',
    reason: 'В твоем вопросе чувствуется готовность изменить привычный ход вещей. Оракул видит больше возможностей, чем препятствий.',
  }
}

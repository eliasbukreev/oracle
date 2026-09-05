import type { OracleErrorCode, OracleResponse } from '~/types/oracle'

type ApiErrorResponse = {
  error?: unknown
}

function isOracleResponse(value: unknown): value is OracleResponse {
  if (!value || typeof value !== 'object') {
    return false
  }

  const response = value as Record<string, unknown>

  return (
    typeof response.verdict === 'string' &&
    response.verdict.length > 0 &&
    typeof response.confidence === 'number' &&
    response.confidence >= 0 &&
    response.confidence <= 100 &&
    typeof response.prophecy === 'string' &&
    response.prophecy.length > 0 &&
    typeof response.reason === 'string' &&
    response.reason.length > 0
  )
}

function isOracleErrorCode(value: unknown): value is OracleErrorCode {
  return (
    value === 'invalid_request' ||
    value === 'invalid_client' ||
    value === 'oracle_resting' ||
    value === 'oracle_unavailable' ||
    value === 'internal_error'
  )
}

function errorCodeFromStatus(status: number): OracleErrorCode {
  if (status === 400) return 'invalid_request'
  if (status === 401) return 'invalid_client'
  if (status === 429) return 'oracle_resting'
  if (status === 502) return 'oracle_unavailable'
  return 'internal_error'
}

export async function askOracle(question: string, apiUrl: string): Promise<OracleResponse> {
  if (!apiUrl) {
    throw new Error('internal_error')
  }

  let response: Response

  try {
    response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ question }),
    })
  } catch {
    throw new Error('oracle_unavailable')
  }

  let payload: unknown

  try {
    payload = await response.json()
  } catch {
    throw new Error('oracle_unavailable')
  }

  if (!response.ok) {
    const apiError = payload && typeof payload === 'object' ? (payload as ApiErrorResponse) : {}
    const code = isOracleErrorCode(apiError.error) ? apiError.error : errorCodeFromStatus(response.status)

    throw new Error(code)
  }

  if (!isOracleResponse(payload)) {
    throw new Error('oracle_unavailable')
  }

  return payload
}

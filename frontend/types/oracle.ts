export type OracleResponse = {
  verdict: string
  confidence: number
  prophecy: string
  reason: string
}

export type OracleErrorCode =
  | 'invalid_request'
  | 'invalid_client'
  | 'oracle_resting'
  | 'oracle_unavailable'
  | 'internal_error'

export type OracleError = {
  code: OracleErrorCode
  message: string
}

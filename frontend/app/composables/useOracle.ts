import type { OracleError, OracleResponse } from "~/types/oracle";
import { OracleRequestError, askOracle } from "~/services/oracleApi";
import {
  errorMessages,
  restingMessage,
  toErrorCode,
} from "~/services/oracleErrors";

export function useOracle() {
  const config = useRuntimeConfig();
  const result = ref<OracleResponse | null>(null);
  const error = ref<OracleError | null>(null);
  const isLoading = ref(false);
  const retryIn = ref(0);
  const isResting = computed(() => error.value?.code === "oracle_resting");
  const isBlocked = ref(false);
  const blockedError = computed<OracleError>(() => ({
    code: "blocked",
    message: errorMessages.blocked,
  }));

  let retryTimer: ReturnType<typeof setInterval> | null = null;

  function stopRetryCountdown() {
    if (retryTimer !== null) {
      clearInterval(retryTimer);
      retryTimer = null;
    }

    retryIn.value = 0;
  }

  function startRetryCountdown(seconds: number) {
    stopRetryCountdown();

    if (seconds <= 0) {
      return;
    }

    retryIn.value = seconds;
    retryTimer = setInterval(() => {
      retryIn.value -= 1;

      if (retryIn.value <= 0) {
        stopRetryCountdown();

        // Оракул отдохнул — убираем плашку, можно спрашивать снова.
        if (error.value?.code === "oracle_resting") {
          error.value = null;
        }
      }
    }, 1000);
  }

  onUnmounted(() => {
    stopRetryCountdown();
  });

  async function ask(question: string) {
    const trimmedQuestion = question.trim();

    if (!trimmedQuestion || isLoading.value || isResting.value) {
      return;
    }

    isLoading.value = true;
    result.value = null;
    error.value = null;
    stopRetryCountdown();

    try {
      result.value = await askOracle(
        trimmedQuestion,
        config.public.oracleApiUrl,
      );

      // Раз ответ пришёл — сигнал проходит, баннер гасим.
      isBlocked.value = false;
    } catch (caughtError) {
      const requestError =
        caughtError instanceof OracleRequestError ? caughtError : null;
      const code = toErrorCode(
        requestError?.code ??
        (caughtError instanceof Error
          ? caughtError.message
          : "internal_error"),
      );
      const retryAfter =
        code === "oracle_resting" ? requestError?.retryAfter : undefined;

      error.value = {
        code,
        message:
          code === "oracle_resting"
            ? restingMessage(retryAfter)
            : errorMessages[code],
        ...(retryAfter !== undefined ? { retryAfter } : {}),
      };

      if (code === "oracle_resting" && retryAfter !== undefined) {
        startRetryCountdown(retryAfter);
      }
    } finally {
      isLoading.value = false;
    }
  }

  return {
    result,
    error,
    isLoading,
    isResting,
    retryIn,
    isBlocked,
    blockedError,
    ask,
  };
}

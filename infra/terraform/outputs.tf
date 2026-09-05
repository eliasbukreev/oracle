output "function_id" {
  description = "Yandex Cloud Function ID."
  value       = yandex_function.oracle.id
}

output "function_url" {
  description = "Public URL used by the frontend."
  value       = "https://functions.yandexcloud.net/${yandex_function.oracle.id}"
}

output "function_service_account_id" {
  description = "Service account ID used by the Cloud Function."
  value       = yandex_iam_service_account.function.id
}

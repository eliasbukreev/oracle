resource "yandex_iam_service_account" "function" {
  name      = "${var.function_name}-sa"
  folder_id = var.folder_id
}

resource "yandex_resourcemanager_folder_iam_member" "function_logging" {
  folder_id = var.folder_id
  role      = "logging.writer"
  member    = "serviceAccount:${yandex_iam_service_account.function.id}"
}

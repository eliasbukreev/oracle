resource "yandex_lockbox_secret" "openrouter" {
  name                = "${var.function_name}-openrouter"
  folder_id           = var.folder_id
  deletion_protection = true
}

resource "yandex_lockbox_secret_version" "openrouter" {
  secret_id = yandex_lockbox_secret.openrouter.id

  entries {
    key        = "GOOGLE_AI_API_KEY"
    text_value = var.google_ai_api_key
  }
}

resource "yandex_lockbox_secret_iam_binding" "function_payload_viewer" {
  secret_id = yandex_lockbox_secret.openrouter.id
  role      = "lockbox.payloadViewer"
  members   = ["serviceAccount:${yandex_iam_service_account.function.id}"]
}

data "archive_file" "function" {
  type        = "zip"
  source_dir  = "${path.module}/../../backend"
  output_path = "${path.module}/.tmp/oracle-function.zip"
}

resource "yandex_function" "oracle" {
  name               = var.function_name
  folder_id          = var.folder_id
  user_hash          = data.archive_file.function.output_base64sha256
  runtime            = var.function_runtime
  entrypoint         = "handler.handler"
  memory             = var.function_memory
  execution_timeout  = var.function_timeout
  service_account_id = yandex_iam_service_account.function.id

  environment = {
    CORS_ALLOWED_ORIGINS = var.cors_allowed_origins
  }

  content {
    zip_filename = data.archive_file.function.output_path
  }

  depends_on = [
    yandex_resourcemanager_folder_iam_member.function_logging,
  ]
}

resource "yandex_function_iam_binding" "public_invoker" {
  function_id = yandex_function.oracle.id
  role        = "serverless.functions.invoker"
  members     = ["system:allUsers"]
}

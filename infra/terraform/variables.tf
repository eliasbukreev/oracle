variable "service_account_key_file" {
  description = "Path to the Yandex Cloud service account authorized key JSON file."
  type        = string
}

variable "cloud_id" {
  description = "Yandex Cloud ID."
  type        = string
}

variable "folder_id" {
  description = "Yandex Cloud folder ID where the function is created."
  type        = string
}

variable "zone" {
  description = "Yandex Cloud availability zone."
  type        = string
  default     = "ru-central1-a"
}

variable "function_name" {
  description = "Name of the Oracle Cloud Function."
  type        = string
  default     = "oracle-function"
}

variable "function_runtime" {
  description = "Cloud Function Python runtime."
  type        = string
  default     = "python312"
}

variable "function_memory" {
  description = "Cloud Function memory in megabytes."
  type        = number
  default     = 128
}

variable "function_timeout" {
  description = "Maximum Cloud Function execution time in seconds."
  type        = string
  default     = "5"
}

variable "cors_allowed_origins" {
  description = "Comma-separated origins allowed by the function CORS policy."
  type        = string
}

variable "google_ai_api_key" {
  description = "Google AI Studio API key stored in Lockbox."
  type        = string
  sensitive   = true
}

variable "google_ai_model" {
  description = "Google Gemini model identifier."
  type        = string
}

variable "google_ai_max_tokens" {
  description = "Maximum number of tokens requested from the model."
  type        = number
}

variable "google_ai_temperature" {
  description = "Model temperature controlled by the backend."
  type        = number
}

variable "google_ai_timeout" {
  description = "Google Gemini request timeout in seconds."
  type        = number
}

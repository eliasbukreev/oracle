terraform {
  required_version = ">= 1.6.0"

  required_providers {
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.7"
    }

    yandex = {
      source  = "yandex-cloud/yandex"
      version = "~> 0.140"
    }
  }
}

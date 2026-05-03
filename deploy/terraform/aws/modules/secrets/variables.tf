variable "name_prefix" {
  type        = string
  description = "Name prefix for Secrets Manager secret placeholders."
}

variable "secret_names" {
  type        = set(string)
  description = "Logical secret names. Secret values are intentionally not managed by this blueprint."
}

variable "recovery_window_in_days" {
  type        = number
  description = "Recovery window for deleted secrets."
  default     = 30
}

variable "tags" {
  type        = map(string)
  description = "Common AWS tags."
  default     = {}
}

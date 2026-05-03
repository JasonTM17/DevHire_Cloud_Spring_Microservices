variable "name_prefix" {
  type        = string
  description = "Name prefix for ECR repositories."
}

variable "service_names" {
  type        = set(string)
  description = "Container image names."
}

variable "tags" {
  type        = map(string)
  description = "Common AWS tags."
  default     = {}
}

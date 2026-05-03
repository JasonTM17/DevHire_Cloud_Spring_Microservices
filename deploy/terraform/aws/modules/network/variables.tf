variable "name_prefix" {
  type        = string
  description = "Name prefix for network resources."
}

variable "vpc_cidr" {
  type        = string
  description = "VPC CIDR block."
}

variable "availability_zones" {
  type        = list(string)
  description = "Availability zones used for public/private subnets."
}

variable "enable_nat_gateway" {
  type        = bool
  description = "Create NAT gateway for private subnet egress. Disabled by default to avoid portfolio cost."
  default     = false
}

variable "tags" {
  type        = map(string)
  description = "Common AWS tags."
  default     = {}
}

variable "aws_region" {
  type        = string
  description = "AWS region."
  default     = "ap-southeast-1"
}

variable "environment" {
  type        = string
  description = "Environment name."
  default     = "staging"
}

variable "name_prefix" {
  type        = string
  description = "Resource name prefix."
  default     = "devhire-staging"
}

variable "vpc_cidr" {
  type        = string
  description = "VPC CIDR block."
  default     = "10.50.0.0/16"
}

variable "availability_zones" {
  type        = list(string)
  description = "Availability zones."
  default     = ["ap-southeast-1a", "ap-southeast-1b", "ap-southeast-1c"]
}

variable "enable_nat_gateway" {
  type        = bool
  description = "Enable NAT gateway. Disabled by default to avoid cost."
  default     = false
}

variable "enable_eks" {
  type        = bool
  description = "Enable EKS. Disabled by default for blueprint-safe validation."
  default     = false
}

variable "enable_rds" {
  type        = bool
  description = "Enable RDS PostgreSQL."
  default     = false
}

variable "enable_redis" {
  type        = bool
  description = "Enable ElastiCache Redis."
  default     = false
}

variable "enable_msk" {
  type        = bool
  description = "Enable MSK Serverless Kafka."
  default     = false
}

variable "enable_opensearch" {
  type        = bool
  description = "Enable OpenSearch."
  default     = false
}

variable "extra_tags" {
  type        = map(string)
  description = "Additional AWS tags."
  default     = {}
}

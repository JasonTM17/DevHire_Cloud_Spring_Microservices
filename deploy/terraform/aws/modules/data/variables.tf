variable "name_prefix" {
  type        = string
  description = "Name prefix for data services."
}

variable "private_subnet_ids" {
  type        = list(string)
  description = "Private subnet IDs for data services."
}

variable "data_security_group_ids" {
  type        = list(string)
  description = "Security groups allowed to access data services."
}

variable "enable_rds" {
  type        = bool
  description = "Create RDS PostgreSQL."
  default     = false
}

variable "enable_redis" {
  type        = bool
  description = "Create ElastiCache Redis."
  default     = false
}

variable "enable_msk" {
  type        = bool
  description = "Create MSK Serverless Kafka."
  default     = false
}

variable "enable_opensearch" {
  type        = bool
  description = "Create OpenSearch domain."
  default     = false
}

variable "postgres_engine_version" {
  type    = string
  default = "17.2"
}

variable "postgres_instance_class" {
  type    = string
  default = "db.t4g.medium"
}

variable "postgres_allocated_storage" {
  type    = number
  default = 50
}

variable "postgres_username" {
  type    = string
  default = "devhire"
}

variable "redis_node_type" {
  type    = string
  default = "cache.t4g.micro"
}

variable "redis_replicas" {
  type    = number
  default = 1
}

variable "opensearch_engine_version" {
  type    = string
  default = "OpenSearch_2.15"
}

variable "opensearch_instance_type" {
  type    = string
  default = "t3.small.search"
}

variable "tags" {
  type        = map(string)
  description = "Common AWS tags."
  default     = {}
}

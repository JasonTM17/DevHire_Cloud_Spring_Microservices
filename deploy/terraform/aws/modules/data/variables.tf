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

variable "postgres_backup_retention_period" {
  type        = number
  description = "RDS backup retention in days."
  default     = 7
}

variable "postgres_deletion_protection" {
  type        = bool
  description = "Enable RDS deletion protection for apply-ready environments."
  default     = true
}

variable "postgres_performance_insights_enabled" {
  type        = bool
  description = "Enable RDS Performance Insights."
  default     = true
}

variable "postgres_auto_minor_version_upgrade" {
  type        = bool
  description = "Allow automatic minor version upgrades."
  default     = true
}

variable "postgres_copy_tags_to_snapshot" {
  type        = bool
  description = "Copy tags to automated and final snapshots for ownership/cost tracing."
  default     = true
}

variable "postgres_enabled_cloudwatch_logs_exports" {
  type        = list(string)
  description = "PostgreSQL log exports for CloudWatch."
  default     = ["postgresql", "upgrade"]
}

variable "postgres_multi_az" {
  type        = bool
  description = "Run RDS in Multi-AZ mode. Keep false in examples to avoid accidental cost; enable for real production."
  default     = false
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

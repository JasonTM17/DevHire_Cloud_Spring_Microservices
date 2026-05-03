output "postgres_endpoint" {
  value = try(aws_db_instance.postgres[0].address, null)
}

output "postgres_port" {
  value = try(aws_db_instance.postgres[0].port, null)
}

output "postgres_master_secret_arn" {
  value = try(aws_db_instance.postgres[0].master_user_secret[0].secret_arn, null)
}

output "redis_primary_endpoint" {
  value = try(aws_elasticache_replication_group.redis[0].primary_endpoint_address, null)
}

output "redis_reader_endpoint" {
  value = try(aws_elasticache_replication_group.redis[0].reader_endpoint_address, null)
}

output "kafka_bootstrap_brokers_sasl_iam" {
  value = try(aws_msk_serverless_cluster.kafka[0].bootstrap_brokers_sasl_iam, null)
}

output "opensearch_endpoint" {
  value = try(aws_opensearch_domain.this[0].endpoint, null)
}

output "opensearch_domain_arn" {
  value = try(aws_opensearch_domain.this[0].arn, null)
}

output "aws_region" {
  value = var.aws_region
}

output "eks_cluster_name" {
  value = module.eks.cluster_name
}

output "ecr_repository_urls" {
  value = module.container.repository_urls
}

output "postgres_endpoint" {
  value = module.data.postgres_endpoint
}

output "redis_primary_endpoint" {
  value = module.data.redis_primary_endpoint
}

output "kafka_bootstrap_brokers_sasl_iam" {
  value = module.data.kafka_bootstrap_brokers_sasl_iam
}

output "opensearch_endpoint" {
  value = module.data.opensearch_endpoint
}

output "secret_arns" {
  value = module.secrets.secret_arns
}

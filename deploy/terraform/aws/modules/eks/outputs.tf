output "cluster_name" {
  value = try(aws_eks_cluster.this[0].name, null)
}

output "cluster_endpoint" {
  value = try(aws_eks_cluster.this[0].endpoint, null)
}

output "cluster_certificate_authority_data" {
  value     = try(aws_eks_cluster.this[0].certificate_authority[0].data, null)
  sensitive = true
}

output "oidc_provider_arn" {
  value = try(aws_iam_openid_connect_provider.this[0].arn, null)
}

output "node_group_name" {
  value = try(aws_eks_node_group.this[0].node_group_name, null)
}

output "vpc_id" {
  value = aws_vpc.this.id
}

output "public_subnet_ids" {
  value = values(aws_subnet.public)[*].id
}

output "private_subnet_ids" {
  value = values(aws_subnet.private)[*].id
}

output "eks_cluster_security_group_id" {
  value = aws_security_group.eks_cluster.id
}

output "app_security_group_id" {
  value = aws_security_group.app.id
}

output "data_security_group_id" {
  value = aws_security_group.data.id
}

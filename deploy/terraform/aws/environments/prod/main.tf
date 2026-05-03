locals {
  service_names = toset([
    "api-gateway",
    "auth-service",
    "user-service",
    "company-service",
    "job-service",
    "application-service",
    "notification-service",
    "audit-service",
    "ai-service",
    "frontend"
  ])

  secret_names = toset([
    "jwt-secret",
    "postgres-username",
    "postgres-password",
    "smtp-username",
    "smtp-password",
    "anthropic-api-key",
    "oauth-client-secret",
    "opensearch-password"
  ])

  common_tags = merge(var.extra_tags, {
    Project     = "DevHire Cloud"
    Environment = var.environment
    ManagedBy   = "Terraform"
    Repository  = "JasonTM17/DevHire_Cloud_Spring_Microservices"
  })
}

module "network" {
  source = "../../modules/network"

  name_prefix        = var.name_prefix
  vpc_cidr           = var.vpc_cidr
  availability_zones = var.availability_zones
  enable_nat_gateway = var.enable_nat_gateway
  tags               = local.common_tags
}

module "container" {
  source = "../../modules/container"

  name_prefix   = var.name_prefix
  service_names = local.service_names
  tags          = local.common_tags
}

module "secrets" {
  source = "../../modules/secrets"

  name_prefix  = var.name_prefix
  secret_names = local.secret_names
  tags         = local.common_tags
}

module "eks" {
  source = "../../modules/eks"

  enabled                    = var.enable_eks
  name_prefix                = var.name_prefix
  private_subnet_ids         = module.network.private_subnet_ids
  cluster_security_group_ids = [module.network.eks_cluster_security_group_id]
  tags                       = local.common_tags
}

module "data" {
  source = "../../modules/data"

  name_prefix             = var.name_prefix
  private_subnet_ids      = module.network.private_subnet_ids
  data_security_group_ids = [module.network.data_security_group_id]
  enable_rds              = var.enable_rds
  enable_redis            = var.enable_redis
  enable_msk              = var.enable_msk
  enable_opensearch       = var.enable_opensearch
  tags                    = local.common_tags
}

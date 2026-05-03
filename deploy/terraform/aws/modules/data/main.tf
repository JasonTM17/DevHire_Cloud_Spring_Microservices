resource "aws_db_subnet_group" "this" {
  count = var.enable_rds ? 1 : 0

  name       = "${var.name_prefix}-postgres"
  subnet_ids = var.private_subnet_ids

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-postgres-subnets"
  })
}

resource "aws_db_instance" "postgres" {
  count = var.enable_rds ? 1 : 0

  identifier                          = "${var.name_prefix}-postgres"
  engine                              = "postgres"
  engine_version                      = var.postgres_engine_version
  instance_class                      = var.postgres_instance_class
  allocated_storage                   = var.postgres_allocated_storage
  storage_encrypted                   = true
  username                            = var.postgres_username
  manage_master_user_password         = true
  db_subnet_group_name                = aws_db_subnet_group.this[0].name
  vpc_security_group_ids              = var.data_security_group_ids
  backup_retention_period             = 7
  deletion_protection                 = true
  publicly_accessible                 = false
  skip_final_snapshot                 = false
  performance_insights_enabled        = true
  iam_database_authentication_enabled = true

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-postgres"
  })
}

resource "aws_elasticache_subnet_group" "this" {
  count = var.enable_redis ? 1 : 0

  name       = "${var.name_prefix}-redis"
  subnet_ids = var.private_subnet_ids

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-redis-subnets"
  })
}

resource "aws_elasticache_replication_group" "redis" {
  count = var.enable_redis ? 1 : 0

  replication_group_id       = "${var.name_prefix}-redis"
  description                = "DevHire Cloud Redis"
  engine                     = "redis"
  node_type                  = var.redis_node_type
  num_cache_clusters         = var.redis_replicas
  automatic_failover_enabled = var.redis_replicas > 1
  subnet_group_name          = aws_elasticache_subnet_group.this[0].name
  security_group_ids         = var.data_security_group_ids
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-redis"
  })
}

resource "aws_msk_serverless_cluster" "kafka" {
  count = var.enable_msk ? 1 : 0

  cluster_name = "${var.name_prefix}-kafka"

  client_authentication {
    sasl {
      iam {
        enabled = true
      }
    }
  }

  vpc_config {
    subnet_ids         = var.private_subnet_ids
    security_group_ids = var.data_security_group_ids
  }

  tags = var.tags
}

resource "aws_opensearch_domain" "this" {
  count = var.enable_opensearch ? 1 : 0

  domain_name    = "${var.name_prefix}-search"
  engine_version = var.opensearch_engine_version

  cluster_config {
    instance_type  = var.opensearch_instance_type
    instance_count = 2
  }

  ebs_options {
    ebs_enabled = true
    volume_size = 30
    volume_type = "gp3"
  }

  encrypt_at_rest {
    enabled = true
  }

  node_to_node_encryption {
    enabled = true
  }

  domain_endpoint_options {
    enforce_https       = true
    tls_security_policy = "Policy-Min-TLS-1-2-2019-07"
  }

  vpc_options {
    subnet_ids         = slice(var.private_subnet_ids, 0, min(length(var.private_subnet_ids), 2))
    security_group_ids = var.data_security_group_ids
  }

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-search"
  })
}

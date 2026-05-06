locals {
  cluster_role_policy_arns = [
    "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
  ]

  node_role_policy_arns = [
    "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy",
    "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy",
    "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
  ]
}

data "aws_iam_policy_document" "eks_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["eks.amazonaws.com"]
    }
  }
}

data "aws_iam_policy_document" "node_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "cluster" {
  count = var.enabled ? 1 : 0

  name               = "${var.name_prefix}-eks-cluster"
  assume_role_policy = data.aws_iam_policy_document.eks_assume_role.json

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "cluster" {
  count = var.enabled ? length(local.cluster_role_policy_arns) : 0

  role       = aws_iam_role.cluster[0].name
  policy_arn = local.cluster_role_policy_arns[count.index]
}

resource "aws_eks_cluster" "this" {
  count = var.enabled ? 1 : 0

  name     = "${var.name_prefix}-eks"
  role_arn = aws_iam_role.cluster[0].arn
  version  = var.cluster_version

  vpc_config {
    subnet_ids              = var.private_subnet_ids
    security_group_ids      = var.cluster_security_group_ids
    endpoint_private_access = true
    endpoint_public_access  = var.endpoint_public_access
    public_access_cidrs     = var.endpoint_public_access ? var.public_access_cidrs : []
  }

  enabled_cluster_log_types = ["api", "audit", "authenticator", "controllerManager", "scheduler"]

  depends_on = [aws_iam_role_policy_attachment.cluster]

  tags = var.tags
}

resource "aws_iam_role" "node" {
  count = var.enabled && var.enable_node_group ? 1 : 0

  name               = "${var.name_prefix}-eks-node"
  assume_role_policy = data.aws_iam_policy_document.node_assume_role.json

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "node" {
  count = var.enabled && var.enable_node_group ? length(local.node_role_policy_arns) : 0

  role       = aws_iam_role.node[0].name
  policy_arn = local.node_role_policy_arns[count.index]
}

resource "aws_eks_node_group" "this" {
  count = var.enabled && var.enable_node_group ? 1 : 0

  cluster_name    = aws_eks_cluster.this[0].name
  node_group_name = "${var.name_prefix}-default"
  node_role_arn   = aws_iam_role.node[0].arn
  subnet_ids      = var.private_subnet_ids
  instance_types  = var.node_instance_types

  scaling_config {
    desired_size = var.node_desired_size
    min_size     = var.node_min_size
    max_size     = var.node_max_size
  }

  update_config {
    max_unavailable = 1
  }

  depends_on = [aws_iam_role_policy_attachment.node]

  tags = var.tags
}

resource "aws_iam_openid_connect_provider" "this" {
  count = var.enabled && var.enable_irsa ? 1 : 0

  url             = aws_eks_cluster.this[0].identity[0].oidc[0].issuer
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = [var.oidc_thumbprint]

  tags = var.tags
}

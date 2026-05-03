variable "enabled" {
  type        = bool
  description = "Create EKS resources."
  default     = false
}

variable "name_prefix" {
  type        = string
  description = "Name prefix for EKS resources."
}

variable "cluster_version" {
  type        = string
  description = "EKS Kubernetes version."
  default     = "1.31"
}

variable "private_subnet_ids" {
  type        = list(string)
  description = "Private subnet IDs for EKS."
}

variable "cluster_security_group_ids" {
  type        = list(string)
  description = "Security groups for the EKS control plane."
}

variable "node_instance_types" {
  type        = list(string)
  description = "Managed node group instance types."
  default     = ["t3.large"]
}

variable "node_desired_size" {
  type    = number
  default = 2
}

variable "node_min_size" {
  type    = number
  default = 2
}

variable "node_max_size" {
  type    = number
  default = 5
}

variable "enable_node_group" {
  type        = bool
  description = "Create a managed node group."
  default     = true
}

variable "enable_irsa" {
  type        = bool
  description = "Create an IAM OIDC provider for IRSA."
  default     = true
}

variable "oidc_thumbprint" {
  type        = string
  description = "OIDC root CA thumbprint. Replace with the current AWS EKS OIDC thumbprint before apply."
  default     = "9e99a48a9960b14926bb7f3b02e22da0afd29e33"
}

variable "tags" {
  type        = map(string)
  description = "Common AWS tags."
  default     = {}
}

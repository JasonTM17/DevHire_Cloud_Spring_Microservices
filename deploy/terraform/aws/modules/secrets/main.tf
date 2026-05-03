resource "aws_secretsmanager_secret" "this" {
  for_each = var.secret_names

  name                    = "${var.name_prefix}/${each.key}"
  description             = "DevHire Cloud ${each.key} secret placeholder. Value is managed outside Terraform state."
  recovery_window_in_days = var.recovery_window_in_days

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-${each.key}"
  })
}

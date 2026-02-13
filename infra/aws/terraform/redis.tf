module "redis" {
  source  = "terraform-aws-modules/elasticache/aws"
  version = "~> 5.7"

  engine               = "redis"
  engine_version       = var.redis_engine_version
  node_type            = var.redis_node_type
  number_of_cache_clusters = 1
  parameter_group_name = "default.redis7"

  name_prefix = "${local.name_prefix}-redis"

  subnet_group_name       = "${local.name_prefix}-redis"
  subnet_ids              = module.vpc.private_subnets
  security_group_ids      = [aws_security_group.redis.id]
  automatic_failover_enabled = var.environment == "prod"
  port                    = 6379

  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                = data.aws_ssm_parameter.redis_auth_token.value

  maintenance_window = "sun:04:00-sun:05:00"

  tags = {
    Environment = var.environment
  }
}

data "aws_ssm_parameter" "redis_auth_token" {
  name = var.redis_auth_token_ssm_parameter
}

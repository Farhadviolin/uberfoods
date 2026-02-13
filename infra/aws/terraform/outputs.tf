output "vpc_id" {
  value = module.vpc.vpc_id
}

output "public_subnets" {
  value = module.vpc.public_subnets
}

output "private_subnets" {
  value = module.vpc.private_subnets
}

output "alb_dns_name" {
  value = module.alb.lb_dns_name
}

output "alb_target_group_arns" {
  value = module.alb.target_group_arns
}

output "ecs_cluster_id" {
  value = module.ecs.cluster_id
}

output "rds_endpoint" {
  value = module.rds.db_instance_endpoint
}

output "redis_endpoint" {
  value = module.redis.redis_endpoint
}

output "cloudfront_domains" {
  value = { for k, v in aws_cloudfront_distribution.frontend : k => v.domain_name }
}

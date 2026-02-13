terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "uberfoods-terraform-state-dev"
    key            = "dev/terraform.tfstate"
    region         = "eu-west-1"
    encrypt        = true
    dynamodb_table = "uberfoods-terraform-locks-dev"
  }
}

provider "aws" {
  region = var.region

  default_tags {
    tags = {
      Environment = var.environment
      Project     = "uberfoods"
      Owner       = var.owner
      ManagedBy   = "terraform"
    }
  }
}

# VPC and Networking
module "network" {
  source = "../../modules/network"

  environment = var.environment
  region      = var.region
  vpc_cidr    = "10.0.0.0/16"

  azs             = ["${var.region}a", "${var.region}b"]
  public_subnets  = ["10.0.1.0/24", "10.0.2.0/24"]
  private_subnets = ["10.0.101.0/24", "10.0.102.0/24"]
}

# Security Groups
module "security" {
  source = "../../modules/security"

  environment = var.environment
  vpc_id      = module.network.vpc_id
}

# RDS PostgreSQL
module "rds" {
  source = "../../modules/rds"

  environment = var.environment
  vpc_id      = module.network.vpc_id
  subnet_ids  = module.network.private_subnet_ids

  instance_class    = "db.t3.micro"
  allocated_storage = 20
  engine_version    = "15.4"

  database_name = "uberfoods"
  username      = "uberfoods"

  backup_retention_period = 7
  multi_az               = false

  security_group_ids = [module.security.rds_security_group_id]
}

# ElastiCache Redis
module "redis" {
  source = "../../modules/redis"

  environment = var.environment
  vpc_id      = module.network.vpc_id
  subnet_ids  = module.network.private_subnet_ids

  node_type      = "cache.t3.micro"
  num_cache_nodes = 1

  security_group_ids = [module.security.redis_security_group_id]
}

# ECS Cluster and Services
module "ecs" {
  source = "../../modules/ecs"

  environment = var.environment
  vpc_id      = module.network.vpc_id
  subnet_ids  = module.network.private_subnet_ids

  cluster_name = "uberfoods-${var.environment}"

  # Backend Service
  backend = {
    name           = "backend"
    image          = var.backend_image
    cpu            = 256
    memory         = 512
    desired_count  = 1
    container_port = 3000

    environment = [
      {
        name  = "NODE_ENV"
        value = "development"
      },
      {
        name  = "DATABASE_URL"
        value = "postgresql://${module.rds.username}:${module.rds.password}@${module.rds.endpoint}/${module.rds.database_name}"
      },
      {
        name  = "REDIS_URL"
        value = "redis://${module.redis.endpoint}"
      },
      {
        name  = "REGION"
        value = var.region
      },
      {
        name  = "ROLE"
        value = "primary"
      }
    ]

    secrets = [
      {
        name      = "JWT_SECRET"
        valueFrom = aws_secretsmanager_secret.jwt_secret.arn
      }
    ]
  }

  # Load Balancer
  alb = {
    name             = "uberfoods-${var.environment}"
    internal         = false
    security_groups  = [module.security.alb_security_group_id]
    subnet_ids       = module.network.public_subnet_ids
    certificate_arn  = var.certificate_arn
  }
}

# WAF
module "waf" {
  source = "../../modules/waf"

  environment = var.environment

  # Minimal rules for development
  rate_limit = 1000  # Higher limit for dev

  enable_owasp_rules = false  # Disable strict rules in dev
  enable_bot_control = false
}

# Secrets Manager
resource "aws_secretsmanager_secret" "jwt_secret" {
  name                    = "uberfoods/${var.environment}/jwt-secret"
  description             = "JWT signing secret for UberFoods ${var.environment}"
  recovery_window_in_days = 0

  tags = {
    Environment = var.environment
    Type         = "jwt"
  }
}

resource "aws_secretsmanager_secret_version" "jwt_secret" {
  secret_id = aws_secretsmanager_secret.jwt_secret.id
  secret_string = jsonencode({
    key = "dev-jwt-secret-change-in-production"
  })
}

# Outputs
output "vpc_id" {
  value = module.network.vpc_id
}

output "alb_dns_name" {
  value = module.ecs.alb_dns_name
}

output "rds_endpoint" {
  value = module.rds.endpoint
}

output "redis_endpoint" {
  value = module.redis.endpoint
}
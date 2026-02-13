module "rds" {
  source  = "terraform-aws-modules/rds/aws"
  version = "~> 6.7"

  identifier = "${local.name_prefix}-postgres"

  engine               = "postgres"
  engine_version       = var.db_engine_version
  instance_class       = var.db_instance_class
  allocated_storage    = var.db_allocated_storage
  max_allocated_storage = 200

  db_name  = replace(var.project, "-", "_")
  username = var.db_username
  password = data.aws_ssm_parameter.db_password.value

  publicly_accessible = false
  multi_az            = var.environment == "prod"
  storage_encrypted   = true
  deletion_protection = var.environment == "prod"
  skip_final_snapshot = var.environment != "prod"

  backup_retention_period = var.environment == "prod" ? 7 : 1
  backup_window           = "01:00-02:00"
  maintenance_window      = "sun:03:00-sun:04:00"

  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = module.vpc.database_subnet_group

  monitoring_interval = 60
  performance_insights_enabled = var.environment == "prod"

  tags = {
    Environment = var.environment
  }
}

data "aws_ssm_parameter" "db_password" {
  name = var.db_password_ssm_parameter
}

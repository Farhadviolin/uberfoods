variable "project" {
  description = "Projektname, wird für Tags und Naming verwendet"
  type        = string
  default     = "uberfoods"
}

variable "environment" {
  description = "Umgebung (staging|prod)"
  type        = string
}

variable "region" {
  description = "AWS Region, z.B. eu-central-1"
  type        = string
  default     = "eu-central-1"
}

variable "domain" {
  description = "Root Domain, z.B. uberfoods.com"
  type        = string
}

variable "hosted_zone_id" {
  description = "Route53 Hosted Zone ID für die Domain"
  type        = string
}

variable "cidr_block" {
  description = "VPC CIDR"
  type        = string
  default     = "10.20.0.0/16"
}

variable "public_subnets" {
  description = "Public Subnets für ALB/CloudFront Origins"
  type        = list(string)
  default     = ["10.20.0.0/24", "10.20.1.0/24"]
}

variable "private_subnets" {
  description = "Private Subnets für ECS/RDS/Redis"
  type        = list(string)
  default     = ["10.20.10.0/24", "10.20.11.0/24"]
}

variable "azs" {
  description = "Availability Zones"
  type        = list(string)
  default     = ["eu-central-1a", "eu-central-1b"]
}

variable "ecr_repositories" {
  description = "ECR Repositories, key = name, value = scan_on_push"
  type        = map(bool)
  default = {
    backend        = true
    admin-panel    = true
    customer-web   = true
    restaurant-web = true
    driver-app     = true
  }
}

variable "container_images" {
  description = "Container Images je Service (image URI inkl. Tag)"
  type = object({
    backend = string
  })
}

variable "task_cpu" {
  description = "Fargate CPU pro Task"
  type        = number
  default     = 512
}

variable "task_memory" {
  description = "Fargate Memory pro Task"
  type        = number
  default     = 1024
}

variable "desired_count" {
  description = "Gewünschte Task-Anzahl pro Service"
  type        = number
  default     = 2
}

variable "db_instance_class" {
  description = "RDS Instance Class"
  type        = string
  default     = "db.t4g.medium"
}

variable "db_allocated_storage" {
  description = "RDS Storage in GB"
  type        = number
  default     = 64
}

variable "db_engine_version" {
  description = "PostgreSQL Version"
  type        = string
  default     = "15.6"
}

variable "db_username" {
  description = "DB Admin User"
  type        = string
  default     = "uberfoods"
}

variable "db_password_ssm_parameter" {
  description = "SSM Parameter Name, der das DB Passwort enthält"
  type        = string
}

variable "redis_node_type" {
  description = "ElastiCache Node Typ"
  type        = string
  default     = "cache.t4g.small"
}

variable "redis_engine_version" {
  description = "Redis Engine Version"
  type        = string
  default     = "7.1"
}

variable "redis_auth_token_ssm_parameter" {
  description = "SSM Parameter Name für Redis Auth Token"
  type        = string
}

variable "ssl_certificate_arns" {
  description = "ACM Zertifikate je Subdomain"
  type = object({
    api   = string
    admin = string
    app   = string
    files = string
  })
}

variable "s3_frontend_buckets" {
  description = "S3 Buckets je Frontend (staging/prod)"
  type = object({
    admin_panel    = string
    customer_web   = string
    restaurant_web = string
    driver_app     = optional(string)
  })
}

variable "media_bucket" {
  description = "S3 Bucket Name für Media Uploads"
  type        = string
}

variable "cloudfront_price_class" {
  description = "CloudFront Price Class"
  type        = string
  default     = "PriceClass_100"
}

variable "allowed_cidrs_alb" {
  description = "CIDRs, die auf ALB zugreifen dürfen (0.0.0.0/0 für öffentlich)"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

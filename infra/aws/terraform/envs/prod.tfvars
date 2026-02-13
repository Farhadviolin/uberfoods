project      = "uberfoods"
environment  = "prod"
region       = "eu-central-1"
domain       = "uberfoods.com"
hosted_zone_id = "ZYYYYYYYYYYYY" # TODO: ersetzen

container_images = {
  backend = "000000000000.dkr.ecr.eu-central-1.amazonaws.com/uberfoods-backend:prod-latest"
}

ssl_certificate_arns = {
  api   = "arn:aws:acm:eu-central-1:000000000000:certificate/YYYYYYYY"
  admin = "arn:aws:acm:us-east-1:000000000000:certificate/YYYYYYYY"
  app   = "arn:aws:acm:us-east-1:000000000000:certificate/YYYYYYYY"
  files = "arn:aws:acm:eu-central-1:000000000000:certificate/YYYYYYYY"
}

s3_frontend_buckets = {
  admin_panel    = "uberfoods-prod-admin-panel"
  customer_web   = "uberfoods-prod-customer-web"
  restaurant_web = "uberfoods-prod-restaurant-web"
  driver_app     = "uberfoods-prod-driver-app"
}

media_bucket = "uberfoods-prod-media"

db_password_ssm_parameter      = "/uberfoods/prod/db_password"
redis_auth_token_ssm_parameter = "/uberfoods/prod/redis_auth_token"

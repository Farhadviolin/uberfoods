project      = "uberfoods"
environment  = "staging"
region       = "eu-central-1"
domain       = "staging.uberfoods.com"
hosted_zone_id = "ZXXXXXXXXXXXX" # TODO: ersetzen

container_images = {
  backend = "000000000000.dkr.ecr.eu-central-1.amazonaws.com/uberfoods-backend:staging-latest"
}

ssl_certificate_arns = {
  api   = "arn:aws:acm:eu-central-1:000000000000:certificate/XXXXXXXX"
  admin = "arn:aws:acm:us-east-1:000000000000:certificate/XXXXXXXX" # CloudFront cert
  app   = "arn:aws:acm:us-east-1:000000000000:certificate/XXXXXXXX"
  files = "arn:aws:acm:eu-central-1:000000000000:certificate/XXXXXXXX"
}

s3_frontend_buckets = {
  admin_panel    = "uberfoods-staging-admin-panel"
  customer_web   = "uberfoods-staging-customer-web"
  restaurant_web = "uberfoods-staging-restaurant-web"
  driver_app     = "uberfoods-staging-driver-app"
}

media_bucket = "uberfoods-staging-media"

db_password_ssm_parameter      = "/uberfoods/staging/db_password"
redis_auth_token_ssm_parameter = "/uberfoods/staging/redis_auth_token"

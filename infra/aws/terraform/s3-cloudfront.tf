resource "aws_s3_bucket" "media" {
  bucket = var.media_bucket

  force_destroy       = false
  object_lock_enabled = false

  tags = {
    Environment = var.environment
    Purpose     = "media"
  }
}

resource "aws_s3_bucket_public_access_block" "media" {
  bucket                  = aws_s3_bucket.media.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "media" {
  bucket = aws_s3_bucket.media.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket" "frontend" {
  for_each = {
    admin    = var.s3_frontend_buckets.admin_panel
    customer = var.s3_frontend_buckets.customer_web
    restaurant = var.s3_frontend_buckets.restaurant_web
    driver   = try(var.s3_frontend_buckets.driver_app, null)
  }

  bucket = each.value

  tags = {
    Environment = var.environment
    Purpose     = "frontend"
    App         = each.key
  }
}

resource "aws_s3_bucket_public_access_block" "frontend" {
  for_each = aws_s3_bucket.frontend

  bucket                  = each.value.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "frontend" {
  for_each = aws_s3_bucket.frontend

  bucket = each.value.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_cloudfront_origin_access_identity" "frontend" {
  comment = "OAI for ${local.name_prefix} frontends"
}

resource "aws_cloudfront_distribution" "frontend" {
  for_each = {
    admin    = { bucket = aws_s3_bucket.frontend["admin"].bucket, domain = "admin.${var.domain}", cert = var.ssl_certificate_arns.admin }
    customer = { bucket = aws_s3_bucket.frontend["customer"].bucket, domain = "app.${var.domain}", cert = var.ssl_certificate_arns.app }
    restaurant = { bucket = aws_s3_bucket.frontend["restaurant"].bucket, domain = "restaurant.${var.domain}", cert = var.ssl_certificate_arns.app }
    driver = try(aws_s3_bucket.frontend["driver"].bucket, null) != null ? { bucket = aws_s3_bucket.frontend["driver"].bucket, domain = "driver.${var.domain}", cert = var.ssl_certificate_arns.app } : null
  }

  enabled             = true
  is_ipv6_enabled     = true
  price_class         = var.cloudfront_price_class
  default_root_object = "index.html"

  aliases = [each.value.domain]

  origin {
    domain_name = "${each.value.bucket}.s3.amazonaws.com"
    origin_id   = "s3-${each.key}"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.frontend.cloudfront_access_identity_path
    }
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "s3-${each.key}"
    viewer_protocol_policy = "redirect-to-https"

    forwarded_values {
      query_string = true
      cookies {
        forward = "none"
      }
    }
    min_ttl     = 0
    default_ttl = 300
    max_ttl     = 3600
  }

  viewer_certificate {
    acm_certificate_arn            = each.value.cert
    ssl_support_method             = "sni-only"
    minimum_protocol_version       = "TLSv1.2_2021"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 60
  }

  logging_config {
    include_cookies = false
    bucket          = "${aws_s3_bucket.media.bucket}.s3.amazonaws.com"
    prefix          = "cloudfront/${each.key}/"
  }
}

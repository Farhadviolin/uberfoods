resource "aws_route53_record" "alb_api" {
  zone_id = var.hosted_zone_id
  name    = "api.${var.domain}"
  type    = "A"

  alias {
    name                   = module.alb.lb_dns_name
    zone_id                = module.alb.lb_zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "frontend" {
  for_each = aws_cloudfront_distribution.frontend

  zone_id = var.hosted_zone_id
  name    = each.value.aliases[0]
  type    = "A"

  alias {
    name                   = each.value.domain_name
    zone_id                = each.value.hosted_zone_id
    evaluate_target_health = false
  }
}

# Hinweis: ACM-Zertifikate werden typischerweise manuell oder per DNS-Validation erstellt.
# Hier referenzieren wir die übergebenen Zertifikats-ARNs in var.ssl_certificate_arns.

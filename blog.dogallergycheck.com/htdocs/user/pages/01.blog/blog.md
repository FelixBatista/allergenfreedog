---
title: Dog Allergy Blog
blog_url: blog
body_classes: header-image fullwidth

sitemap:
    changefreq: monthly
    priority: 1.03

content:
    items: @self.children
    order:
        by: date
        dir: desc
    limit: 10
    pagination: true

feed:
    description: Expert insights on dog allergies, nutrition, and health from veterinary professionals and researchers.
    limit: 10

pagination: true
---

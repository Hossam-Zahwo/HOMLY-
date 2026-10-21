// Used once by the authenticated database initializer; never a storefront fallback.
export const starterData={
  "categories": [
    {
      "id": "kitchen",
      "name_ar": "المطبخ",
      "slug": "kitchen",
      "image_path": "/images/kitchen.png",
      "is_active": true,
      "sort_order": 0
    },
    {
      "id": "storage",
      "name_ar": "التنظيم والتخزين",
      "slug": "storage",
      "image_path": "/images/storage.png",
      "is_active": true,
      "sort_order": 1
    },
    {
      "id": "comfort",
      "name_ar": "الراحة والديكور",
      "slug": "comfort",
      "image_path": "/images/living.png",
      "is_active": true,
      "sort_order": 2
    },
    {
      "id": "lighting",
      "name_ar": "الإضاءة",
      "slug": "lighting",
      "image_path": "/images/living.png",
      "is_active": true,
      "sort_order": 3
    },
    {
      "id": "bathroom",
      "name_ar": "الحمام",
      "slug": "bathroom",
      "image_path": "/images/storage.png",
      "is_active": true,
      "sort_order": 4
    },
    {
      "id": "desk",
      "name_ar": "ركن المكتب",
      "slug": "desk",
      "image_path": "/images/living.png",
      "is_active": true,
      "sort_order": 5
    }
  ],
  "products": [
    {
      "id": "diffuser",
      "title_ar": "موزع عطر منزلي",
      "description": "تفاصيل عملية وتصميم هادئ لبيت أكثر راحة وتنظيمًا.",
      "specifications": {},
      "kind": "variable",
      "display_mode": "separate_variants",
      "status": "published",
      "categories": [
        "comfort"
      ],
      "images": [
        "/images/diffuser.png"
      ],
      "variants": [
        {
          "id": "diffuser-0",
          "product_id": "diffuser",
          "sku": "HOM-DIFFUSER-0",
          "slug": "diffuser-0",
          "title_override": null,
          "description_override": null,
          "price_minor": 54900,
          "compare_at_minor": null,
          "stock_on_hand": 12,
          "stock_reserved": 0,
          "status": "published",
          "is_listed": true,
          "combination_key": "أبيض",
          "sort_order": 0,
          "options": {
            "اللون": "أبيض",
            "السعة": "300 مل"
          },
          "images": [
            "/images/diffuser.png"
          ]
        },
        {
          "id": "diffuser-1",
          "product_id": "diffuser",
          "sku": "HOM-DIFFUSER-1",
          "slug": "diffuser-1",
          "title_override": null,
          "description_override": null,
          "price_minor": 56900,
          "compare_at_minor": null,
          "stock_on_hand": 11,
          "stock_reserved": 0,
          "status": "published",
          "is_listed": true,
          "combination_key": "أخضر",
          "sort_order": 1,
          "options": {
            "اللون": "أخضر",
            "السعة": "300 مل"
          },
          "images": [
            "/images/diffuser-green.png"
          ]
        },
        {
          "id": "diffuser-2",
          "product_id": "diffuser",
          "sku": "HOM-DIFFUSER-2",
          "slug": "diffuser-2",
          "title_override": null,
          "description_override": null,
          "price_minor": 58900,
          "compare_at_minor": null,
          "stock_on_hand": 10,
          "stock_reserved": 0,
          "status": "published",
          "is_listed": true,
          "combination_key": "بيج",
          "sort_order": 2,
          "options": {
            "اللون": "بيج",
            "السعة": "300 مل"
          },
          "images": [
            "/images/diffuser-beige.png"
          ]
        }
      ]
    },
    {
      "id": "basket",
      "title_ar": "سلة تخزين قماشية",
      "description": "تفاصيل عملية وتصميم هادئ لبيت أكثر راحة وتنظيمًا.",
      "specifications": {},
      "kind": "simple",
      "display_mode": "grouped",
      "status": "published",
      "categories": [
        "storage"
      ],
      "images": [
        "/images/basket.png"
      ],
      "variants": [
        {
          "id": "basket-0",
          "product_id": "basket",
          "sku": "HOM-BASKET-0",
          "slug": "basket-0",
          "title_override": null,
          "description_override": null,
          "price_minor": 34000,
          "compare_at_minor": null,
          "stock_on_hand": 12,
          "stock_reserved": 0,
          "status": "published",
          "is_listed": true,
          "combination_key": "default",
          "sort_order": 0,
          "options": {},
          "images": [
            "/images/basket.png"
          ]
        }
      ]
    },
    {
      "id": "lamp",
      "title_ar": "مصباح طاولة مودرن",
      "description": "تفاصيل عملية وتصميم هادئ لبيت أكثر راحة وتنظيمًا.",
      "specifications": {},
      "kind": "simple",
      "display_mode": "grouped",
      "status": "published",
      "categories": [
        "lighting"
      ],
      "images": [
        "/images/lamp.png"
      ],
      "variants": [
        {
          "id": "lamp-0",
          "product_id": "lamp",
          "sku": "HOM-LAMP-0",
          "slug": "lamp-0",
          "title_override": null,
          "description_override": null,
          "price_minor": 42000,
          "compare_at_minor": null,
          "stock_on_hand": 12,
          "stock_reserved": 0,
          "status": "published",
          "is_listed": true,
          "combination_key": "default",
          "sort_order": 0,
          "options": {},
          "images": [
            "/images/lamp.png"
          ]
        }
      ]
    },
    {
      "id": "jars",
      "title_ar": "طقم برطمانات حفظ الطعام",
      "description": "تفاصيل عملية وتصميم هادئ لبيت أكثر راحة وتنظيمًا.",
      "specifications": {},
      "kind": "simple",
      "display_mode": "grouped",
      "status": "published",
      "categories": [
        "kitchen"
      ],
      "images": [
        "/images/jars.png"
      ],
      "variants": [
        {
          "id": "jars-0",
          "product_id": "jars",
          "sku": "HOM-JARS-0",
          "slug": "jars-0",
          "title_override": null,
          "description_override": null,
          "price_minor": 29900,
          "compare_at_minor": null,
          "stock_on_hand": 12,
          "stock_reserved": 0,
          "status": "published",
          "is_listed": true,
          "combination_key": "default",
          "sort_order": 0,
          "options": {},
          "images": [
            "/images/jars.png"
          ]
        }
      ]
    },
    {
      "id": "tools",
      "title_ar": "طقم أدوات المطبخ",
      "description": "تفاصيل عملية وتصميم هادئ لبيت أكثر راحة وتنظيمًا.",
      "specifications": {},
      "kind": "simple",
      "display_mode": "grouped",
      "status": "published",
      "categories": [
        "kitchen"
      ],
      "images": [
        "/images/tools.png"
      ],
      "variants": [
        {
          "id": "tools-0",
          "product_id": "tools",
          "sku": "HOM-TOOLS-0",
          "slug": "tools-0",
          "title_override": null,
          "description_override": null,
          "price_minor": 28500,
          "compare_at_minor": null,
          "stock_on_hand": 12,
          "stock_reserved": 0,
          "status": "published",
          "is_listed": true,
          "combination_key": "default",
          "sort_order": 0,
          "options": {},
          "images": [
            "/images/tools.png"
          ]
        }
      ]
    },
    {
      "id": "towels",
      "title_ar": "طقم مناشف قطنية",
      "description": "تفاصيل عملية وتصميم هادئ لبيت أكثر راحة وتنظيمًا.",
      "specifications": {},
      "kind": "simple",
      "display_mode": "grouped",
      "status": "published",
      "categories": [
        "bathroom"
      ],
      "images": [
        "/images/towels.png"
      ],
      "variants": [
        {
          "id": "towels-0",
          "product_id": "towels",
          "sku": "HOM-TOWELS-0",
          "slug": "towels-0",
          "title_override": null,
          "description_override": null,
          "price_minor": 39900,
          "compare_at_minor": null,
          "stock_on_hand": 12,
          "stock_reserved": 0,
          "status": "published",
          "is_listed": true,
          "combination_key": "default",
          "sort_order": 0,
          "options": {},
          "images": [
            "/images/towels.png"
          ]
        }
      ]
    }
  ],
  "config": {
    "schemaVersion": 2,
    "brand": {
      "name": "هومي",
      "latin": "H O M Y",
      "logo": "",
      "tagline": "تفاصيل عملية لبيت أكثر راحة"
    },
    "header": {
      "announcement": "",
      "showSearch": true,
      "searchPlaceholder": "ابحث عن منتجات لبيتك...",
      "showOrders": true,
      "showCategories": true,
      "links": [
        {
          "id": "all",
          "label": "جميع المنتجات",
          "href": "/products",
          "visible": true
        },
        {
          "id": "offers",
          "label": "العروض",
          "href": "/offers",
          "visible": true
        }
      ]
    },
    "footer": {
      "description": "كل ركن أجمل مع هومي.\nاختيارات عملية لبيت أكثر راحة.",
      "copyright": "هومي — جميع الحقوق محفوظة",
      "columns": [
        {
          "id": "shop",
          "title": "تسوق",
          "links": [
            {
              "id": "products",
              "label": "جميع المنتجات",
              "href": "/products",
              "visible": true
            },
            {
              "id": "categories",
              "label": "أقسام المتجر",
              "href": "/categories",
              "visible": true
            },
            {
              "id": "offers",
              "label": "العروض",
              "href": "/offers",
              "visible": true
            }
          ]
        },
        {
          "id": "help",
          "title": "معاك في كل خطوة",
          "links": [
            {
              "id": "cart",
              "label": "سلة التسوق",
              "href": "/cart",
              "visible": true
            },
            {
              "id": "orders",
              "label": "طلباتي",
              "href": "/orders",
              "visible": true
            },
            {
              "id": "contact",
              "label": "تواصل معنا",
              "href": "/page/contact",
              "visible": true
            }
          ]
        }
      ],
      "socials": []
    },
    "whatsapp": {
      "enabled": false,
      "number": "",
      "orderMessage": "أهلًا، عايز أؤكد الطلب رقم {code}.",
      "reviewMessage": "شكرًا لاختيارك هومي. يسعدنا تقييمك لتجربتك والمنتجات اللي وصلتك: {link}",
      "showFloating": true
    },
    "style": {
      "primary": "#687664",
      "background": "#FCFCFA",
      "text": "#373B38",
      "radius": 14,
      "spacing": 34,
      "motion": true
    },
    "labels": {
      "catalogBannerImage": "/images/storage.png",
      "catalogSubtitle": "حلول عملية ولمسات هادئة لكل زاوية في منزلك",
      "offersTitle": "عروض هومي",
      "allProducts": "جميع المنتجات",
      "homeLabel": "الرئيسية",
      "filterLabel": "فلترة",
      "sortLabel": "ترتيب",
      "filterTitle": "فلترة النتائج",
      "maxPriceLabel": "أقصى سعر بالجنيه",
      "availableLabel": "متوفر حاليًا",
      "clearFilters": "مسح الفلاتر",
      "showResults": "عرض النتائج",
      "ordersTitle": "طلباتي",
      "emptyProducts": "لا توجد منتجات منشورة في هذا القسم بعد.",
      "continueShopping": "استكمل التسوق",
      "categoriesSubtitle": "اكتشف أقسام المتجر",
      "productAdd": "أضف للسلة",
      "productBuy": "اشتري الآن",
      "inStock": "متوفر في المخزون",
      "outOfStock": "غير متوفر حاليًا",
      "productDescription": "الوصف",
      "productSpecs": "المواصفات",
      "productChoices": "اختار المناسب ليك",
      "related": "منتجات ممكن تعجبك",
      "sameGroup": "من نفس المجموعة",
      "cartTitle": "سلة التسوق",
      "checkoutTitle": "بيانات التوصيل والدفع",
      "checkoutConfirm": "تسجيل الطلب",
      "orderThanks": "تم استلام طلبك",
      "whatsappConfirm": "تأكيد ومتابعة الطلب على واتساب",
      "codLabel": "الدفع عند الاستلام",
      "searchTitle": "اختيارات لبيتك",
      "categoriesTitle": "كل ركن في بيتك",
      "reviewsTitle": "آراء عملائنا",
      "reviewFormTitle": "شاركنا تجربتك",
      "customerName": "الاسم بالكامل",
      "customerPhone": "رقم الموبايل",
      "customerArea": "المنطقة / الحي",
      "customerAddress": "العنوان التفصيلي",
      "customerNotes": "ملاحظات إضافية (اختياري)",
      "shippingNote": "تكلفة الشحن تظهر بعد اختيار منطقة التوصيل.",
      "emptyCart": "السلة لسه فاضية",
      "trustShipping": "تفاصيل الشحن واضحة",
      "trustQuality": "اختيارات لبيتك",
      "trustOrders": "تابع طلبك بسهولة"
    },
    "pages": [
      {
        "id": "contact",
        "slug": "contact",
        "title": "تواصل معنا",
        "body": "يسعدنا مساعدتك. استخدم زر واتساب للتواصل بعد تفعيله."
      }
    ],
    "pushPublicKey": "",
    "blocks": [
      {
        "id": "hero",
        "type": "hero",
        "title": "كل ركن له حكاية",
        "subtitle": "مستلزمات وأفكار تجعل منزلك أكثر راحة وجمالًا",
        "body": "",
        "image": "/images/living.png",
        "buttonLabel": "تسوق الآن",
        "href": "/products",
        "showButton": true,
        "visible": true,
        "source": "all",
        "categoryId": "",
        "variantIds": [],
        "limit": 4,
        "maxPrice": 500,
        "slides": [
          {
            "id": "kitchen",
            "title": "المطبخ",
            "subtitle": "أدوات تصنع فرقًا كل يوم",
            "image": "/images/kitchen.png",
            "mobileImage": "",
            "alt": "المطبخ",
            "buttonLabel": "تسوق الآن",
            "href": "/category/kitchen",
            "showButton": true,
            "visible": true
          },
          {
            "id": "living",
            "title": "غرفة المعيشة",
            "subtitle": "راحة تضيف لحياتك أجمل",
            "image": "/images/living.png",
            "mobileImage": "",
            "alt": "غرفة المعيشة",
            "buttonLabel": "تسوق الآن",
            "href": "/category/comfort",
            "showButton": true,
            "visible": true
          },
          {
            "id": "storage",
            "title": "التنظيم والترتيب",
            "subtitle": "كل شيء في مكانه",
            "image": "/images/storage.png",
            "mobileImage": "",
            "alt": "التنظيم",
            "buttonLabel": "تسوق الآن",
            "href": "/category/storage",
            "showButton": true,
            "visible": true
          }
        ]
      },
      {
        "id": "rooms",
        "type": "categories",
        "title": "تسوق حسب الغرفة",
        "subtitle": "",
        "body": "",
        "image": "/images/living.png",
        "buttonLabel": "تسوق الآن",
        "href": "/categories",
        "showButton": true,
        "visible": true,
        "source": "all",
        "categoryId": "",
        "variantIds": [],
        "limit": 4,
        "maxPrice": 500,
        "slides": []
      },
      {
        "id": "comfort",
        "type": "editorial",
        "title": "ركن الراحة",
        "subtitle": "تفاصيل صغيرة.. تصنع فرق كبير في يومك",
        "body": "",
        "image": "/images/living.png",
        "buttonLabel": "تسوق الآن",
        "href": "/products",
        "showButton": true,
        "visible": true,
        "source": "all",
        "categoryId": "",
        "variantIds": [],
        "limit": 4,
        "maxPrice": 500,
        "slides": []
      },
      {
        "id": "budget",
        "type": "budget",
        "title": "لمسات بأقل من ٥٠٠ جنيه",
        "subtitle": "اختيارات عملية تناسب بيتك",
        "body": "",
        "image": "/images/living.png",
        "buttonLabel": "تسوق الآن",
        "href": "/products",
        "showButton": true,
        "visible": true,
        "source": "all",
        "categoryId": "",
        "variantIds": [],
        "limit": 4,
        "maxPrice": 500,
        "slides": []
      },
      {
        "id": "new",
        "type": "products",
        "title": "وصل حديثًا",
        "subtitle": "",
        "body": "",
        "image": "/images/living.png",
        "buttonLabel": "تسوق الآن",
        "href": "/products",
        "showButton": true,
        "visible": true,
        "source": "latest",
        "categoryId": "",
        "variantIds": [],
        "limit": 4,
        "maxPrice": 500,
        "slides": []
      },
      {
        "id": "fragrance",
        "type": "text",
        "title": "عطور ولمسات هادئة",
        "subtitle": "أجواء أجمل في كل ركن من بيتك",
        "body": "",
        "image": "/images/diffuser.png",
        "buttonLabel": "تسوق الآن",
        "href": "/products",
        "showButton": true,
        "visible": true,
        "source": "all",
        "categoryId": "",
        "variantIds": [],
        "limit": 4,
        "maxPrice": 500,
        "slides": []
      },
      {
        "id": "reviews",
        "type": "reviews",
        "title": "آراء عملائنا",
        "subtitle": "",
        "body": "",
        "image": "/images/living.png",
        "buttonLabel": "تسوق الآن",
        "href": "/products",
        "showButton": true,
        "visible": true,
        "source": "all",
        "categoryId": "",
        "variantIds": [],
        "limit": 4,
        "maxPrice": 500,
        "slides": []
      },
      {
        "id": "trust",
        "type": "features",
        "title": "معاك في كل خطوة",
        "subtitle": "",
        "body": "",
        "image": "/images/living.png",
        "buttonLabel": "تسوق الآن",
        "href": "/products",
        "showButton": true,
        "visible": true,
        "source": "all",
        "categoryId": "",
        "variantIds": [],
        "limit": 4,
        "maxPrice": 500,
        "slides": []
      }
    ]
  }
} as const;

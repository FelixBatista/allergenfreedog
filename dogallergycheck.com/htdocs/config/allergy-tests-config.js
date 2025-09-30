// Dog Allergy Tests Configuration
// Update this file to easily modify coupons, links, and test information

const ALLERGY_TESTS_CONFIG = {
  // Coupon codes and discounts
  coupons: {
    ucari: {
      code: "HEALTHY15",
      discount: "15% Off",
      description: "Use code at checkout"
    },
    myPetHealth: {
      code: "HEALTHY2025", 
      discount: "10% Off",
      description: "Use code at checkout"
    },
    fiveStrands: {
      code: "HEALTHYHAIR",
      discount: "10% Off", 
      description: "Use code at checkout"
    },
    easyDna: {
      code: "ITOLOFF10",
      discount: "10% Off",
      description: "Use code at checkout"
    },
    nutriscan: {
      code: "NUTRISCAN10OFF",
      discount: "10% Off",
      description: "Use code at checkout"
    }
  },

  // Test information - easily update details here
  tests: {
    ucari: {
      name: "UCARI Pet Testing Kit",
      rating: 4.9,
      itemsTested: "1000+",
      sampleType: "Hair",
      resultsTime: "2 days",
      priceRange: "$99-149",
      description: "UCARI helps pinpoint the food and non-food items that may be causing your pet unpleasant symptoms. Located in Orlando, FL.",
      features: [
        "Tests for 1000+ possible intolerances and nutritional imbalances",
        "Uses hair sample - no stress for your pet", 
        "Results in 2 days after sample received",
        "Doctor Recommended",
        "Comprehensive detailed report"
      ],
      url: "https://www.ucari.com",
      badge: "#1 Most Popular",
      featured: true
    },
    myPetHealth: {
      name: "My Pet Health Store",
      rating: 4.8,
      itemsTested: "550+",
      sampleType: "Hair", 
      resultsTime: "5-10 days",
      priceRange: "$89-129",
      description: "Born from a passion to help people better understand their pets – specifically their food & drink sensitivities.",
      features: [
        "Tests for 550+ items",
        "Uses hair sample",
        "Results ready within 5-10 days", 
        "Detailed allergy report",
        "Easy-to-understand results"
      ],
      url: "https://www.mypethealthstore.com",
      badge: "Outstanding",
      featured: false
    },
    fiveStrands: {
      name: "5Strands Pet Test",
      rating: 4.9,
      itemsTested: "466+",
      sampleType: "Hair",
      resultsTime: "2-7 days", 
      priceRange: "$78-118",
      description: "5Strands utilizes bioresonance technology to identify temporary imbalances in the body that may be causing unwanted discomforts.",
      features: [
        "Tests for 466+ food and environmental items",
        "Uses hair sample",
        "Results provided online within 2-7 days",
        "Free shipping on 2+ tests",
        "Veterinarian Approved"
      ],
      url: "https://www.5strands.com",
      badge: "Outstanding", 
      featured: false
    },
    easyDna: {
      name: "Easy DNA Pet Test",
      rating: 4.8,
      itemsTested: "192",
      sampleType: "Cheek Swab",
      resultsTime: "5 days",
      priceRange: "$95-135", 
      description: "Easy DNA USA has been 18 years on the market, is a leading provider of DNA testing and genetic testing.",
      features: [
        "Tests for 143 foods and 49 artificial allergens",
        "Uses a cheek swab",
        "Food suggestion report available",
        "Results in 5 days",
        "Dietary and lifestyle guidelines included"
      ],
      url: "https://www.easy-dna.com",
      badge: "Outstanding",
      featured: false
    },
    nutriscan: {
      name: "Nutriscan Pet Test",
      rating: 4.7,
      itemsTested: "112", 
      sampleType: "Saliva",
      resultsTime: "3-10 days",
      priceRange: "$120-160",
      description: "Nutriscan is diagnostic test for dogs, cats and horses to identify the commonly seen food intolerances and sensitivities in saliva.",
      features: [
        "Tests for up to 112 commonly ingested ingredients",
        "Easy saliva collection", 
        "Results provided online within 3-10 days",
        "Veterinary formulated and approved",
        "Gold Standard test"
      ],
      url: "https://www.nutriscan.org",
      badge: "Very Good",
      featured: false
    }
  },

  // Statistics section
  stats: {
    dogsWithAllergies: "1 in 5",
    dogsWithAllergiesDesc: "dogs are likely to experience food-related intolerances during their lifetime",
    resultsTime: "2-10", 
    resultsTimeDesc: "days to get results from most at-home tests",
    maxAllergens: "1000+",
    maxAllergensDesc: "allergens tested by top-rated kits"
  },

  // FAQ questions and answers
  faqs: [
    {
      question: "What is the difference between an allergy and an intolerance?",
      answer: "An allergen means that your pup has an immune reaction to the substance; this can lead to symptoms such as itching, hives, and even anaphylaxis. Intolerance means that the pup is not having an allergic reaction but is instead experiencing uncomfortable symptoms such as intestinal upset or skin irritation when consuming the food item in question."
    },
    {
      question: "How do vets test for allergies?", 
      answer: "Veterinarians can perform RAST (radioallergosorbent) blood tests, intradermal skin testing, or serum allergy tests. These tests measure IgE, IgG, and immune complexes to identify specific allergens causing reactions in your dog."
    },
    {
      question: "How much does a veterinarian allergy test for dogs cost?",
      answer: "Veterinary allergy testing typically costs $200-500 or more, depending on the type of test and your location. At-home tests offer a more affordable alternative at $80-160, though they should be used as a starting point and discussed with your vet."
    },
    {
      question: "Does pet insurance cover allergy testing?",
      answer: "You'll need to check with your pet insurance provider. Most pet health insurance will cover allergy testing together with the office visit for skin conditions and other related health conditions, but coverage varies by plan."
    },
    {
      question: "Are at-home allergy tests accurate?",
      answer: "At-home allergy tests can provide valuable insights into potential food sensitivities and intolerances. While they may not be as comprehensive as veterinary testing, they offer a good starting point for identifying problematic foods and can help guide dietary changes."
    }
  ]
};

// Make it available globally
if (typeof window !== 'undefined') {
  window.ALLERGY_TESTS_CONFIG = ALLERGY_TESTS_CONFIG;
}

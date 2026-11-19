// -----------------------------------------------------------------
// SITE DATA DEFAULTS — Mustaqiim Relief and Charity Foundation
// Used as immediate initial content and fallback before Firestore
// live updates are synced, and as seed presets in Admin Dashboard.
// -----------------------------------------------------------------

export const LICENSED_IMAGE_PRESETS = [
  {
    label: "Community Relief Distribution (Kampala)",
    url: "/src/assets/images/hero_community_relief_1795094926708.jpg",
    alt: "Humanitarian volunteers handing neatly packaged food aid boxes to families in a sunlit courtyard in Kampala, Uganda."
  },
  {
    label: "Ugandan Children Receiving School Kits",
    url: "/src/assets/images/uganda_children_education_1795096380910.jpg",
    alt: "Ugandan primary school children smiling in a bright classroom while receiving notebooks, pencils, and school bags from volunteers."
  },
  {
    label: "Child Nutrition & Community Meals (Uganda)",
    url: "/src/assets/images/uganda_children_nutrition_1795096380999.jpg",
    alt: "Ugandan children and mothers sharing warm, nutritious cooked meals together outdoors under green shade trees."
  },
  {
    label: "Ugandan Children & Clean Water Access",
    url: "/src/assets/images/uganda_children_water_joy_1795096380980.jpg",
    alt: "Ugandan children smiling as they fill yellow jerrycans with clear drinking water at a rural community water tap."
  },
  {
    label: "Children's Reading & Care Center (Nsambya)",
    url: "/src/assets/images/uganda_children_care_books_1795096380777.jpg",
    alt: "Young Ugandan students reading illustrated storybooks together at wooden desks in a Nsambya community learning room."
  },
  {
    label: "Clean Water Borehole Pump (Rural Uganda)",
    url: "/src/assets/images/hero_clean_water_1795094927787.jpg",
    alt: "Community members collecting clear drinking water from a newly installed village borehole pump in rural Uganda."
  },
  {
    label: "Pastoral Hills & Qurbani Livestock (Uganda)",
    url: "/src/assets/images/hero_qurbani_eid_1795094927464.jpg",
    alt: "Ankole cattle and goats grazing across misty green hills in Uganda at sunrise."
  },
  {
    label: "Food Relief Parcels Store (Kampala)",
    url: "/src/assets/images/campaign_food_packs_1795094926972.jpg",
    alt: "Stacked woven sacks of rice, beans, flour, and bottles of cooking oil prepared for community food relief in Uganda."
  },
  {
    label: "Nsambya Field Coordinators",
    url: "/src/assets/images/about_nsambya_outreach_1795094927735.jpg",
    alt: "Two community relief coordinators reviewing distribution logs beside food aid supplies in Nsambya, Kampala."
  }
];

export const DEFAULT_DATA = {
  settings: {
    organisation_name: "Mustaqiim Relief and Charity Foundation",
    tagline: "Humanitarian Relief, Qurbani, Child Care, and Clean Water in Uganda",
    legal_status: "Non-Profit Humanitarian & Charitable Foundation (Uganda)",
    registration_number: "Pending public registry listing — editable in Admin",
    operational_hours: "Monday to Saturday, 08:30 – 17:30 EAT (UTC+3)",
    address_line: "Nsambya, Makindye Division, Kampala, Uganda",
    phone_display: "+256 708 684 223",
    phone_international: "256708684223",
    whatsapp_message: "Assalamu alaikum, I would like to learn more about Mustaqiim Relief and Charity Foundation programmes.",
    public_email: "",
    facebook_url: "",
    instagram_url: "",
    map_lat: 0.3025,
    map_lng: 32.5945,
    map_label: "Nsambya, Kampala, Uganda",
    map_description: "General operational area in Nsambya, Kampala — Mustaqiim Relief and Charity Foundation.",
    announcement_text: "Qurbani 2026 & Child Education Kits open. Coordinate directly with our Kampala team.",
    footer_mission: "Serving vulnerable families and children across Uganda through transparent Qurbani distribution, food relief, clean water access, and community-led educational care.",
    commitment_quote: "Amanah means every donation is treated as a sacred trust. We handle every contribution with accountability, dignity, and direct community coordination.",
    commitment_author: "Mustaqiim Relief and Charity Foundation",
    commitment_role: "Accountability & Child Safeguarding Commitment"
  },

  images: {
    about_side_image_url: "/src/assets/images/about_nsambya_outreach_1795094927735.jpg",
    about_side_image_alt: "Two foundation coordinators reviewing relief distribution logs beside food aid supplies in Nsambya, Kampala.",
    child_support_bg_url: "/src/assets/images/uganda_children_education_1795096380910.jpg",
    child_support_bg_alt: "Ugandan primary school children smiling with school bags and notebooks in a classroom supported by community volunteers.",
    child_support_card1_url: "/src/assets/images/uganda_children_nutrition_1795096380999.jpg",
    child_support_card1_alt: "Ugandan children and mothers sharing warm nutritious cooked meals outdoors under green shade trees.",
    child_support_card2_url: "/src/assets/images/uganda_children_care_books_1795096380777.jpg",
    child_support_card2_alt: "Young Ugandan students reading storybooks together at wooden desks in Nsambya, Kampala.",
    qurbani_promo_bg_url: "/src/assets/images/hero_qurbani_eid_1795094927464.jpg",
    qurbani_promo_bg_alt: "Misty green Ugandan hills at sunrise where livestock for seasonal Qurbani are sustainably grazed.",
    qurbani_promo_feature_url: "/src/assets/images/hero_qurbani_eid_1795094927464.jpg",
    qurbani_promo_feature_alt: "Ankole cattle and goats grazing across green pastures in Uganda at sunrise.",
    quote_bg_url: "/src/assets/images/uganda_children_water_joy_1795096380980.jpg",
    quote_bg_alt: "Ugandan children collecting clean drinking water together at a community tap in rural Uganda.",
    cta_bg_url: "/src/assets/images/uganda_children_nutrition_1795096380999.jpg",
    cta_bg_alt: "Community meal outreach supporting mothers and children across Uganda.",
    inner_hero_about_url: "/src/assets/images/uganda_children_care_books_1795096380777.jpg",
    inner_hero_about_alt: "Ugandan children reading books in a community learning room in Nsambya.",
    inner_hero_qurbani_url: "/src/assets/images/hero_qurbani_eid_1795094927464.jpg",
    inner_hero_qurbani_alt: "Ugandan green pastoral hills supporting ethical Qurbani livestock sourcing.",
    inner_hero_donate_url: "/src/assets/images/uganda_children_education_1795096380910.jpg",
    inner_hero_donate_alt: "Ugandan children smiling in school receiving learning supplies from volunteers."
  },

  legal: {
    privacy_updated: "November 2026",
    terms_updated: "November 2026",
    refund_updated: "November 2026",
    cookie_updated: "November 2026",
    donation_policy_updated: "November 2026",
    data_deletion_updated: "November 2026",
    privacy_contact_note: "For privacy, data access, or erasure requests, contact our Kampala coordination office via WhatsApp (+256 708 684 223) or submit a request on our Data Deletion page."
  },

  stats: {
    section_note: "We publish only verified programme figures once audited and entered in our database.",
    items: [
      { label: "Operational Base", value: "Kampala", note: "Nsambya, Uganda" },
      { label: "Minimum Gift", value: "USD 3", note: "Direct coordination" },
      { label: "Core Programmes", value: "5", note: "Children, Qurbani, Food, Water, Care" },
      { label: "Verified Field Figures", value: "Pending Audit", note: "Updated via Admin Database" }
    ]
  },

  heroSlides: [
    {
      id: "slide-1",
      eyebrow: "Nsambya, Kampala, Uganda",
      title: "Compassion delivered, one family at a time.",
      subtitle: "Mustaqiim Relief and Charity Foundation coordinates food relief, Qurbani, child education support, and clean water across Uganda with direct accountability.",
      primary_cta_label: "Donate now",
      primary_cta_href: "donate.html",
      secondary_cta_label: "Explore campaigns",
      secondary_cta_href: "campaigns.html",
      image_url: "/src/assets/images/hero_community_relief_1795094926708.jpg",
      image_alt: "Humanitarian volunteers handing neatly packaged food aid boxes to families in a sunlit courtyard in Kampala, Uganda.",
      order: 1,
      active: true
    },
    {
      id: "slide-2",
      eyebrow: "Helping Children in Uganda",
      title: "Nurturing young learners with school kits and daily meals.",
      subtitle: "From notebooks and backpacks in Nsambya to warm community lunches, we walk beside orphans and vulnerable children so poverty never closes a classroom door.",
      primary_cta_label: "Support Ugandan children",
      primary_cta_href: "campaign.html?slug=child-education-nutrition",
      secondary_cta_label: "See child programmes",
      secondary_cta_href: "index.html#child-support",
      image_url: "/src/assets/images/uganda_children_education_1795096380910.jpg",
      image_alt: "Ugandan primary school children smiling in a bright classroom while receiving notebooks, pencils, and school bags from volunteers.",
      order: 2,
      active: true
    },
    {
      id: "slide-3",
      eyebrow: "Clean Water Access",
      title: "Safe drinking water for rural Ugandan villages.",
      subtitle: "Partnering with local engineers to construct and rehabilitate community boreholes, freeing children from long daily walks for unsafe water.",
      primary_cta_label: "Support clean water",
      primary_cta_href: "campaign.html?slug=clean-water-wells",
      secondary_cta_label: "Our mission",
      secondary_cta_href: "about.html",
      image_url: "/src/assets/images/uganda_children_water_joy_1795096380980.jpg",
      image_alt: "Ugandan children smiling as they fill yellow jerrycans with clear drinking water at a rural community water tap.",
      order: 3,
      active: true
    },
    {
      id: "slide-4",
      eyebrow: "Qurbani / Udhiya 2026",
      title: "Share the blessings of Eid al-Adha with dignity.",
      subtitle: "Every Qurbani share is sourced locally, slaughtered according to Islamic guidance, and distributed fresh to households and orphan-headed families.",
      primary_cta_label: "Reserve Qurbani",
      primary_cta_href: "qurbani.html",
      secondary_cta_label: "Read FAQ",
      secondary_cta_href: "faq.html",
      image_url: "/src/assets/images/hero_qurbani_eid_1795094927464.jpg",
      image_alt: "Ankole cattle and goats grazing across misty green hills in Uganda at sunrise.",
      order: 4,
      active: true
    }
  ],

  programmes: [
    {
      id: "prog-children",
      title: "Child Education & Nutrition",
      description: "School supply kits, literacy books, and warm community meals supporting orphans and primary learners across Kampala and central Uganda.",
      link_label: "Child support",
      link_href: "campaign.html?slug=child-education-nutrition",
      icon_key: "children",
      order: 1,
      active: true
    },
    {
      id: "prog-qurbani",
      title: "Qurbani / Udhiya",
      description: "Share fresh meat during Eid al-Adha with families who would otherwise go without. Goat, cow, and camel share options coordinated locally.",
      link_label: "Explore Qurbani",
      link_href: "qurbani.html",
      icon_key: "qurbani",
      order: 2,
      active: true
    },
    {
      id: "prog-food",
      title: "Food Relief",
      description: "Essential food parcels containing rice, beans, flour, and cooking oil for vulnerable households identified with community leaders.",
      link_label: "See campaigns",
      link_href: "campaigns.html",
      icon_key: "food",
      order: 3,
      active: true
    },
    {
      id: "prog-water",
      title: "Clean Water",
      description: "Constructing and rehabilitating shallow wells and boreholes in rural districts to provide reliable access to safe drinking water.",
      link_label: "Water projects",
      link_href: "campaign.html?slug=clean-water-wells",
      icon_key: "water",
      order: 4,
      active: true
    }
  ],

  qurbaniOptions: [
    { id: "goat", label: "Goat / Sheep", note: "One full animal (1 share)", price: 0, currency: "USD", available: true, order: 1 },
    { id: "cow-share", label: "Cow Share (1/7)", note: "One of seven shares", price: 0, currency: "USD", available: true, order: 2 },
    { id: "cow-full", label: "Full Cow", note: "Seven shares total", price: 0, currency: "USD", available: true, order: 3 },
    { id: "camel-share", label: "Camel Share (1/7)", note: "One of seven shares", price: 0, currency: "USD", available: true, order: 4 },
    { id: "camel-full", label: "Full Camel", note: "Seven shares total", price: 0, currency: "USD", available: true, order: 5 }
  ],

  campaigns: [
    {
      id: "child-education-nutrition",
      slug: "child-education-nutrition",
      title: "Children's Education & Nutrition",
      summary: "Equipping vulnerable Ugandan children with school kits, reading books, and nutritious community meals.",
      description: "Across Nsambya and neighbouring Ugandan districts, economic hardship often keeps bright children out of class. This ongoing initiative equips orphaned and low-income learners with exercise books, pens, backpacks, and reading materials alongside community-led meal support so children can focus on learning in safety and dignity.",
      image_url: "/src/assets/images/uganda_children_education_1795096380910.jpg",
      image_alt: "Ugandan primary school children smiling in a classroom receiving notebooks, pencils, and school bags.",
      target_amount: 0,
      raised_amount: 0,
      currency: "USD",
      location: "Kampala & Central Uganda",
      active: true,
      order: 1
    },
    {
      id: "qurbani-2026",
      slug: "qurbani-2026",
      title: "Qurbani 2026",
      summary: "Provide fresh meat to families in need during the blessed days of Eid al-Adha.",
      description: "Our Qurbani programme distributes fresh meat to vulnerable families across Uganda. Each share is sourced, slaughtered, and distributed according to Islamic principles, with priority given to widows, orphans, and households in rural communities.",
      image_url: "/src/assets/images/hero_qurbani_eid_1795094927464.jpg",
      image_alt: "Ankole cattle and goats grazing across green pastures in Uganda for the Qurbani programme.",
      target_amount: 0,
      raised_amount: 0,
      currency: "USD",
      location: "Uganda",
      active: true,
      order: 2
    },
    {
      id: "ramadan-food-packs",
      slug: "ramadan-food-packs",
      title: "Ramadan Food Packs",
      summary: "Essential food parcels for families facing food insecurity across Kampala and neighbouring districts.",
      description: "Food packs containing rice, cooking oil, beans, flour, and dates are distributed to households identified through local community leaders. Each pack is structured to support a household with staple nutrition.",
      image_url: "/src/assets/images/campaign_food_packs_1795094926972.jpg",
      image_alt: "Neatly stacked humanitarian food relief sacks of rice, beans, flour, and cooking oil prepared for families.",
      target_amount: 0,
      raised_amount: 0,
      currency: "USD",
      location: "Kampala, Uganda",
      active: true,
      order: 3
    },
    {
      id: "clean-water-wells",
      slug: "clean-water-wells",
      title: "Clean Water Wells",
      summary: "Construct and rehabilitate community water points to bring safe drinking water closer to rural villages.",
      description: "We partner with local water engineers to construct and rehabilitate shallow wells and hand-pumped boreholes, reducing waterborne disease and the daily walking distance for children and families.",
      image_url: "/src/assets/images/hero_clean_water_1795094927787.jpg",
      image_alt: "Villagers filling clean water containers at a newly rehabilitated rural borehole in central Uganda.",
      target_amount: 0,
      raised_amount: 0,
      currency: "USD",
      location: "Central Uganda",
      active: true,
      order: 4
    }
  ],

  stories: [
    {
      id: "school-kits-kampala-children",
      slug: "school-kits-kampala-children",
      title: "Supporting Young Learners in Nsambya with Books & Meals",
      excerpt: "How local teachers, volunteers, and community elders coordinate school supplies and warm meals for children.",
      body: "In Nsambya and surrounding parishes, parents and guardians work tirelessly to keep children enrolled in school. Yet even small costs for exercise books, pens, and school bags can interrupt a child's term.\n\nThrough direct coordination with local primary schools and community caretakers, Mustaqiim Relief prepares practical learning kits and organizes warm community meal days. Every distribution respects the privacy and dignity of children and their families.",
      image_url: "/src/assets/images/uganda_children_care_books_1795096380777.jpg",
      image_alt: "Ugandan primary students reading storybooks together at wooden desks in a bright Kampala learning room.",
      published_at: "2026-11-02T10:00:00.000Z",
      active: true
    },
    {
      id: "a-family-supported",
      slug: "a-family-supported",
      title: "Coordinating Food Relief in Nsambya",
      excerpt: "How local community leaders help identify households most in need for direct parcel delivery.",
      body: "Working alongside neighbourhood elders in Nsambya, our volunteers verify household needs quietly and respectfully before distribution day.\n\nEach food pack includes staple dry goods selected for local cooking needs. Direct coordination ensures donations reach families without unnecessary overhead.",
      image_url: "/src/assets/images/hero_community_relief_1795094926708.jpg",
      image_alt: "Volunteers handing food aid boxes to mothers and families in a Kampala courtyard.",
      published_at: "2026-10-15T10:00:00.000Z",
      active: true
    },
    {
      id: "water-for-a-village",
      slug: "water-for-a-village",
      title: "Rehabilitating Community Water Access",
      excerpt: "Restoring safe borehole water for rural families in Central Uganda through local engineering partnerships.",
      body: "When a rural hand pump breaks down, families and school-age children often walk kilometres to collect water from open sources.\n\nBy partnering with local technicians to repair pump seals, piping, and drainage aprons, existing community water points can return to safe daily operation quickly and sustainably.",
      image_url: "/src/assets/images/hero_clean_water_1795094927787.jpg",
      image_alt: "Rural Ugandan residents pumping clean drinking water from a repaired community borehole.",
      published_at: "2026-09-20T10:00:00.000Z",
      active: true
    }
  ],

  media: [
    {
      id: "uganda-children-school-kits",
      slug: "uganda-children-school-kits",
      title: "Primary School Supply Outreach",
      caption: "Children receiving notebooks, pencils, and bags for the school term in Kampala.",
      media_type: "photo",
      image_url: "/src/assets/images/uganda_children_education_1795096380910.jpg",
      video_url: "",
      image_alt: "Ugandan primary school children smiling in a classroom while holding new notebooks and backpacks.",
      license_note: "Licensed foundation editorial asset — Mustaqiim Relief and Charity Foundation",
      featured: true,
      order: 1,
      active: true
    },
    {
      id: "uganda-children-nutrition",
      slug: "uganda-children-nutrition",
      title: "Community Child Nutrition Meal",
      caption: "Mothers and children sharing warm, balanced meals during community outreach.",
      media_type: "photo",
      image_url: "/src/assets/images/uganda_children_nutrition_1795096380999.jpg",
      video_url: "",
      image_alt: "Ugandan children and mothers sharing warm cooked food outdoors under shade trees.",
      license_note: "Licensed foundation editorial asset — Mustaqiim Relief and Charity Foundation",
      featured: true,
      order: 2,
      active: true
    },
    {
      id: "uganda-children-water-tap",
      slug: "uganda-children-water-tap",
      title: "Safe Water for Young Families",
      caption: "Children filling clean water containers at a repaired community tap.",
      media_type: "photo",
      image_url: "/src/assets/images/uganda_children_water_joy_1795096380980.jpg",
      video_url: "",
      image_alt: "Ugandan children smiling as they fill jerrycans with clean drinking water at a community tap.",
      license_note: "Licensed foundation editorial asset — Mustaqiim Relief and Charity Foundation",
      featured: true,
      order: 3,
      active: true
    },
    {
      id: "uganda-children-reading-circle",
      slug: "uganda-children-reading-circle",
      title: "Nsambya Learning Corner",
      caption: "Shared storybooks and literacy sessions for young learners in Kampala.",
      media_type: "photo",
      image_url: "/src/assets/images/uganda_children_care_books_1795096380777.jpg",
      video_url: "",
      image_alt: "Young Ugandan students reading illustrated books together in a sunlit community room.",
      license_note: "Licensed foundation editorial asset — Mustaqiim Relief and Charity Foundation",
      featured: true,
      order: 4,
      active: true
    },
    {
      id: "community-relief-day",
      slug: "community-relief-day",
      title: "Community Relief Distribution",
      caption: "Volunteers coordinating household food parcels in Kampala.",
      media_type: "photo",
      image_url: "/src/assets/images/hero_community_relief_1795094926708.jpg",
      video_url: "",
      image_alt: "Volunteers distributing packaged food parcels in Kampala, Uganda.",
      license_note: "Licensed foundation editorial asset — Mustaqiim Relief and Charity Foundation",
      featured: true,
      order: 5,
      active: true
    },
    {
      id: "water-well-opening",
      slug: "water-well-opening",
      title: "Rural Water Borehole Site",
      caption: "Safe community drinking water source in Central Uganda.",
      media_type: "photo",
      image_url: "/src/assets/images/hero_clean_water_1795094927787.jpg",
      video_url: "",
      image_alt: "Families collecting clear water from a rural borehole pump in Uganda.",
      license_note: "Licensed foundation editorial asset — Mustaqiim Relief and Charity Foundation",
      featured: true,
      order: 6,
      active: true
    },
    {
      id: "qurbani-pastures",
      slug: "qurbani-pastures",
      title: "Pastoral Hills, Uganda",
      caption: "Healthy livestock grazing ahead of seasonal Qurbani coordination.",
      media_type: "photo",
      image_url: "/src/assets/images/hero_qurbani_eid_1795094927464.jpg",
      video_url: "",
      image_alt: "Ankole cattle and goats grazing in misty green hills in Uganda at sunrise.",
      license_note: "Licensed foundation editorial asset — Mustaqiim Relief and Charity Foundation",
      featured: true,
      order: 7,
      active: true
    },
    {
      id: "food-storage-prep",
      slug: "food-storage-prep",
      title: "Food Parcel Preparation",
      caption: "Staple rice, beans, flour, and cooking oil prepared for delivery.",
      media_type: "photo",
      image_url: "/src/assets/images/campaign_food_packs_1795094926972.jpg",
      video_url: "",
      image_alt: "Neatly stacked woven sacks of rice, beans, flour, and cooking oil inside a distribution store.",
      license_note: "Licensed foundation editorial asset — Mustaqiim Relief and Charity Foundation",
      featured: true,
      order: 8,
      active: true
    },
    {
      id: "nsambya-coordination",
      slug: "nsambya-coordination",
      title: "Field Log & Verification",
      caption: "Coordinators verifying recipient rosters in Nsambya, Kampala.",
      media_type: "photo",
      image_url: "/src/assets/images/about_nsambya_outreach_1795094927735.jpg",
      video_url: "",
      image_alt: "Two foundation coordinators reviewing relief distribution records at an outdoor table in Nsambya.",
      license_note: "Licensed foundation editorial asset — Mustaqiim Relief and Charity Foundation",
      featured: true,
      order: 9,
      active: true
    }
  ],

  faqs: [
    {
      id: "faq-account",
      question: "Do I need an account to donate?",
      answer: "No. Donors do not need to create an account. We collect only the essential contact information needed to coordinate your gift and issue confirmation.",
      order: 1,
      active: true
    },
    {
      id: "faq-min",
      question: "What is the minimum donation?",
      answer: "The minimum donation is US$3 or its equivalent in an accepted currency.",
      order: 2,
      active: true
    },
    {
      id: "faq-children",
      question: "How does child education and nutrition support work in Uganda?",
      answer: "We partner directly with local teachers, elders, and caretakers in Kampala and surrounding districts to provide school supplies, books, and warm meals while strictly protecting children's privacy and dignity.",
      order: 3,
      active: true
    },
    {
      id: "faq-qurbani",
      question: "How do I reserve a Qurbani share?",
      answer: "Select your option on the Qurbani page or contact our Kampala team on WhatsApp (+256 708 684 223). We confirm live livestock prices and schedule your reservation.",
      order: 4,
      active: true
    },
    {
      id: "faq-allocation",
      question: "How is my donation allocated and confirmed?",
      answer: "Every contribution is designated to the campaign you select. Until direct online card and mobile money checkout is enabled, our team coordinates each transfer directly and confirms receipt.",
      order: 5,
      active: true
    },
    {
      id: "faq-refunds",
      question: "Can I request a refund or data deletion?",
      answer: "Yes. Review our Refund Policy for duplicate or erroneous donations, and use our Data Deletion page at any time to request erasure of your contact records.",
      order: 6,
      active: true
    }
  ],

  donationTiers: [
    {
      id: "tier-3",
      amount: 3,
      currency: "USD",
      title: "Minimum contribution",
      description: "Illustrative example: helps contribute toward daily staple food essentials or school notebooks for a child.",
      order: 1,
      active: true
    },
    {
      id: "tier-10",
      amount: 10,
      currency: "USD",
      title: "Child school kit & staples",
      description: "Illustrative example: contributes toward school supplies or dry staples such as rice, beans, and cooking oil.",
      order: 2,
      active: true
    },
    {
      id: "tier-50",
      amount: 50,
      currency: "USD",
      title: "Clean water & nutrition fund",
      description: "Illustrative example: contributes toward borehole rehabilitation parts and community child meal outreach.",
      order: 3,
      active: true
    },
    {
      id: "tier-100",
      amount: 100,
      currency: "USD",
      title: "Programme sponsorship",
      description: "Illustrative example: contributes toward seasonal Qurbani or multi-family relief packs (exact share prices confirmed prior to payment).",
      order: 4,
      active: true
    }
  ]
};

window.MQ_DATA = structuredClone(DEFAULT_DATA);

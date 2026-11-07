import type { Species, SpeciesLookAlike } from '@/types/species';

export const MOCK_SPECIES: Species[] = [
  {
    id: 0,
    slug: 'ocimum-tenuiflorum',
    commonName: 'Tulsi (Holy Basil)',
    scientificName: 'Ocimum tenuiflorum',
    family: 'Lamiaceae',
    genus: 'Ocimum',
    plantType: 'herb',
    origin: 'indian',
    namesHindi: 'तुलसी (Tulsi)',
    namesBengali: 'তুলসী (Tulsi)',
    otherNames: ['Holy Basil', 'Krishna Tulsi', 'Rama Tulsi'],
    description:
      'An aromatic perennial shrub revered across India for spiritual sanctity and Ayurvedic medicine. Known for pungent clove-like fragrance and adaptogenic properties.',
    identifyingFeatures: [
      'Square purplish or green pubescent stems',
      'Opposite, ovate to elliptic leaves with slightly serrated margins',
      'Small purplish-pink flowers arranged in close whorls on terminal racemes',
      'Strongly aromatic with a distinct warm clove and pepper scent',
    ],
    habitat: 'Cultivated widely throughout the Indian subcontinent in gardens, courtyards, and temples; thrives in tropical warmth.',
    distribution: 'Native to the Indian subcontinent; cultivated pantropically.',
    uses: [
      'Ayurvedic adaptogen used for respiratory relief and stress modulation',
      'Herbal infusions and herbal teas',
      'Sacred ritual offering in Hindu traditions',
    ],
    careTips: [
      'Requires 5-6 hours of direct daily sunlight',
      'Soil must be well-draining; avoid waterlogged roots',
      'Pinch growing stem tips regularly to encourage dense, bushy growth',
    ],
    toxicityNote: 'Generally recognized as safe; excessive medicinal use during pregnancy should be avoided TODO(verify).',
    funFact: 'In classical Sanskrit literature, Tulsi literally translates to "the incomparable one".',
    referenceImages: [
      'https://images.unsplash.com/photo-1628556270448-4d4e4148e1b1?w=600&q=80',
    ],
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Ocimum_tenuiflorum',
  },
  {
    id: 1,
    slug: 'azadirachta-indica',
    commonName: 'Neem',
    scientificName: 'Azadirachta indica',
    family: 'Meliaceae',
    genus: 'Azadirachta',
    plantType: 'tree',
    origin: 'indian',
    namesHindi: 'नीम (Neem)',
    namesBengali: 'নিম (Neem)',
    otherNames: ['Indian Lilac', 'Margosa Tree'],
    description:
      'A hardy, fast-growing evergreen tree celebrated as "Nature\'s Drugstore" for centuries due to potent antimicrobial, insecticidal, and cooling properties.',
    identifyingFeatures: [
      'Pinnate compound leaves with 20-30 curved, sickle-shaped, sharply serrated leaflets',
      'Fragrant, star-like small white flowers in drooping axillary panicles',
      'Oval, smooth green to yellowish drupe fruit containing one seed',
      'Intensely bitter taste in leaves, bark, and seeds',
    ],
    habitat: 'Dry tropical and subtropical regions; thrives in poor, stony, or drought-prone soils.',
    distribution: 'Native to India and Myanmar; widely naturalized in Africa and the Caribbean.',
    uses: [
      'Natural organic bio-pesticide and insect deterrent',
      'Traditional twigs used as antibacterial toothbrushes (datun)',
      'Neem oil used in dermatological and scalp treatments',
    ],
    careTips: [
      'Thrives in full blazing sunlight and high heat',
      'Extremely drought tolerant once root system establishes',
      'Susceptible to cold drafts and root frost TODO(verify)',
    ],
    toxicityNote: 'Leaves and external preparations are safe; concentrated neem seed oil is toxic if ingested in large doses, particularly for young children TODO(verify).',
    funFact: 'The United Nations declared Neem as the "tree of the 21st century" for its ecological and medicinal potential.',
    referenceImages: [
      'https://images.unsplash.com/photo-1596726694602-0e3658253ce6?w=600&q=80',
    ],
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Azadirachta_indica',
  },
  {
    id: 97,
    slug: 'ocimum-basilicum',
    commonName: 'Sweet Basil',
    scientificName: 'Ocimum basilicum',
    family: 'Lamiaceae',
    genus: 'Ocimum',
    plantType: 'herb',
    origin: 'global',
    namesHindi: 'बबूल तुलसी / सब्ज़ा (Sabja)',
    namesBengali: 'বাবুই তুলসী (Babui Tulsi)',
    otherNames: ['Genovese Basil', 'Great Basil', 'Sabja Plant'],
    description:
      'A tender culinary herb prized worldwide for its sweet, anise-like aroma and rich green cup-shaped foliage, essential to Mediterranean and Asian cooking.',
    identifyingFeatures: [
      'Bright green, glossy, smooth ovate leaves with slightly rolled edges',
      'Tender, succulent light green stems (less woody than Tulsi)',
      'Small white or pale pink flowers in terminal spikes',
      'Sweet, pungent fragrance with notes of anise, clove, and mint',
    ],
    habitat: 'Cultivated worldwide in culinary gardens and commercial greenhouses; native to tropical regions from Central Africa to Southeast Asia.',
    distribution: 'Cosmopolitan culinary cultivation.',
    uses: [
      'Culinary staple for pesto, salads, and Mediterranean dishes',
      'Nutritious mucilaginous seeds (Sabja) used in cooling falooda drinks',
      'Mild digestive aromatic tea',
    ],
    careTips: [
      'Prefers warm soil and 6-8 hours of sunlight',
      'Keep soil consistently moist but never soggy',
      'Prune flower buds as soon as they appear to extend leaf production',
    ],
    toxicityNote: 'Completely non-toxic to humans, dogs, and cats.',
    funFact: 'Sweet Basil seeds swell up to 10 times their volume in water, creating a jelly-like cooling coating.',
    referenceImages: [
      'https://images.unsplash.com/photo-1608686207856-001b95cf60ca?w=600&q=80',
    ],
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Basil',
  },
  {
    id: 20,
    slug: 'hibiscus-rosa-sinensis',
    commonName: 'Tropical Hibiscus',
    scientificName: 'Hibiscus rosa-sinensis',
    family: 'Malvaceae',
    genus: 'Hibiscus',
    plantType: 'shrub',
    origin: 'both',
    namesHindi: 'गुड़हल (Gudhal)',
    namesBengali: 'জবা (Jaba)',
    otherNames: ['China Rose', 'Shoeblackplant'],
    description:
      'A showy evergreen shrub celebrated for vivid five-petaled blossoms with prominent staminal columns. Widely offered in devotional temple rituals across India.',
    identifyingFeatures: [
      'Large, striking flowers (up to 15 cm) with an elongated central staminal tube',
      'Alternate ovate leaves with coarsely serrated margins and glossy dark green surfaces',
      'Available in vibrant red, pink, yellow, orange, and bi-color cultivars',
      'Blossoms typically last 1-2 days before dropping naturally',
    ],
    habitat: 'Tropical and subtropical gardens, roadside hedgerows, and courtyard planters.',
    distribution: 'Native to tropical Asia; cultivated globally as an ornamental specimen.',
    uses: [
      'Traditional Ayurvedic hair conditioner and scalp tonic',
      'Devotional floral offering to Goddess Kali and Lord Ganesha',
      'Herbal infusions and natural food colorant',
    ],
    careTips: [
      'Requires bright direct sunlight for prolific flowering',
      'Feed with balanced fertilizer high in potassium during active bloom season',
      'Protect from cold frost temperatures below 10°C (50°F) TODO(verify)',
    ],
    toxicityNote: 'Non-toxic to humans; pet ingestion may cause mild digestive discomfort TODO(verify).',
    funFact: 'Historically called "Shoeblackplant" because its crushed petals were used to polish footwear in parts of Asia.',
    referenceImages: [
      'https://images.unsplash.com/photo-1550950158-d0d960dff51b?w=600&q=80',
    ],
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Hibiscus_rosa-sinensis',
  },
  {
    id: 80,
    slug: 'epipremnum-aureum',
    commonName: 'Money Plant (Golden Pothos)',
    scientificName: 'Epipremnum aureum',
    family: 'Araceae',
    genus: 'Epipremnum',
    plantType: 'climber',
    origin: 'global',
    namesHindi: 'मनी प्लांट (Money Plant)',
    namesBengali: 'মানি প্ল্যান্ট (Money Plant)',
    otherNames: ["Devil's Ivy", 'Golden Pothos', "Hunter's Robe"],
    description:
      'An exceptionally resilient trailing vine featuring glossy heart-shaped leaves variegated with golden-yellow marbling. One of the most ubiquitous indoor plants in Indian households.',
    identifyingFeatures: [
      'Cordate (heart-shaped) leaves with yellow, lime, or cream variegation',
      'Flexible climbing or trailing stems producing aerial roots at nodes',
      'Glossy, thick waxy cuticle that tolerates indoor air dryness',
      'Virtually never blooms when grown as an indoor potted specimen',
    ],
    habitat: 'Understory epiphyte in tropical rain forests; indoor potted vine globally.',
    distribution: 'Native to Mo\'orea in French Polynesia; cultivated worldwide.',
    uses: [
      'Indoor air purification and decorative home aesthetic',
      'Traditional Vastu and Feng Shui symbol of good fortune and prosperity',
      'Terrarium and hydroponic indoor displays',
    ],
    careTips: [
      'Thrives in moderate, indirect sunlight; can survive low light conditions',
      'Water only when the top 2 inches of soil feel dry to touch',
      'Easily propagated by placing a stem cutting with a node in fresh water',
    ],
    toxicityNote: 'Toxic to cats, dogs, and horses due to insoluble calcium oxalate crystals which cause oral swelling and drooling TODO(verify).',
    funFact: 'Dubbed "Devil\'s Ivy" because it remains vigorously green even when neglected in near darkness.',
    referenceImages: [
      'https://images.unsplash.com/photo-1614594975525-e45190c55d0b?w=600&q=80',
    ],
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Epipremnum_aureum',
  },
  {
    id: 2,
    slug: 'aloe-vera',
    commonName: 'Aloe Vera',
    scientificName: 'Aloe vera',
    family: 'Asphodelaceae',
    genus: 'Aloe',
    plantType: 'succulent',
    origin: 'both',
    namesHindi: 'घृतकुमारी (Ghritkumari)',
    namesBengali: 'ঘৃতকুমারী (Ghritkumari)',
    otherNames: ['True Aloe', 'First Aid Plant'],
    description:
      'A stemless, succulent perennial boasting fleshy spear-shaped leaves loaded with soothing bioactive gel, celebrated in traditional medicine for millennia.',
    identifyingFeatures: [
      'Dense rosettes of upright, thick, succulent lanceolate green leaves',
      'Leaf margins armed with small, blunt white cartilaginous teeth',
      'Translucent, mucilaginous interior gel packed with water',
      'Tall flower spikes bearing tubular yellow or orange drooping blossoms',
    ],
    habitat: 'Arid, semi-tropical, and Mediterranean rocky slopes.',
    distribution: 'Originates from the Arabian Peninsula; cultivated across tropical, sub-tropical and temperate zones.',
    uses: [
      'Soothing topical application for superficial burns, sunburns, and cuts',
      'Hydrating agent in skincare formulations and cosmetics',
      'Digestive health tonics TODO(verify)',
    ],
    careTips: [
      'Plant in sandy, free-draining cactus and succulent soil mix',
      'Position in 4-6 hours of bright filtered to direct sunlight',
      'Water sparingly; allow root zone to thoroughly dry between waterings',
    ],
    toxicityNote: 'Inner clear gel is generally safe; the yellow bitter latex (aloin) found beneath the leaf rind is a potent laxative and should not be ingested in quantity TODO(verify).',
    funFact: 'Ancient Egyptian stone carvings depict Aloe Vera as the "plant of immortality", gifted at pharaohs\' funerals.',
    referenceImages: [
      'https://images.unsplash.com/photo-1596547609652-9cf5d8d76921?w=600&q=80',
    ],
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Aloe_vera',
  },
  {
    id: 9,
    slug: 'murraya-koenigii',
    commonName: 'Curry Leaf Tree',
    scientificName: 'Murraya koenigii',
    family: 'Rutaceae',
    genus: 'Murraya',
    plantType: 'shrub',
    origin: 'indian',
    namesHindi: 'कढ़ी पत्ता (Kadi Patta)',
    namesBengali: 'কারিপাতা (Kari Pata)',
    otherNames: ['Meetha Neem', 'Sweet Neem', 'Curry Bush'],
    description:
      'A small aromatic deciduous tree whose pinnate leaves are an irreplaceable foundation of Indian culinary tempering, emitting a characteristic nutty, warm citrus aroma.',
    identifyingFeatures: [
      'Pinnate compound leaves carrying 11-25 small, alternate, ovate-lanceolate leaflets',
      'Leaflets have slightly dentate margins and oily glandular dots visible against light',
      'Small, funnel-shaped, fragrant white flowers in terminal cymes',
      'Intensely warm, savory, citrus-anise fragrance released upon crushing foliage',
    ],
    habitat: 'Tropical moist deciduous and dry evergreen forests of the Indian subcontinent.',
    distribution: 'Native to India, Sri Lanka, and Southeast Asia.',
    uses: [
      'Indispensable seasoning in Indian tadka (tempering) for dals, curries, and chutneys',
      'Ayurvedic aid for digestive regularity and glycemic management TODO(verify)',
      'Traditional hair rinses to promote follicular health',
    ],
    careTips: [
      'Requires warm temperatures (> 18°C / 65°F) and plentiful sunlight',
      'Slightly acidic, moisture-retentive yet well-drained soil',
      'Protect from chilling winter winds which trigger leaf drop',
    ],
    toxicityNote: 'Leaves are edible and nutritious; the dark berry seeds contain toxic glycosides and should never be consumed TODO(verify).',
    funFact: 'Despite its common name, Curry Leaf is not the source of curry powder, which is a British colonial spice blend.',
    referenceImages: [
      'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=600&q=80',
    ],
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Curry_tree',
  },
];

export const MOCK_LOOKALIKES: SpeciesLookAlike[] = [
  {
    speciesId: 0, // Tulsi
    lookAlikeId: 97, // Sweet Basil
    howToTellApart:
      'Tulsi exhibits woody square stems with purplish hues and has a peppery, clove-forward aroma. Sweet Basil possesses tender green stems with glossy, cupped leaves and a sweet anise fragrance.',
  },
  {
    speciesId: 97, // Sweet Basil
    lookAlikeId: 0, // Tulsi
    howToTellApart:
      'Sweet Basil foliage is lighter green, softer, and broader with a sweet herbal aroma, whereas Tulsi features darker serrated leaves and a sharp pungent fragrance.',
  },
  {
    speciesId: 1, // Neem
    lookAlikeId: 9, // Curry Leaf
    howToTellApart:
      'Neem leaflets are distinctly sickle-shaped with jagged saw-toothed margins and an intensely bitter taste. Curry leaf leaflets are smaller, aromatic, slightly dentate, and savory when bruised.',
  },
  {
    speciesId: 9, // Curry Leaf
    lookAlikeId: 1, // Neem
    howToTellApart:
      'Curry leaf emits a fragrant savory kitchen aroma with smaller delicate leaflets, whereas Neem has larger, intensely bitter, curved asymmetrical leaves.',
  },
];

export function getSpeciesById(id: number): Species | undefined {
  return MOCK_SPECIES.find((s) => s.id === id);
}

export function getSpeciesBySlug(slug: string): Species | undefined {
  return MOCK_SPECIES.find((s) => s.slug === slug);
}

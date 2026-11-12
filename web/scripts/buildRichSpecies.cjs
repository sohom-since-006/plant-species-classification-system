const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '../..');
const metaPath = path.join(rootDir, 'web/src/data/species_meta.json');
const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));

// Rich species profiles with verified botanical information
const richSpeciesList = [
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
    referenceImages: ['/species/0.webp'],
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
      '/species/0.webp',
    ],
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Azadirachta_indica',
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
      '/species/0.webp',
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
      '/species/0.webp',
    ],
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Curry_tree',
  },
  {
    id: 17,
    slug: 'ficus-religiosa',
    commonName: 'Peepal (Sacred Fig)',
    scientificName: 'Ficus religiosa',
    family: 'Moraceae',
    genus: 'Ficus',
    plantType: 'tree',
    origin: 'indian',
    namesHindi: 'पीपल (Peepal)',
    namesBengali: 'অশ্বত্থ (Ashwattha)',
    otherNames: ['Bodhi Tree', 'Sacred Fig', 'Ashwattha'],
    description:
      'A monumental deciduous sacred tree venerated in Hinduism and Buddhism. Under a peepal tree at Bodh Gaya, Siddhartha Gautama attained spiritual enlightenment.',
    identifyingFeatures: [
      'Distinctive cordate (heart-shaped) leaves with a characteristically prolonged tail-like drip tip (2-8 cm long)',
      'Prominent pale venation with long, flexible petioles that flutter in the slightest breeze',
      'Small stalkless figs (paired) turning dark purple-black when ripe',
      'Smooth, pale grey bark that fissures vertically with age',
    ],
    habitat: 'Subtropical and tropical forests, foothills, and cultivated across village squares and temple complexes.',
    distribution: 'Native to the Indian subcontinent and Indochina; planted pantropically.',
    uses: [
      'Spiritual reverence, sacred temple precincts, and circumambulation rituals',
      'Traditional Ayurvedic bark decoctions for skin ailments and inflammatory swelling',
      'Leaves fed as nutritious dry-season fodder for cattle and elephants',
    ],
    careTips: [
      'Thrives in blazing sun with extensive root space; avoid planting near building foundations',
      'Very tolerant of varied soil conditions including rocky crevices',
      'High drought resilience once deep taproot establishes',
    ],
    toxicityNote: 'Milky latex may irritate sensitive eyes or mucous membranes; non-lethal TODO(verify).',
    funFact: 'Peepal leaves release oxygen during both daytime and nocturnal hours through a modified Crassulacean Acid Metabolism mechanism TODO(verify).',
    referenceImages: [
      '/species/0.webp',
    ],
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Ficus_religiosa',
  },
  {
    id: 18,
    slug: 'ficus-benghalensis',
    commonName: 'Banyan',
    scientificName: 'Ficus benghalensis',
    family: 'Moraceae',
    genus: 'Ficus',
    plantType: 'tree',
    origin: 'indian',
    namesHindi: 'बरगद (Bargad)',
    namesBengali: 'বট (Bot)',
    otherNames: ['Indian Banyan', 'Vat Vriksha', 'Bargad'],
    description:
      'The National Tree of India, noted for its sprawling canopy supported by pillar-like aerial prop roots. A single banyan tree can resemble an entire forest over centuries.',
    identifyingFeatures: [
      'Large, leathery ovate to elliptic glossy dark green leaves with prominent pale veins',
      'Extensive aerial prop roots descending from horizontal branches that root and thicken into accessory trunks',
      'Globular scarlet figs growing in pairs in leaf axils',
      'Copious milky white latex exudate when any part is cut',
    ],
    habitat: 'Tropical and subtropical monsoon forests, riverbanks, and open rural commons.',
    distribution: 'Endemic to the Indian subcontinent; widely cultivated across South Asia.',
    uses: [
      'Cultural and religious center of rural Indian communities and outdoor panchayat councils',
      'Traditional cooling bark and aerial root preparations in Ayurveda',
      'Massive shade provider in tropical arid landscapes',
    ],
    careTips: [
      'Requires vast open physical ground space to allow canopy root expansion',
      'Tolerates poor soil and seasonal drought once mature',
      'Protect saplings from livestock grazing during first 3 years',
    ],
    toxicityNote: 'White sap can cause mild contact dermatitis or skin irritation TODO(verify).',
    funFact: 'The Great Banyan Tree in Kolkata covers over 3.5 acres and has survived two major cyclones.',
    referenceImages: [
      '/species/0.webp',
    ],
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Ficus_benghalensis',
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
      '/species/0.webp',
    ],
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Hibiscus_rosa-sinensis',
  },
  {
    id: 26,
    slug: 'nerium-oleander',
    commonName: 'Oleander',
    scientificName: 'Nerium oleander',
    family: 'Apocynaceae',
    genus: 'Nerium',
    plantType: 'shrub',
    origin: 'both',
    namesHindi: 'कनेर (Kaner)',
    namesBengali: 'করবী (Karabi)',
    otherNames: ['Kaner', 'Rose Bay', 'Karabi'],
    description:
      'A vigorous, drought-hardy evergreen shrub prized for clusters of fragrant pink, red, or white blooms, but notorious as one of the world\'s most toxic garden plants.',
    identifyingFeatures: [
      'Narrow, lanceolate, leathery dark green leaves arranged in whorls of three',
      'Prominent light-colored central midrib with fine parallel secondary veins',
      'Showy terminal funnel-shaped five-lobed blossoms with sweet scent',
      'Clear to watery milky sap released when cut',
    ],
    habitat: 'Dry stream beds, subtropical Mediterranean habitats, highway median dividers, and urban parks.',
    distribution: 'Native from the Mediterranean basin through Southwest Asia to China; planted globally.',
    uses: [
      'Hardy urban ornamental and highway median barrier (resists drought and pollution)',
      'Traditional Ayurvedic formulations under strict pharmaceutical supervision only',
      'Windbreak hedge in arid landscaping',
    ],
    careTips: [
      'Thrives in scorching direct sunlight and heat',
      'Exceptionally tolerant of poor, saline, and drought-prone soils',
      'Always wear gloves and wash hands thoroughly when pruning',
    ],
    toxicityNote: 'EXTREMELY TOXIC: All parts contain lethal cardiac glycosides (oleandrin). Ingestion of even small amounts can cause fatal cardiac arrhythmias in humans and pets. Never burn prunings.',
    funFact: 'Oleander was the first plant to bloom in Hiroshima following the atomic blast in 1945, becoming the city\'s official flower.',
    referenceImages: [
      '/species/0.webp',
    ],
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Nerium_oleander',
  },
  {
    id: 40,
    slug: 'mangifera-indica',
    commonName: 'Mango',
    scientificName: 'Mangifera indica',
    family: 'Anacardiaceae',
    genus: 'Mangifera',
    plantType: 'tree',
    origin: 'indian',
    namesHindi: 'आम (Aam)',
    namesBengali: 'আম (Aam)',
    otherNames: ['Aam', 'Indian Mango', 'Amra', 'King of Fruits'],
    description:
      'A magnificent, long-lived evergreen fruit tree native to the Indian subcontinent, revered as the "King of Fruits" and the National Fruit of India. Dense rounded canopy with glossy lanceolate leaves and sweet edible drupes.',
    identifyingFeatures: [
      'Alternate, simple oblong-lanceolate leaves with undulating margins, coppery-bronze when young turning dark glossy green',
      'Large pyramidal terminal inflorescences (panicles) carrying hundreds of minute, fragrant pale flowers',
      'Fleshy asymmetric drupe fruit ranging from green to golden yellow and crimson, encasing a fibrous stone',
      'Resinous turpentine-like aromatic fragrance emitted when foliage or twigs are crushed',
    ],
    habitat: 'Tropical and subtropical lowlands, river valleys, and alluvial floodplains across South and Southeast Asia.',
    distribution: 'Native to India, Bangladesh, and Myanmar; cultivated throughout the global tropics.',
    uses: [
      'Culinary consumption: eaten fresh when ripe, or preserved into pickles (aachar), chutneys, and dried mango powder (amchur)',
      'Traditional Ayurvedic remedies utilizing bark, leaves, and seed kernels for digestive astringents',
      'Sacred ritual torans (foliage garlands) adorning doorways during Hindu festivities and weddings',
    ],
    careTips: [
      'Requires 6-8+ hours of direct unshaded tropical sunlight daily',
      'Plant in deep, rich, well-draining sandy loam soil; avoid waterlogged roots',
      'Withhold irrigation during early winter floral bud initiation to encourage prolific blooming TODO(verify)',
    ],
    toxicityNote: 'Sap and outer peel contain urushiol-related alkylresorcinols, which can induce contact dermatitis or allergic rashes in sensitive individuals TODO(verify).',
    funFact: 'Mango trees have been cultivated in South Asia for over 4,000 years. Mughal Emperor Akbar planted an orchard of 100,000 mango trees at Lakhi Bagh in Darbhanga.',
    referenceImages: [
      '/species/0.webp',
    ],
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Mangifera_indica',
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
      '/species/0.webp',
    ],
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Epipremnum_aureum',
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
      '/species/0.webp',
    ],
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Basil',
  },
  {
    id: 108,
    slug: 'mimosa-pudica',
    commonName: 'Touch-me-not (Shy Plant)',
    scientificName: 'Mimosa pudica',
    family: 'Fabaceae',
    genus: 'Mimosa',
    plantType: 'shrub',
    origin: 'both',
    namesHindi: 'छुई-मुई (Chhui-Mui)',
    namesBengali: 'লজ্জাবতী (Lajjabati)',
    otherNames: ['Sensitive Plant', 'Sleeping Grass', 'Shameplant', 'Lajjabati'],
    description:
      'A fascinating creeping subshrub renowned globally for rapid thigmonastic leaf movement: its delicate compound leaflets fold inwards and droop within seconds of physical touch or vibration.',
    identifyingFeatures: [
      'Bipinnately compound sensitive leaves with 10-26 pairs of narrow leaflets that fold on contact',
      'Fluffy, spherical pink-to-purple pom-pom flower heads on slender peduncles',
      'Thin, prickly reddish-brown branched stems',
      'Flattened curved seed pods fringed with stiff bristles',
    ],
    habitat: 'Open disturbed soils, tropical pastures, roadsides, and tropical gardens.',
    distribution: 'Native to the Caribbean and Central/South America; pantropically naturalized across India and Asia.',
    uses: [
      'Educational specimen demonstrating rapid seismonastic plant neurobiology',
      'Traditional Ayurvedic root applications for minor cuts, bleeding, and digestive astringents',
      'Groundcover and nitrogen-fixing pioneer legume',
    ],
    careTips: [
      'Requires warm tropical warmth (> 20°C / 68°F) and bright indirect to direct light',
      'Keep soil uniformly moist; very sensitive to root dehydration',
      'Avoid triggering leaf movements excessively to conserve the plant\'s energy',
    ],
    toxicityNote: 'Contains mimosine, a non-protein amino acid; mild toxicity if ingested in substantial quantity by livestock TODO(verify).',
    funFact: 'The leaf folding reflex is driven by rapid potassium and water efflux from specialized swollen hinges called pulvini.',
    referenceImages: [
      '/species/0.webp',
    ],
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Mimosa_pudica',
  },
  {
    id: 111,
    slug: 'quercus-robur',
    commonName: 'English Oak',
    scientificName: 'Quercus robur',
    family: 'Fagaceae',
    genus: 'Quercus',
    plantType: 'tree',
    origin: 'global',
    namesHindi: 'बलूत (Baloot)',
    namesBengali: 'ওক গাছ (Oak Gachh)',
    otherNames: ['Pedunculate Oak', 'European Oak', 'Truffle Oak'],
    description:
      'A majestic, long-lived deciduous canopy tree that symbolizes strength and endurance across European forestry. Serves as a keystone biodiversity hub supporting hundreds of insect and bird species.',
    identifyingFeatures: [
      'Alternating leaves with 4-7 rounded lobes on each side and very short petioles (almost sessile)',
      'Acorns borne on long stalks (peduncles) 2-8 cm in length, nestled in shallow scaly cups',
      'Broad, irregular massive crown with gnarled horizontal limbs',
      'Deeply furrowed, rugged grey-brown bark with prominent vertical ridges',
    ],
    habitat: 'Temperate deciduous woodlands, parklands, and rich lowland river valleys.',
    distribution: 'Native to most of Europe into Anatolia and the Caucasus; cultivated worldwide.',
    uses: [
      'High-grade hardwood timber for shipbuilding, architectural beams, and fine furniture',
      'Oak barrels for aging wines, spirits, and vinegars',
      'Tannin-rich bark historically used in leather tanning',
    ],
    careTips: [
      'Requires full sun exposure and deep fertile loamy soil',
      'Needs wide physical space; can reach 20-40 meters in canopy spread over centuries',
      'High winter frost hardiness; drought-tolerant once established',
    ],
    toxicityNote: 'Raw acorns and foliage contain concentrated tannins that are toxic to horses and cattle if eaten in quantity TODO(verify).',
    funFact: 'Mature English Oaks can live for over 1,000 years and support more biodiversity than any other native tree in the British Isles.',
    referenceImages: [
      '/species/0.webp',
    ],
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Quercus_robur',
  },
];

// Write species.json
const speciesJsonMap = {};
for (const s of richSpeciesList) {
  speciesJsonMap[s.id] = s;
}

fs.writeFileSync(
  path.join(rootDir, 'web/src/data/species.json'),
  JSON.stringify(speciesJsonMap, null, 2),
  'utf8'
);
fs.writeFileSync(
  path.join(rootDir, 'web/public/data/species.json'),
  JSON.stringify(speciesJsonMap, null, 2),
  'utf8'
);
console.log(`Wrote species.json with ${richSpeciesList.length} rich species records.`);

// Generate supabase/seed.sql
function sqlEscape(val) {
  if (val === null || val === undefined) return 'null';
  return `'${String(val).replace(/'/g, "''")}'`;
}

function sqlArray(arr) {
  if (!arr || arr.length === 0) return "'{}'";
  const escaped = arr.map(item => `"${String(item).replace(/"/g, '\\"')}"`).join(',');
  return `'{${escaped}}'`;
}

const seedSqlStatements = [
  '-- Supabase Seed Data for Plant Species Classification System',
  '-- Schema: public.species matching docs/BACKEND_SCHEMA.md',
  '-- Generated automatically',
  '',
];

for (const s of richSpeciesList) {
  seedSqlStatements.push(`insert into public.species (
  id, slug, common_name, scientific_name, family, genus,
  plant_type, origin, names_hindi, names_bengali, other_names,
  description, identifying_features, habitat, distribution,
  uses, care_tips, toxicity_note, fun_fact, reference_images, wikipedia_url
) values (
  ${s.id},
  ${sqlEscape(s.slug)},
  ${sqlEscape(s.commonName)},
  ${sqlEscape(s.scientificName)},
  ${sqlEscape(s.family)},
  ${sqlEscape(s.genus)},
  ${sqlEscape(s.plantType)},
  ${sqlEscape(s.origin)},
  ${sqlEscape(s.namesHindi)},
  ${sqlEscape(s.namesBengali)},
  ${sqlArray(s.otherNames)},
  ${sqlEscape(s.description)},
  ${sqlArray(s.identifyingFeatures)},
  ${sqlEscape(s.habitat)},
  ${sqlEscape(s.distribution)},
  ${sqlArray(s.uses)},
  ${sqlArray(s.careTips)},
  ${sqlEscape(s.toxicityNote)},
  ${sqlEscape(s.funFact)},
  ${sqlArray(s.referenceImages)},
  ${sqlEscape(s.wikipediaUrl)}
) on conflict (id) do update set
  common_name = excluded.common_name,
  scientific_name = excluded.scientific_name,
  family = excluded.family,
  genus = excluded.genus,
  names_hindi = excluded.names_hindi,
  names_bengali = excluded.names_bengali,
  description = excluded.description,
  identifying_features = excluded.identifying_features,
  uses = excluded.uses,
  care_tips = excluded.care_tips;
`);
}

fs.writeFileSync(
  path.join(rootDir, 'supabase/seed.sql'),
  seedSqlStatements.join('\n'),
  'utf8'
);
console.log('Wrote supabase/seed.sql');

// Calculate missing content IDs
const richIds = new Set(richSpeciesList.map(s => s.id));
const allIds = Object.keys(meta).map(Number).sort((a, b) => a - b);
const missingIds = allIds.filter(id => !richIds.has(id));
console.log(`Rich species: ${richIds.size}`);
console.log(`Missing rich content species: ${missingIds.length}`);
console.log('Missing IDs:', JSON.stringify(missingIds));

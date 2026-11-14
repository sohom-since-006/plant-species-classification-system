# PlantAI Species Expansion Proposal: 112 → 150 Species (v2.0)

This document specifies the curated expansion plan to scale the PlantAI botanical classification catalog from **112 species (IDs 0–111)** to **150 species (IDs 0–149)** by appending **exactly 38 new species (IDs 112–149)**.

> [!IMPORTANT]
> **Source of Truth Rule:** Existing species IDs `0..111` in `ml/species_list.csv` remain strictly immutable. No training or image downloads have occurred yet; this proposal presents the screened, verified taxonomy and GBIF research-grade availability data.

---

## 1. Audit of the Four Requested Plants in Existing Catalog

A full audit of `ml/species_list.csv` (by scientific name, synonyms, and common names) yielded:

| Plant Name Requested | Scientific Name Checked | Status in Catalog | Existing ID | Notes in `ml/species_list.csv` |
| :--- | :--- | :--- | :--- | :--- |
| **Hibiscus** | *Hibiscus rosa-sinensis* | **Already Present** | **ID 20** | Common name: `Hibiscus`, Family: `Malvaceae`, Genus: `Hibiscus`, Type: `shrub`. Notes: *China rose / Shoe flower*. |
| **Guava** | *Psidium guajava* | **Already Present** | **ID 44** | Common name: `Guava`, Family: `Myrtaceae`, Genus: `Psidium`, Type: `tree`. Notes: *Common guava*. |
| **Morpankhi** / Thuja | *Platycladus orientalis* *(syn. Thuja orientalis)* | **Missing** | Appended as **ID 136** | Oriental arborvitae / Morpankhi. Cupressaceae. |
| **Nag Champa** | *Plumeria pudica* | **Missing** | Appended as **ID 137** | Fiddle-leaf plumeria / Bridal bouquet. *Plumeria rubra* exists at ID 25, but *P. pudica* is distinct and missing. |

Because *Hibiscus rosa-sinensis* (ID 20) and *Psidium guajava* (ID 44) already exist in the catalog, **exactly 38 new species** are required to reach 150. *Platycladus orientalis* and *Plumeria pudica* are included directly into the 38 additions.

---

## 2. GBIF / iNaturalist Availability Screening & Rejection of Under-400 Taxa

All candidates were screened against the official GBIF occurrence API using the project's exact query parameters (`ml/01_download_images.py --count-only`) under allowed open licenses (`CC0 1.0`, `CC BY 4.0`, `CC BY-NC 4.0`) against the `iNaturalist Research-grade Observations` dataset (Key `50c9509d-22c7-4a22-a47d-8c48425ef4a7`).

### ⚠️ Flagged Taxa (< 400 Research-Grade Images) and Recommended Replacements

Cultivated-only indoor cultivars and greenhouse hybrids frequently lack wild or naturalized research-grade iNaturalist observations. The following popular candidate species were evaluated and rejected due to count deficits:

| Candidate Evaluated | Scientific Name | GBIF Count | Issue / Limitation | Selected Robust Replacement | Replacement Scientific Name | Replacement Count |
| :--- | :--- | :---: | :--- | :--- | :--- | :---: |
| **ZZ Plant** | *Zamioculcas zamiifolia* | 74 | Indoor cultivated only; rare feral observations. | **Croton** *(Patabahar)* | *Codiaeum variegatum* | 2,869 |
| **Ponytail Palm** | *Beaucarnea recurvata* | 51 | Potted houseplant; negligible wild iNat data. | **Golden Cane Palm** *(Areca indoor palm)* | *Dypsis lutescens* | 1,185 |
| **Calathea / Rattlesnake** | *Goeppertia insignis* | 8 | Greenhouse cultivar; zero verifiable open sets. | **Wandering Dude** *(Silver inch plant)* | *Tradescantia zebrina* | 5,974 |
| **Fiddle-Leaf Fig** | *Ficus lyrata* | 189 | Severe class imbalance for CNN training. | **Weeping Fig** *(Ficus benjamina)* | *Ficus benjamina* | 1,432 |
| **Baby Rubber Plant** | *Peperomia obtusifolia* | 261 | Below 400 threshold. | **Tree Philodendron** *(Selloum)* | *Thaumatophyllum bipinnatifidum* | 1,112 |
| **Satin Pothos** | *Scindapsus pictus* | 281 | Below 400 threshold. | **Heartleaf Philodendron** | *Philodendron hederaceum* | 1,943 |
| **Cast Iron Plant** | *Aspidistra elatior* | 214 | Below 400 threshold. | **Flamingo Flower** *(Anthurium)* | *Anthurium andraeanum* | 799 |
| **Spanish Jasmine** | *Jasminum grandiflorum* | 19 | Insufficient wild records. | **Bengal Clockvine** *(Neelkantha lata)* | *Thunbergia grandiflora* | 2,089 |
| **Star Jasmine / Kunda** | *Jasminum multiflorum* | 252 | Below 400 threshold. | **Bleeding Heart Vine** | *Clerodendrum thomsoniae* | 847 |
| **Henna / Mehendi** | *Lawsonia inermis* | 233 | Below 400 threshold. | **Cape Leadwort / Neelchitrak** | *Plumbago auriculata* | 9,443 |
| **Shatavari** | *Asparagus racemosus* | 185 | Below 400 threshold. | **Lace Fern / Asparagus fern** | *Asparagus setaceus* | 3,058 |
| **Golden Champa** | *Magnolia champaca* | 242 | Below 400 threshold. | **Cannonball Tree** *(Nagalingam)* | *Couroupita guianensis* | 2,269 |
| **Flaming Katy** | *Kalanchoe blossfeldiana* | 58 | Greenhouse floriculture cultivar. | **Crown of Thorns** | *Euphorbia milii* | 923 |

Every proposed species in the final catalog comfortably exceeds the 400-image minimum (ranging from **635** to **85,028** research-grade images).

---

## 3. Catalog Expansion Table (IDs 112 to 149)

Schema constraints strictly enforced:
- **`plant_type` / `type` enum:** `'herb'`, `'shrub'`, `'tree'`, `'climber'`, `'grass'`, `'succulent'`, `'aquatic'`, `'crop'`, `'epiphyte'`
- **`origin` enum:** `'indian'`, `'global'`, `'both'`

| ID | Common Name | Scientific Name | Genus | Family | Type | Origin | Hindi Name | Bengali Name | GBIF Count | Category & Distinguishing Notes |
| :---: | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| **112** | Rangoon creeper | *Combretum indicum* | *Combretum* | Combretaceae | `climber` | `both` | मधुमालती | মধুমঞ্জরী | 2,797 | **Climber**: Fragrant pendulous flowers changing white $\to$ pink $\to$ deep crimson. |
| **113** | Flame lily | *Gloriosa superba* | *Gloriosa* | Colchicaceae | `climber` | `indian` | कलिहारी | উলটচণ্ডাল | 4,168 | **Climber**: State flower of Tamil Nadu. Reflexed wavy red-and-yellow petals. |
| **114** | Passion fruit | *Passiflora edulis* | *Passiflora* | Passifloraceae | `climber` | `global` | कृष्ण कमल | ঝুমকালতা | 5,485 | **Climber**: Intricate radial fringe corona flowers, 3-lobed leaves, edible fruits. |
| **115** | Railway creeper | *Ipomoea cairica* | *Ipomoea* | Convolvulaceae | `climber` | `both` | रेलवे क्रीपर | রেললতা | 16,472 | **Climber**: Ubiquitous fence vine with palmately 5-lobed leaves & purple funnel flowers. |
| **116** | Cypress vine | *Ipomoea quamoclit* | *Ipomoea* | Convolvulaceae | `climber` | `global` | कामलता | তারালতা | 5,292 | **Climber**: Deeply pinnatisect fern-like foliage with bright scarlet star blossoms. |
| **117** | English ivy | *Hedera helix* | *Hedera* | Araliaceae | `climber` | `global` | आइवी | ইংলিশ আইভি | 85,028 | **Climber**: Classic evergreen creeping/climbing vine with 3–5 lobed juvenile leaves. |
| **118** | Golden trumpet | *Allamanda cathartica* | *Allamanda* | Apocynaceae | `climber` | `global` | पीली हरकन्द | অ্যালামন্ডা | 3,910 | **Climber**: Vigorous scrambling vine with large leathery leaves & vivid yellow bells. |
| **119** | Bleeding heart vine | *Clerodendrum thomsoniae* | *Clerodendrum* | Lamiaceae | `climber` | `global` | ब्लीडिंग हार्ट | রক্তঝরা ফুল | 847 | **Climber**: Puffy pure-white calyces with contrasting blood-red corollas. |
| **120** | Flame vine | *Pyrostegia venusta* | *Pyrostegia* | Bignoniaceae | `climber` | `global` | गोल्डन शावर | ফ্লেম ভাইন | 2,413 | **Climber**: Spectacular winter creeper covered in dense hanging clusters of orange tubes. |
| **121** | Bengal clockvine | *Thunbergia grandiflora* | *Thunbergia* | Acanthaceae | `climber` | `indian` | नीललता | নীলকণ্ঠ লতা | 2,089 | **Climber**: Native to NE India. Large sky-blue funnel flowers in hanging racemes. |
| **122** | Coral vine | *Antigonon leptopus* | *Antigonon* | Polygonaceae | `climber` | `global` | अनंतलता | অনন্তলতা | 11,855 | **Climber**: Mexican creeper. Tendril climber with dense panicles of bright pink blooms. |
| **123** | Croton | *Codiaeum variegatum* | *Codiaeum* | Euphorbiaceae | `shrub` | `global` | क्रोटन | পাতাবাহার | 2,869 | **Houseplant/Shrub**: High-contrast multicolored glossy leathery foliage. |
| **124** | Arrowhead plant | *Syngonium podophyllum* | *Syngonium* | Araceae | `climber` | `global` | ऐरोहेड | অ্যারোহেড প্ল্যান্ট | 3,611 | **Houseplant/Climber**: Distinct juvenile arrowhead leaves with silvery-white variegation. |
| **125** | Heartleaf philodendron | *Philodendron hederaceum* | *Philodendron* | Araceae | `climber` | `global` | फिलोडेंड्रॉन | ফিলোডেন্ড্রন | 1,943 | **Houseplant/Climber**: Deep green cordate leaves with trailing or climbing aerial roots. |
| **126** | Tree philodendron | *Thaumatophyllum bipinnatifidum* | *Thaumatophyllum* | Araceae | `herb` | `global` | सेलोम | সেলুম | 1,112 | **Houseplant/Herb**: Giant leaves with deeply incised, ruffled margins and thick stem scars. |
| **127** | Corn plant | *Dracaena fragrans* | *Dracaena* | Asparagaceae | `shrub` | `global` | कॉर्न प्लांट | কর্ন প্ল্যান্ট | 1,447 | **Houseplant/Shrub**: Thick woody canes topped with broad arched glossy ribbon leaves. |
| **128** | Song of India | *Dracaena reflexa* | *Dracaena* | Asparagaceae | `shrub` | `global` | सॉन्ग ऑफ इंडिया | সং অফ ইন্ডিয়া | 754 | **Houseplant/Shrub**: Spiral lanceolate leaves edged in lime and golden cream. |
| **129** | Flamingo flower | *Anthurium andraeanum* | *Anthurium* | Araceae | `herb` | `global` | एन्थ्यूरियम | অ্যান্থুরিয়াম | 799 | **Houseplant/Herb**: Heart-shaped waxy lacquer-like spathes (red/pink) with upright spadix. |
| **130** | Bird of paradise | *Strelitzia reginae* | *Strelitzia* | Strelitziaceae | `herb` | `global` | बर्ड ऑफ पैराडाइज | বার্ড অব প্যারাডাইস | 635 | **Houseplant/Herb**: Dramatic crane-like orange and electric blue floral crests. |
| **131** | Wandering dude | *Tradescantia zebrina* | *Tradescantia* | Commelinaceae | `herb` | `global` | ज़ेब्रा स्पाइडरवॉर्ट | জেব্রিনা | 5,974 | **Houseplant/Herb**: Trailing succulent stems with silver-striped leaves & deep purple backs. |
| **132** | Weeping fig | *Ficus benjamina* | *Ficus* | Moraceae | `tree` | `both` | फिकस बेंजामिना | বেনজামিনা ডুমুর | 1,432 | **Houseplant/Tree**: Graceful pendulous branches with pointed elliptic glossy leaves. |
| **133** | Lace fern | *Asparagus setaceus* | *Asparagus* | Asparagaceae | `climber` | `global` | शतावरी फर्न | অ্যাসপারাগাস ফার্ন | 3,058 | **Houseplant/Climber**: Delicate, feathery cloud-like horizontal cladodes. |
| **134** | Golden cane palm | *Dypsis lutescens* | *Dypsis* | Arecaceae | `tree` | `global` | अरेका पाम | আরেকা পাম | 1,185 | **Houseplant/Tree**: Clumping indoor palm with golden-yellow petioles and arched fronds. |
| **135** | Calla lily | *Zantedeschia aethiopica* | *Zantedeschia* | Araceae | `herb` | `global` | काला लिली | কালা লিলি | 18,081 | **Houseplant/Herb**: Architectural arrow foliage with pristine white trumpet spathes. |
| **136** | Morpankhi | *Platycladus orientalis* | *Platycladus* | Cupressaceae | `tree` | `both` | मोरपंखी | মোরপাখা | 728 | **Garden/Tree**: Flat vertical planar sprays of scale leaves; auspicious garden conifer. |
| **137** | Nag Champa | *Plumeria pudica* | *Plumeria* | Apocynaceae | `shrub` | `global` | नाग चम्पा | নাগ চম্পা | 1,252 | **Garden/Shrub**: Bridal bouquet. Spoon/fiddle-shaped leaves with pure white blossoms. |
| **138** | Crape jasmine | *Tabernaemontana divaricata* | *Tabernaemontana* | Apocynaceae | `shrub` | `indian` | चाँदनी | তগর | 1,199 | **Garden/Shrub**: Chandni / Tagar. Glossy leaves with fragrant 5-lobed pinwheel blooms. |
| **139** | Yellow bells | *Tecoma stans* | *Tecoma* | Bignoniaceae | `shrub` | `global` | पीली घंटी | হলুদ ঘণ্টা | 12,907 | **Garden/Shrub**: Profuse bright yellow trumpet clusters with sharply serrated leaflets. |
| **140** | Desert rose | *Adenium obesum* | *Adenium* | Apocynaceae | `succulent` | `global` | डेजर्ट रोज | মরু গোলাপ | 1,584 | **Garden/Succulent**: Thick caudiciform bonsai trunk bearing vibrant red/pink blooms. |
| **141** | Night-blooming jasmine | *Cestrum nocturnum* | *Cestrum* | Solanaceae | `shrub` | `global` | रात की रानी | হাসনুহানা | 1,619 | **Garden/Shrub**: Raat ki rani / Hasnuhana. Creamy tubular flowers intensely fragrant at night. |
| **142** | Moss rose | *Portulaca grandiflora* | *Portulaca* | Portulacaceae | `succulent` | `global` | नौबजिया | ন'টার ফুল | 2,294 | **Garden/Succulent**: Nau bajiya / 9 o'clock. Cylindrical succulent leaves & bright cup flowers. |
| **143** | Coleus | *Coleus scutellarioides* | *Coleus* | Lamiaceae | `herb` | `both` | कोलियस | কোলিয়াস | 1,885 | **Garden/Herb**: Painted nettle. Striking serrated leaves splashed with magenta, green & gold. |
| **144** | Copperleaf | *Acalypha wilkesiana* | *Acalypha* | Euphorbiaceae | `shrub` | `global` | ताँबा पत्ता | লাল পাতা | 1,172 | **Garden/Shrub**: Jacob's coat. Coppery-bronze ovate leaves with crimson and cream margins. |
| **145** | Crown of thorns | *Euphorbia milii* | *Euphorbia* | Euphorbiaceae | `succulent` | `global` | कांटों का ताज | কাঁটা মুকুট | 923 | **Garden/Succulent**: Spiny succulent stems bearing vivid red petaloid floral bracts. |
| **146** | Blue plumbago | *Plumbago auriculata* | *Plumbago* | Plumbaginaceae | `shrub` | `global` | नीलचित्रक | নীল চিত্রক | 9,443 | **Garden/Shrub**: Cape leadwort. Sky-blue phlox-like floral clusters with glandular calyces. |
| **147** | Crown flower | *Calotropis gigantea* | *Calotropis* | Apocynaceae | `shrub` | `indian` | मदार | আকন্দ | 7,008 | **Medicinal/Shrub**: Madar / Aak / Akanda. Glaucous leaves with crown-like purple/white flowers. |
| **148** | Golden dewdrop | *Duranta erecta* | *Duranta* | Verbenaceae | `shrub` | `global` | नीलकण्ठ झाड़ी | নীলকণ্ঠ গুল্ম | 5,015 | **Garden/Shrub**: Skyflower. Cascading lilac-blue flowers followed by golden-orange beads. |
| **149** | Cannonball tree | *Couroupita guianensis* | *Couroupita* | Lecythidaceae | `tree` | `global` | नागकेसर वृक्ष | নাগলিঙ্গম | 2,269 | **Garden/Tree**: Nagalingam / Shivling tree. Exotic fragrant blooms emerging directly from trunk. |

---

## 4. Taxonomic & Ecological Category Breakdown

The 38 additions break down into three balanced groups tailored to Indian urban and rural flora:

```
┌───────────────────────────────────────────────────────────┐
│               PlantAI Species Expansion (150 Total)       │
├───────────────────────────────────────────────────────────┤
│ Existing Species (IDs 0–111)                      :  112  │
│ New Climbers & Creepers (IDs 112–122, 124–125, 133):   14  │
│ New Common Houseplants (IDs 123, 126–132, 134–135):   10  │
│ New Garden, Medicinal & Flowering (IDs 136–149)   :   14  │
├───────────────────────────────────────────────────────────┤
│ Total Expansion                                   :  150  │
└───────────────────────────────────────────────────────────┘
```

### Growth Habit Distribution (Proposed 38)
- **`climber` (14):** Combretum indicum, Gloriosa superba, Passiflora edulis, Ipomoea cairica, Ipomoea quamoclit, Hedera helix, Allamanda cathartica, Clerodendrum thomsoniae, Pyrostegia venusta, Thunbergia grandiflora, Antigonon leptopus, Syngonium podophyllum, Philodendron hederaceum, Asparagus setaceus.
- **`shrub` (11):** Codiaeum variegatum, Dracaena fragrans, Dracaena reflexa, Plumeria pudica, Tabernaemontana divaricata, Tecoma stans, Cestrum nocturnum, Acalypha wilkesiana, Plumbago auriculata, Calotropis gigantea, Duranta erecta.
- **`herb` (6):** Thaumatophyllum bipinnatifidum, Anthurium andraeanum, Strelitzia reginae, Tradescantia zebrina, Zantedeschia aethiopica, Coleus scutellarioides.
- **`tree` (4):** Ficus benjamina, Dypsis lutescens, Platycladus orientalis, Couroupita guianensis.
- **`succulent` (3):** Adenium obesum, Portulaca grandiflora, Euphorbia milii.

---

## 5. Morphological Distinction & Look-Alike Safeguards

To prevent feature-space collapse in the MobileNetV4 / ONNX visual pipeline, potential look-alike confusions were addressed during selection:

1. **Plumeria pudica (ID 137) vs Plumeria rubra (ID 25):**
   - *P. pudica* features distinctive spatulate / fiddle-shaped leaves (thin petiole base swelling into a wide apex) and evergreen non-fragrant pure white flowers.
   - *P. rubra* features elliptic leaves with acute tips, deciduous thick succulent branches, and highly fragrant pink, yellow, or tricolor flowers.
2. **Tabernaemontana divaricata (ID 138) vs Nerium oleander (ID 26):**
   - *T. divaricata* (Chandni) has glossy broad elliptic leaves with wavy margins and pure snow-white pinwheel corollas with a soft yellow center.
   - *N. oleander* (Kaner) has narrow, leathery lanceolate leaves arranged in whorls of three, with funnelform pink, red, or white blossoms.
3. **Calotropis gigantea (ID 147) vs Calotropis procera:**
   - Evaluated *C. procera*, but omitted it to avoid an intra-genus visual collision; *C. gigantea* (Crown flower / Madar) was selected exclusively for its cultural ubiquity and 7,008 high-quality observations.
4. **Ipomoea cairica (ID 115) vs Ipomoea quamoclit (ID 116):**
   - *I. cairica* has broad palmately 5-divided leaves with large lavender-purple trumpets.
   - *I. quamoclit* has finely thread-like pinnatifid foliage with tiny star-shaped crimson tubes. They inhabit completely distinct visual clusters.
5. **Dracaena fragrans (ID 127) vs Dracaena reflexa (ID 128) vs Dracaena trifasciata (ID 81):**
   - *D. trifasciata* (Snake plant) has erect, stiff, sword-like succulent blades.
   - *D. fragrans* (Corn plant) produces wide, arched glossy green leaves along thick erect woody trunks.
   - *D. reflexa* (Song of India) produces compact, spirally arranged, narrow cream-and-gold variegated leaves.


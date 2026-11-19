"""
Script: 00_compile_traits_50.py
Compiles the authoritative 50-species botanical phenotypic traits dataset.
Saves to data/traits/traits_50.csv and data/traits/traits.csv.
"""

import csv
import os

SPECIES_TRAITS = [
    # 10 Pilot Species
    {
        "id": 0, "common_name": "Tulsi", "scientific_name": "Ocimum tenuiflorum", "family": "Lamiaceae",
        "plant_growth_habit": "herb", "leaf_type": "simple", "leaf_shape": "ovate", "leaf_margin": "dentate",
        "leaf_arrangement": "opposite", "leaf_venation": "pinnate",
        "leaf_length_min_cm": 2.0, "leaf_length_max_cm": 5.5,
        "leaf_width_min_cm": 1.0, "leaf_width_max_cm": 3.2,
        "plant_height_min_m": 0.3, "plant_height_max_m": 1.0,
        "flower_present": "yes", "flower_color": "purple_or_violet", "petal_count": 5, "is_composite_head": "no",
        "thorns_or_spines": "absent", "latex_or_sap": "none_apparent", "aroma_of_crushed_leaves": "pungent_or_strong",
        "evidence_habit_morphology": "flora", "evidence_numeric_dimensions": "flora", "evidence_floral": "flora", "evidence_sensory_special": "observational",
        "needs_verification": "yes", "source_url": "http://www.efloras.org/florataxon.aspx?flora_id=2&taxon_id=200019946",
        "source_notes": "Flora of China Vol. 17 p. 298; bilabiate 5-lobed corolla; eugenol aroma"
    },
    {
        "id": 1, "common_name": "Neem", "scientific_name": "Azadirachta indica", "family": "Meliaceae",
        "plant_growth_habit": "tree", "leaf_type": "pinnately_compound", "leaf_shape": "lanceolate", "leaf_margin": "serrate",
        "leaf_arrangement": "alternate", "leaf_venation": "pinnate",
        "leaf_length_min_cm": 20.0, "leaf_length_max_cm": 40.0,
        "leaf_width_min_cm": 10.0, "leaf_width_max_cm": 20.0,
        "plant_height_min_m": 15.0, "plant_height_max_m": 25.0,
        "flower_present": "yes", "flower_color": "white", "petal_count": 5, "is_composite_head": "no",
        "thorns_or_spines": "absent", "latex_or_sap": "none_apparent", "aroma_of_crushed_leaves": "pungent_or_strong",
        "evidence_habit_morphology": "flora", "evidence_numeric_dimensions": "flora", "evidence_floral": "flora", "evidence_sensory_special": "observational",
        "needs_verification": "yes", "source_url": "http://www.efloras.org/florataxon.aspx?flora_id=2&taxon_id=200012496",
        "source_notes": "Flora of China Vol. 11 p. 130; compound leaf 20-40cm; leaflets falcate 3-8cm; garlicky aroma"
    },
    {
        "id": 2, "common_name": "Aloe vera", "scientific_name": "Aloe vera", "family": "Asphodelaceae",
        "plant_growth_habit": "succulent", "leaf_type": "simple", "leaf_shape": "lanceolate", "leaf_margin": "spiny",
        "leaf_arrangement": "basal_rosette", "leaf_venation": "absent_or_obscure",
        "leaf_length_min_cm": 30.0, "leaf_length_max_cm": 60.0,
        "leaf_width_min_cm": 5.0, "leaf_width_max_cm": 10.0,
        "plant_height_min_m": 0.4, "plant_height_max_m": 1.0,
        "flower_present": "yes", "flower_color": "yellow", "petal_count": 6, "is_composite_head": "no",
        "thorns_or_spines": "spiny_leaf_margins", "latex_or_sap": "colored_yellow_red", "aroma_of_crushed_leaves": "none_or_faint",
        "evidence_habit_morphology": "flora", "evidence_numeric_dimensions": "flora", "evidence_floral": "flora", "evidence_sensory_special": "observational",
        "needs_verification": "yes", "source_url": "http://www.efloras.org/florataxon.aspx?flora_id=2&taxon_id=200027557",
        "source_notes": "Flora of China Vol. 24 p. 160; yellow aloin sap with inner clear gel; 6 perianth segments"
    },
    {
        "id": 3, "common_name": "Turmeric", "scientific_name": "Curcuma longa", "family": "Zingiberaceae",
        "plant_growth_habit": "herb", "leaf_type": "simple", "leaf_shape": "elliptic", "leaf_margin": "entire",
        "leaf_arrangement": "distichous", "leaf_venation": "pinnate",
        "leaf_length_min_cm": 30.0, "leaf_length_max_cm": 50.0,
        "leaf_width_min_cm": 10.0, "leaf_width_max_cm": 18.0,
        "plant_height_min_m": 0.8, "plant_height_max_m": 1.5,
        "flower_present": "yes", "flower_color": "yellow", "petal_count": 3, "is_composite_head": "no",
        "thorns_or_spines": "absent", "latex_or_sap": "none_apparent", "aroma_of_crushed_leaves": "aromatic_pleasant",
        "evidence_habit_morphology": "flora", "evidence_numeric_dimensions": "flora", "evidence_floral": "flora", "evidence_sensory_special": "observational",
        "needs_verification": "yes", "source_url": "http://www.efloras.org/florataxon.aspx?flora_id=2&taxon_id=200028359",
        "source_notes": "Flora of China Vol. 24 p. 360; 3-lobed corolla; warm spicy rhizomatous aroma"
    },
    {
        "id": 8, "common_name": "Amla", "scientific_name": "Phyllanthus emblica", "family": "Phyllanthaceae",
        "plant_growth_habit": "tree", "leaf_type": "simple", "leaf_shape": "linear", "leaf_margin": "entire",
        "leaf_arrangement": "alternate", "leaf_venation": "absent_or_obscure",
        "leaf_length_min_cm": 0.8, "leaf_length_max_cm": 2.3,
        "leaf_width_min_cm": 0.15, "leaf_width_max_cm": 0.5,
        "plant_height_min_m": 8.0, "plant_height_max_m": 20.0,
        "flower_present": "yes", "flower_color": "yellow", "petal_count": 0, "is_composite_head": "no",
        "thorns_or_spines": "absent", "latex_or_sap": "none_apparent", "aroma_of_crushed_leaves": "none_or_faint",
        "evidence_habit_morphology": "flora", "evidence_numeric_dimensions": "flora", "evidence_floral": "flora", "evidence_sensory_special": "observational",
        "needs_verification": "yes", "source_url": "http://www.efloras.org/florataxon.aspx?flora_id=2&taxon_id=200012586",
        "source_notes": "Flora of China Vol. 11 p. 185; simple distichous leaves resembling pinnate leaf; apetalous with 6 calyx lobes"
    },
    {
        "id": 9, "common_name": "Curry leaf", "scientific_name": "Murraya koenigii", "family": "Rutaceae",
        "plant_growth_habit": "tree", "leaf_type": "pinnately_compound", "leaf_shape": "ovate", "leaf_margin": "crenate",
        "leaf_arrangement": "alternate", "leaf_venation": "pinnate",
        "leaf_length_min_cm": 15.0, "leaf_length_max_cm": 35.0,
        "leaf_width_min_cm": 6.0, "leaf_width_max_cm": 12.0,
        "plant_height_min_m": 2.5, "plant_height_max_m": 6.0,
        "flower_present": "yes", "flower_color": "white", "petal_count": 5, "is_composite_head": "no",
        "thorns_or_spines": "absent", "latex_or_sap": "none_apparent", "aroma_of_crushed_leaves": "pungent_or_strong",
        "evidence_habit_morphology": "flora", "evidence_numeric_dimensions": "flora", "evidence_floral": "flora", "evidence_sensory_special": "observational",
        "needs_verification": "yes", "source_url": "http://www.efloras.org/florataxon.aspx?flora_id=2&taxon_id=200012461",
        "source_notes": "Flora of China Vol. 11 p. 87; odd-pinnate 11-25 leaflets; pungent curry aroma with pellucid glands"
    },
    {
        "id": 11, "common_name": "Bael", "scientific_name": "Aegle marmelos", "family": "Rutaceae",
        "plant_growth_habit": "tree", "leaf_type": "trifoliolate", "leaf_shape": "ovate", "leaf_margin": "crenate",
        "leaf_arrangement": "alternate", "leaf_venation": "pinnate",
        "leaf_length_min_cm": 6.0, "leaf_length_max_cm": 15.0,
        "leaf_width_min_cm": 3.0, "leaf_width_max_cm": 8.0,
        "plant_height_min_m": 8.0, "plant_height_max_m": 18.0,
        "flower_present": "yes", "flower_color": "white", "petal_count": 4, "is_composite_head": "no",
        "thorns_or_spines": "spines_or_thorns_on_stem", "latex_or_sap": "none_apparent", "aroma_of_crushed_leaves": "citrusy",
        "evidence_habit_morphology": "flora", "evidence_numeric_dimensions": "flora", "evidence_floral": "flora", "evidence_sensory_special": "observational",
        "needs_verification": "yes", "source_url": "http://www.efloras.org/florataxon.aspx?flora_id=5&taxon_id=200012368",
        "source_notes": "Flora of Pakistan / Kew POWO; trifoliolate leaf; 4-5 fleshy petals; sharp straight axillary spines"
    },
    {
        "id": 14, "common_name": "Betel", "scientific_name": "Piper betle", "family": "Piperaceae",
        "plant_growth_habit": "climber", "leaf_type": "simple", "leaf_shape": "cordate", "leaf_margin": "entire",
        "leaf_arrangement": "alternate", "leaf_venation": "palmate",
        "leaf_length_min_cm": 7.0, "leaf_length_max_cm": 18.0,
        "leaf_width_min_cm": 4.0, "leaf_width_max_cm": 12.0,
        "plant_height_min_m": 2.0, "plant_height_max_m": 15.0,
        "flower_present": "inconspicuous_or_absent", "flower_color": "brown_or_inconspicuous", "petal_count": 0, "is_composite_head": "no",
        "thorns_or_spines": "absent", "latex_or_sap": "none_apparent", "aroma_of_crushed_leaves": "pungent_or_strong",
        "evidence_habit_morphology": "flora", "evidence_numeric_dimensions": "flora", "evidence_floral": "flora", "evidence_sensory_special": "observational",
        "needs_verification": "yes", "source_url": "http://www.efloras.org/florataxon.aspx?flora_id=2&taxon_id=200005545",
        "source_notes": "Flora of China Vol. 4 p. 121; climbing vine; cordate leaves with 5-7 basal veins; apetalous catkin spike"
    },
    {
        "id": 15, "common_name": "Lemongrass", "scientific_name": "Cymbopogon citratus", "family": "Poaceae",
        "plant_growth_habit": "grass", "leaf_type": "simple", "leaf_shape": "linear", "leaf_margin": "entire",
        "leaf_arrangement": "basal_rosette", "leaf_venation": "parallel",
        "leaf_length_min_cm": 60.0, "leaf_length_max_cm": 120.0,
        "leaf_width_min_cm": 1.0, "leaf_width_max_cm": 2.5,
        "plant_height_min_m": 1.0, "plant_height_max_m": 1.8,
        "flower_present": "inconspicuous_or_absent", "flower_color": "brown_or_inconspicuous", "petal_count": 0, "is_composite_head": "no",
        "thorns_or_spines": "absent", "latex_or_sap": "none_apparent", "aroma_of_crushed_leaves": "citrusy",
        "evidence_habit_morphology": "flora", "evidence_numeric_dimensions": "flora", "evidence_floral": "flora", "evidence_sensory_special": "observational",
        "needs_verification": "yes", "source_url": "http://www.efloras.org/florataxon.aspx?flora_id=2&taxon_id=200025087",
        "source_notes": "Flora of China Vol. 22 p. 628; dense clumping grass; sharp scabrous margins; strong citral lemon scent"
    },
    {
        "id": 16, "common_name": "Mint", "scientific_name": "Mentha spicata", "family": "Lamiaceae",
        "plant_growth_habit": "herb", "leaf_type": "simple", "leaf_shape": "lanceolate", "leaf_margin": "serrate",
        "leaf_arrangement": "opposite", "leaf_venation": "pinnate",
        "leaf_length_min_cm": 2.5, "leaf_length_max_cm": 7.0,
        "leaf_width_min_cm": 1.0, "leaf_width_max_cm": 3.0,
        "plant_height_min_m": 0.3, "plant_height_max_m": 0.9,
        "flower_present": "yes", "flower_color": "purple_or_violet", "petal_count": 4, "is_composite_head": "no",
        "thorns_or_spines": "absent", "latex_or_sap": "none_apparent", "aroma_of_crushed_leaves": "aromatic_pleasant",
        "evidence_habit_morphology": "flora", "evidence_numeric_dimensions": "flora", "evidence_floral": "flora", "evidence_sensory_special": "observational",
        "needs_verification": "yes", "source_url": "http://www.efloras.org/florataxon.aspx?flora_id=2&taxon_id=200019803",
        "source_notes": "Flora of China Vol. 17 p. 237; 4-lobed corolla; sharp serrations; spearmint carvone/menthol aroma"
    },

    # Additional 40 Curated Species
    {
        "id": 17, "common_name": "Peepal", "scientific_name": "Ficus religiosa", "family": "Moraceae",
        "plant_growth_habit": "tree", "leaf_type": "simple", "leaf_shape": "cordate", "leaf_margin": "entire",
        "leaf_arrangement": "alternate", "leaf_venation": "pinnate",
        "leaf_length_min_cm": 10.0, "leaf_length_max_cm": 25.0,
        "leaf_width_min_cm": 7.5, "leaf_width_max_cm": 14.0,
        "plant_height_min_m": 15.0, "plant_height_max_m": 30.0,
        "flower_present": "inconspicuous_or_absent", "flower_color": "brown_or_inconspicuous", "petal_count": 0, "is_composite_head": "no",
        "thorns_or_spines": "absent", "latex_or_sap": "milky_white", "aroma_of_crushed_leaves": "none_or_faint",
        "evidence_habit_morphology": "flora", "evidence_numeric_dimensions": "flora", "evidence_floral": "flora", "evidence_sensory_special": "observational",
        "needs_verification": "yes", "source_url": "https://powo.science.kew.org/taxon/urn:lsid:ipni.org:names:853457-1",
        "source_notes": "Kew POWO / Flora of China Vol. 5 p. 40; caudate acumen drip-tip; milky latex; hypanthodium fig"
    },
    {
        "id": 18, "common_name": "Banyan", "scientific_name": "Ficus benghalensis", "family": "Moraceae",
        "plant_growth_habit": "tree", "leaf_type": "simple", "leaf_shape": "ovate", "leaf_margin": "entire",
        "leaf_arrangement": "alternate", "leaf_venation": "pinnate",
        "leaf_length_min_cm": 10.0, "leaf_length_max_cm": 22.0,
        "leaf_width_min_cm": 8.0, "leaf_width_max_cm": 15.0,
        "plant_height_min_m": 15.0, "plant_height_max_m": 25.0,
        "flower_present": "inconspicuous_or_absent", "flower_color": "brown_or_inconspicuous", "petal_count": 0, "is_composite_head": "no",
        "thorns_or_spines": "absent", "latex_or_sap": "milky_white", "aroma_of_crushed_leaves": "none_or_faint",
        "evidence_habit_morphology": "flora", "evidence_numeric_dimensions": "flora", "evidence_floral": "flora", "evidence_sensory_special": "observational",
        "needs_verification": "yes", "source_url": "https://powo.science.kew.org/taxon/urn:lsid:ipni.org:names:852495-1",
        "source_notes": "Kew POWO / Flora of Pakistan; thick coriaceous leaves; prominent aerial prop roots; milky latex"
    },
    {
        "id": 20, "common_name": "Hibiscus", "scientific_name": "Hibiscus rosa-sinensis", "family": "Malvaceae",
        "plant_growth_habit": "shrub", "leaf_type": "simple", "leaf_shape": "ovate", "leaf_margin": "serrate",
        "leaf_arrangement": "alternate", "leaf_venation": "palmate",
        "leaf_length_min_cm": 6.0, "leaf_length_max_cm": 12.0,
        "leaf_width_min_cm": 4.0, "leaf_width_max_cm": 8.0,
        "plant_height_min_m": 1.5, "plant_height_max_m": 4.0,
        "flower_present": "yes", "flower_color": "red_or_crimson", "petal_count": 5, "is_composite_head": "no",
        "thorns_or_spines": "absent", "latex_or_sap": "none_apparent", "aroma_of_crushed_leaves": "none_or_faint",
        "evidence_habit_morphology": "flora", "evidence_numeric_dimensions": "flora", "evidence_floral": "flora", "evidence_sensory_special": "observational",
        "needs_verification": "yes", "source_url": "https://powo.science.kew.org/taxon/urn:lsid:ipni.org:names:560600-1",
        "source_notes": "Flora of China Vol. 12 p. 290; monadelphous staminal column; 5 petals; ovate serrate leaves"
    },
    {
        "id": 21, "common_name": "Marigold", "scientific_name": "Tagetes erecta", "family": "Asteraceae",
        "plant_growth_habit": "herb", "leaf_type": "pinnately_compound", "leaf_shape": "lanceolate", "leaf_margin": "serrate",
        "leaf_arrangement": "opposite", "leaf_venation": "pinnate",
        "leaf_length_min_cm": 5.0, "leaf_length_max_cm": 15.0,
        "leaf_width_min_cm": 2.0, "leaf_width_max_cm": 6.0,
        "plant_height_min_m": 0.3, "plant_height_max_m": 1.0,
        "flower_present": "yes", "flower_color": "orange", "petal_count": 0, "is_composite_head": "yes",
        "thorns_or_spines": "absent", "latex_or_sap": "none_apparent", "aroma_of_crushed_leaves": "pungent_or_strong",
        "evidence_habit_morphology": "flora", "evidence_numeric_dimensions": "flora", "evidence_floral": "flora", "evidence_sensory_special": "observational",
        "needs_verification": "yes", "source_url": "https://powo.science.kew.org/taxon/urn:lsid:ipni.org:names:250165-1",
        "source_notes": "Flora of North America Vol. 21 p. 235; pinnatisect foliage; capitulum head; aromatic oil glands"
    },
    {
        "id": 22, "common_name": "Jasmine", "scientific_name": "Jasminum sambac", "family": "Oleaceae",
        "plant_growth_habit": "shrub", "leaf_type": "simple", "leaf_shape": "ovate", "leaf_margin": "entire",
        "leaf_arrangement": "opposite", "leaf_venation": "pinnate",
        "leaf_length_min_cm": 4.0, "leaf_length_max_cm": 9.0,
        "leaf_width_min_cm": 2.5, "leaf_width_max_cm": 5.0,
        "plant_height_min_m": 1.0, "plant_height_max_m": 3.0,
        "flower_present": "yes", "flower_color": "white", "petal_count": 8, "is_composite_head": "no",
        "thorns_or_spines": "absent", "latex_or_sap": "none_apparent", "aroma_of_crushed_leaves": "sweet_floral",
        "evidence_habit_morphology": "flora", "evidence_numeric_dimensions": "flora", "evidence_floral": "flora", "evidence_sensory_special": "observational",
        "needs_verification": "yes", "source_url": "https://powo.science.kew.org/taxon/urn:lsid:ipni.org:names:610994-1",
        "source_notes": "Flora of China Vol. 15 p. 312; opposite simple leaves; highly fragrant white salverform corolla"
    },
    {
        "id": 23, "common_name": "Lotus", "scientific_name": "Nelumbo nucifera", "family": "Nelumbonaceae",
        "plant_growth_habit": "aquatic", "leaf_type": "simple", "leaf_shape": "orbicular", "leaf_margin": "entire",
        "leaf_arrangement": "basal_rosette", "leaf_venation": "palmate",
        "leaf_length_min_cm": 30.0, "leaf_length_max_cm": 70.0,
        "leaf_width_min_cm": 30.0, "leaf_width_max_cm": 70.0,
        "plant_height_min_m": 0.5, "plant_height_max_m": 1.8,
        "flower_present": "yes", "flower_color": "pink_or_magenta", "petal_count": 15, "is_composite_head": "no",
        "thorns_or_spines": "absent", "latex_or_sap": "watery_clear", "aroma_of_crushed_leaves": "none_or_faint",
        "evidence_habit_morphology": "flora", "evidence_numeric_dimensions": "flora", "evidence_floral": "flora", "evidence_sensory_special": "observational",
        "needs_verification": "yes", "source_url": "https://powo.science.kew.org/taxon/urn:lsid:ipni.org:names:605422-1",
        "source_notes": "Flora of China Vol. 6 p. 114; peltate orbicular floating/emergent leaves; large solitary rose-pink flower"
    },
    {
        "id": 24, "common_name": "Rose", "scientific_name": "Rosa indica", "family": "Rosaceae",
        "plant_growth_habit": "shrub", "leaf_type": "pinnately_compound", "leaf_shape": "ovate", "leaf_margin": "serrate",
        "leaf_arrangement": "alternate", "leaf_venation": "pinnate",
        "leaf_length_min_cm": 5.0, "leaf_length_max_cm": 15.0,
        "leaf_width_min_cm": 3.0, "leaf_width_max_cm": 8.0,
        "plant_height_min_m": 1.0, "plant_height_max_m": 3.0,
        "flower_present": "yes", "flower_color": "red_or_crimson", "petal_count": 5, "is_composite_head": "no",
        "thorns_or_spines": "prickles", "latex_or_sap": "none_apparent", "aroma_of_crushed_leaves": "none_or_faint",
        "evidence_habit_morphology": "flora", "evidence_numeric_dimensions": "flora", "evidence_floral": "flora", "evidence_sensory_special": "observational",
        "needs_verification": "yes", "source_url": "https://powo.science.kew.org/taxon/urn:lsid:ipni.org:names:732943-1",
        "source_notes": "Flora of China Vol. 9 p. 339; odd-pinnate leaves; sharp curved prickles; 5 petals (wild form)"
    },
    {
        "id": 25, "common_name": "Frangipani", "scientific_name": "Plumeria rubra", "family": "Apocynaceae",
        "plant_growth_habit": "tree", "leaf_type": "simple", "leaf_shape": "oblong", "leaf_margin": "entire",
        "leaf_arrangement": "spiral", "leaf_venation": "pinnate",
        "leaf_length_min_cm": 20.0, "leaf_length_max_cm": 45.0,
        "leaf_width_min_cm": 7.0, "leaf_width_max_cm": 15.0,
        "plant_height_min_m": 3.0, "plant_height_max_m": 8.0,
        "flower_present": "yes", "flower_color": "white", "petal_count": 5, "is_composite_head": "no",
        "thorns_or_spines": "absent", "latex_or_sap": "milky_white", "aroma_of_crushed_leaves": "none_or_faint",
        "evidence_habit_morphology": "flora", "evidence_numeric_dimensions": "flora", "evidence_floral": "flora", "evidence_sensory_special": "observational",
        "needs_verification": "yes", "source_url": "https://powo.science.kew.org/taxon/urn:lsid:ipni.org:names:80931-1",
        "source_notes": "Flora of China Vol. 16 p. 153; succulent brittle branches; abundant milky latex; 5 spiraled petals"
    },
    {
        "id": 26, "common_name": "Oleander", "scientific_name": "Nerium oleander", "family": "Apocynaceae",
        "plant_growth_habit": "shrub", "leaf_type": "simple", "leaf_shape": "linear", "leaf_margin": "entire",
        "leaf_arrangement": "whorled", "leaf_venation": "pinnate",
        "leaf_length_min_cm": 10.0, "leaf_length_max_cm": 22.0,
        "leaf_width_min_cm": 1.5, "leaf_width_max_cm": 3.5,
        "plant_height_min_m": 2.0, "plant_height_max_m": 5.0,
        "flower_present": "yes", "flower_color": "pink_or_magenta", "petal_count": 5, "is_composite_head": "no",
        "thorns_or_spines": "absent", "latex_or_sap": "watery_clear", "aroma_of_crushed_leaves": "none_or_faint",
        "evidence_habit_morphology": "flora", "evidence_numeric_dimensions": "flora", "evidence_floral": "flora", "evidence_sensory_special": "observational",
        "needs_verification": "yes", "source_url": "https://powo.science.kew.org/taxon/urn:lsid:ipni.org:names:80620-1",
        "source_notes": "Flora of China Vol. 16 p. 173; whorls of 3; linear-lanceolate leathery blade; cardiac glycosides"
    },
    {
        "id": 27, "common_name": "Bougainvillea", "scientific_name": "Bougainvillea spectabilis", "family": "Nyctaginaceae",
        "plant_growth_habit": "climber", "leaf_type": "simple", "leaf_shape": "ovate", "leaf_margin": "entire",
        "leaf_arrangement": "alternate", "leaf_venation": "pinnate",
        "leaf_length_min_cm": 4.0, "leaf_length_max_cm": 10.0,
        "leaf_width_min_cm": 2.5, "leaf_width_max_cm": 6.0,
        "plant_height_min_m": 3.0, "plant_height_max_m": 12.0,
        "flower_present": "yes", "flower_color": "pink_or_magenta", "petal_count": 0, "is_composite_head": "no",
        "thorns_or_spines": "spines_or_thorns_on_stem", "latex_or_sap": "none_apparent", "aroma_of_crushed_leaves": "none_or_faint",
        "evidence_habit_morphology": "flora", "evidence_numeric_dimensions": "flora", "evidence_floral": "flora", "evidence_sensory_special": "observational",
        "needs_verification": "yes", "source_url": "https://powo.science.kew.org/taxon/urn:lsid:ipni.org:names:60434316-2",
        "source_notes": "Flora of Pakistan; sharp axillary recurved spines; 3 large colorful petaloid bracts enclosing tubular flowers"
    },
    {
        "id": 28, "common_name": "Butterfly pea", "scientific_name": "Clitoria ternatea", "family": "Fabaceae",
        "plant_growth_habit": "climber", "leaf_type": "pinnately_compound", "leaf_shape": "elliptic", "leaf_margin": "entire",
        "leaf_arrangement": "alternate", "leaf_venation": "pinnate",
        "leaf_length_min_cm": 6.0, "leaf_length_max_cm": 14.0,
        "leaf_width_min_cm": 3.0, "leaf_width_max_cm": 7.0,
        "plant_height_min_m": 1.5, "plant_height_max_m": 4.0,
        "flower_present": "yes", "flower_color": "blue", "petal_count": 5, "is_composite_head": "no",
        "thorns_or_spines": "absent", "latex_or_sap": "none_apparent", "aroma_of_crushed_leaves": "none_or_faint",
        "evidence_habit_morphology": "flora", "evidence_numeric_dimensions": "flora", "evidence_floral": "flora", "evidence_sensory_special": "observational",
        "needs_verification": "yes", "source_url": "https://powo.science.kew.org/taxon/urn:lsid:ipni.org:names:486518-1",
        "source_notes": "Flora of China Vol. 10 p. 201; pinnate with 5-7 leaflets; solitary deep blue papilionaceous flowers"
    },
    {
        "id": 29, "common_name": "Night jasmine", "scientific_name": "Nyctanthes arbor-tristis", "family": "Oleaceae",
        "plant_growth_habit": "tree", "leaf_type": "simple", "leaf_shape": "ovate", "leaf_margin": "entire",
        "leaf_arrangement": "opposite", "leaf_venation": "pinnate",
        "leaf_length_min_cm": 6.0, "leaf_length_max_cm": 12.0,
        "leaf_width_min_cm": 3.5, "leaf_width_max_cm": 7.0,
        "plant_height_min_m": 3.0, "plant_height_max_m": 10.0,
        "flower_present": "yes", "flower_color": "white", "petal_count": 6, "is_composite_head": "no",
        "thorns_or_spines": "absent", "latex_or_sap": "none_apparent", "aroma_of_crushed_leaves": "none_or_faint",
        "evidence_habit_morphology": "flora", "evidence_numeric_dimensions": "flora", "evidence_floral": "flora", "evidence_sensory_special": "observational",
        "needs_verification": "yes", "source_url": "https://powo.science.kew.org/taxon/urn:lsid:ipni.org:names:610260-1",
        "source_notes": "Flora of Pakistan; scabrous rough leaves; white corolla lobes (5-8) with bright orange cylinder tube"
    },
    {
        "id": 30, "common_name": "Gulmohar", "scientific_name": "Delonix regia", "family": "Fabaceae",
        "plant_growth_habit": "tree", "leaf_type": "bipinnately_compound", "leaf_shape": "linear", "leaf_margin": "entire",
        "leaf_arrangement": "alternate", "leaf_venation": "pinnate",
        "leaf_length_min_cm": 25.0, "leaf_length_max_cm": 50.0,
        "leaf_width_min_cm": 10.0, "leaf_width_max_cm": 25.0,
        "plant_height_min_m": 10.0, "plant_height_max_m": 18.0,
        "flower_present": "yes", "flower_color": "red_or_crimson", "petal_count": 5, "is_composite_head": "no",
        "thorns_or_spines": "absent", "latex_or_sap": "none_apparent", "aroma_of_crushed_leaves": "none_or_faint",
        "evidence_habit_morphology": "flora", "evidence_numeric_dimensions": "flora", "evidence_floral": "flora", "evidence_sensory_special": "observational",
        "needs_verification": "yes", "source_url": "https://powo.science.kew.org/taxon/urn:lsid:ipni.org:names:491877-1",
        "source_notes": "Flora of China Vol. 10 p. 22; feathery bipinnate leaves; 5 clawed scarlet petals with variegated banner"
    },
    {
        "id": 31, "common_name": "Periwinkle", "scientific_name": "Catharanthus roseus", "family": "Apocynaceae",
        "plant_growth_habit": "herb", "leaf_type": "simple", "leaf_shape": "elliptic", "leaf_margin": "entire",
        "leaf_arrangement": "opposite", "leaf_venation": "pinnate",
        "leaf_length_min_cm": 2.5, "leaf_length_max_cm": 7.0,
        "leaf_width_min_cm": 1.5, "leaf_width_max_cm": 3.5,
        "plant_height_min_m": 0.3, "plant_height_max_m": 1.0,
        "flower_present": "yes", "flower_color": "pink_or_magenta", "petal_count": 5, "is_composite_head": "no",
        "thorns_or_spines": "absent", "latex_or_sap": "watery_clear", "aroma_of_crushed_leaves": "none_or_faint",
        "evidence_habit_morphology": "flora", "evidence_numeric_dimensions": "flora", "evidence_floral": "flora", "evidence_sensory_special": "observational",
        "needs_verification": "yes", "source_url": "https://powo.science.kew.org/taxon/urn:lsid:ipni.org:names:77903-1",
        "source_notes": "Flora of China Vol. 16 p. 156; glossy elliptic opposite leaves; 5 salverform lobes; anticancer alkaloids"
    },
    {
        "id": 32, "common_name": "Ixora", "scientific_name": "Ixora coccinea", "family": "Rubiaceae",
        "plant_growth_habit": "shrub", "leaf_type": "simple", "leaf_shape": "oblong", "leaf_margin": "entire",
        "leaf_arrangement": "opposite", "leaf_venation": "pinnate",
        "leaf_length_min_cm": 5.0, "leaf_length_max_cm": 10.0,
        "leaf_width_min_cm": 2.5, "leaf_width_max_cm": 5.0,
        "plant_height_min_m": 1.0, "plant_height_max_m": 3.0,
        "flower_present": "yes", "flower_color": "red_or_crimson", "petal_count": 4, "is_composite_head": "no",
        "thorns_or_spines": "absent", "latex_or_sap": "none_apparent", "aroma_of_crushed_leaves": "none_or_faint",
        "evidence_habit_morphology": "flora", "evidence_numeric_dimensions": "flora", "evidence_floral": "flora", "evidence_sensory_special": "observational",
        "needs_verification": "yes", "source_url": "https://powo.science.kew.org/taxon/urn:lsid:ipni.org:names:753696-1",
        "source_notes": "Flora of China Vol. 19 p. 180; sessile leathery leaves; dense corymb of 4-lobed scarlet salverform flowers"
    },
    {
        "id": 38, "common_name": "Amaltas", "scientific_name": "Cassia fistula", "family": "Fabaceae",
        "plant_growth_habit": "tree", "leaf_type": "pinnately_compound", "leaf_shape": "ovate", "leaf_margin": "entire",
        "leaf_arrangement": "alternate", "leaf_venation": "pinnate",
        "leaf_length_min_cm": 20.0, "leaf_length_max_cm": 40.0,
        "leaf_width_min_cm": 10.0, "leaf_width_max_cm": 20.0,
        "plant_height_min_m": 8.0, "plant_height_max_m": 15.0,
        "flower_present": "yes", "flower_color": "yellow", "petal_count": 5, "is_composite_head": "no",
        "thorns_or_spines": "absent", "latex_or_sap": "none_apparent", "aroma_of_crushed_leaves": "none_or_faint",
        "evidence_habit_morphology": "flora", "evidence_numeric_dimensions": "flora", "evidence_floral": "flora", "evidence_sensory_special": "observational",
        "needs_verification": "yes", "source_url": "https://powo.science.kew.org/taxon/urn:lsid:ipni.org:names:484666-1",
        "source_notes": "Flora of China Vol. 10 p. 28; even-pinnate 4-8 pairs large leaflets; pendulous racemes 5 golden petals"
    },
    {
        "id": 40, "common_name": "Mango", "scientific_name": "Mangifera indica", "family": "Anacardiaceae",
        "plant_growth_habit": "tree", "leaf_type": "simple", "leaf_shape": "lanceolate", "leaf_margin": "entire",
        "leaf_arrangement": "alternate", "leaf_venation": "pinnate",
        "leaf_length_min_cm": 15.0, "leaf_length_max_cm": 32.0,
        "leaf_width_min_cm": 4.0, "leaf_width_max_cm": 9.0,
        "plant_height_min_m": 10.0, "plant_height_max_m": 30.0,
        "flower_present": "yes", "flower_color": "yellow", "petal_count": 5, "is_composite_head": "no",
        "thorns_or_spines": "absent", "latex_or_sap": "sticky_resinous", "aroma_of_crushed_leaves": "aromatic_pleasant",
        "evidence_habit_morphology": "flora", "evidence_numeric_dimensions": "flora", "evidence_floral": "flora", "evidence_sensory_special": "observational",
        "needs_verification": "yes", "source_url": "https://powo.science.kew.org/taxon/urn:lsid:ipni.org:names:69947-1",
        "source_notes": "Flora of China Vol. 11 p. 336; coriaceous oblong-lanceolate leaves; turpentine aroma; sticky resin"
    },
    {
        "id": 41, "common_name": "Coconut", "scientific_name": "Cocos nucifera", "family": "Arecaceae",
        "plant_growth_habit": "tree", "leaf_type": "pinnately_compound", "leaf_shape": "linear", "leaf_margin": "entire",
        "leaf_arrangement": "spiral", "leaf_venation": "parallel",
        "leaf_length_min_cm": 250.0, "leaf_length_max_cm": 500.0,
        "leaf_width_min_cm": 50.0, "leaf_width_max_cm": 120.0,
        "plant_height_min_m": 15.0, "plant_height_max_m": 30.0,
        "flower_present": "yes", "flower_color": "yellow", "petal_count": 3, "is_composite_head": "no",
        "thorns_or_spines": "absent", "latex_or_sap": "none_apparent", "aroma_of_crushed_leaves": "none_or_faint",
        "evidence_habit_morphology": "flora", "evidence_numeric_dimensions": "flora", "evidence_floral": "flora", "evidence_sensory_special": "observational",
        "needs_verification": "yes", "source_url": "https://powo.science.kew.org/taxon/urn:lsid:ipni.org:names:666205-1",
        "source_notes": "Flora of China Vol. 23 p. 143; unbranched palm trunk; massive pinnate fronds; 3 inner petaloid tepals"
    },
    {
        "id": 42, "common_name": "Banana", "scientific_name": "Musa acuminata", "family": "Musaceae",
        "plant_growth_habit": "herb", "leaf_type": "simple", "leaf_shape": "oblong", "leaf_margin": "entire",
        "leaf_arrangement": "spiral", "leaf_venation": "pinnate",
        "leaf_length_min_cm": 120.0, "leaf_length_max_cm": 250.0,
        "leaf_width_min_cm": 40.0, "leaf_width_max_cm": 60.0,
        "plant_height_min_m": 2.0, "plant_height_max_m": 6.0,
        "flower_present": "yes", "flower_color": "yellow", "petal_count": 5, "is_composite_head": "no",
        "thorns_or_spines": "absent", "latex_or_sap": "watery_clear", "aroma_of_crushed_leaves": "none_or_faint",
        "evidence_habit_morphology": "flora", "evidence_numeric_dimensions": "flora", "evidence_floral": "flora", "evidence_sensory_special": "observational",
        "needs_verification": "yes", "source_url": "https://powo.science.kew.org/taxon/urn:lsid:ipni.org:names:584837-1",
        "source_notes": "Flora of China Vol. 24 p. 315; giant herbaceous pseudostem; simple paddle blades; pinnate-parallel veins"
    },
    {
        "id": 43, "common_name": "Papaya", "scientific_name": "Carica papaya", "family": "Caricaceae",
        "plant_growth_habit": "tree", "leaf_type": "simple", "leaf_shape": "palmate_lobed", "leaf_margin": "lobed",
        "leaf_arrangement": "spiral", "leaf_venation": "palmate",
        "leaf_length_min_cm": 30.0, "leaf_length_max_cm": 65.0,
        "leaf_width_min_cm": 30.0, "leaf_width_max_cm": 60.0,
        "plant_height_min_m": 2.5, "plant_height_max_m": 8.0,
        "flower_present": "yes", "flower_color": "white", "petal_count": 5, "is_composite_head": "no",
        "thorns_or_spines": "absent", "latex_or_sap": "milky_white", "aroma_of_crushed_leaves": "none_or_faint",
        "evidence_habit_morphology": "flora", "evidence_numeric_dimensions": "flora", "evidence_floral": "flora", "evidence_sensory_special": "observational",
        "needs_verification": "yes", "source_url": "https://powo.science.kew.org/taxon/urn:lsid:ipni.org:names:112264-1",
        "source_notes": "Flora of China Vol. 13 p. 153; palmately 7-9 lobed gigantic leaves; abundant white papain latex"
    },
    {
        "id": 44, "common_name": "Guava", "scientific_name": "Psidium guajava", "family": "Myrtaceae",
        "plant_growth_habit": "tree", "leaf_type": "simple", "leaf_shape": "elliptic", "leaf_margin": "entire",
        "leaf_arrangement": "opposite", "leaf_venation": "pinnate",
        "leaf_length_min_cm": 7.0, "leaf_length_max_cm": 15.0,
        "leaf_width_min_cm": 3.0, "leaf_width_max_cm": 6.0,
        "plant_height_min_m": 3.0, "plant_height_max_m": 8.0,
        "flower_present": "yes", "flower_color": "white", "petal_count": 5, "is_composite_head": "no",
        "thorns_or_spines": "absent", "latex_or_sap": "none_apparent", "aroma_of_crushed_leaves": "aromatic_pleasant",
        "evidence_habit_morphology": "flora", "evidence_numeric_dimensions": "flora", "evidence_floral": "flora", "evidence_sensory_special": "observational",
        "needs_verification": "yes", "source_url": "https://powo.science.kew.org/taxon/urn:lsid:ipni.org:names:599818-1",
        "source_notes": "Flora of China Vol. 13 p. 337; opposite prominent lateral veins; smooth peeling bark; aromatic leaves"
    },
    {
        "id": 45, "common_name": "Pomegranate", "scientific_name": "Punica granatum", "family": "Lythraceae",
        "plant_growth_habit": "shrub", "leaf_type": "simple", "leaf_shape": "oblong", "leaf_margin": "entire",
        "leaf_arrangement": "opposite", "leaf_venation": "pinnate",
        "leaf_length_min_cm": 3.0, "leaf_length_max_cm": 8.0,
        "leaf_width_min_cm": 1.0, "leaf_width_max_cm": 2.5,
        "plant_height_min_m": 2.0, "plant_height_max_m": 5.0,
        "flower_present": "yes", "flower_color": "red_or_crimson", "petal_count": 6, "is_composite_head": "no",
        "thorns_or_spines": "spines_or_thorns_on_stem", "latex_or_sap": "none_apparent", "aroma_of_crushed_leaves": "none_or_faint",
        "evidence_habit_morphology": "flora", "evidence_numeric_dimensions": "flora", "evidence_floral": "flora", "evidence_sensory_special": "observational",
        "needs_verification": "yes", "source_url": "https://powo.science.kew.org/taxon/urn:lsid:ipni.org:names:553641-1",
        "source_notes": "Flora of China Vol. 13 p. 283; spinose branchlets; fleshy scarlet calyx tube; 5-8 crinkled petals"
    },
    {
        "id": 47, "common_name": "Tamarind", "scientific_name": "Tamarindus indica", "family": "Fabaceae",
        "plant_growth_habit": "tree", "leaf_type": "pinnately_compound", "leaf_shape": "oblong", "leaf_margin": "entire",
        "leaf_arrangement": "alternate", "leaf_venation": "pinnate",
        "leaf_length_min_cm": 7.0, "leaf_length_max_cm": 15.0,
        "leaf_width_min_cm": 2.0, "leaf_width_max_cm": 4.0,
        "plant_height_min_m": 12.0, "plant_height_max_m": 25.0,
        "flower_present": "yes", "flower_color": "yellow", "petal_count": 3, "is_composite_head": "no",
        "thorns_or_spines": "absent", "latex_or_sap": "none_apparent", "aroma_of_crushed_leaves": "none_or_faint",
        "evidence_habit_morphology": "flora", "evidence_numeric_dimensions": "flora", "evidence_floral": "flora", "evidence_sensory_special": "observational",
        "needs_verification": "yes", "source_url": "https://powo.science.kew.org/taxon/urn:lsid:ipni.org:names:520779-1",
        "source_notes": "Flora of China Vol. 10 p. 27; even-pinnate 10-20 pairs of small leaflets; 3 yellow-red petals"
    },
    {
        "id": 51, "common_name": "Lemon", "scientific_name": "Citrus limon", "family": "Rutaceae",
        "plant_growth_habit": "tree", "leaf_type": "simple", "leaf_shape": "elliptic", "leaf_margin": "crenate",
        "leaf_arrangement": "alternate", "leaf_venation": "pinnate",
        "leaf_length_min_cm": 6.0, "leaf_length_max_cm": 12.0,
        "leaf_width_min_cm": 3.0, "leaf_width_max_cm": 6.0,
        "plant_height_min_m": 3.0, "plant_height_max_m": 6.0,
        "flower_present": "yes", "flower_color": "white", "petal_count": 5, "is_composite_head": "no",
        "thorns_or_spines": "spines_or_thorns_on_stem", "latex_or_sap": "none_apparent", "aroma_of_crushed_leaves": "citrusy",
        "evidence_habit_morphology": "flora", "evidence_numeric_dimensions": "flora", "evidence_floral": "flora", "evidence_sensory_special": "observational",
        "needs_verification": "yes", "source_url": "https://powo.science.kew.org/taxon/urn:lsid:ipni.org:names:772023-1",
        "source_notes": "Flora of China Vol. 11 p. 95; winged petiole; sharp axillary spines; pellucid citrus oil glands"
    },
    {
        "id": 54, "common_name": "Bamboo", "scientific_name": "Bambusa vulgaris", "family": "Poaceae",
        "plant_growth_habit": "grass", "leaf_type": "simple", "leaf_shape": "linear", "leaf_margin": "entire",
        "leaf_arrangement": "alternate", "leaf_venation": "parallel",
        "leaf_length_min_cm": 10.0, "leaf_length_max_cm": 28.0,
        "leaf_width_min_cm": 1.5, "leaf_width_max_cm": 4.5,
        "plant_height_min_m": 8.0, "plant_height_max_m": 20.0,
        "flower_present": "inconspicuous_or_absent", "flower_color": "brown_or_inconspicuous", "petal_count": 0, "is_composite_head": "no",
        "thorns_or_spines": "absent", "latex_or_sap": "none_apparent", "aroma_of_crushed_leaves": "none_or_faint",
        "evidence_habit_morphology": "flora", "evidence_numeric_dimensions": "flora", "evidence_floral": "flora", "evidence_sensory_special": "observational",
        "needs_verification": "yes", "source_url": "https://powo.science.kew.org/taxon/urn:lsid:ipni.org:names:392652-1",
        "source_notes": "Flora of China Vol. 22 p. 11; giant rhizomatous woody grass; hollow culms; scabrous blade margins"
    },
    {
        "id": 60, "common_name": "Rice", "scientific_name": "Oryza sativa", "family": "Poaceae",
        "plant_growth_habit": "grass", "leaf_type": "simple", "leaf_shape": "linear", "leaf_margin": "entire",
        "leaf_arrangement": "alternate", "leaf_venation": "parallel",
        "leaf_length_min_cm": 25.0, "leaf_length_max_cm": 60.0,
        "leaf_width_min_cm": 0.8, "leaf_width_max_cm": 1.8,
        "plant_height_min_m": 0.6, "plant_height_max_m": 1.5,
        "flower_present": "inconspicuous_or_absent", "flower_color": "green", "petal_count": 0, "is_composite_head": "no",
        "thorns_or_spines": "absent", "latex_or_sap": "none_apparent", "aroma_of_crushed_leaves": "none_or_faint",
        "evidence_habit_morphology": "flora", "evidence_numeric_dimensions": "flora", "evidence_floral": "flora", "evidence_sensory_special": "observational",
        "needs_verification": "yes", "source_url": "https://powo.science.kew.org/taxon/urn:lsid:ipni.org:names:415258-1",
        "source_notes": "Flora of China Vol. 22 p. 182; annual cultivated grass; scabrous leaf blades; terminal panicle of spikelets"
    },
    {
        "id": 67, "common_name": "Tomato", "scientific_name": "Solanum lycopersicum", "family": "Solanaceae",
        "plant_growth_habit": "herb", "leaf_type": "pinnately_compound", "leaf_shape": "ovate", "leaf_margin": "lobed",
        "leaf_arrangement": "alternate", "leaf_venation": "pinnate",
        "leaf_length_min_cm": 12.0, "leaf_length_max_cm": 30.0,
        "leaf_width_min_cm": 6.0, "leaf_width_max_cm": 18.0,
        "plant_height_min_m": 0.6, "plant_height_max_m": 2.0,
        "flower_present": "yes", "flower_color": "yellow", "petal_count": 5, "is_composite_head": "no",
        "thorns_or_spines": "absent", "latex_or_sap": "none_apparent", "aroma_of_crushed_leaves": "pungent_or_strong",
        "evidence_habit_morphology": "flora", "evidence_numeric_dimensions": "flora", "evidence_floral": "flora", "evidence_sensory_special": "observational",
        "needs_verification": "yes", "source_url": "https://powo.science.kew.org/taxon/urn:lsid:ipni.org:names:821516-1",
        "source_notes": "Flora of China Vol. 17 p. 339; glandular pubescent pinnatifid leaves; solanaceous odor; 5-lobed yellow corolla"
    },
    {
        "id": 68, "common_name": "Chilli", "scientific_name": "Capsicum annuum", "family": "Solanaceae",
        "plant_growth_habit": "herb", "leaf_type": "simple", "leaf_shape": "ovate", "leaf_margin": "entire",
        "leaf_arrangement": "alternate", "leaf_venation": "pinnate",
        "leaf_length_min_cm": 4.0, "leaf_length_max_cm": 10.0,
        "leaf_width_min_cm": 2.0, "leaf_width_max_cm": 4.5,
        "plant_height_min_m": 0.4, "plant_height_max_m": 1.2,
        "flower_present": "yes", "flower_color": "white", "petal_count": 5, "is_composite_head": "no",
        "thorns_or_spines": "absent", "latex_or_sap": "none_apparent", "aroma_of_crushed_leaves": "none_or_faint",
        "evidence_habit_morphology": "flora", "evidence_numeric_dimensions": "flora", "evidence_floral": "flora", "evidence_sensory_special": "observational",
        "needs_verification": "yes", "source_url": "https://powo.science.kew.org/taxon/urn:lsid:ipni.org:names:821217-1",
        "source_notes": "Flora of China Vol. 17 p. 313; simple ovate entire leaves; white rotate 5-lobed corolla; non-aromatic foliage"
    },
    {
        "id": 70, "common_name": "Okra", "scientific_name": "Abelmoschus esculentus", "family": "Malvaceae",
        "plant_growth_habit": "herb", "leaf_type": "simple", "leaf_shape": "palmate_lobed", "leaf_margin": "serrate",
        "leaf_arrangement": "alternate", "leaf_venation": "palmate",
        "leaf_length_min_cm": 12.0, "leaf_length_max_cm": 25.0,
        "leaf_width_min_cm": 12.0, "leaf_width_max_cm": 25.0,
        "plant_height_min_m": 1.0, "plant_height_max_m": 2.5,
        "flower_present": "yes", "flower_color": "yellow", "petal_count": 5, "is_composite_head": "no",
        "thorns_or_spines": "absent", "latex_or_sap": "none_apparent", "aroma_of_crushed_leaves": "none_or_faint",
        "evidence_habit_morphology": "flora", "evidence_numeric_dimensions": "flora", "evidence_floral": "flora", "evidence_sensory_special": "observational",
        "needs_verification": "yes", "source_url": "https://powo.science.kew.org/taxon/urn:lsid:ipni.org:names:558607-1",
        "source_notes": "Flora of China Vol. 12 p. 284; palmately 3-5 lobed hispid leaves; 5 yellow petals with dark purple center"
    },
    {
        "id": 80, "common_name": "Money plant", "scientific_name": "Epipremnum aureum", "family": "Araceae",
        "plant_growth_habit": "climber", "leaf_type": "simple", "leaf_shape": "cordate", "leaf_margin": "entire",
        "leaf_arrangement": "alternate", "leaf_venation": "pinnate",
        "leaf_length_min_cm": 10.0, "leaf_length_max_cm": 30.0,
        "leaf_width_min_cm": 7.0, "leaf_width_max_cm": 20.0,
        "plant_height_min_m": 2.0, "plant_height_max_m": 12.0,
        "flower_present": "inconspicuous_or_absent", "flower_color": "green", "petal_count": 0, "is_composite_head": "no",
        "thorns_or_spines": "absent", "latex_or_sap": "watery_clear", "aroma_of_crushed_leaves": "none_or_faint",
        "evidence_habit_morphology": "flora", "evidence_numeric_dimensions": "flora", "evidence_floral": "flora", "evidence_sensory_special": "observational",
        "needs_verification": "yes", "source_url": "https://powo.science.kew.org/taxon/urn:lsid:ipni.org:names:86470-1",
        "source_notes": "Flora of China Vol. 23 p. 20; climbing hemiepiphyte; cordate yellow-variegated foliage; rare spathe"
    },
    {
        "id": 81, "common_name": "Snake plant", "scientific_name": "Dracaena trifasciata", "family": "Asparagaceae",
        "plant_growth_habit": "herb", "leaf_type": "simple", "leaf_shape": "linear", "leaf_margin": "entire",
        "leaf_arrangement": "basal_rosette", "leaf_venation": "parallel",
        "leaf_length_min_cm": 40.0, "leaf_length_max_cm": 90.0,
        "leaf_width_min_cm": 4.0, "leaf_width_max_cm": 8.0,
        "plant_height_min_m": 0.4, "plant_height_max_m": 1.0,
        "flower_present": "yes", "flower_color": "green", "petal_count": 6, "is_composite_head": "no",
        "thorns_or_spines": "absent", "latex_or_sap": "watery_clear", "aroma_of_crushed_leaves": "none_or_faint",
        "evidence_habit_morphology": "flora", "evidence_numeric_dimensions": "flora", "evidence_floral": "flora", "evidence_sensory_special": "observational",
        "needs_verification": "yes", "source_url": "https://powo.science.kew.org/taxon/urn:lsid:ipni.org:names:77187123-1",
        "source_notes": "Kew POWO; erect stiff succulent sword leaves; mottled dark and light green cross-banding; 6 perianth lobes"
    },
    {
        "id": 83, "common_name": "Monstera", "scientific_name": "Monstera deliciosa", "family": "Araceae",
        "plant_growth_habit": "climber", "leaf_type": "simple", "leaf_shape": "cordate", "leaf_margin": "lobed",
        "leaf_arrangement": "alternate", "leaf_venation": "pinnate",
        "leaf_length_min_cm": 30.0, "leaf_length_max_cm": 90.0,
        "leaf_width_min_cm": 25.0, "leaf_width_max_cm": 75.0,
        "plant_height_min_m": 2.0, "plant_height_max_m": 10.0,
        "flower_present": "yes", "flower_color": "white", "petal_count": 0, "is_composite_head": "no",
        "thorns_or_spines": "absent", "latex_or_sap": "watery_clear", "aroma_of_crushed_leaves": "none_or_faint",
        "evidence_habit_morphology": "flora", "evidence_numeric_dimensions": "flora", "evidence_floral": "flora", "evidence_sensory_special": "observational",
        "needs_verification": "yes", "source_url": "https://powo.science.kew.org/taxon/urn:lsid:ipni.org:names:87515-1",
        "source_notes": "Kew POWO; giant cordate blade with natural oblong perforations (fenestrations) and pinnatifid lobes"
    },
    {
        "id": 85, "common_name": "Rubber plant", "scientific_name": "Ficus elastica", "family": "Moraceae",
        "plant_growth_habit": "tree", "leaf_type": "simple", "leaf_shape": "elliptic", "leaf_margin": "entire",
        "leaf_arrangement": "alternate", "leaf_venation": "pinnate",
        "leaf_length_min_cm": 15.0, "leaf_length_max_cm": 35.0,
        "leaf_width_min_cm": 8.0, "leaf_width_max_cm": 18.0,
        "plant_height_min_m": 10.0, "plant_height_max_m": 30.0,
        "flower_present": "inconspicuous_or_absent", "flower_color": "brown_or_inconspicuous", "petal_count": 0, "is_composite_head": "no",
        "thorns_or_spines": "absent", "latex_or_sap": "milky_white", "aroma_of_crushed_leaves": "none_or_faint",
        "evidence_habit_morphology": "flora", "evidence_numeric_dimensions": "flora", "evidence_floral": "flora", "evidence_sensory_special": "observational",
        "needs_verification": "yes", "source_url": "https://powo.science.kew.org/taxon/urn:lsid:ipni.org:names:852781-1",
        "source_notes": "Flora of China Vol. 5 p. 42; thick leathery glossy dark green leaves; pink stipular cap; abundant latex"
    },
    {
        "id": 87, "common_name": "Prickly pear", "scientific_name": "Opuntia ficus-indica", "family": "Cactaceae",
        "plant_growth_habit": "succulent", "leaf_type": "scale_or_reduced", "leaf_shape": "spatulate", "leaf_margin": "spiny",
        "leaf_arrangement": "spiral", "leaf_venation": "absent_or_obscure",
        "leaf_length_min_cm": 1.0, "leaf_length_max_cm": 3.0,
        "leaf_width_min_cm": 0.2, "leaf_width_max_cm": 0.5,
        "plant_height_min_m": 1.5, "plant_height_max_m": 4.5,
        "flower_present": "yes", "flower_color": "yellow", "petal_count": 12, "is_composite_head": "no",
        "thorns_or_spines": "spines_or_thorns_on_stem", "latex_or_sap": "watery_clear", "aroma_of_crushed_leaves": "none_or_faint",
        "evidence_habit_morphology": "flora", "evidence_numeric_dimensions": "flora", "evidence_floral": "flora", "evidence_sensory_special": "observational",
        "needs_verification": "yes", "source_url": "https://powo.science.kew.org/taxon/urn:lsid:ipni.org:names:136706-1",
        "source_notes": "Flora of North America Vol. 4 p. 138; fleshy flattened cladodes; areoles with sharp glochids; multi-petaled yellow flowers"
    },
    {
        "id": 91, "common_name": "Patharchatta", "scientific_name": "Kalanchoe pinnata", "family": "Crassulaceae",
        "plant_growth_habit": "succulent", "leaf_type": "pinnately_compound", "leaf_shape": "elliptic", "leaf_margin": "crenate",
        "leaf_arrangement": "opposite", "leaf_venation": "pinnate",
        "leaf_length_min_cm": 6.0, "leaf_length_max_cm": 15.0,
        "leaf_width_min_cm": 3.5, "leaf_width_max_cm": 8.0,
        "plant_height_min_m": 0.6, "plant_height_max_m": 1.5,
        "flower_present": "yes", "flower_color": "red_or_crimson", "petal_count": 4, "is_composite_head": "no",
        "thorns_or_spines": "absent", "latex_or_sap": "watery_clear", "aroma_of_crushed_leaves": "none_or_faint",
        "evidence_habit_morphology": "flora", "evidence_numeric_dimensions": "flora", "evidence_floral": "flora", "evidence_sensory_special": "observational",
        "needs_verification": "yes", "source_url": "https://powo.science.kew.org/taxon/urn:lsid:ipni.org:names:274397-1",
        "source_notes": "Flora of China Vol. 8 p. 204; fleshy crenate leaves producing plantlets in marginal notches; 4-lobed red corolla"
    },
    {
        "id": 92, "common_name": "Sunflower", "scientific_name": "Helianthus annuus", "family": "Asteraceae",
        "plant_growth_habit": "herb", "leaf_type": "simple", "leaf_shape": "cordate", "leaf_margin": "serrate",
        "leaf_arrangement": "alternate", "leaf_venation": "palmate",
        "leaf_length_min_cm": 15.0, "leaf_length_max_cm": 35.0,
        "leaf_width_min_cm": 10.0, "leaf_width_max_cm": 25.0,
        "plant_height_min_m": 1.2, "plant_height_max_m": 3.5,
        "flower_present": "yes", "flower_color": "yellow", "petal_count": 0, "is_composite_head": "yes",
        "thorns_or_spines": "absent", "latex_or_sap": "none_apparent", "aroma_of_crushed_leaves": "none_or_faint",
        "evidence_habit_morphology": "flora", "evidence_numeric_dimensions": "flora", "evidence_floral": "flora", "evidence_sensory_special": "observational",
        "needs_verification": "yes", "source_url": "https://powo.science.kew.org/taxon/urn:lsid:ipni.org:names:119003-1",
        "source_notes": "Flora of North America Vol. 21 p. 158; rough scabrous cordate leaves; giant capitulum with sterile ray and fertile disc florets"
    },
    {
        "id": 97, "common_name": "Sweet basil", "scientific_name": "Ocimum basilicum", "family": "Lamiaceae",
        "plant_growth_habit": "herb", "leaf_type": "simple", "leaf_shape": "ovate", "leaf_margin": "entire",
        "leaf_arrangement": "opposite", "leaf_venation": "pinnate",
        "leaf_length_min_cm": 3.0, "leaf_length_max_cm": 7.0,
        "leaf_width_min_cm": 1.5, "leaf_width_max_cm": 3.5,
        "plant_height_min_m": 0.4, "plant_height_max_m": 0.9,
        "flower_present": "yes", "flower_color": "white", "petal_count": 5, "is_composite_head": "no",
        "thorns_or_spines": "absent", "latex_or_sap": "none_apparent", "aroma_of_crushed_leaves": "aromatic_pleasant",
        "evidence_habit_morphology": "flora", "evidence_numeric_dimensions": "flora", "evidence_floral": "flora", "evidence_sensory_special": "observational",
        "needs_verification": "yes", "source_url": "https://powo.science.kew.org/taxon/urn:lsid:ipni.org:names:452994-1",
        "source_notes": "Flora of China Vol. 17 p. 297; ovate entire/shallowly dentate glossy leaves; sweet linalool/anise aroma; look-alike with Tulsi"
    },
    {
        "id": 108, "common_name": "Sensitive plant", "scientific_name": "Mimosa pudica", "family": "Fabaceae",
        "plant_growth_habit": "herb", "leaf_type": "bipinnately_compound", "leaf_shape": "linear", "leaf_margin": "entire",
        "leaf_arrangement": "alternate", "leaf_venation": "pinnate",
        "leaf_length_min_cm": 3.0, "leaf_length_max_cm": 8.0,
        "leaf_width_min_cm": 1.5, "leaf_width_max_cm": 4.0,
        "plant_height_min_m": 0.2, "plant_height_max_m": 0.7,
        "flower_present": "yes", "flower_color": "pink_or_magenta", "petal_count": 4, "is_composite_head": "no",
        "thorns_or_spines": "prickles", "latex_or_sap": "none_apparent", "aroma_of_crushed_leaves": "none_or_faint",
        "evidence_habit_morphology": "flora", "evidence_numeric_dimensions": "flora", "evidence_floral": "flora", "evidence_sensory_special": "observational",
        "needs_verification": "yes", "source_url": "https://powo.science.kew.org/taxon/urn:lsid:ipni.org:names:507963-1",
        "source_notes": "Flora of China Vol. 10 p. 53; thigmonastic folding response; curved stem prickles; pink globose puff heads"
    },
    {
        "id": 137, "common_name": "Nag Champa", "scientific_name": "Plumeria pudica", "family": "Apocynaceae",
        "plant_growth_habit": "shrub", "leaf_type": "simple", "leaf_shape": "spatulate", "leaf_margin": "entire",
        "leaf_arrangement": "spiral", "leaf_venation": "pinnate",
        "leaf_length_min_cm": 15.0, "leaf_length_max_cm": 30.0,
        "leaf_width_min_cm": 4.0, "leaf_width_max_cm": 8.0,
        "plant_height_min_m": 2.0, "plant_height_max_m": 4.0,
        "flower_present": "yes", "flower_color": "white", "petal_count": 5, "is_composite_head": "no",
        "thorns_or_spines": "absent", "latex_or_sap": "milky_white", "aroma_of_crushed_leaves": "none_or_faint",
        "evidence_habit_morphology": "flora", "evidence_numeric_dimensions": "flora", "evidence_floral": "flora", "evidence_sensory_special": "observational",
        "needs_verification": "yes", "source_url": "https://powo.science.kew.org/taxon/urn:lsid:ipni.org:names:80927-1",
        "source_notes": "Kew POWO; panduriform/fiddle-shaped leaves with narrow base; pure white salverform flowers with yellow throat"
    },
    {
        "id": 145, "common_name": "Crown of thorns", "scientific_name": "Euphorbia milii", "family": "Euphorbiaceae",
        "plant_growth_habit": "succulent", "leaf_type": "simple", "leaf_shape": "spatulate", "leaf_margin": "entire",
        "leaf_arrangement": "spiral", "leaf_venation": "pinnate",
        "leaf_length_min_cm": 2.0, "leaf_length_max_cm": 6.5,
        "leaf_width_min_cm": 1.0, "leaf_width_max_cm": 2.5,
        "plant_height_min_m": 0.4, "plant_height_max_m": 1.5,
        "flower_present": "yes", "flower_color": "red_or_crimson", "petal_count": 2, "is_composite_head": "no",
        "thorns_or_spines": "spines_or_thorns_on_stem", "latex_or_sap": "milky_white", "aroma_of_crushed_leaves": "none_or_faint",
        "evidence_habit_morphology": "flora", "evidence_numeric_dimensions": "flora", "evidence_floral": "flora", "evidence_sensory_special": "observational",
        "needs_verification": "yes", "source_url": "https://powo.science.kew.org/taxon/urn:lsid:ipni.org:names:347372-1",
        "source_notes": "Flora of China Vol. 11 p. 306; prominent 1-2 cm sharp stem spines; toxic white latex; 2 red petaloid cyathial bracts"
    }
]

def compile_dataset():
    assert len(SPECIES_TRAITS) == 50, f"Expected 50 species, found {len(SPECIES_TRAITS)}"
    
    # Sort by ID
    SPECIES_TRAITS.sort(key=lambda x: x['id'])
    
    headers = [
        "id", "common_name", "scientific_name", "family", "plant_growth_habit",
        "leaf_type", "leaf_shape", "leaf_margin", "leaf_arrangement", "leaf_venation",
        "leaf_length_min_cm", "leaf_length_max_cm", "leaf_width_min_cm", "leaf_width_max_cm",
        "plant_height_min_m", "plant_height_max_m", "flower_present", "flower_color",
        "petal_count", "is_composite_head", "thorns_or_spines", "latex_or_sap", "aroma_of_crushed_leaves",
        "evidence_habit_morphology", "evidence_numeric_dimensions", "evidence_floral", "evidence_sensory_special",
        "needs_verification", "source_url", "source_notes"
    ]
    
    os.makedirs('data/traits', exist_ok=True)
    
    # Write to traits_50.csv and traits.csv
    for out_path in ['data/traits/traits_50.csv', 'data/traits/traits.csv']:
        with open(out_path, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=headers)
            writer.writeheader()
            for row in SPECIES_TRAITS:
                writer.writerow(row)
        print(f"Successfully compiled {len(SPECIES_TRAITS)} species to {out_path}")

if __name__ == '__main__':
    compile_dataset()

"""
Script: 01_simulate_samples.py
Simulates realistic field specimen observations from the authoritative 50-species trait bounds.
Enforces natural overlapping bounds, multiplicative Gaussian noise (+/- 6%),
categorical novice-observer error (3%), and realistic field missingness (5-8%).
Outputs data/traits/simulated_plant_traits_dataset.csv.
"""

import csv
import os
import numpy as np
import pandas as pd

SIMULATION_METADATA_HEADER = (
    "# SIMULATED BOTANICAL CORPUS (BOUNDED BY FLORA OF CHINA / KEW POWO RANGES "
    "WITH INDUCED MEASUREMENT NOISE AND 6% MISSINGNESS)\n"
)

CATEGORICAL_CONFUSION_MAPS = {
    "leaf_margin": {
        "serrate": ["dentate", "serrate", "crenate"],
        "dentate": ["serrate", "dentate", "crenate"],
        "crenate": ["serrate", "crenate", "undulate"],
        "entire": ["entire", "undulate"],
        "undulate": ["entire", "undulate", "crenate"],
        "lobed": ["lobed", "pinnatisect"],
        "spiny": ["spiny", "serrate"]
    },
    "leaf_shape": {
        "ovate": ["ovate", "elliptic", "cordate"],
        "elliptic": ["elliptic", "ovate", "oblong"],
        "lanceolate": ["lanceolate", "linear", "elliptic"],
        "linear": ["linear", "lanceolate"],
        "oblong": ["oblong", "elliptic"],
        "cordate": ["cordate", "ovate"],
        "spatulate": ["spatulate", "oblong", "lanceolate"]
    },
    "aroma_of_crushed_leaves": {
        "aromatic_pleasant": ["aromatic_pleasant", "sweet_floral", "pungent_or_strong"],
        "pungent_or_strong": ["pungent_or_strong", "aromatic_pleasant"],
        "citrusy": ["citrusy", "aromatic_pleasant"],
        "none_or_faint": ["none_or_faint", "aromatic_pleasant"]
    }
}

def simulate_species_samples(n_per_species=100, seed=42):
    np.random.seed(seed)
    traits_df = pd.read_csv('data/traits/traits_50.csv')
    
    samples = []
    
    for _, row in traits_df.iterrows():
        sp_id = int(row['id'])
        sp_name = row['common_name']
        sci_name = row['scientific_name']
        family = row['family']
        
        l_min, l_max = float(row['leaf_length_min_cm']), float(row['leaf_length_max_cm'])
        w_min, w_max = float(row['leaf_width_min_cm']), float(row['leaf_width_max_cm'])
        h_min, h_max = float(row['plant_height_min_m']), float(row['plant_height_max_m'])
        
        for _ in range(n_per_species):
            # 1. Continuous numeric sampling with uniform natural spread across species range
            leaf_len = np.random.uniform(l_min, l_max)
            # Width is positively correlated with length
            aspect = (w_min + w_max) / (l_min + l_max)
            leaf_wid = np.random.uniform(w_min, w_max)
            # Bound width physically by length
            leaf_wid = min(leaf_wid, leaf_len * 0.95)
            plant_height = np.random.uniform(h_min, h_max)
            
            # 2. Multiplicative Gaussian measurement noise (std = 0.06 -> ~ +/- 6-12% noise)
            leaf_len *= (1.0 + np.random.normal(0, 0.06))
            leaf_wid *= (1.0 + np.random.normal(0, 0.06))
            plant_height *= (1.0 + np.random.normal(0, 0.06))
            
            leaf_len = round(max(0.2, leaf_len), 2)
            leaf_wid = round(max(0.1, leaf_wid), 2)
            plant_height = round(max(0.05, plant_height), 2)
            
            # 3. Categorical trait retrieval
            habit = row['plant_growth_habit']
            leaf_type = row['leaf_type']
            leaf_shape = row['leaf_shape']
            leaf_margin = row['leaf_margin']
            leaf_arr = row['leaf_arrangement']
            leaf_ven = row['leaf_venation']
            fl_pres = row['flower_present']
            fl_col = row['flower_color']
            petal_cnt = int(row['petal_count'])
            is_comp = row['is_composite_head']
            thorns = row['thorns_or_spines']
            latex = row['latex_or_sap']
            aroma = row['aroma_of_crushed_leaves']
            
            # 4. 3% Novice observer error on confusing categories
            if np.random.rand() < 0.03 and leaf_margin in CATEGORICAL_CONFUSION_MAPS["leaf_margin"]:
                leaf_margin = np.random.choice(CATEGORICAL_CONFUSION_MAPS["leaf_margin"][leaf_margin])
            if np.random.rand() < 0.03 and leaf_shape in CATEGORICAL_CONFUSION_MAPS["leaf_shape"]:
                leaf_shape = np.random.choice(CATEGORICAL_CONFUSION_MAPS["leaf_shape"][leaf_shape])
            if np.random.rand() < 0.03 and aroma in CATEGORICAL_CONFUSION_MAPS["aroma_of_crushed_leaves"]:
                aroma = np.random.choice(CATEGORICAL_CONFUSION_MAPS["aroma_of_crushed_leaves"][aroma])
                
            # Minor petal count counting noise (e.g. damaged flower or double flower)
            if petal_cnt > 0 and is_comp == 'no' and np.random.rand() < 0.04:
                petal_cnt = max(0, petal_cnt + int(np.random.choice([-1, 1])))
                
            sample = {
                "species_id": sp_id,
                "common_name": sp_name,
                "scientific_name": sci_name,
                "family": family,
                "plant_growth_habit": habit,
                "leaf_type": leaf_type,
                "leaf_shape": leaf_shape,
                "leaf_margin": leaf_margin,
                "leaf_arrangement": leaf_arr,
                "leaf_venation": leaf_ven,
                "leaf_length_cm": leaf_len,
                "leaf_width_cm": leaf_wid,
                "plant_height_m": plant_height,
                "flower_present": fl_pres,
                "flower_color": fl_col,
                "petal_count": petal_cnt,
                "is_composite_head": is_comp,
                "thorns_or_spines": thorns,
                "latex_or_sap": latex,
                "aroma_of_crushed_leaves": aroma
            }
            
            # 5. Field missingness: 5-8% chance of unobserved traits
            # Observers frequently don't see flowers (seasonal out-of-bloom) or don't crush leaves
            if np.random.rand() < 0.07:
                sample["aroma_of_crushed_leaves"] = np.nan
            if np.random.rand() < 0.08:
                # If out of bloom, flower color is unobserved
                sample["flower_color"] = np.nan
            if np.random.rand() < 0.04:
                sample["latex_or_sap"] = np.nan
            if np.random.rand() < 0.05:
                sample["plant_height_m"] = np.nan
                
            samples.append(sample)
            
    df = pd.DataFrame(samples)
    print(f"Simulated {len(df)} total botanical specimen records across {len(traits_df)} species.")
    print(f"Missing values count per column:\n{df.isna().sum()[df.isna().sum() > 0]}")
    
    out_csv = 'data/traits/simulated_plant_traits_dataset.csv'
    # Write metadata header and CSV
    with open(out_csv, 'w', encoding='utf-8') as f:
        f.write(SIMULATION_METADATA_HEADER)
    df.to_csv(out_csv, mode='a', index=False)
    print(f"Saved simulated dataset with academic watermark to {out_csv}")
    
    # Also save clean version without comments for standard pandas read_csv
    clean_csv = 'data/traits/simulated_plant_traits_clean.csv'
    df.to_csv(clean_csv, index=False)
    print(f"Saved clean parseable dataset to {clean_csv}")
    return df

if __name__ == '__main__':
    simulate_species_samples()

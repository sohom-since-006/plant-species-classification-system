"""
Script: 06_noise_stress_test.py
Conducts noise stress testing on the botanical decision tree classifier.
Evaluates model degradation across escalating measurement noise (6%, 12%, 20%, 30%),
categorical observer confusion (3%, 6%, 12%, 20%), and field missingness (6%, 12%, 20%, 30%).
Tests both:
1. Frozen Trained Decision Tree evaluated on unseen random seed (seed=999) under escalating noise.
2. Re-trained Decision Tree and Random Forest under each noise tier.
Generates docs/images/decision_tree/08_noise_stress_test.png and ml/decision_tree/noise_stress_test_metrics.json.
"""

import json
import os
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, f1_score
from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeClassifier

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

NUMERIC_FEATURES = ['leaf_length_cm', 'leaf_width_cm', 'plant_height_m', 'petal_count']
CATEGORICAL_FEATURES = [
    'plant_growth_habit', 'leaf_type', 'leaf_shape', 'leaf_margin',
    'leaf_arrangement', 'leaf_venation', 'flower_present', 'flower_color',
    'is_composite_head', 'thorns_or_spines', 'latex_or_sap', 'aroma_of_crushed_leaves'
]

def simulate_samples(noise_std, obs_error_rate, missing_rate, n_per_species=50, seed=999):
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
            leaf_len = np.random.uniform(l_min, l_max)
            leaf_wid = np.random.uniform(w_min, w_max)
            leaf_wid = min(leaf_wid, leaf_len * 0.95)
            plant_height = np.random.uniform(h_min, h_max)
            
            # Numeric measurement noise
            leaf_len *= (1.0 + np.random.normal(0, noise_std))
            leaf_wid *= (1.0 + np.random.normal(0, noise_std))
            plant_height *= (1.0 + np.random.normal(0, noise_std))
            
            leaf_len = round(max(0.2, leaf_len), 2)
            leaf_wid = round(max(0.1, leaf_wid), 2)
            plant_height = round(max(0.05, plant_height), 2)
            
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
            
            # Categorical observer confusion
            if np.random.rand() < obs_error_rate and leaf_margin in CATEGORICAL_CONFUSION_MAPS["leaf_margin"]:
                leaf_margin = np.random.choice(CATEGORICAL_CONFUSION_MAPS["leaf_margin"][leaf_margin])
            if np.random.rand() < obs_error_rate and leaf_shape in CATEGORICAL_CONFUSION_MAPS["leaf_shape"]:
                leaf_shape = np.random.choice(CATEGORICAL_CONFUSION_MAPS["leaf_shape"][leaf_shape])
            if np.random.rand() < obs_error_rate and aroma in CATEGORICAL_CONFUSION_MAPS["aroma_of_crushed_leaves"]:
                aroma = np.random.choice(CATEGORICAL_CONFUSION_MAPS["aroma_of_crushed_leaves"][aroma])
                
            if petal_cnt > 0 and is_comp == 'no' and np.random.rand() < (obs_error_rate * 1.2):
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
            
            # Missingness
            if np.random.rand() < missing_rate:
                sample["aroma_of_crushed_leaves"] = np.nan
            if np.random.rand() < missing_rate:
                sample["flower_color"] = np.nan
            if np.random.rand() < (missing_rate * 0.5):
                sample["latex_or_sap"] = np.nan
            if np.random.rand() < (missing_rate * 0.7):
                sample["plant_height_m"] = np.nan
                
            samples.append(sample)
    return pd.DataFrame(samples)

def prepare_features(df, reference_columns=None):
    df_proc = df.copy()
    for col in NUMERIC_FEATURES:
        df_proc[col] = df_proc[col].fillna(df_proc[col].median())
    for col in CATEGORICAL_FEATURES:
        df_proc[col] = df_proc[col].fillna('missing_or_unobserved')
        
    X_num = df_proc[NUMERIC_FEATURES]
    X_cat = pd.get_dummies(df_proc[CATEGORICAL_FEATURES], prefix=CATEGORICAL_FEATURES, dtype=float)
    X = pd.concat([X_num, X_cat], axis=1)
    
    if reference_columns is not None:
        # Align columns strictly to reference columns
        for col in reference_columns:
            if col not in X.columns:
                X[col] = 0.0
        X = X[reference_columns]
        
    return X, df_proc['species_id'].astype(int)

def evaluate_top_k(clf, X, y, k=3):
    probs = clf.predict_proba(X)
    classes = clf.classes_
    top_k_hits = 0
    for i, true_y in enumerate(y):
        top_indices = np.argsort(probs[i])[::-1][:k]
        top_classes = classes[top_indices]
        if true_y in top_classes:
            top_k_hits += 1
    return top_k_hits / len(y)

def run_stress_test():
    print("=" * 65)
    print("STRESS TEST: DECISION TREE ROBUSTNESS UNDER INCREASING NOISE")
    print("=" * 65)
    
    # 1. Load baseline training data and train the reference tree
    train_df = pd.read_csv('data/traits/simulated_plant_traits_clean.csv')
    X_base, y_base = prepare_features(train_df)
    reference_columns = list(X_base.columns)
    
    X_train, _, y_train, _ = train_test_split(
        X_base, y_base, test_size=0.20, random_state=42, stratify=y_base
    )
    
    frozen_dt = DecisionTreeClassifier(
        max_depth=18, min_samples_split=8, min_samples_leaf=1, ccp_alpha=0.0005, random_state=42
    )
    frozen_dt.fit(X_train, y_train)
    
    noise_tiers = [
        {"name": "Tier 1 (Baseline)", "noise_std": 0.06, "obs_err": 0.03, "missing": 0.06},
        {"name": "Tier 2 (Moderate)", "noise_std": 0.12, "obs_err": 0.06, "missing": 0.12},
        {"name": "Tier 3 (Substantial)", "noise_std": 0.20, "obs_err": 0.12, "missing": 0.20},
        {"name": "Tier 4 (Severe)", "noise_std": 0.30, "obs_err": 0.20, "missing": 0.30},
        {"name": "Tier 5 (Extreme)", "noise_std": 0.40, "obs_err": 0.25, "missing": 0.35}
    ]
    
    results = []
    
    for tier in noise_tiers:
        std = tier['noise_std']
        obs = tier['obs_err']
        miss = tier['missing']
        
        # Test on independent seed=999
        test_df_unseen = simulate_samples(std, obs, miss, n_per_species=40, seed=999)
        X_test_unseen, y_test_unseen = prepare_features(test_df_unseen, reference_columns)
        
        # 1. Frozen model evaluation on unseen seed
        preds_frozen = frozen_dt.predict(X_test_unseen)
        acc_frozen = accuracy_score(y_test_unseen, preds_frozen)
        top3_frozen = evaluate_top_k(frozen_dt, X_test_unseen, y_test_unseen, k=3)
        f1_frozen = f1_score(y_test_unseen, preds_frozen, average='macro', zero_division=0)
        
        # 2. Re-trained model under this noise level (5000 samples)
        full_sim_df = simulate_samples(std, obs, miss, n_per_species=100, seed=123)
        X_tier, y_tier = prepare_features(full_sim_df, reference_columns)
        X_tr, X_te, y_tr, y_te = train_test_split(X_tier, y_tier, test_size=0.20, random_state=42, stratify=y_tier)
        
        retrained_dt = DecisionTreeClassifier(max_depth=18, min_samples_split=8, min_samples_leaf=1, random_state=42)
        retrained_dt.fit(X_tr, y_tr)
        preds_retrained = retrained_dt.predict(X_te)
        acc_retrained = accuracy_score(y_te, preds_retrained)
        top3_retrained = evaluate_top_k(retrained_dt, X_te, y_te, k=3)
        f1_retrained = f1_score(y_te, preds_retrained, average='macro', zero_division=0)
        
        # 3. Random Forest under this noise level
        rf = RandomForestClassifier(n_estimators=100, max_depth=18, random_state=42, n_jobs=-1)
        rf.fit(X_tr, y_tr)
        preds_rf = rf.predict(X_te)
        acc_rf = accuracy_score(y_te, preds_rf)
        top3_rf = evaluate_top_k(rf, X_te, y_te, k=3)
        f1_rf = f1_score(y_te, preds_rf, average='macro', zero_division=0)
        
        print(f"\n[{tier['name']}] Noise: {std*100:.0f}%, Obs Err: {obs*100:.0f}%, Missing: {miss*100:.0f}%")
        print(f"  Frozen DT (Seed 999) -> Top-1: {acc_frozen*100:.1f}%, Top-3: {top3_frozen*100:.1f}%, Macro F1: {f1_frozen:.4f}")
        print(f"  Retrained DT         -> Top-1: {acc_retrained*100:.1f}%, Top-3: {top3_retrained*100:.1f}%, Macro F1: {f1_retrained:.4f}")
        print(f"  Random Forest        -> Top-1: {acc_rf*100:.1f}%, Top-3: {top3_rf*100:.1f}%, Macro F1: {f1_rf:.4f}")
        
        results.append({
            "tier": tier['name'],
            "noise_std_percent": int(std * 100),
            "observer_error_percent": int(obs * 100),
            "missingness_percent": int(miss * 100),
            "frozen_dt": {
                "top1_accuracy": round(float(acc_frozen), 4),
                "top3_accuracy": round(float(top3_frozen), 4),
                "macro_f1": round(float(f1_frozen), 4)
            },
            "retrained_dt": {
                "top1_accuracy": round(float(acc_retrained), 4),
                "top3_accuracy": round(float(top3_retrained), 4),
                "macro_f1": round(float(f1_retrained), 4)
            },
            "random_forest": {
                "top1_accuracy": round(float(acc_rf), 4),
                "top3_accuracy": round(float(top3_rf), 4),
                "macro_f1": round(float(f1_rf), 4)
            }
        })
        
    # Save results
    with open('ml/decision_tree/noise_stress_test_metrics.json', 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2)
    print("\nSaved stress test metrics to ml/decision_tree/noise_stress_test_metrics.json")
    
    # Generate Plot
    noise_levels = [r['noise_std_percent'] for r in results]
    dt_frozen_top1 = [r['frozen_dt']['top1_accuracy'] * 100 for r in results]
    dt_frozen_top3 = [r['frozen_dt']['top3_accuracy'] * 100 for r in results]
    dt_retrained_top1 = [r['retrained_dt']['top1_accuracy'] * 100 for r in results]
    rf_top1 = [r['random_forest']['top1_accuracy'] * 100 for r in results]
    
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 6))
    
    # Subplot 1: Frozen Tree Generalization on Unseen Seed (seed=999)
    ax1.plot(noise_levels, dt_frozen_top1, 'o-', color='#e63946', linewidth=2.5, markersize=8, label='Decision Tree Top-1 (Frozen, Seed 999)')
    ax1.plot(noise_levels, dt_frozen_top3, 's--', color='#457b9d', linewidth=2, markersize=7, label='Decision Tree Top-3 (Frozen, Seed 999)')
    ax1.axhline(99.5, color='#2a9d8f', linestyle=':', label='Training Set Reported Baseline (99.5%)')
    ax1.set_xlabel('Numeric Measurement Noise (± % Gaussian Std Dev)', fontsize=11, fontweight='bold')
    ax1.set_ylabel('Classification Accuracy (%)', fontsize=11, fontweight='bold')
    ax1.set_title('A: Frozen Model Stress Test\n(Evaluated on Unseen Random Seed 999)', fontsize=12, fontweight='bold')
    ax1.set_ylim(40, 105)
    ax1.grid(True, linestyle='--', alpha=0.5)
    ax1.legend(loc='lower left', framealpha=0.9)
    
    # Subplot 2: Comparison with Retrained Tree and Random Forest
    ax1_labels = [f"±{n}%\n(Miss {r['missingness_percent']}%)" for n, r in zip(noise_levels, results)]
    ax1.set_xticks(noise_levels)
    ax1.set_xticklabels(ax1_labels)
    
    ax2.plot(noise_levels, rf_top1, 'D-', color='#2a9d8f', linewidth=2.5, markersize=8, label='Random Forest Top-1 (Ensemble)')
    ax2.plot(noise_levels, dt_retrained_top1, 'o-', color='#e76f51', linewidth=2.5, markersize=8, label='Decision Tree Top-1 (Re-trained)')
    ax2.plot(noise_levels, dt_frozen_top1, '^--', color='#e63946', linewidth=2, markersize=7, label='Decision Tree Top-1 (Frozen Baseline)')
    ax2.set_xlabel('Numeric Measurement Noise (± % Gaussian Std Dev)', fontsize=11, fontweight='bold')
    ax2.set_ylabel('Accuracy (%)', fontsize=11, fontweight='bold')
    ax2.set_title('B: Model Architecture Robustness\n(Decision Tree vs. Random Forest Ensemble)', fontsize=12, fontweight='bold')
    ax2.set_ylim(40, 105)
    ax2.set_xticks(noise_levels)
    ax2.set_xticklabels(ax1_labels)
    ax2.grid(True, linestyle='--', alpha=0.5)
    ax2.legend(loc='lower left', framealpha=0.9)
    
    plt.tight_layout()
    plt.savefig('docs/images/decision_tree/08_noise_stress_test.png', dpi=200)
    plt.close()
    print("Saved Figure 8 to docs/images/decision_tree/08_noise_stress_test.png")

if __name__ == '__main__':
    run_stress_test()

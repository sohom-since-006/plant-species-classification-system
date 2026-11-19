"""
Script: 07_uci_leaves_experiment.py
Runs the real-data benchmark experiment on the official UCI "One-Hundred Plant Species Leaves" dataset (UCI ID 241).
Combines Shape (64), Texture (64), and Margin (64) descriptors (192 continuous features across 1,599 specimens / 100 species).
Evaluates Decision Tree vs. Random Forest with Stratified 5-Fold Cross-Validation.
Computes Accuracy, Macro Precision, Macro Recall, Macro F1, and saves a Confusion Matrix plot.
"""

import json
import os
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score, confusion_matrix, f1_score, precision_score, recall_score
)
from sklearn.model_selection import StratifiedKFold, cross_val_predict
from sklearn.tree import DecisionTreeClassifier

DATA_DIR = 'data/uci_leaves/100 leaves plant species'

def load_uci_leaves():
    sha_path = os.path.join(DATA_DIR, 'data_Sha_64.txt')
    tex_path = os.path.join(DATA_DIR, 'data_Tex_64.txt')
    mar_path = os.path.join(DATA_DIR, 'data_Mar_64.txt')
    
    # Read files
    df_sha = pd.read_csv(sha_path, header=None)
    df_tex = pd.read_csv(tex_path, header=None)
    df_mar = pd.read_csv(mar_path, header=None)
    
    # Sort deterministically by species name
    df_sha_sorted = df_sha.sort_values(by=[0]).reset_index(drop=True)
    df_mar_sorted = df_mar.sort_values(by=[0]).reset_index(drop=True)
    df_tex_sorted = df_tex.sort_values(by=[0]).reset_index(drop=True)
    
    # Assign specimen index within each species (0..15, or 0..14 for Acer Campestre in Tex)
    df_sha_sorted['specimen_id'] = df_sha_sorted.groupby(0).cumcount()
    df_mar_sorted['specimen_id'] = df_mar_sorted.groupby(0).cumcount()
    df_tex_sorted['specimen_id'] = df_tex_sorted.groupby(0).cumcount()
    
    # Inner join on (species, specimen_id) to align all 3 modalities
    merged = df_sha_sorted.merge(df_mar_sorted, on=[0, 'specimen_id'], suffixes=('_sha', '_mar'))
    merged = merged.merge(df_tex_sorted, on=[0, 'specimen_id'])
    
    labels = merged[0].values
    X = merged.drop(columns=[0, 'specimen_id']).values
    
    print(f"Loaded UCI 241 dataset: {X.shape[0]} samples, {X.shape[1]} features (64 Shape + 64 Margin + 64 Texture), {len(np.unique(labels))} unique species.")
    return X, labels

def run_experiment():
    os.makedirs('docs/images/decision_tree', exist_ok=True)
    os.makedirs('ml/decision_tree', exist_ok=True)
    
    X, y = load_uci_leaves()
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    
    # 1. Decision Tree (tuned max_depth and min_samples_leaf)
    dt = DecisionTreeClassifier(max_depth=16, min_samples_split=4, min_samples_leaf=2, random_state=42)
    dt_preds = cross_val_predict(dt, X, y, cv=cv)
    
    dt_acc = accuracy_score(y, dt_preds)
    dt_prec = precision_score(y, dt_preds, average='macro', zero_division=0)
    dt_rec = recall_score(y, dt_preds, average='macro', zero_division=0)
    dt_f1 = f1_score(y, dt_preds, average='macro', zero_division=0)
    
    print("\n--- UCI REAL-DATA BENCHMARK: DECISION TREE ---")
    print(f"Stratified 5-Fold CV Accuracy:  {dt_acc * 100:.2f}%")
    print(f"Macro Precision:                {dt_prec:.4f}")
    print(f"Macro Recall:                   {dt_rec:.4f}")
    print(f"Macro F1-Score:                 {dt_f1:.4f}")
    
    # 2. Random Forest Baseline
    rf = RandomForestClassifier(n_estimators=100, max_depth=18, random_state=42, n_jobs=-1)
    rf_preds = cross_val_predict(rf, X, y, cv=cv)
    
    rf_acc = accuracy_score(y, rf_preds)
    rf_prec = precision_score(y, rf_preds, average='macro', zero_division=0)
    rf_rec = recall_score(y, rf_preds, average='macro', zero_division=0)
    rf_f1 = f1_score(y, rf_preds, average='macro', zero_division=0)
    
    print("\n--- UCI REAL-DATA BENCHMARK: RANDOM FOREST ---")
    print(f"Stratified 5-Fold CV Accuracy:  {rf_acc * 100:.2f}%")
    print(f"Macro Precision:                {rf_prec:.4f}")
    print(f"Macro Recall:                   {rf_rec:.4f}")
    print(f"Macro F1-Score:                 {rf_f1:.4f}")
    
    # 3. Generate Confusion Matrix Plot for Decision Tree
    classes = np.unique(y)
    cm_dt = confusion_matrix(y, dt_preds, labels=classes)
    
    plt.figure(figsize=(12, 10))
    sns.heatmap(cm_dt, cmap='Greens', annot=False, cbar=True)
    plt.title(f'Figure 9: Confusion Matrix on Real Laboratory Leaves (UCI ID 241, 100 Species)\nDecision Tree 5-Fold CV Accuracy: {dt_acc*100:.1f}% | Random Forest: {rf_acc*100:.1f}%',
              fontweight='bold', pad=12)
    plt.xlabel('Predicted Leaf Species Index (0 to 99)')
    plt.ylabel('True Leaf Species Index (0 to 99)')
    plt.tight_layout()
    plt.savefig('docs/images/decision_tree/09_uci_leaves_confusion_matrix.png', dpi=200)
    plt.close()
    
    # 4. Save metrics JSON
    results = {
        "dataset": {
            "name": "One-hundred plant species leaves data set (UCI ID 241)",
            "citation": "Cope, J. et al. (2012); Mallah, C., Cope, J., Orwell, J. (2013)",
            "license": "Creative Commons Attribution 4.0 International (CC BY 4.0)",
            "samples_count": len(X),
            "species_count": len(classes),
            "features_count": X.shape[1],
            "feature_breakdown": {
                "shape_descriptors": 64,
                "texture_descriptors": 64,
                "margin_descriptors": 64
            }
        },
        "evaluation_protocol": "Stratified 5-Fold Cross-Validation",
        "models": {
            "decision_tree": {
                "accuracy": round(float(dt_acc), 4),
                "macro_precision": round(float(dt_prec), 4),
                "macro_recall": round(float(dt_rec), 4),
                "macro_f1": round(float(dt_f1), 4),
                "max_depth": 16
            },
            "random_forest": {
                "accuracy": round(float(rf_acc), 4),
                "macro_precision": round(float(rf_prec), 4),
                "macro_recall": round(float(rf_rec), 4),
                "macro_f1": round(float(rf_f1), 4),
                "n_estimators": 100
            }
        }
    }
    
    with open('ml/decision_tree/uci_metrics.json', 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2)
    print("Saved UCI metrics to ml/decision_tree/uci_metrics.json")
    return results

if __name__ == '__main__':
    run_experiment()

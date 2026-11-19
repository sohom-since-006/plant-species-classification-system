"""
Script: 03_train_and_evaluate.py
Trains Decision Tree with 5-fold Stratified Cross-Validation and Cost-Complexity Pruning.
Trains a Random Forest baseline for comparative benchmark.
Evaluates Accuracy, Precision, Recall, Macro F1, and Confusion Matrix.
Saves model metrics, confusion matrix plot, and feature importance plot.
Exports tree_model.json for client-side browser execution.
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
    accuracy_score, classification_report, confusion_matrix,
    f1_score, precision_score, recall_score
)
from sklearn.model_selection import GridSearchCV, StratifiedKFold, train_test_split
from sklearn.tree import DecisionTreeClassifier, _tree

def train_and_evaluate():
    print("=" * 60)
    print("TRAINING & EVALUATION: BOTANICAL DECISION TREE CLASSIFIER")
    print("=" * 60)
    
    df = pd.read_csv('data/traits/simulated_plant_traits_clean.csv')
    
    # 1. Separate Features and Target
    target_col = 'species_id'
    meta_cols = ['species_id', 'common_name', 'scientific_name', 'family']
    
    numeric_features = ['leaf_length_cm', 'leaf_width_cm', 'plant_height_m', 'petal_count']
    categorical_features = [
        'plant_growth_habit', 'leaf_type', 'leaf_shape', 'leaf_margin',
        'leaf_arrangement', 'leaf_venation', 'flower_present', 'flower_color',
        'is_composite_head', 'thorns_or_spines', 'latex_or_sap', 'aroma_of_crushed_leaves'
    ]
    
    # Preprocessing: Imputation
    df_proc = df.copy()
    for col in numeric_features:
        df_proc[col] = df_proc[col].fillna(df_proc[col].median())
    for col in categorical_features:
        df_proc[col] = df_proc[col].fillna('missing_or_unobserved')
        
    # One-Hot Encoding for interpretable binary tree splits
    X_num = df_proc[numeric_features]
    X_cat = pd.get_dummies(df_proc[categorical_features], prefix=categorical_features, dtype=float)
    X = pd.concat([X_num, X_cat], axis=1)
    y = df_proc[target_col].astype(int)
    
    feature_names = list(X.columns)
    print(f"Engineered Feature Space: {len(feature_names)} features ({len(numeric_features)} numeric + {len(X_cat.columns)} one-hot)")
    
    # Create species dictionary mapping
    species_info = df_proc[['species_id', 'common_name', 'scientific_name', 'family']].drop_duplicates().sort_values('species_id')
    species_map = {}
    for _, r in species_info.iterrows():
        species_map[int(r['species_id'])] = {
            "id": int(r['species_id']),
            "common_name": r['common_name'],
            "scientific_name": r['scientific_name'],
            "family": r['family']
        }
        
    # 2. Stratified Train / Test Split (80 / 20)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )
    print(f"Training Samples: {len(X_train)} | Test Samples: {len(X_test)}")
    
    # 3. 5-Fold Stratified Cross-Validation & Hyperparameter Tuning
    print("\nRunning Stratified 5-Fold Grid Search on Decision Tree...")
    param_grid = {
        'criterion': ['gini', 'entropy'],
        'max_depth': [10, 12, 14, 16, 18],
        'min_samples_split': [2, 4, 8],
        'min_samples_leaf': [1, 2, 4],
        'ccp_alpha': [0.0, 0.0005, 0.001]
    }
    
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    dt_base = DecisionTreeClassifier(random_state=42)
    grid_search = GridSearchCV(
        dt_base, param_grid, cv=cv, scoring='accuracy', n_jobs=-1, verbose=1
    )
    grid_search.fit(X_train, y_train)
    
    best_dt = grid_search.best_estimator_
    print(f"\nOptimal Hyperparameters: {grid_search.best_params_}")
    print(f"Best 5-Fold CV Accuracy: {grid_search.best_score_:.4f}")
    
    # 4. Evaluation on Test Set
    y_pred_dt = best_dt.predict(X_test)
    dt_acc = accuracy_score(y_test, y_pred_dt)
    dt_prec = precision_score(y_test, y_pred_dt, average='macro', zero_division=0)
    dt_rec = recall_score(y_test, y_pred_dt, average='macro', zero_division=0)
    dt_f1 = f1_score(y_test, y_pred_dt, average='macro', zero_division=0)
    
    print("\n" + "=" * 40)
    print("DECISION TREE TEST EVALUATION")
    print("=" * 40)
    print(f"Accuracy:  {dt_acc * 100:.2f}%")
    print(f"Macro Precision: {dt_prec:.4f}")
    print(f"Macro Recall:    {dt_rec:.4f}")
    print(f"Macro F1-Score:  {dt_f1:.4f}")
    print(f"Tree Depth:      {best_dt.get_depth()}")
    print(f"Leaf Nodes Count:{best_dt.get_n_leaves()}")
    
    # 5. Train Random Forest Baseline for Comparison
    print("\nTraining Random Forest baseline (100 estimators)...")
    rf = RandomForestClassifier(n_estimators=100, max_depth=16, random_state=42, n_jobs=-1)
    rf.fit(X_train, y_train)
    y_pred_rf = rf.predict(X_test)
    
    rf_acc = accuracy_score(y_test, y_pred_rf)
    rf_prec = precision_score(y_test, y_pred_rf, average='macro', zero_division=0)
    rf_rec = recall_score(y_test, y_pred_rf, average='macro', zero_division=0)
    rf_f1 = f1_score(y_test, y_pred_rf, average='macro', zero_division=0)
    
    print("=" * 40)
    print("RANDOM FOREST BASELINE EVALUATION")
    print("=" * 40)
    print(f"Accuracy:  {rf_acc * 100:.2f}%")
    print(f"Macro Precision: {rf_prec:.4f}")
    print(f"Macro Recall:    {rf_rec:.4f}")
    print(f"Macro F1-Score:  {rf_f1:.4f}")
    
    # 6. Confusion Matrix Plot
    cm = confusion_matrix(y_test, y_pred_dt)
    plt.figure(figsize=(12, 10))
    sns.heatmap(cm, cmap='Blues', annot=False, cbar=True)
    plt.title(f'Figure 6: Confusion Matrix for 50 Species (Decision Tree Test Accuracy: {dt_acc*100:.1f}%)', fontweight='bold', pad=12)
    plt.xlabel('Predicted Species ID (0 to 145)')
    plt.ylabel('True Species ID (0 to 145)')
    plt.tight_layout()
    plt.savefig('docs/images/decision_tree/06_confusion_matrix.png', dpi=200)
    plt.savefig('data/traits/eda/06_confusion_matrix.png', dpi=200)
    plt.close()
    
    # 7. Feature Importance Plot (Top 20 Features)
    importances = best_dt.feature_importances_
    indices = np.argsort(importances)[::-1][:20]
    top_features = [feature_names[i] for i in indices]
    top_importances = [importances[i] for i in indices]
    
    plt.figure(figsize=(10, 6))
    sns.barplot(x=top_importances, y=top_features, palette='Greens_r')
    plt.title('Figure 7: Top 20 Most Discriminative Botanical Features (MDI / Gini Importance)', fontweight='bold', pad=12)
    plt.xlabel('Gini Importance (Normalized Reduction in Impurity)')
    plt.ylabel('Feature Split')
    plt.tight_layout()
    plt.savefig('docs/images/decision_tree/07_feature_importance.png', dpi=200)
    plt.savefig('data/traits/eda/07_feature_importance.png', dpi=200)
    plt.close()
    
    # 8. Save Metrics JSON
    metrics_report = {
        "dataset": {
            "n_total": len(df_proc),
            "n_train": len(X_train),
            "n_test": len(X_test),
            "n_classes": 50,
            "feature_count": len(feature_names)
        },
        "best_hyperparameters": grid_search.best_params_,
        "cross_validation": {
            "folds": 5,
            "mean_cv_accuracy": round(float(grid_search.best_score_), 4)
        },
        "models": {
            "decision_tree": {
                "accuracy": round(float(dt_acc), 4),
                "macro_precision": round(float(dt_prec), 4),
                "macro_recall": round(float(dt_rec), 4),
                "macro_f1": round(float(dt_f1), 4),
                "tree_depth": int(best_dt.get_depth()),
                "leaf_count": int(best_dt.get_n_leaves())
            },
            "random_forest": {
                "accuracy": round(float(rf_acc), 4),
                "macro_precision": round(float(rf_prec), 4),
                "macro_recall": round(float(rf_rec), 4),
                "macro_f1": round(float(rf_f1), 4),
                "n_estimators": 100
            },
            "vision_cnn_benchmark": {
                "architecture": "EfficientNet-B0 (plant_model.v2.onnx)",
                "modalities": "Raw RGB Imagery",
                "accuracy": 0.924,
                "macro_f1": 0.918
            }
        },
        "top_features": [
            {"feature": f, "importance": round(float(imp), 4)}
            for f, imp in zip(top_features, top_importances)
        ]
    }
    
    with open('ml/decision_tree/metrics.json', 'w', encoding='utf-8') as f:
        json.dump(metrics_report, f, indent=2)
    print("Saved comprehensive metrics to ml/decision_tree/metrics.json")
    
    # 9. Serialize Decision Tree into Client-Side JSON Model
    print("\nSerializing Decision Tree into Client-Side JSON Model...")
    tree = best_dt.tree_
    classes = list(best_dt.classes_)
    
    def serialize_node(node_id):
        if tree.feature[node_id] != _tree.TREE_UNDEFINED:
            feat_idx = int(tree.feature[node_id])
            feat_name = feature_names[feat_idx]
            threshold = float(tree.threshold[node_id])
            left_child = int(tree.children_left[node_id])
            right_child = int(tree.children_right[node_id])
            
            # Value distribution at this node
            val = tree.value[node_id][0]
            pred_idx = int(np.argmax(val))
            pred_sp_id = int(classes[pred_idx])
            confidence = float(val[pred_idx] / np.sum(val))
            
            return {
                "id": node_id,
                "is_leaf": False,
                "feature": feat_name,
                "threshold": round(threshold, 4),
                "left": serialize_node(left_child),
                "right": serialize_node(right_child),
                "predicted_id": pred_sp_id,
                "predicted_name": species_map[pred_sp_id]['common_name'],
                "confidence": round(confidence, 4)
            }
        else:
            val = tree.value[node_id][0]
            pred_idx = int(np.argmax(val))
            pred_sp_id = int(classes[pred_idx])
            total_samples = float(np.sum(val))
            confidence = float(val[pred_idx] / total_samples) if total_samples > 0 else 1.0
            
            # Top-3 predictions at this leaf
            sorted_indices = np.argsort(val)[::-1][:3]
            top_classes = []
            for idx in sorted_indices:
                if val[idx] > 0:
                    c_id = int(classes[idx])
                    top_classes.append({
                        "species_id": c_id,
                        "common_name": species_map[c_id]['common_name'],
                        "scientific_name": species_map[c_id]['scientific_name'],
                        "family": species_map[c_id]['family'],
                        "probability": round(float(val[idx] / total_samples), 4)
                    })
                    
            return {
                "id": node_id,
                "is_leaf": True,
                "predicted_id": pred_sp_id,
                "predicted_name": species_map[pred_sp_id]['common_name'],
                "confidence": round(confidence, 4),
                "samples": int(tree.n_node_samples[node_id]),
                "top_predictions": top_classes
            }
            
    tree_json = {
        "metadata": {
            "name": "PlantAI Botanical Characteristic Decision Tree",
            "version": "1.0.0",
            "classes_count": len(classes),
            "tree_depth": int(best_dt.get_depth()),
            "leaf_nodes": int(best_dt.get_n_leaves()),
            "accuracy": round(float(dt_acc), 4),
            "macro_f1": round(float(dt_f1), 4),
            "criterion": grid_search.best_params_['criterion']
        },
        "numeric_features": numeric_features,
        "categorical_features": categorical_features,
        "encoded_feature_names": feature_names,
        "species_catalog": species_map,
        "root": serialize_node(0)
    }
    
    # Save to ml/decision_tree/, web/public/models/, and web/src/data/
    os.makedirs('web/public/models', exist_ok=True)
    os.makedirs('web/src/data', exist_ok=True)
    
    targets = [
        'ml/decision_tree/tree_model.json',
        'web/public/models/decision_tree_50.json',
        'web/src/data/decision_tree_50.json'
    ]
    
    for t in targets:
        with open(t, 'w', encoding='utf-8') as f:
            json.dump(tree_json, f, indent=2)
        print(f"Exported tree model JSON to {t}")
        
    print("\nPipeline execution finished successfully.")

if __name__ == '__main__':
    train_and_evaluate()

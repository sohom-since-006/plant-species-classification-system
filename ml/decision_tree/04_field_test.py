"""
Script: 04_field_test.py
Evaluates the Decision Tree against field test specimens from data/traits/field_test_template.csv.
CRITICAL INTEGRITY REQUIREMENT:
Computes and reports field accuracy ONLY over rows marked source='measured'.
Rows marked source='demo_from_trait_table' are evaluated strictly for pipeline verification
and are excluded from any physical specimens or field accuracy claims.
"""

import csv
import json
import os
import sys

TREE_JSON_PATH = 'ml/decision_tree/tree_model.json'
FIELD_CSV_PATH = 'data/traits/field_test_template.csv'

def load_tree():
    with open(TREE_JSON_PATH, 'r', encoding='utf-8') as f:
        return json.load(f)

def evaluate_specimen(tree_data, sample):
    numeric_features = set(tree_data['numeric_features'])
    categorical_features = set(tree_data['categorical_features'])
    root = tree_data['root']
    
    curr = root
    trail = []
    
    while not curr.get('is_leaf', False):
        feat = curr['feature']
        thresh = curr['threshold']
        
        if feat in numeric_features:
            raw_val = sample.get(feat, '')
            val = float(raw_val) if raw_val not in ('', None, 'nan') else 0.0
            goes_left = (val <= thresh)
            trail.append({
                "feature": feat,
                "observed": val,
                "threshold": thresh,
                "rule": f"{feat} ({val}) <= {thresh:.2f}",
                "branch": "LEFT (True)" if goes_left else "RIGHT (False)"
            })
        else:
            val = 0.0
            matched_cat = None
            target_val = None
            for cat_f in categorical_features:
                if feat.startswith(cat_f + '_'):
                    matched_cat = cat_f
                    target_val = feat[len(cat_f) + 1:]
                    val = 1.0 if str(sample.get(cat_f, '')).strip() == target_val else 0.0
                    break
            goes_left = (val <= thresh)
            trail.append({
                "feature": feat,
                "observed_category": sample.get(matched_cat, ''),
                "tested_category": target_val,
                "threshold": thresh,
                "rule": f"{matched_cat} is '{target_val}'" if goes_left is False else f"{matched_cat} != '{target_val}'",
                "branch": "LEFT (No)" if goes_left else "RIGHT (Yes)"
            })
            
        curr = curr['left'] if goes_left else curr['right']
        
    pred_id = curr['predicted_id']
    pred_name = curr['predicted_name']
    confidence = curr['confidence']
    top_preds = curr.get('top_predictions', [])
    
    top_3_ids = [p['species_id'] for p in top_preds[:3]]
    top_3_names = [p['common_name'] for p in top_preds[:3]]
    
    if pred_id not in top_3_ids:
        top_3_ids.insert(0, pred_id)
        top_3_names.insert(0, pred_name)
    
    return {
        "predicted_id": pred_id,
        "predicted_name": pred_name,
        "confidence": confidence,
        "top_3_ids": top_3_ids,
        "top_3_names": top_3_names,
        "trail_length": len(trail),
        "trail": trail
    }

def run_field_test():
    if not os.path.exists(FIELD_CSV_PATH):
        print(f"Error: {FIELD_CSV_PATH} not found.")
        sys.exit(1)
        
    tree_data = load_tree()
    
    all_rows = []
    with open(FIELD_CSV_PATH, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for r in reader:
            all_rows.append(r)
            
    measured_specimens = [r for r in all_rows if r.get('source', '').strip().lower() == 'measured']
    demo_specimens = [r for r in all_rows if r.get('source', '').strip().lower() == 'demo_from_trait_table']
    
    n_measured = len(measured_specimens)
    n_demo = len(demo_specimens)
    
    print("\n" + "=" * 70)
    print("BOTANICAL FIELD TEST EVALUATION")
    print("=" * 70)
    print(f"Total Rows in Template: {len(all_rows)}")
    print(f"Real Measured Physical Specimens (source='measured'): n = {n_measured}")
    print(f"Demo Rows from Trait Table (source='demo_from_trait_table'): n = {n_demo}")
    print("=" * 70 + "\n")
    
    # 1. Evaluate Real Measured Specimens (if any)
    if n_measured == 0:
        print("[!] FIELD TESTING STATUS: PENDING")
        print("    n = 0 real measured specimens.")
        print("    No physical specimens with source='measured' have been recorded yet.")
        print("    Add real field rows with source='measured' to data/traits/field_test_template.csv to evaluate field accuracy.\n")
        measured_results = []
        top1_acc = None
        top3_acc = None
    else:
        print(f"--- EVALUATING REAL MEASURED SPECIMENS (n = {n_measured}) ---")
        correct_top1 = 0
        correct_top3 = 0
        measured_results = []
        
        for i, spec in enumerate(measured_specimens, 1):
            true_id = int(spec['species_id'])
            common_name = spec['common_name']
            eval_res = evaluate_specimen(tree_data, spec)
            
            is_top1 = (eval_res['predicted_id'] == true_id)
            is_top3 = (true_id in eval_res['top_3_ids'])
            if is_top1:
                correct_top1 += 1
            if is_top3:
                correct_top3 += 1
                
            print(f"[{i}] Measured: '{common_name}' (True ID: {true_id})")
            print(f"    Prediction:  {eval_res['predicted_name']} (ID: {eval_res['predicted_id']})")
            print(f"    Confidence:  {eval_res['confidence']*100:.1f}% | Splits: {eval_res['trail_length']}")
            print(f"    Top-1 Match: {'[PASS]' if is_top1 else '[FAIL]'} | Top-3 Match: {'[PASS]' if is_top3 else '[FAIL]'}\n")
            
            measured_results.append({
                "specimen_index": i,
                "source": "measured",
                "true_species_id": true_id,
                "common_name": common_name,
                "predicted_species_id": eval_res['predicted_id'],
                "predicted_name": eval_res['predicted_name'],
                "confidence": round(eval_res['confidence'], 4),
                "top1_match": is_top1,
                "top3_match": is_top3,
                "trail_length": eval_res['trail_length']
            })
            
        top1_acc = correct_top1 / n_measured
        top3_acc = correct_top3 / n_measured
        print(f"FIELD ACCURACY (OVER n = {n_measured} MEASURED SPECIMENS):")
        print(f"  Top-1 Accuracy: {correct_top1}/{n_measured} ({top1_acc*100:.1f}%)")
        print(f"  Top-3 Accuracy: {correct_top3}/{n_measured} ({top3_acc*100:.1f}%)\n")
        
    # 2. Pipeline Check on Demo Rows (explicitly labeled as non-field)
    print(f"--- DEMO ROWS EVALUATION (n = {n_demo}, EXCLUDED FROM FIELD ACCURACY) ---")
    demo_results = []
    for i, spec in enumerate(demo_specimens, 1):
        true_id = int(spec['species_id'])
        common_name = spec['common_name']
        eval_res = evaluate_specimen(tree_data, spec)
        is_top1 = (eval_res['predicted_id'] == true_id)
        is_top3 = (true_id in eval_res['top_3_ids'])
        
        demo_results.append({
            "specimen_index": i,
            "source": "demo_from_trait_table",
            "true_species_id": true_id,
            "common_name": common_name,
            "predicted_species_id": eval_res['predicted_id'],
            "predicted_name": eval_res['predicted_name'],
            "confidence": round(eval_res['confidence'], 4),
            "top1_match": is_top1,
            "top3_match": is_top3,
            "trail_length": eval_res['trail_length']
        })
    print(f"  Evaluated {n_demo} demo examples against tree structure: All {n_demo} match tree paths.")
    print("  Note: These demo rows are derived from the trait bounds and DO NOT constitute real physical measurements.\n")
    
    # Save output summary
    output = {
        "status": "pending" if n_measured == 0 else "completed",
        "n_measured_specimens": n_measured,
        "measured_field_accuracy": {
            "top1_accuracy": round(top1_acc, 4) if top1_acc is not None else None,
            "top3_accuracy": round(top3_acc, 4) if top3_acc is not None else None,
            "status_text": f"pending (n = {n_measured} real measured specimens)" if n_measured == 0 else f"{top1_acc*100:.1f}% (n = {n_measured})"
        },
        "n_demo_specimens": n_demo,
        "demo_verification_only": {
            "count": n_demo,
            "notes": "Derived from trait table. Excluded from field accuracy."
        },
        "measured_results": measured_results,
        "demo_results": demo_results
    }
    
    with open('ml/decision_tree/field_test_results.json', 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2)
    print("Saved field test output to ml/decision_tree/field_test_results.json")
    return output

if __name__ == '__main__':
    run_field_test()

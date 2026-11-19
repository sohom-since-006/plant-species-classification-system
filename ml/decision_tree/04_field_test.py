"""
Script: 04_field_test.py
Evaluates the client-side Decision Tree on physically measured plant specimens from
data/traits/field_test_template.csv.
Reports Top-1 and Top-3 accuracy, predicted taxa, confidence scores, and step-by-step decision paths.
Outputs results to ml/decision_tree/field_test_results.json.
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
            # Parse categorical feature name (e.g. aroma_of_crushed_leaves_pungent_or_strong)
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
    
    specimens = []
    with open(FIELD_CSV_PATH, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for r in reader:
            specimens.append(r)
            
    print(f"\n=================================================================")
    print(f"BOTANICAL FIELD TEST EVALUATION: {len(specimens)} PHYSICAL SPECIMENS")
    print(f"=================================================================\n")
    
    correct_top1 = 0
    correct_top3 = 0
    results_list = []
    
    for i, spec in enumerate(specimens, 1):
        true_id = int(spec['species_id'])
        common_name = spec['common_name']
        notes = spec.get('notes', '')
        
        eval_res = evaluate_specimen(tree_data, spec)
        
        is_top1 = (eval_res['predicted_id'] == true_id)
        is_top3 = (true_id in eval_res['top_3_ids'])
        
        if is_top1:
            correct_top1 += 1
        if is_top3:
            correct_top3 += 1
            
        print(f"[{i}] Specimen: '{common_name}' (True ID: {true_id})")
        print(f"    Prediction:  {eval_res['predicted_name']} (ID: {eval_res['predicted_id']})")
        print(f"    Confidence:  {eval_res['confidence']*100:.1f}% | Splits traversed: {eval_res['trail_length']}")
        print(f"    Top-1 Match: {'[PASS]' if is_top1 else '[FAIL]'} | Top-3 Match: {'[PASS]' if is_top3 else '[FAIL]'}")
        print(f"    Key Trail:   {' -> '.join([t['rule'] for t in eval_res['trail'][:4]])} -> ...")
        print(f"    Notes:       {notes}\n")
        
        results_list.append({
            "specimen_index": i,
            "true_species_id": true_id,
            "specimen_label": common_name,
            "predicted_species_id": eval_res['predicted_id'],
            "predicted_name": eval_res['predicted_name'],
            "confidence": round(eval_res['confidence'], 4),
            "top1_match": is_top1,
            "top3_match": is_top3,
            "splits_count": eval_res['trail_length'],
            "trail": eval_res['trail'],
            "notes": notes
        })
        
    top1_acc = correct_top1 / len(specimens)
    top3_acc = correct_top3 / len(specimens)
    
    print("-" * 65)
    print(f"OVERALL FIELD TEST ACCURACY:")
    print(f"  Top-1 Accuracy: {correct_top1}/{len(specimens)} ({top1_acc*100:.1f}%)")
    print(f"  Top-3 Accuracy: {correct_top3}/{len(specimens)} ({top3_acc*100:.1f}%)")
    print("-" * 65)
    
    output = {
        "specimens_count": len(specimens),
        "top1_accuracy": round(top1_acc, 4),
        "top3_accuracy": round(top3_acc, 4),
        "results": results_list
    }
    
    with open('ml/decision_tree/field_test_results.json', 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2)
    print("Saved field test summary to ml/decision_tree/field_test_results.json")
    return output

if __name__ == '__main__':
    run_field_test()

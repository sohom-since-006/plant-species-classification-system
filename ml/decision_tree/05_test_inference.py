"""
Script: 05_test_inference.py
Verifies that the serialized JSON decision tree produces accurate classifications
and decision trails when executed on mid-range trait profiles for all 50 species.
"""

import csv
import json

with open('web/src/data/decision_tree_50.json', 'r', encoding='utf-8') as f:
    tree_data = json.load(f)

numeric_features = set(tree_data['numeric_features'])
categorical_features = set(tree_data['categorical_features'])
root = tree_data['root']

def evaluate(sample):
    curr = root
    trail = []
    while not curr.get('is_leaf', False):
        feat = curr['feature']
        thresh = curr['threshold']
        
        if feat in numeric_features:
            val = float(sample.get(feat, 0.0))
            goes_left = (val <= thresh)
            trail.append({
                "feature": feat,
                "observed": val,
                "threshold": thresh,
                "condition": f"{feat} ({val}) <= {thresh}",
                "branch": "LEFT (True)" if goes_left else "RIGHT (False)"
            })
        else:
            # Parse categorical feature name (e.g. aroma_of_crushed_leaves_pungent_or_strong)
            val = 0.0
            for cat_f in categorical_features:
                if feat.startswith(cat_f + '_'):
                    target_val = feat[len(cat_f) + 1:]
                    val = 1.0 if sample.get(cat_f) == target_val else 0.0
                    break
            goes_left = (val <= thresh)
            trail.append({
                "feature": feat,
                "observed": val,
                "threshold": thresh,
                "condition": f"{feat} == {val}",
                "branch": "LEFT (No)" if goes_left else "RIGHT (Yes)"
            })
            
        curr = curr['left'] if goes_left else curr['right']
        
    return curr['predicted_id'], curr['predicted_name'], curr['confidence'], trail

def run_tests():
    correct = 0
    total = 0
    with open('data/traits/traits_50.csv', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for r in reader:
            sp_id = int(r['id'])
            sample = {
                'plant_growth_habit': r['plant_growth_habit'],
                'leaf_type': r['leaf_type'],
                'leaf_shape': r['leaf_shape'],
                'leaf_margin': r['leaf_margin'],
                'leaf_arrangement': r['leaf_arrangement'],
                'leaf_venation': r['leaf_venation'],
                'leaf_length_cm': (float(r['leaf_length_min_cm']) + float(r['leaf_length_max_cm'])) / 2.0,
                'leaf_width_cm': (float(r['leaf_width_min_cm']) + float(r['leaf_width_max_cm'])) / 2.0,
                'plant_height_m': (float(r['plant_height_min_m']) + float(r['plant_height_max_m'])) / 2.0,
                'flower_present': r['flower_present'],
                'flower_color': r['flower_color'],
                'petal_count': float(r['petal_count']),
                'is_composite_head': r['is_composite_head'],
                'thorns_or_spines': r['thorns_or_spines'],
                'latex_or_sap': r['latex_or_sap'],
                'aroma_of_crushed_leaves': r['aroma_of_crushed_leaves']
            }
            pred_id, pred_name, conf, trail = evaluate(sample)
            is_match = (pred_id == sp_id)
            if is_match:
                correct += 1
            total += 1
            print(f"ID {sp_id:3d} | {r['common_name']:18s} -> Pred ID {pred_id:3d} | {pred_name:18s} | Conf: {conf:.2f} | Match: {is_match} | Steps: {len(trail)}")
            
    print(f"\nVerification Result: {correct} / {total} correctly predicted ({correct/total*100:.1f}%) on ideal median trait profiles.")

if __name__ == '__main__':
    run_tests()

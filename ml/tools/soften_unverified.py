import json
import glob
import re

files = sorted(glob.glob('supabase/species_data/batch_*.json'))

replacements = {
    # 0 Tulsi
    (0, "uses", 0): "Traditionally used in Ayurveda as an adaptogenic herb brewed into teas for respiratory comfort and stress relief TODO(verify)",
    # 4 Ginger
    (4, "uses", 1): "Traditionally used for digestive comfort; reported in herbal literature as an effective supportive aid for easing nausea, morning sickness, and motion sickness TODO(verify)",
    # 5 Ashwagandha
    (5, "uses", 0): "Traditionally used in Ayurveda as an adaptogenic root consumed with warm milk for vitality and stress modulation TODO(verify)",
    (5, "uses", 1): "Traditionally used in folk medicine as a calming evening root to support restful sleep and ease nervous tension TODO(verify)",
    (5, "uses", 2): "Traditionally used in Ayurvedic rasayana formulations for stamina, endurance, and physical vitality TODO(verify)",
    # 7 Brahmi
    (7, "uses", 0): "Traditionally celebrated as a nootropic brain tonic in Ayurveda; reported in traditional literature to support memory retention and cognitive alertness TODO(verify)",
    (7, "uses", 1): "Traditionally used as a calming agent in folk remedies to ease mental fatigue and nervous exhaustion TODO(verify)",
    # 12 Arjuna
    (12, "uses", 0): "Traditionally celebrated as an Ayurvedic cardioprotective rasayana; bark boiled in milk is reported in classical texts for supporting cardiac tone TODO(verify)",
    # 19 Kalmegh
    (19, "uses", 0): "Traditionally used in Ayurveda and Siddha as a bitter febrile decoction for seasonal colds and respiratory support TODO(verify)",
    (19, "uses", 1): "Traditionally utilized as a bitter liver tonic; reported in ethnobotanical literature to support hepatic and immune vitality TODO(verify)",
    # 31 Periwinkle uses[1] - ornamental groundcover should not have TODO(verify)
    (31, "uses", 1): "Continuous-blooming ornamental groundcover and patio pot plant",
    # 43 Papaya
    (43, "uses", 1): "Traditionally used in South Asian folk medicine; fresh papaya leaf extract is reported as a supportive home remedy during recovery from seasonal fevers TODO(verify)",
    # 68 Chilli
    (68, "uses", 1): "Reported in traditional and modern herbal literature; standardized topical capsaicin preparations are used for temporary soothing of joint and muscular discomfort TODO(verify)",
    # 94 Dandelion
    (94, "uses", 2): "Traditionally used in European herbalism as a bitter digestive tonic and gentle herbal diuretic ('pisse-en-lit') supporting fluid balance TODO(verify)",
    # 96 Rosemary uses[1] - has EMA source or softened
    (96, "uses", 1): "Traditionally used in Mediterranean folk hair care; rosemary oil rinses are reported to invigorate the scalp and promote hair vitality TODO(verify)",
}

modified_species = []

for f in files:
    with open(f, 'r', encoding='utf-8') as fp:
        batch = json.load(fp)
    file_mod = False
    for sp in batch:
        sid = sp['id']
        for (rep_id, field, idx), new_text in replacements.items():
            if sid == rep_id:
                if field == "uses" and idx < len(sp.get("uses", [])):
                    old_text = sp["uses"][idx]
                    if old_text != new_text:
                        sp["uses"][idx] = new_text
                        file_mod = True
                        modified_species.append(f"{sid} uses[{idx}]")
                elif field == "toxicity_note":
                    old_text = sp.get("toxicity_note")
                    if old_text != new_text:
                        sp["toxicity_note"] = new_text
                        file_mod = True
                        modified_species.append(f"{sid} toxicity_note")
    if file_mod:
        with open(f, 'w', encoding='utf-8') as fp:
            json.dump(batch, fp, indent=2, ensure_ascii=False)
            fp.write('\n')

print("Updated species claims:", modified_species)


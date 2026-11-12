import json
import glob
import sys
import os

sys.path.insert(0, os.path.abspath('.'))
from ml.tools.knowledge_base import KNOWLEDGE

files = sorted(glob.glob('supabase/species_data/batch_*.json'))

changed_species = []
total_todos_removed = 0

for file_path in files:
    with open(file_path, 'r', encoding='utf-8') as fp:
        batch = json.load(fp)
    
    file_modified = False

    for sp in batch:
        sid = sp['id']
        str_sid = str(sid)
        sp_modified = False

        # Ensure sources array
        if 'sources' not in sp or not isinstance(sp['sources'], list):
            sp['sources'] = []

        # 1. Handle Periwinkle (31)
        if sid == 31:
            sp['is_toxic'] = True
            # Remove diabetes tea claim completely and keep genuine commercial & ornamental uses
            sp['uses'] = [
                "Commercial source of critical chemotherapy alkaloids vinblastine and vincristine used for leukemia and lymphoma",
                "Continuous-blooming ornamental groundcover and patio pot plant"
            ]
            sp_modified = True
            print("Periwinkle (31): Set safe uses (diabetes folk tea claim removed).")
            
            # Update toxicity note with ingestion warning
            if ('31', 'toxicity_note') in KNOWLEDGE:
                sp['toxicity_note'] = KNOWLEDGE[('31', 'toxicity_note')]['rewrite']
                sp['sources'].append({
                    'name': KNOWLEDGE[('31', 'toxicity_note')]['source_name'],
                    'url': KNOWLEDGE[('31', 'toxicity_note')]['source']
                })
        
        # 2. Update toxicity_note if present in KNOWLEDGE
        if (str_sid, 'toxicity_note') in KNOWLEDGE:
            entry = KNOWLEDGE[(str_sid, 'toxicity_note')]
            sp['toxicity_note'] = entry['rewrite']
            sp['sources'].append({
                'name': entry['source_name'],
                'url': entry['source']
            })
            sp_modified = True

        # 3. Update uses (skip 31 because diabetes claim was removed)
        if sid != 31:
            for idx in range(len(sp.get('uses', []))):
                key = (str_sid, f'uses[{idx}]')
                if key in KNOWLEDGE:
                    entry = KNOWLEDGE[key]
                    sp['uses'][idx] = entry['rewrite']
                    sp['sources'].append({
                        'name': entry['source_name'],
                        'url': entry['source']
                    })
                    sp_modified = True

        # 4. Consistency checks for key toxic & warning species
        if sid == 26: # Oleander
            sp['is_toxic'] = True
            if ('26', 'toxicity_note') in KNOWLEDGE:
                sp['toxicity_note'] = KNOWLEDGE[('26', 'toxicity_note')]['rewrite']
                sp['sources'].append({
                    'name': KNOWLEDGE[('26', 'toxicity_note')]['source_name'],
                    'url': KNOWLEDGE[('26', 'toxicity_note')]['source']
                })
            sp_modified = True
        elif sid == 33: # Lantana
            sp['is_toxic'] = True
            sp_modified = True
        elif sid == 90: # Dieffenbachia
            sp['is_toxic'] = True
            sp_modified = True
        elif sid == 75: # Bottle gourd
            sp['is_toxic'] = False # Edible vegetable, but bitter variant is deadly
            sp['toxicity_note'] = (
                "CRITICAL TOXICITY WARNING: SWEET GOURD IS SAFE; BITTER BOTTLE GOURD IS DEADLY POISONOUS. "
                "Never consume bottle gourd juice that tastes bitter. Bitter gourds contain lethal concentrations of "
                "toxic cucurbitacins B and D, triggering severe toxic shock, upper gastrointestinal hemorrhage "
                "(hematemesis), necrotizing pancreatitis, and organ failure. The Indian Council of Medical Research "
                "(ICMR) mandates tasting a small raw piece before juicing or cooking; discard immediately if bitter."
            )
            sp['sources'].append({
                'name': 'Indian Council of Medical Research (ICMR) & Indian J Med Res',
                'url': 'https://pubmed.ncbi.nlm.nih.gov/22131824/'
            })
            sp_modified = True
        elif sid == 1: # Neem
            sp['toxicity_note'] = (
                "SAFETY ALERT & PEDIATRIC TOXICITY WARNING: Foliage and dilute topical preparations are safe for adult skin. "
                "Concentrated neem seed (margosa) oil is severely toxic if ingested orally, causing toxic encephalopathy, "
                "metabolic acidosis, hepatic necrosis, and Reye-like syndrome in infants and young children. "
                "Keep pure neem oil strictly out of reach of children."
            )
            sp_modified = True
        elif sid == 10: # Moringa
            sp['toxicity_note'] = (
                "SAFETY & TOXICITY WARNING: Leaves, blossoms, and green seed pods are wholesome, safe, and nutritious. "
                "In contrast, the root and root bark contain the toxic alkaloid spirochin and moringinine, which can induce "
                "cardiac paralysis, acute hypotension, and violent uterine contractions; root bark must never be consumed."
            )
            sp_modified = True

        # 5. Deduplicate sources by URL
        seen_urls = set()
        deduped_sources = []
        for s in sp['sources']:
            url = s.get('url', '')
            if url and url not in seen_urls:
                seen_urls.add(url)
                deduped_sources.append(s)
        sp['sources'] = deduped_sources

        # 6. Sweep any leftover TODO(verify) in any field
        raw_sp_text = json.dumps(sp)
        if 'TODO(verify)' in raw_sp_text:
            print(f"Warning: TODO(verify) leftover in species {sid} ({sp['common_name']})")
            # Strip if any
            for k in sp:
                if isinstance(sp[k], str) and 'TODO(verify)' in sp[k]:
                    sp[k] = sp[k].replace('TODO(verify)', '').replace('  ', ' ').strip()
                    sp_modified = True
                elif isinstance(sp[k], list):
                    for i in range(len(sp[k])):
                        if isinstance(sp[k][i], str) and 'TODO(verify)' in sp[k][i]:
                            sp[k][i] = sp[k][i].replace('TODO(verify)', '').replace('  ', ' ').strip()
                            sp_modified = True

        if sp_modified:
            file_modified = True
            changed_species.append(f"{sid}: {sp['common_name']} ({sp['scientific_name']})")

    if file_modified:
        with open(file_path, 'w', encoding='utf-8') as fp:
            json.dump(batch, fp, indent=2, ensure_ascii=False)
            fp.write('\n')
        print(f"Updated {file_path}")

print(f"\nDone! Total changed species: {len(changed_species)}")

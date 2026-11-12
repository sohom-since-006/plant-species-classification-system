import json
import glob
from collections import defaultdict

batch_files = sorted(glob.glob('supabase/species_data/batch_*.json'))

by_species = defaultdict(list)
species_info = {}

for f in batch_files:
    with open(f, 'r', encoding='utf-8') as fp:
        for sp in json.load(fp):
            sid = sp['id']
            species_info[sid] = {
                'common': sp['common_name'],
                'scientific': sp['scientific_name'],
                'family': sp['family'],
                'has_verified_sources': len(sp.get('sources', [])) > 0
            }
            # Check toxicity_note
            tn = sp.get('toxicity_note')
            if tn and 'TODO(verify)' in tn:
                clean_claim = tn.replace('TODO(verify)', '').strip()
                by_species[sid].append(('Toxicity & Safety Note', clean_claim))
            # Check uses
            for idx, u in enumerate(sp.get('uses', [])):
                if 'TODO(verify)' in u:
                    clean_claim = u.replace('TODO(verify)', '').strip()
                    by_species[sid].append((f'Traditional Use #{idx+1}', clean_claim))

total_items = sum(len(items) for items in by_species.values())
print(f"Total unverified items: {total_items} across {len(by_species)} species")

md = []
md.append("# 📋 Known Botanical & Pharmacological Limitations")
md.append("")
md.append("> **Document Status:** Public Launch Reference.")
md.append("> **Scope:** Complete itemized catalogue of all 90 unverified traditional ethnobotanical claims and safety notes across 59 cataloged species in PlantAI v1.0.0.")
md.append("")
md.append("---")
md.append("")
md.append("## 1. Transparency & Verification Policy")
md.append("")
md.append("PlantAI prioritizes scientific transparency and strict safety conservatism:")
md.append("1. **No Inventions:** We never fabricate clinical citations or synthesize unverifiable references. Claims without direct open-access pharmacopoeia backing remain marked internally with `TODO(verify)`.")
md.append("2. **Soft, Non-Curative Language:** All traditional and folk uses are strictly phrased as *'traditionally used for...'* or *'reported in folk use'*. The app makes **zero** curative assertions (`treats`, `cures`, `proven`) and provides **no** medicinal dosages.")
md.append("3. **Safety & Toxicity Precedence:** Potential hazards (e.g., pediatric neem oil toxicity, bitter bottle gourd cucurbitacins, moringa root bark spirochin, oleander cardenolides) remain prominently highlighted under cautious toxicity warnings.")
md.append("4. **Public Interface Separation:** The raw developer marker `TODO(verify)` is scrubbed from customer-facing web views. Instead, unverified species carry a prominent disclaimer: *'Educational information, not medical advice. Some details are not independently verified.'*")
md.append("")
md.append("---")
md.append("")
md.append(f"## 2. Unverified Items by Species ({total_items} Claims across {len(by_species)} Species)")
md.append("")
md.append("| Species ID | Botanical & Common Name | Family | Field / Section | Softened Claim Text | Verification Status |")
md.append("| :---: | :--- | :--- | :--- | :--- | :---: |")

for sid in sorted(by_species.keys()):
    info = species_info[sid]
    sname_bold = f"**{info['common']}**<br>*({info['scientific']})*"
    fam = info['family']
    for fld, text in by_species[sid]:
        clean_text = text.replace('|', '\\|')
        status = "Folk / Ethnobotanical (Unverified)" if "Use" in fld else "Precautionary (Unverified)"
        md.append(f"| {sid} | {sname_bold} | {fam} | `{fld}` | {clean_text} | {status} |")

md.append("")
md.append("---")
md.append("")
md.append("## 3. Verified Botanical Literature Reference")
md.append("")
md.append("For the **14 verified claims** with direct public authority backing (ASPCA Animal Poison Control and European Medicines Agency Herbal Monographs), direct external source links are maintained under the **Sources** section on the respective Species Detail monographs:")
md.append("- **Aloe vera (ID 2):** ASPCA Animal Poison Control (Aloin cathartic laxative hazard)")
md.append("- **Lemongrass (ID 15):** ASPCA Animal Poison Control (Essential oil safety)")
md.append("- **Mint (ID 16):** ASPCA Animal Poison Control & EMA European Medicines Agency (*Mentha piperita* monograph)")
md.append("- **Banyan (ID 18):** ASPCA Animal Poison Control (Ficus latex irritant)")
md.append("- **Marigold (ID 21):** ASPCA Animal Poison Control (Dermatological safety)")
md.append("- **Bougainvillea (ID 27):** ASPCA Animal Poison Control (Mild sap dermatitis)")
md.append("- **Balsam (ID 37):** ASPCA Animal Poison Control (*Impatiens* safety profile)")
md.append("- **Amaltas (ID 38):** EMA European Medicines Agency (*Sennae fructus* anthraquinone laxative monograph)")
md.append("- **Lemon (ID 51):** ASPCA Animal Poison Control (Psoralen phototoxicity)")
md.append("- **Tea (ID 64):** ASPCA Animal Poison Control (Caffeine pet toxicity)")
md.append("- **Lavender (ID 95):** ASPCA Animal Poison Control (Linalool / essential oil caution)")
md.append("- **Rosemary (ID 96):** EMA European Medicines Agency (*Rosmarini aetheroleum* monograph)")
md.append("- **Oak (ID 111):** EMA European Medicines Agency (*Quercus cortex* astringent monograph)")
md.append("")
md.append("---")
md.append("")
md.append("## 4. Contributing Verified Citations")
md.append("")
md.append("Independent botanists, pharmacognosists, and researchers are welcome to submit open-access peer-reviewed literature or pharmacopoeial monographs to substantiate any listed claim.")

md_text = "\n".join(md) + "\n"
with open('docs/KNOWN_LIMITATIONS.md', 'w', encoding='utf-8') as f:
    f.write(md_text)

print("docs/KNOWN_LIMITATIONS.md written successfully.")


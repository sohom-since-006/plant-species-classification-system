# 🌿 Plant Species Classification System

An ML-powered web app that identifies plant species from a photo of a leaf,
flower, fruit, or the whole plant. It returns the species with a calibrated
confidence score, similar-species suggestions with match percentages, a
Grad-CAM explanation, and full species details. Indian plants are the focus,
with global coverage.

> Developed by **[Team / Developer Names]**, **[College / Department]**

---

## ✨ Features

- Image upload, drag-and-drop, and camera capture
- Classification of ~130 species (about 70 Indian, 60 global)
- Calibrated confidence with Top-3 predictions
- Similar-species engine with ML %, Visual Match %, and Final Match %
- Grad-CAM heatmap showing what the model looked at
- "Not a plant / unknown" rejection and genus-level fallback
- Species library with search and filters
- Prediction history, batch classification, and feedback
- Model performance dashboard (accuracy, confusion matrix, calibration)
- Dark and light mode, parallax landing page, responsive UI

## 🧱 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, Vite, TypeScript, Tailwind CSS, Framer Motion |
| In-browser inference | ONNX Runtime Web |
| Training | Python 3.11, PyTorch, EfficientNet-B0 |
| Database / Auth / Storage | Supabase |
| Hosting / CI | Vercel, GitHub |

## 📁 Project Structure

```
plant-species-classification/
├── README.md
├── AGENTS.md
├── docs/                 # PRD, TRD, ARCHITECTURE, DESIGN, etc.
├── ml/                   # training pipeline
│   ├── species_list.csv
│   ├── 01_download_images.py
│   ├── 02_clean_dataset.py
│   ├── 03_train.py
│   ├── 04_evaluate.py
│   ├── 05_export_onnx.py
│   └── requirements.txt
├── web/                  # React website
│   ├── public/models/    # plant_model.onnx, labels.json
│   └── src/
└── supabase/             # schema.sql, seed.sql
```

## 🖥️ Requirements

- Windows 10/11 laptop with NVIDIA GPU (tested target: RTX 3050 6 GB)
- Latest NVIDIA driver
- Python 3.11, Node.js 20 LTS, Git, VS Code
- 25-30 GB free disk space
- Free accounts: GitHub, Vercel, Supabase, GBIF

## 🚀 Quick Start

### 1. Clone
```bash
git clone https://github.com/<your-username>/plant-species-classification.git
cd plant-species-classification
```

### 2. Train the model (one time)
```bash
cd ml
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt

python 01_download_images.py     # 1-3 hrs, 8-15 GB
python 02_clean_dataset.py
python 03_train.py               # 1-3 hrs on RTX 3050
python 04_evaluate.py
python 05_export_onnx.py         # writes plant_model.onnx + labels.json
```
Copy `plant_model.onnx` and `labels.json` into `web/public/models/`.

### 3. Set up Supabase
1. Create a new Supabase project.
2. Open the SQL editor and run `supabase/schema.sql`, then `supabase/seed.sql`.
3. Copy the project URL and anon key.

### 4. Run the website
```bash
cd web
npm install
cp .env.example .env
npm run dev
```

`.env`:
```
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 5. Deploy
1. Push the repo to GitHub.
2. Import it in Vercel, set the root directory to `web`.
3. Add the two environment variables.
4. Deploy. Every push to `main` redeploys automatically.

## 📊 Model Results

Filled in after training and evaluation.

| Metric | Value |
|---|---|
| Top-1 accuracy | TBD |
| Top-5 accuracy | TBD |
| Macro F1 | TBD |
| Calibration error (ECE) | TBD |
| Model size (ONNX) | TBD |

## 📚 Documentation

| File | Purpose |
|---|---|
| docs/PRD.md | Product requirements |
| docs/TRD.md | Technical requirements |
| docs/PRODUCT.md | Product vision and user flows |
| docs/ARCHITECTURE.md | System architecture |
| docs/BACKEND_SCHEMA.md | Database schema |
| docs/DESIGN.md | Visual design direction |
| docs/DESIGN_SYSTEM.md | Tokens and components |
| AGENTS.md | Rules for AI coding agents |
| docs/CODE_STYLE.md | Coding conventions |
| docs/SECURITY.md | Security practices |
| docs/IMPLEMENTATION_PLAN.md | Build order |
| docs/TESTING.md | Test strategy |
| docs/MasterPrompt.md | One prompt to build the whole site |

## ⚠️ Disclaimer

Predictions are probabilistic and can be wrong, especially for look-alike
species or low-quality photos. Medicinal and edibility information is
educational only and is not medical advice. Never consume a plant based on
this app's identification.

## 🙏 Acknowledgements

Training images are sourced from openly licensed, research-grade observations
on GBIF and iNaturalist. Photographer credits and licenses are logged in
`ml/dataset_credits.csv`.

## 📄 License

[Choose a license, e.g. MIT, for the code. Dataset images keep their
original licenses.]
```
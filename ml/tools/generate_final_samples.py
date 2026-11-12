import os
import json
import numpy as np
from PIL import Image
import onnxruntime as ort

def run():
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    models_dir = os.path.join(base_dir, "web", "public", "models")
    species_dir = os.path.join(base_dir, "web", "public", "species")
    model_path = os.path.join(models_dir, "plant_model.v1.onnx")
    labels_path = os.path.join(models_dir, "labels.json")
    meta_path = os.path.join(models_dir, "model_meta.json")
    centroids_path = os.path.join(models_dir, "centroids.v1.json")

    with open(labels_path, "r", encoding="utf-8") as f:
        labels = json.load(f)
    with open(meta_path, "r", encoding="utf-8") as f:
        meta = json.load(f)
    with open(centroids_path, "r", encoding="utf-8") as f:
        centroids = json.load(f)

    temp = meta.get("temperature", 0.7129)
    threshold = 0.35
    tau = meta.get("tau", 0.31)

    # 1. Prepare sample files
    # Tulsi: from 0.webp
    im_tulsi = Image.open(os.path.join(species_dir, "0.webp")).convert("RGB")
    tulsi_sample_path = os.path.join(species_dir, "sample_tulsi.webp")
    im_tulsi.save(tulsi_sample_path, "WEBP", quality=85)

    # Hibiscus: from raw/20_hibiscus_rosa_sinensis/123.jpg
    hib_src = os.path.join(base_dir, "ml", "data", "raw", "20_hibiscus_rosa_sinensis", "123.jpg")
    im_hib = Image.open(hib_src).convert("RGB")
    w, h = im_hib.size
    new_h = int(round(h * (640.0 / w)))
    im_hib = im_hib.resize((640, new_h), Image.Resampling.LANCZOS)
    hib_sample_path = os.path.join(species_dir, "sample_hibiscus.webp")
    im_hib.save(hib_sample_path, "WEBP", quality=85)

    # Sweet Basil: from raw/97_ocimum_basilicum/227.jpg
    basil_src = os.path.join(base_dir, "ml", "data", "raw", "97_ocimum_basilicum", "227.jpg")
    im_basil = Image.open(basil_src).convert("RGB")
    w, h = im_basil.size
    new_h = int(round(h * (640.0 / w)))
    im_basil = im_basil.resize((640, new_h), Image.Resampling.LANCZOS)
    basil_sample_path = os.path.join(species_dir, "sample_sweet_basil.webp")
    im_basil.save(basil_sample_path, "WEBP", quality=85)

    # Pebble: from pebble_test.jpg (downloaded earlier from Wikimedia Commons)
    pebble_src = os.path.join(base_dir, "ml", "tools", "pebble_test.jpg")
    im_pebble = Image.open(pebble_src).convert("RGB")
    w, h = im_pebble.size
    new_h = int(round(h * (640.0 / w)))
    im_pebble = im_pebble.resize((640, new_h), Image.Resampling.LANCZOS)
    pebble_sample_path = os.path.join(species_dir, "sample_pebble.webp")
    im_pebble.save(pebble_sample_path, "WEBP", quality=85)
    # Also save as sample_pebble.png for backwards-compat
    im_pebble.save(os.path.join(species_dir, "sample_pebble.png"), "PNG")

    session = ort.InferenceSession(model_path, providers=["CPUExecutionProvider"])
    mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
    std = np.array([0.229, 0.224, 0.225], dtype=np.float32)

    def evaluate(img_path):
        img = Image.open(img_path).convert("RGB")
        w, h = img.size
        if w < h:
            new_w = 256
            new_h = int(round(h * 256 / w))
        else:
            new_h = 256
            new_w = int(round(w * 256 / h))
        img = img.resize((new_w, new_h), Image.Resampling.BILINEAR)
        left = (new_w - 224) // 2
        top = (new_h - 224) // 2
        img = img.crop((left, top, left + 224, top + 224))
        arr = np.array(img, dtype=np.float32) / 255.0
        arr = (arr - mean) / std
        arr = np.transpose(arr, (2, 0, 1))
        inp = np.expand_dims(arr, axis=0)

        outputs = session.run(None, {"input": inp})
        logits = outputs[0][0]
        embedding = outputs[1][0] if len(outputs) > 1 else None

        scaled = logits / temp
        exp_l = np.exp(scaled - np.max(scaled))
        probs = exp_l / np.sum(exp_l)
        top_indices = np.argsort(probs)[::-1][:5]
        top1_id = top_indices[0]
        top1_prob = float(probs[top1_id])

        c = np.array(centroids[str(top1_id)], dtype=np.float32)
        e = embedding / (np.linalg.norm(embedding) + 1e-9)
        c = c / (np.linalg.norm(c) + 1e-9)
        max_cos = float(np.dot(e, c))

        is_unknown = (top1_prob < threshold) or (max_cos < tau)
        if is_unknown or top1_prob < 0.35:
            tier = "unknown"
        elif top1_prob > 0.85:
            tier = "high"
        elif top1_prob >= 0.60:
            tier = "medium"
        else:
            tier = "low"

        results = []
        for idx in top_indices[:3]:
            results.append({
                "species_id": int(idx),
                "common_name": labels[str(idx)]["common_name"],
                "scientific_name": labels[str(idx)]["scientific_name"],
                "prob": float(probs[idx]),
                "percent": f"{float(probs[idx])*100:.1f}%"
            })

        return {
            "tier": tier,
            "is_unknown": is_unknown,
            "top1_prob": top1_prob,
            "max_cos": max_cos,
            "top3": results
        }

    samples = [
        ("Tulsi (High Confidence)", tulsi_sample_path),
        ("Hibiscus (Medium Confidence)", hib_sample_path),
        ("Sweet Basil (Low Confidence)", basil_sample_path),
        ("Pebble (Non-Plant / Rejected)", pebble_sample_path),
    ]

    print("REAL ONNX MODEL OUTPUTS ON FINAL SAMPLE IMAGES:")
    for label, sp in samples:
        res = evaluate(sp)
        print(f"\nSpecimen: {label}")
        print(f"  Path: {os.path.basename(sp)}")
        print(f"  Tier: {res['tier']} (unknown={res['is_unknown']})")
        print(f"  Top-1 Calibrated Probability: {res['top1_prob']:.4f}")
        print(f"  Centroid Cosine Similarity: {res['max_cos']:.4f}")
        print("  Top-3 Predictions (from labels.json):")
        for i, pred in enumerate(res["top3"]):
            print(f"    #{i+1}: {pred['common_name']} ({pred['scientific_name']}) — {pred['percent']}")

if __name__ == "__main__":
    run()

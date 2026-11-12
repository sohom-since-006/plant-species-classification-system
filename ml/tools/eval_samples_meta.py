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

    temp = meta["temperature"]
    threshold = meta["threshold"]  # 0.57
    tau = meta["tau"]  # 0.31
    tier_high = meta["tierBoundaries"]["high"]  # 0.85
    tier_medium = meta["tierBoundaries"]["medium"]  # 0.60

    print(f"Meta configuration: threshold={threshold}, tau={tau}, temp={temp}, high={tier_high}, medium={tier_medium}")

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
        if is_unknown:
            tier = "unknown"
        elif top1_prob > tier_high:
            tier = "high"
        elif top1_prob >= tier_medium:
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
        ("Tulsi (High Confidence)", os.path.join(species_dir, "sample_tulsi.webp")),
        ("Hibiscus (Medium Confidence)", os.path.join(species_dir, "sample_hibiscus.webp")),
        ("Parthenium (Low Confidence)", os.path.join(species_dir, "sample_parthenium.webp")),
        ("Sweet Basil (Unsure / Below Threshold)", os.path.join(species_dir, "sample_sweet_basil.webp")),
        ("Pebble (Non-Plant / Rejected)", os.path.join(species_dir, "sample_pebble.webp")),
    ]

    print("\nEVALUATING EXISTING 4 SAMPLES WITH METADATA THRESHOLDS (prob_threshold=0.57, tau=0.31):")
    for name, p in samples:
        res = evaluate(p)
        print(f"\nSpecimen: {name}")
        print(f"  Tier: {res['tier']} (unknown={res['is_unknown']})")
        print(f"  Top-1 Calibrated Probability: {res['top1_prob']:.4f} ({res['top1_prob']*100:.1f}%)")
        print(f"  Centroid Cosine Similarity: {res['max_cos']:.4f}")
        for i, pred in enumerate(res["top3"]):
            print(f"    #{i+1}: {pred['common_name']} ({pred['scientific_name']}) - {pred['percent']}")

if __name__ == "__main__":
    run()

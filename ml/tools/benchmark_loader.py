"""benchmark_loader.py - Profile individual stages of the training pipeline.

Measures:
  1. Raw JPEG reading and decoding (200 images, single process)
  2. Model forward + backward with AMP on synthetic tensors (50 steps after 10 warm-up steps, batch_size=32)
  3. DataLoader only (60 batches after 5 warm-up batches) with num_workers = 0, 4, and 6
"""

from __future__ import annotations

import csv
import sys
import time
from pathlib import Path
from typing import Any

import torch
from PIL import Image
from torch import nn
from torch.utils.data import DataLoader, Dataset
from torchvision import transforms

# Add project root and ml directory to sys.path
SCRIPT_DIR = Path(__file__).resolve().parent
ML_DIR = SCRIPT_DIR.parent
if str(ML_DIR) not in sys.path:
    sys.path.insert(0, str(ML_DIR))

from model import TRD_MEAN, TRD_STD, PlantClassifier


class BenchmarkPlantDataset(Dataset[tuple[torch.Tensor, int]]):
    """Dataset loading images with the TRD training augmentation recipe."""

    def __init__(
        self,
        records: list[dict[str, Any]],
        data_dir: Path,
        transform: transforms.Compose | None = None,
    ) -> None:
        self.records = records
        self.data_dir = data_dir
        self.transform = transform

    def __len__(self) -> int:
        return len(self.records)

    def __getitem__(self, idx: int) -> tuple[torch.Tensor, int]:
        rec = self.records[idx]
        file_path = self.data_dir / rec["file"]
        try:
            with Image.open(file_path) as img:
                image = img.convert("RGB")
        except (OSError, ValueError):
            image = Image.new("RGB", (224, 224), (0, 0, 0))

        if self.transform is not None:
            tensor = self.transform(image)
        else:
            tensor = transforms.functional.to_tensor(image)

        return tensor, rec.get("class_idx", 0)


def build_trd_train_transform() -> transforms.Compose:
    """Exact training transform pipeline per TRD Section 4 & 5."""
    return transforms.Compose(
        [
            transforms.RandomResizedCrop(224, scale=(0.5, 1.0)),
            transforms.RandomHorizontalFlip(p=0.5),
            transforms.RandomRotation(degrees=15),
            transforms.ColorJitter(
                brightness=0.2, contrast=0.2, saturation=0.2, hue=0.05
            ),
            transforms.RandomApply(
                [transforms.GaussianBlur(kernel_size=(5, 5), sigma=(0.1, 2.0))],
                p=0.2,
            ),
            transforms.RandomPerspective(distortion_scale=0.2, p=0.3),
            transforms.ToTensor(),
            transforms.Normalize(mean=TRD_MEAN, std=TRD_STD),
            transforms.RandomErasing(
                p=0.2, scale=(0.02, 0.2), ratio=(0.3, 3.3), value="random"
            ),
        ]
    )


def bench_decoding(
    train_files: list[Path], num_images: int = 200, timeout_sec: float = 180.0
) -> float:
    """Benchmark raw JPEG reading and decoding in a single process."""
    print(
        f"\n[1/3] Benchmarking raw JPEG decoding ({num_images} images)...", flush=True
    )
    warmup_files = train_files[:10]
    test_files = train_files[10 : 10 + num_images]

    # Warm-up
    for f in warmup_files:
        with Image.open(f) as img:
            img.convert("RGB").load()

    start = time.time()
    count = 0
    for f in test_files:
        if time.time() - start > timeout_sec:
            print(f"TIMEOUT in decoding after {count} images!", flush=True)
            break
        with Image.open(f) as img:
            img.convert("RGB").load()
        count += 1

    elapsed = time.time() - start
    speed = count / elapsed if elapsed > 0 else 0.0
    print(
        f"  -> Decoded {count} images in {elapsed:.2f}s: {speed:.2f} img/s", flush=True
    )
    return speed


def bench_model_only(
    device: torch.device,
    channels_last: bool = False,
    num_steps: int = 50,
    warmup_steps: int = 10,
    batch_size: int = 32,
    timeout_sec: float = 180.0,
) -> float:
    """Benchmark Model forward + backward + optimizer with AMP on synthetic tensors."""
    layout_name = "channels_last" if channels_last else "contiguous (NCHW)"
    print(
        f"\n[2/3] Benchmarking Model only ({layout_name}, {num_steps} steps, batch_size={batch_size})...",
        flush=True,
    )
    model = PlantClassifier(num_classes=112, pretrained=False).to(device)
    if channels_last:
        model = model.to(memory_format=torch.channels_last)
    model.train()

    optimizer = torch.optim.AdamW(model.parameters(), lr=1e-3)
    criterion = nn.CrossEntropyLoss(label_smoothing=0.1)
    scaler = torch.amp.GradScaler(device.type, enabled=device.type == "cuda")

    x = torch.randn(batch_size, 3, 224, 224, device=device)
    if channels_last:
        x = x.to(memory_format=torch.channels_last)
    y = torch.randint(0, 112, (batch_size,), device=device)

    # Warm-up
    for _ in range(warmup_steps):
        optimizer.zero_grad(set_to_none=True)
        with torch.amp.autocast(device_type=device.type, dtype=torch.float16):
            out = model(x)
            loss = criterion(out, y)
        scaler.scale(loss).backward()
        scaler.step(optimizer)
        scaler.update()

    if device.type == "cuda":
        torch.cuda.synchronize()

    start = time.time()
    steps_done = 0
    for _ in range(num_steps):
        if time.time() - start > timeout_sec:
            print(f"TIMEOUT in model benchmark after {steps_done} steps!", flush=True)
            break
        optimizer.zero_grad(set_to_none=True)
        with torch.amp.autocast(device_type=device.type, dtype=torch.float16):
            out = model(x)
            loss = criterion(out, y)
        scaler.scale(loss).backward()
        scaler.step(optimizer)
        scaler.update()
        steps_done += 1

    if device.type == "cuda":
        torch.cuda.synchronize()

    elapsed = time.time() - start
    images_processed = steps_done * batch_size
    speed = images_processed / elapsed if elapsed > 0 else 0.0
    print(
        f"  -> {steps_done} steps ({images_processed} images) in {elapsed:.2f}s: {speed:.2f} img/s "
        f"({(elapsed / max(1, steps_done)) * 1000:.1f} ms/step)",
        flush=True,
    )
    return speed


def bench_dataloader(
    dataset: Dataset[Any],
    num_workers: int,
    batch_size: int = 32,
    num_batches: int = 60,
    warmup_batches: int = 5,
    timeout_sec: float = 180.0,
) -> float:
    """Benchmark DataLoader throughput for a specific num_workers configuration."""
    print(
        f"\n[3/3] Benchmarking DataLoader (num_workers={num_workers}, {num_batches} batches, batch_size={batch_size})...",
        flush=True,
    )
    is_cuda = torch.cuda.is_available()
    loader = DataLoader(
        dataset,
        batch_size=batch_size,
        shuffle=True,
        num_workers=num_workers,
        pin_memory=is_cuda,
        persistent_workers=(num_workers > 0),
        drop_last=True,
    )

    t0_start = time.time()
    it = iter(loader)

    # Warm-up batches
    print(f"  Warm-up ({warmup_batches} batches)...", flush=True)
    for _ in range(warmup_batches):
        if time.time() - t0_start > timeout_sec:
            print("TIMEOUT during DataLoader warm-up!", flush=True)
            return 0.0
        next(it)

    print("  Measuring...", flush=True)
    start = time.time()
    batches_done = 0
    for _ in range(num_batches):
        if time.time() - start > timeout_sec:
            print(f"TIMEOUT in DataLoader after {batches_done} batches!", flush=True)
            break
        try:
            next(it)
        except StopIteration:
            it = iter(loader)
            next(it)
        batches_done += 1

    elapsed = time.time() - start
    images_processed = batches_done * batch_size
    speed = images_processed / elapsed if elapsed > 0 else 0.0
    print(
        f"  -> num_workers={num_workers}: {batches_done} batches ({images_processed} images) in {elapsed:.2f}s: {speed:.2f} img/s",
        flush=True,
    )
    return speed


def main() -> None:
    data_dir = ML_DIR / "data"
    splits_csv = data_dir / "splits.csv"

    if not splits_csv.exists():
        print(f"Error: {splits_csv} not found!", file=sys.stderr)
        sys.exit(1)

    # Read training records
    train_records = []
    with open(splits_csv, mode="r", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            if r["split"] == "train":
                train_records.append(
                    {
                        "file": r["file"],
                        "class_idx": int(r["species_id"]),
                    }
                )

    train_files = [data_dir / r["file"] for r in train_records]
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    print("================ SYSTEM & HARDWARE INFO ================")
    print(f"PyTorch version: {torch.__version__}")
    print(f"CUDA available: {torch.cuda.is_available()}")
    if torch.cuda.is_available():
        print(f"GPU device: {torch.cuda.get_device_name(0)}")
    print(f"Dataset train images: {len(train_records)}")
    print("========================================================\n", flush=True)

    # 1. Decoding benchmark (200 images)
    speed_decoding = bench_decoding(train_files, num_images=200, timeout_sec=180.0)

    # 2. Model only benchmark (50 steps after 10 warm-up)
    # Also test both contiguous and channels_last to illuminate the performance difference
    speed_model_contiguous = bench_model_only(
        device,
        channels_last=False,
        num_steps=50,
        warmup_steps=10,
        batch_size=32,
        timeout_sec=180.0,
    )
    speed_model_channels_last = bench_model_only(
        device,
        channels_last=True,
        num_steps=50,
        warmup_steps=10,
        batch_size=32,
        timeout_sec=180.0,
    )

    # 3. DataLoader only benchmark (num_workers = 0, 4, 6; 60 batches after 5 warm-up)
    transform = build_trd_train_transform()
    dataset = BenchmarkPlantDataset(train_records, data_dir, transform=transform)

    speed_loader_0 = bench_dataloader(
        dataset, num_workers=0, batch_size=32, num_batches=60, warmup_batches=5
    )
    speed_loader_4 = bench_dataloader(
        dataset, num_workers=4, batch_size=32, num_batches=60, warmup_batches=5
    )
    speed_loader_6 = bench_dataloader(
        dataset, num_workers=6, batch_size=32, num_batches=60, warmup_batches=5
    )

    print("\n================ FINAL BENCHMARK SUMMARY ================")
    print(
        f"1. Raw JPEG Decoding (200 images, 1 process):        {speed_decoding:.2f} img/s"
    )
    print(
        f"2. Model Only Forward+Backward (Contiguous / NCHW): {speed_model_contiguous:.2f} img/s"
    )
    print(
        f"   Model Only Forward+Backward (channels_last):      {speed_model_channels_last:.2f} img/s"
    )
    print(
        f"3. DataLoader Only (num_workers = 0):                {speed_loader_0:.2f} img/s"
    )
    print(
        f"   DataLoader Only (num_workers = 4):                {speed_loader_4:.2f} img/s"
    )
    print(
        f"   DataLoader Only (num_workers = 6):                {speed_loader_6:.2f} img/s"
    )
    print("=========================================================\n", flush=True)


if __name__ == "__main__":
    main()

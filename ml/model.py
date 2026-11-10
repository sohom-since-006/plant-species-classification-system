"""model.py - EfficientNet-B0 architecture for plant species classification.

Shared by training (03_train.py), evaluation (04_evaluate.py), and ONNX export (05_export_onnx.py).
Constructs an EfficientNet-B0 backbone via timm, pretrained on ImageNet, with a classification
head for N plant species. Supports standard forward (logits) and multi-output forward returning
(logits, 1280-d embedding, Bx1280x7x7 spatial feature map).
"""

from __future__ import annotations

import logging
from typing import Any

import timm
import torch
from torch import nn

logger = logging.getLogger("model")

# ImageNet normalization statistics per TRD Section 5
TRD_MEAN: tuple[float, float, float] = (0.485, 0.456, 0.406)
TRD_STD: tuple[float, float, float] = (0.229, 0.224, 0.225)
INPUT_SIZE: tuple[int, int] = (224, 224)
EMBEDDING_DIM: int = 1280


class PlantClassifier(nn.Module):
    """EfficientNet-B0 botanical species classifier with representation extraction."""

    def __init__(
        self,
        num_classes: int = 112,
        pretrained: bool = True,
        drop_rate: float = 0.2,
    ) -> None:
        super().__init__()
        self.num_classes = num_classes

        # Instantiate timm EfficientNet-B0
        self.backbone = timm.create_model(
            "efficientnet_b0",
            pretrained=pretrained,
            num_classes=num_classes,
            drop_rate=drop_rate,
        )

        # Verify pretrained dataset configuration matches TRD specification
        data_config = timm.data.resolve_model_data_config(self.backbone)
        self.mean: tuple[float, float, float] = tuple(data_config["mean"])  # type: ignore[assignment]
        self.std: tuple[float, float, float] = tuple(data_config["std"])  # type: ignore[assignment]

        assert (
            self.mean == TRD_MEAN
        ), f"timm mean {self.mean} differs from TRD requirement {TRD_MEAN}"
        assert (
            self.std == TRD_STD
        ), f"timm std {self.std} differs from TRD requirement {TRD_STD}"

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """Standard classification forward pass returning class logits.

        Args:
            x: Input tensor of shape (B, 3, 224, 224).

        Returns:
            Class logits of shape (B, num_classes).
        """
        return self.backbone(x)

    def forward_features_and_embedding(
        self, x: torch.Tensor
    ) -> tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
        """Multi-output forward pass for inference, embedding centroids, and attention CAMs.

        Args:
            x: Input tensor of shape (B, 3, 224, 224).

        Returns:
            Tuple of:
              - logits: Tensor of shape (B, num_classes)
              - embedding: Global average pooled 1280-d representation tensor of shape (B, 1280)
              - features: Pre-pooling convolutional spatial feature map of shape (B, 1280, 7, 7)
        """
        # Extract pre-pooling spatial feature map (B, 1280, 7, 7)
        features: torch.Tensor = self.backbone.forward_features(x)

        # Global average pool to 1280-d representation embedding
        embedding: torch.Tensor = self.backbone.forward_head(features, pre_logits=True)

        # Linear classifier projection to logits (B, num_classes)
        classifier = self.backbone.get_classifier()
        logits: torch.Tensor = classifier(embedding)

        return logits, embedding, features

    def freeze_backbone(self) -> None:
        """Freeze all backbone feature layers, keeping only the classification head trainable."""
        for param in self.backbone.parameters():
            param.requires_grad = False
        classifier = self.backbone.get_classifier()
        for param in classifier.parameters():
            param.requires_grad = True

    def unfreeze_backbone(self) -> None:
        """Unfreeze all model parameters for full network fine-tuning."""
        for param in self.backbone.parameters():
            param.requires_grad = True

    def get_param_groups(
        self,
        backbone_lr: float,
        head_lr: float,
        weight_decay: float = 1e-2,
    ) -> list[dict[str, Any]]:
        """Construct AdamW parameter groups with differential learning rates for backbone and head."""
        classifier_params: list[torch.nn.Parameter] = list(
            self.backbone.get_classifier().parameters()
        )
        classifier_ids = set(map(id, classifier_params))
        backbone_params = [
            p
            for p in self.backbone.parameters()
            if id(p) not in classifier_ids and p.requires_grad
        ]

        param_groups: list[dict[str, Any]] = []
        if backbone_params:
            param_groups.append(
                {
                    "params": backbone_params,
                    "lr": backbone_lr,
                    "weight_decay": weight_decay,
                }
            )
        if classifier_params:
            param_groups.append(
                {
                    "params": classifier_params,
                    "lr": head_lr,
                    "weight_decay": weight_decay,
                }
            )
        return param_groups

"""
Script: 02_run_eda.py
Executes Exploratory Data Analysis (EDA) on the simulated 50-species botanical dataset.
Computes summary metrics, correlation matrices, aspect ratio distributions,
and generates publication-quality figures saved to docs/images/decision_tree/ and data/traits/eda/.
"""

import json
import os
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns

# Configure aesthetic styling matching botanical theme
plt.style.use('seaborn-v0_8-whitegrid')
plt.rcParams['font.family'] = 'sans-serif'
plt.rcParams['font.size'] = 10
plt.rcParams['axes.titlesize'] = 12
plt.rcParams['axes.labelsize'] = 10

PALETTE = ["#10b981", "#059669", "#047857", "#065f46", "#34d399", "#6ee7b7", "#a7f3d0"]

def run_eda():
    df = pd.read_csv('data/traits/simulated_plant_traits_clean.csv')
    os.makedirs('docs/images/decision_tree', exist_ok=True)
    os.makedirs('data/traits/eda', exist_ok=True)
    
    print("=" * 60)
    print("EXPLORATORY DATA ANALYSIS (50-SPECIES BOTANICAL DATASET)")
    print("=" * 60)
    
    # 1. Dataset Dimensions & Basic Stats
    n_samples, n_features = df.shape
    numeric_cols = ['leaf_length_cm', 'leaf_width_cm', 'plant_height_m', 'petal_count']
    desc_stats = df[numeric_cols].describe().to_dict()
    
    print(f"Total Specimen Records: {n_samples}")
    print(f"Total Unique Species: {df['species_id'].nunique()}")
    print("\nNumeric Descriptive Statistics:")
    print(df[numeric_cols].describe())
    
    # Aspect Ratio
    df['aspect_ratio'] = df['leaf_length_cm'] / df['leaf_width_cm']
    
    # 2. Figure 1: Growth Habit Distribution
    plt.figure(figsize=(9, 4.5))
    habit_counts = df.groupby('plant_growth_habit')['species_id'].nunique().sort_values(ascending=False)
    ax = sns.barplot(x=habit_counts.index, y=habit_counts.values, palette='Greens_r')
    plt.title('Figure 1: Species Diversity Across Botanical Growth Habits (N=50 Species)', fontweight='bold', pad=12)
    plt.xlabel('Plant Growth Habit')
    plt.ylabel('Number of Sourced Species')
    for p in ax.patches:
        ax.annotate(f'{int(p.get_height())}', (p.get_x() + p.get_width() / 2., p.get_height()),
                    ha='center', va='bottom', fontsize=10, xytext=(0, 3), textcoords='offset points')
    plt.tight_layout()
    plt.savefig('docs/images/decision_tree/01_growth_habit_distribution.png', dpi=200)
    plt.savefig('data/traits/eda/01_growth_habit_distribution.png', dpi=200)
    plt.close()
    
    # 3. Figure 2: Leaf Dimensions & Aspect Ratio Boxplot
    plt.figure(figsize=(10, 5))
    plt.subplot(1, 2, 1)
    sns.scatterplot(
        data=df[df['leaf_length_cm'] < 100],  # filter giant palms for clear scale
        x='leaf_length_cm', y='leaf_width_cm', hue='plant_growth_habit',
        alpha=0.6, s=25, palette='tab10'
    )
    plt.title('(A) Leaf Length vs. Width Scatter', fontweight='bold')
    plt.xlabel('Leaf Length (cm)')
    plt.ylabel('Leaf Width (cm)')
    
    plt.subplot(1, 2, 2)
    order = df.groupby('plant_growth_habit')['aspect_ratio'].median().sort_values().index
    sns.boxplot(data=df[df['aspect_ratio'] < 20], x='plant_growth_habit', y='aspect_ratio', order=order, palette='Greens')
    plt.xticks(rotation=45)
    plt.title('(B) Aspect Ratio (L/W) by Habit', fontweight='bold')
    plt.xlabel('Growth Habit')
    plt.ylabel('Length / Width Ratio')
    plt.suptitle('Figure 2: Leaf Morphometrics and Aspect Ratio Scaling', fontweight='bold', fontsize=13)
    plt.tight_layout()
    plt.savefig('docs/images/decision_tree/02_leaf_dimensions_aspect_ratio.png', dpi=200)
    plt.savefig('data/traits/eda/02_leaf_dimensions_aspect_ratio.png', dpi=200)
    plt.close()
    
    # 4. Figure 3: Flower Colors & Petal Count Distribution
    plt.figure(figsize=(10, 4.5))
    plt.subplot(1, 2, 1)
    fl_counts = df['flower_color'].fillna('unobserved').value_counts()
    sns.barplot(x=fl_counts.values, y=fl_counts.index, palette='Spectral')
    plt.title('(A) Observed Flower Color Frequency', fontweight='bold')
    plt.xlabel('Sample Observations Count')
    
    plt.subplot(1, 2, 2)
    sns.histplot(df['petal_count'], bins=15, discrete=True, color='#059669', edgecolor='black')
    plt.title('(B) Petal Count Distribution', fontweight='bold')
    plt.xlabel('Petal Count (0 = apetalous/composite/unobserved)')
    plt.ylabel('Frequency')
    plt.suptitle('Figure 3: Floral Morphology and Color Polymorphism', fontweight='bold', fontsize=13)
    plt.tight_layout()
    plt.savefig('docs/images/decision_tree/03_flower_color_and_petal_counts.png', dpi=200)
    plt.savefig('data/traits/eda/03_flower_color_and_petal_counts.png', dpi=200)
    plt.close()
    
    # 5. Figure 4: Feature Correlation Heatmap
    plt.figure(figsize=(6, 5))
    corr = df[['leaf_length_cm', 'leaf_width_cm', 'plant_height_m', 'petal_count', 'aspect_ratio']].corr()
    sns.heatmap(corr, annot=True, cmap='BrBG', vmin=-1, vmax=1, fmt='.2f', linewidths=0.5)
    plt.title('Figure 4: Pearson Correlation Between Continuous Phenotypic Traits', fontweight='bold', pad=12)
    plt.tight_layout()
    plt.savefig('docs/images/decision_tree/04_feature_correlation_heatmap.png', dpi=200)
    plt.savefig('data/traits/eda/04_feature_correlation_heatmap.png', dpi=200)
    plt.close()
    
    # 6. Figure 5: Look-Alike Diagnostic Separability
    # Cluster A: Lamiaceae Herbs (Tulsi vs Mint vs Sweet Basil)
    lamiaceae = df[df['common_name'].isin(['Tulsi', 'Mint', 'Sweet basil'])]
    plt.figure(figsize=(10, 4.5))
    plt.subplot(1, 2, 1)
    sns.scatterplot(
        data=lamiaceae, x='leaf_length_cm', y='leaf_width_cm',
        hue='common_name', style='aroma_of_crushed_leaves', s=50, alpha=0.8
    )
    plt.title('(A) Lamiaceae Look-Alikes: Size & Scent Overlap', fontweight='bold')
    plt.xlabel('Leaf Length (cm)')
    plt.ylabel('Leaf Width (cm)')
    
    # Cluster B: Moraceae Trees (Peepal vs Banyan vs Rubber plant)
    moraceae = df[df['common_name'].isin(['Peepal', 'Banyan', 'Rubber plant'])]
    plt.subplot(1, 2, 2)
    sns.scatterplot(
        data=moraceae, x='leaf_length_cm', y='leaf_width_cm',
        hue='common_name', style='leaf_shape', s=50, alpha=0.8
    )
    plt.title('(B) Moraceae Look-Alikes: Dimension & Leaf Shape', fontweight='bold')
    plt.xlabel('Leaf Length (cm)')
    plt.ylabel('Leaf Width (cm)')
    plt.suptitle('Figure 5: Deliberate Look-Alike Clusters Challenging Decision Boundaries', fontweight='bold', fontsize=13)
    plt.tight_layout()
    plt.savefig('docs/images/decision_tree/05_lookalike_taxa_separability.png', dpi=200)
    plt.savefig('data/traits/eda/05_lookalike_taxa_separability.png', dpi=200)
    plt.close()
    
    # 7. Export summary JSON
    eda_summary = {
        "n_samples": int(n_samples),
        "n_species": int(df['species_id'].nunique()),
        "growth_habit_distribution": habit_counts.to_dict(),
        "numeric_stats": {
            col: {
                "mean": round(float(df[col].mean()), 2),
                "std": round(float(df[col].std()), 2),
                "median": round(float(df[col].median()), 2),
                "min": round(float(df[col].min()), 2),
                "max": round(float(df[col].max()), 2)
            } for col in numeric_cols
        },
        "missing_counts": df.isna().sum()[df.isna().sum() > 0].to_dict(),
        "generated_figures": [
            "01_growth_habit_distribution.png",
            "02_leaf_dimensions_aspect_ratio.png",
            "03_flower_color_and_petal_counts.png",
            "04_feature_correlation_heatmap.png",
            "05_lookalike_taxa_separability.png"
        ]
    }
    
    with open('data/traits/eda/eda_summary.json', 'w', encoding='utf-8') as f:
        json.dump(eda_summary, f, indent=2)
    print("EDA completed successfully. All 5 figures and eda_summary.json generated.")

if __name__ == '__main__':
    run_eda()

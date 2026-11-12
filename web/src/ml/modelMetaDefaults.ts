import modelMeta from '../../public/models/model_meta.json';

export interface ModelMetadataShape {
  version: string;
  numSpecies: number;
  inputSize: number;
  resize: number;
  crop: number;
  mean: number[];
  std: number[];
  temperature: number;
  tau: number;
  threshold: number;
  tierBoundaries: {
    high: number;
    medium: number;
  };
  mlWeight: number;
  visualWeight: number;
  genusBonus: number;
  camWeightsShape: number[];
  modelFile: string;
  camWeightsFile: string;
  centroidsFile: string;
  labelsFile: string;
  metricsFile: string;
}

export const defaultModelMeta: ModelMetadataShape = modelMeta as unknown as ModelMetadataShape;

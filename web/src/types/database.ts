export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type PlantType =
  | 'herb'
  | 'shrub'
  | 'tree'
  | 'climber'
  | 'grass'
  | 'succulent'
  | 'aquatic'
  | 'crop'
  | 'epiphyte';

export type Origin = 'indian' | 'global' | 'both';
export type Tier = 'high' | 'medium' | 'low' | 'unknown';

export interface Database {
  public: {
    Tables: {
      species: {
        Row: {
          id: number;
          slug: string;
          common_name: string;
          scientific_name: string;
          family: string;
          genus: string;
          plant_type: PlantType;
          origin: Origin;
          names_hindi: string | null;
          names_bengali: string | null;
          other_names: string[];
          description: string;
          identifying_features: string[];
          habitat: string | null;
          distribution: string | null;
          uses: string[];
          care_tips: string[];
          toxicity_note: string | null;
          is_toxic: boolean;
          fun_fact: string | null;
          reference_images: string[];
          image_credit: Json | null;
          wikipedia_url: string | null;
          created_at: string;
        };
        Insert: {
          id: number;
          slug: string;
          common_name: string;
          scientific_name: string;
          family: string;
          genus: string;
          plant_type: PlantType;
          origin: Origin;
          names_hindi?: string | null;
          names_bengali?: string | null;
          other_names?: string[];
          description: string;
          identifying_features?: string[];
          habitat?: string | null;
          distribution?: string | null;
          uses?: string[];
          care_tips?: string[];
          toxicity_note?: string | null;
          is_toxic?: boolean;
          fun_fact?: string | null;
          reference_images?: string[];
          image_credit?: Json | null;
          wikipedia_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          slug?: string;
          common_name?: string;
          scientific_name?: string;
          family?: string;
          genus?: string;
          plant_type?: PlantType;
          origin?: Origin;
          names_hindi?: string | null;
          names_bengali?: string | null;
          other_names?: string[];
          description?: string;
          identifying_features?: string[];
          habitat?: string | null;
          distribution?: string | null;
          uses?: string[];
          care_tips?: string[];
          toxicity_note?: string | null;
          is_toxic?: boolean;
          fun_fact?: string | null;
          reference_images?: string[];
          image_credit?: Json | null;
          wikipedia_url?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      species_look_alikes: {
        Row: {
          species_id: number;
          look_alike_id: number;
          how_to_tell_apart: string;
        };
        Insert: {
          species_id: number;
          look_alike_id: number;
          how_to_tell_apart: string;
        };
        Update: {
          species_id?: number;
          look_alike_id?: number;
          how_to_tell_apart?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'species_look_alikes_species_id_fkey';
            columns: ['species_id'];
            isOneToOne: false;
            referencedRelation: 'species';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'species_look_alikes_look_alike_id_fkey';
            columns: ['look_alike_id'];
            isOneToOne: false;
            referencedRelation: 'species';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          theme: 'dark' | 'light';
          created_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          theme?: 'dark' | 'light';
          created_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          theme?: 'dark' | 'light';
          created_at?: string;
        };
        Relationships: [];
      };
      model_versions: {
        Row: {
          version: string;
          top1: number | null;
          top5: number | null;
          macro_f1: number | null;
          ece: number | null;
          num_species: number | null;
          trained_at: string | null;
          notes: string | null;
        };
        Insert: {
          version: string;
          top1?: number | null;
          top5?: number | null;
          macro_f1?: number | null;
          ece?: number | null;
          num_species?: number | null;
          trained_at?: string | null;
          notes?: string | null;
        };
        Update: {
          version?: string;
          top1?: number | null;
          top5?: number | null;
          macro_f1?: number | null;
          ece?: number | null;
          num_species?: number | null;
          trained_at?: string | null;
          notes?: string | null;
        };
        Relationships: [];
      };
      predictions: {
        Row: {
          id: string;
          user_id: string;
          species_id: number | null;
          confidence: number;
          tier: Tier;
          top3: Json;
          similar: Json;
          image_path: string | null;
          model_version: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          species_id?: number | null;
          confidence: number;
          tier: Tier;
          top3: Json;
          similar?: Json;
          image_path?: string | null;
          model_version?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          species_id?: number | null;
          confidence?: number;
          tier?: Tier;
          top3?: Json;
          similar?: Json;
          image_path?: string | null;
          model_version?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'predictions_species_id_fkey';
            columns: ['species_id'];
            isOneToOne: false;
            referencedRelation: 'species';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'predictions_model_version_fkey';
            columns: ['model_version'];
            isOneToOne: false;
            referencedRelation: 'model_versions';
            referencedColumns: ['version'];
          },
        ];
      };
      feedback: {
        Row: {
          id: string;
          user_id: string | null;
          predicted_species: number | null;
          correct_species: number | null;
          was_correct: boolean;
          comment: string | null;
          confidence: number | null;
          model_version: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          predicted_species?: number | null;
          correct_species?: number | null;
          was_correct: boolean;
          comment?: string | null;
          confidence?: number | null;
          model_version?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          predicted_species?: number | null;
          correct_species?: number | null;
          was_correct?: boolean;
          comment?: string | null;
          confidence?: number | null;
          model_version?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'feedback_predicted_species_fkey';
            columns: ['predicted_species'];
            isOneToOne: false;
            referencedRelation: 'species';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'feedback_correct_species_fkey';
            columns: ['correct_species'];
            isOneToOne: false;
            referencedRelation: 'species';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      plant_type: PlantType;
      origin: Origin;
      tier: Tier;
    };
  };
}

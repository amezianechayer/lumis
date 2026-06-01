export interface User {
  id: string;
  email: string;
  username?: string;
  full_name?: string;
  gender?: "male" | "female" | "nonbinary" | "prefer_not";
  date_of_birth?: string;
  avatar_url?: string;
  premium_until?: string;
  goals?: string[];
  skin_type?: "normal" | "oily" | "dry" | "combination" | "sensitive";
  email_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  expires_at: string;
}

export interface AuthResponse {
  user: User;
  tokens: TokenPair;
}

export interface RefreshResponse {
  tokens: TokenPair;
}

export interface ApiError {
  error: string;
  fields?: Record<string, string>;
}

export type FaceShape = "oval" | "round" | "square" | "heart" | "diamond" | "oblong";
export type Undertone = "warm" | "cool" | "neutral";
export type ColorSeason = "spring" | "summer" | "autumn" | "winter";
export type EyeShape = "almond" | "round" | "hooded" | "upturned" | "downturned" | "monolid";
export type EyeDistance = "close-set" | "normal" | "wide-set";
export type SkinTone =
  | "fitzpatrick_1"
  | "fitzpatrick_2"
  | "fitzpatrick_3"
  | "fitzpatrick_4"
  | "fitzpatrick_5"
  | "fitzpatrick_6";

export interface FaceProfile {
  id: string;
  user_id: string;
  photo_url: string;
  face_shape: FaceShape;
  face_shape_confidence: number;
  eye_shape: EyeShape;
  eye_distance: EyeDistance;
  skin_tone: SkinTone;
  undertone: Undertone;
  color_season: ColorSeason;
  nose_shape: string;
  lip_shape: string;
  jaw_type: string;
  beard_recommendations?: string[];
  haircut_recommendations?: string[];
  analysis_version: string;
  created_at: string;
}

export interface RecStep {
  order: number;
  title: string;
  description: string;
  tip?: string;
  duration_min?: number;
}

export interface RecProduct {
  name: string;
  category: string;
  why: string;
  premium: boolean;
}

export interface Recommendation {
  id: string;
  user_id: string;
  face_profile_id?: string;
  type: "makeup" | "grooming" | "haircut" | "skincare" | "color_season";
  gender_target: "male" | "female" | "all" | "";
  title: string;
  summary: string;
  steps: RecStep[];
  products: RecProduct[];
  occasions: string[];
  season?: string;
  is_premium_only: boolean;
  icon_emoji: string;
  duration_min: number;
  difficulty: "easy" | "medium" | "advanced";
  created_at: string;
}

export interface RoutineStatus {
  morning_done: boolean;
  evening_done: boolean;
  streak: number;
  total_completed: number;
}

export interface CyclePhase {
  phase: string;
  phase_fr: string;
  day_of_cycle: number;
  cycle_length: number;
  skin_impact: string;
  tips: string[];
  next_period_in_days: number;
}

export interface CycleStatus {
  configured: boolean;
  last_period_date?: string;
  cycle_length?: number;
  phase?: CyclePhase;
}

export interface MakeupGuide {
  title: string;
  intro: string;
  color_tips: string[];
  steps: { title: string; description: string; tip: string }[];
  products: { name: string; category: string; why: string }[];
  is_male: boolean;
}

export interface RecommendationsResponse {
  recommendations: Recommendation[];
}

export interface FaceAnalysisRequest {
  photo_base64: string;
  skin_tone_hint?: SkinTone;
  vein_hint?: "blue" | "green" | "both" | "";
  gender?: string;
}

export interface FaceAnalysisResponse {
  face_profile: FaceProfile;
}

export interface SkinScan {
  id: string;
  user_id: string;
  overall_score: number;
  acne_score: number;
  hydration_score: number;
  uniformity_score: number;
  texture_score: number;
  acne_count: number;
  acne_zones?: string[];
  dark_spots_count: number;
  hyperpigmentation_level: string;
  pores_condition: string;
  oiliness_zones?: string[];
  dryness_zones?: string[];
  redness_level: string;
  fine_lines_detected: boolean;
  sleep_hours: number;
  stress_level: number;
  water_intake_liters: number;
  notes?: string;
  week_number: number;
  year: number;
  created_at: string;
}

export interface SkinScanRequest {
  sleep_hours: number;
  stress_level: number;
  water_intake_liters: number;
  notes?: string;
  photo_base64?: string; // data:image/jpeg;base64,...
}

export interface SkinScanResponse {
  skin_scan: SkinScan;
}

export interface SkinScanHistoryResponse {
  skin_scans: SkinScan[];
}

export interface ScannedProduct {
  id: string;
  user_id: string;
  barcode: string;
  product_name: string;
  brand: string;
  category: string;
  ingredients: string;
  image_url: string;
  compatibility_score: number;
  verdict: "excellent" | "good" | "neutral" | "avoid";
  pros?: string[];
  cons?: string[];
  tip: string;
  not_found: boolean;
  created_at: string;
}

export interface ScannedProductResponse {
  product: ScannedProduct;
}

export interface ScannedProductsHistoryResponse {
  products: ScannedProduct[];
}

export interface CoachMessage {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface CoachConversation {
  id: string;
  user_id: string;
  title: string;
  messages?: CoachMessage[];
  created_at: string;
  updated_at: string;
}

export interface CoachConversationsResponse {
  conversations: CoachConversation[];
}

export interface CoachConversationResponse {
  conversation: CoachConversation;
}

export interface CoachMessageResponse {
  message: CoachMessage;
}

import axios, { AxiosError, AxiosInstance } from "axios";
import * as SecureStore from "expo-secure-store";
import type { AiInciResult } from "./gemini";
import {
  ApiError,
  AuthResponse,
  CoachConversation,
  CoachConversationResponse,
  CoachConversationsResponse,
  CoachMessage,
  CoachMessageResponse,
  FaceAnalysisRequest,
  FaceAnalysisResponse,
  FaceProfile,
  Recommendation,
  MakeupGuide,
  RoutineStatus,
  RoutineDay,
  CycleStatus,
  RecommendationsResponse,
  RefreshResponse,
  ScannedProduct,
  ScannedProductResponse,
  ScannedProductsHistoryResponse,
  SkinScan,
  SkinScanRequest,
  SkinScanResponse,
  SkinScanHistoryResponse,
  TokenPair,
  User,
} from "../types/api";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8080";

const STORAGE_KEYS = {
  ACCESS_TOKEN: "lumis_access_token",
  REFRESH_TOKEN: "lumis_refresh_token",
} as const;

class ApiClient {
  private client: AxiosInstance;
  private isRefreshing = false;
  private refreshSubscribers: Array<(token: string) => void> = [];

  constructor() {
    this.client = axios.create({
      baseURL: `${BASE_URL}/api/v1`,
      timeout: 15_000,
      headers: { "Content-Type": "application/json" },
    });

    this.client.interceptors.request.use(async (config) => {
      const token = await SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    this.client.interceptors.response.use(
      (res) => res,
      async (error: AxiosError<ApiError>) => {
        const original = error.config as typeof error.config & { _retry?: boolean };
        if (error.response?.status === 401 && !original._retry) {
          original._retry = true;

          if (this.isRefreshing) {
            return new Promise((resolve) => {
              this.refreshSubscribers.push((token) => {
                original.headers!.Authorization = `Bearer ${token}`;
                resolve(this.client(original));
              });
            });
          }

          this.isRefreshing = true;
          try {
            const refreshToken = await SecureStore.getItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
            if (!refreshToken) throw new Error("no refresh token");

            const { data } = await axios.post<RefreshResponse>(
              `${BASE_URL}/api/v1/auth/refresh`,
              { refresh_token: refreshToken }
            );

            await this.storeTokens(data.tokens);
            this.refreshSubscribers.forEach((cb) => cb(data.tokens.access_token));
            this.refreshSubscribers = [];

            original.headers!.Authorization = `Bearer ${data.tokens.access_token}`;
            return this.client(original);
          } catch {
            await this.clearTokens();
            // Trigger navigation to login — handled by auth store listener
            return Promise.reject(error);
          } finally {
            this.isRefreshing = false;
          }
        }
        return Promise.reject(error);
      }
    );
  }

  async storeTokens(tokens: TokenPair) {
    await SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, tokens.access_token);
    await SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, tokens.refresh_token);
  }

  async clearTokens() {
    await SecureStore.deleteItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
    await SecureStore.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
  }

  async getRefreshToken() {
    return SecureStore.getItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
  }

  // Auth
  async register(email: string, password: string, fullName?: string): Promise<AuthResponse> {
    const { data } = await this.client.post<AuthResponse>("/auth/register", {
      email,
      password,
      full_name: fullName,
    });
    await this.storeTokens(data.tokens);
    return data;
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const { data } = await this.client.post<AuthResponse>("/auth/login", { email, password });
    await this.storeTokens(data.tokens);
    return data;
  }

  async logout(refreshToken: string): Promise<void> {
    await this.client.post("/auth/logout", { refresh_token: refreshToken });
    await this.clearTokens();
  }

  // User
  async getMe(): Promise<User> {
    const { data } = await this.client.get<{ user: User }>("/me");
    return data.user;
  }

  async updateMe(updates: Partial<Pick<User, "full_name" | "username" | "gender" | "goals" | "skin_type" | "date_of_birth">>): Promise<User> {
    const { data } = await this.client.patch<{ user: User }>("/me", updates);
    return data.user;
  }

  async deleteMe(): Promise<void> {
    await this.client.delete("/me");
    await this.clearTokens();
  }

  // Face analysis
  async analyzeFace(input: FaceAnalysisRequest): Promise<FaceProfile> {
    const { data } = await this.client.post<FaceAnalysisResponse>("/analysis/face", input);
    return data.face_profile;
  }

  async getLatestFaceProfile(): Promise<FaceProfile | null> {
    try {
      const { data } = await this.client.get<FaceAnalysisResponse>("/analysis/face/latest");
      return data.face_profile;
    } catch (e: unknown) {
      if (e && typeof e === "object" && "response" in e) {
        const err = e as { response?: { status?: number } };
        if (err.response?.status === 404) return null;
      }
      throw e;
    }
  }

  async getFaceHistory(): Promise<FaceProfile[]> {
    const { data } = await this.client.get<{ face_profiles: FaceProfile[] }>("/analysis/face/history");
    return data.face_profiles ?? [];
  }

  // Recommendations
  async getRecommendations(type?: string, occasion?: string): Promise<Recommendation[]> {
    const params: Record<string, string> = {};
    if (type) params.type = type;
    if (occasion) params.occasion = occasion;
    const { data } = await this.client.get<RecommendationsResponse>("/recommendations", { params });
    return data.recommendations;
  }

  // Skin scan
  async analyzeSkin(input: SkinScanRequest): Promise<SkinScan> {
    const { data } = await this.client.post<SkinScanResponse>("/analysis/skin", input);
    return data.skin_scan;
  }

  async getLatestSkinScan(): Promise<SkinScan | null> {
    try {
      const { data } = await this.client.get<SkinScanResponse>("/analysis/skin/latest");
      return data.skin_scan;
    } catch (e: unknown) {
      if (e && typeof e === "object" && "response" in e) {
        const err = e as { response?: { status?: number } };
        if (err.response?.status === 404) return null;
      }
      throw e;
    }
  }

  async getSkinHistory(): Promise<SkinScan[]> {
    const { data } = await this.client.get<SkinScanHistoryResponse>("/analysis/skin/history");
    return data.skin_scans ?? [];
  }

  async generateRecommendations(): Promise<Recommendation[]> {
    const { data } = await this.client.post<RecommendationsResponse>("/recommendations/generate");
    return data.recommendations;
  }

  async getRecommendationById(id: string): Promise<Recommendation> {
    const { data } = await this.client.get<Recommendation>(`/recommendations/${id}`);
    return data;
  }

  // AI-personalized makeup/grooming guide
  async getMakeupGuide(): Promise<MakeupGuide> {
    const { data } = await this.client.get<{ guide: MakeupGuide }>("/makeup-guide");
    return data.guide;
  }

  // Save color quiz result (undertone / skin tone / season)
  async saveColorQuiz(payload: { undertone: string; skin_tone: string; color_season: string }): Promise<FaceProfile> {
    const { data } = await this.client.post<{ face_profile: FaceProfile }>("/analysis/color-quiz", payload);
    return data.face_profile;
  }

  // Daily routine
  async getRoutineStatus(): Promise<RoutineStatus> {
    const { data } = await this.client.get<RoutineStatus>("/routine/status");
    return data;
  }
  async getRoutineWeek(): Promise<RoutineDay[]> {
    const { data } = await this.client.get<{ days: RoutineDay[] }>("/routine/week");
    return data.days ?? [];
  }
  async completeRoutine(period: "morning" | "evening"): Promise<RoutineStatus> {
    const { data } = await this.client.post<RoutineStatus>("/routine/complete", { period });
    return data;
  }
  async uncompleteRoutine(period: "morning" | "evening"): Promise<RoutineStatus> {
    const { data } = await this.client.delete<RoutineStatus>("/routine/complete", { data: { period } });
    return data;
  }

  // Menstrual cycle
  async getCycle(): Promise<CycleStatus> {
    const { data } = await this.client.get<CycleStatus>("/cycle");
    return data;
  }
  async saveCycle(payload: { last_period_date: string; cycle_length: number; period_length: number }): Promise<CycleStatus> {
    const { data } = await this.client.post<CycleStatus>("/cycle", payload);
    return data;
  }

  // Coach
  async createCoachConversation(): Promise<CoachConversation> {
    const { data } = await this.client.post<CoachConversationResponse>("/coach/conversations");
    return data.conversation;
  }

  async listCoachConversations(): Promise<CoachConversation[]> {
    const { data } = await this.client.get<CoachConversationsResponse>("/coach/conversations");
    return data.conversations;
  }

  async getCoachConversation(id: string): Promise<CoachConversation> {
    const { data } = await this.client.get<CoachConversationResponse>(`/coach/conversations/${id}`);
    return data.conversation;
  }

  async sendCoachMessage(conversationId: string, content: string): Promise<CoachMessage> {
    const { data } = await this.client.post<CoachMessageResponse>(
      `/coach/conversations/${conversationId}/messages`,
      { content }
    );
    return data.message;
  }

  async deleteCoachConversation(id: string): Promise<void> {
    await this.client.delete(`/coach/conversations/${id}`);
  }

  // Premium
  async getPremiumStatus(): Promise<{ is_premium: boolean; premium_until: string | null }> {
    const { data } = await this.client.get<{ is_premium: boolean; premium_until: string | null }>("/premium/status");
    return data;
  }

  async activatePremium(durationMonths = 12): Promise<{ is_premium: boolean; premium_until: string }> {
    const { data } = await this.client.post("/premium/activate", { duration_months: durationMonths });
    return data;
  }

  // Stripe (legacy — kept for compatibility)
  async createCheckoutSession(): Promise<{ url: string; session_id: string }> {
    const { data } = await this.client.post<{ url: string; session_id: string }>("/stripe/checkout", {
      success_url: "lumis://premium/success",
      cancel_url: "lumis://premium/cancel",
    });
    return data;
  }

  // Product scan
  async scanProduct(barcode: string): Promise<ScannedProduct> {
    const { data } = await this.client.post<ScannedProductResponse>("/products/scan", { barcode });
    return data.product;
  }

  // INCI analysis via Groq (server-side fallback when Gemini fails)
  async analyzeInciAI(payload: { ingredients?: string; image_base64?: string }): Promise<AiInciResult> {
    const { data } = await this.client.post<{ result: AiInciResult }>("/products/inci-ai", payload);
    return data.result;
  }

  async getProductHistory(): Promise<ScannedProduct[]> {
    const { data } = await this.client.get<ScannedProductsHistoryResponse>("/products/history");
    return data.products ?? [];
  }
}

export const api = new ApiClient();

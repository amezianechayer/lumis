import Purchases, {
  CustomerInfo,
  LOG_LEVEL,
  PurchasesPackage,
} from "react-native-purchases";
import { Platform } from "react-native";

const RC_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY ?? "";

// Entitlement identifier — must match exactly what's in RevenueCat dashboard
export const ENTITLEMENT_ID = "Lumis - Find & Relax Pro";

// Product identifiers
export const PRODUCT_IDS = {
  monthly: "com.lumis.mis.1_month",
  sixMonth: "com.lumis.mis.1_six_month",
  yearly: "com.lumis.mis.1_yearly",
};

let initialized = false;

export async function initRevenueCat(userId?: string): Promise<void> {
  if (initialized) return;

  if (__DEV__) {
    await Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  }

  await Purchases.configure({
    apiKey: RC_API_KEY,
    appUserID: userId ?? null,
  });

  initialized = true;
}

export async function identifyUser(userId: string): Promise<void> {
  try {
    await Purchases.logIn(userId);
  } catch (e) {
    console.warn("[RC] identify failed:", e);
  }
}

export async function logoutUser(): Promise<void> {
  try {
    await Purchases.logOut();
  } catch (e) {
    console.warn("[RC] logout failed:", e);
  }
}

export async function getCustomerInfo(): Promise<CustomerInfo> {
  return Purchases.getCustomerInfo();
}

export function isPremiumActive(customerInfo: CustomerInfo): boolean {
  return customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
}

export async function getPackages(): Promise<PurchasesPackage[]> {
  const offerings = await Purchases.getOfferings();
  return offerings.current?.availablePackages ?? [];
}

export async function purchasePackage(
  pkg: PurchasesPackage
): Promise<{ success: boolean; customerInfo: CustomerInfo }> {
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return {
    success: isPremiumActive(customerInfo),
    customerInfo,
  };
}

export async function restorePurchases(): Promise<{
  restored: boolean;
  customerInfo: CustomerInfo;
}> {
  const customerInfo = await Purchases.restorePurchases();
  return {
    restored: isPremiumActive(customerInfo),
    customerInfo,
  };
}

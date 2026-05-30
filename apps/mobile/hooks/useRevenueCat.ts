import { useCallback, useEffect, useState } from "react";
import { CustomerInfo, PurchasesPackage } from "react-native-purchases";
import {
  getCustomerInfo,
  getPackages,
  initRevenueCat,
  isPremiumActive,
  purchasePackage,
  restorePurchases,
  ENTITLEMENT_ID,
} from "../services/revenuecat";
import { useAuthStore } from "../stores/auth.store";
import { api } from "../services/api";
import { useQueryClient } from "@tanstack/react-query";

export interface RevenueCatState {
  isReady: boolean;
  isPremium: boolean;
  customerInfo: CustomerInfo | null;
  packages: PurchasesPackage[];
  isLoading: boolean;
  error: string | null;
}

export function useRevenueCat() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const [state, setState] = useState<RevenueCatState>({
    isReady: false,
    isPremium: false,
    customerInfo: null,
    packages: [],
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    init();
  }, [user?.id]);

  async function init() {
    setState((s) => ({ ...s, isLoading: true, error: null }));
    try {
      await initRevenueCat(user?.id);
      const [info, pkgs] = await Promise.all([getCustomerInfo(), getPackages()]);
      setState({
        isReady: true,
        isPremium: isPremiumActive(info),
        customerInfo: info,
        packages: pkgs,
        isLoading: false,
        error: null,
      });
    } catch (e: unknown) {
      setState((s) => ({
        ...s,
        isReady: true,
        isLoading: false,
        error: "Impossible de charger les offres.",
      }));
    }
  }

  const purchase = useCallback(
    async (pkg: PurchasesPackage): Promise<boolean> => {
      setState((s) => ({ ...s, isLoading: true, error: null }));
      try {
        const { success, customerInfo } = await purchasePackage(pkg);
        if (success) {
          // Sync with backend
          await api.activatePremium(getDurationMonths(pkg));
          queryClient.invalidateQueries({ queryKey: ["premium-status"] });
          queryClient.invalidateQueries({ queryKey: ["me"] });
        }
        setState((s) => ({
          ...s,
          isPremium: isPremiumActive(customerInfo),
          customerInfo,
          isLoading: false,
        }));
        return success;
      } catch (e: unknown) {
        const err = e as { userCancelled?: boolean; message?: string };
        if (!err?.userCancelled) {
          setState((s) => ({
            ...s,
            isLoading: false,
            error: err?.message ?? "Achat impossible.",
          }));
        } else {
          setState((s) => ({ ...s, isLoading: false }));
        }
        return false;
      }
    },
    [queryClient]
  );

  const restore = useCallback(async (): Promise<boolean> => {
    setState((s) => ({ ...s, isLoading: true, error: null }));
    try {
      const { restored, customerInfo } = await restorePurchases();
      if (restored) {
        await api.activatePremium(12);
        queryClient.invalidateQueries({ queryKey: ["premium-status"] });
      }
      setState((s) => ({
        ...s,
        isPremium: isPremiumActive(customerInfo),
        customerInfo,
        isLoading: false,
      }));
      return restored;
    } catch (e: unknown) {
      setState((s) => ({
        ...s,
        isLoading: false,
        error: "Impossible de restaurer les achats.",
      }));
      return false;
    }
  }, [queryClient]);

  const refresh = useCallback(async () => {
    try {
      const info = await getCustomerInfo();
      setState((s) => ({
        ...s,
        isPremium: isPremiumActive(info),
        customerInfo: info,
      }));
    } catch {}
  }, []);

  return { ...state, purchase, restore, refresh };
}

function getDurationMonths(pkg: PurchasesPackage): number {
  const id = pkg.product.identifier;
  if (id.includes("yearly") || id.includes("annual")) return 12;
  if (id.includes("six") || id.includes("6")) return 6;
  return 1;
}

export { ENTITLEMENT_ID };

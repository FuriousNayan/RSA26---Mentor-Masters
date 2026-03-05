import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@nutrinav_user_preferences';

export type UserPreferences = {
  allergies: string[];
  sensitivities: string[];
};

const DEFAULT_PREFERENCES: UserPreferences = {
  allergies: [],
  sensitivities: [],
};

type UserPreferencesContextType = UserPreferences & {
  setAllergies: (allergies: string[]) => void;
  setSensitivities: (sensitivities: string[]) => void;
  addAllergy: (allergy: string) => void;
  removeAllergy: (allergy: string) => void;
  addSensitivity: (sensitivity: string) => void;
  removeSensitivity: (sensitivity: string) => void;
  hasPreferences: boolean;
};

const UserPreferencesContext = createContext<UserPreferencesContextType | null>(null);

export function UserPreferencesProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored) {
          try {
            const parsed = JSON.parse(stored) as UserPreferences;
            setPreferences({
              allergies: parsed.allergies ?? [],
              sensitivities: parsed.sensitivities ?? [],
            });
          } catch {
            // ignore invalid stored data
          }
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(preferences)).catch(() => {});
  }, [preferences, loaded]);

  const setAllergies = useCallback((allergies: string[]) => {
    setPreferences((p) => ({ ...p, allergies: allergies.filter(Boolean).map((a) => a.trim()) }));
  }, []);

  const setSensitivities = useCallback((sensitivities: string[]) => {
    setPreferences((p) => ({
      ...p,
      sensitivities: sensitivities.filter(Boolean).map((s) => s.trim()),
    }));
  }, []);

  const addAllergy = useCallback((allergy: string) => {
    const trimmed = allergy.trim();
    if (!trimmed) return;
    setPreferences((p) =>
      p.allergies.includes(trimmed) ? p : { ...p, allergies: [...p.allergies, trimmed] }
    );
  }, []);

  const removeAllergy = useCallback((allergy: string) => {
    setPreferences((p) => ({
      ...p,
      allergies: p.allergies.filter((a) => a.toLowerCase() !== allergy.toLowerCase()),
    }));
  }, []);

  const addSensitivity = useCallback((sensitivity: string) => {
    const trimmed = sensitivity.trim();
    if (!trimmed) return;
    setPreferences((p) =>
      p.sensitivities.includes(trimmed) ? p : { ...p, sensitivities: [...p.sensitivities, trimmed] }
    );
  }, []);

  const removeSensitivity = useCallback((sensitivity: string) => {
    setPreferences((p) => ({
      ...p,
      sensitivities: p.sensitivities.filter((s) => s.toLowerCase() !== sensitivity.toLowerCase()),
    }));
  }, []);

  const hasPreferences = preferences.allergies.length > 0 || preferences.sensitivities.length > 0;

  const value: UserPreferencesContextType = {
    ...preferences,
    setAllergies,
    setSensitivities,
    addAllergy,
    removeAllergy,
    addSensitivity,
    removeSensitivity,
    hasPreferences,
  };

  return (
    <UserPreferencesContext.Provider value={value}>{children}</UserPreferencesContext.Provider>
  );
}

export function useUserPreferences() {
  const ctx = useContext(UserPreferencesContext);
  if (!ctx) throw new Error('useUserPreferences must be used within UserPreferencesProvider');
  return ctx;
}

/** Normalize allergen string for matching (lowercase, split, trim) */
export function parseAllergenList(allergenString: string): string[] {
  if (!allergenString || allergenString.toLowerCase().includes('none detected')) return [];
  return allergenString
    .split(/[,;]/)
    .map((a) => a.replace(/^[a-z]+:/, '').trim().toLowerCase())
    .filter(Boolean);
}

/** Check if product allergens intersect with user's allergies or sensitivities */
export function productMatchesUserRestrictions(
  productAllergens: string,
  userAllergies: string[],
  userSensitivities: string[]
): { hasAllergyConflict: boolean; hasSensitivityConflict: boolean } {
  const productList = parseAllergenList(productAllergens);
  const allergyLower = userAllergies.map((a) => a.toLowerCase());
  const sensitivityLower = userSensitivities.map((s) => s.toLowerCase());

  const hasAllergyConflict = allergyLower.some((a) =>
    productList.some((p) => p.includes(a) || a.includes(p))
  );
  const hasSensitivityConflict = sensitivityLower.some((s) =>
    productList.some((p) => p.includes(s) || s.includes(p))
  );

  return { hasAllergyConflict, hasSensitivityConflict };
}

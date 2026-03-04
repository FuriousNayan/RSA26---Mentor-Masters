import React, { createContext, useContext, useState, useCallback } from 'react';

export type ScannedItem = {
  id: string;
  barcode: string;
  productName: string;
  brand: string;
  imageUrl: string | null;
  allergens: string;
  scannedAt: Date;
  /** Placeholder: will indicate if sensitivity may be triggered (not yet implemented) */
  sensitivityStatus: 'pending' | 'clear' | 'warning' | null;
  /** Placeholder: will indicate if allergy may be triggered (not yet implemented) */
  allergyStatus: 'pending' | 'clear' | 'warning' | null;
};

type ScanHistoryContextType = {
  items: ScannedItem[];
  addItem: (item: Omit<ScannedItem, 'id' | 'scannedAt' | 'sensitivityStatus' | 'allergyStatus'>) => void;
  clearHistory: () => void;
  removeItem: (id: string) => void;
};

const ScanHistoryContext = createContext<ScanHistoryContextType | null>(null);

const MAX_HISTORY_ITEMS = 50;

export function ScanHistoryProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ScannedItem[]>([]);

  const addItem = useCallback(
    (item: Omit<ScannedItem, 'id' | 'scannedAt' | 'sensitivityStatus' | 'allergyStatus'>) => {
      const newItem: ScannedItem = {
        ...item,
        id: `${item.barcode}-${Date.now()}`,
        scannedAt: new Date(),
        sensitivityStatus: null, // Placeholder: not yet implemented
        allergyStatus: null,    // Placeholder: not yet implemented
      };
      setItems((prev) => [newItem, ...prev].slice(0, MAX_HISTORY_ITEMS));
    },
    []
  );

  const clearHistory = useCallback(() => setItems([]), []);
  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  return (
    <ScanHistoryContext.Provider value={{ items, addItem, clearHistory, removeItem }}>
      {children}
    </ScanHistoryContext.Provider>
  );
}

export function useScanHistory() {
  const ctx = useContext(ScanHistoryContext);
  if (!ctx) throw new Error('useScanHistory must be used within ScanHistoryProvider');
  return ctx;
}

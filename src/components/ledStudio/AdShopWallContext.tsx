import { createContext, useContext, type ReactNode } from "react";
import type { DisplayTransform } from "../AdShopGrid";

/** The wall's L1 is the current AdShop display, not a separate stored image. */
export interface AdShopWallPreview {
  artwork: string;
  tileArtworks?: (string | undefined)[];
  panelArtworks?: Record<number, string>;
  transform: DisplayTransform;
  /** CSS pixel dimensions of one unmerged AdShop panel at studio open. */
  cellSize: { width: number; height: number };
}
const Context = createContext<AdShopWallPreview | null>(null);
export function AdShopWallProvider({ value, children }: { value: AdShopWallPreview; children: ReactNode }) {
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useAdShopWall(): AdShopWallPreview | null { return useContext(Context); }

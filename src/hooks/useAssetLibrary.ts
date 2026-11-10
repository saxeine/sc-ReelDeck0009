import { useEffect, useSyncExternalStore } from "react";
import {
  getLibrarySnapshot,
  loadLibrary,
  subscribeLibrary,
  type LibraryAsset,
} from "../services/assetLibrary";

/** Live view of the asset provider library. */
export function useAssetLibrary(): LibraryAsset[] {
  const assets = useSyncExternalStore(subscribeLibrary, getLibrarySnapshot);
  useEffect(() => {
    void loadLibrary();
  }, []);
  return assets;
}

import { useEffect, useSyncExternalStore } from "react";
import {
  getChoreoTemplateSnapshot,
  loadChoreoTemplates,
  subscribeChoreoTemplates,
  type ChoreoShowTemplate,
} from "../services/choreoTemplates";

/** Live view of the editable choreographer show templates. */
export function useChoreoTemplates(): ChoreoShowTemplate[] {
  const templates = useSyncExternalStore(subscribeChoreoTemplates, getChoreoTemplateSnapshot);
  useEffect(() => {
    void loadChoreoTemplates();
  }, []);
  return templates;
}

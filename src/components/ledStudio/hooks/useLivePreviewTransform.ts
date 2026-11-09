/**
 * The wall's main image, live
 * ===========================
 *
 * Subscribes the L1 layer to the two values the Control Deck's **Live preview**
 * owns (`seqcarver_control_deck_artwork_source` + `seqcarver_control_deck_spread_settings`)
 * and hands back a renderable transform. Any edit — a new artwork, a colour
 * treatment, a stretch, a pan — reaches the choreographer's wall immediately,
 * including edits made in another tab or hydrated from the user's database.
 */

import { useEffect, useRef, useState } from "react";
import {
  LIVE_PREVIEW_ARTWORK_KEY,
  LIVE_PREVIEW_SPREAD_KEY,
  DEFAULT_LIVE_PREVIEW_TRANSFORM,
  livePreviewTransformFrom,
  type LivePreviewTransform,
} from "../../../utils/livePreview";
import { remoteStore } from "../../../services/remoteKeyValueStore";

export function readLivePreviewTransform(): LivePreviewTransform {
  try {
    return livePreviewTransformFrom(
      remoteStore.getItem(LIVE_PREVIEW_ARTWORK_KEY),
      remoteStore.getItem(LIVE_PREVIEW_SPREAD_KEY),
    );
  } catch {
    return { ...DEFAULT_LIVE_PREVIEW_TRANSFORM };
  }
}

/** Subscribe to the Live preview artwork + settings. */
export function useLivePreviewTransform(): LivePreviewTransform {
  const [transform, setTransform] = useState<LivePreviewTransform>(readLivePreviewTransform);
  const latestRef = useRef(transform);
  latestRef.current = transform;

  useEffect(() => {
    const read = () => {
      const next = readLivePreviewTransform();
      const current = latestRef.current;
      if (
        next.artwork === current.artwork &&
        next.treatment === current.treatment &&
        next.stretchX === current.stretchX &&
        next.stretchY === current.stretchY &&
        next.panX === current.panX &&
        next.panY === current.panY
      ) {
        return;
      }
      latestRef.current = next;
      setTransform(next);
    };
    read();
    const unsubscribe = remoteStore.subscribe((keys) => {
      if (keys.includes(LIVE_PREVIEW_ARTWORK_KEY) || keys.includes(LIVE_PREVIEW_SPREAD_KEY)) read();
    });
    return unsubscribe;
  }, []);

  return transform;
}

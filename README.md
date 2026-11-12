# AdShop / ReelDeck

AdShop is the starting screen for the creative workspace. It opens on every page load and links to the existing Slice Studio and ReelDeck tools. Use the **AdShop** button in either tool to return without losing the current in-session work.

## Run locally

```sh
npm ci
npm run dev
```

For a production build, run `npm run build`. Vite produces a self-contained `dist/index.html`. Run `npm test` for the animation, studio geometry, font-loading, handoff, PSD regression tests, and IBC customiser tests, and `npx tsc --noEmit` for type checking.

## IBC system customiser

Right-click any application element to open the movable **IBC** editor. Its **Styles**, **Icons**, and **Toggles** tabs let you adjust that element's text or accessible label, colors, type size, shape, icon visibility and size, text/icon presentation, and enabled state. Under the **Icons** tab, the folded **ICON SET** panel expands into a button grid: click any icon to apply it to the selected element (the minus button removes it), then fine-tune its size and colour. Edits apply immediately and persist locally. **Save Def** stores a reusable style preset, **Restore** applies that preset to the current element, and **Reset** returns the current element to its original state. Press Escape or use the close button to dismiss IBC; drag its header to move it.

## Asset provider library

The **Library** tab (shortcut `4`) is the editable asset holding area backed by a browser database (IndexedDB), so its contents survive reloads. Images can be added directly, saved from the **Slice studio** ("Save blocks to library"), or sent from **Zoom Studio** ("To library"); each asset can be renamed, tagged, favourited, and deleted. The library feeds both the **sequencer** ("+ Library" in the AdShop Sequencer's saved sources) and the **choreographer** ("Add from library" in the LED Studio's advert pool, or in a scene's **Advert cast** to pick images straight into that scene), which in turn drive the front page display and hand content back to ReelDeck; library selections can also be added to the ReelDeck board directly with "Add to board".

## The AdShop display

- The preview is a fixed 4 × 4 grid. Use the header **Settings** gear to open **Your image**, **Display controls** (including **Make it yours**), or **Live Control Deck** in their own dialogs. Close a dialog with its close button or Escape; changes remain in the current session.
- In **Display controls**, adjust the canvas shape, tile spacing, corner radius, image fit, image rotation, and tile numbers. The display's **Reset view** button also restores these defaults.
- Upload an image from **Your image** or the header upload shortcut, or drag one onto the grid. Uploaded images and display adjustments are kept for the current session; they reset on reload. The built-in demo image can be restored from **Your image** at any time.
- In ReelDeck's Board view, choose **2AdShop**, or select frames and choose **Send selected to AdShop**. Frames are handed off in deck sequence order as an uncommitted preview. Adjust the image, page, or display controls, then choose **Commit & return to ReelDeck** to keep the display and return to the Board, or **Commit & stay** to keep working in AdShop. **Cancel preview**, or navigating away without committing, restores the previous display. Committed displays last for the current session and reset on reload.
- In AdShop, open **Settings → Your image** and choose **Load all from ReelDeck** to preview the current frames. The dialog closes so the preview actions are available; reopen settings to make adjustments, then choose **Commit & return to AdShop** to keep it, or **Cancel preview** to restore the previous display. Leaving without committing also discards the preview.
- Handed-off images can be shown individually across the whole display or one per tile. Collections larger than 16 images are paged. The handoff is an in-session snapshot: load or send again to pick up later ReelDeck edits. Clearing it in AdShop does not delete frames from ReelDeck.
- The three **Live Control Deck** tools are connected to the display. Live data, scheduling, and LED hardware are not connected.

The display renderer lives in `src/components/AdShopGrid.tsx`. It accepts either one image source or a page of handed-off images along with a `DisplayTransform`. `src/components/AdShop.tsx` owns the local source and display controls; the handoff from ReelDeck is coordinated in `src/App.tsx`.

## Sequencer, Perimeter Choreographer and panel arrangements

These tools use the original implementations from [scStudio-0003](https://github.com/saxeine/scStudio-0003) and share AdShop's 4 × 4 display. Open them from **Settings → Live Control Deck** in AdShop:

- **Sequencer** assigns image sources to panels and controls the route, timing, wrapping and effects. **Route painter** opens the original wall desk to draw or edit the same path. Starting the sequence takes over from a running show. The display transport stops or restarts whichever animation owns the wall.
- **Perimeter Choreographer** auditions multi-scene shows with a cast of advert images, beat timing, formations, motion and transitions. Use the pool and advert deck in the wall studio for uploads, panel images, frame rotations and links. **Submit to front page** sends the complete panel and show program to AdShop; **SC2F** submits and closes. Running the audition alone does not put the show on the display.
- **Show templates** are editable. **Save current show as template** stores every scene with its images, cast positions, formation, motion, transition, timing and the master clock in browser storage. Saved templates can be loaded, renamed, replaced with the current show (refresh icon) or deleted; while one is open a banner tracks unsaved scene changes and offers **Save changes**. Built-in shows are generated from the advert pool — **Edit copy** turns one into an editable template so its images and behaviours can be changed. Scenes pull extra artwork from the library with **Add from library** in the advert cast.
- **Panel arrangement** merges, splits and enables or disables regions on the 4 × 4 base grid. The **Panels** button inside the choreographer and the arrangement button in the Sequencer open the same configurator. Applying a layout updates both studios and AdShop immediately; a merged panel uses its upper-left cell's ID.
- Route edits are shared live. Show scenes and panel-deck edits are local until submitted, so closing the wall without submitting discards those local edits. Layout changes are applied independently in the configurator. A route submission replaces the current show; submitting a show parks the route. A stopped show can be restarted with the AdShop transport.
- The current display, route, submitted show and uploaded artwork last for the browser session and reset on reload. Named grid configurations and Sequencer presets are stored in the browser when storage is available. The choreographer can export/import show JSON; external artwork URLs must remain accessible. External sites that prevent canvas access may not retain baked slice/tint effects when submitted.

## Neo1 and Bubble Studio

Both editors are integrated from the original [sc-B4 editor repository](https://github.com/saxeine/sc-B4--test6--Oct31--18-00). In ReelDeck's Board, select one frame (or focus one without a selection), then choose **Neo1 Studio** or **Bubble Studio** in the toolbar. The same actions are available in the frame Inspector.

- Neo1 provides editable text and image layers, typography presets, transforms, effects, and image/project exports. Bubble Studio provides speech, thought, narration and burst presets, text styling, draggable tails and layer controls.
- **Save to ReelDeck** replaces the current frame with a full-resolution PNG; **Save as new** inserts a separate frame after it. Bubble Studio also has **Save & Exit**. Closing without saving discards edits made since the last save. Each save is undoable from ReelDeck's Board.
- During the current session, reopening a frame in the **same** studio restores its editable layers, including Bubble layers saved more than once. A frame retains the project for the most recently saved studio only. Opening it in the other studio starts from the flattened image; saving there replaces the previous editable project. Board undo restores the earlier image and its project. Replacing a frame image elsewhere also clears its stale studio project.
- The deck, flattened frames and in-session studio projects reset on browser reload. ReelDeck manifests are not layered studio project backups. For an independent editable Neo1 backup, use **Save Project JSON** and later **Load Project JSON**; referenced external images and fonts must remain accessible.
- Neo1 also imports and exports multi-layer PSD files. PSD layers are rasterized images rather than editable Neo1/Photoshop text, and imported groups and advanced Photoshop effects may not be preserved. Loading a PSD replaces the current Neo1 canvas. Google Fonts require network access; local fallback fonts are used when they are unavailable.

## KnowledgeSubspace-frontend

A Vue-based hex-map visualization for multi-subspace semantic analysis.
It renders countries and conflict regions on a hex grid, supports interactive selection (click/drag/route/flight), and shows per-cell tooltips listing all MSUs present in that HSU.

Features

Hex map across multiple subspaces

Country coloring & conflict-region awareness

Tooltips listing all MSUs in the hovered HSU

Flight/route creation & selection snapshot export

Responsive layout & mini-map palettes

Tech Stack

Vue 3 + Vite

D3.js for hex rendering

Plain JS utilities (src/lib/semanticMap.js)

Quick Start
# Install dependencies
npm install

# Start dev server (hot reload)
npm run dev


Open the URL shown in your terminal (usually http://localhost:5173).

Build & Preview
# Production build
npm run build

# Preview the production build
npm run preview

Minimal Project Structure
src/
  components/        # Vue components
  lib/semanticMap.js # hex map + interactions
  assets/            # styles, images, etc.

Data Shape

Provide subspace data via your loader. Each HSU record looks like:

{ "q": -1, "r": -5, "modality": "text", "country_id": "c0", "msu_ids": [27] }


If multiple records share the same (q, r), the cell is treated as a conflict region (all MSUs are surfaced in the tooltip and selection snapshots).
# SeSMap-frontend

An LLM-Powered Visual Analytics System for Semantic Subspace Exploration.
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
## Install dependencies
npm install

## Start dev server (hot reload)
npm run dev


Open the URL shown in your terminal (usually http://localhost:5173).

## Production build
npm run build

## Preview the production build
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


# Common Input Prompt Commands

This section outlines the common commands users can input to interact with the system, including commands for controlling subspace visibility and displaying images.

## 1. Subspace Control Commands

### Show Subspaces:
These commands show specific subspaces in the system:

- `show background` – Show the background subspace.
- `show method` – Show the method subspace.
- `show result` – Show the result subspace.
- `show experiment` – Show the experiment subspace.
- `show conclusion` – Show the conclusion subspace.

### Hide Subspaces:
These commands hide specific subspaces or all subspaces:

- `hide all subspaces` – Hide all subspaces.
- `collapse all panels` – Collapse all panels.
- `hide background` – Hide the background subspace.
- `hide method` – Hide the method subspace.
- `hide result` – Hide the result subspace.
- `hide experiment` – Hide the experiment subspace.
- `hide conclusion` – Hide the conclusion subspace.

## 2. Image Display Commands

These commands display images from specific folders based on keywords or folder names.

- `show air` – Show all images from the "air" folder (e.g., air pollution related images).
- `show combust` – Show all images from the "combust" folder (e.g., combustion related images).
- `show case1` – Show all images from the "case1" folder.
- `show case2` – Show all images from the "case2" folder.
- `show air pollution` – Show all images related to air pollution.
- `show combustion` – Show all images related to combustion processes.

### Example Usage:

- `show air` – This command will display all images from the "air" folder, which could include images related to air pollution.
- `show combust` – This command will display all images from the "combust" folder, such as images related to combustion processes.
- `show background` – This will display the background subspace in the system.

## 3. Clear Commands

Use these commands to clear images or subspaces from the view.

- `clear all pictures` – Clear all images from the view.
- `clear gallery` – Clear the entire image gallery.
- `clear all` – Clear all content, including subspaces and images.
- `hide all` – Hide all displayed subspaces.
- `clear all subspaces` – Hide and clear all subspaces.
- `hide gallery` – Hide the image gallery.

## 4. Miscellaneous Commands

- `help` – Ask the assistant for help or a list of available commands.
- `reset` – Reset the current state or configuration.
- `reload` – Reload the system to refresh data.

## Example Queries:

- **Show a specific folder's images**:  
  `show air` will display all images related to air pollution.  
  `show combust` will show all images related to combustion.

- **Hide or show specific subspaces**:  
  `show background` will display the background subspace.  
  `hide all subspaces` will hide all the subspaces.

- **Clear the current content**:  
  `clear gallery` will remove all images from the gallery.  
  `clear all pictures` will clear all pictures from the current view.

## Notes:
- Commands related to **subspace control** manage the visibility of specific sections or panels in the system.
- Commands related to **image display** trigger the display of images from folders, based on the input theme or keyword.
- The **clear commands** help remove or hide content from the view.

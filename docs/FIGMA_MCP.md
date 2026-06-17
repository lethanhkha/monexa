# Figma MCP Integration

Monexa uses the **BudgetZen** design system. This guide explains how to connect your Figma design files to the project.

## Option 1: Figma REST API (Recommended)

### Step 1: Get a Figma Personal Access Token

1. Go to https://www.figma.com/developers/api#access-tokens
2. Click "Create a new personal access token"
3. Name it "Monexa Design Import"
4. Copy the token

### Step 2: Get your File Key

Open your Figma file in browser. The file key is in the URL:
`https://www.figma.com/file/FILEKEY/Your-Design-Name`
Copy the `FILEKEY` portion.

### Step 3: Configure Environment

```bash
cp .env.example .env
```

Add your credentials:
```env
VITE_FIGMA_FILE_KEY=your-file-key
VITE_FIGMA_ACCESS_TOKEN=your-personal-access-token
```

### Step 4: Run the Design Importer

```bash
npm run import:figma
```

This will fetch all design tokens, colors, typography, and component specs from your Figma file and update the local design system.

## Option 2: Create a Figma Plugin (For Ongoing Sync)

If you have an existing Figma design and want ongoing sync:

1. Create a Figma plugin with a simple API server
2. The plugin exports design tokens as JSON
3. The API endpoint serves these tokens to the frontend

### Plugin Template

```javascript
// figma-plugin/code.ts
figma.showUI(__html__);

figma.ui.onmessage = msg => {
  if (msg.type === 'export-tokens') {
    const tokens = {
      colors: extractColors(figma.getLocalPaintStyles()),
      typography: extractTypography(figma.getLocalTextStyles()),
      spacing: extractSpacing(figma),
      components: extractComponents(figma.getLocalComponents()),
    };
    figma.ui.postMessage({ type: 'tokens', data: tokens });
  }
};
```

## Option 3: Manual Sync (Simplest)

Since you already have `budgetzen-DESIGN.md` in the project:

1. Design in Figma
2. Manually export the design tokens
3. Update `src/styles/globals.css` with the new values

The BudgetZen design system in `globals.css` is already complete and matches the design spec. Any Figma import should focus on:
- Color palette extraction
- Spacing adjustments
- Custom component overrides

## API Endpoint for Design Data

The project includes a design API endpoint at `/api/design` (requires Supabase Edge Functions setup):

```
GET /api/design
Response: { colors, typography, spacing, components }
```

## Next Steps

1. Create your Figma design file based on BudgetZen spec
2. Set up the Figma access token
3. Run `npm run import:figma` to sync design tokens

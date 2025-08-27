# Icon Setup Instructions

To change your Electron app icon, you need to add icon files to this `assets` folder:

## Required Icon Files:

### For macOS:
- `icon.icns` - macOS icon file (512x512 px recommended)

### For Windows:
- `icon.ico` - Windows icon file (256x256 px recommended)

### For Linux:
- `icon.png` - PNG icon file (512x512 px recommended)

## How to Create Icons:

1. **Start with a high-resolution image** (at least 512x512 px)
2. **Convert to appropriate formats:**
   - For macOS: Use an online converter or macOS tools to create `.icns`
   - For Windows: Use an online converter to create `.ico`
   - For Linux: Save as `.png`

## Online Icon Converters:
- https://iconverticons.com/online/
- https://convertico.com/
- https://cloudconvert.com/

## After adding your icons:
1. Restart your Electron app
2. For packaged apps, run `npm run package` or `npm run make`

Your app will automatically use the appropriate icon for each platform.

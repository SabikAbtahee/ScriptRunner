# Script Runner 2.0

A modern, clean Electron application for managing build processes and running applications with a beautiful UI.

## Features

- **Build Management**: Build and copy libraries to applications
- **Application Runner**: Start and manage multiple applications
- **Watch Mode**: Auto-build with file watching
- **Process Management**: Easy start/stop/restart of applications
- **Clean UI**: Modern, responsive interface with proper accessibility
- **Modular Architecture**: Clean, maintainable codebase

## Architecture

### Frontend (Renderer Process)
- **Modular CSS**: Organized into separate files with CSS variables
- **Component-based JS**: Separate modules for different functionality
- **Clean HTML**: Semantic, accessible markup

### Backend (Main Process)
- **Clean IPC handlers**: Organized and error-handled
- **Process management**: Proper lifecycle management
- **Configuration management**: Centralized config handling

### File Structure
```
├── index.html              # Main HTML file
├── js/                     # JavaScript modules
│   ├── app.js             # Main application
│   ├── build-row.js       # Build row component
│   ├── app-row.js         # App row component
│   ├── process-manager.js # Process management
│   ├── config-manager.js  # Configuration handling
│   └── dom-utils.js       # DOM utilities
├── styles/                 # Modular CSS
│   ├── main.css           # Main stylesheet (imports all)
│   ├── variables.css      # CSS variables
│   ├── base.css           # Base styles
│   ├── buttons.css        # Button components
│   ├── forms.css          # Form components
│   ├── layout.css         # Layout styles
│   ├── terminal.css       # Terminal styles
│   └── utilities.css      # Utility classes
├── main.js                # Electron main process
├── preload.js             # Secure IPC bridge
└── config.json            # Application configuration
```

## Usage

### Adding Build Rows
1. Click the green "+" button to add a build row
2. Select a library source and destination
3. Use "Build & Copy", "Copy", or "Watch" buttons

### Adding Application Rows
1. Click the yellow "+" button to add an application row
2. Select an application from the dropdown
3. Use "Run" or "Restart" buttons

### Keyboard Shortcuts
- `Ctrl/Cmd + B`: Add build row
- `Ctrl/Cmd + A`: Add application row

## Development

```bash
# Install dependencies
npm install

# Start in development mode
npm run dev

# Package the application
npm run package

# Build for macOS
npm run build-mac
```

## Configuration

Edit `config.json` to add your applications and libraries:

```json
{
  "Application": {
    "my_app": {
      "name": "My App",
      "path": "/path/to/app",
      "runCommand": "npm start"
    }
  },
  "Library": {
    "my_lib": {
      "name": "My Library",
      "path": "/path/to/library",
      "libPath": "node_modules/@my/library"
    }
  }
}
```

## Improvements Made

### Code Quality
- ✅ Modular JavaScript with ES6 modules
- ✅ Proper error handling throughout
- ✅ Clean separation of concerns
- ✅ Consistent naming conventions
- ✅ Comprehensive commenting

### UI/UX
- ✅ Modern, clean design
- ✅ Responsive layout
- ✅ Proper accessibility (ARIA labels, semantic HTML)
- ✅ Visual feedback for actions
- ✅ Improved terminal output styling

### Architecture
- ✅ Component-based structure
- ✅ Centralized state management
- ✅ Modular CSS with variables
- ✅ Secure IPC communication
- ✅ Proper process lifecycle management

### Developer Experience
- ✅ Better development scripts
- ✅ Organized file structure
- ✅ Clear documentation
- ✅ Easy to extend and maintain

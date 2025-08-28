### **Cross-Platform Port Killing**

- **Windows**: Uses `netstat` and `taskkill` commands
- **macOS/Linux**: Uses `lsof` and `kill` commands
- **Automatic**: Platform detection and appropriate command selection

## Dynamic Port Configuration

### **Problem: Hard-coded Ports**

Instead of hard-coding port 4200, you can now configure ports dynamically in your `config.json` for each application.

### **Solution: Port Property in Application Config**

#### **1. Add Port to Application Configuration**
```json
{
    "Application": {
        "PMI_Framework_Admin": {
            "name": "Admin",
            "path": "/path/to/admin/app",
            "runCommand": "ng serve --port=4201",
            "port": 4201
        },
        "pmi_framework_kpidashboard": {
            "name": "KPIDashboard",
            "path": "/path/to/dashboard/app",
            "runCommand": "ng serve --port=4200",
            "port": 4200
        }
    }
}
```

#### **2. Port Detection Priority**
The system now detects ports in this order:
1. **Config Port**: Uses `appConfig.port` if specified
2. **Command Port**: Extracts from `runCommand` (e.g., `--port=4201`)
3. **Default Port**: Falls back to 4200 for Angular apps

#### **3. Enhanced Port Management**
```javascript
// Get port from config
const port = window.portUtils.getPortFromConfig(appConfig);

// Ensure port is free before starting
await window.portUtils.ensurePortFree(appConfig);

// Smart restart with dynamic port detection
await window.portUtils.smartRestart(appConfig, progressCallback);
```

### **Benefits of Dynamic Port Configuration**

- **No Hard-coding**: Each app can have its own port
- **Flexible**: Easy to change ports without code changes
- **Consistent**: Same port used for start, restart, and cleanup
- **Fallback**: Still works with existing `runCommand` configurations
- **Logging**: Clear console output showing which port is being used

### **Port Configuration Examples**

```json
// Different ports for different apps
"PMI_Framework_Admin": { "port": 4201 }
"pmi_framework_kpidashboard": { "port": 4200 }
"PMI_Framework_AiAssistant": { "port": 4203 }

// Same port for different apps (will be cleaned up properly)
"PMI_Framework_WidgetTemplateEditor": { "port": 4200 }
```

## Best Practices

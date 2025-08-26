const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('API', {
    get_config: () => ipcRenderer.invoke('get-config'),
    build_output: (callback) => ipcRenderer.on('build_output', (event, data, progress, isDone) => callback(data, progress, isDone)),
    copy_output: (callback) => ipcRenderer.on('copy_output', (event, data, progress, isDone) => callback(data, progress, isDone)),
    build_copy: (param) => ipcRenderer.invoke('build_copy', param),
    copy: (param) => ipcRenderer.invoke('copy', param),
    watch: (param) => ipcRenderer.invoke('watch', param),
    kill: (param) => ipcRenderer.invoke('kill', param),
    watch_output: (callback) => ipcRenderer.on('watch_output', (event, data, progress,rowCounter,pid) => callback(data,progress,rowCounter,pid)),
    run_app: (param) => ipcRenderer.invoke('run_app', param),
    restart_app: (param) => ipcRenderer.invoke('restart_app', param),
    app_output: (callback) => ipcRenderer.on('app_output', (event, data, progress, rowCounter, pid) => callback(data, progress, rowCounter, pid)),
})
const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('node:path')
const { spawn } = require('node:child_process');
const kill = require('tree-kill');
const fs = require('fs');

// Track running app processes
const runningApps = new Map();

function createWindow()
{
    const mainWindow = new BrowserWindow({
        width: 1200,
        height: 900,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    })

    mainWindow.loadFile('index.html')
}


app.whenReady().then(() =>
{
    checkInitialConfig();
    createWindow()
    app.on('activate', function ()
    {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

app.on('window-all-closed', function ()
{
    if (process.platform !== 'darwin') app.quit()
})

function checkInitialConfig()
{
    try {
        const configFilePath = path.join(__dirname, 'config.json');
        console.log('Repo config file path:', configFilePath);
        const data = readFromFile(configFilePath);
        if (!data) {
            // createConfigFile();
        }
    } catch (error) {
        console.error(error.message);
    }
}

function readFromFile(filePath)
{
    // const filePath = path.join(__dirname, filename);
    if (fs.existsSync(filePath)) {
        return fs.readFileSync(filePath, 'utf8');
    } else {
        throw new Error('File does not exist');
    }
}

function writeToFile(filename, data)
{
    const filePath = path.join(__dirname, filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}


ipcMain.handle('get-config', async () =>
{
    const filePath = path.join(__dirname, 'config.json');
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return data;
});

ipcMain.handle('build_copy', async (event, param) =>
{
    let directory = JSON.parse(param.source).path;
    let command = spawn('npm', ['run', 'build'], { cwd: directory, shell: true, });
    command.stdout.on('data', (data) =>
    {
        event.sender.send('build_output', `${data.toString()}`, param.progress, false);
    });
    command.stderr.on('data', (data) =>
    {
        event.sender.send('build_output', `${data.toString()}`, param.progress, false);

    });
    command.on('close', (data) =>
    {
        event.sender.send('build_output', `${data.toString()}`, param.progress, true);
        copyToDestination(event, param);
    });
});

ipcMain.handle('watch', async (event, param) =>
{
    let directory = JSON.parse(param.source).path;
    let command = spawn('ng', ['build', '--watch'], { cwd: directory, shell: true, });
    command.stdout.on('data', (data) =>
    {
        // event.sender.send('build_output', `${data.toString()}`, param.progress, false);
        event.sender.send('watch_output', `${data.toString()}`, param.progress, param.rowCounter,command.pid );
    });
    command.stderr.on('data', (data) =>
    {
        // event.sender.send('build_output', `${data.toString()}`, param.progress, false);
        event.sender.send('watch_output', `${data.toString()}`, param.progress, param.rowCounter,command.pid );

    });

});


ipcMain.handle('kill', async (event, param) =>
{
    let command = param.command;
    kill(command, 'SIGKILL', (err) =>
    {
        if (err) {
            console.error('Error killing process:', err);
        } else {
            console.log('Process killed successfully');
        }
    });
})



ipcMain.handle('copy', async (event, param) =>
{
    copyToDestination(event, param);

});

ipcMain.handle('run_app', async (event, param) =>
{
    let directory = JSON.parse(param.path).path;
    console.log('Starting app in directory:', directory);
    
    // Kill existing process if running
    if (runningApps.has(directory)) {
        const existingPid = runningApps.get(directory);
        console.log('Killing existing process:', existingPid);
        kill(existingPid, 'SIGTERM');
        runningApps.delete(directory);
    }
    
    let command = spawn('npm', ['run', 'start'], { cwd: directory, shell: true });
    
    // Track this process
    runningApps.set(directory, command.pid);
    
    command.stdout.on('data', (data) =>
    {
        event.sender.send('app_output', `${data.toString()}`, param.progress, param.rowCounter, command.pid);
    });
    
    command.stderr.on('data', (data) =>
    {
        event.sender.send('app_output', `${data.toString()}`, param.progress, param.rowCounter, command.pid);
    });
    
    command.on('close', (code) =>
    {
        console.log('App process exited with code:', code);
        runningApps.delete(directory);
    });
    
    command.on('exit', (code) =>
    {
        runningApps.delete(directory);
    });
});

ipcMain.handle('restart_app', async (event, param) =>
{
    let directory = JSON.parse(param.path).path;
    console.log('Restarting app in directory:', directory);
    
    // Kill existing process first
    if (runningApps.has(directory)) {
        const existingPid = runningApps.get(directory);
        console.log('Killing existing process for restart:', existingPid);
        kill(existingPid, 'SIGTERM', (err) => {
            if (err) {
                console.error('Error killing existing process:', err);
            }
            runningApps.delete(directory);
            // Start new process after killing old one
            startNewProcess();
        });
    } else {
        // No existing process, start immediately
        startNewProcess();
    }
    
    function startNewProcess() {
        let command = spawn('npm', ['run', 'start'], { cwd: directory, shell: true });
        
        // Track this process
        runningApps.set(directory, command.pid);
        
        command.stdout.on('data', (data) =>
        {
            event.sender.send('app_output', `${data.toString()}`, param.progress, param.rowCounter, command.pid);
        });
        
        command.stderr.on('data', (data) =>
        {
            event.sender.send('app_output', `${data.toString()}`, param.progress, param.rowCounter, command.pid);
        });
        
        command.on('close', (code) =>
        {
            console.log('Restart app process exited with code:', code);
            runningApps.delete(directory);
        });
        
        command.on('exit', (code) =>
        {
            runningApps.delete(directory);
        });
    }
});

function copyToDestination(event, param)
{
    let sourceDirectory = JSON.parse(param.source).path;
    let sourceLibDirectory = JSON.parse(param.source).node_path;

    let destinationDirectory = JSON.parse(param.destination).path;

    let arg1 = `${sourceDirectory}/dist/**/*`;
    let arg2 = `${destinationDirectory}/${sourceLibDirectory}`

    let command = spawn('cpx', [arg1, arg2]);

    command.stdout.on('data', (data) =>
    {
        event.sender.send('copy_output', `${data.toString()}`, param.progress, false);
    });
    command.stderr.on('data', (data) =>
    {
        event.sender.send('copy_output', `${data.toString()}`, param.progress, false);
    });
    command.on('close', (data) =>
    {
        event.sender.send('copy_output', `cpx "${arg1}" "${arg2}"`, param.progress, false);
        event.sender.send('copy_output', `${data.toString()}`, param.progress, true);
    });

}
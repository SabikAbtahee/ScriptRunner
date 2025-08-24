
let rowCounter = 0;

document.getElementById('addRowButton').addEventListener('click', createBuildRow);
document.addEventListener('DOMContentLoaded', createBuildRow);


async function createBuildRow()
{
    const config = await window.API.get_config();
    const rowsContainer = document.getElementById('rowsContainer');
    const row = document.createElement('div');
    row.className = 'row row-container';

    const leftDropDownDiv = document.createElement('div');
    leftDropDownDiv.className = 'left-drop-div';
    const leftDropdown = document.createElement('select');
    leftDropdown.innerHTML = '<option value="" disabled selected>Select a key</option>';
    populateLeftDropdown(leftDropdown, config);
    leftDropDownDiv.appendChild(leftDropdown);


    const rightDropDownDiv = document.createElement('div');
    rightDropDownDiv.className = 'right-drop-div';
    const rightDropdown = document.createElement('select');
    rightDropdown.innerHTML = '<option value="" disabled selected>Select a key</option>';
    populateRightDropdown(rightDropdown, config);
    rightDropDownDiv.appendChild(rightDropdown);


    const dropdownDiv = document.createElement('div');
    dropdownDiv.className = 'drop-div';

    const arrowDiv = document.createElement('div');
    arrowDiv.className = 'arrow-div';
    arrowDiv.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#00000"><path d="m560-240-56-58 142-142H160v-80h486L504-662l56-58 240 240-240 240Z"/></svg>'

    dropdownDiv.appendChild(leftDropDownDiv);
    dropdownDiv.appendChild(arrowDiv);
    dropdownDiv.appendChild(rightDropDownDiv);

    const dropdownWithProgressDiv = document.createElement('div');
    dropdownWithProgressDiv.className = 'drop-div-progress';

    const buildProgress = document.createElement('pre');
    buildProgress.id = 'build-progress-' + `${rowCounter}`;
    buildProgress.className = 'pre-progress';
    buildProgress.style.display = 'none';
    dropdownWithProgressDiv.appendChild(dropdownDiv);
    dropdownWithProgressDiv.appendChild(buildProgress);



    const buttonDiv = document.createElement('div');
    buttonDiv.className = 'button-div';

    const button = document.createElement('button');
    button.id = 'button-progress-' + `${rowCounter}`;
    button.className = 'material-button';
    button.textContent = 'Build and Copy';

    const copy = document.createElement('button');
    copy.id = 'copy-progress-' + `${rowCounter}`;
    copy.className = 'material-button';
    copy.textContent = 'Copy';

    const watch = document.createElement('button');
    watch.id = 'watch-progress-' + `${rowCounter}`;
    watch.className = 'material-button';
    watch.textContent = 'Watch';

    const progress = document.createElement('pre');
    progress.id = 'progress-' + `${rowCounter}`;
    progress.className = 'button-progress';
    progress.style.display = 'none';
    buttonDiv.appendChild(button);
    buttonDiv.appendChild(progress);


    button.onclick = () => buildAndCopy(leftDropdown, rightDropdown, button, progress);
    copy.onclick = () => copyFunc(leftDropdown, rightDropdown, copy, progress);

    rowCounter++;
    row.id = 'row-' + `${rowCounter}`;
    watch.onclick = () => watchFunc(leftDropdown, rightDropdown, watch, progress, rowCounter);

    row.appendChild(dropdownWithProgressDiv);
    row.appendChild(watch);

    row.appendChild(buttonDiv);
    row.appendChild(copy);

    const closeButtonDiv = document.createElement('div');
    closeButtonDiv.id = 'close-button-div-' + `${rowCounter}`;
    closeButtonDiv.className = 'close-button-div';
    const closeButton = document.createElement('button');
    closeButton.id = 'close-button-progress-' + `${rowCounter}`;
    closeButton.className = 'material-button error close-button-div';
    closeButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#ffffff"><path d="m336-280 144-144 144 144 56-56-144-144 144-144-56-56-144 144-144-144-56 56 144 144-144 144 56 56ZM480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z"/></svg>';
    closeButton.onclick = () => rowsContainer.removeChild(row);;

    closeButtonDiv.appendChild(closeButton);

    row.appendChild(closeButtonDiv);


    rowsContainer.appendChild(row);

}

function buildAndCopy(leftDropdown, rightDropdown, button, progress)
{
    const source = leftDropdown.value;
    const destination = rightDropdown.value;
    if (!source || !destination) {
        return
    }
    button.classList.add('disabled');
    window.API.build_copy({ source: source, destination: destination, progress: progress.id });
}

function copyFunc(leftDropdown, rightDropdown, button, progress)
{
    const source = leftDropdown.value;
    const destination = rightDropdown.value;
    if (!source || !destination) {
        return
    }
    button.classList.add('disabled');
    window.API.copy({ source: source, destination: destination, progress: progress.id });
}

function watchFunc(leftDropdown, rightDropdown, button, progress, rowCounter)
{
    const source = leftDropdown.value;
    const destination = rightDropdown.value;
    if (!source) {
        return
    }
    button.classList.add('disabled');
    window.API.watch({ source: source, destination: destination, progress: progress.id, rowCounter: rowCounter });
}

function populateLeftDropdown(dropdown, keys)
{
    const libs = Object.keys(keys.Library);
    libs.forEach(key =>
    {
        const option = document.createElement('option');
        option.value = JSON.stringify({ path: keys.Library[key].path, node_path: keys.Library[key].libPath });
        option.textContent = keys.Library[key].name;
        dropdown.appendChild(option);
    });
}


function populateRightDropdown(dropdown, keys)
{
    const apps = Object.keys(keys.Application);
    apps.forEach(key =>
    {
        const option = document.createElement('option');
        option.value = JSON.stringify({ path: keys.Application[key].path });
        option.textContent = keys.Application[key].name;
        dropdown.appendChild(option);
    });

    const libs = Object.keys(keys.Library);
    libs.forEach(key =>
    {
        const option = document.createElement('option');
        option.value = JSON.stringify({ path: keys.Library[key].path });
        option.textContent = keys.Library[key].name;
        dropdown.appendChild(option);
    });
}

window.API.build_output((data, progress, isDone) =>
{
    if (!isDone) {
        const element = document.getElementById(`build-${progress}`)
        element.style.display = 'block';
        element.innerText += data + "\n";
        element.scrollTop = element.scrollHeight;
    }
    else {
        const element = document.getElementById(`${progress}`)
        element.style.display = 'block';
        element.innerText = 'Build Done: ';
        const now = new Date();
        element.innerText += now.toLocaleTimeString();
        element.innerText += '\n';
    }
})

window.API.watch_output((data, progress, rowCounter, pid) =>
{
    const element = document.getElementById(`build-${progress}`)
    element.style.display = 'block';
    element.innerText += data + "\n";
    element.scrollTop = element.scrollHeight;

    const button = document.getElementById('close-button-progress-' + `${rowCounter}`);
    button.onclick = () =>
    {
        window.API.kill({ command: pid });
        const rowsContainer = document.getElementById('rowsContainer');
        const row = document.getElementById('row-' + `${rowCounter}`);
        rowsContainer.removeChild(row)

    }
})

window.API.copy_output((data, progress, isDone) =>
{

    if (!isDone) {
        const element = document.getElementById(`build-${progress}`)
        element.style.display = 'block';
        element.innerText += data + "\n";
        element.scrollTop = element.scrollHeight;
    }
    else {
        const element = document.getElementById(`${progress}`)
        element.style.display = 'block';
        element.innerText += 'Copied: ';
        const now = new Date();
        element.innerText += now.toLocaleTimeString();
        element.innerText += '\n';
        const button = document.getElementById(`button-${progress}`)
        button.classList.remove('disabled');
        const x = document.getElementById(`copy-${progress}`)
        x.classList.remove('disabled');
    }
})


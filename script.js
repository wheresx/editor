// Configuration
const CONFIG = {
    repo: 'wheresx/davis',         // Replace with your repository (e.g., 'username/repo')
    path: 'input.csv',              // Replace with your CSV file path
    branch: 'main'                  // Replace with your branch name
};

let csvData = [];
let originalSha = '';
let dragStartIndex = null;

async function fetchFromGitHub(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            'Authorization': `Bearer ${access_token}`,
            'Accept': 'application/vnd.github.v3+json',
            ...options.headers
        }
    });
    if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
    }
    return response.json();
}

function parseCSV(content) {
    return content.split('\n')
        .map(line => line.trim())
        .filter(line => line)
        .map(line => line.split(',').map(cell => cell.trim()));
}

function renderTable() {
    const container = document.getElementById('table-container');
    const table = document.createElement('table');
    const headers = csvData[0];

    // Create header row
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    // Add drag handle column
    const dragHandleHeader = document.createElement('th');
    dragHandleHeader.style.width = '30px';
    headerRow.appendChild(dragHandleHeader);
    
    headers.forEach(header => {
        const th = document.createElement('th');
        th.textContent = header;
        headerRow.appendChild(th);
    });
    headerRow.appendChild(document.createElement('th')); // For action buttons
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Create data rows
    const tbody = document.createElement('tbody');
    tbody.setAttribute('id', 'sortable-tbody');
    
    for (let i = 1; i < csvData.length; i++) {
        const row = document.createElement('tr');
        row.setAttribute('draggable', 'true');
        row.dataset.index = i;
        
        // Add drag handle
        const dragHandle = document.createElement('td');
        dragHandle.innerHTML = '⋮⋮'; // Vertical dots as drag handle
        dragHandle.className = 'drag-handle';
        dragHandle.style.cursor = 'move';
        row.appendChild(dragHandle);
        
        // Add data cells
        csvData[i].forEach((cell, cellIndex) => {
            const td = document.createElement('td');
            td.className = 'editable';
            td.contentEditable = true;
            td.textContent = cell;
            td.addEventListener('blur', () => updateCell(i, cellIndex, td.textContent));
            row.appendChild(td);
        });

        // Add action buttons
        const actionCell = document.createElement('td');
        actionCell.className = 'action-buttons';
        
        // Delete button
        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.onclick = () => deleteRow(i);
        
        // Duplicate button
        const duplicateButton = document.createElement('button');
        duplicateButton.textContent = 'Duplicate';
        duplicateButton.onclick = () => duplicateRow(i);
        
        actionCell.appendChild(deleteButton);
        actionCell.appendChild(duplicateButton);
        row.appendChild(actionCell);

        // Add drag and drop event listeners
        row.addEventListener('dragstart', handleDragStart);
        row.addEventListener('dragend', handleDragEnd);
        row.addEventListener('dragover', handleDragOver);
        row.addEventListener('drop', handleDrop);

        tbody.appendChild(row);
    }
    
    table.appendChild(tbody);
    container.innerHTML = '';
    container.appendChild(table);

    // Add some basic styles
    const style = document.createElement('style');
    style.textContent = `
        .drag-handle {
            text-align: center;
            color: #666;
            user-select: none;
        }
        .action-buttons button {
            margin: 0 4px;
        }
        tr.dragging {
            opacity: 0.5;
        }
        tr.drag-over {
            border-top: 2px solid blue;
        }
    `;
    document.head.appendChild(style);
}

function handleDragStart(e) {
    dragStartIndex = parseInt(e.target.closest('tr').dataset.index);
    e.target.closest('tr').classList.add('dragging');
}

function handleDragEnd(e) {
    e.target.closest('tr').classList.remove('dragging');
    document.querySelectorAll('tr').forEach(row => {
        row.classList.remove('drag-over');
    });
}

function handleDragOver(e) {
    e.preventDefault();
    const row = e.target.closest('tr');
    if (row && !row.classList.contains('dragging')) {
        document.querySelectorAll('tr').forEach(r => r.classList.remove('drag-over'));
        row.classList.add('drag-over');
    }
}

function handleDrop(e) {
    e.preventDefault();
    const dragEndIndex = parseInt(e.target.closest('tr').dataset.index);
    
    if (dragStartIndex !== null && dragEndIndex !== dragStartIndex) {
        // Move the row in the data array
        const [movedRow] = csvData.splice(dragStartIndex, 1);
        csvData.splice(dragEndIndex, 0, movedRow);
        renderTable();
    }
    
    dragStartIndex = null;
}

function duplicateRow(rowIndex) {
    // Create a deep copy of the row
    const newRow = [...csvData[rowIndex]];
    // Add the duplicated row at the end of the array
    csvData.push(newRow);
    renderTable();
}

// Rest of the existing functions remain the same
function updateCell(rowIndex, cellIndex, newValue) {
    csvData[rowIndex][cellIndex] = newValue;
}

function addRow() {
    const newRow = new Array(csvData[0].length).fill('');
    csvData.push(newRow);
    renderTable();
}

function deleteRow(rowIndex) {
    csvData.splice(rowIndex, 1);
    renderTable();
}

function rowToCSV(row) {
    return row.map(cell => cell.includes(',') ? `"${cell}"` : cell).join(',');
}

async function saveChanges() {
    try {
        const csvContent = csvData
            .map(rowToCSV)
            .join('\n');

        const content = btoa(csvContent);

        const response = await fetchFromGitHub(`https://api.github.com/repos/${CONFIG.repo}/contents/${CONFIG.path}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: 'Update CSV file via web editor',
                content: content,
                sha: originalSha,
                branch: CONFIG.branch
            })
        });

        originalSha = response.content.sha;
        alert('Changes saved successfully!');
    } catch (error) {
        alert('Error saving changes: ' + error.message);
    }
}

function logout() {
    access_token = null;
    localStorage.removeItem('access_token');
    csvData = [];
    originalSha = '';
    document.getElementById('login-section').classList.remove('hidden');
    document.getElementById('editor-section').classList.add('hidden');
}


async function loadCSVFile() {
    try {
        // Get file content from GitHub
        const response = await fetchFromGitHub(`https://api.github.com/repos/${CONFIG.repo}/contents/${CONFIG.path}`);
        originalSha = response.sha;

        // Decode base64 content
        const content = atob(response.content);
        csvData = parseCSV(content);
        renderTable();
    } catch (error) {
        alert('Error loading CSV: ' + error.message);
    }
}

async function initializeEditor() {
    document.getElementById('login-section').classList.add('hidden');
    document.getElementById('editor-section').classList.remove('hidden');

    // Get user info
    const userInfo = await fetchFromGitHub('https://api.github.com/user');
    document.getElementById('user-info').innerHTML = `
        User: ${userInfo.login}
        <button onclick="logout()">Logout</button>
    `;

    await loadCSVFile();
}

async function afterAuth() {
    console.log("Logged in successfully:", access_token);
    await initializeEditor();
}





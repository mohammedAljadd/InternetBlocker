document.addEventListener("DOMContentLoaded", function () {
    let allBlockedItems = [];
    let currentFilter = 'all';
    let selectedItems = new Set();

    // Initialize the page
    initializePage();
    setupEventListeners();
    loadAllBlockedContent();

    function initializePage() {
        updateStats();
    }

    function setupEventListeners() {
        // Search functionality
        document.getElementById('search-input').addEventListener('input', handleSearch);
        document.getElementById('clear-search').addEventListener('click', clearSearch);

        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', handleFilter);
        });

        // Bulk actions
        document.getElementById('select-all-btn').addEventListener('click', selectAll);
        document.getElementById('unblock-selected-btn').addEventListener('click', unblockSelected);
        document.getElementById('clear-all-btn').addEventListener('click', clearAll);

        // Add item buttons
        document.getElementById('add-site-btn').addEventListener('click', () => openAddModal('site'));
        document.getElementById('add-channel-btn').addEventListener('click', () => openAddModal('channel'));
        document.getElementById('add-adult-btn').addEventListener('click', () => openAddModal('adult'));

        // Collapse buttons
        document.querySelectorAll('.collapse-btn').forEach(btn => {
            btn.addEventListener('click', handleCollapse);
        });

        // Modal functionality
        document.getElementById('modal-cancel').addEventListener('click', closeModal);
        document.getElementById('modal-add').addEventListener('click', handleAddItem);
        document.querySelector('.close').addEventListener('click', closeModal);
        document.getElementById('add-modal').addEventListener('click', function(e) {
            if (e.target === this) closeModal();
        });

        // Export/Import
        document.getElementById('export-data').addEventListener('click', exportData);
        document.getElementById('import-data').addEventListener('click', () => {
            document.getElementById('import-file').click();
        });
        document.getElementById('import-file').addEventListener('change', importData);

        // Keyboard shortcuts
        document.addEventListener('keydown', handleKeyboard);
    }

    function loadAllBlockedContent() {
        chrome.storage.sync.get({ 
            blockedSites: [], 
            blockedChannels: [], 
            pornSites: [] 
        }, function (data) {
            const sites = data.blockedSites || [];
            const channels = data.blockedChannels || [];
            const adult = data.pornSites || [];

            // Combine all items with type information
            allBlockedItems = [
                ...sites.map(site => ({ name: site, type: 'site', category: 'sites' })),
                ...channels.map(channel => ({ name: channel, type: 'channel', category: 'channels' })),
                ...adult.map(site => ({ name: site, type: 'adult', category: 'adult' }))
            ];

            displayAllContent();
            updateStats();
            showEmptyStates();
        });
    }

    function displayAllContent() {
        displayBlockedSites();
        displayBlockedChannels();
        displayBlockedAdult();
    }

    function displayBlockedSites() {
        const sites = allBlockedItems.filter(item => item.type === 'site');
        displayItems('blocked-list', sites, 'site');
    }

    function displayBlockedChannels() {
        const channels = allBlockedItems.filter(item => item.type === 'channel');
        displayItems('blocked-youtube-channel-list', channels, 'channel');
    }

    function displayBlockedAdult() {
        const adult = allBlockedItems.filter(item => item.type === 'adult');
        displayItems('blocked-adult-list', adult, 'adult');
    }

    function displayItems(containerId, items, type) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';

        const sortedItems = items.sort((a, b) => {
            const cleanA = a.name.replace(/^www\./, '').toLowerCase();
            const cleanB = b.name.replace(/^www\./, '').toLowerCase();
            return cleanA.localeCompare(cleanB);
        });

        sortedItems.forEach((item, index) => {
            const listItem = createListItem(item, type, index);
            container.appendChild(listItem);
        });
    }

    function createListItem(item, type, index) {
        const listItem = document.createElement('li');
        listItem.className = 'fade-in';
        listItem.dataset.type = type;
        listItem.dataset.name = item.name.toLowerCase();

        const cleanedName = item.name.replace(/^www\./, '');
        const displayName = type === 'channel' ? `@${cleanedName}` : cleanedName;
        const typeLabel = type === 'site' ? 'Website' : 
                         type === 'channel' ? 'YouTube Channel' : 'Adult Site';

        listItem.innerHTML = `
            <div class="item-content">
                <input type="checkbox" class="item-checkbox" data-item="${item.name}" data-type="${type}">
                <div class="item-info">
                    <div class="item-name">${displayName}</div>
                    <div class="item-type">${typeLabel}</div>
                </div>
            </div>
            <div class="item-actions">
                <button class="unblock-btn" onclick="unblockSingleItem('${item.name}', '${type}')">
                    Unblock
                </button>
            </div>
        `;

        // Add click handler for selection
        listItem.addEventListener('click', function(e) {
            if (e.target.type !== 'checkbox' && !e.target.classList.contains('unblock-btn')) {
                const checkbox = listItem.querySelector('.item-checkbox');
                checkbox.checked = !checkbox.checked;
                handleItemSelection(checkbox);
            }
        });

        // Add checkbox change handler
        const checkbox = listItem.querySelector('.item-checkbox');
        checkbox.addEventListener('change', function() {
            handleItemSelection(this);
        });

        return listItem;
    }

    function handleItemSelection(checkbox) {
        const item = `${checkbox.dataset.type}:${checkbox.dataset.item}`;
        const listItem = checkbox.closest('li');
        
        if (checkbox.checked) {
            selectedItems.add(item);
            listItem.classList.add('selected');
        } else {
            selectedItems.delete(item);
            listItem.classList.remove('selected');
        }

        updateBulkActionButtons();
    }

    function updateBulkActionButtons() {
        const selectAllBtn = document.getElementById('select-all-btn');
        const unblockSelectedBtn = document.getElementById('unblock-selected-btn');
        
        const visibleCheckboxes = document.querySelectorAll('.item-checkbox:not(.hidden)');
        const checkedBoxes = document.querySelectorAll('.item-checkbox:checked:not(.hidden)');
        
        selectAllBtn.textContent = checkedBoxes.length === visibleCheckboxes.length && visibleCheckboxes.length > 0 ? 
            'Deselect All' : 'Select All';
        
        unblockSelectedBtn.disabled = selectedItems.size === 0;
        unblockSelectedBtn.textContent = `Unblock Selected (${selectedItems.size})`;
    }

    function handleSearch() {
        const searchTerm = document.getElementById('search-input').value.toLowerCase();
        const allItems = document.querySelectorAll('.blocked-content li');
        
        allItems.forEach(item => {
            const name = item.dataset.name || '';
            const isVisible = name.includes(searchTerm);
            
            if (isVisible && (currentFilter === 'all' || item.dataset.type === getFilterType(currentFilter))) {
                item.style.display = 'flex';
                item.classList.remove('hidden');
            } else {
                item.style.display = 'none';
                item.classList.add('hidden');
            }
        });
        
        showEmptyStates();
        updateBulkActionButtons();
    }

    function clearSearch() {
        document.getElementById('search-input').value = '';
        handleSearch();
    }

    function handleFilter(e) {
        // Update active filter button
        document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        
        currentFilter = e.target.dataset.filter;
        
        // Show/hide sections based on filter
        const sections = {
            'sites': document.getElementById('sites-section'),
            'channels': document.getElementById('channels-section'),
            'adult': document.getElementById('adult-section')
        };
        
        Object.entries(sections).forEach(([key, section]) => {
            if (currentFilter === 'all' || currentFilter === key) {
                section.style.display = 'block';
            } else {
                section.style.display = 'none';
            }
        });
        
        // Re-apply search filter
        handleSearch();
    }

    function getFilterType(filter) {
        const filterMap = {
            'sites': 'site',
            'channels': 'channel',
            'adult': 'adult'
        };
        return filterMap[filter] || filter;
    }

    function selectAll() {
        const visibleCheckboxes = document.querySelectorAll('.item-checkbox:not(.hidden)');
        const allChecked = Array.from(visibleCheckboxes).every(cb => cb.checked);
        
        visibleCheckboxes.forEach(checkbox => {
            checkbox.checked = !allChecked;
            handleItemSelection(checkbox);
        });
    }

    function unblockSelected() {
        if (selectedItems.size === 0) return;
        
        if (!confirm(`Are you sure you want to unblock ${selectedItems.size} items?`)) return;
        
        const itemsToUnblock = Array.from(selectedItems).map(item => {
            const [type, name] = item.split(':');
            return { type, name };
        });
        
        // Group by type for efficient storage updates
        const groups = {
            site: itemsToUnblock.filter(item => item.type === 'site').map(item => item.name),
            channel: itemsToUnblock.filter(item => item.type === 'channel').map(item => item.name),
            adult: itemsToUnblock.filter(item => item.type === 'adult').map(item => item.name)
        };
        
        // Update storage for each type
        chrome.storage.sync.get({ blockedSites: [], blockedChannels: [], pornSites: [] }, function(data) {
            const updates = {
                blockedSites: data.blockedSites.filter(site => !groups.site.includes(site)),
                blockedChannels: data.blockedChannels.filter(channel => !groups.channel.includes(channel)),
                pornSites: data.pornSites.filter(site => !groups.adult.includes(site))
            };
            
            chrome.storage.sync.set(updates, function() {
                selectedItems.clear();
                loadAllBlockedContent();
                showStatusMessage(`Successfully unblocked ${itemsToUnblock.length} items!`, 'success');
            });
        });
    }

    function clearAll() {
        if (!confirm('Are you sure you want to clear ALL blocked content? This action cannot be undone.')) return;
        
        chrome.storage.sync.set({
            blockedSites: [],
            blockedChannels: [],
            pornSites: []
        }, function() {
            selectedItems.clear();
            loadAllBlockedContent();
            showStatusMessage('All blocked content has been cleared!', 'success');
        });
    }

    function handleCollapse(e) {
        const targetId = e.target.dataset.target;
        const target = document.getElementById(targetId);
        const isCollapsed = target.classList.contains('collapsed');
        
        if (isCollapsed) {
            target.classList.remove('collapsed');
            e.target.textContent = '−';
        } else {
            target.classList.add('collapsed');
            e.target.textContent = '+';
        }
    }

    function openAddModal(type) {
        const modal = document.getElementById('add-modal');
        const title = document.getElementById('modal-title');
        const input = document.getElementById('modal-input');
        const help = document.getElementById('modal-help');
        
        const config = {
            site: {
                title: 'Add New Website',
                placeholder: 'Enter website URL (e.g., example.com)',
                help: 'Enter the website domain or URL you want to block'
            },
            channel: {
                title: 'Add YouTube Channel',
                placeholder: 'Enter channel name (e.g., ChannelName)',
                help: 'Enter the YouTube channel name you want to block'
            },
            adult: {
                title: 'Add Adult Site',
                placeholder: 'Enter adult website URL (e.g., example.com)',
                help: 'Enter the adult website domain or URL you want to block'
            }
        };
        
        title.textContent = config[type].title;
        input.placeholder = config[type].placeholder;
        help.textContent = config[type].help;
        input.dataset.type = type;
        input.value = '';
        
        modal.style.display = 'block';
        input.focus();
    }

    function closeModal() {
        document.getElementById('add-modal').style.display = 'none';
    }

    function handleAddItem() {
        const input = document.getElementById('modal-input');
        const type = input.dataset.type;
        const value = input.value.trim();
        
        if (!value) {
            showStatusMessage('Please enter a valid value!', 'error');
            return;
        }
        
        // Normalize input based on type
        let normalizedValue = value;
        if (type === 'channel') {
            normalizedValue = value.replace(/\s+/g, '').toLowerCase();
        } else if (type === 'site' || type === 'adult') {
            // Remove protocol and www if present
            normalizedValue = value.replace(/^https?:\/\//, '').replace(/^www\./, '');
        }
        
        const storageKey = type === 'site' ? 'blockedSites' : 
                          type === 'channel' ? 'blockedChannels' : 'pornSites';
        
        chrome.storage.sync.get({ [storageKey]: [] }, function(data) {
            const items = data[storageKey];
            
            if (!items.includes(normalizedValue)) {
                items.push(normalizedValue);
                chrome.storage.sync.set({ [storageKey]: items }, function() {
                    closeModal();
                    loadAllBlockedContent();
                    showStatusMessage(`Successfully added ${value}!`, 'success');
                });
            } else {
                showStatusMessage('This item is already blocked!', 'warning');
            }
        });
    }

    function exportData() {
        chrome.storage.sync.get({ blockedSites: [], blockedChannels: [], pornSites: [] }, function(data) {
            const exportData = {
                blockedSites: data.blockedSites || [],
                blockedChannels: data.blockedChannels || [],
                pornSites: data.pornSites || [],
                exportDate: new Date().toISOString(),
                version: '3.0.0'
            };
            
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `internetguard-backup-${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            URL.revokeObjectURL(url);
            
            showStatusMessage('Data exported successfully!', 'success');
        });
    }

    function importData(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = JSON.parse(e.target.result);
                
                // Validate data structure
                if (!data.blockedSites && !data.blockedChannels && !data.pornSites) {
                    throw new Error('Invalid file format');
                }
                
                const importData = {
                    blockedSites: data.blockedSites || [],
                    blockedChannels: data.blockedChannels || [],
                    pornSites: data.pornSites || []
                };
                
                if (!confirm(`This will replace your current blocked content with:\n• ${importData.blockedSites.length} websites\n• ${importData.blockedChannels.length} YouTube channels\n• ${importData.pornSites.length} adult sites\n\nContinue?`)) {
                    return;
                }
                
                chrome.storage.sync.set(importData, function() {
                    loadAllBlockedContent();
                    showStatusMessage('Data imported successfully!', 'success');
                });
                
            } catch (error) {
                showStatusMessage('Error importing file. Please check the file format.', 'error');
            }
        };
        
        reader.readAsText(file);
        event.target.value = ''; // Reset file input
    }

    function handleKeyboard(e) {
        // Escape key closes modal
        if (e.key === 'Escape') {
            closeModal();
        }
        
        // Enter key in modal input
        if (e.key === 'Enter' && e.target.id === 'modal-input') {
            handleAddItem();
        }
        
        // Ctrl+A selects all visible items
        if (e.ctrlKey && e.key === 'a' && !e.target.matches('input')) {
            e.preventDefault();
            selectAll();
        }
    }

    function updateStats() {
        chrome.storage.sync.get({ blockedSites: [], blockedChannels: [], pornSites: [] }, function(data) {
            document.getElementById('total-blocked-sites').textContent = (data.blockedSites || []).length;
            document.getElementById('total-blocked-channels').textContent = (data.blockedChannels || []).length;
            document.getElementById('total-blocked-adult').textContent = (data.pornSites || []).length;
        });
    }

    function showEmptyStates() {
        const sections = [
            { id: 'empty-sites', listId: 'blocked-list' },
            { id: 'empty-channels', listId: 'blocked-youtube-channel-list' },
            { id: 'empty-adult', listId: 'blocked-adult-list' }
        ];
        
        sections.forEach(section => {
            const emptyState = document.getElementById(section.id);
            const list = document.getElementById(section.listId);
            const hasVisibleItems = list.querySelectorAll('li:not(.hidden)').length > 0;
            
            emptyState.style.display = hasVisibleItems ? 'none' : 'block';
        });
    }

    function showStatusMessage(message, type) {
        const statusElement = document.getElementById('status');
        statusElement.textContent = message;
        statusElement.className = `status-message ${type}`;
        
        // Clear message after 5 seconds
        setTimeout(() => {
            statusElement.textContent = '';
            statusElement.className = 'status-message';
        }, 5000);
    }

    // Global functions for inline onclick handlers
    window.unblockSingleItem = function(itemName, type) {
        if (!confirm(`Are you sure you want to unblock "${itemName}"?`)) return;
        
        const storageKey = type === 'site' ? 'blockedSites' : 
                          type === 'channel' ? 'blockedChannels' : 'pornSites';
        
        chrome.storage.sync.get({ [storageKey]: [] }, function(data) {
            const items = data[storageKey].filter(item => item !== itemName);
            chrome.storage.sync.set({ [storageKey]: items }, function() {
                loadAllBlockedContent();
                showStatusMessage(`Successfully unblocked "${itemName}"!`, 'success');
            });
        });
    };
});
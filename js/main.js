// Main UI event handlers and initialization

class DiaryUI {
    constructor() {
        this.currentDiary = null;
        this.currentUser = null;
        this.notificationPermission = false;
        this.init();
    }

    // Initialize the UI
    init() {
        this.setupEventListeners();
        this.setDefaultDate();
        this.requestNotificationPermission();
        this.loadFromLocalStorage();
        this.setMobileBackground();
    }

    // Set mobile background image with optimization
    setMobileBackground() {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const isSmallScreen = window.innerWidth <= 768;

        // Cache the current background to avoid unnecessary updates
        const currentBackground = document.body.style.backgroundImage;
        const targetBackground = (isMobile || isSmallScreen) ? "url('/assets/phone.png')" : "url('/assets/forest.png')";

        // Only update if background is different
        if (currentBackground !== targetBackground) {
            document.body.style.backgroundImage = targetBackground;
            console.log(isMobile || isSmallScreen ? 'Mobile device detected, using phone.png background' : 'Desktop device detected, using forest.png background');
        }
    }

    // Setup all event listeners
    setupEventListeners() {
        // Diary selection
        document.getElementById('joinDiaryBtn')?.addEventListener('click', () => this.joinDiary());
        document.getElementById('createDiaryBtn')?.addEventListener('click', () => {
            console.log('Create Diary button clicked!');
            this.createDiary();
        });
        document.getElementById('newDiaryBtn')?.addEventListener('click', () => this.startNewDiary());

        // Form switching
        document.getElementById('showCreateFormBtn')?.addEventListener('click', () => this.showCreateForm());
        document.getElementById('showJoinFormBtn')?.addEventListener('click', () => this.showJoinForm());

        // Password visibility toggle
        document.getElementById('toggleJoinPassword')?.addEventListener('click', () => this.toggleJoinPasswordVisibility());
        document.getElementById('toggleCreatePassword')?.addEventListener('click', () => this.toggleCreatePasswordVisibility());

        // Entry creation
        document.getElementById('submitEntryBtn')?.addEventListener('click', () => this.submitEntry());

        // Entry unlocking
        document.getElementById('unlockEntriesBtn')?.addEventListener('click', () => this.unlockEntries());
        document.getElementById('unlockDate')?.addEventListener('change', () => this.onUnlockDateChange());

        // Timeline navigation
        document.getElementById('prevDayBtn')?.addEventListener('click', () => window.diaryManager.previousDay());
        document.getElementById('nextDayBtn')?.addEventListener('click', () => window.diaryManager.nextDay());

        // PDF export
        document.getElementById('exportPdfBtn')?.addEventListener('click', () => this.exportPDF());

        // Help modal
        document.getElementById('helpBtn')?.addEventListener('click', () => this.showHelpModal());
        document.getElementById('closeHelpBtn')?.addEventListener('click', () => this.hideHelpModal());

        // Notifications
        document.getElementById('notificationBtn')?.addEventListener('click', () => this.toggleNotifications());

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));

        // Window resize for background switching with debouncing
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => this.setMobileBackground(), 150);
        });
        window.addEventListener('orientationchange', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => this.setMobileBackground(), 200);
        });
    }

    // Set default date to today
    setDefaultDate() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('entryDate')?.setAttribute('value', today);
        document.getElementById('unlockDate')?.setAttribute('value', today);
    }

    // Request notification permission
    async requestNotificationPermission() {
        if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            this.notificationPermission = permission === 'granted';

            if (this.notificationPermission) {
                this.scheduleDailyReminder();
            }
        }
    }

    // Schedule daily reminder
    scheduleDailyReminder() {
        if (!this.notificationPermission) return;

        // Check if reminder is already scheduled
        if (localStorage.getItem('reminderScheduled')) return;

        // Schedule reminder for 8 PM daily
        const now = new Date();
        const reminderTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 20, 0, 0);

        if (reminderTime <= now) {
            reminderTime.setDate(reminderTime.getDate() + 1);
        }

        const timeUntilReminder = reminderTime.getTime() - now.getTime();

        setTimeout(() => {
            this.showDailyReminder();
            this.scheduleDailyReminder(); // Schedule next day
        }, timeUntilReminder);

        localStorage.setItem('reminderScheduled', 'true');
    }

    // Show daily reminder notification
    showDailyReminder() {
        if (this.notificationPermission && this.currentDiary) {
            new Notification('Shared Diary Reminder', {
                body: `Time to write today's entry in ${this.currentDiary.diary_id}!`,
                icon: '/assets/icon.png',
                tag: 'daily-reminder'
            });
        }
    }

    // Toggle notifications
    toggleNotifications() {
        if (this.notificationPermission) {
            this.notificationPermission = false;
            localStorage.removeItem('reminderScheduled');
            this.showMessage('Notifications disabled', 'info');
        } else {
            this.requestNotificationPermission();
        }
    }

    // Load data from localStorage
    loadFromLocalStorage() {
        const savedDiary = localStorage.getItem('currentDiary');
        const savedUser = localStorage.getItem('currentUser');

        if (savedDiary && savedUser) {
            try {
                this.currentDiary = JSON.parse(savedDiary);
                this.currentUser = savedUser;
                this.showDiaryInterface();
                window.diaryManager.init(this.currentDiary, this.currentUser);
            } catch (error) {
                console.error('Error loading saved diary:', error);
                localStorage.removeItem('currentDiary');
                localStorage.removeItem('currentUser');
            }
        }
    }

    // Save data to localStorage
    saveToLocalStorage() {
        if (this.currentDiary) {
            localStorage.setItem('currentDiary', JSON.stringify(this.currentDiary));
        }
        if (this.currentUser) {
            localStorage.setItem('currentUser', this.currentUser);
        }
    }

    // Create a new diary
    async createDiary() {
        console.log('createDiary method called!');
        const diaryId = document.getElementById('createDiaryId').value.trim();
        const userName = document.getElementById('createUserName').value.trim();
        const userPassword = document.getElementById('createUserPassword').value;
        const diaryType = document.getElementById('createDiaryType').value;

        console.log('Form values:', { diaryId, userName, userPassword: userPassword ? '***' : 'empty', diaryType });

        if (!this.validateInputs(diaryId, userName, userPassword)) return;

        try {
            this.showLoading('Creating diary...');
            const result = await window.diaryDB.createDiary(diaryId, userName, diaryType, userPassword);

            if (result.success) {
                console.log('Diary created successfully:', result.data);
                this.currentDiary = result.data;
                this.currentUser = userName;
                this.saveToLocalStorage();
                this.showDiaryInterface();
                console.log('Diary interface shown, initializing diary manager...');
                console.log('diaryManager object:', window.diaryManager);
                window.diaryManager.init(this.currentDiary, this.currentUser);
                console.log('Diary manager initialized successfully');
                this.showMessage('Diary created successfully!', 'success');
            } else {
                this.showMessage(result.error, 'error');
                // Clear diary ID field if it's a duplicate error
                if (result.error.includes('already exists') || result.error.includes('Diary ID')) {
                    document.getElementById('createDiaryId').value = '';
                    document.getElementById('createDiaryId').focus();
                }
            }
        } catch (error) {
            console.error('Error in createDiary:', error);
            this.showMessage(error.message, 'error');
            // Clear diary ID field if it's a duplicate error
            if (error.message.includes('already exists') || error.message.includes('Diary ID')) {
                document.getElementById('createDiaryId').value = '';
                document.getElementById('createDiaryId').focus();
            }
        } finally {
            this.hideLoading();
        }
    }

    // Join an existing diary
    async joinDiary() {
        const diaryId = document.getElementById('joinDiaryId').value.trim();
        const userPassword = document.getElementById('joinUserPassword').value;

        if (!this.validateInputs(diaryId, '', userPassword)) return;

        try {
            this.showLoading('Joining diary...');
            const result = await window.diaryDB.joinDiary(diaryId, userName, userPassword);

            if (result.success) {
                this.currentDiary = result.data;
                this.currentUser = userName;
                this.saveToLocalStorage();
                this.showDiaryInterface();
                window.diaryManager.init(this.currentDiary, this.currentUser);
                this.showMessage(result.message || 'Joined diary successfully!', 'success');
            } else {
                this.showMessage(result.error, 'error');
            }
        } catch (error) {
            this.showMessage(error.message, 'error');
        } finally {
            this.hideLoading();
        }
    }

    // Form switching methods
    showCreateForm() {
        document.getElementById('joinDiaryForm').classList.add('hidden');
        document.getElementById('createDiaryForm').classList.remove('hidden');
        // Switch bear to create form
        if (window.tunnelBear) {
            window.tunnelBear.switchToCreateForm();
        }
    }

    showJoinForm() {
        document.getElementById('createDiaryForm').classList.add('hidden');
        document.getElementById('joinDiaryForm').classList.remove('hidden');
        // Switch bear to join form
        if (window.tunnelBear) {
            window.tunnelBear.switchToJoinForm();
        }
    }

    // Toggle join password visibility
    toggleJoinPasswordVisibility() {
        const passwordInput = document.getElementById('joinUserPassword');
        const toggleButton = document.getElementById('toggleJoinPassword');

        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            toggleButton.innerHTML = `
                <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                </svg>
            `;
        } else {
            passwordInput.type = 'password';
            toggleButton.innerHTML = `
                <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
            `;
        }
    }

    // Toggle create password visibility
    toggleCreatePasswordVisibility() {
        const passwordInput = document.getElementById('createUserPassword');
        const toggleButton = document.getElementById('toggleCreatePassword');

        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            toggleButton.innerHTML = `
                <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                </svg>
            `;
        } else {
            passwordInput.type = 'password';
            toggleButton.innerHTML = `
                <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
            `;
        }
    }

    // Validate input fields
    validateInputs(diaryId, userName, userPassword = '') {
        console.log('validateInputs called with:', { diaryId, userName, userPassword: userPassword ? '***' : 'empty' });

        // For joining, userName can be empty (will be retrieved from diary)
        if (userName && userName.length < 2) {
            this.showMessage('Name must be at least 2 characters', 'error');
            this.addErrorClass('createUserName');
            return false;
        }
        this.removeErrorClass('createUserName');

        if (!diaryId) {
            this.showMessage('Please enter a Diary ID', 'error');
            this.addErrorClass('diaryId');
            return false;
        }
        this.removeErrorClass('diaryId');

        if (!userPassword) {
            this.showMessage('Please enter your secret password', 'error');
            this.addErrorClass('userPassword');
            return false;
        }
        this.removeErrorClass('userPassword');

        if (diaryId.length < 3) {
            this.showMessage('Diary ID must be at least 3 characters', 'error');
            this.addErrorClass('diaryId');
            return false;
        }

        // Validate user password length
        if (userPassword.length < 4) {
            this.showMessage('Secret password must be at least 4 characters', 'error');
            this.addErrorClass('userPassword');
            return false;
        }

        return true;
    }

    // Show diary interface
    showDiaryInterface() {
        console.log('showDiaryInterface called');
        console.log('diarySelection element:', document.getElementById('diarySelection'));
        console.log('diaryInterface element:', document.getElementById('diaryInterface'));

        const diarySelection = document.getElementById('diarySelection');
        const diaryInterface = document.getElementById('diaryInterface');

        console.log('Before transition:');
        console.log('diarySelection hidden:', diarySelection.classList.contains('hidden'));
        console.log('diaryInterface hidden:', diaryInterface.classList.contains('hidden'));

        // Hide the selection interface
        diarySelection.classList.add('hidden');
        diarySelection.style.display = 'none';

        // Show the diary interface with multiple fallbacks
        diaryInterface.classList.remove('hidden');
        diaryInterface.style.display = 'flex';
        diaryInterface.style.visibility = 'visible';
        diaryInterface.style.opacity = '1';
        diaryInterface.style.zIndex = '9999';
        diaryInterface.style.position = 'relative';
        diaryInterface.style.backgroundColor = 'rgba(255, 255, 255, 0.98)';
        diaryInterface.style.padding = '20px';
        diaryInterface.style.borderRadius = '10px';
        diaryInterface.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.15)';
        diaryInterface.style.margin = '20px auto';
        diaryInterface.style.maxWidth = '600px';
        diaryInterface.style.width = '100%';

        console.log('After transition:');
        console.log('diarySelection hidden:', diarySelection.classList.contains('hidden'));
        console.log('diaryInterface hidden:', diaryInterface.classList.contains('hidden'));

        // Check if elements are actually visible
        console.log('diarySelection display style:', window.getComputedStyle(diarySelection).display);
        console.log('diaryInterface display style:', window.getComputedStyle(diaryInterface).display);
        console.log('diaryInterface visibility:', window.getComputedStyle(diaryInterface).visibility);
        console.log('diaryInterface opacity:', window.getComputedStyle(diaryInterface).opacity);

        // Update current diary info
        document.getElementById('currentDiaryId').textContent = this.currentDiary.diary_id;
        document.getElementById('currentDiaryType').textContent = this.currentDiary.type;
        document.getElementById('currentUsers').textContent = this.currentDiary.users.join(', ');

        console.log('Diary interface should now be visible');
        console.log('Current diary info updated:', {
            id: this.currentDiary.diary_id,
            type: this.currentDiary.type,
            users: this.currentDiary.users
        });

        // Add a visual confirmation
        this.showMessage('Welcome to your diary! You can now start writing entries.', 'success');

        // Force scroll to top and focus
        window.scrollTo(0, 0);
        setTimeout(() => {
            const entryDate = document.getElementById('entryDate');
            if (entryDate) {
                entryDate.focus();
            }
        }, 500);

        // Immediate debugging - check if interface is actually in DOM
        setTimeout(() => {
            console.log('=== IMMEDIATE DEBUGGING ===');
            const interface = document.getElementById('diaryInterface');
            console.log('Interface element:', interface);
            console.log('Interface parent:', interface?.parentElement);
            console.log('Interface computed styles:', interface ? window.getComputedStyle(interface) : 'N/A');
            console.log('Interface offsetParent:', interface?.offsetParent);
            console.log('Interface getBoundingClientRect:', interface?.getBoundingClientRect());
            console.log('Body children count:', document.body.children.length);
            console.log('Main children count:', document.querySelector('main')?.children.length);

            // Check if interface is actually visible
            if (interface) {
                const rect = interface.getBoundingClientRect();
                console.log('Interface dimensions:', rect);
                console.log('Interface is visible:', rect.width > 0 && rect.height > 0);
            }
        }, 100);

        // Test: Try to manually show the interface
        setTimeout(() => {
            console.log('Testing manual interface visibility...');
            const testInterface = document.getElementById('diaryInterface');
            if (testInterface) {
                // Completely recreate the interface in a new location
                const newInterface = document.createElement('div');
                newInterface.id = 'diaryInterfaceNew';
                newInterface.innerHTML = testInterface.innerHTML;
                newInterface.style.cssText = `
                    position: fixed !important;
                    top: 50% !important;
                    left: 50% !important;
                    transform: translate(-50%, -50%) !important;
                    width: 90% !important;
                    max-width: 600px !important;
                    background: white !important;
                    padding: 20px !important;
                    border-radius: 10px !important;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3) !important;
                    z-index: 10000 !important;
                    display: flex !important;
                    flex-direction: column !important;
                    visibility: visible !important;
                    opacity: 1 !important;
                    border: 3px solid #86b049 !important;
                `;

                // Add close button
                const closeBtn = document.createElement('button');
                closeBtn.textContent = '×';
                closeBtn.style.cssText = `
                    position: absolute;
                    top: 10px;
                    right: 15px;
                    background: #ef4444;
                    color: white;
                    border: none;
                    border-radius: 50%;
                    width: 30px;
                    height: 30px;
                    font-size: 20px;
                    cursor: pointer;
                    z-index: 10001;
                `;
                closeBtn.onclick = () => document.body.removeChild(newInterface);
                newInterface.appendChild(closeBtn);

                document.body.appendChild(newInterface);
                console.log('NEW INTERFACE CREATED AND ADDED TO BODY');

                // Add a visible indicator
                const indicator = document.createElement('div');
                indicator.style.cssText = 'position: fixed; top: 10px; left: 10px; background: red; color: white; padding: 10px; z-index: 10002; border-radius: 5px; font-weight: bold;';
                indicator.textContent = 'NEW DIARY INTERFACE CREATED!';
                document.body.appendChild(indicator);

                setTimeout(() => {
                    if (document.body.contains(indicator)) {
                        document.body.removeChild(indicator);
                    }
                }, 10000);
            } else {
                console.error('diaryInterface element not found!');
            }
        }, 1000);

        // Show timeline if there are unlocked entries
        if (window.diaryManager.timelineDates.length > 0) {
            document.getElementById('timelineView').classList.remove('hidden');
        }
    }

    // Start new diary
    startNewDiary() {
        this.currentDiary = null;
        this.currentUser = null;
        window.diaryManager.reset();
        localStorage.removeItem('currentDiary');
        localStorage.removeItem('currentUser');

        document.getElementById('diaryInterface').classList.add('hidden');
        document.getElementById('diarySelection').classList.remove('hidden');
        document.getElementById('timelineView').classList.add('hidden');

        // Clear form fields
        document.getElementById('joinDiaryId').value = '';
        document.getElementById('joinUserPassword').value = '';
        document.getElementById('createDiaryId').value = '';
        document.getElementById('createUserName').value = '';
        document.getElementById('createUserPassword').value = '';
        document.getElementById('createDiaryType').value = 'couple';

        // Show join form by default
        this.showJoinForm();
    }

    // Submit a new entry
    async submitEntry() {
        const date = document.getElementById('entryDate').value;
        const content = document.getElementById('entryContent').value.trim();
        const password = document.getElementById('entryPassword').value;

        if (!this.validateEntryInputs(date, content, password)) return;

        try {
            this.showLoading('Sending message...');
            await window.diaryManager.createEntry(date, content, password);

            // Clear form
            document.getElementById('entryContent').value = '';
            document.getElementById('entryPassword').value = '';

            this.showMessage('Message sent! It will be unlocked when all users share their passwords.', 'success');
        } catch (error) {
            this.showMessage(error.message, 'error');
        } finally {
            this.hideLoading();
        }
    }

    // Validate entry inputs
    validateEntryInputs(date, content, password) {
        if (!date) {
            this.showMessage('Please select a date', 'error');
            return false;
        }
        if (!content) {
            this.showMessage('Please write your entry', 'error');
            return false;
        }
        if (!password) {
            this.showMessage('Please set a password for your entry', 'error');
            return false;
        }
        if (content.length < 10) {
            this.showMessage('Entry must be at least 10 characters', 'error');
            return false;
        }
        return true;
    }

    // Handle unlock date change
    onUnlockDateChange() {
        const date = document.getElementById('unlockDate').value;
        if (date && this.currentDiary) {
            window.diaryManager.generatePasswordInputs();
        }
    }

    // Unlock entries
    async unlockEntries() {
        const date = document.getElementById('unlockDate').value;
        if (!date) {
            this.showMessage('Please select a date to unlock', 'error');
            return;
        }

        const passwordInputs = document.querySelectorAll('#passwordInputs input[type="password"]');
        const passwords = Array.from(passwordInputs).map(input => input.value);

        if (passwords.some(pwd => !pwd)) {
            this.showMessage('Please enter all passwords', 'error');
            return;
        }

        try {
            this.showLoading('Unlocking entries...');
            await window.diaryManager.unlockEntries(date, passwords);

            // Clear password inputs
            passwordInputs.forEach(input => input.value = '');

            // Show timeline
            document.getElementById('timelineView').classList.remove('hidden');

            this.showMessage('Entries unlocked successfully!', 'success');
        } catch (error) {
            this.showMessage(error.message, 'error');
        } finally {
            this.hideLoading();
        }
    }

    // Export PDF
    async exportPDF() {
        try {
            this.showLoading('Generating PDF...');
            await window.diaryManager.exportToPDF();
            this.showMessage('PDF exported successfully!', 'success');
        } catch (error) {
            this.showMessage(error.message, 'error');
        } finally {
            this.hideLoading();
        }
    }

    // Show help modal
    showHelpModal() {
        document.getElementById('helpModal').classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    // Hide help modal
    hideHelpModal() {
        document.getElementById('helpModal').classList.add('hidden');
        document.body.style.overflow = 'auto';
    }



    // Handle keyboard shortcuts
    handleKeyboardShortcuts(event) {
        // Ctrl/Cmd + Enter to submit entry
        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
            const activeElement = document.activeElement;
            if (activeElement && activeElement.id === 'entryContent') {
                event.preventDefault();
                this.submitEntry();
            }
        }

        // Escape to close modal
        if (event.key === 'Escape') {
            this.hideHelpModal();
        }

        // Arrow keys for timeline navigation
        if (event.key === 'ArrowLeft' && !event.target.matches('input, textarea')) {
            event.preventDefault();
            window.diaryManager.previousDay();
        }
        if (event.key === 'ArrowRight' && !event.target.matches('input, textarea')) {
            event.preventDefault();
            window.diaryManager.nextDay();
        }
    }

    // Show loading state
    showLoading(message = 'Loading...') {
        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'loadingOverlay';
        loadingDiv.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        loadingDiv.innerHTML = `
            <div class="bg-white rounded-lg p-6 flex items-center space-x-3">
                <div class="loading-spinner"></div>
                <span class="text-gray-700">${message}</span>
            </div>
        `;
        document.body.appendChild(loadingDiv);
    }

    // Hide loading state
    hideLoading() {
        const loadingDiv = document.getElementById('loadingOverlay');
        if (loadingDiv) {
            loadingDiv.remove();
        }
    }

    // Show message
    showMessage(message, type = 'info') {
        const messageDiv = document.createElement('div');
        messageDiv.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 max-w-sm ${type === 'success' ? 'bg-green-500 text-white' :
            type === 'error' ? 'bg-red-500 text-white' :
                'bg-blue-500 text-white'
            }`;
        messageDiv.textContent = message;

        document.body.appendChild(messageDiv);

        // Animate tunnel bear based on message type
        if (window.tunnelBear) {
            if (type === 'success') {
                window.tunnelBear.animateSuccess();
            } else if (type === 'error') {
                window.tunnelBear.animateError();
            }
        }

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.remove();
            }
        }, 5000);

        // Click to dismiss
        messageDiv.addEventListener('click', () => messageDiv.remove());
    }

    // Add error class to input
    addErrorClass(inputId) {
        const input = document.getElementById(inputId);
        if (input) {
            input.classList.add('input-error');
        }
    }

    // Remove error class from input
    removeErrorClass(inputId) {
        const input = document.getElementById(inputId);
        if (input) {
            input.classList.remove('input-error');
        }
    }
}

// Initialize UI when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Chrome-specific nuclear cache busting
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isChrome = /Chrome/.test(navigator.userAgent) && !/Edge/.test(navigator.userAgent);
    console.log('Device type:', isMobile ? 'Mobile' : 'Desktop');
    console.log('Browser:', isChrome ? 'Chrome' : 'Other');

    // Chrome nuclear cache clearing - delete ALL caches
    if ('caches' in window) {
        caches.keys().then(cacheNames => {
            console.log('Found caches:', cacheNames);
            cacheNames.forEach(cacheName => {
                console.log('CHROME NUCLEAR: Deleting cache:', cacheName);
                caches.delete(cacheName);
            });
        });
    }

    // Clear ALL storage
    localStorage.clear();
    sessionStorage.clear();
    if ('indexedDB' in window) {
        indexedDB.databases().then(databases => {
            databases.forEach(db => {
                console.log('Deleting IndexedDB:', db.name);
                indexedDB.deleteDatabase(db.name);
            });
        });
    }

    // Set new version
    localStorage.setItem('lastVersion', '1.0.5');
    localStorage.setItem('lastLoad', Date.now().toString());
    localStorage.setItem('browser', isChrome ? 'chrome' : 'other');

    // Chrome-specific nuclear option
    if (isChrome) {
        console.log('CHROME NUCLEAR OPTION ACTIVATED');

        // Force reload with Chrome-specific cache-busting parameters
        const urlParams = new URLSearchParams(window.location.search);
        const hasFresh = urlParams.has('fresh');
        const hasChrome = urlParams.has('chrome');
        const hasNuclear = urlParams.has('nuclear');
        const hasMobile = urlParams.has('mobile');

        if (!hasFresh || !hasChrome || !hasNuclear || (isMobile && !hasMobile)) {
            const timestamp = Date.now();
            const random = Math.random().toString(36).substring(7);
            const chromeParam = isChrome ? '&chrome=1' : '';
            const mobileParam = isMobile ? '&mobile=1' : '';
            const freshUrl = `${window.location.origin}${window.location.pathname}?fresh=${timestamp}&nuclear=1&r=${random}${chromeParam}${mobileParam}`;
            console.log('CHROME NUCLEAR: forcing fresh load to:', freshUrl);
            window.location.replace(freshUrl);
            return;
        }

        // Chrome-specific cache clearing
        if ('caches' in window) {
            caches.keys().then(cacheNames => {
                cacheNames.forEach(cacheName => {
                    console.log('CHROME NUCLEAR: Deleting cache:', cacheName);
                    caches.delete(cacheName);
                });
            });
        }

        // Force reload all scripts with Chrome-specific parameters
        const scripts = document.querySelectorAll('script[src]');
        scripts.forEach(script => {
            const originalSrc = script.src;
            const newSrc = originalSrc + (originalSrc.includes('?') ? '&' : '?') + 'chrome=' + Date.now() + '&nuclear=1';
            script.src = newSrc;
            console.log('CHROME NUCLEAR: Updated script src:', newSrc);
        });

        // Chrome-specific service worker unregister
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(registrations => {
                registrations.forEach(registration => {
                    console.log('CHROME NUCLEAR: Unregistering service worker');
                    registration.unregister();
                });
            });
        }

    } else if (isMobile) {
        // Mobile nuclear option (non-Chrome)
        console.log('MOBILE NUCLEAR OPTION ACTIVATED');

        // Force reload with multiple cache-busting parameters
        const urlParams = new URLSearchParams(window.location.search);
        const hasFresh = urlParams.has('fresh');
        const hasMobile = urlParams.has('mobile');
        const hasNuclear = urlParams.has('nuclear');

        if (!hasFresh || !hasMobile || !hasNuclear) {
            const timestamp = Date.now();
            const random = Math.random().toString(36).substring(7);
            const freshUrl = `${window.location.origin}${window.location.pathname}?fresh=${timestamp}&mobile=1&nuclear=1&r=${random}`;
            console.log('MOBILE NUCLEAR: forcing fresh load to:', freshUrl);
            window.location.replace(freshUrl);
            return;
        }

        // Additional mobile cache clearing
        if ('caches' in window) {
            caches.keys().then(cacheNames => {
                cacheNames.forEach(cacheName => {
                    console.log('MOBILE NUCLEAR: Deleting cache:', cacheName);
                    caches.delete(cacheName);
                });
            });
        }

        // Force reload all scripts
        const scripts = document.querySelectorAll('script[src]');
        scripts.forEach(script => {
            const originalSrc = script.src;
            const newSrc = originalSrc + (originalSrc.includes('?') ? '&' : '?') + 'mobile=' + Date.now();
            script.src = newSrc;
            console.log('MOBILE NUCLEAR: Updated script src:', newSrc);
        });

    } else {
        // Desktop cache busting
        if (performance.navigation.type === 1) {
            const urlParams = new URLSearchParams(window.location.search);
            if (!urlParams.has('fresh')) {
                window.location.href = window.location.href + (window.location.href.includes('?') ? '&' : '?') + 'fresh=' + Date.now();
                return;
            }
        }
    }

    window.diaryUI = new DiaryUI();
});

// Handle service worker for PWA functionality
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js?v=1.1.4')
            .then(registration => {
                console.log('SW registered: ', registration);

                // Check for updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // New content is available, show update notification
                            if (confirm('A new version is available! Click OK to reload and get the latest features.')) {
                                window.location.reload();
                            }
                        }
                    });
                });

                // Handle service worker updates
                let refreshing = false;
                navigator.serviceWorker.addEventListener('controllerchange', () => {
                    if (!refreshing) {
                        refreshing = true;
                        window.location.reload();
                    }
                });
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
} 
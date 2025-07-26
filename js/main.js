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
    }

    // Setup all event listeners
    setupEventListeners() {
        // Diary selection
        document.getElementById('joinDiaryBtn')?.addEventListener('click', () => this.joinDiary());
        document.getElementById('createDiaryBtn')?.addEventListener('click', () => this.createDiary());
        document.getElementById('newDiaryBtn')?.addEventListener('click', () => this.startNewDiary());

        // User password toggle
        document.getElementById('toggleUserPassword')?.addEventListener('click', () => this.toggleUserPasswordVisibility());

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

        // Form submissions
        document.querySelector('form[name="feedback"]')?.addEventListener('submit', (e) => this.handleFeedbackSubmit(e));

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));

        // Feedback modal
        document.getElementById('openFeedbackBtn')?.addEventListener('click', () => this.showFeedbackModal());
        document.getElementById('closeFeedbackBtn')?.addEventListener('click', () => this.hideFeedbackModal());
        document.getElementById('feedbackModal')?.addEventListener('click', (e) => {
            if (e.target === document.getElementById('feedbackModal')) {
                this.hideFeedbackModal();
            }
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
        const diaryId = document.getElementById('diaryId').value.trim();
        const userName = document.getElementById('userName').value.trim();
        const userPassword = document.getElementById('userPassword').value;
        const diaryType = document.getElementById('diaryType').value;

        if (!this.validateInputs(diaryId, userName, userPassword)) return;

        try {
            this.showLoading('Creating diary...');
            const result = await window.diaryDB.createDiary(diaryId, userName, diaryType, userPassword);

            if (result.success) {
                this.currentDiary = result.data;
                this.currentUser = userName;
                this.saveToLocalStorage();
                this.showDiaryInterface();
                window.diaryManager.init(this.currentDiary, this.currentUser);
                this.showMessage('Diary created successfully!', 'success');
            } else {
                this.showMessage(result.error, 'error');
            }
        } catch (error) {
            this.showMessage(error.message, 'error');
        } finally {
            this.hideLoading();
        }
    }

    // Join an existing diary
    async joinDiary() {
        const diaryId = document.getElementById('diaryId').value.trim();
        const userName = document.getElementById('userName').value.trim();
        const userPassword = document.getElementById('userPassword').value;

        if (!this.validateInputs(diaryId, userName, userPassword)) return;

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

    // Toggle user password visibility
    toggleUserPasswordVisibility() {
        const passwordInput = document.getElementById('userPassword');
        const toggleButton = document.getElementById('toggleUserPassword');

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
        if (!userName) {
            this.showMessage('Please enter your name', 'error');
            this.addErrorClass('userName');
            return false;
        }
        this.removeErrorClass('userName');

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

        if (userName.length < 2) {
            this.showMessage('Name must be at least 2 characters', 'error');
            this.addErrorClass('userName');
            return false;
        }

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
        document.getElementById('diarySelection').classList.add('hidden');
        document.getElementById('diaryInterface').classList.remove('hidden');

        // Update current diary info
        document.getElementById('currentDiaryId').textContent = this.currentDiary.diary_id;
        document.getElementById('currentDiaryType').textContent = this.currentDiary.type;
        document.getElementById('currentUsers').textContent = this.currentDiary.users.join(', ');

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
        document.getElementById('diaryId').value = '';
        document.getElementById('userName').value = '';
        document.getElementById('userPassword').value = '';
        document.getElementById('diaryType').value = 'couple';
    }

    // Submit a new entry
    async submitEntry() {
        const date = document.getElementById('entryDate').value;
        const content = document.getElementById('entryContent').value.trim();
        const password = document.getElementById('entryPassword').value;

        if (!this.validateEntryInputs(date, content, password)) return;

        try {
            this.showLoading('Submitting entry...');
            await window.diaryManager.createEntry(date, content, password);

            // Clear form
            document.getElementById('entryContent').value = '';
            document.getElementById('entryPassword').value = '';

            this.showMessage('Entry submitted successfully! It will be unlocked when all users share their passwords.', 'success');
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

    // Show feedback modal
    showFeedbackModal() {
        document.getElementById('feedbackModal').classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    // Hide feedback modal
    hideFeedbackModal() {
        document.getElementById('feedbackModal').classList.add('hidden');
        document.body.style.overflow = 'auto';
    }

    // Handle feedback form submission
    handleFeedbackSubmit(event) {
        // Netlify Forms will handle the submission automatically
        this.showMessage('Thank you for your feedback!', 'success');

        // Animate tunnel bear success
        if (window.tunnelBear) {
            window.tunnelBear.animateSuccess();
        }

        // Clear form
        event.target.reset();
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
            this.hideFeedbackModal();
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
    // Mobile-specific cache clearing
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    console.log('Device type:', isMobile ? 'Mobile' : 'Desktop');

    // Aggressive cache clearing
    if ('caches' in window) {
        caches.keys().then(cacheNames => {
            cacheNames.forEach(cacheName => {
                console.log('Deleting cache:', cacheName);
                caches.delete(cacheName);
            });
        });
    }

    // Clear localStorage if needed
    if (localStorage.getItem('lastVersion') !== '1.0.3') {
        localStorage.clear();
        localStorage.setItem('lastVersion', '1.0.3');
        console.log('Cleared localStorage for new version');
    }

    // Mobile-specific cache busting
    if (isMobile) {
        // Force reload on mobile if no fresh parameter
        const urlParams = new URLSearchParams(window.location.search);
        if (!urlParams.has('fresh')) {
            const freshUrl = window.location.href + (window.location.href.includes('?') ? '&' : '?') + 'fresh=' + Date.now();
            console.log('Mobile: forcing fresh load to:', freshUrl);
            window.location.href = freshUrl;
            return;
        }

        // Clear mobile-specific caches
        if ('caches' in window) {
            caches.keys().then(cacheNames => {
                cacheNames.forEach(cacheName => {
                    if (cacheName.includes('mobile') || cacheName.includes('app')) {
                        console.log('Deleting mobile cache:', cacheName);
                        caches.delete(cacheName);
                    }
                });
            });
        }
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
        navigator.serviceWorker.register('/sw.js?v=1.0.3')
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
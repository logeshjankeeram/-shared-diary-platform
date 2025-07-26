// Core diary functionality: password handling, timeline rendering, theme highlighting, and PDF export

class DiaryManager {
    constructor() {
        this.currentDiary = null;
        this.currentUser = null;
        this.unlockedEntries = new Map(); // date -> entries
        this.timelineDates = [];
        this.currentTimelineIndex = 0;
    }

    // Initialize diary manager
    init(diary, user) {
        this.currentDiary = diary;
        this.currentUser = user;
        this.loadUnlockedEntries();
        this.setupTimeline();
    }

    // Hash password using SHA-256
    async hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
    }

    // Verify password against hash
    async verifyPassword(password, hash) {
        const hashedPassword = await this.hashPassword(password);
        return hashedPassword === hash;
    }

    // Create a new entry
    async createEntry(date, content, password) {
        if (!this.currentDiary || !this.currentUser) {
            throw new Error('No active diary or user');
        }

        // Check if user already has an entry for this date
        const existingEntry = await window.diaryDB.getUserEntry(
            this.currentDiary.diary_id,
            this.currentUser,
            date
        );

        if (existingEntry.success && existingEntry.data) {
            throw new Error('You already have an entry for this date');
        }

        // Hash the password
        const passwordHash = await this.hashPassword(password);

        // Create the entry
        const result = await window.diaryDB.createEntry(
            this.currentDiary.diary_id,
            this.currentUser,
            date,
            content,
            passwordHash
        );

        if (!result.success) {
            throw new Error(result.error);
        }

        return result.data;
    }

    // Unlock entries for a specific date
    async unlockEntries(date, passwords) {
        if (!this.currentDiary) {
            throw new Error('No active diary');
        }

        // Get all entries for the date
        const entriesResult = await window.diaryDB.getEntriesByDate(
            this.currentDiary.diary_id,
            date
        );

        if (!entriesResult.success) {
            throw new Error(entriesResult.error);
        }

        const entries = entriesResult.data;
        const diaryUsers = this.currentDiary.users;

        // Verify we have passwords for all users
        if (passwords.length !== diaryUsers.length) {
            throw new Error(`Need passwords for all ${diaryUsers.length} users`);
        }

        // Verify each password
        for (let i = 0; i < entries.length; i++) {
            const entry = entries[i];
            const userIndex = diaryUsers.indexOf(entry.user_name);

            if (userIndex === -1) {
                throw new Error(`Unknown user: ${entry.user_name}`);
            }

            const password = passwords[userIndex];
            const isValid = await this.verifyPassword(password, entry.password_hash);

            if (!isValid) {
                throw new Error(`Invalid password for ${entry.user_name}`);
            }
        }

        // Unlock all entries
        const unlockPromises = entries.map(entry =>
            window.diaryDB.unlockEntry(entry.id)
        );

        await Promise.all(unlockPromises);

        // Reload unlocked entries
        await this.loadUnlockedEntries();

        return entries;
    }

    // Load all unlocked entries
    async loadUnlockedEntries() {
        if (!this.currentDiary) return;

        const result = await window.diaryDB.getUnlockedEntries(this.currentDiary.diary_id);

        if (result.success) {
            this.unlockedEntries.clear();

            // Group entries by date
            result.data.forEach(entry => {
                if (!this.unlockedEntries.has(entry.date)) {
                    this.unlockedEntries.set(entry.date, []);
                }
                this.unlockedEntries.get(entry.date).push(entry);
            });

            // Update timeline dates
            this.timelineDates = Array.from(this.unlockedEntries.keys()).sort().reverse();
        }
    }

    // Setup timeline navigation
    setupTimeline() {
        if (this.timelineDates.length > 0) {
            this.currentTimelineIndex = 0;
            this.renderTimeline();
        }
    }

    // Render timeline for current date
    renderTimeline() {
        if (this.timelineDates.length === 0) return;

        const currentDate = this.timelineDates[this.currentTimelineIndex];
        const entries = this.unlockedEntries.get(currentDate) || [];

        const container = document.getElementById('timelineContainer');
        const dateDisplay = document.getElementById('currentTimelineDate');

        if (dateDisplay) {
            dateDisplay.textContent = new Date(currentDate).toLocaleDateString();
        }

        if (container) {
            container.innerHTML = '';

            if (this.currentDiary.type === 'couple') {
                this.renderCoupleTimeline(container, entries, currentDate);
            } else {
                this.renderGroupTimeline(container, entries, currentDate);
            }
        }

        // Update navigation buttons
        this.updateTimelineNavigation();
    }

    // Render couple timeline (side-by-side)
    renderCoupleTimeline(container, entries, date) {
        const users = this.currentDiary.users;
        const user1 = users[0];
        const user2 = users[1];

        const entry1 = entries.find(e => e.user_name === user1);
        const entry2 = entries.find(e => e.user_name === user2);

        container.className = 'grid grid-cols-1 lg:grid-cols-2 gap-6 timeline-couple couple-theme';
        container.innerHTML = `
            <div class="timeline-entry entry-fade-in bg-white rounded-lg shadow-sm border p-6">
                <div class="entry-header rounded-t-lg -mt-6 -mx-6 p-4 mb-4">
                    <h4 class="font-lora font-semibold">${user1}</h4>
                    <p class="text-sm opacity-90">${new Date(date).toLocaleDateString()}</p>
                </div>
                <div class="entry-content">
                    ${entry1 ? this.highlightThemes(entry1.content) : '<p class="text-gray-500 italic">No entry yet</p>'}
                </div>
            </div>
            <div class="timeline-entry entry-fade-in bg-white rounded-lg shadow-sm border p-6">
                <div class="entry-header rounded-t-lg -mt-6 -mx-6 p-4 mb-4">
                    <h4 class="font-lora font-semibold">${user2}</h4>
                    <p class="text-sm opacity-90">${new Date(date).toLocaleDateString()}</p>
                </div>
                <div class="entry-content">
                    ${entry2 ? this.highlightThemes(entry2.content) : '<p class="text-gray-500 italic">No entry yet</p>'}
                </div>
            </div>
        `;

        // Setup synchronized scrolling
        this.setupSyncScrolling(container);
    }

    // Render group timeline (stacked)
    renderGroupTimeline(container, entries, date) {
        container.className = 'space-y-6 timeline-group group-theme';

        const users = this.currentDiary.users;
        let html = '';

        users.forEach(user => {
            const entry = entries.find(e => e.user_name === user);

            html += `
                <div class="timeline-entry entry-fade-in bg-white rounded-lg shadow-sm border p-6">
                    <div class="entry-header rounded-t-lg -mt-6 -mx-6 p-4 mb-4">
                        <h4 class="font-lora font-semibold">${user}</h4>
                        <p class="text-sm opacity-90">${new Date(date).toLocaleDateString()}</p>
                    </div>
                    <div class="entry-content">
                        ${entry ? this.highlightThemes(entry.content) : '<p class="text-gray-500 italic">No entry yet</p>'}
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    // Setup synchronized scrolling for couple timeline
    setupSyncScrolling(container) {
        const entries = container.querySelectorAll('.timeline-entry');
        if (entries.length !== 2) return;

        const [entry1, entry2] = entries;
        const content1 = entry1.querySelector('.entry-content');
        const content2 = entry2.querySelector('.entry-content');

        if (!content1 || !content2) return;

        let isScrolling = false;

        content1.addEventListener('scroll', () => {
            if (!isScrolling) {
                isScrolling = true;
                content2.scrollTop = content1.scrollTop;
                content2.scrollLeft = content1.scrollLeft;
                setTimeout(() => { isScrolling = false; }, 50);
            }
        });

        content2.addEventListener('scroll', () => {
            if (!isScrolling) {
                isScrolling = true;
                content1.scrollTop = content2.scrollTop;
                content1.scrollLeft = content2.scrollLeft;
                setTimeout(() => { isScrolling = false; }, 50);
            }
        });
    }

    // Highlight themes in text
    highlightThemes(text) {
        if (!text) return '';

        // Define theme keywords
        const positiveThemes = [
            'happy', 'joy', 'excited', 'wonderful', 'amazing', 'great', 'love', 'beautiful',
            'fantastic', 'perfect', 'blessed', 'grateful', 'thankful', 'peaceful', 'calm'
        ];

        const negativeThemes = [
            'sad', 'angry', 'frustrated', 'worried', 'anxious', 'stress', 'tired', 'exhausted',
            'disappointed', 'hurt', 'pain', 'difficult', 'hard', 'challenging', 'upset'
        ];

        let highlightedText = text;

        // Highlight positive themes
        positiveThemes.forEach(theme => {
            const regex = new RegExp(`\\b${theme}\\b`, 'gi');
            highlightedText = highlightedText.replace(regex, `<span class="theme-highlight">$&</span>`);
        });

        // Highlight negative themes
        negativeThemes.forEach(theme => {
            const regex = new RegExp(`\\b${theme}\\b`, 'gi');
            highlightedText = highlightedText.replace(regex, `<span class="theme-contrast">$&</span>`);
        });

        // Convert line breaks to paragraphs
        return highlightedText.split('\n\n').map(paragraph =>
            `<p>${paragraph.replace(/\n/g, '<br>')}</p>`
        ).join('');
    }

    // Update timeline navigation
    updateTimelineNavigation() {
        const prevBtn = document.getElementById('prevDayBtn');
        const nextBtn = document.getElementById('nextDayBtn');

        if (prevBtn) {
            prevBtn.disabled = this.currentTimelineIndex === 0;
            prevBtn.classList.toggle('opacity-50', this.currentTimelineIndex === 0);
        }

        if (nextBtn) {
            nextBtn.disabled = this.currentTimelineIndex === this.timelineDates.length - 1;
            nextBtn.classList.toggle('opacity-50', this.currentTimelineIndex === this.timelineDates.length - 1);
        }
    }

    // Navigate to previous day
    previousDay() {
        if (this.currentTimelineIndex > 0) {
            this.currentTimelineIndex--;
            this.renderTimeline();
        }
    }

    // Navigate to next day
    nextDay() {
        if (this.currentTimelineIndex < this.timelineDates.length - 1) {
            this.currentTimelineIndex++;
            this.renderTimeline();
        }
    }

    // Export timeline as PDF
    async exportToPDF() {
        if (this.timelineDates.length === 0) {
            throw new Error('No entries to export');
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Set up document
        doc.setFont('helvetica');
        doc.setFontSize(16);
        doc.text(`Shared Diary: ${this.currentDiary.diary_id}`, 20, 20);

        let yPosition = 40;
        const pageHeight = doc.internal.pageSize.height;
        const margin = 20;

        // Export each date
        for (const date of this.timelineDates) {
            const entries = this.unlockedEntries.get(date) || [];

            // Add date header
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text(new Date(date).toLocaleDateString(), margin, yPosition);
            yPosition += 10;

            // Add entries
            doc.setFontSize(12);
            doc.setFont('helvetica', 'normal');

            entries.forEach(entry => {
                // Check if we need a new page
                if (yPosition > pageHeight - 60) {
                    doc.addPage();
                    yPosition = 20;
                }

                // Add user name
                doc.setFont('helvetica', 'bold');
                doc.text(entry.user_name, margin, yPosition);
                yPosition += 8;

                // Add entry content
                doc.setFont('helvetica', 'normal');
                const lines = doc.splitTextToSize(
                    entry.content.replace(/\n/g, ' '),
                    doc.internal.pageSize.width - 2 * margin
                );

                lines.forEach(line => {
                    if (yPosition > pageHeight - 20) {
                        doc.addPage();
                        yPosition = 20;
                    }
                    doc.text(line, margin, yPosition);
                    yPosition += 6;
                });

                yPosition += 10;
            });

            yPosition += 10;
        }

        // Save the PDF
        const filename = `shared-diary-${this.currentDiary.diary_id}-${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(filename);
    }

    // Generate password inputs for unlocking
    generatePasswordInputs() {
        const container = document.getElementById('passwordInputs');
        if (!container || !this.currentDiary) return;

        container.innerHTML = '';

        this.currentDiary.users.forEach((user, index) => {
            const div = document.createElement('div');
            div.className = 'mb-3';
            div.innerHTML = `
                <label for="password-${index}" class="block text-sm font-medium text-gray-700 mb-1">
                    Password for ${user}
                </label>
                <div class="password-input">
                    <input type="password" 
                           id="password-${index}" 
                           class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                           placeholder="Enter password for ${user}">
                    <button type="button" 
                            class="password-toggle" 
                            onclick="togglePasswordVisibility('password-${index}')">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                        </svg>
                    </button>
                </div>
            `;
            container.appendChild(div);
        });
    }

    // Reset diary manager
    reset() {
        this.currentDiary = null;
        this.currentUser = null;
        this.unlockedEntries.clear();
        this.timelineDates = [];
        this.currentTimelineIndex = 0;
    }
}

// Global diary manager instance
window.diaryManager = new DiaryManager();

// Utility function for password visibility toggle
window.togglePasswordVisibility = function (inputId) {
    const input = document.getElementById(inputId);
    const button = input.nextElementSibling;
    const svg = button.querySelector('svg');

    if (input.type === 'password') {
        input.type = 'text';
        svg.innerHTML = `
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"></path>
        `;
    } else {
        input.type = 'password';
        svg.innerHTML = `
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
        `;
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DiaryManager;
} 
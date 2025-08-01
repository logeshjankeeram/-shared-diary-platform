// Tunnel Bear Animation - Adapted from React to Vanilla JavaScript
// Based on the Tunnel Bear login animation by Kadri Jibraan

class TunnelBear {
    constructor() {
        console.log('TunnelBear constructor called');
        this.currentFocus = 'NONE'; // Start with no focus
        this.currentBearImage = null;
        this.isAnimating = false;
        this.prevFocus = 'NONE';
        this.prevShowPassword = false;
        this.timeouts = [];
        this.emailLength = 0;
        this.showPassword = false;
        this.isVisible = false; // Track if bear is visible

        // Bear image sequences
        this.watchBearImages = [];
        this.hideBearImages = [];
        this.peakBearImages = [];

        console.log('Calling init()...');
        this.init();
    }

    init() {
        console.log('TunnelBear init() called');
        this.loadBearImages();
        console.log('Bear images loaded');
        this.createBearContainer();
        console.log('Bear container created');
        this.setupEventListeners();
        console.log('Event listeners set up');

        // Start with watch_bear_0 visible
        console.log('Starting with watch_bear_0 visible');
        this.showBear();
        this.setCurrentBearImage(this.watchBearImages[0]);
        console.log('Initial state set');
    }

    loadBearImages() {
        console.log('Loading bear images...');

        // Load watch bear images (21 images: 0-20)
        for (let i = 0; i <= 20; i++) {
            this.watchBearImages.push(`assets/watch_bear_${i}.png`);
        }

        // Load hide bear images (6 images: 0-5)
        for (let i = 0; i <= 5; i++) {
            this.hideBearImages.push(`assets/hide_bear_${i}.png`);
        }

        // Load peak bear images (4 images: 0-3)
        for (let i = 0; i <= 3; i++) {
            this.peakBearImages.push(`assets/peak_bear_${i}.png`);
        }

        console.log('Loaded images:', {
            watch: this.watchBearImages.length,
            hide: this.hideBearImages.length,
            peak: this.peakBearImages.length
        });
        console.log('First watch bear image:', this.watchBearImages[0]);
        console.log('First hide bear image:', this.hideBearImages[0]);

        // Test if first image loads
        const testImg = new Image();
        testImg.onload = () => console.log('✅ First watch bear image loads successfully');
        testImg.onerror = () => console.error('❌ First watch bear image failed to load');
        testImg.src = this.watchBearImages[0];
    }

    createBearContainer() {
        console.log('Creating bear container...');

        // Create bear for join form
        const joinBearContainer = document.querySelector('#joinDiaryForm .w-\\[130px\\] .absolute');
        if (joinBearContainer) {
            const joinBearImg = document.createElement('img');
            joinBearImg.src = this.watchBearImages[0];
            joinBearImg.className = 'tunnel-bear-avatar';
            joinBearImg.alt = 'Animated bear avatar';
            joinBearImg.width = 130;
            joinBearImg.height = 130;
            joinBearImg.style.opacity = '1'; // Start visible

            joinBearContainer.appendChild(joinBearImg);
            this.bearElement = joinBearImg; // Set as primary bear element
            console.log('Join form bear element created and added:', this.bearElement);
        }

        // Create bear for create form
        const createBearContainer = document.querySelector('#createDiaryForm .w-\\[130px\\] .absolute');
        if (createBearContainer) {
            const createBearImg = document.createElement('img');
            createBearImg.src = this.watchBearImages[0];
            createBearImg.className = 'tunnel-bear-avatar';
            createBearImg.alt = 'Animated bear avatar';
            createBearImg.width = 130;
            createBearImg.height = 130;
            createBearImg.style.opacity = '0'; // Start hidden

            createBearContainer.appendChild(createBearImg);
            this.createBearElement = createBearImg; // Store reference to create form bear
            console.log('Create form bear element created and added:', this.createBearElement);
        }

        if (!this.bearElement) {
            console.error('Bear containers not found');
        }
    }

    setupEventListeners() {
        // Handle field focus events
        document.addEventListener('focusin', (e) => {
            if (e.target.matches('input, textarea')) {
                const fieldType = this.getFieldType(e.target);
                console.log('Field focused:', e.target.id, fieldType);
                this.handleFieldFocus(e.target);
            }
        });

        document.addEventListener('focusout', (e) => {
            if (e.target.matches('input, textarea')) {
                this.handleFieldBlur(e.target);
            }
        });

        document.addEventListener('input', (e) => {
            if (e.target.matches('input, textarea')) {
                this.handleFieldInput(e.target);
            }
        });

        // Listen for password visibility toggle
        document.addEventListener('click', (e) => {
            if (e.target.matches('#toggleUserPassword')) {
                this.handlePasswordToggle(e.target);
            }
        });

        // Background tap to reset
        document.addEventListener('click', (e) => {
            if (e.target === document.body || e.target.matches('main')) {
                this.handleBackgroundClick();
            }
        });

        // Listen for New Diary and Register button clicks
        document.addEventListener('click', (e) => {
            if (e.target.matches('#newDiaryBtn, #showCreateFormBtn')) {
                this.handleNewDiaryClick();
            }
        });
    }

    handleFieldFocus(field) {
        const fieldType = this.getFieldType(field);
        console.log('Field focus:', field.id, fieldType);

        if (fieldType === 'userName') {
            // Click on name field: automatically animate through frames 1-2
            this.showBear();
            this.clearTimeouts();
            this.animateInitialWatchSequence();
        } else if (fieldType === 'diaryId' || fieldType === 'userPassword') {
            // Click on diary or password field: start hide bear from hide_bear_1 to hide_bear_5
            this.startHidingSequence();
        }
    }

    handleFieldBlur(field) {
        const fieldType = this.getFieldType(field);
        console.log('Field blur:', field.id, fieldType);

        // When leaving sensitive fields, keep bear hidden
        if (fieldType === 'diaryId' || fieldType === 'userPassword') {
            console.log('Leaving sensitive field, keeping bear hidden');
            this.stayOnHideBear5();
        }
        // When leaving name field, bear can change state based on next focus
    }

    handleFieldInput(field) {
        const fieldType = this.getFieldType(field);
        console.log('Field input:', field.id, fieldType, field.value);

        if (fieldType === 'userName') {
            this.emailLength = field.value.length;
            // Update bear image based on input length
            this.updateWatchingBearImage();
        } else if (fieldType === 'diaryId' || fieldType === 'userPassword') {
            // Keep bear hidden while typing in sensitive fields
            console.log('Keeping bear hidden while typing in sensitive field');
            this.stayOnHideBear5();
        }
    }

    // Show bear with fade in
    showBear() {
        if (this.bearElement) {
            this.bearElement.style.opacity = '1';
            this.bearElement.style.transition = 'opacity 0.3s ease-in-out';
            this.isVisible = true;
        }
        // Also show create form bear if it exists
        if (this.createBearElement) {
            this.createBearElement.style.opacity = '1';
            this.createBearElement.style.transition = 'opacity 0.3s ease-in-out';
        }
    }

    // Hide bear with fade out
    hideBear() {
        if (this.bearElement) {
            this.bearElement.style.opacity = '0';
            this.bearElement.style.transition = 'opacity 0.3s ease-in-out';
            this.isVisible = false;
        }
        // Also hide create form bear if it exists
        if (this.createBearElement) {
            this.createBearElement.style.opacity = '0';
            this.createBearElement.style.transition = 'opacity 0.3s ease-in-out';
        }
    }

    // Animate initial watch sequence (frames 1-2) when name field is focused
    animateInitialWatchSequence() {
        console.log('Starting initial watch sequence (frames 1-2)...');

        // Animate from frame 1 to frame 2
        this.setCurrentBearImage(this.watchBearImages[1]);

        setTimeout(() => {
            this.setCurrentBearImage(this.watchBearImages[2]);
            console.log('Initial watch sequence complete, now at frame 2');
        }, 300); // 300ms delay between frames 1 and 2
    }

    // Start watching from watch_bear_1 (no animation, just for compatibility)
    startWatchingFromBeginning() {
        this.showBear();
        this.clearTimeouts();
        this.setCurrentBearImage(this.watchBearImages[1]);
    }

    // Start hiding sequence from hide_bear_1 to hide_bear_5
    startHidingSequence() {
        console.log('Starting hide sequence...');
        this.showBear();
        this.clearTimeouts();

        // Start from hide_bear_1 (index 1) to hide_bear_5 (index 5)
        this.animateImages(this.hideBearImages.slice(1, 6), 150, false, () => {
            console.log('Hide sequence complete, staying on hide_bear_5');
            this.setCurrentBearImage(this.hideBearImages[5]); // Stay on hide_bear_5
        });
    }

    // Stay on hide_bear_5
    stayOnHideBear5() {
        console.log('Staying on hide_bear_5...');
        this.showBear();
        this.setCurrentBearImage(this.hideBearImages[5]);
    }

    // Handle background click: start peak then go to watch
    handleBackgroundClick() {
        console.log('Background clicked, starting peak then watch...');
        this.showBear();
        this.clearTimeouts();

        this.animateImages(this.peakBearImages, 200, false, () => {
            console.log('Peak sequence complete, going to watch...');
            setTimeout(() => {
                this.startWatchingFromBeginning();
            }, 300);
        });
    }

    handlePasswordToggle(button) {
        this.showPassword = !this.showPassword;
        this.updateBearAnimation();
    }

    // Handle New Diary and Register button clicks
    handleNewDiaryClick() {
        console.log('New Diary/Register button clicked, showing bear animation');
        this.showBear();
        this.clearTimeouts();

        // Start with watch_bear_0, then animate through watch sequence
        this.setCurrentBearImage(this.watchBearImages[0]);

        // Animate through initial watch sequence (frames 1-2)
        setTimeout(() => {
            this.animateInitialWatchSequence();
        }, 100);
    }

    // Switch bear to create form
    switchToCreateForm() {
        if (this.bearElement && this.createBearElement) {
            // Hide join form bear
            this.bearElement.style.opacity = '0';
            // Show create form bear
            this.createBearElement.style.opacity = '1';
            // Update current bear element reference
            this.bearElement = this.createBearElement;
            console.log('Switched bear to create form');
        }
    }

    // Switch bear to join form
    switchToJoinForm() {
        if (this.createBearElement && this.bearElement) {
            // Hide create form bear
            this.createBearElement.style.opacity = '0';
            // Show join form bear
            this.bearElement.style.opacity = '1';
            // Update current bear element reference back to join form
            this.bearElement = document.querySelector('#joinDiaryForm .tunnel-bear-avatar');
            console.log('Switched bear to join form');
        }
    }

    getFieldType(field) {
        const id = field.id || '';
        if (id === 'joinDiaryId' || id === 'createDiaryId') return 'userName'; // Changed from 'diaryId' to 'userName' to trigger watch animation
        if (id === 'createUserName') return 'userName';
        if (id === 'joinUserPassword' || id === 'createUserPassword') return 'userPassword';
        if (id === 'entryPassword') return 'password';
        if (id === 'entryContent') return 'content';
        return 'text';
    }

    setCurrentFocus(focus) {
        this.prevFocus = this.currentFocus;
        this.currentFocus = focus;
        this.updateBearAnimation();
    }

    updateBearAnimation() {
        // Clear existing timeouts
        this.clearTimeouts();

        if (this.currentFocus === 'EMAIL') {
            if (this.prevFocus === 'PASSWORD') {
                // Reverse hideBearImages when moving from PASSWORD to EMAIL
                this.animateImages(this.hideBearImages, 60, true, () => {
                    this.animateWatchingBearImages();
                });
            } else {
                this.animateWatchingBearImages();
            }
        } else if (this.currentFocus === 'PASSWORD') {
            if (this.prevFocus !== 'PASSWORD') {
                // First time entering password field
                this.animateImages(this.hideBearImages, 40, false, () => {
                    if (this.showPassword) {
                        this.animateImages(this.peakBearImages, 50);
                    }
                });
            } else if (this.showPassword && this.prevShowPassword === false) {
                // Show password selected
                this.animateImages(this.peakBearImages, 50);
            } else if (!this.showPassword && this.prevShowPassword === true) {
                // Hide password selected
                this.animateImages(this.peakBearImages, 50, true);
            }
        }

        this.prevShowPassword = this.showPassword;
    }

    updateWatchingBearImage() {
        console.log('Updating watching bear image, emailLength:', this.emailLength);

        // After initial animation (frames 1-2), each character advances one frame starting from frame 3
        const frameIndex = Math.min(this.emailLength + 2, this.watchBearImages.length - 1); // +2 because we start from frame 3 after initial animation

        console.log('Setting bear to frame:', frameIndex, 'for', this.emailLength, 'characters');
        this.setCurrentBearImage(this.watchBearImages[frameIndex]);
    }

    animateToFrame(startIndex, targetIndex) {
        if (startIndex === targetIndex) {
            // No animation needed
            return;
        }

        const frames = [];
        const step = startIndex < targetIndex ? 1 : -1;

        // Create array of frames to animate through
        for (let i = startIndex; step > 0 ? i <= targetIndex : i >= targetIndex; i += step) {
            frames.push(i);
        }

        console.log('Animating through frames:', frames);

        // Animate through frames with smooth timing
        frames.forEach((frameIndex, index) => {
            const timeoutId = setTimeout(() => {
                if (frameIndex >= 0 && frameIndex < this.watchBearImages.length) {
                    console.log('Setting frame:', frameIndex, this.watchBearImages[frameIndex]);
                    this.setCurrentBearImage(this.watchBearImages[frameIndex]);
                }
            }, index * 50); // 50ms between frames for smooth animation

            this.timeouts.push(timeoutId);
        });
    }

    animateWatchingBearImages() {
        const progress = Math.min(this.emailLength / 30, 1);
        const index = Math.min(
            Math.floor(progress * (this.watchBearImages.length - 1)),
            this.watchBearImages.length - 1,
        );
        this.setCurrentBearImage(this.watchBearImages[Math.max(0, index)]);
        this.isAnimating = false;
    }

    animateImages(images, interval, reverse = false, onComplete) {
        console.log('animateImages called with:', images.length, 'images, interval:', interval);
        if (images.length === 0) {
            console.log('No images to animate, calling onComplete');
            onComplete?.();
            return;
        }

        this.isAnimating = true;
        const imageSequence = reverse ? [...images].reverse() : images;
        console.log('Image sequence:', imageSequence);

        imageSequence.forEach((img, index) => {
            const timeoutId = setTimeout(() => {
                console.log('Setting bear image to:', img);
                this.setCurrentBearImage(img);
                if (index === imageSequence.length - 1) {
                    console.log('Animation sequence complete');
                    this.isAnimating = false;
                    onComplete?.();
                }
            }, index * interval);
            this.timeouts.push(timeoutId);
        });
    }

    setCurrentBearImage(src) {
        if (this.bearElement && src) {
            this.bearElement.src = src;
            this.currentBearImage = src;
        }
        // Also update the create form bear if it exists
        if (this.createBearElement && src) {
            this.createBearElement.src = src;
        }
    }

    clearTimeouts() {
        this.timeouts.forEach(clearTimeout);
        this.timeouts = [];
    }

    resetToEmail() {
        this.setCurrentFocus('EMAIL');
        this.emailLength = 0;
        this.showPassword = false;
    }

    // Animation methods for specific interactions
    animateSuccess() {
        // Add a bounce effect
        this.bearElement.style.transform = 'scale(1.1)';
        setTimeout(() => {
            this.bearElement.style.transform = 'scale(1)';
        }, 200);
    }

    animateError() {
        // Add a shake effect
        this.bearElement.style.animation = 'bearShake 0.5s ease-in-out';
        setTimeout(() => {
            this.bearElement.style.animation = '';
        }, 500);
    }

    // Debug mode (optional)
    enableDebugMode() {
        const debug = document.createElement('div');
        debug.className = 'tunnel-bear-debug';
        debug.innerHTML = `
            <div>Debug Mode</div>
            <button onclick="window.tunnelBear.setCurrentFocus('EMAIL')">Email Focus</button>
            <button onclick="window.tunnelBear.setCurrentFocus('PASSWORD')">Password Focus</button>
            <button onclick="window.tunnelBear.showPassword = !window.tunnelBear.showPassword; window.tunnelBear.updateBearAnimation()">Toggle Password</button>
            <button onclick="window.tunnelBear.resetToEmail()">Reset</button>
        `;
        document.body.appendChild(debug);
    }
}

// Add shake animation to CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes bearShake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-5px); }
        75% { transform: translateX(5px); }
    }
    
    .tunnel-bear-container {
        display: flex;
        justify-content: center;
        margin-bottom: 2rem;
    }
    
    .tunnel-bear-avatar {
        border-radius: 50%;
        transition: all 0.2s ease-in-out;
        transform: translate3d(0,0,0); /* Force GPU acceleration */
    }
    
    .tunnel-bear-debug {
        position: fixed;
        bottom: 20px;
        left: 20px;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 10px;
        border-radius: 8px;
        font-size: 12px;
        z-index: 1000;
    }
    
    .tunnel-bear-debug button {
        display: block;
        margin: 5px 0;
        padding: 5px 10px;
        background: #333;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
    }
    
    .tunnel-bear-debug button:hover {
        background: #555;
    }
`;
document.head.appendChild(style);

// Initialize Tunnel Bear when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing Tunnel Bear...');
    try {
        window.tunnelBear = new TunnelBear();
        console.log('Tunnel Bear initialized successfully:', window.tunnelBear);
    } catch (error) {
        console.error('Error initializing Tunnel Bear:', error);
    }

    // Enable debug mode in development (optional)
    if (window.location.search.includes('debug=true')) {
        console.log('Enabling debug mode...');
        window.tunnelBear.enableDebugMode();
    }
}); 
// Tunnel Bear Animation - Adapted from React to Vanilla JavaScript
// Based on the Tunnel Bear login animation by Kadri Jibraan

class TunnelBear {
    constructor() {
        this.currentFocus = 'EMAIL';
        this.currentBearImage = null;
        this.isAnimating = false;
        this.prevFocus = 'EMAIL';
        this.prevShowPassword = false;
        this.timeouts = [];
        this.emailLength = 0;
        this.showPassword = false;

        // Bear image sequences
        this.watchBearImages = [];
        this.hideBearImages = [];
        this.peakBearImages = [];

        this.init();
    }

    init() {
        this.loadBearImages();
        this.createBearContainer();
        this.setupEventListeners();
        this.setCurrentBearImage(this.watchBearImages[0] || '');
    }

    loadBearImages() {
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
    }

    createBearContainer() {
        const container = document.createElement('div');
        container.className = 'tunnel-bear-container';
        container.innerHTML = `
            <img 
                src="${this.watchBearImages[0]}" 
                class="tunnel-bear-avatar"
                alt="Animated bear avatar"
                width="130"
                height="130"
            />
        `;

        // Insert at the beginning of the main content
        const main = document.querySelector('main');
        main.insertBefore(container, main.firstChild);

        this.bearElement = container.querySelector('.tunnel-bear-avatar');
    }

    setupEventListeners() {
        // Listen for form field interactions
        document.addEventListener('focusin', (e) => {
            if (e.target.matches('input, textarea')) {
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
            if (e.target.matches('.password-toggle')) {
                this.handlePasswordToggle(e.target);
            }
        });

        // Background tap to reset
        document.addEventListener('click', (e) => {
            if (e.target === document.body || e.target.matches('main')) {
                this.resetToEmail();
            }
        });
    }

    handleFieldFocus(field) {
        const fieldType = this.getFieldType(field);
        console.log('Field focus:', field.id, fieldType);

        if (fieldType === 'diaryId') {
            this.setCurrentFocus('EMAIL');
        } else if (fieldType === 'password') {
            this.setCurrentFocus('PASSWORD');
        }
    }

    handleFieldBlur(field) {
        const fieldType = this.getFieldType(field);

        if (fieldType === 'diaryId') {
            // Keep email focus for diary ID field
        } else if (fieldType === 'password') {
            // Reset to email focus when leaving password
            this.setCurrentFocus('EMAIL');
        }
    }

    handleFieldInput(field) {
        const fieldType = this.getFieldType(field);
        console.log('Field input:', field.id, fieldType, field.value);

        if (fieldType === 'diaryId') {
            this.emailLength = field.value.length;
            this.updateBearAnimation();
        }
    }

    handlePasswordToggle(button) {
        this.showPassword = !this.showPassword;
        this.updateBearAnimation();
    }

    getFieldType(field) {
        const id = field.id || '';
        if (id === 'diaryId' || id === 'userName') return 'diaryId';
        if (id === 'entryPassword') return 'password';
        if (id === 'entryContent') return 'content';
        if (id === 'feedbackName' || id === 'feedbackEmail' || id === 'feedbackMessage') return 'feedback';
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
        if (images.length === 0) {
            onComplete?.();
            return;
        }

        this.isAnimating = true;
        const imageSequence = reverse ? [...images].reverse() : images;

        imageSequence.forEach((img, index) => {
            const timeoutId = setTimeout(() => {
                this.setCurrentBearImage(img);
                if (index === imageSequence.length - 1) {
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
    window.tunnelBear = new TunnelBear();

    // Enable debug mode in development (optional)
    if (window.location.search.includes('debug=true')) {
        window.tunnelBear.enableDebugMode();
    }
}); 
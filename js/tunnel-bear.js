// Tunnel Bear Animation - Adapted from React to Vanilla JavaScript
// Based on the Tunnel Bear login animation by Kadri Jibraan

class TunnelBear {
    constructor() {
        console.log('TunnelBear constructor called');
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

        // Set initial bear image to watching state
        const initialImage = this.watchBearImages[0] || '';
        console.log('Setting initial bear image to:', initialImage);
        this.setCurrentBearImage(initialImage);
        console.log('Initial bear image set');
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
        // Find the bear avatar container in the form
        const bearContainer = document.querySelector('#diaryForm .w-\\[130px\\] .absolute');
        console.log('Bear container found:', bearContainer);

        if (bearContainer) {
            const bearImg = document.createElement('img');
            const initialImage = this.watchBearImages[0];
            console.log('Setting bear initial image to:', initialImage);
            bearImg.src = initialImage;
            bearImg.className = 'tunnel-bear-avatar';
            bearImg.alt = 'Animated bear avatar';
            bearImg.width = 130;
            bearImg.height = 130;

            bearContainer.appendChild(bearImg);
            this.bearElement = bearImg;
            console.log('Bear element created and added:', this.bearElement);
        } else {
            console.error('Bear container not found in form');
            console.log('Available elements with #diaryForm:', document.querySelector('#diaryForm'));
            console.log('Available elements with .w-[130px]:', document.querySelectorAll('.w-\\[130px\\]'));
        }
    }

    setupEventListeners() {
        // Single focusin listener that handles both regular focus and sensitive field focus
        document.addEventListener('focusin', (e) => {
            if (e.target.matches('input, textarea')) {
                const fieldType = this.getFieldType(e.target);
                console.log('Field focused:', e.target.id, fieldType);

                // Handle regular focus behavior
                this.handleFieldFocus(e.target);

                // Trigger hide animation when focusing on sensitive fields
                if (fieldType === 'diaryId' || fieldType === 'userPassword') {
                    console.log('Triggering hide animation for sensitive field:', fieldType);
                    this.handleSensitiveFieldFocus(e.target);
                }
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
                this.resetToEmail();
            }
        });
    }

    handleFieldFocus(field) {
        const fieldType = this.getFieldType(field);
        console.log('Field focus:', field.id, fieldType);

        if (fieldType === 'diaryId' || fieldType === 'userName') {
            this.setCurrentFocus('EMAIL');
        } else if (fieldType === 'password' || fieldType === 'userPassword') {
            this.setCurrentFocus('PASSWORD');
        }
    }

    handleFieldBlur(field) {
        const fieldType = this.getFieldType(field);

        if (fieldType === 'diaryId' || fieldType === 'userName') {
            // Keep email focus for diary ID and userName fields
        } else if (fieldType === 'password' || fieldType === 'userPassword') {
            // Reset to email focus when leaving password fields
            this.setCurrentFocus('EMAIL');
        }
    }

    handleFieldInput(field) {
        const fieldType = this.getFieldType(field);
        console.log('Field input:', field.id, fieldType, field.value);

        if (fieldType === 'diaryId' || fieldType === 'userName') {
            this.emailLength = field.value.length;
            this.updateBearAnimation();
        }
    }

    handleSensitiveFieldFocus(field) {
        const fieldType = this.getFieldType(field);
        console.log('Sensitive field focused:', field.id, fieldType);
        console.log('Hide bear images available:', this.hideBearImages.length);
        console.log('Peak bear images available:', this.peakBearImages.length);
        console.log('Current bear element:', this.bearElement);

        // Trigger hide bear animation for sensitive fields (following original tunnel bear logic)
        if (fieldType === 'diaryId' || fieldType === 'userPassword') {
            console.log('Starting hide animation...');
            console.log('Hide bear images:', this.hideBearImages);

            // Check if images are loaded
            if (this.hideBearImages.length === 0) {
                console.error('No hide bear images loaded!');
                return;
            }

            // First time entering sensitive field - animate hide bear images
            this.animateImages(this.hideBearImages, 150, false, () => {
                console.log('Hide animation complete, starting peak animation...');
                // After hiding, show peak animation briefly then return to watching
                this.animateImages(this.peakBearImages, 200, false, () => {
                    console.log('Peak animation complete, returning to watching...');
                    setTimeout(() => {
                        this.animateWatchingBearImages();
                    }, 500);
                });
            });
        }
    }

    handlePasswordToggle(button) {
        this.showPassword = !this.showPassword;
        this.updateBearAnimation();
    }

    getFieldType(field) {
        const id = field.id || '';
        if (id === 'diaryId') return 'diaryId';
        if (id === 'userName') return 'userName';
        if (id === 'userPassword') return 'userPassword';
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
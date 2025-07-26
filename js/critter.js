// Login Critter - Animated Avatar for Web
// Adapted from Swift implementation to JavaScript

class LoginCritter {
    constructor() {
        this.critter = null;
        this.isActive = false;
        this.isEcstatic = false;
        this.isShy = false;
        this.isPeeking = false;
        this.savedState = null;
        this.activeAnimator = null;
        this.neutralAnimator = null;

        this.init();
    }

    init() {
        this.createCritter();
        this.setupEventListeners();
        this.setState('neutral');
    }

    createCritter() {
        const container = document.createElement('div');
        container.className = 'critter-container';
        container.innerHTML = `
            <div class="critter neutral">
                <div class="critter-body"></div>
                <div class="critter-head">
                    <div class="critter-ear left"></div>
                    <div class="critter-ear right"></div>
                    <div class="critter-eye left"></div>
                    <div class="critter-eye right"></div>
                    <div class="critter-muzzle">
                        <div class="critter-nose"></div>
                        <div class="critter-mouth"></div>
                    </div>
                </div>
                <div class="critter-arm left"></div>
                <div class="critter-arm right"></div>
            </div>
        `;

        // Insert at the beginning of the main content
        const main = document.querySelector('main');
        main.insertBefore(container, main.firstChild);

        this.critter = container.querySelector('.critter');
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
                this.resetToNeutral();
            }
        });
    }

    handleFieldFocus(field) {
        const fieldType = this.getFieldType(field);
        console.log('Field focus:', field.id, fieldType);

        if (fieldType === 'diaryId') {
            // Start head rotation for diary ID field
            setTimeout(() => {
                this.startHeadRotation(field);
            }, 100);
        } else if (fieldType === 'password') {
            // Shy state for password fields
            setTimeout(() => {
                this.setShy(true);
            }, 100);
        }
    }

    handleFieldBlur(field) {
        const fieldType = this.getFieldType(field);

        if (fieldType === 'diaryId') {
            this.stopHeadRotation();
        } else if (fieldType === 'password') {
            this.setShy(false);
            this.setPeeking(false);
        }
    }

    handleFieldInput(field) {
        const fieldType = this.getFieldType(field);
        console.log('Field input:', field.id, fieldType, field.value);

        if (fieldType === 'diaryId') {
            // Update head rotation based on text length
            if (!this.isActive) return;

            const fractionComplete = this.calculateFractionComplete(field);
            console.log('Fraction complete:', fractionComplete);
            this.updateHeadRotation(fractionComplete);

            // Check for ecstatic state (@ symbol)
            const isEcstatic = field.value.includes('@');
            this.setEcstatic(isEcstatic);
        }
    }

    handlePasswordToggle(button) {
        const isVisible = button.querySelector('svg').innerHTML.includes('eye-off');
        this.setPeeking(isVisible);
    }

    getFieldType(field) {
        const id = field.id || '';
        if (id === 'diaryId' || id === 'userName') return 'diaryId';
        if (id === 'entryPassword') return 'password';
        if (id === 'entryContent') return 'content';
        if (id === 'feedbackName' || id === 'feedbackEmail' || id === 'feedbackMessage') return 'feedback';
        return 'text';
    }

    calculateFractionComplete(field) {
        const text = field.value || '';
        const fieldWidth = field.offsetWidth - 32; // Account for padding
        const textWidth = this.getTextWidth(text, field);
        return Math.min(textWidth / fieldWidth, 1);
    }

    getTextWidth(text, field) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        const font = window.getComputedStyle(field).font;
        context.font = font;
        return context.measureText(text).width;
    }

    startHeadRotation(field) {
        this.isActive = true;
        this.setState('active');

        const fractionComplete = this.calculateFractionComplete(field);
        this.updateHeadRotation(fractionComplete);

        // Add bounce animation
        this.critter.classList.add('animate');
        setTimeout(() => {
            this.critter.classList.remove('animate');
        }, 300);
    }

    updateHeadRotation(fractionComplete) {
        if (!this.isActive) return;

        // Calculate head rotation based on text position
        // Start from left (-30°) and rotate to right (+30°) as text fills
        const maxRotation = 30; // degrees
        const rotation = (fractionComplete * maxRotation * 2) - maxRotation;

        this.critter.style.setProperty('--head-rotation', `${rotation}deg`);
    }

    stopHeadRotation() {
        this.isActive = false;
        this.setState('neutral');
        this.critter.style.removeProperty('--head-rotation');
    }

    setEcstatic(ecstatic) {
        this.isEcstatic = ecstatic;
        this.updateStates();
    }

    setShy(shy) {
        this.isShy = shy;
        this.updateStates();
    }

    setPeeking(peeking) {
        this.isPeeking = peeking;
        this.updateStates();
    }

    setState(state) {
        // Remove all state classes
        this.critter.classList.remove('neutral', 'active', 'ecstatic', 'shy', 'peek');

        // Add current state
        this.critter.classList.add(state);
    }

    updateStates() {
        // Determine the primary state
        let primaryState = 'neutral';

        if (this.isActive) {
            primaryState = 'active';
        }

        // Apply primary state
        this.setState(primaryState);

        // Apply additional states
        if (this.isEcstatic) {
            this.critter.classList.add('ecstatic');
        }

        if (this.isShy) {
            this.critter.classList.add('shy');
        }

        if (this.isPeeking) {
            this.critter.classList.add('peek');
        }
    }

    resetToNeutral() {
        this.isActive = false;
        this.isEcstatic = false;
        this.isShy = false;
        this.isPeeking = false;
        this.setState('neutral');
        this.critter.style.removeProperty('--head-rotation');
    }

    // Animation methods for specific interactions
    animateSuccess() {
        this.critter.classList.add('animate');
        setTimeout(() => {
            this.critter.classList.remove('animate');
        }, 300);
    }

    animateError() {
        // Shake animation for errors
        this.critter.style.animation = 'critterShake 0.5s ease-in-out';
        setTimeout(() => {
            this.critter.style.animation = '';
        }, 500);
    }

    // Debug mode (optional)
    enableDebugMode() {
        const debug = document.createElement('div');
        debug.className = 'critter-debug';
        debug.innerHTML = `
            <div>Debug Mode</div>
            <button onclick="window.critter.setEcstatic(!window.critter.isEcstatic)">Toggle Ecstatic</button>
            <button onclick="window.critter.setShy(!window.critter.isShy)">Toggle Shy</button>
            <button onclick="window.critter.setPeeking(!window.critter.isPeeking)">Toggle Peek</button>
            <button onclick="window.critter.resetToNeutral()">Reset</button>
        `;
        document.body.appendChild(debug);
    }
}

// Add shake animation to CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes critterShake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-5px); }
        75% { transform: translateX(5px); }
    }
`;
document.head.appendChild(style);

// Initialize critter when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.critter = new LoginCritter();

    // Enable debug mode in development (optional)
    if (window.location.search.includes('debug=true')) {
        window.critter.enableDebugMode();
    }
}); 
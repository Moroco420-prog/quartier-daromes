/* ========================================
   AMÉLIORATIONS ADMIN - QUARTIER D'ARÔMES
   Mode sombre, Notifications, Animations
   ======================================== */

// ============ MODE SOMBRE/CLAIR ============
class ThemeManager {
    constructor() {
        this.theme = localStorage.getItem('admin-theme') || 'light';
        this.init();
    }
    
    init() {
        // Appliquer le thème sauvegardé
        this.applyTheme(this.theme);
        
        // Créer le bouton toggle
        this.createToggleButton();
        
        // Écouter les changements
        this.setupEventListeners();
    }
    
    createToggleButton() {
        const button = document.createElement('button');
        button.className = 'theme-toggle';
        button.id = 'themeToggle';
        button.setAttribute('aria-label', 'Changer le thème');
        button.innerHTML = this.theme === 'dark' 
            ? '<i class="bi bi-sun-fill"></i>' 
            : '<i class="bi bi-moon-fill"></i>';
        
        document.body.appendChild(button);
    }
    
    setupEventListeners() {
        const button = document.getElementById('themeToggle');
        if (button) {
            button.addEventListener('click', () => this.toggleTheme());
        }
    }
    
    toggleTheme() {
        this.theme = this.theme === 'light' ? 'dark' : 'light';
        this.applyTheme(this.theme);
        localStorage.setItem('admin-theme', this.theme);
        
        // Animation du bouton
        const button = document.getElementById('themeToggle');
        button.style.transform = 'rotate(360deg)';
        setTimeout(() => {
            button.style.transform = '';
            button.innerHTML = this.theme === 'dark' 
                ? '<i class="bi bi-sun-fill"></i>' 
                : '<i class="bi bi-moon-fill"></i>';
        }, 300);
        
        // Notification
        showNotification(
            `Mode ${this.theme === 'dark' ? 'sombre' : 'clair'} activé`,
            'success',
            this.theme === 'dark' ? 'bi-moon-stars' : 'bi-brightness-high'
        );
    }
    
    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        document.body.setAttribute('data-theme', theme);
    }
}

// ============ SYSTÈME DE NOTIFICATIONS ============
class NotificationSystem {
    constructor() {
        this.container = null;
        this.soundEnabled = localStorage.getItem('notifications-sound') !== 'false';
        this.init();
    }
    
    init() {
        // Créer le conteneur de notifications
        this.container = document.createElement('div');
        this.container.id = 'notification-container';
        this.container.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            z-index: 9999;
            width: 350px;
        `;
        document.body.appendChild(this.container);
    }
    
    show(message, type = 'info', icon = 'bi-info-circle', duration = 4000) {
        const notification = document.createElement('div');
        notification.className = `alert alert-${type} alert-dismissible fade show notification-item`;
        notification.style.cssText = `
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 10px;
            box-shadow: 0 4px 16px rgba(0,0,0,0.2);
            animation: slideInRight 0.3s ease;
            border-left: 4px solid;
        `;
        
        // Couleurs selon le type
        const colors = {
            success: '#28a745',
            danger: '#dc3545',
            warning: '#ffc107',
            info: '#17a2b8',
            primary: '#C4942F'
        };
        
        notification.style.borderLeftColor = colors[type] || colors.info;
        
        notification.innerHTML = `
            <i class="bi ${icon} fs-4" style="color: ${colors[type]}"></i>
            <div class="flex-grow-1">
                <strong>${message}</strong>
                <div class="progress mt-1" style="height: 2px;">
                    <div class="progress-bar" role="progressbar" style="width: 100%; background: ${colors[type]}; transition: width ${duration}ms linear;"></div>
                </div>
            </div>
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        this.container.appendChild(notification);
        
        // Animation de la barre de progression
        setTimeout(() => {
            const progressBar = notification.querySelector('.progress-bar');
            if (progressBar) {
                progressBar.style.width = '0%';
            }
        }, 10);
        
        // Son
        if (this.soundEnabled) {
            this.playSound(type);
        }
        
        // Auto-suppression
        if (duration > 0) {
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => notification.remove(), 300);
            }, duration);
        }
        
        return notification;
    }
    
    playSound(type) {
        // Sons différents selon le type
        const frequencies = {
            success: [523.25, 659.25], // C5, E5
            danger: [392.00, 329.63],  // G4, E4
            warning: [440.00, 493.88], // A4, B4
            info: [523.25, 523.25],    // C5, C5
            primary: [659.25, 783.99]  // E5, G5
        };
        
        const freq = frequencies[type] || frequencies.info;
        
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = freq[0];
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
            
            oscillator.start(audioContext.currentTime);
            oscillator.frequency.setValueAtTime(freq[1], audioContext.currentTime + 0.05);
            oscillator.stop(audioContext.currentTime + 0.1);
        } catch (e) {
            console.log('Son non disponible');
        }
    }
    
    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        localStorage.setItem('notifications-sound', this.soundEnabled);
        this.show(
            `Sons ${this.soundEnabled ? 'activés' : 'désactivés'}`,
            'info',
            this.soundEnabled ? 'bi-volume-up' : 'bi-volume-mute'
        );
    }
}

// ============ ANIMATIONS CSS ============
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes pulse {
        0%, 100% {
            transform: scale(1);
        }
        50% {
            transform: scale(1.05);
        }
    }
    
    .notification-item {
        animation: slideInRight 0.3s ease;
    }
    
    .notification-item:hover {
        transform: translateX(-5px);
        transition: transform 0.2s ease;
    }
    
    /* Badge de notification animé */
    .notification-badge {
        animation: pulse 2s infinite;
    }
    
    /* Effet de chargement */
    .loading-skeleton {
        background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
        background-size: 200% 100%;
        animation: loading 1.5s infinite;
    }
    
    @keyframes loading {
        0% {
            background-position: 200% 0;
        }
        100% {
            background-position: -200% 0;
        }
    }
    
    /* Hover effect pour cards */
    .card-interactive {
        transition: all 0.3s ease;
        cursor: pointer;
    }
    
    .card-interactive:hover {
        transform: translateY(-5px);
        box-shadow: 0 8px 24px rgba(0,0,0,0.15);
    }
    
    /* Effet de brillance */
    .shine-effect {
        position: relative;
        overflow: hidden;
    }
    
    .shine-effect::after {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
        transition: left 0.5s;
    }
    
    .shine-effect:hover::after {
        left: 100%;
    }
`;
document.head.appendChild(style);

// ============ STATISTIQUES EN TEMPS RÉEL ============
class LiveStats {
    constructor() {
        this.updateInterval = null;
    }
    
    start(intervalMs = 30000) {
        // Mettre à jour les stats toutes les 30 secondes
        this.updateInterval = setInterval(() => this.fetchAndUpdate(), intervalMs);
    }
    
    stop() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
    }
    
    async fetchAndUpdate() {
        try {
            // Simuler fetch (adapter selon votre API)
            const response = await fetch('/api/admin/stats/live');
            if (response.ok) {
                const data = await response.json();
                this.updateCards(data);
                showNotification('Statistiques mises à jour', 'success', 'bi-arrow-repeat', 2000);
            }
        } catch (error) {
            console.log('Erreur lors de la mise à jour des stats');
        }
    }
    
    updateCards(data) {
        // Mettre à jour les cartes de stats avec animation
        Object.keys(data).forEach(key => {
            const element = document.getElementById(`stat-${key}`);
            if (element) {
                this.animateValue(element, parseInt(element.textContent), data[key], 1000);
            }
        });
    }
    
    animateValue(element, start, end, duration) {
        const range = end - start;
        const increment = range / (duration / 16);
        let current = start;
        
        const timer = setInterval(() => {
            current += increment;
            if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
                element.textContent = end.toLocaleString();
                clearInterval(timer);
            } else {
                element.textContent = Math.floor(current).toLocaleString();
            }
        }, 16);
    }
}

// ============ RACCOURCIS CLAVIER ============
class KeyboardShortcuts {
    constructor() {
        this.shortcuts = {
            'd': () => themeManager.toggleTheme(), // D = Dark mode
            's': () => notificationSystem.toggleSound(), // S = Sound
            'n': () => showNotification('Test notification', 'info'), // N = Notification
            '/': () => document.querySelector('input[type="search"]')?.focus() // / = Search
        };
        
        this.init();
    }
    
    init() {
        document.addEventListener('keydown', (e) => {
            // Ignorer si on tape dans un input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }
            
            // Ctrl/Cmd + touche
            if (e.ctrlKey || e.metaKey) {
                const handler = this.shortcuts[e.key.toLowerCase()];
                if (handler) {
                    e.preventDefault();
                    handler();
                }
            }
        });
    }
}

// ============ INDICATEUR DE CHARGEMENT ============
function showLoader(message = 'Chargement...') {
    const loader = document.createElement('div');
    loader.id = 'global-loader';
    loader.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        backdrop-filter: blur(5px);
    `;
    
    loader.innerHTML = `
        <div style="text-align: center; color: white;">
            <div class="spinner-border text-warning mb-3" style="width: 3rem; height: 3rem;" role="status">
                <span class="visually-hidden">Chargement...</span>
            </div>
            <div style="font-size: 1.2rem; font-weight: 500;">${message}</div>
        </div>
    `;
    
    document.body.appendChild(loader);
    return loader;
}

function hideLoader() {
    const loader = document.getElementById('global-loader');
    if (loader) {
        loader.style.opacity = '0';
        setTimeout(() => loader.remove(), 300);
    }
}

// ============ CONFIRMATION ÉLÉGANTE ============
function confirmAction(message, onConfirm, type = 'warning') {
    const icons = {
        warning: 'bi-exclamation-triangle',
        danger: 'bi-trash',
        info: 'bi-info-circle'
    };
    
    const colors = {
        warning: '#ffc107',
        danger: '#dc3545',
        info: '#17a2b8'
    };
    
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.innerHTML = `
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-body text-center p-4">
                    <i class="bi ${icons[type]} display-1 mb-3" style="color: ${colors[type]}"></i>
                    <h5 class="mb-4">${message}</h5>
                    <div class="d-flex gap-2 justify-content-center">
                        <button class="btn btn-secondary" data-bs-dismiss="modal">Annuler</button>
                        <button class="btn btn-${type}" id="confirmBtn">Confirmer</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
    
    modal.querySelector('#confirmBtn').addEventListener('click', () => {
        onConfirm();
        bsModal.hide();
    });
    
    modal.addEventListener('hidden.bs.modal', () => modal.remove());
}

// ============ INITIALISATION ============
let themeManager;
let notificationSystem;
let liveStats;
let keyboardShortcuts;

document.addEventListener('DOMContentLoaded', () => {
    // Initialiser les systèmes
    themeManager = new ThemeManager();
    notificationSystem = new NotificationSystem();
    liveStats = new LiveStats();
    keyboardShortcuts = new KeyboardShortcuts();
    
    // Ajouter les effets interactifs aux cards
    document.querySelectorAll('.card:not(.no-hover)').forEach(card => {
        card.classList.add('card-interactive');
    });
    
    console.log('✨ Admin enhancements loaded');
    console.log('Raccourcis: Ctrl+D (thème), Ctrl+S (son), Ctrl+N (notification)');
});

// ============ FONCTIONS GLOBALES ============
function showNotification(message, type = 'info', icon = 'bi-info-circle', duration = 4000) {
    return notificationSystem.show(message, type, icon, duration);
}

function toggleTheme() {
    themeManager.toggleTheme();
}

function toggleNotificationSound() {
    notificationSystem.toggleSound();
}

// Export pour utilisation globale
window.showNotification = showNotification;
window.toggleTheme = toggleTheme;
window.toggleNotificationSound = toggleNotificationSound;
window.showLoader = showLoader;
window.hideLoader = hideLoader;
window.confirmAction = confirmAction;

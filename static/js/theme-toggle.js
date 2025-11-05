/**
 * Système de Mode Sombre/Clair avec persistance
 * Toggle animé et élégant
 */

class ThemeManager {
    constructor() {
        this.currentTheme = this.getSavedTheme() || 'light';
        this.init();
    }

    init() {
        // Appliquer le thème sauvegardé
        this.applyTheme(this.currentTheme, false);
        
        // Créer le toggle button
        this.createToggle();
        
        // Écouter les changements de préférence système
        this.watchSystemPreference();
    }

    getSavedTheme() {
        return localStorage.getItem('theme');
    }

    saveTheme(theme) {
        localStorage.setItem('theme', theme);
    }

    applyTheme(theme, animate = true) {
        const body = document.body;
        
        if (animate) {
            body.classList.add('theme-transitioning');
        }

        if (theme === 'dark') {
            body.classList.add('dark-mode');
        } else {
            body.classList.remove('dark-mode');
        }

        this.currentTheme = theme;
        this.saveTheme(theme);
        this.updateToggleIcon();

        if (animate) {
            setTimeout(() => body.classList.remove('theme-transitioning'), 300);
        }

        // Dispatch event pour d'autres composants
        window.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
    }

    toggle() {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme(newTheme, true);
        
        // Animation de feedback
        if (window.toast) {
            const message = newTheme === 'dark' 
                ? 'Mode sombre activé 🌙' 
                : 'Mode clair activé ☀️';
            toast.info(message, { title: null });
        }
    }

    createToggle() {
        // Vérifier si le toggle existe déjà
        if (document.getElementById('theme-toggle')) return;

        const toggle = document.createElement('button');
        toggle.id = 'theme-toggle';
        toggle.className = 'theme-toggle';
        toggle.setAttribute('aria-label', 'Basculer le thème');
        toggle.innerHTML = `
            <div class="theme-toggle-track">
                <div class="theme-toggle-thumb">
                    <i class="bi bi-sun-fill sun-icon"></i>
                    <i class="bi bi-moon-stars-fill moon-icon"></i>
                </div>
            </div>
        `;

        // Ajouter au DOM (dans le header)
        const navbar = document.querySelector('.navbar');
        if (navbar) {
            const navRight = navbar.querySelector('.navbar-nav.ms-auto') || navbar;
            navRight.insertAdjacentElement('beforebegin', toggle);
        } else {
            document.body.appendChild(toggle);
        }

        toggle.addEventListener('click', () => this.toggle());
    }

    updateToggleIcon() {
        const toggle = document.getElementById('theme-toggle');
        if (toggle) {
            if (this.currentTheme === 'dark') {
                toggle.classList.add('dark');
            } else {
                toggle.classList.remove('dark');
            }
        }
    }

    watchSystemPreference() {
        if (!window.matchMedia) return;

        const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
        darkModeQuery.addEventListener('change', (e) => {
            // Seulement si l'utilisateur n'a pas de préférence sauvegardée
            if (!this.getSavedTheme()) {
                this.applyTheme(e.matches ? 'dark' : 'light', true);
            }
        });
    }
}

// Styles CSS pour le mode sombre et le toggle
const themeStyles = `
<style>
/* Variables pour le mode sombre */
body.dark-mode {
    --bg-primary: #0f172a;
    --bg-secondary: #1e293b;
    --bg-tertiary: #334155;
    --text-primary: #f1f5f9;
    --text-secondary: #cbd5e1;
    --text-muted: #94a3b8;
    --border-color: #334155;
    --shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
    --shadow-lg: 0 4px 20px rgba(0, 0, 0, 0.7);
}

body.dark-mode {
    background-color: var(--bg-primary);
    color: var(--text-primary);
}

/* Transition fluide entre thèmes */
body.theme-transitioning,
body.theme-transitioning * {
    transition: background-color 0.3s ease,
                color 0.3s ease,
                border-color 0.3s ease,
                box-shadow 0.3s ease !important;
}

/* Cartes et conteneurs */
body.dark-mode .card,
body.dark-mode .product-card,
body.dark-mode .bg-white {
    background-color: var(--bg-secondary) !important;
    border-color: var(--border-color) !important;
    color: var(--text-primary);
}

body.dark-mode .bg-light {
    background-color: var(--bg-tertiary) !important;
}

/* Navbar */
body.dark-mode .navbar {
    background-color: var(--bg-secondary) !important;
    border-bottom-color: var(--border-color) !important;
}

body.dark-mode .navbar-brand,
body.dark-mode .nav-link {
    color: var(--text-primary) !important;
}

body.dark-mode .nav-link:hover {
    color: var(--logo-color) !important;
}

/* Footer */
body.dark-mode .footer {
    background-color: var(--bg-secondary) !important;
    border-top-color: var(--border-color) !important;
}

/* Formulaires */
body.dark-mode .form-control,
body.dark-mode .form-select {
    background-color: var(--bg-tertiary);
    border-color: var(--border-color);
    color: var(--text-primary);
}

body.dark-mode .form-control:focus,
body.dark-mode .form-select:focus {
    background-color: var(--bg-tertiary);
    border-color: var(--logo-color);
    color: var(--text-primary);
}

body.dark-mode .form-control::placeholder {
    color: var(--text-muted);
}

/* Boutons */
body.dark-mode .btn-outline-secondary {
    color: var(--text-primary);
    border-color: var(--border-color);
}

body.dark-mode .btn-outline-secondary:hover {
    background-color: var(--bg-tertiary);
    border-color: var(--logo-color);
}

/* Tables */
body.dark-mode .table {
    color: var(--text-primary);
}

body.dark-mode .table-striped tbody tr:nth-of-type(odd) {
    background-color: var(--bg-tertiary);
}

body.dark-mode .table-hover tbody tr:hover {
    background-color: var(--bg-tertiary);
}

/* Modals */
body.dark-mode .modal-content {
    background-color: var(--bg-secondary);
    color: var(--text-primary);
}

body.dark-mode .modal-header {
    border-bottom-color: var(--border-color);
}

body.dark-mode .modal-footer {
    border-top-color: var(--border-color);
}

/* Badges */
body.dark-mode .badge {
    background-color: var(--bg-tertiary) !important;
}

/* Breadcrumb */
body.dark-mode .breadcrumb {
    background-color: var(--bg-tertiary);
}

body.dark-mode .breadcrumb-item a {
    color: var(--logo-color);
}

/* Images - ajuster l'opacité en mode sombre */
body.dark-mode img:not(.logo):not(.product-image) {
    opacity: 0.9;
}

/* Toggle Button */
.theme-toggle {
    position: fixed;
    bottom: 30px;
    right: 30px;
    z-index: 1000;
    background: white;
    border: 2px solid var(--logo-color);
    border-radius: 50px;
    width: 70px;
    height: 36px;
    cursor: pointer;
    padding: 4px;
    transition: all 0.3s ease;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.theme-toggle:hover {
    transform: scale(1.05);
    box-shadow: 0 6px 20px rgba(196, 148, 47, 0.3);
}

.theme-toggle:active {
    transform: scale(0.95);
}

.theme-toggle.dark {
    background: var(--bg-secondary);
    border-color: var(--logo-color);
}

.theme-toggle-track {
    position: relative;
    width: 100%;
    height: 100%;
}

.theme-toggle-thumb {
    position: absolute;
    top: 0;
    left: 0;
    width: 28px;
    height: 28px;
    background: linear-gradient(135deg, var(--logo-color), var(--logo-hover));
    border-radius: 50%;
    transition: transform 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 14px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.theme-toggle.dark .theme-toggle-thumb {
    transform: translateX(34px);
}

.theme-toggle-thumb i {
    position: absolute;
    transition: all 0.3s ease;
}

.sun-icon {
    opacity: 1;
    transform: rotate(0deg);
}

.moon-icon {
    opacity: 0;
    transform: rotate(180deg);
}

.theme-toggle.dark .sun-icon {
    opacity: 0;
    transform: rotate(-180deg);
}

.theme-toggle.dark .moon-icon {
    opacity: 1;
    transform: rotate(0deg);
}

/* Animation du toggle au chargement */
.theme-toggle {
    animation: slideInRight 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

@keyframes slideInRight {
    from {
        transform: translateX(100px);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}

/* Responsive */
@media (max-width: 768px) {
    .theme-toggle {
        bottom: 80px;
        right: 20px;
        width: 60px;
        height: 32px;
    }

    .theme-toggle-thumb {
        width: 24px;
        height: 24px;
        font-size: 12px;
    }

    .theme-toggle.dark .theme-toggle-thumb {
        transform: translateX(28px);
    }
}

/* Prix en mode sombre */
body.dark-mode .product-price,
body.dark-mode .price {
    color: var(--logo-color) !important;
}

/* Amélioration des ombres en mode sombre */
body.dark-mode .card:hover,
body.dark-mode .product-card:hover {
    box-shadow: 0 8px 30px rgba(196, 148, 47, 0.2);
}

/* Dropdown menu */
body.dark-mode .dropdown-menu {
    background-color: var(--bg-secondary);
    border-color: var(--border-color);
}

body.dark-mode .dropdown-item {
    color: var(--text-primary);
}

body.dark-mode .dropdown-item:hover {
    background-color: var(--bg-tertiary);
    color: var(--logo-color);
}

/* Pagination */
body.dark-mode .pagination .page-link {
    background-color: var(--bg-secondary);
    border-color: var(--border-color);
    color: var(--text-primary);
}

body.dark-mode .pagination .page-link:hover {
    background-color: var(--bg-tertiary);
    border-color: var(--logo-color);
}

body.dark-mode .pagination .page-item.active .page-link {
    background-color: var(--logo-color);
    border-color: var(--logo-color);
}

/* Alerts */
body.dark-mode .alert {
    background-color: var(--bg-tertiary);
    border-color: var(--border-color);
    color: var(--text-primary);
}
</style>
`;

// Injecter les styles
document.head.insertAdjacentHTML('beforeend', themeStyles);

// Initialiser le gestionnaire de thème
window.themeManager = new ThemeManager();

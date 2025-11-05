/**
 * IMAGE ZOOM INTERACTIF - QUARTIER D'ARÔMES
 * Système de zoom sur images produits avec 3 modes:
 * 1. Hover zoom (loupe au survol)
 * 2. Click zoom (modal plein écran)
 * 3. Mobile pinch zoom
 * 
 * @version 1.0
 * @date 2025-11-05
 */

class ImageZoom {
    constructor(options = {}) {
        this.options = {
            zoomLevel: options.zoomLevel || 2.5,
            hoverZoom: options.hoverZoom !== false,
            clickZoom: options.clickZoom !== false,
            modalZoom: options.modalZoom !== false,
            cursorSize: options.cursorSize || 150,
            transitionSpeed: options.transitionSpeed || 0.3,
            ...options
        };
        
        this.activeImage = null;
        this.isZooming = false;
        this.modal = null;
        
        this.init();
    }
    
    /**
     * Initialisation
     */
    init() {
        // Attendre que le DOM soit chargé
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }
    
    /**
     * Configuration initiale
     */
    setup() {
        // Créer le modal plein écran
        if (this.options.modalZoom) {
            this.createModal();
        }
        
        // Initialiser toutes les images zoomables
        this.initZoomImages();
        
        // Gérer le redimensionnement
        window.addEventListener('resize', () => this.handleResize());
    }
    
    /**
     * Initialiser les images zoomables
     */
    initZoomImages() {
        const images = document.querySelectorAll('.zoomable, .product-image-main');
        
        images.forEach(img => {
            // Hover zoom
            if (this.options.hoverZoom && !this.isMobile()) {
                this.initHoverZoom(img);
            }
            
            // Click zoom
            if (this.options.clickZoom) {
                this.initClickZoom(img);
            }
            
            // Indicateur visuel
            this.addZoomIndicator(img);
        });
    }
    
    /**
     * Zoom au survol
     */
    initHoverZoom(img) {
        const container = img.closest('.product-image-container') || img.parentElement;
        
        // Créer container zoom si nécessaire
        if (!container.classList.contains('zoom-container')) {
            this.wrapImageInContainer(img);
        }
        
        // Container et lens
        const zoomContainer = img.closest('.zoom-container');
        const lens = this.createLens();
        const result = this.createResultBox();
        
        zoomContainer.appendChild(lens);
        zoomContainer.appendChild(result);
        
        // Events
        img.addEventListener('mouseenter', () => {
            lens.style.display = 'block';
            result.style.display = 'block';
            this.isZooming = true;
        });
        
        img.addEventListener('mousemove', (e) => {
            if (!this.isZooming) return;
            this.handleHoverZoom(e, img, lens, result);
        });
        
        img.addEventListener('mouseleave', () => {
            lens.style.display = 'none';
            result.style.display = 'none';
            this.isZooming = false;
        });
    }
    
    /**
     * Gérer le zoom au survol
     */
    handleHoverZoom(e, img, lens, result) {
        const rect = img.getBoundingClientRect();
        
        // Position curseur relative à l'image
        let x = e.clientX - rect.left;
        let y = e.clientY - rect.top;
        
        // Limites
        const lensHalf = lens.offsetWidth / 2;
        x = Math.max(lensHalf, Math.min(x, rect.width - lensHalf));
        y = Math.max(lensHalf, Math.min(y, rect.height - lensHalf));
        
        // Position lens
        lens.style.left = (x - lensHalf) + 'px';
        lens.style.top = (y - lensHalf) + 'px';
        
        // Position image zoomée
        const zoomX = (x / rect.width) * 100;
        const zoomY = (y / rect.height) * 100;
        
        result.style.backgroundImage = `url('${img.src}')`;
        result.style.backgroundPosition = `${zoomX}% ${zoomY}%`;
        result.style.backgroundSize = `${rect.width * this.options.zoomLevel}px ${rect.height * this.options.zoomLevel}px`;
    }
    
    /**
     * Créer la loupe (lens)
     */
    createLens() {
        const lens = document.createElement('div');
        lens.className = 'zoom-lens';
        lens.style.cssText = `
            position: absolute;
            width: ${this.options.cursorSize}px;
            height: ${this.options.cursorSize}px;
            border: 3px solid #C4942F;
            border-radius: 50%;
            cursor: none;
            pointer-events: none;
            display: none;
            z-index: 10;
            background: rgba(196, 148, 47, 0.1);
            box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.8),
                        0 4px 12px rgba(0, 0, 0, 0.2);
        `;
        return lens;
    }
    
    /**
     * Créer la box résultat (image zoomée)
     */
    createResultBox() {
        const result = document.createElement('div');
        result.className = 'zoom-result';
        result.style.cssText = `
            position: absolute;
            right: -420px;
            top: 0;
            width: 400px;
            height: 400px;
            border: 2px solid #e9ecef;
            border-radius: 10px;
            background-color: white;
            background-repeat: no-repeat;
            display: none;
            z-index: 100;
            box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
        `;
        return result;
    }
    
    /**
     * Zoom au clic (modal)
     */
    initClickZoom(img) {
        img.style.cursor = 'zoom-in';
        
        img.addEventListener('click', (e) => {
            e.preventDefault();
            this.openModal(img.src, img.alt);
        });
    }
    
    /**
     * Créer le modal plein écran
     */
    createModal() {
        const modal = document.createElement('div');
        modal.className = 'image-zoom-modal';
        modal.innerHTML = `
            <div class="zoom-modal-overlay"></div>
            <div class="zoom-modal-content">
                <button class="zoom-modal-close" aria-label="Fermer">
                    <i class="bi bi-x-lg"></i>
                </button>
                <div class="zoom-modal-controls">
                    <button class="zoom-control zoom-in" aria-label="Zoom in">
                        <i class="bi bi-zoom-in"></i>
                    </button>
                    <button class="zoom-control zoom-out" aria-label="Zoom out">
                        <i class="bi bi-zoom-out"></i>
                    </button>
                    <button class="zoom-control zoom-reset" aria-label="Réinitialiser">
                        <i class="bi bi-arrow-clockwise"></i>
                    </button>
                </div>
                <div class="zoom-modal-image-container">
                    <img src="" alt="" class="zoom-modal-image">
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        this.modal = modal;
        
        // Styles
        this.addModalStyles();
        
        // Events
        this.initModalEvents();
    }
    
    /**
     * Ajouter styles modal
     */
    addModalStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .image-zoom-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 9999;
                display: none;
                opacity: 0;
                transition: opacity 0.3s ease;
            }
            
            .image-zoom-modal.active {
                display: block;
                opacity: 1;
            }
            
            .zoom-modal-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.95);
            }
            
            .zoom-modal-content {
                position: relative;
                width: 100%;
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .zoom-modal-close {
                position: absolute;
                top: 20px;
                right: 20px;
                width: 50px;
                height: 50px;
                background: rgba(255, 255, 255, 0.1);
                border: 2px solid rgba(255, 255, 255, 0.3);
                border-radius: 50%;
                color: white;
                font-size: 24px;
                cursor: pointer;
                z-index: 10;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease;
            }
            
            .zoom-modal-close:hover {
                background: rgba(255, 255, 255, 0.2);
                transform: rotate(90deg);
            }
            
            .zoom-modal-controls {
                position: absolute;
                bottom: 30px;
                left: 50%;
                transform: translateX(-50%);
                display: flex;
                gap: 15px;
                background: rgba(255, 255, 255, 0.1);
                padding: 10px 20px;
                border-radius: 50px;
                backdrop-filter: blur(10px);
            }
            
            .zoom-control {
                width: 45px;
                height: 45px;
                background: rgba(196, 148, 47, 0.2);
                border: 2px solid #C4942F;
                border-radius: 50%;
                color: #C4942F;
                font-size: 20px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease;
            }
            
            .zoom-control:hover {
                background: #C4942F;
                color: white;
                transform: scale(1.1);
            }
            
            .zoom-modal-image-container {
                max-width: 90%;
                max-height: 90%;
                overflow: auto;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .zoom-modal-image {
                max-width: 100%;
                max-height: 90vh;
                cursor: grab;
                transition: transform 0.3s ease;
                user-select: none;
            }
            
            .zoom-modal-image.dragging {
                cursor: grabbing;
            }
            
            .zoom-container {
                position: relative;
                display: inline-block;
            }
            
            .zoom-indicator {
                position: absolute;
                bottom: 10px;
                right: 10px;
                background: rgba(196, 148, 47, 0.9);
                color: white;
                padding: 6px 12px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 600;
                z-index: 5;
                pointer-events: none;
                display: flex;
                align-items: center;
                gap: 5px;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
            }
            
            @media (max-width: 768px) {
                .zoom-result {
                    display: none !important;
                }
                
                .zoom-lens {
                    display: none !important;
                }
                
                .zoom-modal-controls {
                    bottom: 20px;
                    gap: 10px;
                    padding: 8px 15px;
                }
                
                .zoom-control {
                    width: 40px;
                    height: 40px;
                    font-size: 18px;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    /**
     * Initialiser events modal
     */
    initModalEvents() {
        const closeBtn = this.modal.querySelector('.zoom-modal-close');
        const overlay = this.modal.querySelector('.zoom-modal-overlay');
        const zoomIn = this.modal.querySelector('.zoom-in');
        const zoomOut = this.modal.querySelector('.zoom-out');
        const zoomReset = this.modal.querySelector('.zoom-reset');
        const img = this.modal.querySelector('.zoom-modal-image');
        
        let scale = 1;
        let isDragging = false;
        let startX, startY, translateX = 0, translateY = 0;
        
        // Fermer
        closeBtn.addEventListener('click', () => this.closeModal());
        overlay.addEventListener('click', () => this.closeModal());
        
        // Echap pour fermer
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.classList.contains('active')) {
                this.closeModal();
            }
        });
        
        // Zoom in
        zoomIn.addEventListener('click', () => {
            scale = Math.min(scale + 0.5, 5);
            img.style.transform = `scale(${scale}) translate(${translateX}px, ${translateY}px)`;
        });
        
        // Zoom out
        zoomOut.addEventListener('click', () => {
            scale = Math.max(scale - 0.5, 1);
            if (scale === 1) {
                translateX = 0;
                translateY = 0;
            }
            img.style.transform = `scale(${scale}) translate(${translateX}px, ${translateY}px)`;
        });
        
        // Reset
        zoomReset.addEventListener('click', () => {
            scale = 1;
            translateX = 0;
            translateY = 0;
            img.style.transform = `scale(1) translate(0, 0)`;
        });
        
        // Drag pour déplacer
        img.addEventListener('mousedown', (e) => {
            if (scale > 1) {
                isDragging = true;
                img.classList.add('dragging');
                startX = e.clientX - translateX;
                startY = e.clientY - translateY;
            }
        });
        
        document.addEventListener('mousemove', (e) => {
            if (isDragging) {
                translateX = e.clientX - startX;
                translateY = e.clientY - startY;
                img.style.transform = `scale(${scale}) translate(${translateX}px, ${translateY}px)`;
            }
        });
        
        document.addEventListener('mouseup', () => {
            isDragging = false;
            img.classList.remove('dragging');
        });
        
        // Molette souris pour zoom
        this.modal.addEventListener('wheel', (e) => {
            if (this.modal.classList.contains('active')) {
                e.preventDefault();
                if (e.deltaY < 0) {
                    // Scroll up = zoom in
                    scale = Math.min(scale + 0.2, 5);
                } else {
                    // Scroll down = zoom out
                    scale = Math.max(scale - 0.2, 1);
                    if (scale === 1) {
                        translateX = 0;
                        translateY = 0;
                    }
                }
                img.style.transform = `scale(${scale}) translate(${translateX}px, ${translateY}px)`;
            }
        });
    }
    
    /**
     * Ouvrir le modal
     */
    openModal(src, alt = '') {
        const img = this.modal.querySelector('.zoom-modal-image');
        img.src = src;
        img.alt = alt;
        img.style.transform = 'scale(1) translate(0, 0)';
        
        this.modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    
    /**
     * Fermer le modal
     */
    closeModal() {
        this.modal.classList.remove('active');
        document.body.style.overflow = '';
    }
    
    /**
     * Wrapper image dans container
     */
    wrapImageInContainer(img) {
        const container = document.createElement('div');
        container.className = 'zoom-container';
        img.parentNode.insertBefore(container, img);
        container.appendChild(img);
    }
    
    /**
     * Ajouter indicateur zoom
     */
    addZoomIndicator(img) {
        const container = img.closest('.zoom-container') || img.parentElement;
        
        // Vérifier si indicateur existe déjà
        if (container.querySelector('.zoom-indicator')) return;
        
        const indicator = document.createElement('div');
        indicator.className = 'zoom-indicator';
        indicator.innerHTML = '<i class="bi bi-zoom-in"></i> Cliquer pour agrandir';
        
        container.style.position = 'relative';
        container.appendChild(indicator);
    }
    
    /**
     * Gérer redimensionnement
     */
    handleResize() {
        // Recalculer positions si nécessaire
        if (this.isZooming) {
            this.isZooming = false;
            const lens = document.querySelector('.zoom-lens');
            const result = document.querySelector('.zoom-result');
            if (lens) lens.style.display = 'none';
            if (result) result.style.display = 'none';
        }
    }
    
    /**
     * Détecter mobile
     */
    isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }
}

// Initialisation automatique au chargement
document.addEventListener('DOMContentLoaded', () => {
    window.imageZoom = new ImageZoom({
        zoomLevel: 2.5,          // Niveau de zoom hover
        hoverZoom: true,         // Activer zoom survol
        clickZoom: true,         // Activer zoom clic
        modalZoom: true,         // Activer modal
        cursorSize: 150,         // Taille loupe
        transitionSpeed: 0.3     // Vitesse transitions
    });
});

/**
 * GALERIE DYNAMIQUE PRODUIT - QUARTIER D'ARÔMES
 * Affichage multi-images avec navigation miniatures + flèches
 * Compatible avec zoom interactif
 * 
 * Features:
 * - Navigation miniatures cliquables
 * - Flèches gauche/droite
 * - Keyboard navigation (←/→)
 * - Touch swipe (mobile)
 * - Auto-height
 * - Lazy loading
 * - Integration zoom
 * 
 * @version 1.0
 * @date 2025-11-05
 */

class ProductGallery {
    constructor(container, options = {}) {
        this.container = typeof container === 'string' 
            ? document.querySelector(container) 
            : container;
        
        if (!this.container) {
            console.error('ProductGallery: Container non trouvé');
            return;
        }
        
        this.options = {
            autoHeight: options.autoHeight !== false,
            loop: options.loop !== false,
            keyboard: options.keyboard !== false,
            touch: options.touch !== false,
            arrows: options.arrows !== false,
            thumbnails: options.thumbnails !== false,
            thumbnailsPerRow: options.thumbnailsPerRow || 4,
            transitionSpeed: options.transitionSpeed || 300,
            lazyLoad: options.lazyLoad !== false,
            ...options
        };
        
        this.currentIndex = 0;
        this.images = [];
        this.thumbnails = [];
        this.mainImage = null;
        this.touchStartX = 0;
        this.touchEndX = 0;
        
        this.init();
    }
    
    /**
     * Initialisation
     */
    init() {
        this.collectImages();
        if (this.images.length > 0) {
            this.buildGallery();
            this.attachEvents();
            this.showImage(0);
        }
    }
    
    /**
     * Collecter les images
     */
    collectImages() {
        const imageElements = this.container.querySelectorAll('[data-gallery-image]');
        
        this.images = Array.from(imageElements).map((img, index) => ({
            src: img.dataset.gallerySrc || img.src,
            alt: img.alt || `Image ${index + 1}`,
            thumb: img.dataset.galleryThumb || img.dataset.gallerySrc || img.src,
            element: img
        }));
    }
    
    /**
     * Construire la galerie
     */
    buildGallery() {
        this.container.innerHTML = '';
        this.container.classList.add('product-gallery');
        
        // Container principal
        const mainContainer = document.createElement('div');
        mainContainer.className = 'gallery-main-container';
        
        // Image principale
        const mainImageWrapper = document.createElement('div');
        mainImageWrapper.className = 'gallery-main-image';
        
        this.mainImage = document.createElement('img');
        this.mainImage.className = 'img-fluid rounded shadow border-gold product-image-main zoomable';
        this.mainImage.alt = this.images[0].alt;
        
        mainImageWrapper.appendChild(this.mainImage);
        
        // Flèches navigation (si plus d'1 image)
        if (this.images.length > 1 && this.options.arrows) {
            const prevArrow = this.createArrow('prev');
            const nextArrow = this.createArrow('next');
            mainImageWrapper.appendChild(prevArrow);
            mainImageWrapper.appendChild(nextArrow);
        }
        
        mainContainer.appendChild(mainImageWrapper);
        this.container.appendChild(mainContainer);
        
        // Miniatures (si plus d'1 image)
        if (this.images.length > 1 && this.options.thumbnails) {
            const thumbsContainer = this.createThumbnails();
            this.container.appendChild(thumbsContainer);
        }
        
        // Compteur
        if (this.images.length > 1) {
            const counter = this.createCounter();
            mainImageWrapper.appendChild(counter);
        }
        
        // Ajouter styles
        this.addStyles();
    }
    
    /**
     * Créer flèche navigation
     */
    createArrow(direction) {
        const arrow = document.createElement('button');
        arrow.className = `gallery-arrow gallery-arrow-${direction}`;
        arrow.setAttribute('aria-label', direction === 'prev' ? 'Image précédente' : 'Image suivante');
        arrow.innerHTML = `<i class="bi bi-chevron-${direction === 'prev' ? 'left' : 'right'}"></i>`;
        
        arrow.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            direction === 'prev' ? this.prev() : this.next();
        });
        
        return arrow;
    }
    
    /**
     * Créer miniatures
     */
    createThumbnails() {
        const container = document.createElement('div');
        container.className = 'gallery-thumbnails';
        
        const wrapper = document.createElement('div');
        wrapper.className = 'gallery-thumbnails-wrapper';
        
        this.images.forEach((image, index) => {
            const thumb = document.createElement('div');
            thumb.className = 'gallery-thumbnail';
            thumb.dataset.index = index;
            
            const img = document.createElement('img');
            
            if (this.options.lazyLoad && index > 0) {
                img.dataset.src = image.thumb;
                img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect fill="%23f0f0f0" width="100" height="100"/%3E%3C/svg%3E';
            } else {
                img.src = image.thumb;
            }
            
            img.alt = image.alt;
            
            thumb.appendChild(img);
            
            thumb.addEventListener('click', () => {
                this.showImage(index);
            });
            
            this.thumbnails.push(thumb);
            wrapper.appendChild(thumb);
        });
        
        container.appendChild(wrapper);
        return container;
    }
    
    /**
     * Créer compteur
     */
    createCounter() {
        const counter = document.createElement('div');
        counter.className = 'gallery-counter';
        counter.innerHTML = `<span class="current">1</span> / <span class="total">${this.images.length}</span>`;
        return counter;
    }
    
    /**
     * Afficher image
     */
    showImage(index) {
        if (index < 0 || index >= this.images.length) return;
        
        this.currentIndex = index;
        const image = this.images[index];
        
        // Fade out
        this.mainImage.style.opacity = '0';
        
        setTimeout(() => {
            // Charger nouvelle image
            this.mainImage.src = image.src;
            this.mainImage.alt = image.alt;
            
            // Lazy load miniatures visibles
            if (this.options.lazyLoad) {
                this.lazyLoadThumbnails();
            }
            
            // Fade in
            this.mainImage.style.opacity = '1';
            
            // Mettre à jour miniatures
            this.updateThumbnails();
            
            // Mettre à jour compteur
            this.updateCounter();
            
            // Réinitialiser zoom si présent
            if (window.imageZoom) {
                window.imageZoom.initZoomImages();
            }
        }, this.options.transitionSpeed / 2);
    }
    
    /**
     * Mettre à jour miniatures actives
     */
    updateThumbnails() {
        this.thumbnails.forEach((thumb, index) => {
            if (index === this.currentIndex) {
                thumb.classList.add('active');
            } else {
                thumb.classList.remove('active');
            }
        });
    }
    
    /**
     * Mettre à jour compteur
     */
    updateCounter() {
        const counter = this.container.querySelector('.gallery-counter .current');
        if (counter) {
            counter.textContent = this.currentIndex + 1;
        }
    }
    
    /**
     * Lazy load miniatures
     */
    lazyLoadThumbnails() {
        const range = 2; // Charger 2 miniatures avant/après
        const start = Math.max(0, this.currentIndex - range);
        const end = Math.min(this.images.length - 1, this.currentIndex + range);
        
        for (let i = start; i <= end; i++) {
            const thumb = this.thumbnails[i];
            if (thumb) {
                const img = thumb.querySelector('img');
                if (img && img.dataset.src) {
                    img.src = img.dataset.src;
                    delete img.dataset.src;
                }
            }
        }
    }
    
    /**
     * Image suivante
     */
    next() {
        let nextIndex = this.currentIndex + 1;
        if (nextIndex >= this.images.length) {
            nextIndex = this.options.loop ? 0 : this.images.length - 1;
        }
        this.showImage(nextIndex);
    }
    
    /**
     * Image précédente
     */
    prev() {
        let prevIndex = this.currentIndex - 1;
        if (prevIndex < 0) {
            prevIndex = this.options.loop ? this.images.length - 1 : 0;
        }
        this.showImage(prevIndex);
    }
    
    /**
     * Attacher events
     */
    attachEvents() {
        // Keyboard navigation
        if (this.options.keyboard) {
            document.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowLeft') this.prev();
                if (e.key === 'ArrowRight') this.next();
            });
        }
        
        // Touch swipe (mobile)
        if (this.options.touch) {
            const mainImage = this.container.querySelector('.gallery-main-image');
            
            mainImage.addEventListener('touchstart', (e) => {
                this.touchStartX = e.changedTouches[0].screenX;
            }, { passive: true });
            
            mainImage.addEventListener('touchend', (e) => {
                this.touchEndX = e.changedTouches[0].screenX;
                this.handleSwipe();
            }, { passive: true });
        }
    }
    
    /**
     * Gérer swipe
     */
    handleSwipe() {
        const threshold = 50; // pixels
        const diff = this.touchStartX - this.touchEndX;
        
        if (Math.abs(diff) > threshold) {
            if (diff > 0) {
                this.next(); // Swipe left
            } else {
                this.prev(); // Swipe right
            }
        }
    }
    
    /**
     * Ajouter styles CSS
     */
    addStyles() {
        if (document.getElementById('product-gallery-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'product-gallery-styles';
        style.textContent = `
            .product-gallery {
                width: 100%;
            }
            
            .gallery-main-container {
                position: relative;
                margin-bottom: 1rem;
            }
            
            .gallery-main-image {
                position: relative;
                width: 100%;
                overflow: hidden;
                border-radius: 10px;
            }
            
            .gallery-main-image img {
                width: 100%;
                height: auto;
                display: block;
                transition: opacity 0.3s ease;
            }
            
            .gallery-arrow {
                position: absolute;
                top: 50%;
                transform: translateY(-50%);
                width: 50px;
                height: 50px;
                background: rgba(255, 255, 255, 0.9);
                border: none;
                border-radius: 50%;
                color: #C4942F;
                font-size: 24px;
                cursor: pointer;
                z-index: 10;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
            }
            
            .gallery-arrow:hover {
                background: #C4942F;
                color: white;
                transform: translateY(-50%) scale(1.1);
            }
            
            .gallery-arrow-prev {
                left: 15px;
            }
            
            .gallery-arrow-next {
                right: 15px;
            }
            
            .gallery-counter {
                position: absolute;
                bottom: 15px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(196, 148, 47, 0.95);
                color: white;
                padding: 8px 16px;
                border-radius: 25px;
                font-size: 14px;
                font-weight: 600;
                z-index: 10;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
            }
            
            .gallery-counter .current {
                color: white;
                font-weight: 700;
            }
            
            .gallery-thumbnails {
                width: 100%;
                margin-top: 1rem;
            }
            
            .gallery-thumbnails-wrapper {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
                gap: 10px;
            }
            
            .gallery-thumbnail {
                position: relative;
                aspect-ratio: 1;
                overflow: hidden;
                border-radius: 8px;
                cursor: pointer;
                border: 3px solid transparent;
                transition: all 0.2s ease;
            }
            
            .gallery-thumbnail img {
                width: 100%;
                height: 100%;
                object-fit: cover;
                transition: transform 0.2s ease;
            }
            
            .gallery-thumbnail:hover {
                border-color: rgba(196, 148, 47, 0.5);
            }
            
            .gallery-thumbnail:hover img {
                transform: scale(1.1);
            }
            
            .gallery-thumbnail.active {
                border-color: #C4942F;
                box-shadow: 0 0 0 2px rgba(196, 148, 47, 0.2);
            }
            
            /* Responsive */
            @media (max-width: 768px) {
                .gallery-arrow {
                    width: 40px;
                    height: 40px;
                    font-size: 20px;
                }
                
                .gallery-arrow-prev {
                    left: 10px;
                }
                
                .gallery-arrow-next {
                    right: 10px;
                }
                
                .gallery-counter {
                    bottom: 10px;
                    font-size: 12px;
                    padding: 6px 12px;
                }
                
                .gallery-thumbnails-wrapper {
                    grid-template-columns: repeat(4, 1fr);
                    gap: 8px;
                }
            }
            
            @media (max-width: 480px) {
                .gallery-thumbnails-wrapper {
                    grid-template-columns: repeat(3, 1fr);
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    /**
     * Détruire la galerie
     */
    destroy() {
        if (this.container) {
            this.container.innerHTML = '';
            this.container.classList.remove('product-gallery');
        }
    }
    
    /**
     * Aller à une image spécifique
     */
    goTo(index) {
        this.showImage(index);
    }
    
    /**
     * Obtenir index actuel
     */
    getCurrentIndex() {
        return this.currentIndex;
    }
    
    /**
     * Obtenir nombre d'images
     */
    getImagesCount() {
        return this.images.length;
    }
}

// Auto-initialisation
document.addEventListener('DOMContentLoaded', () => {
    const galleryContainer = document.querySelector('[data-product-gallery]');
    
    if (galleryContainer) {
        window.productGallery = new ProductGallery(galleryContainer, {
            autoHeight: true,
            loop: true,
            keyboard: true,
            touch: true,
            arrows: true,
            thumbnails: true,
            thumbnailsPerRow: 4,
            transitionSpeed: 300,
            lazyLoad: true
        });
    }
});

// Export pour utilisation module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProductGallery;
}

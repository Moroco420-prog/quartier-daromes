// Carousel pour Best Sellers et Nouveautés
// Quartier d'Arômes - Product Carousels

document.addEventListener('DOMContentLoaded', function() {
    
    // Initialiser les carrousels Bootstrap si disponibles
    const carousels = document.querySelectorAll('.carousel');
    carousels.forEach(carousel => {
        new bootstrap.Carousel(carousel, {
            interval: 3000,
            wrap: true,
            touch: true
        });
    });
    
    // Carrousel personnalisé avec défilement horizontal pour mobile
    const productSliders = document.querySelectorAll('.product-slider');
    
    productSliders.forEach(slider => {
        let isDown = false;
        let startX;
        let scrollLeft;
        
        // Gestion du scroll horizontal sur mobile
        slider.addEventListener('touchstart', (e) => {
            isDown = true;
            startX = e.touches[0].pageX - slider.offsetLeft;
            scrollLeft = slider.scrollLeft;
        });
        
        slider.addEventListener('touchend', () => {
            isDown = false;
        });
        
        slider.addEventListener('touchmove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.touches[0].pageX - slider.offsetLeft;
            const walk = (x - startX) * 2;
            slider.scrollLeft = scrollLeft - walk;
        });
        
        // Gestion du scroll horizontal avec la souris
        slider.addEventListener('mousedown', (e) => {
            isDown = true;
            slider.classList.add('active');
            startX = e.pageX - slider.offsetLeft;
            scrollLeft = slider.scrollLeft;
        });
        
        slider.addEventListener('mouseleave', () => {
            isDown = false;
            slider.classList.remove('active');
        });
        
        slider.addEventListener('mouseup', () => {
            isDown = false;
            slider.classList.remove('active');
        });
        
        slider.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - slider.offsetLeft;
            const walk = (x - startX) * 2;
            slider.scrollLeft = scrollLeft - walk;
        });
    });
    
    // Navigation avec boutons pour les carrousels
    const prevButtons = document.querySelectorAll('.carousel-prev');
    const nextButtons = document.querySelectorAll('.carousel-next');
    
    prevButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const carouselId = this.dataset.carousel;
            const carousel = document.getElementById(carouselId);
            if (carousel) {
                carousel.scrollBy({
                    left: -300,
                    behavior: 'smooth'
                });
            }
        });
    });
    
    nextButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const carouselId = this.dataset.carousel;
            const carousel = document.getElementById(carouselId);
            if (carousel) {
                carousel.scrollBy({
                    left: 300,
                    behavior: 'smooth'
                });
            }
        });
    });
});

// Auto-scroll pour les carrousels (optionnel)
function autoScrollCarousel(carouselId, interval = 5000) {
    const carousel = document.getElementById(carouselId);
    if (!carousel) return;
    
    setInterval(() => {
        const scrollWidth = carousel.scrollWidth;
        const clientWidth = carousel.clientWidth;
        const currentScroll = carousel.scrollLeft;
        
        if (currentScroll + clientWidth >= scrollWidth - 10) {
            // Retour au début
            carousel.scrollTo({
                left: 0,
                behavior: 'smooth'
            });
        } else {
            // Scroll vers la droite
            carousel.scrollBy({
                left: clientWidth,
                behavior: 'smooth'
            });
        }
    }, interval);
}

// Advanced Animations and Interactive Effects for Quartier d'Arômes

document.addEventListener('DOMContentLoaded', function() {
    
    // ========== ANIMATIONS AU SCROLL ==========
    initScrollAnimations();
    
    // ========== PRELOADER (seulement au premier chargement) ==========
    // Vérifier si c'est un vrai chargement de page (pas une navigation interne)
    const isPageLoad = performance.navigation.type === performance.navigation.TYPE_RELOAD || 
                       performance.navigation.type === performance.navigation.TYPE_NAVIGATE;
    
    // Vérifier si le preloader n'a pas déjà été affiché dans cette session
    const preloaderShown = sessionStorage.getItem('preloaderShown');
    
    if (isPageLoad && !preloaderShown) {
        const preloader = document.createElement('div');
        preloader.className = 'preloader';
        preloader.innerHTML = `
            <div class="preloader-inner">
                <div class="preloader-circle"></div>
                <div class="preloader-circle"></div>
                <div class="preloader-circle"></div>
            </div>
        `;
        document.body.appendChild(preloader);
        
        window.addEventListener('load', () => {
            setTimeout(() => {
                preloader.classList.add('hide');
                setTimeout(() => {
                    preloader.remove();
                    // Marquer comme affiché pour cette session
                    sessionStorage.setItem('preloaderShown', 'true');
                }, 500);
            }, 800);
        });
    }

    // ========== NAVBAR SCROLL EFFECTS ==========
    const navbar = document.querySelector('.navbar');
    let lastScroll = 0;
    
    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;
        
        // Add scrolled class
        if (currentScroll > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
        
        // Hide/show navbar on scroll
        if (currentScroll > lastScroll && currentScroll > 100) {
            navbar.style.transform = 'translateY(-100%)';
        } else {
            navbar.style.transform = 'translateY(0)';
        }
        
        lastScroll = currentScroll;
    });

    // ========== INTERSECTION OBSERVER FOR ANIMATIONS ==========
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
                
                // Add stagger effect for children
                const children = entry.target.querySelectorAll('.stagger-item');
                children.forEach((child, index) => {
                    setTimeout(() => {
                        child.classList.add('animate-in');
                    }, index * 100);
                });
            }
        });
    }, observerOptions);
    
    // Observe elements
    document.querySelectorAll('.fade-in-up, .fade-in-left, .fade-in-right, .zoom-in, .stagger-animation').forEach(el => {
        observer.observe(el);
    });

    // ========== PARALLAX EFFECT ==========
    const parallaxElements = document.querySelectorAll('.parallax');
    
    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        
        parallaxElements.forEach(element => {
            const speed = element.dataset.speed || 0.5;
            const yPos = -(scrolled * speed);
            element.style.transform = `translateY(${yPos}px)`;
        });
    });

    // ========== CURSOR EFFECTS ==========
    const cursor = document.createElement('div');
    cursor.className = 'custom-cursor';
    document.body.appendChild(cursor);
    
    const cursorFollower = document.createElement('div');
    cursorFollower.className = 'cursor-follower';
    document.body.appendChild(cursorFollower);
    
    let mouseX = 0, mouseY = 0;
    let cursorX = 0, cursorY = 0;
    
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });
    
    const animateCursor = () => {
        const distX = mouseX - cursorX;
        const distY = mouseY - cursorY;
        
        cursorX += distX * 0.1;
        cursorY += distY * 0.1;
        
        cursor.style.left = mouseX + 'px';
        cursor.style.top = mouseY + 'px';
        
        cursorFollower.style.left = cursorX + 'px';
        cursorFollower.style.top = cursorY + 'px';
        
        requestAnimationFrame(animateCursor);
    };
    animateCursor();
    
    // Cursor hover effects
    const hoverElements = document.querySelectorAll('a, button, .product-card, .category-card');
    hoverElements.forEach(element => {
        element.addEventListener('mouseenter', () => {
            cursor.classList.add('hover');
            cursorFollower.classList.add('hover');
        });
        
        element.addEventListener('mouseleave', () => {
            cursor.classList.remove('hover');
            cursorFollower.classList.remove('hover');
        });
    });

    // ========== SMOOTH COUNTER ANIMATION ==========
    const counters = document.querySelectorAll('.counter');
    
    counters.forEach(counter => {
        const updateCount = () => {
            const target = +counter.getAttribute('data-target');
            const count = +counter.innerText;
            const increment = target / 200;
            
            if (count < target) {
                counter.innerText = Math.ceil(count + increment);
                setTimeout(updateCount, 10);
            } else {
                counter.innerText = target;
            }
        };
        
        const counterObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    updateCount();
                    counterObserver.unobserve(entry.target);
                }
            });
        });
        
        counterObserver.observe(counter);
    });

    // ========== MAGNETIC BUTTONS ==========
    const magneticButtons = document.querySelectorAll('.btn');
    
    magneticButtons.forEach(button => {
        button.addEventListener('mousemove', (e) => {
            const rect = button.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            
            button.style.transform = `translate(${x * 0.3}px, ${y * 0.3}px)`;
        });
        
        button.addEventListener('mouseleave', () => {
            button.style.transform = 'translate(0, 0)';
        });
    });

    // ========== TILT EFFECT FOR CARDS ==========
    const tiltCards = document.querySelectorAll('.product-card, .category-card');
    
    tiltCards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            const rotateX = (y - centerY) / 10;
            const rotateY = (centerX - x) / 10;
            
            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.05)`;
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale(1)';
        });
    });

    // ========== RIPPLE EFFECT ==========
    function createRipple(event) {
        const button = event.currentTarget;
        const ripple = document.createElement('span');
        const rect = button.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = event.clientX - rect.left - size / 2;
        const y = event.clientY - rect.top - size / 2;
        
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        ripple.classList.add('ripple');
        
        button.appendChild(ripple);
        
        setTimeout(() => ripple.remove(), 600);
    }
    
    document.querySelectorAll('.btn').forEach(button => {
        button.addEventListener('click', createRipple);
    });

    // ========== TEXT TYPING ANIMATION ==========
    const typingElements = document.querySelectorAll('.typing-text');
    
    typingElements.forEach(element => {
        const text = element.textContent;
        element.textContent = '';
        element.style.visibility = 'visible';
        
        let index = 0;
        const typeWriter = () => {
            if (index < text.length) {
                element.textContent += text.charAt(index);
                index++;
                setTimeout(typeWriter, 50);
            }
        };
        
        const typingObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    typeWriter();
                    typingObserver.unobserve(entry.target);
                }
            });
        });
        
        typingObserver.observe(element);
    });

    // ========== PARTICLE BACKGROUND ==========
    function createParticles() {
        const particlesContainer = document.createElement('div');
        particlesContainer.className = 'particles-container';
        document.querySelector('.hero-section')?.appendChild(particlesContainer);
        
        for (let i = 0; i < 50; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.left = Math.random() * 100 + '%';
            particle.style.animationDelay = Math.random() * 20 + 's';
            particle.style.animationDuration = (Math.random() * 20 + 10) + 's';
            particlesContainer.appendChild(particle);
        }
    }
    
    if (document.querySelector('.hero-section')) {
        createParticles();
    }

    // ========== SMOOTH REVEAL ON SCROLL ==========
    const revealElements = document.querySelectorAll('.reveal');
    
    const revealOnScroll = () => {
        revealElements.forEach(element => {
            const elementTop = element.getBoundingClientRect().top;
            const elementBottom = element.getBoundingClientRect().bottom;
            const windowHeight = window.innerHeight;
            
            if (elementTop < windowHeight - 100 && elementBottom > 0) {
                element.classList.add('revealed');
            }
        });
    };
    
    window.addEventListener('scroll', revealOnScroll);
    revealOnScroll();

    // ========== IMAGE LAZY LOADING WITH BLUR EFFECT ==========
    const lazyImages = document.querySelectorAll('img[data-src]');
    
    const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                const src = img.getAttribute('data-src');
                
                // Create low quality placeholder
                const placeholder = new Image();
                placeholder.src = src.replace(/\.jpg|\.png/, '-low.jpg');
                placeholder.onload = () => {
                    img.style.filter = 'blur(5px)';
                    img.src = placeholder.src;
                    
                    // Load high quality image
                    const highQuality = new Image();
                    highQuality.src = src;
                    highQuality.onload = () => {
                        img.src = src;
                        img.style.filter = 'none';
                        img.classList.add('loaded');
                    };
                };
                
                imageObserver.unobserve(img);
            }
        });
    });
    
    lazyImages.forEach(img => imageObserver.observe(img));

    // ========== CART ANIMATION ==========
    function animateAddToCart(button, productImage) {
        const cart = document.querySelector('.bi-cart3')?.parentElement;
        if (!cart) return;
        
        const imageClone = productImage.cloneNode();
        imageClone.style.position = 'fixed';
        imageClone.style.width = '50px';
        imageClone.style.height = '50px';
        imageClone.style.objectFit = 'cover';
        imageClone.style.borderRadius = '50%';
        imageClone.style.zIndex = '9999';
        imageClone.style.pointerEvents = 'none';
        
        const buttonRect = button.getBoundingClientRect();
        const cartRect = cart.getBoundingClientRect();
        
        imageClone.style.left = buttonRect.left + 'px';
        imageClone.style.top = buttonRect.top + 'px';
        
        document.body.appendChild(imageClone);
        
        // Animate to cart
        setTimeout(() => {
            imageClone.style.transition = 'all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            imageClone.style.left = cartRect.left + 'px';
            imageClone.style.top = cartRect.top + 'px';
            imageClone.style.transform = 'scale(0)';
            imageClone.style.opacity = '0';
        }, 10);
        
        // Remove clone and animate cart
        setTimeout(() => {
            imageClone.remove();
            cart.classList.add('bounce');
            setTimeout(() => cart.classList.remove('bounce'), 600);
        }, 800);
    }
    
    // Attach to add to cart buttons
    document.querySelectorAll('form[action*="add_to_cart"] button').forEach(button => {
        button.addEventListener('click', function(e) {
            const productCard = this.closest('.product-card');
            const productImage = productCard?.querySelector('img');
            if (productImage) {
                animateAddToCart(this, productImage);
            }
        });
    });

    // ========== SOUND EFFECTS (Optional) ==========
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    function playClickSound() {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
    }
    
    // Add click sound to buttons (optional - can be disabled)
    const soundEnabled = localStorage.getItem('soundEnabled') !== 'false';
    if (soundEnabled) {
        document.querySelectorAll('.btn').forEach(button => {
            button.addEventListener('click', () => {
                try {
                    playClickSound();
                } catch (e) {
                    // Silent fail if audio context is blocked
                }
            });
        });
    }
});

// ========== CSS STYLES FOR ANIMATIONS ==========
const animationStyles = document.createElement('style');
animationStyles.textContent = `
    /* Custom Cursor */
    .custom-cursor {
        width: 10px;
        height: 10px;
        background: var(--primary-color);
        border-radius: 50%;
        position: fixed;
        pointer-events: none;
        z-index: 10000;
        transition: transform 0.2s, background 0.2s;
        mix-blend-mode: difference;
    }
    
    .cursor-follower {
        width: 30px;
        height: 30px;
        border: 2px solid var(--primary-color);
        border-radius: 50%;
        position: fixed;
        pointer-events: none;
        z-index: 9999;
        transition: transform 0.3s, border-color 0.3s;
        opacity: 0.5;
    }
    
    .custom-cursor.hover {
        transform: scale(2);
        background: var(--primary-color-hover);
    }
    
    .cursor-follower.hover {
        transform: scale(1.5);
        border-color: var(--primary-color-hover);
    }
    
    /* Ripple Effect */
    .btn {
        position: relative;
        overflow: hidden;
    }
    
    .ripple {
        position: absolute;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.6);
        transform: scale(0);
        animation: ripple-animation 0.6s ease-out;
        pointer-events: none;
    }
    
    @keyframes ripple-animation {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
    
    /* Particles */
    .particles-container {
        position: absolute;
        width: 100%;
        height: 100%;
        overflow: hidden;
        top: 0;
        left: 0;
        pointer-events: none;
    }
    
    .particle {
        position: absolute;
        width: 4px;
        height: 4px;
        background: var(--primary-color);
        border-radius: 50%;
        opacity: 0.3;
        animation: float-particle linear infinite;
    }
    
    @keyframes float-particle {
        from {
            transform: translateY(100vh) rotate(0deg);
            opacity: 0;
        }
        10% {
            opacity: 0.3;
        }
        90% {
            opacity: 0.3;
        }
        to {
            transform: translateY(-100vh) rotate(360deg);
            opacity: 0;
        }
    }
    
    /* Bounce Animation */
    @keyframes bounce {
        0%, 100% { transform: scale(1); }
        25% { transform: scale(1.2); }
        50% { transform: scale(0.9); }
        75% { transform: scale(1.1); }
    }
    
    .bounce {
        animation: bounce 0.6s ease;
    }
    
    /* Reveal Animation */
    .reveal {
        opacity: 0;
        transform: translateY(30px);
        transition: all 0.8s ease;
    }
    
    .reveal.revealed {
        opacity: 1;
        transform: translateY(0);
    }
    
    /* Animate In */
    .animate-in {
        animation: fadeInUp 0.8s ease forwards;
    }
    
    /* Hide cursor on mobile */
    @media (max-width: 768px) {
        .custom-cursor,
        .cursor-follower {
            display: none;
        }
    }
`;
document.head.appendChild(animationStyles);

// ========== FONCTION ANIMATIONS SCROLL (Intersection Observer) ==========
function initScrollAnimations() {
    // Configuration de l'observer
    const observerOptions = {
        threshold: 0.15,
        rootMargin: '0px 0px -100px 0px'
    };
    
    // Callback quand élément entre dans viewport
    const observerCallback = (entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                
                // Observer une seule fois puis détacher
                observer.unobserve(entry.target);
            }
        });
    };
    
    // Créer l'observer
    const observer = new IntersectionObserver(observerCallback, observerOptions);
    
    // Observer tous les éléments avec classes d'animation
    const animatedElements = document.querySelectorAll(
        '.fade-in-section, .slide-up, .slide-left, .slide-right, .scale-in'
    );
    
    animatedElements.forEach(element => {
        observer.observe(element);
    });
    
    // Ajouter classes automatiquement aux sections
    const sections = document.querySelectorAll('.section, section');
    sections.forEach((section, index) => {
        if (!section.classList.contains('fade-in-section')) {
            section.classList.add('fade-in-section');
            
            // Délai cascade pour sections multiples
            if (index > 0) {
                section.classList.add(`delay-${Math.min(index, 4) * 100}`);
            }
            
            observer.observe(section);
        }
    });
    
    // Ajouter animations aux cartes produits
    const productCards = document.querySelectorAll('.product-card, .card-luxury');
    productCards.forEach((card, index) => {
        if (!card.classList.contains('scale-in')) {
            card.classList.add('scale-in');
            
            // Délai cascade
            const delay = (index % 4) * 100;
            if (delay > 0) {
                card.classList.add(`delay-${delay}`);
            }
            
            observer.observe(card);
        }
    });
}

// ========== ANIMATIONS PULSE SUR BOUTONS CTA ==========
document.addEventListener('DOMContentLoaded', function() {
    // Ajouter pulse aux boutons principaux
    const ctaButtons = document.querySelectorAll(
        '.btn-gold, .btn-primary-gold, [href*="checkout"], [href*="collections"]'
    );
    
    ctaButtons.forEach(button => {
        if (!button.classList.contains('btn-pulse')) {
            button.classList.add('btn-pulse');
        }
    });
    
    // Pulse permanent sur boutons "Acheter maintenant"
    const buyButtons = document.querySelectorAll('[href*="checkout"], .btn-checkout');
    buyButtons.forEach(button => {
        if (!button.classList.contains('btn-pulse-always')) {
            button.classList.add('btn-pulse-always');
        }
    });
});

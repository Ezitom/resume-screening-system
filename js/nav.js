/* nav.js - EBEN Mobile Navigation */

const ebenNav = {
    init() {
        const hamburger = document.querySelector('.eben-hamburger');
        const drawer = document.querySelector('.eben-nav-drawer');
        const overlay = document.querySelector('.eben-nav-overlay');

        if (hamburger && drawer && overlay) {
            hamburger.addEventListener('click', () => this.toggle(true));
            overlay.addEventListener('click', () => this.toggle(false));
            
            // Close on link click
            drawer.querySelectorAll('a').forEach(link => {
                link.addEventListener('click', () => this.toggle(false));
            });
        }

        // Recruiter name and logout are now handled by auth.js + per-page scripts
    },

    toggle(isOpen) {
        const drawer = document.querySelector('.eben-nav-drawer');
        const overlay = document.querySelector('.eben-nav-overlay');
        
        if (isOpen) {
            drawer.classList.add('active');
            overlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        } else {
            drawer.classList.remove('active');
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    ebenNav.init();
});

window.ebenNav = ebenNav;

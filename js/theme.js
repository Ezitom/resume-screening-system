/* theme.js - EBEN Theme Management */

const ebenTheme = {
    init() {
        const toggles = document.querySelectorAll('.eben-theme-toggle');
        toggles.forEach(btn => {
            btn.addEventListener('click', () => this.toggle());
        });
        this.updateIcon();
        this.updateYear();
    },

    toggle() {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('eben-theme', newTheme);
        
        this.updateIcon();
        
        // Hook for Chart.js re-rendering
        if (window.reRenderCharts && typeof window.reRenderCharts === 'function') {
            window.reRenderCharts();
        }
    },

    updateIcon() {
        const toggles = document.querySelectorAll('.eben-theme-toggle');
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        
        const sunIcon = `<svg class="eben-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <circle cx="12" cy="12" r="5"/>
  <line x1="12" y1="1" x2="12" y2="3"/>
  <line x1="12" y1="21" x2="12" y2="23"/>
  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
  <line x1="1" y1="12" x2="3" y2="12"/>
  <line x1="21" y1="12" x2="23" y2="12"/>
  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
</svg>`;

        const moonIcon = `<svg class="eben-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
</svg>`;

        toggles.forEach(btn => {
            if (currentTheme === 'light') {
                btn.innerHTML = moonIcon;
                btn.title = 'Switch to Dark Mode';
            } else {
                btn.innerHTML = sunIcon;
                btn.title = 'Switch to Light Mode';
            }
        });
    },

    updateYear() {
        document.querySelectorAll('.eben-footer-year').forEach(function(el) {
            el.textContent = new Date().getFullYear();
        });
    }
};

// Initialize theme logic when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    ebenTheme.init();
});

window.ebenTheme = ebenTheme;

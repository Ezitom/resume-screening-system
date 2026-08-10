/* nav.js - EBEN Mobile Navigation */

const ebenNav = {
    init() {
        const hamburger = document.querySelector('.eben-hamburger');
        const drawer = document.querySelector('.eben-nav-drawer');
        const overlay = document.querySelector('.eben-nav-overlay');

        if (!drawer) return;

        // Ensure drawer header with close button exists
        if (!drawer.querySelector('.eben-drawer-header')) {
            const header = document.createElement('div');
            header.className = 'eben-drawer-header';
            header.innerHTML = `
                <a href="/" class="eben-logo" style="font-size: 1.2rem;">
                    <span class="eben-logo-bar"></span>EBEN
                </a>
                <button class="eben-drawer-close" aria-label="Close Menu">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            `;
            drawer.insertBefore(header, drawer.firstChild);
        }

        const closeBtn = drawer.querySelector('.eben-drawer-close');

        if (hamburger) {
            hamburger.setAttribute('aria-expanded', 'false');
            hamburger.addEventListener('click', () => this.toggle(true));
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.toggle(false));
        }

        if (overlay) {
            overlay.addEventListener('click', () => this.toggle(false));
        }

        // Close on link click
        drawer.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => this.toggle(false));
        });

        // Close on Escape key press
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && drawer.classList.contains('active')) {
                this.toggle(false);
            }
        });

        // Sync recruiter info into drawer if on recruiter pages
        this.syncRecruiterDrawer();
    },

    syncRecruiterDrawer() {
        const drawer = document.querySelector('.eben-nav-drawer');
        const recruiterNameEl = document.getElementById('nav-recruiter-name');
        
        if (drawer && recruiterNameEl && !drawer.querySelector('.eben-nav-drawer-user')) {
            const name = recruiterNameEl.textContent || 'Recruiter';
            const userBox = document.createElement('div');
            userBox.className = 'eben-nav-drawer-user';
            userBox.innerHTML = `
                <span class="eben-nav-drawer-user-label">Signed in as</span>
                <span class="eben-nav-drawer-user-name" id="drawer-recruiter-name">${name}</span>
            `;
            
            // Insert user box after header
            const header = drawer.querySelector('.eben-drawer-header');
            if (header && header.nextSibling) {
                drawer.insertBefore(userBox, header.nextSibling);
            } else {
                drawer.appendChild(userBox);
            }

            // Check if Invite Recruiter button exists on page and add a drawer version if on dashboard
            const inviteBtn = document.getElementById('invite-recruiter-btn');
            if (inviteBtn && !drawer.querySelector('#drawer-invite-btn')) {
                const drawerInvite = document.createElement('button');
                drawerInvite.id = 'drawer-invite-btn';
                drawerInvite.className = 'eben-btn eben-btn-primary eben-btn-full';
                drawerInvite.style.marginTop = '8px';
                drawerInvite.innerHTML = '+ Invite Recruiter';
                drawerInvite.addEventListener('click', () => {
                    this.toggle(false);
                    if (typeof openInviteModal === 'function') openInviteModal();
                });
                drawer.appendChild(drawerInvite);
            }
        }
    },

    toggle(isOpen) {
        const hamburger = document.querySelector('.eben-hamburger');
        const drawer = document.querySelector('.eben-nav-drawer');
        const overlay = document.querySelector('.eben-nav-overlay');
        
        if (!drawer || !overlay) return;

        if (isOpen) {
            drawer.classList.add('active');
            overlay.classList.add('active');
            document.body.style.overflow = 'hidden';
            if (hamburger) hamburger.setAttribute('aria-expanded', 'true');
        } else {
            drawer.classList.remove('active');
            overlay.classList.remove('active');
            document.body.style.overflow = '';
            if (hamburger) hamburger.setAttribute('aria-expanded', 'false');
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    ebenNav.init();
});

window.ebenNav = ebenNav;


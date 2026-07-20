/* login.js */

const ebenLogin = {
    init() {
        const toggleBtn = document.getElementById('togglePassword');
        const passwordInput = document.getElementById('loginPassword');
        const signInBtn = document.getElementById('signInBtn');

        if (toggleBtn && passwordInput) {
            toggleBtn.addEventListener('click', () => {
                const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
                passwordInput.setAttribute('type', type);
                this.updateEyeIcon(toggleBtn, type === 'text');
            });
        }

        if (signInBtn) {
            signInBtn.addEventListener('click', () => {
                let valid = true;

                const email = document.getElementById('loginEmail').value.trim();
                const password = document.getElementById('loginPassword').value;

                document.querySelectorAll('.eben-field-error').forEach(el => el.textContent = '');

                if (!email) {
                    document.getElementById('emailError').textContent = 'Email is required.';
                    valid = false;
                }

                if (!password) {
                    document.getElementById('passwordError').textContent = 'Password is required.';
                    valid = false;
                }

                if (!valid) return;

                const accounts = JSON.parse(localStorage.getItem('eben-accounts') || '[]');
                const match = accounts.find(acc => acc.email === email && acc.passwordHash === btoa(password));

                if (!match) {
                    document.getElementById('passwordError').textContent = 'Incorrect email or password.';
                    return;
                }

                const btn = document.getElementById('signInBtn');
                btn.textContent = 'Signing in...';
                btn.disabled = true;

                // Save session
                localStorage.setItem('eben-session', JSON.stringify({
                    id: match.id,
                    name: match.name,
                    email: match.email,
                    loggedIn: true
                }));

                setTimeout(function() {
                    window.location.href = 'dashboard.html';
                }, 800);
            });
        }
    },

    updateEyeIcon(btn, isVisible) {
        const eyeOpen = `<svg class="eben-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
  <circle cx="12" cy="12" r="3"/>
</svg>`;

        const eyeClosed = `<svg class="eben-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
  <line x1="1" y1="1" x2="23" y2="23"/>
</svg>`;

        btn.innerHTML = isVisible ? eyeOpen : eyeClosed;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    ebenLogin.init();
});

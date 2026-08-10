// signup.js

// Password strength checker
function ebenCheckStrength(password) {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['', 'var(--eben-danger)', 'var(--eben-warning)', 'var(--eben-info)', 'var(--eben-success)'];
  return { score, label: labels[score], color: colors[score] };
}

// Password visibility toggle
function initPasswordToggle() {
    const toggles = [
        { btn: 'togglePassword', input: 'signupPassword' },
        { btn: 'toggleConfirm', input: 'signupConfirm' }
    ];

    toggles.forEach(t => {
        const btn = document.getElementById(t.btn);
        const input = document.getElementById(t.input);
        if (btn && input) {
            btn.addEventListener('click', () => {
                const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
                input.setAttribute('type', type);
                
                // Update icon
                const isVisible = type === 'text';
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
            });
        }
    });
}

// Live strength indicator
document.getElementById('signupPassword').addEventListener('input', function() {
  const result = ebenCheckStrength(this.value);
  const fill = document.getElementById('strengthFill');
  const label = document.getElementById('strengthLabel');
  fill.style.width = (result.score / 4 * 100) + '%';
  fill.style.background = result.color;
  label.textContent = result.label;
  label.style.color = result.color;
});

// Form validation and submission
document.getElementById('signupBtn').addEventListener('click', function() {
  let valid = true;

  const name = document.getElementById('signupName').value.trim();
  const email = document.getElementById('signupEmail').value.trim();
  const password = document.getElementById('signupPassword').value;
  const confirm = document.getElementById('signupConfirm').value;

  // Clear previous errors
  document.querySelectorAll('.eben-field-error').forEach(el => el.textContent = '');

  if (!name) {
    document.getElementById('nameError').textContent = 'Full name is required.';
    valid = false;
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    document.getElementById('emailError').textContent = 'Please enter a valid email address.';
    valid = false;
  }

  if (password.length < 8) {
    document.getElementById('passwordError').textContent = 'Password must be at least 8 characters.';
    valid = false;
  }

  if (password !== confirm) {
    document.getElementById('confirmError').textContent = 'Passwords do not match.';
    valid = false;
  }

  if (!valid) return;

  // Check if email already registered
  const existingAccounts = JSON.parse(localStorage.getItem('eben-accounts') || '[]');
  if (existingAccounts.find(acc => acc.email === email)) {
    document.getElementById('emailError').textContent = 'An account with this email already exists.';
    return;
  }

  // Save account — hash password minimally for frontend (NOT production-secure)
  const newAccount = {
    id: 'recruiter-' + Date.now(),
    name: name,
    email: email,
    passwordHash: btoa(password), // base64 encode — frontend only, not production secure
    createdAt: new Date().toISOString()
  };

  existingAccounts.push(newAccount);
  localStorage.setItem('eben-accounts', JSON.stringify(existingAccounts));

  // Button loading state
  const btn = document.getElementById('signupBtn');
  btn.textContent = 'Creating account...';
  btn.disabled = true;

  setTimeout(function() {
    // Auto-login after signup
    localStorage.setItem('eben-session', JSON.stringify({
      id: newAccount.id,
      name: newAccount.name,
      email: newAccount.email,
      loggedIn: true
    }));
    window.location.href = 'dashboard';
  }, 1000);
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initPasswordToggle();
});

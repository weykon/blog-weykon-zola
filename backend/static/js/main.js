// Main JavaScript file

console.log('Weykon Blog - Powered by Rust & Axum');

// Add smooth scrolling
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth'
            });
        }
    });
});

// User authentication status
async function checkAuthStatus() {
    try {
        // Get base path from the page (it's defined in templates)
        const basePath = window.basePath || '';
        const response = await fetch(`${basePath}/api/user/me`);
        const data = await response.json();

        if (data.authenticated && data.user) {
            // User is logged in
            updateUserUI(data.user);
        } else {
            // User is not logged in
            showLoginButton();
        }
    } catch (error) {
        console.error('Failed to check auth status:', error);
        showLoginButton();
    }
}

function updateUserUI(user) {
    // Hide login button
    const loginNavItem = document.getElementById('login-nav-item');
    if (loginNavItem) {
        loginNavItem.style.display = 'none';
    }

    // Show user menu
    const userMenu = document.getElementById('user-menu');
    if (userMenu) {
        userMenu.style.display = 'block';
    }

    // Set user avatar
    const userAvatar = document.getElementById('user-avatar');
    if (userAvatar && user.picture) {
        userAvatar.src = user.picture;
        userAvatar.alt = user.username;
    } else if (userAvatar) {
        // Use default avatar if no picture
        userAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=667eea&color=fff`;
    }

    // Set user name
    const userName = document.getElementById('user-name');
    if (userName) {
        userName.textContent = user.username;
    }

    // Set dropdown info
    const dropdownName = document.getElementById('dropdown-name');
    if (dropdownName) {
        dropdownName.textContent = user.username;
    }

    const dropdownEmail = document.getElementById('dropdown-email');
    if (dropdownEmail) {
        dropdownEmail.textContent = user.email;
    }

    // Add dropdown toggle functionality
    const userMenuButton = document.getElementById('user-menu-button');
    const userDropdown = document.getElementById('user-dropdown');

    if (userMenuButton && userDropdown) {
        userMenuButton.addEventListener('click', (e) => {
            e.stopPropagation();
            userDropdown.style.display = userDropdown.style.display === 'none' ? 'block' : 'none';
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!userMenu.contains(e.target)) {
                userDropdown.style.display = 'none';
            }
        });

        // Add hover effect to logout button
        const logoutLink = userDropdown.querySelector('a[href*="logout"]');
        if (logoutLink) {
            logoutLink.addEventListener('mouseenter', () => {
                logoutLink.style.background = '#fee2e2';
            });
            logoutLink.addEventListener('mouseleave', () => {
                logoutLink.style.background = 'transparent';
            });
        }
    }
}

function showLoginButton() {
    // Show login button
    const loginNavItem = document.getElementById('login-nav-item');
    if (loginNavItem) {
        loginNavItem.style.display = 'block';
    }

    // Hide user menu
    const userMenu = document.getElementById('user-menu');
    if (userMenu) {
        userMenu.style.display = 'none';
    }
}

// Check auth status on page load
document.addEventListener('DOMContentLoaded', () => {
    checkAuthStatus();
});

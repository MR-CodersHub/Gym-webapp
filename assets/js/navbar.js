/**
 * Navbar Toggle Logic
 * Handles hamburger menu toggling, outside clicks, and accessibility.
 */

document.addEventListener('DOMContentLoaded', () => {
    const mobileBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileLinks = mobileMenu ? mobileMenu.querySelectorAll('a') : [];
    const iconOpen = document.getElementById('icon-open');
    const iconClose = document.getElementById('icon-close');

    if (!mobileBtn || !mobileMenu) return;

    // Toggle menu state
    function toggleMenu() {
        const isHidden = mobileMenu.classList.contains('hidden');

        if (isHidden) {
            // Open Menu
            mobileMenu.classList.remove('hidden');
            // Small delay to allow display:block to apply before opacity transition
            setTimeout(() => {
                mobileMenu.classList.remove('opacity-0', '-translate-y-5');
                mobileMenu.classList.add('opacity-100', 'translate-y-0');
            }, 10);

            // Switch Icons
            if (iconOpen) iconOpen.classList.add('hidden');
            if (iconClose) iconClose.classList.remove('hidden');

            mobileBtn.setAttribute('aria-expanded', 'true');
        } else {
            // Close Menu
            mobileMenu.classList.remove('opacity-100', 'translate-y-0');
            mobileMenu.classList.add('opacity-0', '-translate-y-5');

            // Wait for transition to finish before hiding
            setTimeout(() => {
                mobileMenu.classList.add('hidden');
            }, 300); // Matches transition duration

            // Switch Icons
            if (iconOpen) iconOpen.classList.remove('hidden');
            if (iconClose) iconClose.classList.add('hidden');

            mobileBtn.setAttribute('aria-expanded', 'false');
        }
    }

    // Event Listeners
    mobileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleMenu();
    });

    // Close when clicking a link
    mobileLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (!mobileMenu.classList.contains('hidden')) {
                toggleMenu();
            }
        });
    });

    // Close when clicking outside
    document.addEventListener('click', (e) => {
        if (!mobileMenu.classList.contains('hidden') && !mobileMenu.contains(e.target) && !mobileBtn.contains(e.target)) {
            toggleMenu();
        }
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !mobileMenu.classList.contains('hidden')) {
            toggleMenu();
        }
    });

    // Active link highlighting logic
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    const allNavLinks = document.querySelectorAll('nav a');

    allNavLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (!href) return;

        // Handle home page specifically (could be index.html or index.html#home or just /)
        const linkPath = href.split('#')[0];

        if (linkPath === currentPath || (currentPath === 'index.html' && linkPath === '')) {
            // Apply active styles - but avoid the 'Join Now' button which has its own bg
            if (!link.classList.contains('bg-primaryRed')) {
                link.classList.add('text-primaryRed');
                link.classList.add('after:content-[""]', 'after:absolute', 'after:-bottom-1', 'after:left-0', 'after:w-full', 'after:h-0.5', 'after:bg-primaryRed', 'relative');
            }
        }
    });
});

/**
 * auth.js
 * Handles Navbar Auth State & Logout using Firebase
 */
import { auth, db, onAuthStateChanged, signOut, doc, getDoc } from './backend.js';

document.addEventListener('DOMContentLoaded', () => {
    const authContainer = document.getElementById('auth-container');
    const authDropdown = document.getElementById('auth-dropdown');
    const authIcon = document.getElementById('auth-icon');

    // Monitor Auth State
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            // User is signed in. Fetch role from Firestore.
            try {
                const docRef = doc(db, "users", user.uid);
                const docSnap = await getDoc(docRef);

                let role = 'user';
                let name = user.displayName || 'Member';

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    role = data.role || 'user';
                    name = data.name || name;
                }

                updateNavbar({ loggedIn: true, user: { name: name, role: role } });
            } catch (error) {
                console.error("Error fetching user profile:", error);
                // Fallback if firestore fails but auth is valid
                updateNavbar({ loggedIn: true, user: { name: user.displayName || 'Member', role: 'user' } });
            }
        } else {
            // User is signed out.
            updateNavbar({ loggedIn: false });
        }
    });

    // Update navbar based on login state
    function updateNavbar(data) {
        if (!authDropdown) return;

        authDropdown.innerHTML = `
            <li><a href="login.html" class="block px-4 py-3 hover:bg-primaryRed transition-colors font-bold text-[11px] uppercase tracking-widest mx-2 rounded">Login/Signup</a></li>
            <li><a href="admin_dashboard.html" class="block px-4 py-3 hover:bg-primaryRed transition-colors font-bold text-[11px] uppercase tracking-widest mx-2 rounded">Admin Dashboard</a></li>
            <li><a href="user_dashboard.html" class="block px-4 py-3 hover:bg-primaryRed transition-colors font-bold text-[11px] uppercase tracking-widest mx-2 rounded">User Dashboard</a></li>
        `;

        // Change icon style
        if (data.loggedIn && authIcon) {
            authIcon.classList.add('text-primaryRed');
        } else if (authIcon) {
            authIcon.classList.remove('text-primaryRed');
        }
    }

    // Handle logout
    async function handleLogout() {
        try {
            await signOut(auth);
            window.location.href = 'index.html';
        } catch (error) {
            console.error('Logout failed:', error);
        }
    }

    // Toggle dropdown
    if (authContainer) {
        authContainer.addEventListener('click', (e) => {
            e.stopPropagation();
            const isHidden = authDropdown.classList.contains('hidden');

            if (isHidden) {
                authDropdown.classList.remove('hidden');
                authDropdown.classList.add('flex', 'scale-100', 'opacity-100');
            } else {
                authDropdown.classList.add('hidden');
                authDropdown.classList.remove('flex', 'scale-100', 'opacity-100');
            }
        });
    }

    // Close on outside click
    document.addEventListener('click', (e) => {
        if (authDropdown && !authContainer.contains(e.target)) {
            authDropdown.classList.add('hidden');
            authDropdown.classList.remove('flex', 'scale-100', 'opacity-100');
        }
    });

});

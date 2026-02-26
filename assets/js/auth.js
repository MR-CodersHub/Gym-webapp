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

        if (data.loggedIn) {
            const role = data.user.role || 'user';
            authDropdown.innerHTML = `
                <div class="px-4 py-3 border-b border-white/5 mx-2 mb-2">
                    <p class="text-[10px] text-gray-500 font-black uppercase tracking-widest">Logged in as</p>
                    <p class="text-xs font-bold text-white truncate">${data.user.name}</p>
                </div>
                <li><a href="${role === 'admin' ? 'admin_dashboard.html' : 'user_dashboard.html'}" class="block px-4 py-2 hover:bg-primaryRed transition-colors font-bold text-[11px] uppercase tracking-widest mx-2 rounded">Dashboard</a></li>
                <li><a href="profile.html" class="block px-4 py-2 hover:bg-primaryRed transition-colors font-bold text-[11px] uppercase tracking-widest mx-2 rounded">Profile</a></li>
                <li><button id="logout-btn" class="w-[calc(100%-1rem)] text-left px-4 py-2 hover:bg-primaryRed transition-colors font-bold text-[11px] uppercase tracking-widest mx-2 rounded text-primaryRed hover:text-white border-t border-white/5 mt-2 pt-3">Logout</button></li>
            `;
            // Add logout listener
            document.getElementById('logout-btn').addEventListener('click', handleLogout);

            // Change icon to show user is logged in
            if (authIcon) {
                authIcon.classList.add('text-primaryRed');
            }
        } else {
            authDropdown.innerHTML = `
                <li><a href="login.html" class="block px-4 py-2 hover:bg-primaryRed transition-colors font-bold text-[11px] uppercase tracking-widest mx-2 rounded">Login</a></li>
                <li><a href="signup.html" class="block px-4 py-2 hover:bg-primaryRed transition-colors font-bold text-[11px] uppercase tracking-widest mx-2 rounded">Sign Up</a></li>
            `;
            if (authIcon) {
                authIcon.classList.remove('text-primaryRed');
            }
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
            authDropdown.classList.toggle('hidden');
            authDropdown.classList.toggle('scale-100');
            authDropdown.classList.toggle('opacity-100');
            authDropdown.classList.toggle('flex'); // Ensure it toggles flex/hidden correctly if styled that way
            if (authDropdown.classList.contains('hidden')) {
                authDropdown.classList.remove('flex');
            } else {
                authDropdown.classList.add('flex');
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

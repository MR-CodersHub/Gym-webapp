/**
 * profile.js
 * Handles Profile Management using Firebase Auth & Firestore
 */
import { auth, db, doc, getDoc, updateProfile, reauthenticateWithCredential, EmailAuthProvider, updatePassword, signOut, onAuthStateChanged, setDoc } from './backend.js';

document.addEventListener('DOMContentLoaded', async () => {
    const profileEmail = document.getElementById('profile-email');
    const profileName = document.getElementById('profile-name');
    const membershipInfo = document.getElementById('membership-info');
    const displayPlan = document.getElementById('display-plan');
    const backToDashboard = document.getElementById('back-to-dashboard');
    const updateNameForm = document.getElementById('update-name-form');
    const changePasswordForm = document.getElementById('change-password-form');
    const toast = document.getElementById('toast');
    const logoutBtn = document.getElementById('profile-logout');

    let currentUser = null;

    const showToast = (message, isError = false) => {
        toast.textContent = message;
        toast.classList.remove('hidden', 'bg-white', 'text-black', 'bg-red-600', 'text-white');
        if (isError) {
            toast.classList.add('bg-red-600', 'text-white');
        } else {
            toast.classList.add('bg-white', 'text-black');
        }
        setTimeout(() => toast.classList.add('hidden'), 3000);
    };

    // 1. Monitor Auth State & Fetch Data
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = 'login.html';
            return;
        }
        currentUser = user;

        // Fetch additional data from Firestore
        try {
            const docRef = doc(db, "users", user.uid);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();

                profileEmail.value = user.email; // Use auth email logic
                profileName.value = data.name || user.displayName;

                // Handle role-specific UI
                const userRole = data.role;

                if (userRole === 'admin') {
                    membershipInfo.classList.add('hidden');
                    backToDashboard.href = 'admin_dashboard.html';
                } else {
                    membershipInfo.classList.remove('hidden');
                    displayPlan.textContent = data.membership_plan || 'N/A';
                    backToDashboard.href = 'user_dashboard.html';
                }
            } else {
                console.log("No extra profile data found!");
                profileEmail.value = user.email;
                profileName.value = user.displayName;
                membershipInfo.classList.remove('hidden');
                backToDashboard.href = 'user_dashboard.html';
            }
        } catch (err) {
            console.error('Core failure:', err);
            showToast('Failed to load profile data.', true);
        }
    });

    // 2. Handle Name Update
    if (updateNameForm) {
        updateNameForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newName = profileName.value.trim();
            if (!currentUser) return;

            try {
                // Update Firebase Auth Profile
                await updateProfile(currentUser, { displayName: newName });

                // Update Firestore Document
                const docRef = doc(db, "users", currentUser.uid);
                await setDoc(docRef, { name: newName }, { merge: true });

                showToast('Identity updated successfully.');

            } catch (err) {
                console.error(err);
                showToast('System uplink error.', true);
            }
        });
    }

    // 3. Handle Password Change
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const currentPassword = document.getElementById('current-password').value;
            const newPassword = document.getElementById('new-password').value;

            if (!currentUser) return;

            try {
                // Re-authenticate first
                const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
                await reauthenticateWithCredential(currentUser, credential);

                // Update Password
                await updatePassword(currentUser, newPassword);

                showToast('Security protocol updated.');
                changePasswordForm.reset();

            } catch (err) {
                console.error(err);
                let msg = 'Security override failed.';
                if (err.code === 'auth/wrong-password') msg = 'Current password incorrect.';
                showToast(msg, true);
            }
        });
    }

    // 4. Logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await signOut(auth);
                window.location.href = 'index.html';
            } catch (err) {
                showToast('Session termination failed.', true);
            }
        });
    }
});

/**
 * auth-logic.js
 * Secure Authentication Logic for GYM RAT
 * UPDATED: Uses Firebase Auth & Firestore
 */

import { auth, db, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, doc, setDoc, getDoc } from './backend.js';

document.addEventListener('DOMContentLoaded', () => {
    // --- 1. Select Elements ---
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');

    // Password Toggle Logic
    const setupPasswordToggle = (inputId, iconId) => {
        const input = document.getElementById(inputId);
        const icon = document.getElementById(iconId);

        if (input && icon) {
            icon.addEventListener('click', () => {
                const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
                input.setAttribute('type', type);

                // Toggle Icon
                if (type === 'text') {
                    icon.classList.remove('fa-eye');
                    icon.classList.add('fa-eye-slash', 'text-primaryRed');
                } else {
                    icon.classList.remove('fa-eye-slash', 'text-primaryRed');
                    icon.classList.add('fa-eye');
                }
            });
        }
    };

    setupPasswordToggle('login-password', 'toggle-password');
    setupPasswordToggle('signup-password', 'toggle-signup-password');

    // --- 2. Helper Functions ---

    const validateEmail = (email) => {
        return String(email)
            .toLowerCase()
            .match(
                /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
            );
    };

    const validatePassword = (password) => {
        // Min 6 chars due to Firebase default, but sticking to strong policy is good
        return password.length >= 6;
    };

    const showError = (containerId, message) => {
        const container = document.getElementById(containerId);
        if (container) {
            container.textContent = message;
            container.classList.remove('hidden');
            container.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };

    const resetError = (containerId) => {
        const container = document.getElementById(containerId);
        if (container) {
            container.classList.add('hidden');
            container.textContent = '';
        }
    };

    const setLoading = (buttonId, isLoading, originalText) => {
        const btn = document.getElementById(buttonId);
        if (btn) {
            btn.disabled = isLoading;
            btn.innerHTML = isLoading
                ? `<i class="fa-solid fa-circle-notch animate-spin mr-2"></i> PROCESSING...`
                : originalText;
        }
    };

    // --- 3. Form Handlers ---

    /**
     * Handle Login Submission
     */
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            resetError('login-error-msg');

            const email = loginForm.querySelector('#login-email').value.trim();
            const password = loginForm.querySelector('#login-password').value;

            if (!validateEmail(email)) {
                return showError('login-error-msg', 'Please enter a valid member email address.');
            }

            setLoading('login-submit-btn', true, 'ENTER');

            try {
                // Firebase Login
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;

                // Check Role in Firestore (Optional if you want to redirect admins)
                const docRef = doc(db, "users", user.uid);
                const docSnap = await getDoc(docRef);

                let redirectUrl = 'index.html';
                if (docSnap.exists()) {
                    const userData = docSnap.data();
                    if (userData.role === 'admin') {
                        redirectUrl = 'admin_dashboard.html';
                    } else {
                        redirectUrl = 'user_dashboard.html';
                    }
                }

                window.location.href = redirectUrl;

            } catch (error) {
                console.error('Login Error:', error);
                const errorCode = error.code;
                let msg = 'Authorization failed.';
                if (errorCode === 'auth/invalid-credential' || errorCode === 'auth/user-not-found' || errorCode === 'auth/wrong-password') {
                    msg = 'Invalid email or password.';
                }
                showError('login-error-msg', msg);
            } finally {
                setLoading('login-submit-btn', false, 'ENTER');
            }
        });
    }

    /**
     * Handle Signup Submission
     */
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            resetError('signup-error-msg');

            const name = signupForm.querySelector('#signup-name').value.trim();
            const email = signupForm.querySelector('#signup-email').value.trim();
            const password = signupForm.querySelector('#signup-password').value;
            const acceptedProtocols = signupForm.querySelector('#signup-protocols').checked;

            if (!name || name.length < 2) {
                return showError('signup-error-msg', 'Identity verification requires a full name.');
            }
            if (!validateEmail(email)) {
                return showError('signup-error-msg', 'A valid entrance email is required.');
            }
            if (!validatePassword(password)) {
                return showError('signup-error-msg', 'Pass-key must be at least 6 characters.');
            }
            if (!acceptedProtocols) {
                return showError('signup-error-msg', 'You must accept the Iron Protocols to enlist.');
            }

            setLoading('signup-submit-btn', true, 'CONFIRM');

            try {
                // 1. Create User in Auth
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;

                // 2. Update Profile Name
                await updateProfile(user, {
                    displayName: name
                });

                // 3. Create User Document in Firestore
                await setDoc(doc(db, "users", user.uid), {
                    name: name,
                    email: email,
                    role: email === 'admin@gmail.com' ? 'admin' : 'user',
                    membership_status: 'active', // default active for demo
                    membership_plan: new URLSearchParams(window.location.search).get('plan') || 'basic',
                    join_date: new Date().toISOString()
                });

                // Success
                window.location.href = 'login.html?enlisted=true';

            } catch (error) {
                console.error('Signup Error:', error);
                let msg = 'Enlistment failed.';
                if (error.code === 'auth/email-already-in-use') {
                    msg = 'Email is already in use by another recruit.';
                }
                showError('signup-error-msg', msg);
            } finally {
                setLoading('signup-submit-btn', false, 'CONFIRM');
            }
        });
    }

    // Check for "enlisted" param
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('enlisted') && document.getElementById('login-error-msg')) {
        const container = document.getElementById('login-error-msg');
        container.textContent = 'Enlistment successful. Authorize your session below.';
        container.classList.remove('hidden', 'text-primaryRed', 'bg-primaryRed/10', 'border-primaryRed');
        container.classList.add('text-green-500', 'bg-green-500/10', 'border-green-500', 'block');
    }
});

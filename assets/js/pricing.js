/**
 * pricing.js
 * Handles membership selection and processing via Supabase.
 */

import { auth, db, doc, updateDoc, onAuthStateChanged, supabase } from './backend.js';

document.addEventListener('DOMContentLoaded', () => {

    let currentUser = null;

    onAuthStateChanged(auth, (user) => {
        currentUser = user;
    });

    const planButtons = document.querySelectorAll('.select-plan-btn');

    planButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const plan = btn.dataset.plan;
            const price = btn.dataset.price;

            if (!currentUser) {
                // Determine redirect with plan param
                window.location.href = `signup.html?plan=${plan}`;
                return;
            }

            handleMembershipPurchase(plan, price);
        });
    });

    function handleMembershipPurchase(plan, price) {
        // Redirect to checkout page
        window.location.href = `checkout.html?plan=${encodeURIComponent(plan)}&price=${encodeURIComponent(price)}`;
    }
});

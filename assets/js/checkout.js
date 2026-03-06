/**
 * checkout.js
 * Handles the payment flow for checkout.html
 */

import { auth, db, doc, updateDoc, onAuthStateChanged, supabase } from './backend.js';

document.addEventListener('DOMContentLoaded', () => {

    // 1. Get Params
    const urlParams = new URLSearchParams(window.location.search);
    const plan = urlParams.get('plan');
    const price = urlParams.get('price');

    if (!plan || !price) {
        alert('Invalid checkout session.');
        window.location.href = 'pricing.html';
        return;
    }

    // 2. Render Summary
    const nameEl = document.getElementById('summary-plan-name');
    const priceEl = document.getElementById('summary-price');

    if (nameEl) nameEl.innerText = plan;
    if (priceEl) priceEl.innerText = price;

    // 3. User Check
    let currentUser = null;
    onAuthStateChanged(auth, (user) => {
        if (!user) {
            // Should have been handled by pricing.js logic, but safety check
            window.location.href = `login.html?redirect=checkout&plan=${plan}&price=${price}`;
        }
        currentUser = user;
    });

    // 4. Form Handling
    const form = document.getElementById('checkout-form');
    const btn = document.getElementById('pay-btn');

    // Simple Card Formatting
    const cardInput = document.getElementById('card-input');
    if (cardInput) {
        cardInput.addEventListener('input', (e) => {
            let val = e.target.value.replace(/\D/g, '');
            val = val.replace(/(.{4})/g, '$1 ').trim();
            e.target.value = val;
        });
    }

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (!currentUser) return;

            const originalBtnText = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = `<i class="fa-solid fa-circle-notch animate-spin"></i> Processing...`;

            try {
                // Mock Network Delay
                await new Promise(r => setTimeout(r, 1500));

                // 1. Record Payment
                const { error: payError } = await supabase
                    .from('payments')
                    .insert([
                        {
                            user_id: currentUser.uid,
                            amount: parseFloat(price),
                            status: 'completed',
                            payment_date: new Date().toISOString()
                        }
                    ]);

                if (payError) throw payError;

                // 2. Update Membership
                const docRef = doc(db, "users", currentUser.uid);
                await updateDoc(docRef, {
                    membership_plan: plan,
                    membership_status: 'active',
                    membership_expiry: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0]
                });

                // Success UI
                btn.classList.remove('bg-primaryRed');
                btn.classList.add('bg-green-500');
                btn.innerHTML = `<i class="fa-solid fa-check"></i> APPROVED`;

                setTimeout(() => {
                    window.location.href = 'user_dashboard.html';
                }, 1000);

            } catch (error) {
                console.error('Payment Error:', error);
                btn.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> FAILED`;
                btn.classList.add('bg-gray-800');

                setTimeout(() => {
                    btn.disabled = false;
                    btn.innerHTML = originalBtnText;
                    btn.classList.remove('bg-gray-800');
                    btn.classList.add('bg-primaryRed');
                }, 2000);
            }
        });
    }

});

/**
 * user-dashboard.js
 * Frontend logic for the Member Portal via Firebase & Supabase.
 */

import { auth, db, doc, getDoc, onAuthStateChanged, supabase } from './backend.js';

document.addEventListener('DOMContentLoaded', () => {

    const uiNodes = {
        welcome: document.getElementById('user-welcome'),
        badge: document.getElementById('membership-badge'),
        plan: document.getElementById('display-plan'),
        expiry: document.getElementById('display-expiry'),
        trainerName: document.getElementById('trainer-name'),
        trainerSpecialty: document.getElementById('trainer-specialty'),
        programsList: document.getElementById('enrolled-list'),
        paymentRows: document.getElementById('payment-rows')
    };

    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = 'login.html';
            return;
        }

        await fetchUserProfile(user);
    });

    /**
     * Fetch User Profile
     */
    async function fetchUserProfile(user) {
        try {
            // 1. Fetch Firestore Profile
            const docRef = doc(db, "users", user.uid);
            const docSnap = await getDoc(docRef);
            let userProfile = {};

            if (docSnap.exists()) {
                userProfile = docSnap.data();
            } else {
                userProfile = { name: user.displayName, membership_status: 'active', membership_plan: 'basic' };
            }

            renderProfileHeader(userProfile, user.displayName);

            // 2. Fetch Bookings from Supabase
            const { data: bookings, error: bookingError } = await supabase
                .from('bookings')
                .select(`
                    *,
                    classes (
                        name,
                        type,
                        class_date,
                        start_time
                    )
                `)
                .eq('user_id', user.uid)
                .order('id', { ascending: false }); // Latest first

            if (!bookingError) {
                renderPrograms(bookings);
            }

            // 3. Fetch Payments from Supabase
            // Note: Assuming payments table uses user.uid column
            const { data: payments, error: paymentError } = await supabase
                .from('payments')
                .select('*')
                .eq('user_id', user.uid)
                .order('payment_date', { ascending: false });

            if (!paymentError) {
                renderPayments(payments);
            }

        } catch (error) {
            console.error('Portal offline:', error);
        }
    }

    function renderProfileHeader(profile, defaultName) {
        // 1. Header & Membership
        // Prioritize profile name, then auth displayName, then default
        const displayName = profile.name || defaultName || 'Member';
        if (uiNodes.welcome) uiNodes.welcome.innerText = `Welcome back, ${displayName}`;
        if (uiNodes.badge) {
            const status = profile.membership_status || 'active';
            uiNodes.badge.innerText = status;
            uiNodes.badge.className = `font-black italic uppercase ${status === 'active' ? 'text-green-500' : 'text-primaryRed'}`;
        }
        if (uiNodes.plan) uiNodes.plan.innerText = `${profile.membership_plan || 'Basic'} Protocol`;
        if (uiNodes.expiry) uiNodes.expiry.innerText = profile.membership_expiry || 'Open Ended';

        // 2. Trainer Info (Mocked if data missing in Firestore)
        // Ideally fetch from 'trainers' table in Supabase using profile.assigned_trainer_id
        if (uiNodes.trainerName) uiNodes.trainerName.innerText = profile.trainer_name || 'TBD';
        if (uiNodes.trainerSpecialty) uiNodes.trainerSpecialty.innerText = profile.trainer_specialty || 'General Fitness';
    }

    function renderPrograms(bookings) {
        if (!uiNodes.programsList) return;

        if (!bookings || bookings.length === 0) {
            uiNodes.programsList.innerHTML = `
                <div class="py-10 text-center border-2 border-dashed border-white/5 rounded-2xl">
                    <p class="text-[9px] font-black uppercase text-gray-700 tracking-widest mb-4">No active protocols detected</p>
                    <a href="booking.html" class="text-[10px] font-black text-primaryRed underline tracking-widest uppercase">Initiate First Booking</a>
                </div>
            `;
            return;
        }

        uiNodes.programsList.innerHTML = bookings.map(b => {
            const session = b.classes;
            if (!session) return ''; // Skip if class relation failed

            return `
            <div class="flex items-center justify-between p-6 bg-black/40 border border-white/5 rounded-2xl hover:border-white/20 transition-all">
                <div class="flex items-center gap-6">
                    <div class="w-2 h-10 bg-primaryRed rounded-full"></div>
                    <div>
                        <h4 class="text-sm font-black uppercase italic tracking-tighter text-white">${session.name}</h4>
                        <p class="text-[9px] font-black text-gray-600 uppercase tracking-widest italic">${session.type} Session</p>
                    </div>
                </div>
                <div class="text-right">
                    <p class="text-xs font-black text-white italic">${new Date(session.class_date).toLocaleDateString()}</p>
                    <p class="text-[9px] font-black text-gray-600 uppercase tracking-widest mt-1">${session.start_time.substring(0, 5)} HRS</p>
                </div>
            </div>
        `}).join('');
    }

    function renderPayments(payments) {
        if (!uiNodes.paymentRows) return;

        if (!payments || payments.length === 0) {
            uiNodes.paymentRows.innerHTML = `<tr><td colspan="4" class="py-10 text-center text-gray-700 italic">No financial footprints found.</td></tr>`;
            return;
        }

        uiNodes.paymentRows.innerHTML = payments.map(pay => `
            <tr class="border-b border-white/[0.02]">
                <td class="py-4">MEMBERSHIP AUTO-PAY</td>
                <td class="py-4 text-gray-500">${new Date(pay.payment_date).toLocaleDateString()}</td>
                <td class="py-4 text-white">$${pay.amount}</td>
                <td class="py-4 text-right">
                    <span class="px-2 py-1 ${pay.status === 'completed' ? 'bg-green-500/10 text-green-500' : 'bg-primaryRed/10 text-primaryRed'} rounded tracking-widest">
                        ${pay.status}
                    </span>
                </td>
            </tr>
        `).join('');
    }
});

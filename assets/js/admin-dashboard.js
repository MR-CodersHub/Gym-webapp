/**
 * admin-dashboard.js
 * Secured logic for Admin Mission Control via Firebase & Supabase.
 */

import { auth, db, getDocs, collection, onAuthStateChanged, supabase, orderBy, query } from './backend.js';

document.addEventListener('DOMContentLoaded', () => {

    // Select UI nodes
    const stats = {
        revenue: document.getElementById('stat-revenue'),
        members: document.getElementById('stat-members'),
        trainers: document.getElementById('stat-trainers'),
        programs: document.getElementById('stat-programs')
    };

    onAuthStateChanged(auth, (user) => {
        if (!user) {
            window.location.href = 'login.html';
        } else {
            // Optional: Verify admin role
            fetchMetrics();
            loadContactMessages();
            // Refresh every 5 minutes
            setInterval(fetchMetrics, 300000);
        }
    });

    /**
     * Fetch & Render Operational Metrics
     */
    async function fetchMetrics() {
        try {
            // 1. Members (Firestore)
            // Note: Reading all docs is expensive in production. Use a counter document in real apps.
            const usersSnap = await getDocs(collection(db, "users"));
            const memberCount = usersSnap.size;

            // 2. Revenue (Supabase)
            const { data: payments, error: payError } = await supabase
                .from('payments')
                .select('amount');

            let totalRevenue = 0;
            if (payments) {
                totalRevenue = payments.reduce((sum, p) => sum + Number(p.amount), 0);
            }

            // 3. Trainers (Supabase)
            const { count: trainerCount, error: trainerError } = await supabase
                .from('trainers')
                .select('*', { count: 'exact', head: true });

            // 4. Programs/Classes (Supabase)
            const { count: classCount, error: classError } = await supabase
                .from('classes')
                .select('*', { count: 'exact', head: true });

            updateUI({
                activeMembers: memberCount,
                monthlyRevenue: totalRevenue.toFixed(2),
                trainersCount: trainerCount || 0,
                programsCount: classCount || 0
            });

        } catch (error) {
            console.error('Critical Communications Error:', error);
        }
    }

    /**
     * Update Dashboard Stats with Data
     */
    function updateUI(metrics) {
        if (stats.revenue) stats.revenue.innerText = `$${metrics.monthlyRevenue}`;
        if (stats.members) stats.members.innerText = metrics.activeMembers;
        if (stats.trainers) stats.trainers.innerText = metrics.trainersCount;
        if (stats.programs) stats.programs.innerText = metrics.programsCount;
    }

    async function loadContactMessages() {
        const tableBody = document.getElementById('contact-messages-body');
        if (!tableBody) return;

        try {
            const q = query(collection(db, "contact_messages"), orderBy("created_at", "desc"));
            const querySnapshot = await getDocs(q);

            const messages = [];
            querySnapshot.forEach((doc) => {
                messages.push({ id: doc.id, ...doc.data() });
            });

            if (messages.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="4" class="py-8 text-center text-xs text-gray-600 italic">No inquiries found.</td></tr>';
            } else {
                tableBody.innerHTML = messages.map(msg => `
                    <tr class="border-b border-white/[0.02] hover:bg-white/[0.01] transition-colors">
                        <td class="py-4 text-[10px] font-bold text-gray-400 font-mono">${new Date(msg.created_at).toLocaleDateString()}</td>
                        <td class="py-4 text-xs font-black uppercase italic">${msg.name}</td>
                        <td class="py-4 text-xs text-primaryRed font-bold">${msg.email}</td>
                        <td class="py-4 text-xs text-gray-500 max-w-xs truncate" title="${msg.message}">${msg.message}</td>
                    </tr>
                `).join('');
            }
        } catch (error) {
            console.error('Error loading messages:', error);
            tableBody.innerHTML = '<tr><td colspan="4" class="py-8 text-center text-xs text-red-500">Failed to load messages.</td></tr>';
        }
    }
});

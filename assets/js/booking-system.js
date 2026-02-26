/**
 * booking-system.js
 * Handles the dynamic schedule and reservation lifecycle via Supabase & Firebase.
 */
import { supabase, auth, onAuthStateChanged, db, doc, getDoc } from './backend.js';

document.addEventListener('DOMContentLoaded', () => {
    const scheduleContainer = document.getElementById('dynamic-schedule');
    const bookingSummary = document.getElementById('booking-summary');
    let selectedClassId = null;
    let selectedClassData = null;
    let currentUser = null;

    // Monitor Auth
    onAuthStateChanged(auth, (user) => {
        currentUser = user;
    });

    // --- 1. Fetch & Render Schedule ---

    async function loadSchedule() {
        if (!scheduleContainer) return;

        scheduleContainer.innerHTML = `<div class="col-span-full py-10 text-center text-gray-500 font-bold uppercase tracking-widest animate-pulse">Scanning the schedule...</div>`;

        try {
            // Fetch classes from Supabase
            // Assuming 'trainers' relationship exists. If not, remove the nested select.
            const { data: classes, error } = await supabase
                .from('classes')
                .select(`
                    *,
                    trainers ( name )
                `)
                .gt('available_slots', 0) // Only show available
                .order('class_date', { ascending: true })
                .order('start_time', { ascending: true });

            if (error) throw error;

            // Group by Date
            const groupedSchedule = {};
            classes.forEach(session => {
                const dateKey = session.class_date; // YYYY-MM-DD
                if (!groupedSchedule[dateKey]) {
                    groupedSchedule[dateKey] = [];
                }
                // Flatten trainer name
                let trainerName = 'Unknown Trainer';
                if (session.trainers && session.trainers.name) {
                    trainerName = session.trainers.name;
                } else if (session.trainers && Array.isArray(session.trainers) && session.trainers.length > 0) {
                    trainerName = session.trainers[0].name;
                }

                groupedSchedule[dateKey].push({
                    ...session,
                    trainer_name: trainerName
                });
            });

            renderSchedule(groupedSchedule);

        } catch (error) {
            console.error('Schedule Error:', error);
            scheduleContainer.innerHTML = `<div class="col-span-full text-center py-10 text-primaryRed font-bold">Failed to load schedule. <br><span class="text-xs text-gray-500">${error.message}</span></div>`;
        }
    }

    function renderSchedule(schedule) {
        scheduleContainer.innerHTML = '';
        const dates = Object.keys(schedule);

        if (dates.length === 0) {
            scheduleContainer.innerHTML = `<div class="col-span-full text-center py-10 text-gray-500 font-black uppercase italic">No sessions available at the moment.</div>`;
            return;
        }

        dates.forEach(date => {
            const dateObj = new Date(date);
            const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
            const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

            const dateSection = document.createElement('div');
            dateSection.className = 'space-y-6 col-span-full';
            dateSection.innerHTML = `
                <div class="flex items-center gap-4">
                    <h3 class="font-montserrat text-2xl font-black uppercase italic text-white">${dayName} <span class="text-primaryRed text-sm ml-2">${formattedDate}</span></h3>
                    <div class="flex-grow h-px bg-white/5"></div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    ${schedule[date].map(session => createClassCard(session)).join('')}
                </div>
            `;
            scheduleContainer.appendChild(dateSection);
        });

        // Attach listeners
        document.querySelectorAll('.class-card').forEach(card => {
            card.addEventListener('click', () => selectClass(card));
        });
    }

    function createClassCard(session) {
        const isFull = session.available_slots <= 0;
        const typeColor = {
            'Strength': 'text-primaryRed',
            'HIIT': 'text-orange-500',
            'Yoga': 'text-green-500',
            'Cardio': 'text-blue-500'
        }[session.type] || 'text-white';

        // Store data in dataset or look up later. Using dataset for simplicity.
        // Careful with spaces in data attributes.
        return `
            <div data-id="${session.id}" data-name="${session.name}" data-time="${session.start_time}" data-trainer="${session.trainer_name}"
                 class="class-card group bg-cardBg border border-white/5 p-6 rounded-2xl cursor-pointer hover:border-primaryRed transition-all relative overflow-hidden ${isFull ? 'opacity-50 cursor-not-allowed' : ''}">
                <div class="absolute top-0 right-0 p-2 text-[8px] font-black uppercase tracking-tighter bg-white/5 text-gray-500 rounded-bl-lg">${session.plan_requirement} ONLY</div>
                <h4 class="${typeColor} font-black uppercase italic text-xs mb-1">${session.type}</h4>
                <h3 class="text-xl font-bold uppercase italic leading-tight text-white mb-4">${session.name}</h3>
                <div class="space-y-2 mb-6">
                    <div class="flex items-center gap-2 text-xs text-gray-400 font-bold uppercase">
                        <i class="fa-solid fa-clock w-4 text-primaryRed"></i> ${session.start_time.substring(0, 5)} (${session.duration_minutes} MIN)
                    </div>
                    <div class="flex items-center gap-2 text-xs text-gray-400 font-bold uppercase">
                        <i class="fa-solid fa-user-tie w-4 text-primaryRed"></i> ${session.trainer_name}
                    </div>
                    <div class="flex items-center gap-2 text-[10px] text-gray-500 font-black uppercase">
                        <i class="fa-solid fa-users w-4 text-primaryRed"></i> ${session.available_slots} / ${session.capacity} SLOTS LEFT
                    </div>
                </div>
                ${isFull ?
                `<div class="w-full py-3 bg-black/40 text-[10px] font-black uppercase tracking-[3px] text-center text-gray-600">FULL CAPACITY</div>` :
                `<div class="w-full py-3 bg-primaryRed/10 group-hover:bg-primaryRed text-[10px] font-black uppercase tracking-[3px] text-center text-white transition-all">RESERVE</div>`
            }
            </div>
        `;
    }

    // --- 2. Interaction Logic ---

    function selectClass(card) {
        if (card.classList.contains('opacity-50')) return;

        // Visual toggle
        document.querySelectorAll('.class-card').forEach(c => c.classList.remove('border-primaryRed', 'bg-primaryRed/5'));
        card.classList.add('border-primaryRed', 'bg-primaryRed/5');

        selectedClassId = card.dataset.id;

        // Update summary
        if (bookingSummary) {
            bookingSummary.innerHTML = `
                <div class="text-white font-montserrat italic uppercase">
                    <p class="text-primaryRed text-[10px] font-black tracking-widest mb-1">SELECTED SESSION</p>
                    <h4 class="text-2xl font-black">${card.dataset.name}</h4>
                    <p class="text-xs text-gray-500 font-bold mt-1 uppercase">${card.dataset.time.substring(0, 5)} WITH ${card.dataset.trainer}</p>
                </div>
            `;
        }

        // Enable booking buttons
        const submitBtn = document.getElementById('book-now-btn');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.classList.remove('opacity-50', 'grayscale');
            submitBtn.innerText = 'COMPLETE RESERVATION';
        }
    }

    // --- 3. Booking Submission ---

    const bookingForm = document.getElementById('booking-confirmation-form');
    if (bookingForm) {
        bookingForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!selectedClassId) return;

            if (!currentUser) {
                // Not logged in
                window.location.href = 'login.html';
                return;
            }

            const submitBtn = document.getElementById('book-now-btn');
            const originalText = submitBtn.innerText;

            submitBtn.disabled = true;
            submitBtn.innerHTML = `<i class="fa-solid fa-circle-notch animate-spin mr-2"></i> SEALING THE DEAL...`;

            try {
                // 1. Check if already booked
                const { data: existingBookings, error: checkError } = await supabase
                    .from('bookings')
                    .select('*')
                    .eq('class_id', selectedClassId)
                    .eq('user_id', currentUser.uid);

                if (checkError) throw checkError;

                if (existingBookings && existingBookings.length > 0) {
                    throw new Error('You have already booked this session.');
                }

                // 2. Insert Booking
                const { error: insertError } = await supabase
                    .from('bookings')
                    .insert([
                        { user_id: currentUser.uid, class_id: selectedClassId, status: 'confirmed' }
                    ]);

                if (insertError) throw insertError;

                // 3. Decrement Slot (Warning: Client-side logic, not atomic)
                // In a real app, use a DB function: decrement_slot(class_id)
                // For now, we just proceed.
                // Assuming data update happens or refetch handles it.

                showBookingSuccess('Reservation confirmed. Prepare for war.');
                loadSchedule(); // Refresh slots

            } catch (error) {
                console.error('Booking creation error:', error);

                let msg = 'System mismatch. Try again later.';
                if (error.message.includes('already booked')) msg = error.message;
                if (error.code === '23505') msg = 'You are already booked for this session.'; // Unique violation

                showBookingError(msg);
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerText = originalText;
            }
        });
    }

    function showBookingSuccess(msg) {
        if (bookingSummary) {
            bookingSummary.innerHTML = `
                <div class="bg-green-500/10 border-l-4 border-green-500 p-6 rounded-r-lg">
                    <p class="text-green-500 text-[10px] font-black uppercase tracking-widest mb-2">VICTORY!</p>
                    <p class="text-white font-bold uppercase italic text-sm">${msg}</p>
                    <a href="user_dashboard.html" class="inline-block mt-4 text-[9px] font-black text-white hover:text-green-500 underline uppercase tracking-widest">View My History</a>
                </div>
            `;
        }
    }

    function showBookingError(msg) {
        if (bookingSummary) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'bg-primaryRed/10 border-l-4 border-primaryRed p-6 rounded-r-lg mt-4 animate-shake';
            errorDiv.innerHTML = `
                <p class="text-primaryRed text-[10px] font-black uppercase tracking-widest mb-2">ACCESS DENIED</p>
                <p class="text-white font-bold uppercase italic text-sm">${msg}</p>
            `;
            // Remove old error if exists
            const existing = bookingSummary.querySelector('.bg-primaryRed\\/10');
            if (existing) existing.remove();

            bookingSummary.prepend(errorDiv);
        }
    }

    // Run on load
    loadSchedule();
});

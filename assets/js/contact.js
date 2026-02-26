/**
 * contact.js
 * Handles Contact Form Submission via Firestore
 */
import { db, collection, addDoc } from './backend.js';

document.addEventListener('DOMContentLoaded', () => {
    const contactForm = document.getElementById('contact-form');
    const responseMsg = document.getElementById('contact-response');
    const submitBtn = document.getElementById('submit-btn');
    const btnText = document.getElementById('btn-text');
    const btnLoader = document.getElementById('btn-loader');

    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (responseMsg) {
                responseMsg.classList.add('hidden');
                responseMsg.classList.remove('bg-green-500/20', 'text-green-500', 'bg-red-500/20', 'text-red-500', 'border', 'border-green-500/50', 'border-red-500/50');
            }

            const formData = {
                name: contactForm.querySelector('#name')?.value.trim(),
                email: contactForm.querySelector('#email')?.value.trim(),
                message: contactForm.querySelector('#message')?.value.trim(),
                created_at: new Date().toISOString()
            };

            if (!formData.name || !formData.email || !formData.message) {
                showResponse('All fields are required.', 'error');
                return;
            }

            setLoading(true);

            try {
                // Submit to Firestore
                await addDoc(collection(db, "contact_messages"), formData);

                showResponse('Message received. We will respond shortly.', 'success');
                contactForm.reset();

            } catch (error) {
                console.error('Error submitting form:', error);
                showResponse('Unable to send message. Try again later.', 'error');
            } finally {
                setLoading(false);
            }
        });
    }

    function setLoading(isLoading) {
        if (!submitBtn) return;

        if (isLoading) {
            submitBtn.disabled = true;
            if (btnText) btnText.classList.add('hidden');
            if (btnLoader) btnLoader.classList.remove('hidden');
        } else {
            submitBtn.disabled = false;
            if (btnText) btnText.classList.remove('hidden');
            if (btnLoader) btnLoader.classList.add('hidden');
        }
    }

    function showResponse(message, type) {
        if (!responseMsg) {
            alert(message);
            return;
        }

        responseMsg.textContent = message;
        responseMsg.classList.remove('hidden');

        if (type === 'success') {
            responseMsg.classList.add('bg-green-500/20', 'text-green-500', 'border', 'border-green-500/50');
        } else {
            responseMsg.classList.add('bg-red-500/20', 'text-red-500', 'border', 'border-red-500/50');
        }

        responseMsg.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
});

/**
 * Testimonial Slider Logic
 * Handles auto-sliding, manual navigation, and pause-on-hover interactions.
 */

document.addEventListener('DOMContentLoaded', () => {
    initTestimonialSlider();
});

function initTestimonialSlider() {
    const track = document.getElementById('testimonial-track');
    const slides = document.querySelectorAll('.testimonial-slide');
    const prevBtn = document.getElementById('prev-testim');
    const nextBtn = document.getElementById('next-testim');

    if (!track || slides.length === 0) return;

    let currentIndex = 0;
    const totalSlides = slides.length;
    let autoSlideInterval;
    const intervalTime = 4000; // 4 seconds

    // Initialize position
    updateSliderPosition();

    // Event Listeners
    if (prevBtn) prevBtn.addEventListener('click', () => {
        pauseAutoSlide();
        moveToPrevSlide();
        startAutoSlide(); // Restart timer after interaction
    });

    if (nextBtn) nextBtn.addEventListener('click', () => {
        pauseAutoSlide();
        moveToNextSlide();
        startAutoSlide();
    });

    // Pause on hover
    track.addEventListener('mouseenter', pauseAutoSlide);
    track.addEventListener('mouseleave', startAutoSlide);

    // Start auto-play
    startAutoSlide();

    function moveToNextSlide() {
        currentIndex = (currentIndex + 1) % totalSlides;
        updateSliderPosition();
    }

    function moveToPrevSlide() {
        currentIndex = (currentIndex - 1 + totalSlides) % totalSlides;
        updateSliderPosition();
    }

    function updateSliderPosition() {
        // We assume each slide is 100% width of the visible container
        const translateX = -(currentIndex * 100);
        track.style.transform = `translateX(${translateX}%)`;
    }

    function startAutoSlide() {
        // Clear existing to avoid multiples
        stopAutoSlide();
        autoSlideInterval = setInterval(moveToNextSlide, intervalTime);
    }

    function pauseAutoSlide() {
        stopAutoSlide();
    }

    function stopAutoSlide() {
        if (autoSlideInterval) {
            clearInterval(autoSlideInterval);
            autoSlideInterval = null;
        }
    }
}

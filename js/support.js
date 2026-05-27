/* support.js - Accordion functionality for FAQ */

document.addEventListener('DOMContentLoaded', () => {
    const accordionItems = document.querySelectorAll('.eben-accordion-item');

    accordionItems.forEach(item => {
        const header = item.querySelector('.eben-accordion-header');
        
        header.addEventListener('click', () => {
            const isActive = item.classList.contains('active');
            
            // Close all items
            accordionItems.forEach(i => i.classList.remove('active'));
            
            // Open clicked item if it wasn't active
            if (!isActive) {
                item.classList.add('active');
            }
        });
    });
});

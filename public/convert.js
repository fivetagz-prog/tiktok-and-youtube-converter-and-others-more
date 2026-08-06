document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('converterForm');
    const statusDiv = document.getElementById('status');
    const submitBtn = document.getElementById('submitBtn');

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const urlInput = document.getElementById('url').value.trim();
        const formatSelect = document.getElementById('format').value;

        if (!urlInput) {
            statusDiv.textContent = 'Please enter a URL.';
            return;
        }

        statusDiv.style.color = '#00f2fe';
        statusDiv.textContent = 'Processing request... Download will start automatically.';
        submitBtn.disabled = true;

        const downloadUrl = `/api/convert?url=${encodeURIComponent(urlInput)}&format=${formatSelect}`;
        
        // Trigger file download
        window.location.href = downloadUrl;

        setTimeout(() => {
            submitBtn.disabled = false;
            statusDiv.textContent = 'Ready for next download.';
            statusDiv.style.color = '#aaa';
        }, 5000);
    });
});

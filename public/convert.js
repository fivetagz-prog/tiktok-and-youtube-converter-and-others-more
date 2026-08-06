document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('converterForm');
    const statusDiv = document.getElementById('status');
    const submitBtn = document.getElementById('submitBtn');

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const urlInput = document.getElementById('url').value.trim();

        if (!urlInput) {
            statusDiv.textContent = 'Please enter a valid URL.';
            return;
        }

        statusDiv.style.color = '#aaa';
        statusDiv.textContent = 'Extracting MP4 video stream...';
        submitBtn.disabled = true;

        const downloadUrl = `/api/convert?url=${encodeURIComponent(urlInput)}`;
        
        window.location.href = downloadUrl;

        setTimeout(() => {
            submitBtn.disabled = false;
            statusDiv.textContent = '';
        }, 4000);
    });
});

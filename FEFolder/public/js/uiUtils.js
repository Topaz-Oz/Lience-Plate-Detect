const uiUtils = {
    // Show loading spinner
    showLoading(containerId = 'result-container') {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `
                <div class="text-center p-4">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Đang xử lý...</span>
                    </div>
                    <p class="mt-2">Đang xử lý...</p>
                </div>
            `;
        }
    },

    // Hide loading spinner
    hideLoading(containerId = 'result-container') {
        const container = document.getElementById(containerId);
        if (container && container.querySelector('.spinner-border')) {
            container.innerHTML = '';
        }
    },

    // Show error message
    showError(message, containerId = 'result-container') {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `
                <div class="alert alert-danger" role="alert">
                    <i class="bi bi-exclamation-triangle-fill me-2"></i>
                    ${message}
                </div>
            `;
        }
    },

    // Show success message
    showSuccess(message, containerId = 'result-container') {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `
                <div class="alert alert-success" role="alert">
                    <i class="bi bi-check-circle-fill me-2"></i>
                    ${message}
                </div>
            `;
        }
    },

    // Format date
    formatDate(date) {
        return new Date(date).toLocaleString('vi-VN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    // Format percentage
    formatPercent(value) {
        return `${(value * 100).toFixed(1)}%`;
    },

    // Update table row loading state
    setRowLoading(row, isLoading) {
        if (isLoading) {
            row.classList.add('table-active');
            row.style.opacity = '0.6';
        } else {
            row.classList.remove('table-active');
            row.style.opacity = '1';
        }
    },

    // Create toast notification
    showToast(message, type = 'success') {
        const toastContainer = document.getElementById('toast-container');
        if (!toastContainer) {
            const container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'position-fixed bottom-0 end-0 p-3';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `toast align-items-center text-white bg-${type}`;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');
        toast.setAttribute('aria-atomic', 'true');

        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;

        document.getElementById('toast-container').appendChild(toast);
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();

        toast.addEventListener('hidden.bs.toast', () => {
            toast.remove();
        });
    }
};
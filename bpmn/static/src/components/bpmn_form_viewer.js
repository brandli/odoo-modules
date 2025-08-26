// Test script to verify loading
console.log('*** BPMN Form Viewer script is loading ***');

// Immediately log when this script executes
(function() {
    'use strict';
    
    console.log('*** BPMN Form Viewer script loaded successfully ***');
    console.log('Current location:', window.location.href);
    console.log('Document ready state:', document.readyState);
    
    // BPMN Diagram loader function
    window.loadBPMNDiagram = function() {
        console.log('=== Loading BPMN diagram ===');
        alert('Load BPMN Diagram button clicked! Check console for details.');
        
        // Check if BPMN.js is available
        console.log('Checking for window.BpmnJS:', typeof window.BpmnJS);
        if (typeof window.BpmnJS === 'undefined') {
            console.error('BPMN.js library not loaded');
            alert('BPMN.js library not loaded');
            return;
        }
        
        const container = document.getElementById('bpmn-display-container');
        const loadingDiv = document.getElementById('bpmn-loading');
        
        console.log('Container found:', !!container);
        console.log('Loading div found:', !!loadingDiv);
        
        if (!container) {
            console.error('BPMN container not found');
            alert('BPMN container not found');
            return;
        }
        
        // Find the BPMN XML content
        const textField = document.querySelector('textarea[name="bpmn_xml"]');
        console.log('Text field found:', !!textField);
        
        const xmlContent = textField ? textField.value : '';
        console.log('XML content length:', xmlContent ? xmlContent.length : 0);
        console.log('XML content preview:', xmlContent ? xmlContent.substring(0, 100) + '...' : 'No content');
        
        if (!xmlContent || xmlContent.trim() === '') {
            console.log('No XML content found');
            alert('No BPMN content found');
            return;
        }
        
        try {
            console.log('Hiding loading message and clearing container...');
            // Hide loading message
            if (loadingDiv) loadingDiv.style.display = 'none';
            
            // Clear container
            container.innerHTML = '';
            
            console.log('Creating BPMN viewer...');
            // Create BPMN viewer
            const viewer = new window.BpmnJS({
                container: container
            });
            
            console.log('BPMN viewer created, importing XML...');
            // Load the BPMN diagram
            viewer.importXML(xmlContent).then(() => {
                console.log('XML imported successfully, zooming to fit...');
                viewer.get('canvas').zoom('fit-viewport');
                console.log('BPMN diagram loaded successfully');
                alert('BPMN diagram loaded successfully!');
            }).catch((err) => {
                console.error('Failed to load BPMN diagram:', err);
                alert('Failed to load BPMN diagram: ' + err.message);
            });
            
        } catch (err) {
            console.error('Error initializing BPMN viewer:', err);
            alert('Error initializing BPMN viewer: ' + err.message);
        }
    };

    function showBPMNMessage(type, title, message) {
        const container = document.getElementById('bpmn-display-container');
        const loadingDiv = document.getElementById('bpmn-loading');
        
        if (!container) return;
        
        const iconClass = type === 'error' ? 'fa-exclamation-triangle' : 'fa-sitemap';
        const textClass = type === 'error' ? 'text-danger' : '';
        
        if (loadingDiv) {
            loadingDiv.innerHTML = `
                <div class="text-center ${textClass}">
                    <i class="fa ${iconClass} fa-3x mb-3"></i>
                    <div>${title}</div>
                    ${message ? `<small>${message}</small>` : ''}
                </div>
            `;
            loadingDiv.style.display = 'flex';
        }
    }

    // Set up event listeners and auto-load
    function initBPMN() {
        console.log('*** Initializing BPMN viewer ***');
        
        // Add click event listener to the button
        const button = document.getElementById('load-bpmn-btn');
        if (button) {
            button.addEventListener('click', window.loadBPMNDiagram);
            console.log('Button click listener added to button:', button);
        } else {
            console.log('Button with id load-bpmn-btn not found');
        }
        
        // Auto-load if content exists
        const container = document.getElementById('bpmn-display-container');
        const textField = document.querySelector('textarea[name="bpmn_xml"]');
        
        console.log('Auto-load check - container:', !!container, 'textField:', !!textField);
        if (textField) {
            console.log('Text field value length:', textField.value ? textField.value.length : 0);
        }
        
        if (container && textField && textField.value && textField.value.trim()) {
            console.log('Auto-loading BPMN diagram...');
            setTimeout(() => {
                window.loadBPMNDiagram();
            }, 1000);
        }
    }

    // Initialize when DOM is ready
    console.log('Setting up DOM ready listener...');
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initBPMN);
        console.log('Added DOMContentLoaded listener');
    } else {
        console.log('DOM already ready, initializing with timeout...');
        setTimeout(initBPMN, 500);
    }
})();

console.log('*** End of BPMN Form Viewer script ***');

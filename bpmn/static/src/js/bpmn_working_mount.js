/** @odoo-module **/

import { mount, Component } from "@odoo/owl";
import { registry } from "@web/core/registry";

/**
 * BPMN OWL Component Auto-Mount - Production Implementation
 * 
 * Automatically mounts the BPMN OWL component when forms load.
 * Uses Odoo's component registry and proper mounting lifecycle.
 */

let mountAttempted = false; // Prevent multiple mount attempts

function mountBPMNComponent() {
    if (mountAttempted) {
        console.log('BPMNMount: Mount already attempted, skipping...');
        return;
    }
    
    console.log('BPMNMount: Starting auto-mount process...');
    
    // Wait for the mount point to be available
    const checkForMountPoint = (attempts = 0) => {
        const mountPoint = document.getElementById('bpmn-owl-mount-point');
        
        if (mountPoint && !mountPoint.hasAttribute('data-bpmn-mounted')) {
            console.log('BPMNMount: Mount point found, mounting component...');
            
            try {
                // Get the registered component
                const BPMNComponent = registry.category("components").get("BPMNOwlComponent");
                
                if (!BPMNComponent) {
                    throw new Error('BPMNOwlComponent not found in registry');
                }
                
                // Mount the component
                mount(BPMNComponent, mountPoint, {
                    env: {}, // Use default environment
                });
                
                mountPoint.setAttribute('data-bpmn-mounted', 'true');
                mountAttempted = true; // Mark as completed
                console.log('BPMNMount: ✅ Component mounted successfully!');
                
            } catch (error) {
                console.error('BPMNMount: Mount failed:', error);
                
                // Show error in mount point
                mountPoint.innerHTML = `
                    <div class="alert alert-warning">
                        <h5>OWL Component Mount Failed</h5>
                        <p><strong>Error:</strong> ${error.message}</p>
                        <p>Using manual mount fallback...</p>
                        <button type="button" class="btn btn-primary" onclick="window.manualMountBPMN()">
                            Try Manual Mount
                        </button>
                    </div>
                `;
                mountAttempted = true; // Mark as attempted even if failed
            }
            
        } else if (mountPoint && mountPoint.hasAttribute('data-bpmn-mounted')) {
            console.log('BPMNMount: Component already mounted, skipping...');
            mountAttempted = true;
        } else if (attempts < 20) {
            // Keep trying for up to 10 seconds
            console.log(`BPMNMount: Mount point not ready, attempt ${attempts + 1}/20`);
            setTimeout(() => checkForMountPoint(attempts + 1), 500);
        } else {
            console.log('BPMNMount: Mount point not found after 20 attempts');
            mountAttempted = true;
        }
    };
    
    // Start checking
    checkForMountPoint();
}

// Auto-mount when DOM is ready, but only if we're on a BPMN form
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Small delay to let the form render
        setTimeout(mountBPMNComponent, 500);
    });
} else {
    setTimeout(mountBPMNComponent, 500);
}

// Don't try multiple times automatically - let the single attempt with retries handle it

console.log('BPMNMount: Auto-mount script loaded');

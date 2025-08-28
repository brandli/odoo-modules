/** @odoo-module **/

import { mount, Component } from "@odoo/owl";
import { registry } from "@web/core/registry";

/**
 * BPMN OWL Component Auto-Mount - Production Implementation
 * 
 * Automatically mounts the BPMN OWL component when forms load.
 * Uses Odoo's component registry and proper mounting lifecycle.
 */

/**
 * BPMN OWL Component Auto-Mount - Production Implementation
 * 
 * Automatically mounts the BPMN OWL component when forms load.
 * Uses Odoo's component registry and proper mounting lifecycle.
 * Handles SPA navigation by monitoring DOM changes.
 */

import { mount as owlMount } from "@odoo/owl";
import { registry as webRegistry } from "@web/core/registry";

let mountAttempted = false; // Prevent multiple mount attempts

function mountBPMNComponent() {
    // Only try to mount if we're on a page that might have BPMN content
    // Check for BPMN-related elements or model
    const isBPMNPage = document.querySelector('textarea[id*="bpmn_xml"]') || 
                       document.getElementById('bpmn-owl-mount-point') ||
                       window.location.href.includes('bpmn.process');
    
    if (!isBPMNPage) {
        console.log('BPMNMount: Not a BPMN page, skipping auto-mount');
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
                const BPMNComponent = webRegistry.category("components").get("BPMNOwlComponent");
                
                if (!BPMNComponent) {
                    throw new Error('BPMNOwlComponent not found in registry');
                }
                
                // Mount the component
                owlMount(BPMNComponent, mountPoint, {
                    env: {}, // Use default environment
                });
                
                mountPoint.setAttribute('data-bpmn-mounted', 'true');
                console.log('BPMNMount: ✅ Component mounted successfully!');
                
            } catch (error) {
                console.error('BPMNMount: Mount failed:', error);
                
                // Show error in mount point
                mountPoint.innerHTML = `
                    <div class="alert alert-danger">
                        <h5>OWL Component Mount Failed</h5>
                        <p><strong>Error:</strong> ${error.message}</p>
                        <p>Please refresh the page or contact support.</p>
                    </div>
                `;
            }
            
        } else if (mountPoint && mountPoint.hasAttribute('data-bpmn-mounted')) {
            console.log('BPMNMount: Component already mounted, skipping...');
        } else if (attempts < 10) {
            // Reduced attempts since we're being more selective
            console.log(`BPMNMount: Mount point not ready, attempt ${attempts + 1}/10`);
            setTimeout(() => checkForMountPoint(attempts + 1), 500);
        } else {
            console.log('BPMNMount: Mount point not found after 10 attempts');
        }
    };
    
    // Start checking
    checkForMountPoint();
}

// Monitor for page changes in Odoo's SPA
function observePageChanges() {
    // Ensure document.body exists before starting observer
    if (!document.body) {
        console.log('BPMNMount: Document body not ready, waiting...');
        setTimeout(observePageChanges, 100);
        return;
    }
    
    // Use MutationObserver to detect when new content is loaded
    const observer = new MutationObserver((mutations) => {
        let shouldCheckMount = false;
        
        mutations.forEach((mutation) => {
            // Check if new nodes were added that might contain BPMN forms
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                for (let node of mutation.addedNodes) {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Check if this might be a BPMN form
                        if (node.querySelector && 
                            (node.querySelector('textarea[id*="bpmn_xml"]') || 
                             node.querySelector('#bpmn-owl-mount-point') ||
                             node.id === 'bpmn-owl-mount-point')) {
                            shouldCheckMount = true;
                            console.log('BPMNMount: Detected BPMN form content, checking for mount...');
                            break;
                        }
                    }
                }
            }
        });
        
        if (shouldCheckMount) {
            // Small delay to ensure DOM is stable
            setTimeout(mountBPMNComponent, 200);
        }
    });
    
    // Start observing
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    console.log('BPMNMount: Started observing page changes for SPA navigation');
}

// Initialize everything when DOM is ready
function initializeBPMNMount() {
    // Initial mount attempt
    setTimeout(mountBPMNComponent, 1000);
    
    // Start observing for SPA navigation
    observePageChanges();
    
    console.log('BPMNMount: Auto-mount script loaded with SPA support');
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeBPMNMount);
} else {
    // DOM is already ready
    initializeBPMNMount();
}

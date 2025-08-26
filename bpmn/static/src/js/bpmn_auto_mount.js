/** @odoo-module **/

import { BPMNViewerComponent } from "./bpmn_viewer_component";
import { mount } from "@odoo/owl";

/**
 * Auto-mounter for BPMN Component
 * This will mount the OWL component when the view loads
 */
class BPMNAutoMounter {
    constructor() {
        this.mounted = false;
        this.component = null;
        this.retryCount = 0;
        this.maxRetries = 10;
    }
    
    init() {
        console.log('BPMN Auto-Mounter: Initializing...');
        
        // Try mounting immediately
        this.mount();
        
        // Set up retries with increasing delays
        this.startRetryLoop();
        
        // Also try to mount when new content is loaded (for Odoo's dynamic loading)
        const observer = new MutationObserver((mutations) => {
            const hasNewNodes = mutations.some(mutation => 
                Array.from(mutation.addedNodes).some(node => 
                    node.nodeType === Node.ELEMENT_NODE && 
                    (node.id === 'bpmn-owl-mount-point' || node.querySelector('#bpmn-owl-mount-point'))
                )
            );
            
            if (hasNewNodes && !this.mounted) {
                console.log('BPMN Auto-Mounter: New mount point detected');
                setTimeout(() => this.mount(), 100);
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
    
    startRetryLoop() {
        // Retry mounting with exponential backoff
        const retry = () => {
            if (!this.mounted && this.retryCount < this.maxRetries) {
                setTimeout(() => {
                    this.mount();
                    this.retryCount++;
                    retry();
                }, Math.min(1000 * Math.pow(2, this.retryCount), 10000)); // Max 10 seconds
            }
        };
        retry();
    }
    
    async mount() {
        // Look for the mount point
        const mountPoint = document.getElementById('bpmn-owl-mount-point');
        
        console.log('BPMN Auto-Mounter: Looking for mount point...', {
            found: !!mountPoint,
            mounted: this.mounted,
            retryCount: this.retryCount
        });
        
        if (mountPoint && !this.mounted) {
            try {
                console.log('BPMN Auto-Mounter: Attempting to mount component...');
                
                // Clear the mount point first
                mountPoint.innerHTML = '';
                
                // Mount the component using OWL's mount function
                this.component = await mount(BPMNViewerComponent, mountPoint);
                this.mounted = true;
                console.log('BPMN OWL Component: Auto-mounted successfully');
                
                // Hide the fallback container since OWL component is mounted
                const fallbackContainer = document.getElementById('bpmn-display-container');
                if (fallbackContainer) {
                    fallbackContainer.style.display = 'none';
                    console.log('BPMN Auto-Mounter: Hidden fallback container');
                }
                
            } catch (error) {
                console.error('BPMN OWL Component: Auto-mount failed:', error);
                // Fallback: ensure the global function is still available
                this.ensureFallback();
            }
        } else if (!mountPoint && this.retryCount < 3) {
            console.log('BPMN Auto-Mounter: Mount point not found, will retry...');
        }
    }
    
    ensureFallback() {
        console.log('BPMN Auto-Mounter: Ensuring fallback function is available...');
        // Ensure the global function is available as fallback
        if (!window.loadBPMNDiagram) {
            // The bpmn_loader should already have set this up
            console.log('BPMN Auto-Mounter: Global function missing, will rely on bpmn_loader');
        } else {
            console.log('BPMN Auto-Mounter: Global function available');
        }
    }
}

// Initialize the auto-mounter
const autoMounter = new BPMNAutoMounter();
autoMounter.init();

console.log('BPMN Auto-Mounter: Initialized');

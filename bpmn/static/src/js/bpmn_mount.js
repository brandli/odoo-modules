/** @odoo-module **/

import { mount as owlMount } from "@odoo/owl";
import { registry as webRegistry } from "@web/core/registry";

/**
 * BPMN OWL Component Auto-Mount - Production Implementation with Memory Management
 * 
 * Automatically mounts the BPMN OWL component when forms load.
 * Uses Odoo's component registry and proper mounting lifecycle.
 * Implements comprehensive memory management for SPA navigation.
 */

class BPMNMountManager {
    constructor() {
        this.mountedInstances = new Map(); // Track mounted component instances
        this.observers = new Set(); // Track mutation observers
        this.timers = new Set(); // Track timers
        this.isDestroyed = false;
        this.mountAttempts = new Set(); // Track mount attempts to prevent duplicates
        
        // Bind methods to preserve context
        this.cleanup = this.cleanup.bind(this);
        this.mountBPMNComponent = this.mountBPMNComponent.bind(this);
        this.observePageChanges = this.observePageChanges.bind(this);
        
        // Register cleanup on page unload
        window.addEventListener('beforeunload', this.cleanup);
        
    }

    /**
     * Comprehensive cleanup for memory leak prevention
     */
    cleanup() {
        this.isDestroyed = true;
        
        // Clear all timers
        for (const timerId of this.timers) {
            clearTimeout(timerId);
            clearInterval(timerId);
        }
        this.timers.clear();
        
        // Disconnect all mutation observers
        for (const observer of this.observers) {
            if (observer && typeof observer.disconnect === 'function') {
                observer.disconnect();
            }
        }
        this.observers.clear();
        
        // Clean up mounted component instances
        for (const [mountPoint, instance] of this.mountedInstances) {
            try {
                // Remove mount marker
                if (mountPoint && mountPoint.hasAttribute) {
                    mountPoint.removeAttribute('data-bpmn-mounted');
                }
                
                // Clear mount point content
                if (mountPoint && mountPoint.innerHTML) {
                    mountPoint.innerHTML = '';
                }
                
            } catch (error) {
                console.warn('BPMNMountManager: Error cleaning mounted instance:', error);
            }
        }
        this.mountedInstances.clear();
        this.mountAttempts.clear();
        
    }

    /**
     * Safe timer creation with tracking
     */
    safeSetTimeout(callback, delay) {
        if (this.isDestroyed) return null;
        
        const timerId = setTimeout(() => {
            this.timers.delete(timerId);
            if (!this.isDestroyed) {
                callback();
            }
        }, delay);
        
        this.timers.add(timerId);
        return timerId;
    }

    /**
     * Mount BPMN component with memory management
     */
    mountBPMNComponent() {
        if (this.isDestroyed) return;
        
        // Only try to mount if we're on a page that might have BPMN content
        const isBPMNPage = document.querySelector('textarea[id*="bpmn_xml"]') || 
                           document.getElementById('bpmn-owl-mount-point') ||
                           window.location.href.includes('bpmn.process');
        
        if (!isBPMNPage) {
            return;
        }
        
        
        // Wait for the mount point to be available
        const checkForMountPoint = (attempts = 0) => {
            if (this.isDestroyed) return;
            
            const mountPoint = document.getElementById('bpmn-owl-mount-point');
            const mountKey = mountPoint ? mountPoint.toString() : 'no-mount-point';
            
            if (mountPoint && !mountPoint.hasAttribute('data-bpmn-mounted') && 
                !this.mountAttempts.has(mountKey)) {
                
                this.mountAttempts.add(mountKey);
                
                try {
                    // Get the registered component
                    const BPMNComponent = webRegistry.category("components").get("BPMNOwlComponent");
                    
                    if (!BPMNComponent) {
                        throw new Error('BPMNOwlComponent not found in registry');
                    }
                    
                    // Mount the component
                    const instance = owlMount(BPMNComponent, mountPoint, {
                        env: {}, // Use default environment
                    });
                    
                    // Track the mounted instance
                    this.mountedInstances.set(mountPoint, instance);
                    mountPoint.setAttribute('data-bpmn-mounted', 'true');
                    
                    
                } catch (error) {
                    console.error('BPMNMountManager: Mount failed:', error);
                    this.mountAttempts.delete(mountKey);
                    
                    // Show error in mount point
                    if (mountPoint && !this.isDestroyed) {
                        mountPoint.innerHTML = `
                            <div class="alert alert-danger">
                                <h5>OWL Component Mount Failed</h5>
                                <p><strong>Error:</strong> ${error.message}</p>
                                <p>Please refresh the page or contact support.</p>
                            </div>
                        `;
                    }
                }
                
            } else if (mountPoint && mountPoint.hasAttribute('data-bpmn-mounted')) {
            } else if (attempts < 10 && !this.isDestroyed) {
                this.safeSetTimeout(() => checkForMountPoint(attempts + 1), 500);
            } else if (!this.isDestroyed) {
            }
        };
        
        // Start checking
        checkForMountPoint();
    }

    /**
     * Monitor for page changes in Odoo's SPA with memory management
     */
    observePageChanges() {
        if (this.isDestroyed) return;
        
        // Ensure document.body exists before starting observer
        if (!document.body) {
            this.safeSetTimeout(() => this.observePageChanges(), 100);
            return;
        }
        
        // Use MutationObserver to detect when new content is loaded
        const observer = new MutationObserver((mutations) => {
            if (this.isDestroyed) return;
            
            let shouldCheckMount = false;
            
            mutations.forEach((mutation) => {
                if (this.isDestroyed) return;
                
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
                                break;
                            }
                        }
                    }
                }
            });
            
            if (shouldCheckMount && !this.isDestroyed) {
                // Small delay to ensure DOM is stable
                this.safeSetTimeout(this.mountBPMNComponent, 200);
            }
        });
        
        // Track observer for cleanup
        this.observers.add(observer);
        
        // Start observing
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
    }

    /**
     * Initialize everything when DOM is ready
     */
    initialize() {
        if (this.isDestroyed) return;
        
        
        // Initial mount attempt
        this.safeSetTimeout(this.mountBPMNComponent, 1000);
        
        // Start observing for SPA navigation
        this.observePageChanges();
        
    }
}

// Create global instance with memory management
const mountManager = new BPMNMountManager();

// Wait for DOM to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => mountManager.initialize());
} else {
    // DOM is already ready
    mountManager.initialize();
}

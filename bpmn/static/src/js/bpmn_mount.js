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
        
        // Clean up mounted instances
        for (const [mountPoint, instance] of this.mountedInstances) {
            try {
                if (instance && typeof instance.destroy === 'function') {
                    instance.destroy();
                }
                if (mountPoint) {
                    mountPoint.removeAttribute('data-bpmn-mounted');
                    mountPoint.removeAttribute('data-persistent');
                }
            } catch (error) {
                console.warn('BPMNMountManager: Error cleaning mounted instance:', error);
            }
        }
        this.mountedInstances.clear();
        
        console.log('BPMNMountManager: Cleanup completed');
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
     * Mount BPMN Component when available
     */
    mountBPMNComponent() {
        if (this.isDestroyed) {
            return;
        }
        
        console.log('BPMNMountManager: Attempting to mount BPMN component...');
        
        // Only mount on BPMN-related pages
        const isBPMNPage = document.querySelector('[name="bpmn_xml"]') ||
                           document.getElementById('bpmn-owl-mount-point') ||
                           window.location.href.includes('bpmn.process');
        
        if (!isBPMNPage) {
            return;
        }
        
        
        // Wait for the mount point to be available
        const checkForMountPoint = async (attempts = 0) => {
            if (this.isDestroyed) return;
            
            const mountPoint = document.getElementById('bpmn-owl-mount-point');
            
            // Helper functions for record and XML access
            const getRecordId = () => {
                const urlMatch = window.location.href.match(/\/(\d+)$/);
                if (urlMatch) return parseInt(urlMatch[1]);
                
                const formElement = document.querySelector('form.o_form_view');
                if (formElement && formElement.dataset.recordId) {
                    return parseInt(formElement.dataset.recordId);
                }
                
                return null;
            };
            
            const getXMLContent = () => {
                const xmlField = document.querySelector('textarea[name="bpmn_xml"]');
                return xmlField ? xmlField.value : null;
            };
            
            if (mountPoint && !mountPoint.hasAttribute('data-bpmn-mounting')) {
                
                // Check if this is a record change scenario
                const existingInstance = this.mountedInstances.get(mountPoint);
                const currentRecordId = getRecordId();
                const needsRemount = existingInstance && existingInstance.lastRecordId !== currentRecordId;
                
                if (mountPoint.hasAttribute('data-bpmn-mounted') && !needsRemount) {
                    console.log('BPMNMountManager: Mount point already mounted and record unchanged, skipping');
                    return;
                }
                
                // Immediately mark as mounting to prevent duplicates
                mountPoint.setAttribute('data-bpmn-mounting', 'true');
                
                try {
                    // Get the registered component
                    const BPMNComponent = webRegistry.category("components").get("BPMNOwlComponent");
                    
                    if (!BPMNComponent) {
                        throw new Error('BPMNOwlComponent not found in registry');
                    }
                    
                    // Check if mount point is being reused (tab switch)
                    const existingInstance = this.mountedInstances.get(mountPoint);
                    const currentRecordId = getRecordId();
                    
                    console.log(`BPMNMountManager: Current record ID: ${currentRecordId}`);
                    console.log(`BPMNMountManager: Existing instance:`, existingInstance);
                    console.log(`BPMNMountManager: Existing instance record ID:`, existingInstance?.lastRecordId);
                    
                    if (existingInstance && !existingInstance.isDestroyed) {
                        // Check if the record ID has changed
                        if (existingInstance.lastRecordId !== currentRecordId) {
                            console.log(`BPMNMountManager: Record changed from ${existingInstance.lastRecordId} to ${currentRecordId}, destroying and recreating component`);
                            try {
                                // If existingInstance is a Promise, wait for it to resolve
                                if (existingInstance instanceof Promise) {
                                    const instance = await existingInstance;
                                    if (instance && typeof instance.destroy === 'function') {
                                        instance.destroy();
                                    }
                                } else if (typeof existingInstance.destroy === 'function') {
                                    existingInstance.destroy();
                                }
                            } catch (e) {
                                console.log('Error destroying existing instance:', e);
                            }
                            this.mountedInstances.delete(mountPoint);
                            mountPoint.removeAttribute('data-bpmn-mounted');
                            mountPoint.removeAttribute('data-persistent');
                            // Clear the mount point content to prevent innerHTML conflicts
                            mountPoint.innerHTML = '';
                            // Continue to create new instance below
                        } else {
                            console.log('BPMNMountManager: Reusing existing component instance for same record');
                            mountPoint.setAttribute('data-bpmn-mounted', 'true');
                            mountPoint.removeAttribute('data-bpmn-mounting');
                            return;
                        }
                    } else if (existingInstance) {
                        console.log('BPMNMountManager: Existing instance is destroyed, cleaning up');
                        this.mountedInstances.delete(mountPoint);
                        mountPoint.removeAttribute('data-bpmn-mounted');
                        mountPoint.removeAttribute('data-persistent');
                        // Clear the mount point content to prevent innerHTML conflicts
                        mountPoint.innerHTML = '';
                    }

                    // Create a reactive record object that updates when the page changes
                    const createRecordProxy = () => {
                        let currentRecordId = getRecordId();
                        
                        return new Proxy({}, {
                            get(target, prop) {
                                if (prop === 'data') {
                                    const currentId = getRecordId();
                                    return {
                                        id: currentId,
                                        bpmn_xml: getXMLContent()
                                    };
                                } else if (prop === 'update') {
                                    return (values) => {
                                        // Update the form field when component saves
                                        if (values.bpmn_xml) {
                                            const xmlField = document.querySelector('textarea[name="bpmn_xml"]');
                                            if (xmlField) {
                                                xmlField.value = values.bpmn_xml;
                                                // Trigger change event to notify Odoo
                                                xmlField.dispatchEvent(new Event('change', { bubbles: true }));
                                            }
                                        }
                                    };
                                }
                                return target[prop];
                            }
                        });
                    };

                    // Mount the component with reactive record data and RPC service
                    const instance = owlMount(BPMNComponent, mountPoint, {
                        env: {
                            services: {
                                rpc: async (endpoint, params) => {
                                    console.log('RPC call:', endpoint, params);
                                    
                                    // Make actual RPC call to Odoo backend
                                    try {
                                        const response = await fetch(endpoint, {
                                            method: 'POST',
                                            headers: {
                                                'Content-Type': 'application/json',
                                                'X-Requested-With': 'XMLHttpRequest'
                                            },
                                            credentials: 'same-origin',
                                            body: JSON.stringify({
                                                jsonrpc: '2.0',
                                                method: 'call',
                                                params: params,
                                                id: Date.now()
                                            })
                                        });
                                        
                                        const data = await response.json();
                                        console.log('RPC response:', data);
                                        
                                        if (data.error) {
                                            throw new Error(data.error.message || 'RPC Error');
                                        }
                                        
                                        return data.result;
                                        
                                    } catch (error) {
                                        console.error('RPC Error:', error);
                                        return { success: false, error: error.message };
                                    }
                                }
                            }
                        },
                        props: {
                            record: createRecordProxy(),
                            persistAcrossTabSwitches: true,
                            mountPoint: mountPoint
                        }
                    });
                    
                    // Wait for the instance to be fully created and then store it
                    const componentInstance = await instance;
                    
                    // Track the current record ID on the instance for change detection
                    componentInstance.lastRecordId = currentRecordId;
                    
                    // Track the mounted instance (store the actual component, not the Promise)
                    this.mountedInstances.set(mountPoint, componentInstance);
                    mountPoint.setAttribute('data-bpmn-mounted', 'true');
                    mountPoint.setAttribute('data-persistent', 'true'); // Mark as persistent
                    mountPoint.removeAttribute('data-bpmn-mounting'); // Clear mounting flag
                    
                    console.log('BPMNMountManager: Component mounted successfully with persistence support');
                    
                } catch (error) {
                    console.error('BPMNMountManager: Mount failed:', error);
                    mountPoint.removeAttribute('data-bpmn-mounting'); // Clear mounting flag on error
                    
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
            } else if (!mountPoint && attempts < 10) {
                // Retry mounting with exponential backoff
                const delay = Math.min(1000 * Math.pow(2, attempts), 5000);
                console.log(`BPMNMountManager: Mount point not found, retrying in ${delay}ms (attempt ${attempts + 1}/10)`);
                this.safeSetTimeout(() => checkForMountPoint(attempts + 1), delay);
            }
        };
        
        // Start checking for mount point
        checkForMountPoint();
    }

    /**
     * Observe page changes for SPA navigation
     */
    observePageChanges() {
        if (this.isDestroyed) {
            return;
        }
        
        console.log('BPMNMountManager: Setting up page change observers...');
        
        // Method 1: URL change detection for SPA navigation
        let currentUrl = window.location.href;
        const checkUrlChange = () => {
            if (this.isDestroyed) return;
            
            if (window.location.href !== currentUrl) {
                currentUrl = window.location.href;
                console.log('BPMNMountManager: URL changed, attempting mount:', currentUrl);
                this.safeSetTimeout(() => this.mountBPMNComponent(), 500);
            }
            
            this.safeSetTimeout(checkUrlChange, 1000);
        };
        this.safeSetTimeout(checkUrlChange, 1000);
        
        // Method 2: DOM mutation observer for dynamic content
        const observer = new MutationObserver((mutations) => {
            if (this.isDestroyed) return;
            
            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    // Check for new nodes
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            // Check if the mount point was added
                            if (node.id === 'bpmn-owl-mount-point' || 
                                node.querySelector('#bpmn-owl-mount-point')) {
                                console.log('BPMNMountManager: Mount point detected in DOM, attempting mount...');
                                this.safeSetTimeout(() => this.mountBPMNComponent(), 100);
                                break;
                            }
                        }
                    }
                }
            }
        });
        
        // Only observe if document.body exists
        if (document.body) {
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
            this.observers.add(observer);
        } else {
            // Wait for document.body to be available
            const waitForBody = () => {
                if (document.body && !this.isDestroyed) {
                    observer.observe(document.body, {
                        childList: true,
                        subtree: true
                    });
                    this.observers.add(observer);
                } else if (!this.isDestroyed) {
                    this.safeSetTimeout(waitForBody, 50);
                }
            };
            this.safeSetTimeout(waitForBody, 50);
        }
        
        // Method 3: Page load and navigation events
        const handleNavigation = () => {
            if (this.isDestroyed) return;
            console.log('BPMNMountManager: Navigation event detected, attempting mount...');
            this.safeSetTimeout(() => this.mountBPMNComponent(), 300);
        };
        
        window.addEventListener('popstate', handleNavigation);
        window.addEventListener('hashchange', handleNavigation);
        
        // Method 4: Document ready state changes
        if (document.readyState !== 'complete') {
            const handleReadyStateChange = () => {
                if (this.isDestroyed) return;
                if (document.readyState === 'complete') {
                    console.log('BPMNMountManager: Document ready, attempting mount...');
                    this.safeSetTimeout(() => this.mountBPMNComponent(), 100);
                    document.removeEventListener('readystatechange', handleReadyStateChange);
                }
            };
            document.addEventListener('readystatechange', handleReadyStateChange);
        }
        
        console.log('BPMNMountManager: Page change observers configured');
    }

    /**
     * Initialize the mount manager
     */
    init() {
        if (this.isDestroyed) {
            return;
        }
        
        console.log('BPMNMountManager: Initializing...');
        
        // Start observing page changes
        this.observePageChanges();
        
        // Attempt immediate mount if DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.safeSetTimeout(() => this.mountBPMNComponent(), 100);
            });
        } else {
            this.safeSetTimeout(() => this.mountBPMNComponent(), 100);
        }
        
        console.log('BPMNMountManager: Initialization complete');
    }
}

// Create global instance and initialize safely (singleton pattern)
if (!window.bpmnMountManager) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            if (!window.bpmnMountManager) { // Double-check after DOM load
                window.bpmnMountManager = new BPMNMountManager();
                window.bpmnMountManager.init();
            }
        });
    } else {
        window.bpmnMountManager = new BPMNMountManager();
        window.bpmnMountManager.init();
    }
    
    console.log('BPMNMountManager: Script loaded and manager will initialize when DOM is ready');
} else {
    console.log('BPMNMountManager: Manager already exists, skipping initialization');
}

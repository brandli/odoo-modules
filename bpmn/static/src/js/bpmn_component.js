/** @odoo-module **/

import { Component, useRef, onMounted, onWillDestroy, useState, xml } from "@odoo/owl";
import { registry as webRegistry } from "@web/core/registry";

/**
 * BPMN OWL Component - Production Implementation
 * 
 * Architecture-compliant OWL component implementing:
 * - Enhanced memory management with proper lifecycle hooks
 * - Container-based integration using useRef
 * - Reactive state management with useState
 * - Proper cleanup and resource management
 */
export class BPMNOwlComponent extends Component {
    static template = xml`
        <div class="bpmn-owl-component">
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h5 class="mb-0">BPMN Diagram Viewer (OWL)</h5>
                <div class="btn-toolbar" role="toolbar">
                    <div class="btn-group me-2" role="group">
                        <button type="button" 
                                class="btn btn-primary btn-sm" 
                                t-on-click="loadDiagram"
                                t-att-disabled="state.loading">
                            <i t-if="state.loading" class="fa fa-spinner fa-spin"/>
                            <i t-else="" class="fa fa-refresh"/>
                            <span t-if="state.loading"> Loading...</span>
                            <span t-else=""> Load Diagram</span>
                        </button>
                    </div>
                    <div class="btn-group" role="group" t-if="state.loaded">
                        <button type="button" 
                                class="btn btn-outline-secondary btn-sm" 
                                t-on-click="zoomFit"
                                title="Fit diagram to viewport">
                            <i class="fa fa-expand"/> Fit
                        </button>
                        <button type="button" 
                                class="btn btn-outline-secondary btn-sm" 
                                t-on-click="zoomIn"
                                title="Zoom in">
                            <i class="fa fa-plus"/>
                        </button>
                        <button type="button" 
                                class="btn btn-outline-secondary btn-sm" 
                                t-on-click="zoomOut"
                                title="Zoom out">
                            <i class="fa fa-minus"/>
                        </button>
                    </div>
                    <div class="btn-group me-2" role="group" t-if="state.loaded">
                        <button type="button" 
                                class="btn btn-outline-info btn-sm" 
                                t-on-click="panLeft"
                                title="Pan left">
                            <i class="fa fa-arrow-left"/>
                        </button>
                        <button type="button" 
                                class="btn btn-outline-info btn-sm" 
                                t-on-click="panUp"
                                title="Pan up">
                            <i class="fa fa-arrow-up"/>
                        </button>
                        <button type="button" 
                                class="btn btn-outline-info btn-sm" 
                                t-on-click="panDown"
                                title="Pan down">
                            <i class="fa fa-arrow-down"/>
                        </button>
                        <button type="button" 
                                class="btn btn-outline-info btn-sm" 
                                t-on-click="panRight"
                                title="Pan right">
                            <i class="fa fa-arrow-right"/>
                        </button>
                    </div>
                    <div class="btn-group" role="group" t-if="state.loaded">
                        <button type="button" 
                                class="btn btn-outline-secondary btn-sm" 
                                t-on-click="clearSelection"
                                t-att-disabled="!state.selectedElement"
                                title="Clear selection">
                            <i class="fa fa-times"/> Clear
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- Status bar -->
            <div t-if="state.loaded" class="small text-muted mb-2 d-flex justify-content-between">
                <div>
                    <span t-if="state.diagramTitle">
                        <i class="fa fa-sitemap"/> <strong t-esc="state.diagramTitle"/>
                    </span>
                    <span class="ms-3" t-if="state.elementCount > 0">
                        Elements: <span t-esc="state.elementCount"/>
                    </span>
                </div>
                <div>
                    <span t-if="state.selectedElement">
                        Selected: <code t-esc="state.selectedElement"/>
                    </span>
                    <span class="ms-3">
                        Zoom: <span t-esc="Math.round(state.zoomLevel * 100)"/>%
                    </span>
                </div>
            </div>

            <!-- Circuit Breaker Status Indicator -->
            <div t-if="state.isCircuitOpen" 
                 class="alert alert-warning mb-2 small d-flex justify-content-between align-items-center">
                <div>
                    <i class="fa fa-shield-alt"/> 
                    <strong>System Protection Active</strong> - 
                    Error threshold reached. 
                    <span t-if="state.recoveryInProgress">
                        <i class="fa fa-spinner fa-spin"/> Automatic recovery in progress.
                    </span>
                    <span t-else="">
                        Waiting for cooldown period.
                    </span>
                </div>
                <button type="button" 
                        class="btn btn-outline-warning btn-sm" 
                        t-on-click="manualResetCircuitBreaker"
                        title="Manually reset error protection">
                    <i class="fa fa-refresh"/> Reset
                </button>
            </div>
            
            <div t-if="state.message" 
                 class="alert mb-3"
                 t-att-class="state.error ? 'alert-danger' : 'alert-success'">
                <i t-if="state.error" class="fa fa-exclamation-triangle"/>
                <i t-else="" class="fa fa-check"/>
                <span t-esc="state.message"/>
            </div>
            
            <div t-ref="bpmnContainer" 
                 class="bpmn-canvas" 
                 style="height: 400px; border: 1px solid #dee2e6; background: #fafafa;">
                <div t-if="!state.loaded" 
                     class="d-flex align-items-center justify-content-center h-100 text-muted">
                    <div class="text-center">
                        <i class="fa fa-sitemap fa-3x mb-3"/>
                        <div>Click "Load Diagram" to view BPMN</div>
                    </div>
                </div>
            </div>
        </div>
    `;

    setup() {
        this.containerRef = useRef("bpmnContainer");
        this.state = useState({
            loading: false,
            loaded: false,
            message: "",
            error: false,
            // Enhanced state management
            selectedElement: null,
            zoomLevel: 1,
            elementCount: 0,
            diagramTitle: '',
            lastModified: null,
            viewChanged: 0,
            // Error boundary state
            isCircuitOpen: false,
            errorCount: 0,
            recoveryInProgress: false
        });
        
        // Comprehensive memory management tracking
        this.viewer = null;
        this.eventListeners = new Map(); // Track all event listeners for cleanup
        this.timers = new Set(); // Track all timers for cleanup
        this.animationFrames = new Set(); // Track animation frames for cleanup
        this.canvasContexts = new Set(); // Track canvas contexts for cleanup
        this.observables = new Set(); // Track observables/subscriptions for cleanup
        this.domReferences = new WeakMap(); // Weak references to prevent memory leaks
        this.isDestroyed = false; // Prevent operations after destruction
        
        // Error boundary and circuit breaker patterns
        this.errorCount = 0; // Track consecutive errors
        this.lastErrorTime = null; // Track last error timestamp
        this.isCircuitOpen = false; // Circuit breaker state
        this.recoveryAttempts = 0; // Track recovery attempts
        this.maxRetries = 3; // Maximum retry attempts
        this.circuitBreakerThreshold = 3; // Errors before circuit opens
        this.circuitBreakerCooldown = 30000; // 30 seconds cooldown
        this.baseRetryDelay = 1000; // Base delay for exponential backoff (1 second)
        
        onMounted(() => {
            console.log('BPMNOwlComponent: Mounted successfully');
            this.isDestroyed = false;
            // Component ready - no UI message needed
        });
        
        onWillDestroy(() => {
            console.log('BPMNOwlComponent: Starting comprehensive cleanup...');
            this.isDestroyed = true;
            this.performComprehensiveCleanup();
        });
    }

    /**
     * Performs comprehensive memory management cleanup as recommended by architecture
     * Prevents memory leaks from event listeners, timers, canvas contexts, and DOM references
     */
    performComprehensiveCleanup() {
        console.log('BPMNOwlComponent: Performing comprehensive cleanup...');
        
        // 1. Cancel all pending animation frames
        for (const frameId of this.animationFrames) {
            cancelAnimationFrame(frameId);
            console.log('BPMNOwlComponent: Cancelled animation frame:', frameId);
        }
        this.animationFrames.clear();
        
        // 2. Clear all timers (timeouts and intervals)
        for (const timerId of this.timers) {
            clearTimeout(timerId);
            clearInterval(timerId);
            console.log('BPMNOwlComponent: Cleared timer:', timerId);
        }
        this.timers.clear();
        
        // 3. Clean up all observables and subscriptions
        for (const observable of this.observables) {
            if (observable && typeof observable.unsubscribe === 'function') {
                observable.unsubscribe();
                console.log('BPMNOwlComponent: Unsubscribed from observable');
            }
        }
        this.observables.clear();
        
        // 4. Clean up all canvas contexts
        for (const context of this.canvasContexts) {
            try {
                // Try different cleanup approaches based on context type
                if (context && typeof context.clearRect === 'function') {
                    // HTML5 Canvas context
                    const canvas = context.canvas;
                    if (canvas) {
                        context.clearRect(0, 0, canvas.width, canvas.height);
                        console.log('BPMNOwlComponent: Cleared HTML5 canvas context');
                    }
                } else if (context && context.remove && typeof context.remove === 'function') {
                    // DOM element that can be removed
                    context.remove();
                    console.log('BPMNOwlComponent: Removed DOM canvas element');
                } else if (context && context.innerHTML !== undefined) {
                    // DOM element that can be cleared
                    context.innerHTML = '';
                    console.log('BPMNOwlComponent: Cleared DOM element content');
                } else {
                    console.log('BPMNOwlComponent: Canvas context type not recognized, skipping cleanup');
                }
            } catch (error) {
                console.warn('BPMNOwlComponent: Error cleaning canvas context:', error);
                // Continue with other cleanup even if one fails
            }
        }
        this.canvasContexts.clear();
        
        // 5. Remove BPMN.js viewer and all its event listeners
        if (this.viewer) {
            try {
                // Remove all tracked event listeners explicitly
                for (const [eventName, handler] of this.eventListeners) {
                    this.viewer.off(eventName, handler);
                    console.log('BPMNOwlComponent: Removed event listener:', eventName);
                }
                this.eventListeners.clear();
                
                // Additional BPMN.js cleanup with defensive programming
                try {
                    const eventBus = this.viewer.get('eventBus');
                    if (eventBus && typeof eventBus.off === 'function') {
                        // Remove any remaining listeners from event bus
                        eventBus.off();
                        console.log('BPMNOwlComponent: Cleared BPMN.js event bus');
                    }
                } catch (error) {
                    console.warn('BPMNOwlComponent: Could not access BPMN.js event bus:', error);
                }
                
                // Clean up internal BPMN.js services defensively
                try {
                    const canvas = this.viewer.get('canvas');
                    if (canvas) {
                        // Try to get canvas context for tracking (defensive)
                        let canvasElement = null;
                        
                        if (canvas._svg && typeof canvas._svg.node === 'function') {
                            canvasElement = canvas._svg.node();
                        } else if (canvas._svg && canvas._svg.element) {
                            canvasElement = canvas._svg.element;
                        } else if (canvas._container) {
                            canvasElement = canvas._container;
                        }
                        
                        if (canvasElement) {
                            this.canvasContexts.add(canvasElement);
                            console.log('BPMNOwlComponent: Added canvas element to cleanup queue');
                        }
                    }
                } catch (error) {
                    console.warn('BPMNOwlComponent: Could not access BPMN.js canvas for cleanup:', error);
                }
                
                // Destroy BPMN.js viewer instance
                this.viewer.destroy();
                console.log('BPMNOwlComponent: BPMN viewer destroyed');
                
            } catch (error) {
                console.error('BPMNOwlComponent: Error during viewer cleanup:', error);
            } finally {
                this.viewer = null;
            }
        }
        
        // 6. Clear DOM references and container
        if (this.containerRef && this.containerRef.el) {
            // Clear container content
            this.containerRef.el.innerHTML = '';
            
            // Remove any remaining event listeners from container
            const container = this.containerRef.el;
            const newContainer = container.cloneNode(false);
            if (container.parentNode) {
                container.parentNode.replaceChild(newContainer, container);
            }
        }
        
        // 7. Reset all state to prevent stale references
        try {
            Object.assign(this.state, {
                loading: false,
                loaded: false,
                message: "",
                error: false,
                selectedElement: null,
                zoomLevel: 1,
                elementCount: 0,
                diagramTitle: '',
                lastModified: null,
                viewChanged: 0
            });
        } catch (error) {
            console.warn('BPMNOwlComponent: Error resetting state:', error);
        }
        
        // 8. Clear WeakMap references
        this.domReferences = new WeakMap();
        
        console.log('BPMNOwlComponent: Comprehensive cleanup completed');
    }

    /**
     * Safe timer management methods for memory leak prevention
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

    safeSetInterval(callback, delay) {
        if (this.isDestroyed) return null;
        
        const intervalId = setInterval(() => {
            if (this.isDestroyed) {
                clearInterval(intervalId);
                this.timers.delete(intervalId);
                return;
            }
            callback();
        }, delay);
        
        this.timers.add(intervalId);
        return intervalId;
    }

    safeRequestAnimationFrame(callback) {
        if (this.isDestroyed) return null;
        
        const frameId = requestAnimationFrame(() => {
            this.animationFrames.delete(frameId);
            if (!this.isDestroyed) {
                callback();
            }
        });
        
        this.animationFrames.add(frameId);
        return frameId;
    }

    /**
     * Safe canvas context management
     */
    trackCanvasContext(context) {
        if (!context || this.isDestroyed) {
            return;
        }
        
        try {
            // Validate that this is a trackable context
            const isValidContext = 
                (typeof context.clearRect === 'function') ||  // HTML5 Canvas context
                (context.remove && typeof context.remove === 'function') ||  // DOM element
                (context.innerHTML !== undefined);  // DOM element with innerHTML
            
            if (isValidContext) {
                this.canvasContexts.add(context);
                console.log('BPMNOwlComponent: Canvas context tracked for cleanup');
            } else {
                console.warn('BPMNOwlComponent: Context not trackable:', typeof context);
            }
        } catch (error) {
            console.warn('BPMNOwlComponent: Error tracking canvas context:', error);
        }
    }

    /**
     * Safe observable subscription management
     */
    trackObservable(observable) {
        if (observable && !this.isDestroyed) {
            this.observables.add(observable);
        }
        return observable;
    }

    /**
     * Error Boundary and Circuit Breaker Patterns
     * Implements resilient error handling with automatic recovery
     */

    /**
     * Check if circuit breaker should prevent operations
     */
    isCircuitBreakerOpen() {
        if (!this.isCircuitOpen) return false;
        
        // Check if cooldown period has passed
        const now = Date.now();
        if (this.lastErrorTime && (now - this.lastErrorTime) > this.circuitBreakerCooldown) {
            console.log('BPMNOwlComponent: Circuit breaker cooldown expired, attempting recovery');
            this.resetCircuitBreaker();
            return false;
        }
        
        return true;
    }

    /**
     * Record an error and update circuit breaker state
     */
    recordError(error, operation = 'unknown') {
        this.errorCount++;
        this.lastErrorTime = Date.now();
        
        // Update state for UI
        if (!this.isDestroyed) {
            this.state.errorCount = this.errorCount;
        }
        
        console.error(`BPMNOwlComponent: Error in ${operation} (count: ${this.errorCount}):`, error);
        
        // Open circuit breaker if threshold reached
        if (this.errorCount >= this.circuitBreakerThreshold) {
            this.isCircuitOpen = true;
            
            // Update state for UI
            if (!this.isDestroyed) {
                this.state.isCircuitOpen = true;
                this.state.error = true;
                this.state.message = `⚠️ System protection activated. Too many errors detected. Please wait ${Math.round(this.circuitBreakerCooldown/1000)} seconds before trying again.`;
            }
            
            console.warn('BPMNOwlComponent: Circuit breaker opened due to excessive errors');
            
            // Auto-recovery timer
            this.safeSetTimeout(() => {
                if (!this.isDestroyed) {
                    this.attemptRecovery();
                }
            }, this.circuitBreakerCooldown);
        }
    }

    /**
     * Record successful operation and potentially reset error count
     */
    recordSuccess(operation = 'unknown') {
        console.log(`BPMNOwlComponent: Successful ${operation} operation`);
        
        // Gradually reduce error count on success
        if (this.errorCount > 0) {
            this.errorCount = Math.max(0, this.errorCount - 1);
            console.log(`BPMNOwlComponent: Error count reduced to ${this.errorCount}`);
        }
        
        // Reset circuit breaker if it was open
        if (this.isCircuitOpen) {
            this.resetCircuitBreaker();
        }
    }

    /**
     * Reset circuit breaker to closed state
     */
    resetCircuitBreaker() {
        this.isCircuitOpen = false;
        this.errorCount = 0;
        this.recoveryAttempts = 0;
        this.lastErrorTime = null;
        
        // Update state for UI
        if (!this.isDestroyed) {
            this.state.isCircuitOpen = false;
            this.state.errorCount = 0;
            this.state.recoveryInProgress = false;
            
            if (this.state.error && this.state.message.includes('System protection activated')) {
                this.state.error = false;
                this.state.message = '';
            }
        }
        
        console.log('BPMNOwlComponent: Circuit breaker reset to closed state');
    }

    /**
     * Attempt automatic recovery from circuit breaker state
     */
    async attemptRecovery() {
        if (this.isDestroyed) return;
        
        this.recoveryAttempts++;
        
        // Update state for UI
        if (!this.isDestroyed) {
            this.state.recoveryInProgress = true;
        }
        
        console.log(`BPMNOwlComponent: Attempting recovery (attempt ${this.recoveryAttempts})`);
        
        try {
            // Test if BPMN.js is available
            if (typeof window.BpmnJS === 'undefined') {
                throw new Error('BPMN.js library still not available');
            }
            
            // Test basic functionality
            const testViewer = new window.BpmnJS();
            testViewer.destroy(); // Immediate cleanup
            
            // Recovery successful
            this.resetCircuitBreaker();
            
            if (!this.isDestroyed) {
                this.state.message = '✅ System recovered automatically. You can try loading the diagram again.';
            }
            
            // Clear recovery message after a delay
            this.safeSetTimeout(() => {
                if (!this.isDestroyed && this.state.message.includes('System recovered')) {
                    this.state.message = '';
                }
            }, 5000);
            
        } catch (error) {
            console.warn('BPMNOwlComponent: Recovery attempt failed:', error);
            
            // Update state
            if (!this.isDestroyed) {
                this.state.recoveryInProgress = false;
            }
            
            // Extend cooldown if recovery fails
            if (this.recoveryAttempts < 3) {
                const nextRecoveryDelay = this.circuitBreakerCooldown * (this.recoveryAttempts + 1);
                this.safeSetTimeout(() => {
                    if (!this.isDestroyed) {
                        this.attemptRecovery();
                    }
                }, nextRecoveryDelay);
            } else {
                if (!this.isDestroyed) {
                    this.state.message = '❌ Automatic recovery failed. Please refresh the page.';
                }
            }
        }
    }

    /**
     * Execute operation with retry and exponential backoff
     */
    async executeWithRetry(operation, operationName, maxAttempts = null) {
        const attempts = maxAttempts || this.maxRetries;
        
        for (let attempt = 1; attempt <= attempts; attempt++) {
            try {
                if (this.isDestroyed) {
                    throw new Error('Component destroyed during operation');
                }
                
                // Check circuit breaker before each attempt
                if (this.isCircuitBreakerOpen()) {
                    throw new Error('Circuit breaker is open - operation blocked');
                }
                
                console.log(`BPMNOwlComponent: Executing ${operationName} (attempt ${attempt}/${attempts})`);
                
                const result = await operation();
                
                // Record success
                this.recordSuccess(operationName);
                return result;
                
            } catch (error) {
                console.warn(`BPMNOwlComponent: ${operationName} attempt ${attempt} failed:`, error);
                
                // Record error
                this.recordError(error, operationName);
                
                // If this is the last attempt or circuit breaker is open, throw the error
                if (attempt === attempts || this.isCircuitBreakerOpen()) {
                    throw error;
                }
                
                // Calculate exponential backoff delay
                const delay = this.baseRetryDelay * Math.pow(2, attempt - 1);
                const jitter = Math.random() * 1000; // Add jitter to prevent thundering herd
                const totalDelay = delay + jitter;
                
                console.log(`BPMNOwlComponent: Retrying ${operationName} in ${Math.round(totalDelay)}ms`);
                
                // Wait before retry
                await new Promise(resolve => {
                    this.safeSetTimeout(resolve, totalDelay);
                });
            }
        }
    }

    /**
     * Safe error boundary wrapper for any operation
     */
    async safeExecute(operation, operationName, fallback = null) {
        try {
            if (this.isDestroyed) {
                console.warn(`BPMNOwlComponent: Cannot execute ${operationName} - component destroyed`);
                return fallback;
            }
            
            return await operation();
            
        } catch (error) {
            console.error(`BPMNOwlComponent: Safe execution failed for ${operationName}:`, error);
            this.recordError(error, operationName);
            
            // Show user-friendly error message
            if (!this.isDestroyed) {
                this.state.error = true;
                this.state.message = `❌ ${operationName} failed: ${error.message}`;
            }
            
            return fallback;
        }
    }

    async loadDiagram() {
        console.log('BPMNOwlComponent: Loading diagram with error boundary protection...');
        
        // Check circuit breaker before attempting operation
        if (this.isCircuitBreakerOpen()) {
            console.warn('BPMNOwlComponent: Load blocked by circuit breaker');
            return;
        }
        
        // Check if component is destroyed
        if (this.isDestroyed) {
            console.warn('BPMNOwlComponent: Cannot load diagram - component is destroyed');
            return;
        }
        
        // Use retry mechanism for diagram loading
        return this.executeWithRetry(async () => {
            return this.safeExecute(async () => {
                // Reset all states at start
                this.state.loading = true;
                this.state.error = false;
                this.state.loaded = false;
                this.state.message = "";
                
                // Validate preconditions
                const xmlField = document.querySelector('textarea[id*="bpmn_xml"]');
                if (!xmlField || !xmlField.value.trim()) {
                    throw new Error('No BPMN XML data found. Please add BPMN XML content first.');
                }

                const xmlContent = xmlField.value.trim();
                console.log('BPMNOwlComponent: XML content length:', xmlContent.length);

                // Check if BPMN.js is available
                if (typeof window.BpmnJS === 'undefined') {
                    throw new Error('BPMN.js library not loaded. Please refresh the page.');
                }

                // Clean up existing viewer with comprehensive cleanup
                if (this.viewer) {
                    await this.safeExecute(async () => {
                        // Perform partial cleanup for existing viewer
                        for (const [eventName, handler] of this.eventListeners) {
                            this.viewer.off(eventName, handler);
                        }
                        this.eventListeners.clear();
                        
                        this.viewer.destroy();
                        this.viewer = null;
                    }, 'viewer cleanup');
                }

                // Check again if component is destroyed during async operations
                if (this.isDestroyed) {
                    throw new Error('Component destroyed during load operation');
                }

                // Create new viewer with error boundary
                this.viewer = await this.safeExecute(async () => {
                    const viewer = new window.BpmnJS({
                        container: this.containerRef.el
                    });
                    
                    // Track any canvas contexts created by BPMN.js (defensive approach)
                    try {
                        const canvas = viewer.get('canvas');
                        if (canvas) {
                            // Try different ways to access canvas context safely
                            let canvasContext = null;
                            
                            if (canvas._svg && typeof canvas._svg.node === 'function') {
                                canvasContext = canvas._svg.node();
                            } else if (canvas._svg && canvas._svg.element) {
                                canvasContext = canvas._svg.element;
                            } else if (canvas._container) {
                                canvasContext = canvas._container;
                            }
                            
                            if (canvasContext) {
                                this.trackCanvasContext(canvasContext);
                                console.log('BPMNOwlComponent: Canvas context tracked successfully');
                            }
                        }
                    } catch (error) {
                        console.warn('BPMNOwlComponent: Could not track canvas context:', error);
                    }
                    
                    return viewer;
                }, 'viewer creation');

                if (!this.viewer) {
                    throw new Error('Failed to create BPMN viewer');
                }

                // Setup event bridging with error boundary
                await this.safeExecute(async () => {
                    this.setupEventBridge();
                }, 'event bridge setup');

                // Import the XML with safety check
                console.log('BPMNOwlComponent: Importing XML...');
                
                if (this.isDestroyed) {
                    throw new Error('Component destroyed before import');
                }
                
                const result = await this.viewer.importXML(xmlContent);
                
                // Final safety check after async operation
                if (this.isDestroyed) {
                    throw new Error('Component destroyed after import');
                }
                
                if (result.warnings && result.warnings.length > 0) {
                    console.warn('BPMNOwlComponent: Import warnings:', result.warnings);
                }
                
                // Success state
                this.state.loaded = true;
                this.state.error = false;
                this.state.message = "";
                this.state.lastModified = new Date().toISOString();
                
                // Update enhanced state using safe animation frame
                this.safeRequestAnimationFrame(() => {
                    this.updateDiagramInfo();
                });
                
                console.log('BPMNOwlComponent: Diagram loaded successfully');
                return true;
                
            }, 'diagram loading');
        }, 'loadDiagram').catch(error => {
            console.error('BPMNOwlComponent: Load failed after all retries:', error);
            
            // Only update state if component is not destroyed
            if (!this.isDestroyed) {
                this.state.error = true;
                this.state.loaded = false;
                
                // Provide user-friendly error messages based on error type
                if (error.message.includes('Circuit breaker')) {
                    this.state.message = `⚠️ System protection active. Please wait before trying again.`;
                } else if (error.message.includes('BPMN.js library not loaded')) {
                    this.state.message = `❌ BPMN library not available. Please refresh the page.`;
                } else if (error.message.includes('No BPMN XML data found')) {
                    this.state.message = `❌ No BPMN XML content found. Please add valid BPMN XML first.`;
                } else {
                    this.state.message = `❌ Error: ${error.message}`;
                }
            }
        }).finally(() => {
            // Only update loading state if component is not destroyed
            if (!this.isDestroyed) {
                this.state.loading = false;
            }
        });
    }

    setupEventBridge() {
        if (!this.viewer || this.isDestroyed) return;
        
        console.log('BPMNOwlComponent: Setting up event bridge with memory management...');
        
        // Helper function to safely add event listeners with tracking
        const addTrackedListener = (eventName, handler) => {
            if (this.isDestroyed) return;
            
            // Wrap handler to check if component is destroyed
            const wrappedHandler = (...args) => {
                if (!this.isDestroyed) {
                    try {
                        handler(...args);
                    } catch (error) {
                        console.error(`BPMNOwlComponent: Error in ${eventName} handler:`, error);
                    }
                }
            };
            
            this.viewer.on(eventName, wrappedHandler);
            this.eventListeners.set(eventName, wrappedHandler);
            console.log('BPMNOwlComponent: Added tracked listener:', eventName);
        };
        
        // Element selection events with memory management
        addTrackedListener('element.click', (event) => {
            if (event.element && event.element.id) {
                this.state.selectedElement = event.element.id;
                console.log('BPMNOwlComponent: Element selected:', event.element.id);
            }
        });
        
        // Clear selection when clicking canvas with memory management
        addTrackedListener('canvas.click', (event) => {
            // Only clear if we clicked on the canvas itself, not an element
            if (!event.element || event.element.type === 'bpmn:Process') {
                this.state.selectedElement = null;
                console.log('BPMNOwlComponent: Selection cleared');
            }
        });
        
        // Zoom/pan events with debouncing and memory management
        let zoomUpdateTimer = null;
        addTrackedListener('canvas.viewbox.changed', () => {
            if (this.isDestroyed) return;
            
            // Clear existing timer
            if (zoomUpdateTimer) {
                clearTimeout(zoomUpdateTimer);
                this.timers.delete(zoomUpdateTimer);
            }
            
            // Debounce zoom updates as recommended by architecture
            zoomUpdateTimer = setTimeout(() => {
                if (!this.isDestroyed && this.viewer) {
                    try {
                        const canvas = this.viewer.get('canvas');
                        const newZoom = Math.round(canvas.zoom() * 100) / 100;
                        if (this.state.zoomLevel !== newZoom) {
                            this.state.zoomLevel = newZoom;
                            this.state.viewChanged = Date.now();
                            console.log('BPMNOwlComponent: Zoom changed to:', newZoom);
                        }
                    } catch (error) {
                        console.error('BPMNOwlComponent: Error updating zoom:', error);
                    }
                }
                this.timers.delete(zoomUpdateTimer);
                zoomUpdateTimer = null;
            }, 150); // 150ms debounce as recommended
            
            this.timers.add(zoomUpdateTimer);
        });
        
        // Import events for better loading state management with memory tracking
        addTrackedListener('import.parse.start', () => {
            console.log('BPMNOwlComponent: Starting XML parse...');
        });
        
        addTrackedListener('import.parse.complete', () => {
            console.log('BPMNOwlComponent: XML parse complete');
        });
        
        addTrackedListener('import.render.start', () => {
            console.log('BPMNOwlComponent: Starting diagram render...');
        });
        
        addTrackedListener('import.render.complete', () => {
            console.log('BPMNOwlComponent: Diagram render complete');
        });
        
        addTrackedListener('import.done', (event) => {
            console.log('BPMNOwlComponent: Import done event received');
            
            // Use animation frame for smooth UI updates
            const frameId = requestAnimationFrame(() => {
                if (!this.isDestroyed) {
                    this.updateDiagramInfo();
                }
                this.animationFrames.delete(frameId);
            });
            this.animationFrames.add(frameId);
        });
        
        console.log('BPMNOwlComponent: Event bridge setup completed with tracking');
    }

    updateDiagramInfo() {
        if (!this.viewer || this.isDestroyed) return;
        
        try {
            // Get element count
            const elementRegistry = this.viewer.get('elementRegistry');
            const elements = elementRegistry.getAll();
            this.state.elementCount = elements.length;
            
            // Get current zoom level
            const canvas = this.viewer.get('canvas');
            this.state.zoomLevel = Math.round(canvas.zoom() * 100) / 100;
            
            // Try to get diagram title from definitions
            const definitions = this.viewer.getDefinitions();
            if (definitions && definitions.name) {
                this.state.diagramTitle = definitions.name;
            } else if (definitions && definitions.rootElements && definitions.rootElements[0]) {
                this.state.diagramTitle = definitions.rootElements[0].name || 'Untitled Process';
            } else {
                this.state.diagramTitle = 'BPMN Diagram';
            }
            
            console.log('BPMNOwlComponent: Updated diagram info:', {
                elements: this.state.elementCount,
                zoom: this.state.zoomLevel,
                title: this.state.diagramTitle
            });
            
        } catch (error) {
            console.warn('BPMNOwlComponent: Could not update diagram info:', error);
        }
    }

    // Advanced interaction methods with memory management and error boundaries
    async zoomFit() {
        return this.safeExecute(async () => {
            if (!this.viewer || !this.state.loaded || this.isDestroyed) {
                throw new Error('Viewer not ready for zoom operation');
            }
            
            const canvas = this.viewer.get('canvas');
            canvas.zoom('fit-viewport');
            
            // Use safe animation frame for UI updates
            this.safeRequestAnimationFrame(() => {
                if (this.viewer && !this.isDestroyed) {
                    this.state.zoomLevel = Math.round(canvas.zoom() * 100) / 100;
                    this.state.viewChanged = Date.now();
                    console.log('BPMNOwlComponent: Zoom fit applied, new zoom:', this.state.zoomLevel);
                }
            });
            
            return true;
        }, 'zoom fit');
    }

    async zoomIn() {
        return this.safeExecute(async () => {
            if (!this.viewer || !this.state.loaded || this.isDestroyed) {
                throw new Error('Viewer not ready for zoom operation');
            }
            
            const canvas = this.viewer.get('canvas');
            const currentZoom = canvas.zoom();
            const newZoom = Math.min(4.0, currentZoom + 0.2); // Max zoom 4x
            canvas.zoom(newZoom);
            
            // Use safe animation frame for UI updates
            this.safeRequestAnimationFrame(() => {
                if (!this.isDestroyed) {
                    this.state.zoomLevel = Math.round(newZoom * 100) / 100;
                    this.state.viewChanged = Date.now();
                    console.log('BPMNOwlComponent: Zoomed in to:', this.state.zoomLevel);
                }
            });
            
            return newZoom;
        }, 'zoom in');
    }

    async zoomOut() {
        return this.safeExecute(async () => {
            if (!this.viewer || !this.state.loaded || this.isDestroyed) {
                throw new Error('Viewer not ready for zoom operation');
            }
            
            const canvas = this.viewer.get('canvas');
            const currentZoom = canvas.zoom();
            const newZoom = Math.max(0.1, currentZoom - 0.2); // Min zoom 0.1x
            canvas.zoom(newZoom);
            
            // Use safe animation frame for UI updates
            this.safeRequestAnimationFrame(() => {
                if (!this.isDestroyed) {
                    this.state.zoomLevel = Math.round(newZoom * 100) / 100;
                    this.state.viewChanged = Date.now();
                    console.log('BPMNOwlComponent: Zoomed out to:', this.state.zoomLevel);
                }
            });
            
            return newZoom;
        }, 'zoom out');
    }

    clearSelection() {
        if (!this.viewer) return;
        
        try {
            const selection = this.viewer.get('selection');
            selection.select(null);
            this.state.selectedElement = null;
            console.log('BPMNOwlComponent: Selection cleared programmatically');
        } catch (error) {
            console.error('BPMNOwlComponent: Clear selection failed:', error);
        }
    }

    // Pan controls
    panUp() {
        if (!this.viewer || !this.state.loaded) return;
        
        try {
            const canvas = this.viewer.get('canvas');
            const viewbox = canvas.viewbox();
            canvas.viewbox({
                x: viewbox.x,
                y: viewbox.y - 50, // Move up by 50 units
                width: viewbox.width,
                height: viewbox.height
            });
            this.state.viewChanged = Date.now();
            console.log('BPMNOwlComponent: Panned up');
        } catch (error) {
            console.error('BPMNOwlComponent: Pan up failed:', error);
        }
    }

    panDown() {
        if (!this.viewer || !this.state.loaded) return;
        
        try {
            const canvas = this.viewer.get('canvas');
            const viewbox = canvas.viewbox();
            canvas.viewbox({
                x: viewbox.x,
                y: viewbox.y + 50, // Move down by 50 units
                width: viewbox.width,
                height: viewbox.height
            });
            this.state.viewChanged = Date.now();
            console.log('BPMNOwlComponent: Panned down');
        } catch (error) {
            console.error('BPMNOwlComponent: Pan down failed:', error);
        }
    }

    panLeft() {
        if (!this.viewer || !this.state.loaded) return;
        
        try {
            const canvas = this.viewer.get('canvas');
            const viewbox = canvas.viewbox();
            canvas.viewbox({
                x: viewbox.x - 50, // Move left by 50 units
                y: viewbox.y,
                width: viewbox.width,
                height: viewbox.height
            });
            this.state.viewChanged = Date.now();
            console.log('BPMNOwlComponent: Panned left');
        } catch (error) {
            console.error('BPMNOwlComponent: Pan left failed:', error);
        }
    }

    panRight() {
        if (!this.viewer || !this.state.loaded) return;
        
        try {
            const canvas = this.viewer.get('canvas');
            const viewbox = canvas.viewbox();
            canvas.viewbox({
                x: viewbox.x + 50, // Move right by 50 units
                y: viewbox.y,
                width: viewbox.width,
                height: viewbox.height
            });
            this.state.viewChanged = Date.now();
            console.log('BPMNOwlComponent: Panned right');
        } catch (error) {
            console.error('BPMNOwlComponent: Pan right failed:', error);
        }
    }

    getElementInfo(elementId) {
        if (!this.viewer || !elementId) return null;
        
        try {
            const elementRegistry = this.viewer.get('elementRegistry');
            const element = elementRegistry.get(elementId);
            
            if (element) {
                return {
                    id: element.id,
                    type: element.type,
                    name: element.businessObject?.name || element.id,
                    x: element.x || 0,
                    y: element.y || 0,
                    width: element.width || 0,
                    height: element.height || 0
                };
            }
        } catch (error) {
            console.error('BPMNOwlComponent: Get element info failed:', error);
        }
        
        return null;
    }

    selectElement(elementId) {
        if (!this.viewer || !elementId) return;
        
        try {
            const selection = this.viewer.get('selection');
            const elementRegistry = this.viewer.get('elementRegistry');
            const element = elementRegistry.get(elementId);
            
            if (element) {
                selection.select(element);
                this.state.selectedElement = elementId;
                console.log('BPMNOwlComponent: Element selected programmatically:', elementId);
            }
        } catch (error) {
            console.error('BPMNOwlComponent: Select element failed:', error);
        }
    }

    /**
     * Manual circuit breaker reset for user control
     */
    manualResetCircuitBreaker() {
        console.log('BPMNOwlComponent: Manual circuit breaker reset requested');
        
        // Force reset circuit breaker
        this.resetCircuitBreaker();
        
        // Show confirmation message
        if (!this.isDestroyed) {
            this.state.message = '🔄 Error protection manually reset. You can try loading the diagram again.';
            
            // Clear message after delay
            this.safeSetTimeout(() => {
                if (!this.isDestroyed && this.state.message.includes('manually reset')) {
                    this.state.message = '';
                }
            }, 3000);
        }
    }
}

// Register component in Odoo's component registry
webRegistry.category("components").add("BPMNOwlComponent", BPMNOwlComponent);

console.log('BPMNOwlComponent: Registered with Odoo component registry');

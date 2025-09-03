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
                <h5 class="mb-0">BPMN Diagram Viewer (Database-First)</h5>
                <div class="btn-toolbar" role="toolbar">
                    <div class="btn-group me-2" role="group">
                        <button type="button" 
                                class="btn btn-primary btn-sm" 
                                t-on-click="loadDiagramFromDatabase"
                                t-att-disabled="state.loading">
                            <i t-if="state.loading" class="fa fa-spinner fa-spin"/>
                            <i t-else="" class="fa fa-database"/>
                            <span t-if="state.loading"> Loading from DB...</span>
                            <span t-else=""> Load from Database</span>
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
            
            <!-- Database Connection Status -->
            <div class="small text-muted mb-2 d-flex justify-content-between align-items-center">
                <div>
                    <span t-if="state.dbConnected">
                        <i class="fa fa-database text-success"/> Database Connected
                        <span t-if="state.recordId" class="ms-2">
                            (Record ID: <code t-esc="state.recordId"/>)
                        </span>
                    </span>
                    <span t-else="">
                        <i class="fa fa-database text-warning"/> Database Not Connected
                    </span>
                    <span t-if="state.lastSyncTime" class="ms-3">
                        Last Sync: <span t-esc="new Date(state.lastSyncTime).toLocaleTimeString()"/>
                    </span>
                </div>
                <div>
                    <span t-if="state.fieldValue">
                        Content: <span t-esc="Math.round(state.fieldValue.length / 1024)"/>KB
                    </span>
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
                        <i t-if="state.loading" class="fa fa-spinner fa-spin fa-3x mb-3"/>
                        <i t-elif="!state.dbConnected" class="fa fa-database fa-3x mb-3 text-warning"/>
                        <i t-else="" class="fa fa-sitemap fa-3x mb-3"/>
                        <div t-if="state.loading">Loading diagram from database...</div>
                        <div t-elif="!state.dbConnected">Database connection required</div>
                        <div t-elif="!state.recordId">No record ID detected</div>
                        <div t-else="">BPMN diagram will auto-load from database or click "Load from Database"</div>
                        <div t-if="state.dbConnected and state.recordId" class="small mt-2">
                            Connected to Record ID: <code t-esc="state.recordId"/>
                        </div>
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
            // Enhanced state management with database integration
            selectedElement: null,
            zoomLevel: 1,
            elementCount: 0,
            diagramTitle: '',
            lastModified: null,
            viewChanged: 0,
            // Database integration state
            recordId: null,
            fieldValue: '',
            dbConnected: false,
            lastSyncTime: null,
            // Error boundary state
            isCircuitOpen: false,
            errorCount: 0,
            recoveryInProgress: false,
            // Track current XML content for change detection
            currentXMLContent: ''
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
            console.log('BPMNOwlComponent: Mounted successfully with database-first approach');
            this.isDestroyed = false;
            
            // Make component accessible for debugging
            window.bpmnDebug = this;
            console.log('🔧 Debug: Component available as window.bpmnDebug - call window.bpmnDebug.debugConnectionStatus() for diagnostics');
            
            // Initialize database connection and field monitoring
            this.initializeDatabaseConnection();
            
            // Phase 1: Auto-load diagram if XML data is present in database
            this.safeSetTimeout(() => {
                this.autoLoadDiagramFromDatabase();
            }, 500); // Small delay to ensure DOM is fully ready
            
            // Start monitoring for database field changes
            this.startDatabaseFieldMonitoring();
        });
        
        onWillDestroy(() => {
            console.log('BPMNOwlComponent: Starting comprehensive cleanup...');
            this.isDestroyed = true;
            
            // Clean up debug reference
            if (window.bpmnDebug === this) {
                delete window.bpmnDebug;
            }
            
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

    /**
     * Initialize database connection and detect current record
     */
    initializeDatabaseConnection() {
        console.log('BPMNOwlComponent: Initializing database connection...');
        console.log('BPMNOwlComponent: Current URL:', window.location.href);
        
        try {
            // Extract record ID from multiple sources
            const recordId = this.detectRecordId();
            
            if (recordId) {
                this.state.recordId = parseInt(recordId);
                this.state.dbConnected = true;
                console.log('BPMNOwlComponent: Database connection established, record ID:', recordId);
            } else {
                console.warn('BPMNOwlComponent: Could not determine record ID - checking alternatives...');
                
                // Fallback: Wait a moment and try again (for dynamic loading)
                this.safeSetTimeout(() => {
                    const fallbackRecordId = this.detectRecordId();
                    if (fallbackRecordId) {
                        this.state.recordId = parseInt(fallbackRecordId);
                        this.state.dbConnected = true;
                        console.log('BPMNOwlComponent: Database connection established via fallback, record ID:', fallbackRecordId);
                    } else {
                        this.state.dbConnected = false;
                        console.warn('BPMNOwlComponent: Still could not determine record ID after fallback');
                        
                        // Final fallback: Check if we have BPMN XML content anyway
                        const xmlContent = this.getDatabaseFieldValue();
                        if (xmlContent) {
                            console.log('BPMNOwlComponent: No record ID but found XML content, enabling limited mode');
                            this.state.dbConnected = true; // Enable limited functionality
                            this.state.recordId = null; // Mark as unknown record
                        } else {
                            this.state.dbConnected = false;
                        }
                    }
                }, 1000);
            }
        } catch (error) {
            console.error('BPMNOwlComponent: Database connection failed:', error);
            this.state.dbConnected = false;
        }
    }

    /**
     * Comprehensive record ID detection with multiple strategies
     */
    detectRecordId() {
        console.log('BPMNOwlComponent: Attempting to detect record ID...');
        console.log('BPMNOwlComponent: Current URL:', window.location.href);
        
        // Strategy 1: Extract from URL path (most common in Odoo)
        // Handles URLs like: /odoo/action-171/2 or /web#id=2&action=171
        const urlPath = window.location.pathname;
        const urlPathMatch = urlPath.match(/\/(\d+)$/); // Match number at end of path
        if (urlPathMatch) {
            const recordId = urlPathMatch[1];
            console.log('BPMNOwlComponent: Found record ID in URL path:', recordId);
            return recordId;
        }
        
        // Strategy 2: URL parameters (traditional ?id=123)
        const urlParams = new URLSearchParams(window.location.search);
        let recordId = urlParams.get('id');
        if (recordId) {
            console.log('BPMNOwlComponent: Found record ID in URL params:', recordId);
            return recordId;
        }
        
        // Strategy 3: Hash-based URLs (Odoo web client) - #id=123
        const hash = window.location.hash;
        if (hash) {
            const hashMatch = hash.match(/[&#]id=(\d+)/);
            if (hashMatch) {
                recordId = hashMatch[1];
                console.log('BPMNOwlComponent: Found record ID in hash:', recordId);
                return recordId;
            }
        }
        
        // Strategy 4: Form view data attributes
        const formView = document.querySelector('.o_form_view');
        if (formView) {
            const resId = formView.getAttribute('data-res-id') || 
                         formView.getAttribute('data-record-id') ||
                         formView.dataset.resId ||
                         formView.dataset.recordId;
            if (resId) {
                console.log('BPMNOwlComponent: Found record ID in form view:', resId);
                return resId;
            }
        }
        
        // Strategy 5: Legacy DOM extraction
        recordId = this.extractRecordIdFromDOM();
        if (recordId) {
            console.log('BPMNOwlComponent: Found record ID via legacy DOM extraction:', recordId);
            return recordId;
        }
        
        console.log('BPMNOwlComponent: No record ID found in URL or DOM');
        return null;
    }

    /**
     * Extract record ID from DOM context (legacy method)
     */
    extractRecordIdFromDOM() {
        console.log('BPMNOwlComponent: Attempting legacy DOM record ID extraction...');
        
        // Method 1: Look for data-res-id attribute
        const formElement = document.querySelector('[data-res-id]');
        if (formElement) {
            const resId = formElement.getAttribute('data-res-id');
            console.log('BPMNOwlComponent: Found data-res-id:', resId);
            return resId;
        }
        
        // Method 2: Look for hidden input with record ID
        const recordInput = document.querySelector('input[name="id"]');
        if (recordInput && recordInput.value) {
            console.log('BPMNOwlComponent: Found record input value:', recordInput.value);
            return recordInput.value;
        }
        
        // Method 3: Extract from form action URL
        const form = document.querySelector('form');
        if (form && form.action) {
            const match = form.action.match(/id=(\d+)/);
            if (match) {
                console.log('BPMNOwlComponent: Found record ID in form action:', match[1]);
                return match[1];
            }
        }
        
        // Method 4: Look for the BPMN XML field and extract from its context
        const xmlField = document.querySelector('textarea[id*="bpmn_xml"]');
        if (xmlField) {
            console.log('BPMNOwlComponent: Found XML field, checking for record context...');
            
            // Check if field has record ID in data attributes
            if (xmlField.dataset.recordId) {
                console.log('BPMNOwlComponent: Found record ID in XML field dataset:', xmlField.dataset.recordId);
                return xmlField.dataset.recordId;
            }
            
            // Look for parent with record context
            const recordContainer = xmlField.closest('[data-record-id]') ||
                                  xmlField.closest('[data-res-id]') ||
                                  xmlField.closest('.o_form_view');
            if (recordContainer) {
                const recordId = recordContainer.getAttribute('data-record-id') ||
                               recordContainer.getAttribute('data-res-id') ||
                               recordContainer.dataset.recordId ||
                               recordContainer.dataset.resId;
                if (recordId) {
                    console.log('BPMNOwlComponent: Found record ID in XML field container:', recordId);
                    return recordId;
                }
            }
        }
        
        // Method 5: Look for Odoo field widgets with record context
        const fieldWidget = document.querySelector('.o_field_widget[data-record-id]') ||
                           document.querySelector('.o_field_widget[data-res-id]');
        if (fieldWidget) {
            const recordId = fieldWidget.getAttribute('data-record-id') ||
                           fieldWidget.getAttribute('data-res-id');
            if (recordId) {
                console.log('BPMNOwlComponent: Found record ID in field widget:', recordId);
                return recordId;
            }
        }
        
        console.log('BPMNOwlComponent: Legacy DOM extraction failed');
        return null;
    }

    /**
     * Debug helper method - call from browser console to diagnose connection issues
     */
    debugConnectionStatus() {
        console.group('🔍 BPMN Component Debug Information');
        
        console.log('📍 Current URL:', window.location.href);
        console.log('� URL Path:', window.location.pathname);
        console.log('�🔍 URL Search Params:', window.location.search);
        console.log('🔍 URL Hash:', window.location.hash);
        
        // Test URL path extraction
        const urlPath = window.location.pathname;
        const urlPathMatch = urlPath.match(/\/(\d+)$/);
        console.log('🎯 URL Path Record ID Detection:', urlPathMatch ? urlPathMatch[1] : 'Not found');
        
        console.log('🎯 Component State:');
        console.log('  - DB Connected:', this.state.dbConnected);
        console.log('  - Record ID:', this.state.recordId);
        console.log('  - Field Value Length:', this.state.fieldValue?.length || 0);
        console.log('  - Last Sync:', this.state.lastSyncTime);
        
        console.log('🔍 DOM Analysis:');
        const xmlField = document.querySelector('textarea[id*="bpmn_xml"]');
        console.log('  - XML Field Found:', !!xmlField);
        console.log('  - XML Field Value Length:', xmlField?.value?.length || 0);
        
        console.log('🎯 Record ID Detection Results:');
        const detectedId = this.detectRecordId();
        console.log('  - Detected ID:', detectedId);
        
        console.log('📊 Field Content Sample:');
        const content = this.getDatabaseFieldValue();
        if (content) {
            console.log('  - Content Length:', content.length);
            console.log('  - Content Preview:', content.substring(0, 200) + '...');
            console.log('  - Is Valid BPMN:', content.includes('bpmn:definitions') || content.includes('<definitions'));
        } else {
            console.log('  - No content found');
        }
        
        console.groupEnd();
        
        return {
            url: window.location.href,
            urlPath: window.location.pathname,
            urlPathRecordId: urlPathMatch ? urlPathMatch[1] : null,
            dbConnected: this.state.dbConnected,
            recordId: this.state.recordId,
            hasXmlField: !!xmlField,
            hasContent: !!content,
            contentLength: content?.length || 0,
            detectedId: detectedId
        };
    }

    /**
     * Start monitoring database field changes for record navigation
     * This handles cases where user navigates between records using Next/Previous
     */
    startDatabaseFieldMonitoring() {
        console.log('BPMNOwlComponent: Starting database field monitoring...');
        
        const checkForDatabaseChanges = () => {
            if (this.isDestroyed) return;
            
            try {
                // Get current field value from database field
                const currentFieldValue = this.getDatabaseFieldValue();
                const currentRecordId = this.getCurrentRecordId();
                
                // Check if record ID changed (navigation)
                if (currentRecordId !== this.state.recordId) {
                    console.log('BPMNOwlComponent: Record navigation detected:', this.state.recordId, '→', currentRecordId);
                    this.state.recordId = currentRecordId;
                    this.state.fieldValue = currentFieldValue;
                    this.state.lastSyncTime = new Date().toISOString();
                    
                    if (currentFieldValue) {
                        this.safeSetTimeout(() => {
                            this.autoLoadDiagramFromDatabase();
                        }, 300);
                    } else {
                        this.clearDiagram();
                    }
                }
                // Check if field content changed for same record
                else if (currentFieldValue !== this.state.fieldValue) {
                    console.log('BPMNOwlComponent: Database field changed for record', currentRecordId);
                    this.state.fieldValue = currentFieldValue;
                    this.state.lastSyncTime = new Date().toISOString();
                    
                    if (currentFieldValue) {
                        this.safeSetTimeout(() => {
                            this.autoLoadDiagramFromDatabase();
                        }, 300);
                    } else {
                        this.clearDiagram();
                    }
                }
                
            } catch (error) {
                console.warn('BPMNOwlComponent: Error monitoring database changes:', error);
            }
            
            // Continue monitoring
            this.safeSetTimeout(checkForDatabaseChanges, 1000); // Check every second
        };
        
        // Start the monitoring loop
        this.safeSetTimeout(checkForDatabaseChanges, 1000);
    }

    /**
     * Get current record ID from various sources
     */
    getCurrentRecordId() {
        // Use the enhanced detection method
        const recordId = this.detectRecordId();
        return recordId ? parseInt(recordId) : null;
    }

    /**
     * Get current database field value
     */
    getDatabaseFieldValue() {
        const xmlField = document.querySelector('textarea[id*="bpmn_xml"]');
        return xmlField ? xmlField.value.trim() : '';
    }

    /**
     * Start monitoring XML content changes for record navigation (Legacy method for backward compatibility)
     * This handles cases where user navigates between records using Next/Previous
     */
    startXMLContentMonitoring() {
        // Redirect to new database-first monitoring
        console.log('BPMNOwlComponent: Redirecting to database-first monitoring...');
        this.startDatabaseFieldMonitoring();
    }

    /**
     * Clear the current diagram display
     */
    clearDiagram() {
        console.log('BPMNOwlComponent: Clearing diagram...');
        
        if (this.viewer) {
            try {
                // Clean up existing viewer
                for (const [eventName, handler] of this.eventListeners) {
                    this.viewer.off(eventName, handler);
                }
                this.eventListeners.clear();
                
                this.viewer.destroy();
                this.viewer = null;
            } catch (error) {
                console.warn('BPMNOwlComponent: Error clearing diagram:', error);
            }
        }
        
        // Reset state
        this.state.loaded = false;
        this.state.loading = false;
        this.state.error = false;
        this.state.message = "";
        this.state.selectedElement = null;
        this.state.elementCount = 0;
        this.state.diagramTitle = '';
    }

    /**
     * Phase 1: Auto-load diagram from database if XML data is present
     * Called automatically on component mount and when database content changes
     */
    async autoLoadDiagramFromDatabase() {
        console.log('BPMNOwlComponent: Checking for auto-load from database...');
        
        // Check if component is destroyed
        if (this.isDestroyed) {
            console.log('BPMNOwlComponent: Auto-load skipped - component destroyed');
            return;
        }
        
        // Check database connection
        if (!this.state.dbConnected || !this.state.recordId) {
            console.log('BPMNOwlComponent: No database connection or record ID available');
            return;
        }
        
        // Get XML data from database field
        const xmlContent = this.getDatabaseFieldValue();
        if (xmlContent) {
            console.log('BPMNOwlComponent: XML data found in database, auto-loading diagram...');
            console.log('BPMNOwlComponent: Record ID:', this.state.recordId, 'Content length:', xmlContent.length);
            
            // Update tracked content
            this.state.currentXMLContent = xmlContent;
            this.state.fieldValue = xmlContent;
            
            try {
                await this.loadDiagramFromDatabase();
                console.log('BPMNOwlComponent: Auto-load from database completed successfully');
            } catch (error) {
                console.warn('BPMNOwlComponent: Auto-load from database failed:', error);
                // Don't show error message for auto-load failures to avoid overwhelming user
                // They can still manually click "Load from Database" if needed
            }
        } else {
            console.log('BPMNOwlComponent: No XML data found in database for auto-load');
            // Update tracked content to empty
            this.state.currentXMLContent = '';
            this.state.fieldValue = '';
        }
    }

    /**
     * Legacy auto-load method for backward compatibility
     */
    async autoLoadDiagram() {
        // Redirect to database-first approach
        console.log('BPMNOwlComponent: Redirecting to database-first auto-load...');
        await this.autoLoadDiagramFromDatabase();
    }

    /**
     * Load diagram from database with enhanced error handling and validation
     */
    async loadDiagramFromDatabase() {
        console.log('BPMNOwlComponent: Loading diagram from database with error boundary protection...');
        
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
                
                // Check database connection
                if (!this.state.dbConnected) {
                    throw new Error('No database connection available. Please refresh the page.');
                }
                
                // Get XML content from database field
                const xmlContent = this.getDatabaseFieldValue();
                
                // Validate database content
                if (!xmlContent) {
                    const recordInfo = this.state.recordId ? ` for record ${this.state.recordId}` : '';
                    throw new Error(`No BPMN XML data found in database${recordInfo}. Please add BPMN XML content first.`);
                }

                const recordInfo = this.state.recordId ? ` Record ID: ${this.state.recordId},` : '';
                console.log(`BPMNOwlComponent: Database XML content loaded, length: ${xmlContent.length},${recordInfo}`);

                // Validate XML format
                if (!xmlContent.includes('bpmn:definitions') && !xmlContent.includes('<definitions')) {
                    throw new Error('Invalid BPMN XML format detected in database. Please ensure the content is valid BPMN 2.0 XML.');
                }

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

                // Import the XML from database with safety check
                console.log('BPMNOwlComponent: Importing XML from database...');
                
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
                this.state.lastSyncTime = new Date().toISOString();
                
                // Update enhanced state using safe animation frame
                this.safeRequestAnimationFrame(() => {
                    this.updateDiagramInfo();
                });
                
                const finalRecordInfo = this.state.recordId ? `, Record ID: ${this.state.recordId}` : '';
                console.log(`BPMNOwlComponent: Diagram loaded successfully from database${finalRecordInfo}`);
                return true;
                
            }, 'database diagram loading');
        }, 'loadDiagramFromDatabase').catch(error => {
            console.error('BPMNOwlComponent: Database load failed after all retries:', error);
            
            // Only update state if component is not destroyed
            if (!this.isDestroyed) {
                this.state.error = true;
                this.state.loaded = false;
                
                // Provide user-friendly error messages based on error type
                if (error.message.includes('Circuit breaker')) {
                    this.state.message = `⚠️ System protection active. Please wait before trying again.`;
                } else if (error.message.includes('BPMN.js library not loaded')) {
                    this.state.message = `❌ BPMN library not available. Please refresh the page.`;
                } else if (error.message.includes('No database connection')) {
                    this.state.message = `❌ Database connection lost. Please refresh the page.`;
                } else if (error.message.includes('No BPMN XML data found in database')) {
                    this.state.message = `❌ No BPMN XML content found in database for this record. Please add valid BPMN XML first.`;
                } else if (error.message.includes('Invalid BPMN XML format')) {
                    this.state.message = `❌ Invalid BPMN XML format in database. Please check the XML content.`;
                } else {
                    this.state.message = `❌ Database Error: ${error.message}`;
                }
            }
        }).finally(() => {
            // Only update loading state if component is not destroyed
            if (!this.isDestroyed) {
                this.state.loading = false;
            }
        });
    }

    /**
     * Legacy load method that redirects to database-first approach
     */
    async loadDiagram() {
        console.log('BPMNOwlComponent: Redirecting to database-first load...');
        return this.loadDiagramFromDatabase();
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

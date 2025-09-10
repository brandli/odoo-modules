/** @odoo-module **/

import { Component, useRef, onMounted, onWillDestroy, onPatched, useState, xml } from "@odoo/owl";
import { registry as webRegistry } from "@web/core/registry";

/**
 * BPMN OWL Component - Phase 2.1 Editor Implementation
 * 
 * Enhanced editor component implementing:
 * - Full BPMN modeler with editing capabilities
 * - Element palette for drag-and-drop creation
 * - Undo/redo functionality
 * - Element deletion and selection
 * - Auto-save with version control
 */
export class BPMNOwlComponent extends Component {
    static template = xml`
        <div class="bpmn-owl-component">
            <!-- Header with controls -->
            <div class="card mb-3">
                <div class="card-header py-2">
                    <div class="d-flex justify-content-between align-items-center">
                        <h6 class="mb-0 text-primary">
                            <i class="fa fa-sitemap me-2"/>BPMN Editor
                        </h6>
                        <div class="btn-toolbar" role="toolbar">
                            <!-- File operations -->
                            <div class="btn-group me-2" role="group">
                                <button type="button" 
                                        class="btn btn-outline-primary btn-sm" 
                                        t-on-click="loadDiagramFromDatabase"
                                        t-att-disabled="state.loading">
                                    <i t-if="state.loading" class="fa fa-spinner fa-spin"/>
                                    <i t-else="" class="fa fa-refresh"/>
                                    <span t-if="state.loading"> Loading...</span>
                                    <span t-else=""> Reload</span>
                                </button>
                                <button type="button" 
                                        class="btn btn-outline-success btn-sm" 
                                        t-on-click="saveDiagramToDatabase"
                                        t-att-disabled="state.saving || !state.hasSaveableContent">
                                    <i t-if="state.saving" class="fa fa-spinner fa-spin"/>
                                    <i t-else="" class="fa fa-save"/>
                                    <span t-if="state.saving"> Saving...</span>
                                    <span t-else=""> Save</span>
                                </button>
                            </div>
                            
                            <!-- Edit operations -->
                            <div class="btn-group me-2" role="group" t-if="state.loaded">
                                <button type="button" 
                                        class="btn btn-outline-secondary btn-sm" 
                                        t-on-click="undo"
                                        t-att-disabled="!state.canUndo"
                                        title="Undo (Ctrl+Z)">
                                    <i class="fa fa-undo"/>
                                </button>
                                <button type="button" 
                                        class="btn btn-outline-secondary btn-sm" 
                                        t-on-click="redo"
                                        t-att-disabled="!state.canRedo"
                                        title="Redo (Ctrl+Y)">
                                    <i class="fa fa-repeat"/>
                                </button>
                            </div>
                            
                            <!-- Zoom controls -->
                            <div class="btn-group me-2" role="group" t-if="state.loaded">
                                <button type="button" 
                                        class="btn btn-outline-secondary btn-sm" 
                                        t-on-click="zoomFit"
                                        title="Fit to view">
                                    <i class="fa fa-expand"/>
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
                            
                            <!-- Selection controls -->
                            <div class="btn-group" role="group" t-if="state.loaded">
                                <button type="button" 
                                        class="btn btn-outline-secondary btn-sm" 
                                        t-on-click="clearSelection"
                                        t-att-disabled="!state.selectedElement"
                                        title="Clear selection">
                                    <i class="fa fa-times"/>
                                </button>
                                <button type="button" 
                                        class="btn btn-outline-danger btn-sm" 
                                        t-on-click="deleteSelected"
                                        t-att-disabled="!state.selectedElement"
                                        title="Delete selected (Del)">
                                    <i class="fa fa-trash"/>
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Status row -->
                    <div class="row small text-muted mt-2">
                        <div class="col-md-6">
                            <span t-if="state.selectedElement" class="me-3">
                                <i class="fa fa-mouse-pointer me-1"/>Selected: <code t-esc="state.selectedElement"/>
                            </span>
                            <span t-if="state.modificationCount > 0" class="me-3">
                                <i class="fa fa-edit me-1"/>Changes: <span t-esc="state.modificationCount"/>
                            </span>
                        </div>
                        <div class="col-md-6 text-end">
                            <span>
                                <i class="fa fa-search me-1"/>Zoom: <span t-esc="Math.round(state.zoomLevel * 100)"/>%
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Messages -->
            <div t-if="state.message" 
                 class="alert"
                 t-att-class="state.error ? 'alert-danger' : 'alert-success'">
                <i t-if="state.error" class="fa fa-exclamation-triangle me-2"/>
                <i t-else="" class="fa fa-check me-2"/>
                <span t-esc="state.message"/>
            </div>
            
            <!-- Main editing area -->
            <div class="row">
                <!-- Element Palette -->
                <div class="col-md-2" t-if="state.loaded">
                    <div class="card">
                        <div class="card-header py-2">
                            <h6 class="mb-0">
                                <i class="fa fa-th-large me-2"/>Elements
                            </h6>
                        </div>
                        <div class="card-body p-2">
                            <!-- Start Events -->
                            <div class="mb-3">
                                <div class="fw-bold small mb-2">Start Events</div>
                                <div class="d-grid gap-1">
                                    <button type="button" 
                                            class="btn btn-outline-primary btn-sm text-start"
                                            t-on-click="() => this.createElement('bpmn:StartEvent')"
                                            title="Start Event">
                                        <i class="fa fa-play-circle me-2"/>Start Event
                                    </button>
                                </div>
                            </div>
                            
                            <!-- Tasks -->
                            <div class="mb-3">
                                <div class="fw-bold small mb-2">Tasks</div>
                                <div class="d-grid gap-1">
                                    <button type="button" 
                                            class="btn btn-outline-secondary btn-sm text-start"
                                            t-on-click="() => this.createElement('bpmn:Task')"
                                            title="Task">
                                        <i class="fa fa-square me-2"/>Task
                                    </button>
                                    <button type="button" 
                                            class="btn btn-outline-secondary btn-sm text-start"
                                            t-on-click="() => this.createElement('bpmn:UserTask')"
                                            title="User Task">
                                        <i class="fa fa-user me-2"/>User Task
                                    </button>
                                    <button type="button" 
                                            class="btn btn-outline-secondary btn-sm text-start"
                                            t-on-click="() => this.createElement('bpmn:ServiceTask')"
                                            title="Service Task">
                                        <i class="fa fa-cog me-2"/>Service Task
                                    </button>
                                </div>
                            </div>
                            
                            <!-- End Events -->
                            <div class="mb-3">
                                <div class="fw-bold small mb-2">End Events</div>
                                <div class="d-grid gap-1">
                                    <button type="button" 
                                            class="btn btn-outline-danger btn-sm text-start"
                                            t-on-click="() => this.createElement('bpmn:EndEvent')"
                                            title="End Event">
                                        <i class="fa fa-stop-circle me-2"/>End Event
                                    </button>
                                </div>
                            </div>
                            
                            <!-- Gateways -->
                            <div class="mb-3">
                                <div class="fw-bold small mb-2">Gateways</div>
                                <div class="d-grid gap-1">
                                    <button type="button" 
                                            class="btn btn-outline-warning btn-sm text-start"
                                            t-on-click="() => this.createElement('bpmn:ExclusiveGateway')"
                                            title="Exclusive Gateway">
                                        <i class="fa fa-diamond me-2"/>XOR Gateway
                                    </button>
                                    <button type="button" 
                                            class="btn btn-outline-warning btn-sm text-start"
                                            t-on-click="() => this.createElement('bpmn:ParallelGateway')"
                                            title="Parallel Gateway">
                                        <i class="fa fa-plus me-2"/>AND Gateway
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- BPMN Canvas -->
                <div class="col-md-10">
                    <div class="card">
                        <div t-ref="bpmnContainer" 
                             class="bpmn-canvas card-body p-0" 
                             style="height: 500px; background: #fff;">
                            <div t-if="!state.loaded" 
                                 class="d-flex align-items-center justify-content-center h-100">
                                <div class="text-center text-muted">
                                    <div t-if="state.loading">
                                        <i class="fa fa-spinner fa-spin fa-2x mb-3"/>
                                        <div>Loading diagram...</div>
                                    </div>
                                    <div t-else="">
                                        <i class="fa fa-sitemap fa-2x mb-3"/>
                                        <div>No diagram loaded</div>
                                        <div class="small mt-2" t-if="!state.error">
                                            <button type="button" 
                                                    class="btn btn-outline-primary btn-sm mt-2" 
                                                    t-on-click="createDefaultDiagram">
                                                <i class="fa fa-plus me-1"/>Create Default Diagram
                                            </button>
                                        </div>
                                        <div class="small mt-2 text-danger" t-if="state.error">
                                            <div class="mb-2">
                                                <i class="fa fa-exclamation-triangle me-1"/>
                                                Editor initialization failed
                                            </div>
                                            <button type="button" 
                                                    class="btn btn-outline-secondary btn-sm" 
                                                    t-on-click="retryInitialization">
                                                <i class="fa fa-refresh me-1"/>Retry Initialization
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    setup() {
        this.containerRef = useRef("bpmnContainer");
        this.state = useState({
            loaded: false,
            loading: false,
            saving: false,
            error: false,
            message: '',
            selectedElement: null,
            zoomLevel: 1.0,
            hasSaveableContent: false,
            modificationCount: 0,
            canUndo: false,
            canRedo: false
        });

        // BPMN.js modeler instance
        this.modeler = null;
        
        // Command stack for undo/redo
        this.commandStack = null;
        
        // Auto-save settings
        this.autoSaveInterval = null;
        this.autoSaveDelay = 30000; // 30 seconds
        
        // Setup lifecycle hooks
        onMounted(() => this.onMounted());
        onWillDestroy(() => this.onWillDestroy());
        onPatched(() => this.onPatched());
    }

    async onMounted() {
        console.log('BPMNOwlComponent: Component mounted');
        console.log('BPMNOwlComponent: Checking BPMN.js availability:', typeof window.BpmnJS);
        console.log('BPMNOwlComponent: Window object keys containing "Bpmn":', Object.keys(window).filter(k => k.toLowerCase().includes('bpmn')));
        console.log('BPMNOwlComponent: Container ref:', this.containerRef.el);
        
        try {
            await this.initializeBPMNModeler();
            await this.loadDiagramFromDatabase();
            this.setupKeyboardShortcuts();
            this.startAutoSave();
        } catch (error) {
            console.error('Error during component initialization:', error);
            this.state.error = true;
            this.state.message = `Initialization failed: ${error.message}`;
        }
    }

    onWillDestroy() {
        console.log('BPMNOwlComponent: Component will destroy');
        this.cleanup();
    }

    onPatched() {
        // Re-attach BPMN modeler if container was recreated
        if (this.modeler && this.containerRef.el && !this.containerRef.el.querySelector('.djs-container')) {
            this.attachModelerToContainer();
        }
    }

    attachModelerToContainer() {
        try {
            if (this.modeler && this.containerRef.el) {
                this.modeler.attachTo(this.containerRef.el);
                console.log('BPMN Modeler re-attached to container');
            }
        } catch (error) {
            console.error('Error re-attaching modeler to container:', error);
        }
    }

    async retryInitialization() {
        console.log('BPMNOwlComponent: Retrying initialization...');
        this.state.error = false;
        this.state.loading = true;
        this.state.message = 'Retrying initialization...';
        
        try {
            // Clean up any existing modeler
            if (this.modeler) {
                this.modeler.destroy();
                this.modeler = null;
                this.commandStack = null;
            }
            
            // Retry initialization
            await this.initializeBPMNModeler();
            await this.loadDiagramFromDatabase();
            this.setupKeyboardShortcuts();
            this.startAutoSave();
            
            this.state.message = 'Initialization successful';
        } catch (error) {
            console.error('Retry initialization failed:', error);
            this.state.error = true;
            this.state.message = `Retry failed: ${error.message}`;
        } finally {
            this.state.loading = false;
        }
    }

    cleanup() {
        // Stop auto-save
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
            this.autoSaveInterval = null;
        }

        // Remove keyboard shortcuts
        this.removeKeyboardShortcuts();

        // Destroy BPMN modeler
        if (this.modeler) {
            try {
                this.modeler.destroy();
            } catch (error) {
                console.error('Error destroying BPMN modeler:', error);
            }
            this.modeler = null;
            this.commandStack = null;
        }
    }

    async initializeBPMNModeler() {
        try {
            // Check if BPMN modeler is available with retry logic
            let retries = 0;
            const maxRetries = 10;
            while (typeof window.BpmnJS === 'undefined' && retries < maxRetries) {
                console.log(`Waiting for BPMN.js library... (attempt ${retries + 1}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, 500));
                retries++;
            }
            
            if (typeof window.BpmnJS === 'undefined') {
                throw new Error('BPMN.js library not loaded after waiting');
            }

            // Ensure container is available
            if (!this.containerRef.el) {
                throw new Error('BPMN container element not available');
            }

            // Create BPMN modeler instance
            this.modeler = new window.BpmnJS({
                container: this.containerRef.el,
                keyboard: {
                    bindTo: window
                }
            });

            // Get command stack for undo/redo
            this.commandStack = this.modeler.get('commandStack');

            // Setup event listeners
            this.setupModelerEventListeners();

            console.log('BPMN Modeler initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize BPMN modeler:', error);
            this.state.error = true;
            this.state.message = `Failed to initialize BPMN editor: ${error.message}`;
            throw error; // Re-throw to handle in calling method
        }
    }

    setupModelerEventListeners() {
        const eventBus = this.modeler.get('eventBus');
        
        // Element selection events
        eventBus.on('selection.changed', (event) => {
            const selectedElements = event.newSelection;
            if (selectedElements.length > 0) {
                this.state.selectedElement = selectedElements[0].id;
            } else {
                this.state.selectedElement = null;
            }
        });

        // Canvas zoom events
        eventBus.on('canvas.viewbox.changed', (event) => {
            this.state.zoomLevel = event.viewbox.scale || 1.0;
        });

        // Command stack events for undo/redo
        eventBus.on('commandStack.changed', () => {
            this.updateUndoRedoState();
            this.state.modificationCount++;
            this.state.hasSaveableContent = true;
        });

        // Element modification events
        eventBus.on(['element.changed', 'elements.changed'], () => {
            this.state.hasSaveableContent = true;
        });
    }

    updateUndoRedoState() {
        if (this.commandStack) {
            this.state.canUndo = this.commandStack.canUndo();
            this.state.canRedo = this.commandStack.canRedo();
        }
    }

    // Phase 2.1 Feature: Element Creation
    async createElement(elementType) {
        try {
            if (!this.modeler) {
                throw new Error('BPMN modeler not initialized');
            }

            const elementFactory = this.modeler.get('elementFactory');
            const canvas = this.modeler.get('canvas');
            const create = this.modeler.get('create');

            // Create element based on type
            let element;
            switch (elementType) {
                case 'bpmn:StartEvent':
                    element = elementFactory.createShape({ type: 'bpmn:StartEvent' });
                    break;
                case 'bpmn:Task':
                    element = elementFactory.createShape({ type: 'bpmn:Task' });
                    break;
                case 'bpmn:UserTask':
                    element = elementFactory.createShape({ type: 'bpmn:UserTask' });
                    break;
                case 'bpmn:ServiceTask':
                    element = elementFactory.createShape({ type: 'bpmn:ServiceTask' });
                    break;
                case 'bpmn:EndEvent':
                    element = elementFactory.createShape({ type: 'bpmn:EndEvent' });
                    break;
                case 'bpmn:ExclusiveGateway':
                    element = elementFactory.createShape({ type: 'bpmn:ExclusiveGateway' });
                    break;
                case 'bpmn:ParallelGateway':
                    element = elementFactory.createShape({ type: 'bpmn:ParallelGateway' });
                    break;
                default:
                    throw new Error(`Unknown element type: ${elementType}`);
            }

            // Get center position of canvas
            const viewbox = canvas.viewbox();
            const position = {
                x: viewbox.x + (viewbox.width / 2) - 50, // Center horizontally
                y: viewbox.y + (viewbox.height / 2) - 25  // Center vertically
            };

            // Add element to canvas
            const rootElement = canvas.getRootElement();
            create.start(null, element, { x: position.x, y: position.y }, rootElement);

            this.state.message = `${elementType.replace('bpmn:', '')} created successfully`;
            this.state.error = false;

        } catch (error) {
            console.error('Error creating element:', error);
            this.state.error = true;
            this.state.message = `Failed to create element: ${error.message}`;
        }
    }

    // Phase 2.1 Feature: Undo/Redo
    undo() {
        if (this.commandStack && this.commandStack.canUndo()) {
            this.commandStack.undo();
            this.state.message = 'Undone';
            this.state.error = false;
        }
    }

    redo() {
        if (this.commandStack && this.commandStack.canRedo()) {
            this.commandStack.redo();
            this.state.message = 'Redone';
            this.state.error = false;
        }
    }

    // Phase 2.1 Feature: Element Deletion
    deleteSelected() {
        try {
            if (!this.state.selectedElement) {
                return;
            }

            const elementRegistry = this.modeler.get('elementRegistry');
            const modeling = this.modeler.get('modeling');
            
            const element = elementRegistry.get(this.state.selectedElement);
            if (element) {
                modeling.removeElements([element]);
                this.state.message = 'Element deleted';
                this.state.error = false;
            }
        } catch (error) {
            console.error('Error deleting element:', error);
            this.state.error = true;
            this.state.message = `Failed to delete element: ${error.message}`;
        }
    }

    clearSelection() {
        if (this.modeler) {
            const selection = this.modeler.get('selection');
            selection.select(null);
        }
    }

    // Keyboard shortcuts setup
    setupKeyboardShortcuts() {
        this.keydownHandler = (event) => {
            if (event.ctrlKey || event.metaKey) {
                switch (event.key.toLowerCase()) {
                    case 'z':
                        if (event.shiftKey) {
                            event.preventDefault();
                            this.redo();
                        } else {
                            event.preventDefault();
                            this.undo();
                        }
                        break;
                    case 'y':
                        event.preventDefault();
                        this.redo();
                        break;
                    case 's':
                        event.preventDefault();
                        this.saveDiagramToDatabase();
                        break;
                }
            } else if (event.key === 'Delete' || event.key === 'Backspace') {
                if (this.state.selectedElement) {
                    event.preventDefault();
                    this.deleteSelected();
                }
            }
        };

        document.addEventListener('keydown', this.keydownHandler);
    }

    removeKeyboardShortcuts() {
        if (this.keydownHandler) {
            document.removeEventListener('keydown', this.keydownHandler);
            this.keydownHandler = null;
        }
    }

    // Auto-save functionality
    startAutoSave() {
        this.autoSaveInterval = setInterval(() => {
            if (this.state.hasSaveableContent && !this.state.saving && this.modeler) {
                this.autoSaveDiagram();
            }
        }, this.autoSaveDelay);
    }

    async autoSaveDiagram() {
        try {
            const xml = await this.modeler.saveXML({ format: true });
            
            // Call auto-save API endpoint
            const response = await this.env.services.rpc('/bpmn/auto_save', {
                process_id: this.props.record.data.id,
                xml_content: xml.xml
            });

            if (response.success) {
                console.log('Auto-save successful');
                // Don't show auto-save messages to avoid spam
            } else {
                console.warn('Auto-save failed:', response.error);
            }

        } catch (error) {
            console.error('Auto-save error:', error);
        }
    }

    // Zoom controls
    zoomFit() {
        if (this.modeler) {
            const canvas = this.modeler.get('canvas');
            canvas.zoom('fit-viewport');
        }
    }

    zoomIn() {
        if (this.modeler) {
            const canvas = this.modeler.get('canvas');
            canvas.zoom(this.state.zoomLevel + 0.1);
        }
    }

    zoomOut() {
        if (this.modeler) {
            const canvas = this.modeler.get('canvas');
            canvas.zoom(Math.max(0.1, this.state.zoomLevel - 0.1));
        }
    }

    // Diagram loading and saving
    async loadDiagramFromDatabase() {
        this.state.loading = true;
        this.state.error = false;
        this.state.message = '';

        try {
            const result = await this.env.services.rpc('/bpmn/get_process_data', {
                process_id: this.props.record.data.id
            });

            if (result.success && result.xml) {
                await this.modeler.importXML(result.xml);
                this.state.loaded = true;
                this.state.hasSaveableContent = false;
                this.state.modificationCount = 0;
                this.updateUndoRedoState();
                this.state.message = 'Diagram loaded successfully';
            } else {
                throw new Error(result.error || 'Failed to load diagram');
            }

        } catch (error) {
            console.error('Error loading diagram:', error);
            this.state.error = true;
            this.state.message = `Failed to load diagram: ${error.message}`;
            
            // Only try to create default diagram if modeler is available
            if (this.modeler) {
                await this.createDefaultDiagram();
            } else {
                console.warn('Cannot create default diagram: modeler not initialized');
            }
        } finally {
            this.state.loading = false;
        }
    }

    async saveDiagramToDatabase() {
        this.state.saving = true;
        this.state.error = false;

        try {
            const result = await this.modeler.saveXML({ format: true });
            
            // Update the XML field in the form
            await this.props.record.update({ bpmn_xml: result.xml });
            
            this.state.hasSaveableContent = false;
            this.state.message = 'Diagram saved successfully';
            this.state.error = false;

        } catch (error) {
            console.error('Error saving diagram:', error);
            this.state.error = true;
            this.state.message = `Failed to save diagram: ${error.message}`;
        } finally {
            this.state.saving = false;
        }
    }

    async createDefaultDiagram() {
        try {
            // Ensure modeler is initialized before creating default diagram
            if (!this.modeler) {
                await this.initializeBPMNModeler();
            }
            
            // Double-check modeler is available
            if (!this.modeler) {
                throw new Error('BPMN modeler could not be initialized');
            }
            
            const defaultXML = this.getDefaultBPMNXML();
            await this.modeler.importXML(defaultXML);
            this.state.loaded = true;
            this.state.hasSaveableContent = true;
            this.state.message = 'Default diagram created';
            this.state.error = false;
        } catch (error) {
            console.error('Error creating default diagram:', error);
            this.state.error = true;
            this.state.message = `Failed to create default diagram: ${error.message}`;
        }
    }

    getDefaultBPMNXML() {
        return `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
                  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
                  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
                  id="Definitions_1"
                  targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1" isExecutable="false">
    <bpmn:startEvent id="StartEvent_1">
      <bpmn:outgoing>Flow_1</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:task id="Task_1" name="Sample Task">
      <bpmn:incoming>Flow_1</bpmn:incoming>
      <bpmn:outgoing>Flow_2</bpmn:outgoing>
    </bpmn:task>
    <bpmn:endEvent id="EndEvent_1">
      <bpmn:incoming>Flow_2</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="Task_1" />
    <bpmn:sequenceFlow id="Flow_2" sourceRef="Task_1" targetRef="EndEvent_1" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="StartEvent_1_di" bpmnElement="StartEvent_1">
        <dc:Bounds x="179" y="99" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_1_di" bpmnElement="Task_1">
        <dc:Bounds x="270" y="77" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="EndEvent_1_di" bpmnElement="EndEvent_1">
        <dc:Bounds x="432" y="99" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1">
        <di:waypoint x="215" y="117" />
        <di:waypoint x="270" y="117" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2">
        <di:waypoint x="370" y="117" />
        <di:waypoint x="432" y="117" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;
    }
}

// Register the component in the components registry for OWL mounting
webRegistry.category("components").add("BPMNOwlComponent", BPMNOwlComponent);

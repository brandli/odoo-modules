/** @odoo-module **/

import { Component as OwlComponent, useRef, onMounted, onWillDestroy, useState, xml } from "@odoo/owl";
import { registry as webRegistry } from "@web/core/registry";
import { useService } from "@web/core/utils/hooks";

/**
 * BPMN OWL Component - Proper Odoo Integration
 * 
 * This component properly integrates with Odoo's form view and database:
 * - Reads BPMN XML directly from the record
 * - Writes changes back to the database
 * - Uses Odoo's reactive system for updates
 */
export class BPMNOwlComponent extends OwlComponent {
    static template = xml`
        <div class="bpmn-owl-component" style="width: 100%; height: 100%; min-height: 600px; border: 1px solid #ddd; border-radius: 4px;">
            <div t-if="state.isLoading" class="d-flex justify-content-center align-items-center h-100">
                <div class="text-center">
                    <i class="fa fa-spinner fa-spin fa-2x text-primary"></i>
                    <p class="mt-2">Loading BPMN diagram...</p>
                </div>
            </div>
            
            <div t-if="state.hasError" class="alert alert-danger m-3">
                <h5><i class="fa fa-exclamation-triangle"></i> Error Loading Diagram</h5>
                <p t-esc="state.errorMessage"></p>
                <button class="btn btn-primary btn-sm" t-on-click="reloadFromRecord">
                    <i class="fa fa-refresh"></i> Retry
                </button>
            </div>
            
            <div class="mb-2" style="padding: 10px; background: #f8f9fa; border-bottom: 1px solid #ddd;">
                <button class="btn btn-sm btn-primary me-2" t-on-click="reloadFromRecord">
                    <i class="fa fa-refresh"></i> Reload from Database
                </button>
                <button class="btn btn-sm btn-secondary me-2" t-on-click="loadTestDiagram">
                    <i class="fa fa-play"></i> Load Test Diagram
                </button>
                <button class="btn btn-sm btn-success me-2" t-on-click="saveToRecord">
                    <i class="fa fa-save"></i> Save to Database
                </button>
                <span t-if="state.recordId" class="text-muted">Record ID: <t t-esc="state.recordId"/></span>
            </div>
            
            <div t-ref="canvas" class="bpmn-canvas" style="width: 100%; height: 550px; min-height: 550px;"></div>
        </div>
    `;

    static props = {
        record: { type: Object, optional: true },
        resModel: { type: String, optional: true },
        resId: { type: Number, optional: true }
    };
    
    setup() {
        this.canvas = useRef("canvas");
        this.orm = useService("orm");
        this.notification = useService("notification");
        
        this.state = useState({
            isLoading: false,
            hasError: false,
            errorMessage: "",
            recordId: null,
            currentXml: null
        });
        
        this.bpmnViewer = null;
        this.isInitialized = false;
        
        onMounted(() => {
            console.log('BPMNOwlComponent: Component mounted with props:', this.props);
            this.initializeComponent();
        });
        
        onWillDestroy(() => {
            console.log('BPMNOwlComponent: Cleaning up resources...');
            this.cleanup();
        });
    }

    async initializeComponent() {
        console.log('BPMNOwlComponent: Initializing component...');
        
        // Initialize BPMN viewer
        await this.initializeBPMN();
        
        // Get record information
        this.extractRecordInfo();
        
        // Load diagram from database
        await this.reloadFromRecord();
    }

    extractRecordInfo() {
        // Try to get record information from props or environment
        if (this.props.record) {
            this.state.recordId = this.props.record.resId;
            console.log('BPMNOwlComponent: Found record ID from props:', this.state.recordId);
        } else if (this.props.resId) {
            this.state.recordId = this.props.resId;
            console.log('BPMNOwlComponent: Found record ID from resId prop:', this.state.recordId);
        } else {
            // Try to extract from URL or form view context
            const urlParams = new URLSearchParams(window.location.search);
            const idFromUrl = urlParams.get('id');
            if (idFromUrl) {
                this.state.recordId = parseInt(idFromUrl);
                console.log('BPMNOwlComponent: Extracted record ID from URL:', this.state.recordId);
            }
        }
    }

    async reloadFromRecord() {
        if (!this.state.recordId) {
            console.log('BPMNOwlComponent: No record ID available, loading default diagram');
            this.loadDefaultDiagram();
            return;
        }

        console.log('BPMNOwlComponent: Loading BPMN XML from database for record:', this.state.recordId);
        
        try {
            this.state.isLoading = true;
            
            const records = await this.orm.read('bpmn.process', [this.state.recordId], ['bpmn_xml']);
            
            if (records && records.length > 0) {
                const bpmnXml = records[0].bpmn_xml;
                console.log('BPMNOwlComponent: Retrieved XML from database, length:', bpmnXml?.length || 0);
                
                if (bpmnXml && bpmnXml.trim()) {
                    this.state.currentXml = bpmnXml;
                    await this.loadDiagram(bpmnXml);
                } else {
                    console.log('BPMNOwlComponent: No XML content in database, loading default');
                    this.loadDefaultDiagram();
                }
            } else {
                console.log('BPMNOwlComponent: Record not found');
                this.loadDefaultDiagram();
            }
        } catch (error) {
            console.error('BPMNOwlComponent: Error loading from database:', error);
            this.state.hasError = true;
            this.state.errorMessage = `Failed to load from database: ${error.message}`;
        } finally {
            this.state.isLoading = false;
        }
    }

    async saveToRecord() {
        if (!this.state.recordId) {
            this.notification.add('No record ID available for saving', { type: 'warning' });
            return;
        }

        if (!this.bpmnViewer) {
            this.notification.add('BPMN viewer not initialized', { type: 'error' });
            return;
        }

        try {
            console.log('BPMNOwlComponent: Saving current diagram to database...');
            
            // Get current XML from BPMN viewer
            const result = await this.bpmnViewer.saveXML({ format: true });
            const xmlToSave = result.xml;
            
            console.log('BPMNOwlComponent: Saving XML to database, length:', xmlToSave.length);
            
            await this.orm.write('bpmn.process', [this.state.recordId], {
                bpmn_xml: xmlToSave
            });
            
            this.state.currentXml = xmlToSave;
            this.notification.add('BPMN diagram saved successfully', { type: 'success' });
            
        } catch (error) {
            console.error('BPMNOwlComponent: Error saving to database:', error);
            this.notification.add(`Failed to save diagram: ${error.message}`, { type: 'error' });
        }
    }
    
    setupTabSwitchListener() {
        // Listen for tab switches to reload diagram when returning to diagram tab
        const notebook = document.querySelector('.o_notebook');
        if (notebook) {
            notebook.addEventListener('click', (event) => {
                const target = event.target.closest('.nav-link');
                if (target && target.textContent.includes('BPMN Diagram')) {
                    // Reload from database when switching back to diagram tab
                    setTimeout(() => {
                        this.reloadFromRecord();
                    }, 200);
                }
            });
        }
    }

    async initializeBPMN() {
        if (this.isInitialized) {
            console.log('BPMNOwlComponent: Already initialized, skipping...');
            return;
        }
        
        try {
            console.log('BPMNOwlComponent: Initializing BPMN.js...');
            
            // Check if BPMN.js is available
            if (typeof window.BpmnJS === 'undefined') {
                throw new Error('BPMN.js library not loaded. Please ensure the library is included.');
            }
            
            // Ensure canvas element is available and has dimensions
            if (!this.canvas.el) {
                throw new Error('Canvas element not found');
            }
            
            // Force canvas to have proper dimensions
            this.canvas.el.style.width = '100%';
            this.canvas.el.style.height = '600px';
            this.canvas.el.style.minHeight = '600px';
            
            // Create BPMN viewer instance with explicit dimensions
            this.bpmnViewer = new window.BpmnJS({
                container: this.canvas.el,
                width: this.canvas.el.offsetWidth || 800,
                height: 600
            });
            
            this.isInitialized = true;
            console.log('BPMNOwlComponent: ✅ BPMN.js initialized successfully');
            
        } catch (error) {
            console.error('BPMNOwlComponent: Failed to initialize BPMN.js:', error);
            this.state.hasError = true;
            this.state.errorMessage = `Failed to initialize BPMN viewer: ${error.message}`;
        }
    }

    async loadDiagram(bpmnXML = null) {
        if (!this.bpmnViewer) {
            console.error('BPMNOwlComponent: BPMN Viewer not initialized');
            return;
        }
        
        this.state.isLoading = true;
        this.state.hasError = false;
        this.state.errorMessage = "";
        
        try {
            // Use provided XML or find it in the form
            let xmlContent = bpmnXML;
            if (!xmlContent) {
                const xmlField = document.querySelector('textarea[name="bpmn_xml"]');
                xmlContent = xmlField ? xmlField.value.trim() : null;
            }
            
            if (!xmlContent) {
                console.log('BPMNOwlComponent: No XML content, loading default diagram');
                this.loadDefaultDiagram();
                return;
            }
            
            console.log('BPMNOwlComponent: Importing BPMN XML...');
            await this.bpmnViewer.importXML(xmlContent);
            
            // Auto-fit the diagram to canvas
            const canvas = this.bpmnViewer.get('canvas');
            canvas.zoom('fit-viewport');
            
            console.log('BPMNOwlComponent: ✅ Diagram loaded successfully');
            
        } catch (error) {
            console.error('BPMNOwlComponent: Failed to load diagram:', error);
            this.state.hasError = true;
            this.state.errorMessage = `Failed to load BPMN diagram: ${error.message}`;
        } finally {
            this.state.isLoading = false;
        }
    }
    
    loadDefaultDiagram() {
        const defaultBPMN = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" 
                  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" 
                  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" 
                  xmlns:di="http://www.omg.org/spec/DD/20100524/DI" 
                  id="Definitions_1" 
                  targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1" isExecutable="true">
    <bpmn:startEvent id="StartEvent_1"/>
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="_BPMNShape_StartEvent_2" bpmnElement="StartEvent_1">
        <dc:Bounds x="179" y="79" width="36" height="36"/>
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;
        
        console.log('BPMNOwlComponent: Loading default diagram');
        this.loadDiagram(defaultBPMN);
    }
    
    loadTestDiagram() {
        const testBPMN = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" 
                  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" 
                  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" 
                  xmlns:di="http://www.omg.org/spec/DD/20100524/DI" 
                  id="Definitions_1" 
                  targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1" isExecutable="true">
    <bpmn:startEvent id="StartEvent_1"/>
    <bpmn:task id="Task_1" name="Process Data"/>
    <bpmn:endEvent id="EndEvent_1"/>
    <bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="Task_1"/>
    <bpmn:sequenceFlow id="Flow_2" sourceRef="Task_1" targetRef="EndEvent_1"/>
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="_BPMNShape_StartEvent_2" bpmnElement="StartEvent_1">
        <dc:Bounds x="179" y="79" width="36" height="36"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="_BPMNShape_Task_1" bpmnElement="Task_1">
        <dc:Bounds x="270" y="57" width="100" height="80"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="_BPMNShape_EndEvent_1" bpmnElement="EndEvent_1">
        <dc:Bounds x="425" y="79" width="36" height="36"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="_BPMNEdge_Flow_1" bpmnElement="Flow_1">
        <di:waypoint x="215" y="97"/>
        <di:waypoint x="270" y="97"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="_BPMNEdge_Flow_2" bpmnElement="Flow_2">
        <di:waypoint x="370" y="97"/>
        <di:waypoint x="425" y="97"/>
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;
        
        console.log('BPMNOwlComponent: Loading test diagram');
        this.loadDiagram(testBPMN);
    }
    cleanup() {
        // Clean up BPMN viewer instance
        if (this.bpmnViewer) {
            try {
                this.bpmnViewer.destroy();
                console.log('BPMNOwlComponent: BPMN viewer destroyed');
            } catch (error) {
                console.warn('BPMNOwlComponent: Error destroying BPMN viewer:', error);
            }
            this.bpmnViewer = null;
        }
        
        // Reset state
        this.state.isLoading = false;
        this.state.hasError = false;
        this.state.errorMessage = "";
        this.state.recordId = null;
        this.state.currentXml = null;
    }
}

// Register component in Odoo's component registry
webRegistry.category("components").add("BPMNOwlComponent", BPMNOwlComponent);

console.log('BPMNOwlComponent: Registered with Odoo component registry');

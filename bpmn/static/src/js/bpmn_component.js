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
            viewChanged: 0
        });
        
        this.viewer = null;
        
        onMounted(() => {
            console.log('BPMNOwlComponent: Mounted successfully');
            // Component ready - no UI message needed
        });
        
        onWillDestroy(() => {
            console.log('BPMNOwlComponent: Cleaning up...');
            if (this.viewer) {
                this.viewer.destroy();
                this.viewer = null;
            }
            // Reset enhanced state
            this.state.selectedElement = null;
            this.state.elementCount = 0;
            this.state.zoomLevel = 1;
            this.state.diagramTitle = '';
        });
    }

    async loadDiagram() {
        console.log('BPMNOwlComponent: Loading diagram...');
        
        // Reset all states at start
        this.state.loading = true;
        this.state.error = false;
        this.state.loaded = false;
        this.state.message = "";  // No loading message for clean UI
        
        try {
            // Find BPMN XML data in the form
            const xmlField = document.querySelector('textarea[id*="bpmn_xml"]');
            if (!xmlField || !xmlField.value.trim()) {
                throw new Error('No BPMN XML data found. Please add BPMN XML content first.');
            }

            const xmlContent = xmlField.value.trim();
            console.log('BPMNOwlComponent: XML content length:', xmlContent.length);
            console.log('BPMNOwlComponent: XML preview:', xmlContent.substring(0, 200) + '...');

            // Check if BPMN.js is available
            if (typeof window.BpmnJS === 'undefined') {
                throw new Error('BPMN.js library not loaded');
            }

            // Clean up existing viewer
            if (this.viewer) {
                this.viewer.destroy();
            }

            // Create new viewer
            this.viewer = new window.BpmnJS({
                container: this.containerRef.el
            });

            // Import the XML
            console.log('BPMNOwlComponent: Importing XML...');
            const result = await this.viewer.importXML(xmlContent);
            
            if (result.warnings && result.warnings.length > 0) {
                console.warn('BPMNOwlComponent: Import warnings:', result.warnings);
            }
            
            // Success state
            this.state.loaded = true;
            this.state.error = false;  // Ensure error state is cleared
            this.state.message = "";   // Clear success message for clean UI
            this.state.lastModified = new Date().toISOString();
            
            // Update enhanced state
            this.updateDiagramInfo();
            
            console.log('BPMNOwlComponent: Diagram loaded successfully');
            
        } catch (error) {
            console.error('BPMNOwlComponent: Load error:', error);
            this.state.error = true;
            this.state.loaded = false;  // Reset loaded state on error
            this.state.message = `❌ Error: ${error.message}`;
        } finally {
            this.state.loading = false;
        }
    }

    updateDiagramInfo() {
        if (!this.viewer) return;
        
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
}

// Register component in Odoo's component registry
webRegistry.category("components").add("BPMNOwlComponent", BPMNOwlComponent);

console.log('BPMNOwlComponent: Registered with Odoo component registry');

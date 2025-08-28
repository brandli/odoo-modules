/** @odoo-module **/

import { Component, useRef, onMounted, onWillDestroy, useState, xml } from "@odoo/owl";
import { registry } from "@web/core/registry";

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
            error: false
        });
        
        this.viewer = null;
        
        onMounted(() => {
            console.log('BPMNOwlComponent: Mounted successfully');
            this.state.message = "OWL Component ready. Click 'Load Diagram' to view BPMN.";
        });
        
        onWillDestroy(() => {
            console.log('BPMNOwlComponent: Cleaning up...');
            if (this.viewer) {
                this.viewer.destroy();
                this.viewer = null;
            }
        });
    }

    async loadDiagram() {
        console.log('BPMNOwlComponent: Loading diagram...');
        this.state.loading = true;
        this.state.error = false;
        this.state.message = "Loading BPMN diagram...";
        
        try {
            // Find BPMN XML data in the form
            const xmlField = document.querySelector('textarea[id*="bpmn_xml"]');
            if (!xmlField || !xmlField.value.trim()) {
                throw new Error('No BPMN XML data found. Please add BPMN XML content first.');
            }

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
            await this.viewer.importXML(xmlField.value);
            
            this.state.loaded = true;
            this.state.message = "✅ BPMN diagram loaded successfully!";
            console.log('BPMNOwlComponent: Diagram loaded successfully');
            
        } catch (error) {
            console.error('BPMNOwlComponent: Load error:', error);
            this.state.error = true;
            this.state.message = `❌ Error: ${error.message}`;
        } finally {
            this.state.loading = false;
        }
    }
}

// Register the component with Odoo's registry
registry.category("components").add("BPMNOwlComponent", BPMNOwlComponent);

console.log('BPMNOwlComponent: Registered with Odoo component registry');

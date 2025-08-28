/** @odoo-module **/

import { Component as OwlComponent, useRef, onMounted, onWillDestroy, useState, xml } from "@odoo/owl";
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
export class BPMNOwlComponent extends OwlComponent {
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
            
            this.state.loaded = true;
            this.state.message = "✅ BPMN diagram loaded successfully!";
            console.log('BPMNOwlComponent: Diagram loaded successfully');
            
        } catch (error) {
            console.error('BPMNOwlComponent: Load error:', error);
            this.state.error = true;
            this.state.message = `❌ Error: ${error.message}`;
            
            // If XML is invalid, show a default empty diagram
            if (error.message.includes('XML') || error.message.includes('parse')) {
                console.log('BPMNOwlComponent: Loading default empty diagram due to XML error');
                try {
                    const emptyBpmn = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" 
                  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" 
                  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" 
                  id="Definitions_1" 
                  targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1" isExecutable="true">
    <bpmn:startEvent id="StartEvent_1"/>
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="_BPMNShape_StartEvent_2" bpmnElement="StartEvent_1">
        <dc:Bounds x="179" y="159" width="36" height="36"/>
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;
                    
                    if (this.viewer) {
                        await this.viewer.importXML(emptyBpmn);
                        this.state.message = "⚠️ Invalid XML - showing default diagram";
                    }
                } catch (fallbackError) {
                    console.error('BPMNOwlComponent: Fallback diagram failed:', fallbackError);
                }
            }
        } finally {
            this.state.loading = false;
        }
    }
}

// Register component in Odoo's component registry
webRegistry.category("components").add("BPMNOwlComponent", BPMNOwlComponent);

console.log('BPMNOwlComponent: Registered with Odoo component registry');

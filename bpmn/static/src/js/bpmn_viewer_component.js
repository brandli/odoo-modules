/** @odoo-module **/

import { Component, useRef, onMounted, onWillDestroy, useState, xml } from "@odoo/owl";
import { registry } from "@web/core/registry";

/**
 * BPMN Viewer Component - Properly mounted OWL component with hooks
 */
export class BPMNViewerComponent extends Component {
    static template = xml`<div class="bpmn-viewer-widget">
        <!-- Success message area (using instance variables for now) -->
        <div t-if="comp.lastMessage and !comp.error" class="alert alert-success mb-3" role="alert">
            <i class="fa fa-check"/> <t t-esc="comp.lastMessage"/>
        </div>
        
        <!-- Error display area (using instance variables for now) -->
        <div t-if="comp.error" class="alert alert-danger mb-3" role="alert">
            <i class="fa fa-exclamation-triangle"/> <t t-esc="comp.error"/>
        </div>
        
        <!-- Load button -->
        <div class="mb-3">
            <button type="button" 
                    class="btn btn-primary" 
                    t-on-click="onLoadDiagram"
                    t-att-disabled="comp.loading">
                <i t-if="comp.loading" class="fa fa-spinner fa-spin"/>
                <i t-else="" class="fa fa-refresh"/>
                <t t-if="comp.loading"> Loading...</t>
                <t t-else=""> Load Diagram (OWL)</t>
            </button>
        </div>
        
        <!-- BPMN Container -->
        <div id="bpmn-display-container-owl" 
             class="bpmn-viewer-container" 
             style="height: 500px; border: 1px solid #dee2e6; background: #fafafa;">
            <div t-if="!comp.loading" 
                 style="display: flex; align-items: center; justify-content: center; height: 100%; color: #6c757d;">
                <div class="text-center">
                    <i class="fa fa-sitemap fa-3x mb-3"/>
                    <div>BPMN Diagram (OWL Component)</div>
                    <small>Click "Load Diagram (OWL)" to render</small>
                </div>
            </div>
            <div t-if="comp.loading" 
                 style="display: flex; align-items: center; justify-content: center; height: 100%; color: #6c757d;">
                <div class="text-center">
                    <i class="fa fa-spinner fa-spin fa-3x mb-3"/>
                    <div>Loading BPMN Diagram...</div>
                </div>
            </div>
        </div>
    </div>`;
    
    setup() {
        // Use instance variables for state management
        this.error = null;
        this.loading = false;
        this.lastMessage = null;
        this.bpmnContainerRef = null;
        this.viewer = null;
        
        // Make function available globally for compatibility
        window.loadBPMNDiagram = this.loadBPMNDiagram.bind(this);
    }
    
    // Helper methods for state management
    showError(message) {
        if (this.state) {
            // Using hooks
            this.state.error = message;
            this.state.loading = false;
        } else {
            // Using instance variables
            this.error = message;
            this.loading = false;
        }
        console.error('BPMN Viewer error:', message);
    }
    
    showMessage(message) {
        if (this.state) {
            // Using hooks
            this.state.lastMessage = message;
            this.state.error = null;
        } else {
            // Using instance variables
            this.lastMessage = message;
            this.error = null;
        }
        console.log('BPMN Viewer:', message);
    }
    
    setLoading(loading) {
        if (this.state) {
            // Using hooks
            this.state.loading = loading;
            if (loading) {
                this.state.error = null;
            }
        } else {
            // Using instance variables
            this.loading = loading;
            if (loading) {
                this.error = null;
            }
        }
    }
    
    cleanup() {
        if (this.viewer) {
            try {
                this.viewer.destroy();
                this.viewer = null;
                console.log('BPMN Viewer: Cleaned up');
            } catch (err) {
                console.error('BPMN Viewer cleanup error:', err);
            }
        }
    }
    
    // Event handler for the load button (called from template)
    onLoadDiagram() {
        console.log('BPMN Viewer: onLoadDiagram called from template');
        this.loadBPMNDiagram();
    }
    
    addGlobalButtonListener() {
        // Add event delegation for any Load Diagram buttons
        document.addEventListener('click', (event) => {
            if (event.target.closest('.bpmn-load-button') || 
                (event.target.textContent && event.target.textContent.includes('Load Diagram'))) {
                event.preventDefault();
                this.loadBPMNDiagram(event);
            }
        });
    }
    
    loadBPMNDiagram(event) {
        console.log('BPMN Viewer: Loading diagram...');
        this.setLoading(true);
        
        try {
            // Check if BPMN.js is available
            if (typeof window.BpmnJS === 'undefined') {
                this.showError('BPMN.js library not found!');
                return;
            }
            
            // Use the OWL component's own container when available, fallback to main container
            let container = null;
            
            // First try the OWL component's container
            container = document.getElementById('bpmn-display-container-owl');
            if (container) {
                console.log('BPMN Viewer: Using OWL component container');
            } else {
                // Fallback to the main container
                container = document.getElementById('bpmn-display-container');
                console.log('BPMN Viewer: Using fallback container');
            }
            
            if (!container) {
                this.showError('Could not find display container!');
                return;
            }
            
            // Find the BPMN XML field
            let textField = null;
            
            // Try multiple selectors to find the BPMN XML field
            const selectors = [
                'textarea[name="bpmn_xml"]',
                'textarea[name*="bpmn_xml"]',
                'textarea[name$="bpmn_xml"]'
            ];
            
            for (const selector of selectors) {
                textField = document.querySelector(selector);
                if (textField && textField.value) {
                    console.log('Found field with selector:', selector);
                    break;
                }
            }
            
            // If still not found, look for any textarea with XML-like content
            if (!textField) {
                const allTextareas = document.querySelectorAll('textarea');
                for (const field of allTextareas) {
                    if (field.value && (
                        field.value.includes('<?xml') || 
                        field.value.includes('&lt;?xml') ||
                        field.value.includes('<bpmn:definitions') || 
                        field.value.includes('&lt;bpmn:definitions')
                    )) {
                        textField = field;
                        console.log('Found XML content in textarea');
                        break;
                    }
                }
            }
            
            if (!textField) {
                this.showError('BPMN XML field not found!');
                return;
            }
            
            const xmlContent = textField.value;
            if (!xmlContent || !xmlContent.trim()) {
                this.showError('No BPMN XML content found!');
                return;
            }
            
            // Validate XML content
            if (!xmlContent.includes('&lt;?xml') && !xmlContent.includes('<?xml') && 
                !xmlContent.includes('&lt;bpmn:definitions') && !xmlContent.includes('<bpmn:definitions')) {
                this.showError('Content does not appear to be valid BPMN XML!\n\nExpected to find <?xml or <bpmn:definitions but found:\n' + xmlContent.substring(0, 200) + '...');
                return;
            }
            
            // Cleanup previous viewer
            this.cleanup();
            
            // Clear container and create new viewer
            container.innerHTML = '';
            
            this.viewer = new window.BpmnJS({
                container: container
            });
            
            // Load the BPMN diagram
            this.viewer.importXML(xmlContent).then(() => {
                this.viewer.get('canvas').zoom('fit-viewport');
                this.showMessage('Diagram loaded successfully');
                this.setLoading(false);
                console.log('BPMN Viewer: Diagram loaded successfully');
            }).catch((err) => {
                this.showError('Error loading BPMN diagram: ' + err.message);
                console.error('BPMN import error:', err);
            });
            
        } catch (err) {
            this.showError('Error: ' + err.message);
            console.error('BPMN Viewer error:', err);
        }
    }
    
    // Event handler for the load button
    onLoadDiagram() {
        this.loadBPMNDiagram();
    }
}

// Register the component
registry.category("bpmn_components").add("BPMNViewerComponent", BPMNViewerComponent);

// Register component and make global function available for compatibility
const bpmnViewerComponent = new BPMNViewerComponent();
bpmnViewerComponent.setup();

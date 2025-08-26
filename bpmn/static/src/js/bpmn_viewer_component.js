/** @odoo-module **/

import { Component, useRef, onMounted, onWillDestroy, useState } from "@odoo/owl";
import { registry } from "@web/core/registry";

/**
 * BPMN Viewer Component - Properly mounted OWL component with hooks
 */
export class BPMNViewerComponent extends Component {
    static template = "bpmn.BPMNViewerTemplate";
    
    setup() {
        // For now, let's simplify and just use the basic approach
        // TODO: Add back adaptive hooks later when auto-mounting works
        
        console.log('BPMN Viewer Component: Setup called (simplified mode)');
        
        // Use instance variables for now (like the working loader)
        this.error = null;
        this.loading = false;
        this.lastMessage = null;
        this.bpmnContainerRef = null; // Will use getElementById as fallback
        this.viewer = null;
        
        // Make function available immediately (like the working loader)
        window.loadBPMNDiagram = this.loadBPMNDiagram.bind(this);
        console.log('BPMN Viewer Component: Global function set');
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
            
            // Use the OWL ref for the container when available, fallback to getElementById
            let container = null;
            
            if (this.bpmnContainerRef && this.bpmnContainerRef.el) {
                container = this.bpmnContainerRef.el;
                console.log('BPMN Viewer: Using OWL ref for container');
            } else {
                container = document.getElementById('bpmn-display-container');
                console.log('BPMN Viewer: Using getElementById fallback for container');
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

// Immediately create an instance to make the function available (like bpmn_loader does)
// This ensures window.loadBPMNDiagram is set when the module loads
const bpmnViewerComponent = new BPMNViewerComponent();
bpmnViewerComponent.setup();
console.log('BPMN Viewer Component: Module loaded and ready');

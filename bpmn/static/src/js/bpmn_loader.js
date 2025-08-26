/** @odoo-module **/

import { Component } from "@odoo/owl";
import { registry } from "@web/core/registry";

/**
 * BPMN Loader - Simple BPMN diagram rendering for Odoo
 * Converted to OWL component while preserving all existing functionality
 */

export class BPMNLoader extends Component {
    static template = "bpmn.BPMNLoaderTemplate";
    
    setup() {
        // Initialize state as regular instance variables
        this.error = null;
        this.loading = false;
        this.lastMessage = null;
        
        // Make function available globally for backward compatibility
        window.loadBPMNDiagram = this.loadBPMNDiagram.bind(this);
    }
    
    // Helper methods for better error handling
    showError(message) {
        this.error = message;
        this.loading = false;
        console.error('BPMN Loader error:', message);
        // Keep alert for now for backward compatibility, but also update state
        alert(message);
    }
    
    showMessage(message) {
        this.lastMessage = message;
        this.error = null;
        console.log('BPMN Loader:', message);
    }
    
    setLoading(loading) {
        this.loading = loading;
        if (loading) {
            this.error = null;
        }
    }
    
    loadBPMNDiagram(event) {
        console.log('BPMN Loader: Loading diagram...');
        this.setLoading(true);
        
        try {
            // Check if BPMN.js is available
            if (typeof window.BpmnJS === 'undefined') {
                this.showError('BPMN.js library not found!');
                return;
            }
            
            // Find the display container
            const container = document.getElementById('bpmn-display-container');
            
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
            
            // Clear container and create viewer
            container.innerHTML = '';
            
            const viewer = new window.BpmnJS({
                container: container
            });
            
            // Load the BPMN diagram
            viewer.importXML(xmlContent).then(() => {
                viewer.get('canvas').zoom('fit-viewport');
                this.showMessage('Diagram loaded successfully');
                this.setLoading(false);
                console.log('BPMN Loader: Diagram loaded successfully');
            }).catch((err) => {
                this.showError('Error loading BPMN diagram: ' + err.message);
                console.error('BPMN import error:', err);
            });
            
        } catch (err) {
            this.showError('Error: ' + err.message);
            console.error('BPMN Loader error:', err);
        }
    }
}

// Register the component for backward compatibility
registry.category("bpmn_components").add("BPMNLoader", BPMNLoader);

// Immediately create an instance to make the function available
// This ensures window.loadBPMNDiagram is set when the module loads
// Initialize loader and make global function available
const bpmnLoader = new BPMNLoader();
bpmnLoader.setup();

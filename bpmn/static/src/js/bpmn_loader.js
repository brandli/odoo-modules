/**
 * BPMN Loader - Simple BPMN diagram rendering for Odoo
 */
console.log('BPMN Loader: Loading...');

(function() {
    'use strict';
    
    // Make function globally available
    window.loadBPMNDiagram = function(event) {
        console.log('BPMN Loader: Loading diagram...');
        
        try {
            // Check if BPMN.js is available
            if (typeof window.BpmnJS === 'undefined') {
                alert('BPMN.js library not found!');
                console.error('BPMN.js library not loaded');
                return;
            }
            
            // Find the display container
            const container = document.getElementById('bpmn-display-container');
            
            if (!container) {
                alert('Could not find display container!');
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
                alert('BPMN XML field not found!');
                return;
            }
            
            const xmlContent = textField.value;
            if (!xmlContent || !xmlContent.trim()) {
                alert('No BPMN XML content found!');
                return;
            }
            
            // Validate XML content
            if (!xmlContent.includes('&lt;?xml') && !xmlContent.includes('<?xml') && 
                !xmlContent.includes('&lt;bpmn:definitions') && !xmlContent.includes('<bpmn:definitions')) {
                alert('Content does not appear to be valid BPMN XML!\n\nExpected to find <?xml or <bpmn:definitions but found:\n' + xmlContent.substring(0, 200) + '...');
                return;
            }
            
            // Clear container and create viewer
            container.innerHTML = '';
            
            const viewer = new window.BpmnJS({
                container: container
            });
            
            // Load the BPMN diagram
            viewer.importXML(xmlContent).then(function() {
                viewer.get('canvas').zoom('fit-viewport');
                console.log('BPMN Loader: Diagram loaded successfully');
            }).catch(function(err) {
                console.error('BPMN import error:', err);
                alert('Error loading BPMN diagram: ' + err.message);
            });
            
        } catch (err) {
            console.error('BPMN Loader error:', err);
            alert('Error: ' + err.message);
        }
    };
    
    console.log('BPMN Loader: Ready');
    
})();

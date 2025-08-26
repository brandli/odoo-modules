console.log('*** BPMN Loader script starting ***');

(function() {
    'use strict';
    
    console.log('*** BPMN Loader script loaded successfully ***');
    
    // Make function globally available
    window.loadBPMNDiagram = function(event) {
        console.log('=== Load BPMN Diagram clicked ===');
        
        // Show alert to confirm function is called
        alert('BPMN Load function called! Check console for details.');
        
        console.log('Checking BPMN.js availability...');
        console.log('window.BpmnJS type:', typeof window.BpmnJS);
        
        if (typeof window.BpmnJS === 'undefined') {
            alert('BPMN.js library not found!');
            console.error('BPMN.js library not loaded');
            return;
        }
        
        // Find elements
        let container = document.getElementById('bpmn-display-container');
        console.log('Container found:', !!container);
        
        // Enhanced debugging - check what containers are actually available
        if (!container) {
            console.log('Container not found, debugging DOM...');
            
            // Check all divs with IDs
            const allDivs = document.querySelectorAll('div[id]');
            console.log('All divs with IDs:', allDivs.length);
            allDivs.forEach((div, index) => {
                console.log(`Div ${index}: id="${div.id}", classes="${div.className}"`);
            });
            
            // Check all elements containing 'bpmn' in id or class
            const bpmnElements = document.querySelectorAll('[id*="bpmn"], [class*="bpmn"]');
            console.log('Elements with "bpmn" in id/class:', bpmnElements.length);
            bpmnElements.forEach((el, index) => {
                console.log(`BPMN element ${index}:`, {
                    tag: el.tagName,
                    id: el.id,
                    className: el.className
                });
            });
            
            // Check if we can find container by other means
            const containerByClass = document.querySelector('.bpmn-display-container');
            const containerByStyle = document.querySelector('div[style*="height: 500px"]');
            
            console.log('Container by class:', !!containerByClass);
            console.log('Container by style:', !!containerByStyle);
            
            // Try to use any container we can find
            container = containerByClass || containerByStyle;
            if (container) {
                console.log('Using alternative container:', container.id || container.className);
            }
        }
        
        if (!container) {
            // As a last resort, create a container
            console.log('Creating container as last resort...');
            const button = event.target;
            const parentDiv = button.closest('div');
            if (parentDiv) {
                container = document.createElement('div');
                container.id = 'bpmn-display-container';
                container.style.cssText = 'height: 500px; border: 1px solid #dee2e6; background: #fafafa; margin-top: 10px;';
                parentDiv.appendChild(container);
                console.log('Created new container');
            }
        }
        
        if (!container) {
            alert('Container not found!');
            return;
        }
        
        // Find the BPMN XML text field - since button is now on XML Source tab, it should be nearby
        console.log('Looking for BPMN XML text field...');
        let textField = null;
        
        // Method 1: Find the field that's closest to our button (same parent container)
        const button = event.target;
        if (button) {
            const parentDiv = button.closest('div');
            if (parentDiv) {
                textField = parentDiv.querySelector('textarea');
                console.log('Method 1 - textarea in same container as button:', !!textField);
                if (textField) {
                    console.log('Found field in same container, content preview:', textField.value ? textField.value.substring(0, 100) : 'empty');
                }
            }
        }
        
        // Method 2: Look specifically for bpmn_xml field
        if (!textField) {
            textField = document.querySelector('textarea[name="bpmn_xml"]');
            console.log('Method 2 - textarea[name="bpmn_xml"]:', !!textField);
        }
        
        if (!textField) {
            textField = document.querySelector('textarea[name*="bpmn_xml"]');
            console.log('Method 3 - textarea[name*="bpmn_xml"]:', !!textField);
        }
        
        // Method 3: Get all textareas and find the one with XML content
        if (!textField) {
            const allTextareas = document.querySelectorAll('textarea');
            console.log('Method 4 - checking all textareas:', allTextareas.length);
            
            allTextareas.forEach((field, index) => {
                const fieldInfo = {
                    name: field.name,
                    id: field.id,
                    className: field.className,
                    value_preview: field.value ? field.value.substring(0, 100) + '...' : 'empty'
                };
                console.log(`Textarea ${index}:`, fieldInfo);
                
                // Look for XML-like content or the largest field
                if (field.value && (field.value.includes('<?xml') || field.value.includes('<bpmn:definitions') || field.value.length > 100)) {
                    textField = field;
                    console.log('Selected textarea with XML-like content:', fieldInfo);
                    return; // Found it!
                }
            });
            
            // If still no XML content found, try the largest textarea
            if (!textField && allTextareas.length > 0) {
                let largestField = allTextareas[0];
                allTextareas.forEach(field => {
                    if (field.value && field.value.length > largestField.value.length) {
                        largestField = field;
                    }
                });
                textField = largestField;
                console.log('Using largest textarea as fallback');
            }
        }
        
        if (!textField) {
            // List all available form fields for debugging
            const allTextareas = document.querySelectorAll('textarea');
            const allInputs = document.querySelectorAll('input[type="text"]');
            console.log('All textareas found:', allTextareas.length);
            console.log('All text inputs found:', allInputs.length);
            
            allTextareas.forEach((field, index) => {
                console.log(`Textarea ${index}:`, {
                    name: field.name,
                    id: field.id,
                    className: field.className,
                    placeholder: field.placeholder
                });
            });
            
            allInputs.forEach((field, index) => {
                console.log(`Input ${index}:`, {
                    name: field.name,
                    id: field.id,
                    className: field.className,
                    placeholder: field.placeholder
                });
            });
            
            alert('XML text field not found! Check console for available fields.');
            return;
        }
        
        const xmlContent = textField.value;
        console.log('XML length:', xmlContent ? xmlContent.length : 0);
        
        if (!xmlContent || !xmlContent.trim()) {
            alert('No XML content found!');
            return;
        }
        
        try {
            console.log('Creating BPMN viewer...');
            container.innerHTML = '';
            
            const viewer = new window.BpmnJS({
                container: container
            });
            
            console.log('Loading XML...');
            viewer.importXML(xmlContent).then(function() {
                console.log('Success! Fitting viewport...');
                viewer.get('canvas').zoom('fit-viewport');
                alert('BPMN diagram loaded successfully!');
            }).catch(function(err) {
                console.error('Import error:', err);
                alert('Error loading diagram: ' + err.message);
            });
            
        } catch (err) {
            console.error('Viewer creation error:', err);
            alert('Error creating viewer: ' + err.message);
        }
    };
    
    console.log('*** BPMN function registered ***');
    
})();

console.log('*** BPMN Loader script complete ***');

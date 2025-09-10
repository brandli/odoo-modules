/** @odoo-module **/

// Debug script to check BPMN.js library loading
console.log('BPMN Debug: Script loaded');

// Check immediately if BpmnJS is available
console.log('BPMN Debug: window.BpmnJS available:', typeof window.BpmnJS);
console.log('BPMN Debug: All window keys with "bpmn" or "Bpmn":', 
    Object.keys(window).filter(k => k.toLowerCase().includes('bpmn')));

// Check after a delay
setTimeout(() => {
    console.log('BPMN Debug (1s): window.BpmnJS available:', typeof window.BpmnJS);
    console.log('BPMN Debug (1s): All window keys with "bpmn" or "Bpmn":', 
        Object.keys(window).filter(k => k.toLowerCase().includes('bpmn')));
}, 1000);

// Check after longer delay
setTimeout(() => {
    console.log('BPMN Debug (3s): window.BpmnJS available:', typeof window.BpmnJS);
    if (window.BpmnJS) {
        console.log('BPMN Debug (3s): BpmnJS constructor:', window.BpmnJS);
        console.log('BPMN Debug (3s): BpmnJS prototype:', window.BpmnJS.prototype);
    }
}, 3000);

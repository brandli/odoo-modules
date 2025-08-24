/** @odoo-module **/

import { Component, onMounted, onWillDestroy, useRef } from "@odoo/owl";

export class BPMNViewer extends Component {
    static template = "bpmn.BPMNViewer";
    static props = {
        xmlContent: { type: String, optional: true },
        height: { type: String, optional: true },
        readonly: { type: Boolean, optional: true },
        "*": true, // Allow any other props
    };

    setup() {
        this.containerRef = useRef("bpmnContainer");
        this.viewer = null;
        this.height = this.props.height || "400px";
        
        onMounted(() => this.initViewer());
        onWillDestroy(() => this.cleanup());
    }

    async initViewer() {
        try {
            // Check if BPMN.js is available
            if (typeof window.BpmnJS === 'undefined') {
                this.showError('BPMN.js library not loaded');
                return;
            }
            
            // BPMN.js exports the Viewer directly as BpmnJS
            this.viewer = new window.BpmnJS({
                container: this.containerRef.el,
                width: "100%",
                height: this.height,
            });

            if (this.props.xmlContent) {
                try {
                    await this.viewer.importXML(this.props.xmlContent);
                    // Fit viewport to show entire diagram
                    this.viewer.get('canvas').zoom('fit-viewport');
                } catch (err) {
                    console.error('Error importing BPMN XML:', err);
                    this.showError('Invalid BPMN XML format');
                }
            } else {
                this.showPlaceholder();
            }
        } catch (err) {
            console.error('Error initializing BPMN viewer:', err);
            this.showError('Failed to initialize BPMN viewer');
        }
    }

    showError(message) {
        if (this.containerRef.el) {
            this.containerRef.el.innerHTML = `
                <div class="alert alert-warning text-center p-4" style="height: ${this.height}; display: flex; align-items: center; justify-content: center;">
                    <div>
                        <i class="fa fa-exclamation-triangle fa-2x mb-2"></i>
                        <div>${message}</div>
                    </div>
                </div>
            `;
        }
    }

    showPlaceholder() {
        if (this.containerRef.el) {
            this.containerRef.el.innerHTML = `
                <div class="text-center text-muted p-4" style="height: ${this.height}; display: flex; align-items: center; justify-content: center; border: 2px dashed #dee2e6;">
                    <div>
                        <i class="fa fa-sitemap fa-3x mb-3"></i>
                        <div>No BPMN diagram to display</div>
                        <small>Add BPMN XML content to view the diagram</small>
                    </div>
                </div>
            `;
        }
    }

    cleanup() {
        if (this.viewer) {
            try {
                this.viewer.destroy();
            } catch (err) {
                console.error('Error destroying BPMN viewer:', err);
            }
            this.viewer = null;
        }
    }
}

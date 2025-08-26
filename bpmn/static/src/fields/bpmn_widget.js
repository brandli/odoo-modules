/** @odoo-module **/

import { registry } from "@web/core/registry";
import { Component, useRef, onMounted, onWillDestroy, onPatched } from "@odoo/owl";

export class BPMNWidget extends Component {
    static template = "bpmn.BPMNWidget";
    static props = {
        record: Object,
        name: String,
        readonly: { type: Boolean, optional: true },
    };

    setup() {
        this.bpmnContainerRef = useRef("bpmnContainer");
        this.viewer = null;
        
        onMounted(() => this.initViewer());
        onWillDestroy(() => this.cleanup());
        onPatched(() => this.updateDiagram());
    }

    get xmlContent() {
        return this.props.record.data[this.props.name] || "";
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
                container: this.bpmnContainerRef.el,
                width: "100%",
                height: "400px",
            });

            await this.updateDiagram();
        } catch (err) {
            console.error('Error initializing BPMN viewer:', err);
            this.showError('Failed to initialize BPMN viewer: ' + err.message);
        }
    }

    async updateDiagram() {
        if (!this.viewer || !this.bpmnContainerRef.el) {
            return;
        }

        const xmlContent = this.xmlContent;
        
        if (!xmlContent || xmlContent.trim() === '') {
            this.showPlaceholder();
            return;
        }

        try {
            await this.viewer.importXML(xmlContent);
            this.viewer.get('canvas').zoom('fit-viewport');
        } catch (err) {
            console.error('Error updating BPMN diagram:', err);
            this.showError('Invalid BPMN XML: ' + err.message);
        }
    }

    showError(message) {
        if (this.bpmnContainerRef.el) {
            this.bpmnContainerRef.el.innerHTML = `
                <div class="alert alert-warning text-center p-4" style="height: 400px; display: flex; align-items: center; justify-content: center;">
                    <div>
                        <i class="fa fa-exclamation-triangle fa-2x mb-2"></i>
                        <div>${message}</div>
                    </div>
                </div>
            `;
        }
    }

    showPlaceholder() {
        if (this.bpmnContainerRef.el) {
            this.bpmnContainerRef.el.innerHTML = `
                <div class="text-center text-muted p-4" style="height: 400px; display: flex; align-items: center; justify-content: center; border: 2px dashed #dee2e6;">
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

registry.category("fields").add("bpmn_widget", BPMNWidget);

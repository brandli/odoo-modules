/** @odoo-module **/

import { Component, useRef, onMounted, onWillDestroy, useState, xml } from "@odoo/owl";
import { registry } from "@web/core/registry";
import { standardFieldProps } from "@web/views/fields/standard_field_props";

/**
 * BPMN Field Widget for Odoo Forms
 * 
 * This widget properly integrates with Odoo's form system to access record data
 * and provide BPMN editing capabilities within form views.
 */
export class BPMNFieldWidget extends Component {
    static template = xml`
        <div class="bpmn-field-widget">
            <div t-ref="bpmnContainer" class="bpmn-container" style="height: 500px; background: #fff; border: 1px solid #ddd;">
                <div t-if="!state.loaded" class="d-flex align-items-center justify-content-center h-100">
                    <div class="text-center text-muted">
                        <div t-if="state.loading">
                            <i class="fa fa-spinner fa-spin fa-2x mb-3"/>
                            <div>Loading BPMN editor...</div>
                        </div>
                        <div t-elif="state.error">
                            <i class="fa fa-exclamation-triangle fa-2x mb-3 text-danger"/>
                            <div>Failed to load BPMN editor</div>
                            <button type="button" class="btn btn-sm btn-outline-primary mt-2" t-on-click="initializeBPMN">
                                <i class="fa fa-refresh me-1"/>Retry
                            </button>
                        </div>
                        <div t-else="">
                            <i class="fa fa-sitemap fa-2x mb-3"/>
                            <div>BPMN Editor</div>
                        </div>
                    </div>
                </div>
            </div>
            <div t-if="state.message" class="alert mt-2" t-att-class="state.error ? 'alert-danger' : 'alert-info'">
                <span t-esc="state.message"/>
            </div>
        </div>
    `;

    static props = {
        ...standardFieldProps,
    };

    setup() {
        this.containerRef = useRef("bpmnContainer");
        this.state = useState({
            loaded: false,
            loading: false,
            error: false,
            message: ''
        });

        this.modeler = null;

        onMounted(() => this.onMounted());
        onWillDestroy(() => this.onWillDestroy());
    }

    async onMounted() {
        console.log('BPMNFieldWidget: Mounted');
        console.log('Widget props:', this.props);
        console.log('Record data:', this.props.record?.data);
        console.log('Field value:', this.props.value);
        
        await this.initializeBPMN();
    }

    onWillDestroy() {
        if (this.modeler) {
            this.modeler.destroy();
        }
    }

    async initializeBPMN() {
        this.state.loading = true;
        this.state.error = false;
        this.state.message = '';

        try {
            // Wait for BPMN.js library
            let retries = 0;
            while (typeof window.BpmnJS === 'undefined' && retries < 10) {
                console.log(`Waiting for BPMN.js library... (attempt ${retries + 1}/10)`);
                await new Promise(resolve => setTimeout(resolve, 500));
                retries++;
            }

            if (typeof window.BpmnJS === 'undefined') {
                throw new Error('BPMN.js library not available');
            }

            // Initialize modeler
            this.modeler = new window.BpmnJS({
                container: this.containerRef.el
            });

            console.log('BPMN Modeler initialized');

            // Load XML content
            await this.loadDiagram();

            this.state.loaded = true;
            this.state.message = 'BPMN editor loaded successfully';

            // Setup change listener
            this.setupEventListeners();

        } catch (error) {
            console.error('Error initializing BPMN:', error);
            this.state.error = true;
            this.state.message = `Initialization failed: ${error.message}`;
        } finally {
            this.state.loading = false;
        }
    }

    async loadDiagram() {
        const xmlContent = this.props.value;
        
        console.log('Loading diagram from field value');
        console.log('XML content length:', xmlContent ? xmlContent.length : 'null/undefined');
        
        if (xmlContent && xmlContent.trim()) {
            console.log('Loading existing XML content');
            await this.modeler.importXML(xmlContent);
        } else {
            console.log('No XML content, creating default diagram');
            await this.createDefaultDiagram();
        }
    }

    async createDefaultDiagram() {
        const defaultXML = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
                  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
                  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
                  id="Definitions_1"
                  targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1" isExecutable="false">
    <bpmn:startEvent id="StartEvent_1">
      <bpmn:outgoing>Flow_1</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:task id="Task_1" name="Sample Task">
      <bpmn:incoming>Flow_1</bpmn:incoming>
      <bpmn:outgoing>Flow_2</bpmn:outgoing>
    </bpmn:task>
    <bpmn:endEvent id="EndEvent_1">
      <bpmn:incoming>Flow_2</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="Task_1" />
    <bpmn:sequenceFlow id="Flow_2" sourceRef="Task_1" targetRef="EndEvent_1" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="StartEvent_1_di" bpmnElement="StartEvent_1">
        <dc:Bounds x="179" y="99" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_1_di" bpmnElement="Task_1">
        <dc:Bounds x="270" y="77" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="EndEvent_1_di" bpmnElement="EndEvent_1">
        <dc:Bounds x="432" y="99" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1">
        <di:waypoint x="215" y="117" />
        <di:waypoint x="270" y="117" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2">
        <di:waypoint x="370" y="117" />
        <di:waypoint x="432" y="117" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;

        await this.modeler.importXML(defaultXML);
        
        // Auto-save the default diagram
        const result = await this.modeler.saveXML({ format: true });
        this.updateFieldValue(result.xml);
    }

    setupEventListeners() {
        const eventBus = this.modeler.get('eventBus');

        // Listen for changes and save to field
        eventBus.on(['commandStack.changed'], () => {
            this.saveDiagram();
        });
    }

    async saveDiagram() {
        try {
            const result = await this.modeler.saveXML({ format: true });
            this.updateFieldValue(result.xml);
        } catch (error) {
            console.error('Error saving diagram:', error);
        }
    }

    updateFieldValue(xml) {
        // Update the field value in the form
        this.props.update(xml);
    }
}

// Register the widget
registry.category("fields").add("bpmn_editor", BPMNFieldWidget);

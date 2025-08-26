/** @odoo-module **/

import { registry } from "@web/core/registry";
import { Component } from "@odoo/owl";
import { BPMNViewerComponent } from "./bpmn_viewer_component";

/**
 * Simple page component that includes the BPMN viewer
 */
export class BPMNPageComponent extends Component {
    static template = "bpmn.BPMNPageTemplate";
    static components = { BPMNViewerComponent };
}

// Register as a component that can be used in views
registry.category("bpmn_components").add("BPMNPageComponent", BPMNPageComponent);

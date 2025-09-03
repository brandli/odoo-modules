# -*- coding: utf-8 -*-

from odoo import models, fields, api


class BPMNProcess(models.Model):
    _name = 'bpmn.process'
    _description = 'BPMN Process Definition'
    _order = 'name asc'

    name = fields.Char(
        string='Process Name',
        required=True,
        help="Name of the BPMN process"
    )
    
    description = fields.Text(
        string='Description',
        help="Description of the process"
    )
    
    bpmn_xml = fields.Text(
        string='BPMN Definition',
        help="BPMN 2.0 XML definition of the process"
    )
    
    active = fields.Boolean(
        string='Active',
        default=True,
        help="Whether this process is active"
    )
    
    @api.model
    def create(self, vals):
        """Override create to provide default BPMN XML if none provided"""
        if not vals.get('bpmn_xml'):
            vals['bpmn_xml'] = self._get_default_bpmn_xml(vals.get('name', 'New Process'))
        else:
            # Validate BPMN XML format
            self._validate_bpmn_xml(vals['bpmn_xml'])
        return super().create(vals)
    
    def write(self, vals):
        """Override write to validate BPMN XML when updated"""
        if 'bpmn_xml' in vals and vals['bpmn_xml']:
            self._validate_bpmn_xml(vals['bpmn_xml'])
        return super().write(vals)
    
    def _validate_bpmn_xml(self, xml_content):
        """Validate BPMN XML format to ensure database integrity"""
        if not xml_content or not xml_content.strip():
            return True  # Empty content is allowed
            
        xml_content = xml_content.strip()
        
        # Basic validation checks
        if not xml_content.startswith('<?xml'):
            raise ValueError("BPMN XML must start with XML declaration")
            
        if 'bpmn:definitions' not in xml_content and '<definitions' not in xml_content:
            raise ValueError("BPMN XML must contain valid BPMN definitions element")
            
        # Check for required BPMN namespace
        required_namespaces = [
            'http://www.omg.org/spec/BPMN/20100524/MODEL',
            'bpmn:',
            'bpmndi:'
        ]
        
        has_namespace = any(ns in xml_content for ns in required_namespaces)
        if not has_namespace:
            raise ValueError("BPMN XML must contain valid BPMN 2.0 namespace")
            
        return True
    
    @api.model
    def get_bpmn_data(self, record_id):
        """API method to retrieve BPMN data for JavaScript components"""
        try:
            record = self.browse(record_id)
            if not record.exists():
                return {
                    'success': False,
                    'error': f'BPMN process record {record_id} not found'
                }
            
            return {
                'success': True,
                'data': {
                    'id': record.id,
                    'name': record.name,
                    'description': record.description,
                    'bpmn_xml': record.bpmn_xml,
                    'active': record.active,
                    'last_modified': record.write_date.isoformat() if record.write_date else None,
                }
            }
        except Exception as e:
            return {
                'success': False,
                'error': f'Error retrieving BPMN data: {str(e)}'
            }
    
    def get_bpmn_xml_safe(self):
        """Get BPMN XML with error handling for frontend"""
        try:
            self.ensure_one()
            return {
                'success': True,
                'xml': self.bpmn_xml or '',
                'record_id': self.id,
                'name': self.name,
                'last_modified': self.write_date.isoformat() if self.write_date else None,
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'xml': '',
                'record_id': self.id if hasattr(self, 'id') else None,
            }
    
    def _get_default_bpmn_xml(self, process_name):
        """Generate a basic BPMN XML template"""
        return f'''<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
                  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
                  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
                  id="Definitions_1"
                  targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1" isExecutable="false" name="{process_name}">
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
</bpmn:definitions>'''

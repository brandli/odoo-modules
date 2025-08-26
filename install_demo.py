#!/usr/bin/env python3
"""
Simple script to check if we can load demo data into the BPMN module
"""

# Create SQL statements to insert demo data directly
demo_sql = """
-- Insert demo data for BPMN processes
INSERT INTO bpmn_process (name, version, description, active, bpmn_xml, create_date, write_date, create_uid, write_uid) 
VALUES 
(
    'Order Fulfillment Process',
    '1.0',
    'Complete process for handling customer orders from receipt to delivery',
    true,
    '<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
                  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
                  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
                  id="Definitions_OrderFulfillment"
                  targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="OrderFulfillmentProcess" isExecutable="false" name="Order Fulfillment Process">
    <bpmn:startEvent id="StartEvent_OrderReceived" name="Order Received">
      <bpmn:outgoing>Flow_1</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:task id="Task_ValidateOrder" name="Validate Order">
      <bpmn:incoming>Flow_1</bpmn:incoming>
      <bpmn:outgoing>Flow_2</bpmn:outgoing>
    </bpmn:task>
    <bpmn:endEvent id="EndEvent_OrderShipped" name="Order Shipped">
      <bpmn:incoming>Flow_2</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_OrderReceived" targetRef="Task_ValidateOrder" />
    <bpmn:sequenceFlow id="Flow_2" sourceRef="Task_ValidateOrder" targetRef="EndEvent_OrderShipped" />
  </bpmn:process>
</bpmn:definitions>',
    NOW(),
    NOW(),
    1,
    1
);
"""

print("SQL to create demo BPMN process:")
print(demo_sql)

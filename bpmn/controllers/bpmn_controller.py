# -*- coding: utf-8 -*-

import logging
from odoo import http
from odoo.http import request
from odoo.exceptions import UserError, ValidationError

_logger = logging.getLogger(__name__)


class BPMNController(http.Controller):
    """Controller for BPMN-related HTTP endpoints"""

    @http.route('/bpmn/auto_save', type='json', auth='user', methods=['POST'], csrf=False)
    def auto_save_process(self, process_id, xml_content):
        """
        Auto-save endpoint for BPMN processes
        
        :param int process_id: ID of the BPMN process to save
        :param str xml_content: BPMN XML content to save
        :return: JSON response with success status and details
        """
        try:
            if not process_id:
                return {
                    'success': False,
                    'error': 'Process ID is required'
                }
            
            if not xml_content:
                return {
                    'success': False,
                    'error': 'XML content is required'
                }
            
            # Get the process record
            process = request.env['bpmn.process'].browse(process_id)
            if not process.exists():
                return {
                    'success': False,
                    'error': f'BPMN process with ID {process_id} not found'
                }
            
            # Perform auto-save using the model method
            result = process.auto_save(xml_content)
            
            _logger.info(f"Auto-save attempt for process {process_id}: {result.get('success', False)}")
            
            return result
            
        except (UserError, ValidationError) as e:
            _logger.warning(f"Auto-save validation error for process {process_id}: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
        except Exception as e:
            _logger.error(f"Auto-save error for process {process_id}: {str(e)}")
            return {
                'success': False,
                'error': f'Unexpected error during auto-save: {str(e)}'
            }

    @http.route('/bpmn/get_process_data', type='json', auth='user', methods=['POST'], csrf=False)
    def get_process_data(self, process_id):
        """
        Get BPMN process data for JavaScript components
        
        :param int process_id: ID of the BPMN process
        :return: JSON response with process data
        """
        try:
            if not process_id:
                return {
                    'success': False,
                    'error': 'Process ID is required'
                }
            
            process = request.env['bpmn.process'].browse(process_id)
            if not process.exists():
                return {
                    'success': False,
                    'error': f'BPMN process with ID {process_id} not found'
                }
            
            return process.get_bpmn_xml_safe()
            
        except Exception as e:
            _logger.error(f"Error retrieving process data for {process_id}: {str(e)}")
            return {
                'success': False,
                'error': f'Error retrieving process data: {str(e)}'
            }

    @http.route('/bpmn/validate_xml', type='json', auth='user', methods=['POST'], csrf=False)
    def validate_bpmn_xml(self, xml_content):
        """
        Validate BPMN XML content
        
        :param str xml_content: BPMN XML content to validate
        :return: JSON response with validation result
        """
        try:
            if not xml_content:
                return {
                    'success': False,
                    'error': 'XML content is required for validation'
                }
            
            # Use the model's validation method
            process_model = request.env['bpmn.process']
            process_model._validate_bpmn_xml(xml_content)
            
            return {
                'success': True,
                'message': 'BPMN XML is valid'
            }
            
        except (ValueError, ValidationError) as e:
            return {
                'success': False,
                'error': str(e)
            }
        except Exception as e:
            _logger.error(f"XML validation error: {str(e)}")
            return {
                'success': False,
                'error': f'Validation error: {str(e)}'
            }

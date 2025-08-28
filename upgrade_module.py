#!/usr/bin/env python3
"""
Script to upgrade the BPMN module in Odoo using XML-RPC
"""
import xmlrpc.client
import sys

# Kubernetes service or localhost
ODOO_HOST = 'localhost'
ODOO_PORT = 8069
ODOO_DB = 'test'
ODOO_USER = 'admin'
ODOO_PASSWORD = 'admin'

def upgrade_module():
    try:
        # Connect to Odoo
        common = xmlrpc.client.ServerProxy(f'http://{ODOO_HOST}:{ODOO_PORT}/xmlrpc/2/common')
        
        # Authenticate
        uid = common.authenticate(ODOO_DB, ODOO_USER, ODOO_PASSWORD, {})
        if not uid:
            print("Authentication failed!")
            return False
            
        # Get object proxy
        models = xmlrpc.client.ServerProxy(f'http://{ODOO_HOST}:{ODOO_PORT}/xmlrpc/2/object')
        
        # Find the BPMN module
        module_ids = models.execute_kw(
            ODOO_DB, uid, ODOO_PASSWORD,
            'ir.module.module', 'search',
            [[('name', '=', 'bpmn')]]
        )
        
        if not module_ids:
            print("BPMN module not found!")
            return False
            
        print(f"Found BPMN module with ID: {module_ids[0]}")
        
        # Upgrade the module
        models.execute_kw(
            ODOO_DB, uid, ODOO_PASSWORD,
            'ir.module.module', 'button_immediate_upgrade',
            [module_ids]
        )
        
        print("Module upgrade initiated successfully!")
        print("Please refresh your browser to see the changes.")
        return True
        
    except Exception as e:
        print(f"Error upgrading module: {e}")
        return False

if __name__ == '__main__':
    print("Upgrading BPMN module...")
    success = upgrade_module()
    sys.exit(0 if success else 1)

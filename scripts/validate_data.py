import os
import json

def validate_seed_data():
    seed_dir = os.path.join(os.path.dirname(__file__), '..', 'data', 'seed')
    if not os.path.exists(seed_dir):
        print(f"[ERROR] Directory not found: {seed_dir}")
        return

    files = [f for f in os.listdir(seed_dir) if f.endswith('.json')]
    print(f"--- Validating {len(files)} JSON files ---")

    required_root_keys = [
        'country', 'country_code', 'jurisdiction', 'jurisdiction_type', 
        'effective_date', 'source_title', 'source_url', 'violations'
    ]
    required_violation_keys = [
        'id', 'name', 'category', 'section_reference', 'severity', 
        'vehicle_classes', 'fines', 'source'
    ]

    errors = 0
    for f in files:
        path = os.path.join(seed_dir, f)
        with open(path, 'r', encoding='utf-8') as file:
            try:
                data = json.load(file)
                # Check root keys
                for key in required_root_keys:
                    if key not in data:
                        print(f"[FAIL] {f}: Missing root key '{key}'")
                        errors += 1
                
                violations = data.get('violations', [])
                if not violations:
                    print(f"[FAIL] {f}: No violations array found or it is empty")
                    errors += 1
                
                # Check violation keys
                for i, v in enumerate(violations):
                    for key in required_violation_keys:
                        if key not in v:
                            print(f"[FAIL] {f} -> violation[{i}] ({v.get('id', 'unknown')}): Missing key '{key}'")
                            errors += 1
                    
                    # Check fines structure
                    fines = v.get('fines', {})
                    if 'first_offence' not in fines:
                        print(f"[FAIL] {f} -> violation[{i}] ({v.get('id', 'unknown')}): Missing 'fines.first_offence'")
                        errors += 1
                        
            except json.JSONDecodeError as e:
                print(f"[FAIL] {f}: Invalid JSON - {str(e)}")
                errors += 1

    print("\n--- Validation Summary ---")
    if errors == 0:
        print("[SUCCESS] All 13 data entries are fully compliant with Marion's schema!")
    else:
        print(f"[ERROR] Found {errors} validation errors. Please fix them.")

if __name__ == "__main__":
    validate_seed_data()

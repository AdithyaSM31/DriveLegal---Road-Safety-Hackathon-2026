import io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

fixes = {
    'ðŸ‘‹': '👋',
    'Â°': '°',
    'â‚¹': '₹',
    'â€”': '—',
    'â€¢': '•',
    'Arjun': 'Adithya',
    'ðŸ‘': '👋'
}

for file in ['frontend/index.html', 'frontend/app.js']:
    try:
        with open(file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        for bad, good in fixes.items():
            if bad in content:
                print(f'Replacing {bad} with {good} in {file}')
                content = content.replace(bad, good)
                
        with open(file, 'w', encoding='utf-8') as f:
            f.write(content)
    except Exception as e:
        print(f'Error with {file}: {e}')
